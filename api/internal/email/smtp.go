package email

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"os"
	"strings"
	"time"
)

// SMTPConfig is a mail server that really delivers (BF-100). For the course
// demo that is Gmail: host smtp.gmail.com, port 587, the account's address as
// the username and a Google "app password" (not the account password).
type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	// From is the sender, e.g. "BiletFlow <biletflow.demo@gmail.com>". Gmail
	// always sends from the signed-in address; only the name can differ.
	From string
}

// SMTPSender delivers each message through an SMTP server, upgrading the
// connection with STARTTLS before authenticating. It also writes a one-line
// note to the log, so the terminal still shows what was sent where.
type SMTPSender struct {
	cfg  SMTPConfig
	from *mail.Address
	log  io.Writer
}

// NewSMTPSender validates the configuration once, at start-up, so a typo in
// MAIL_FROM is a startup error rather than a silent failure on every order.
func NewSMTPSender(cfg SMTPConfig) (*SMTPSender, error) {
	if cfg.Host == "" || cfg.Port == 0 {
		return nil, fmt.Errorf("smtp: host and port are required")
	}
	fromText := cfg.From
	if fromText == "" {
		fromText = cfg.Username
	}
	from, err := mail.ParseAddress(fromText)
	if err != nil {
		return nil, fmt.Errorf("smtp: MAIL_FROM %q is not an address: %w", fromText, err)
	}
	return &SMTPSender{cfg: cfg, from: from, log: os.Stdout}, nil
}

// Send delivers one message.
func (s *SMTPSender) Send(ctx context.Context, msg Message) error {
	to, err := mail.ParseAddress(msg.To)
	if err != nil {
		return fmt.Errorf("smtp: recipient %q: %w", msg.To, err)
	}
	raw, err := s.compose(to, msg)
	if err != nil {
		return err
	}

	addr := net.JoinHostPort(s.cfg.Host, fmt.Sprint(s.cfg.Port))
	var auth smtp.Auth
	if s.cfg.Username != "" {
		auth = smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
	}

	// net/smtp has no context; the mailer's timeout bounds the whole call by
	// running it on its own goroutine and abandoning it when ctx ends.
	done := make(chan error, 1)
	go func() { done <- smtp.SendMail(addr, auth, s.from.Address, []string{to.Address}, raw) }()
	select {
	case err = <-done:
	case <-ctx.Done():
		err = ctx.Err()
	}

	status := "sent"
	if err != nil {
		status = "FAILED: " + err.Error()
	}
	fmt.Fprintf(s.log, "email %s -> %s (%s): %s\n", msg.Type, to.Address, msg.Subject, status)
	return err
}

// compose builds an RFC 5322 message (BF-100): a plain-text and an HTML part,
// the poster inline beside the HTML, and the ticket PDFs as attachments.
//
//	multipart/mixed
//	├── multipart/related
//	│   ├── multipart/alternative: text/plain, text/html
//	│   └── image (cid:poster)
//	└── application/pdf ...
//
// Text is quoted-printable so Kazakh and Russian survive any relay.
func (s *SMTPSender) compose(to *mail.Address, msg Message) ([]byte, error) {
	id := make([]byte, 12)
	if _, err := rand.Read(id); err != nil {
		return nil, err
	}

	var b bytes.Buffer
	header := func(key, value string) { fmt.Fprintf(&b, "%s: %s\r\n", key, value) }
	header("From", s.from.String())
	header("To", to.String())
	header("Subject", mime.QEncoding.Encode("utf-8", msg.Subject))
	header("Date", time.Now().Format(time.RFC1123Z))
	header("Message-ID", fmt.Sprintf("<%s@%s>", hex.EncodeToString(id), domainOf(s.from.Address)))
	header("MIME-Version", "1.0")

	mixed := multipart.NewWriter(&b)
	header("Content-Type", `multipart/mixed; boundary="`+mixed.Boundary()+`"`)
	b.WriteString("\r\n")

	// related: the alternative body and its inline images.
	var relatedBody bytes.Buffer
	related := multipart.NewWriter(&relatedBody)

	var altBody bytes.Buffer
	alt := multipart.NewWriter(&altBody)
	text := strings.ReplaceAll(strings.TrimRight(msg.Body, "\n")+"\n", "\n", "\r\n")
	if err := writeQP(alt, `text/plain; charset="utf-8"`, text); err != nil {
		return nil, err
	}
	if err := writeQP(alt, `text/html; charset="utf-8"`, RenderHTML(msg)); err != nil {
		return nil, err
	}
	if err := alt.Close(); err != nil {
		return nil, err
	}

	part, err := related.CreatePart(textproto.MIMEHeader{
		"Content-Type": {`multipart/alternative; boundary="` + alt.Boundary() + `"`},
	})
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(altBody.Bytes()); err != nil {
		return nil, err
	}
	for _, a := range msg.Attachments {
		if a.ContentID == "" {
			continue
		}
		if err := writeBase64(related, a, "inline"); err != nil {
			return nil, err
		}
	}
	if err := related.Close(); err != nil {
		return nil, err
	}

	part, err = mixed.CreatePart(textproto.MIMEHeader{
		"Content-Type": {`multipart/related; boundary="` + related.Boundary() + `"`},
	})
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(relatedBody.Bytes()); err != nil {
		return nil, err
	}
	for _, a := range msg.Attachments {
		if a.ContentID != "" {
			continue
		}
		if err := writeBase64(mixed, a, "attachment"); err != nil {
			return nil, err
		}
	}
	if err := mixed.Close(); err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}

// writeQP adds a quoted-printable text part.
func writeQP(w *multipart.Writer, contentType, body string) error {
	part, err := w.CreatePart(textproto.MIMEHeader{
		"Content-Type":              {contentType},
		"Content-Transfer-Encoding": {"quoted-printable"},
	})
	if err != nil {
		return err
	}
	qp := quotedprintable.NewWriter(part)
	if _, err := qp.Write([]byte(body)); err != nil {
		return err
	}
	return qp.Close()
}

// writeBase64 adds a file part, wrapped at 76 characters as RFC 2045 asks.
func writeBase64(w *multipart.Writer, a Attachment, disposition string) error {
	h := textproto.MIMEHeader{
		"Content-Type":              {a.ContentType},
		"Content-Transfer-Encoding": {"base64"},
		"Content-Disposition":       {mime.FormatMediaType(disposition, map[string]string{"filename": a.Filename})},
	}
	if a.ContentID != "" {
		h.Set("Content-ID", "<"+a.ContentID+">")
	}
	part, err := w.CreatePart(h)
	if err != nil {
		return err
	}
	encoded := base64.StdEncoding.EncodeToString(a.Data)
	for len(encoded) > 76 {
		if _, err := io.WriteString(part, encoded[:76]+"\r\n"); err != nil {
			return err
		}
		encoded = encoded[76:]
	}
	_, err = io.WriteString(part, encoded+"\r\n")
	return err
}

func domainOf(address string) string {
	if at := strings.LastIndex(address, "@"); at >= 0 {
		return address[at+1:]
	}
	return "biletflow.local"
}

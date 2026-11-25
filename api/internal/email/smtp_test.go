package email

import (
	"bytes"
	"context"
	"encoding/base64"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/textproto"
	"strings"
	"testing"
	"time"
)

// fakeSMTP is the smallest SMTP server net/smtp will talk to: it accepts one
// message and hands back the raw DATA.
func fakeSMTP(t *testing.T) (port int, got <-chan string) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	out := make(chan string, 1)
	go func() {
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		tp := textproto.NewConn(conn)
		_ = tp.PrintfLine("220 fake ESMTP")
		for {
			line, err := tp.ReadLine()
			if err != nil {
				return
			}
			switch cmd := strings.ToUpper(strings.Fields(line + " x")[0]); cmd {
			case "EHLO", "HELO":
				_ = tp.PrintfLine("250 fake")
			case "MAIL", "RCPT", "RSET", "NOOP":
				_ = tp.PrintfLine("250 ok")
			case "DATA":
				_ = tp.PrintfLine("354 go ahead")
				data, _ := io.ReadAll(tp.DotReader())
				out <- string(data)
				_ = tp.PrintfLine("250 queued")
			case "QUIT":
				_ = tp.PrintfLine("221 bye")
				return
			default:
				_ = tp.PrintfLine("502 unknown")
			}
		}
	}()
	return ln.Addr().(*net.TCPAddr).Port, out
}

func TestSMTPSenderDeliversUTF8(t *testing.T) {
	port, got := fakeSMTP(t)
	sender, err := NewSMTPSender(SMTPConfig{Host: "127.0.0.1", Port: port, From: "BiletFlow <demo@example.kz>"})
	if err != nil {
		t.Fatal(err)
	}
	sender.log = io.Discard

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err = sender.Send(ctx, Message{
		Type:    "order.confirmation",
		To:      "aigerim@example.kz",
		Subject: "Билеттеріңіз: «Щелкунчик»",
		Body:    "Сәлем, Айгерім!\nТапсырыс расталды.",
		Locale:  "kk",
		Attachments: []Attachment{
			{Filename: "biletflow-TKT-1.pdf", ContentType: "application/pdf", Data: []byte("%PDF-1.4 ticket")},
			{Filename: "poster.jpg", ContentType: "image/jpeg", Data: []byte{0xff, 0xd8, 0xff}, ContentID: PosterContentID},
		},
	})
	if err != nil {
		t.Fatalf("send: %v", err)
	}

	raw := <-got
	// DotReader has already turned the CRLF line endings into LF.
	headers, body, _ := strings.Cut(raw, "\n\n")
	if !strings.Contains(headers, "From: \"BiletFlow\" <demo@example.kz>") {
		t.Errorf("From header missing: %q", headers)
	}
	var subject string
	for _, line := range strings.Split(headers, "\n") {
		if strings.HasPrefix(line, "Subject: ") {
			subject, _ = new(mime.WordDecoder).DecodeHeader(strings.TrimPrefix(line, "Subject: "))
		}
	}
	if subject != "Билеттеріңіз: «Щелкунчик»" {
		t.Errorf("subject = %q", subject)
	}
	// Walk the MIME tree: mixed -> related -> alternative (text, html) + poster, then the PDF.
	parts := map[string]string{}
	var walk func(contentType, body string)
	walk = func(contentType, body string) {
		media, params, err := mime.ParseMediaType(contentType)
		if err != nil {
			t.Fatalf("content type %q: %v", contentType, err)
		}
		if !strings.HasPrefix(media, "multipart/") {
			parts[media] = body
			return
		}
		r := multipart.NewReader(strings.NewReader(strings.ReplaceAll(strings.ReplaceAll(body, "\r\n", "\n"), "\n", "\r\n")), params["boundary"])
		for {
			p, err := r.NextRawPart()
			if err == io.EOF {
				return
			}
			if err != nil {
				t.Fatalf("part: %v", err)
			}
			raw, _ := io.ReadAll(p)
			switch p.Header.Get("Content-Transfer-Encoding") {
			case "quoted-printable":
				raw, _ = io.ReadAll(quotedprintable.NewReader(bytes.NewReader(raw)))
			case "base64":
				raw, _ = base64.StdEncoding.DecodeString(strings.ReplaceAll(strings.ReplaceAll(string(raw), "\r", ""), "\n", ""))
			}
			walk(p.Header.Get("Content-Type"), string(raw))
		}
	}
	var contentType string
	for _, line := range strings.Split(headers, "\n") {
		if strings.HasPrefix(line, "Content-Type: ") {
			contentType = strings.TrimPrefix(line, "Content-Type: ")
		}
	}
	walk(contentType, body)

	if !strings.Contains(parts["text/plain"], "Сәлем, Айгерім!") {
		t.Errorf("text part = %q", parts["text/plain"])
	}
	if html := parts["text/html"]; !strings.Contains(html, "Сәлем, Айгерім!") || !strings.Contains(html, "cid:poster") ||
		!strings.Contains(html, "студенттік жобасы") {
		t.Errorf("html part misses the text, the poster or the Kazakh footer: %q", html)
	}
	if parts["application/pdf"] != "%PDF-1.4 ticket" {
		t.Errorf("pdf attachment = %q", parts["application/pdf"])
	}
	if !strings.Contains(strings.ToLower(raw), "content-id: <poster>") {
		t.Error("the poster is not an inline part")
	}
}

func TestSMTPSenderRejectsABadFromAddress(t *testing.T) {
	if _, err := NewSMTPSender(SMTPConfig{Host: "smtp.gmail.com", Port: 587, From: "not an address"}); err == nil {
		t.Fatal("expected an error for an unparseable MAIL_FROM")
	}
}

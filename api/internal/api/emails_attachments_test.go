package api

import (
	"bytes"
	"net/http"
	"strings"
	"testing"
)

// The confirmation carries every ticket as a PDF, and on a development machine
// no localhost link at all - it would open nothing on a phone (BF-100).
func TestConfirmationAttachesTheTicketsAndNoLocalLinks(t *testing.T) {
	c := newClient(t)
	organizer := c.register("attachorg")
	eventID, _, ticketTypeID := c.sellableEvent(organizer.Token, "Attachment Fest", "5000", 10)

	requireStatus(t, c.buy(eventID, ticketTypeID, 2, "Dana Seit", "dana.attach@biletflow.test"), http.StatusCreated)
	c.waitForMail()

	sent := c.mail.To("dana.attach@biletflow.test")
	if len(sent) != 1 {
		t.Fatalf("confirmations = %d", len(sent))
	}
	pdfs := 0
	for _, a := range sent[0].Attachments {
		if a.ContentType == "application/pdf" && bytes.HasPrefix(a.Data, []byte("%PDF")) &&
			strings.HasSuffix(a.Filename, ".pdf") {
			pdfs++
		}
	}
	if pdfs != 2 {
		t.Errorf("PDF tickets attached = %d, want 2", pdfs)
	}
	if strings.Contains(sent[0].Body, "localhost") || strings.Contains(sent[0].Body, "http") {
		t.Errorf("the email carries a link:\n%s", sent[0].Body)
	}
}

func TestWebLinkOnlyForPublicAddresses(t *testing.T) {
	for base, want := range map[string]string{
		"http://localhost:3100":        "",
		"http://127.0.0.1:3000":        "",
		"http://192.168.1.20:3000":     "",
		"https://biletflow.example.kz": "https://biletflow.example.kz/orders/1",
	} {
		s := &Server{cfg: testConfig(t)}
		s.cfg.WebBaseURL = base
		if got := s.webLink("/orders/1"); got != want {
			t.Errorf("webLink with %s = %q, want %q", base, got, want)
		}
	}
}

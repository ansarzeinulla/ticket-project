package api

import (
	"net/http"
	"testing"

	"github.com/biletflow/api/internal/email"
)

// A guest who buys on the Russian site gets Russian emails - the confirmation
// now, and a refund notice later, when nobody on the Russian page is around to
// say which language to use (BF-100).
func TestGuestEmailsFollowThePageTheyBoughtOn(t *testing.T) {
	c := newClient(t)
	organizer := c.register("langorg")
	eventID, _, ticketTypeID := c.sellableEvent(organizer.Token, "Language Fest", "5000", 10)

	c.locale = "ru"
	bought := c.buy(eventID, ticketTypeID, 1, "Айгерим Жаксы", "guest.ru@biletflow.test")
	c.locale = ""
	requireStatus(t, bought, http.StatusCreated)
	c.waitForMail()

	sent := c.mail.To("guest.ru@biletflow.test")
	if len(sent) != 1 || sent[0].Subject != "Ваши билеты на Language Fest" {
		t.Fatalf("confirmation = %+v", sent)
	}

	c.mail.Reset()
	requireStatus(t, c.post("/api/v1/orders/"+orderIDOf(t, bought)+"/refund", organizer.Token,
		map[string]any{"reason": "Перенос"}), http.StatusOK)
	c.waitForMail()

	sent = c.mail.To("guest.ru@biletflow.test")
	if len(sent) != 1 || sent[0].Type != email.TypeRefundCompleted {
		t.Fatalf("refund emails = %+v", sent)
	}
	if sent[0].Subject != "Возврат за Language Fest" {
		t.Errorf("refund subject = %q, want it in Russian", sent[0].Subject)
	}
}

// Registering sends the verification email straight away (SRS 4.1), in the
// language the account was created in.
func TestRegisteringSendsAVerificationEmail(t *testing.T) {
	c := newClient(t)
	res := c.post("/api/v1/auth/register", "", map[string]any{
		"email": "new.kk@biletflow.test", "password": "correct horse battery", "locale": "kk",
	})
	requireStatus(t, res, http.StatusCreated)
	c.waitForMail()

	sent := c.mail.To("new.kk@biletflow.test")
	if len(sent) != 1 || sent[0].Type != email.TypeEmailVerification {
		t.Fatalf("emails after registering = %+v", sent)
	}
	if sent[0].Subject != "BiletFlow үшін email-ді растаңыз" {
		t.Errorf("subject = %q, want it in Kazakh", sent[0].Subject)
	}
	if codeFromConsole(t, sent[0].Body) == "" || contains(sent[0].Body, "http") {
		t.Errorf("want a 6-digit code and no link:\n%s", sent[0].Body)
	}
}

package email

import (
	"strings"
	"testing"
)

// Emails go out in the recipient's language (BF-100); English is the fallback.
func TestTemplatesSpeakTheRecipientsLanguage(t *testing.T) {
	order := sampleOrder()

	order.Locale = "ru"
	ru := OrderConfirmation(order)
	if ru.Subject != "Ваши билеты на Almaty Autumn Fest 2026" {
		t.Errorf("ru subject = %q", ru.Subject)
	}
	if !strings.Contains(ru.Body, "Здравствуйте, Aliya!") || !strings.Contains(ru.Body, "Билеты (2) во вложении") {
		t.Errorf("ru body:\n%s", ru.Body)
	}

	order.Locale = "kk-KZ"
	kk := OrderConfirmation(order)
	if !strings.Contains(kk.Body, "Сәлеметсіз бе, Aliya!") {
		t.Errorf("kk body:\n%s", kk.Body)
	}

	// Kazakh puts the event before the order; the indexed verbs keep both.
	refund := RefundCompleted(RefundDetails{
		Locale: "kk", BuyerName: "Dana", BuyerEmail: "d@x.kz", OrderNumber: "BF-1",
		EventTitle: "Jazz", AmountKZT: "100.00", TicketCount: 1,
	})
	if !strings.Contains(refund.Body, "Jazz іс-шарасына BF-1 тапсырысының") {
		t.Errorf("kk refund body:\n%s", refund.Body)
	}

	order.Locale = "fr"
	if OrderConfirmation(order).Subject != "Your Tickets to Almaty Autumn Fest 2026" {
		t.Error("an unknown language should fall back to English")
	}
}

// Every phrase a template looks up has a Russian and a Kazakh version.
func TestPhrasebooksCoverTheSameKeys(t *testing.T) {
	for key := range phrasebook["ru"] {
		if _, ok := phrasebook["kk"][key]; !ok {
			t.Errorf("kk is missing %q", key)
		}
	}
	for key := range phrasebook["kk"] {
		if _, ok := phrasebook["ru"][key]; !ok {
			t.Errorf("ru is missing %q", key)
		}
	}
}

package email

import (
	"strings"
	"testing"
)

func TestVerificationEmailCarriesACodeAndNoLink(t *testing.T) {
	msg := EmailVerification(AccountTokenDetails{
		Locale: "ru", FullName: "Айгерим", Email: "a@example.kz", Code: "042917", ExpiresIn: "1 hour",
	})
	if strings.Contains(msg.Body, "http") {
		t.Errorf("the verification email still carries a link:\n%s", msg.Body)
	}
	if !strings.Contains(msg.Body, "042917") || !strings.Contains(msg.Body, "Ваш код подтверждения") {
		t.Errorf("body = %q", msg.Body)
	}

	html := RenderHTML(msg)
	for _, want := range []string{
		`lang="ru"`,
		">042917</span>", // the code, in its own large box
		"Здравствуйте, Айгерим!",
		"Мы ничего не продаём.", // the footer, in Russian
	} {
		if !strings.Contains(html, want) {
			t.Errorf("html misses %q", want)
		}
	}
	if strings.Contains(html, "- BiletFlow") {
		t.Error("the plain-text sign-off leaked into the HTML")
	}
}

func TestOrderHTMLShowsFactsTicketsAndPoster(t *testing.T) {
	d := sampleOrder()
	d.Attachments = []Attachment{{Filename: "p.jpg", ContentType: "image/jpeg", Data: []byte{1}, ContentID: PosterContentID}}
	html := RenderHTML(OrderConfirmation(d))
	for _, want := range []string{"cid:poster", ">Event</td>", "Almaty Autumn Fest 2026", "BF-TKT-AAAA", `<a href="http://localhost:3000/orders/`} {
		if !strings.Contains(html, want) {
			t.Errorf("html misses %q", want)
		}
	}
	if strings.Contains(html, "<script") {
		t.Error("unexpected script")
	}
}

func TestHTMLEscapesWhatPeopleTyped(t *testing.T) {
	html := RenderHTML(Message{Body: "Hi <b>there</b>,\n\n  Reason:  <img src=x onerror=alert(1)>\n"})
	if strings.Contains(html, "<img src=x") || strings.Contains(html, "<b>there") {
		t.Errorf("user text was not escaped: %s", html)
	}
}

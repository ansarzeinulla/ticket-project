package email

import (
	"fmt"
	"strings"
)

// Notification types, mirrored into notifications.type.
const (
	TypeOrderConfirmation = "order.confirmation"
	TypeRefundCompleted   = "refund.completed"
	// TypeRegistrationCancelled is the free-registration counterpart of
	// TypeRefundCompleted: no money moves, but the ticket stops working, and
	// the attendee has to be told before they travel to the venue (SRS 4.9).
	TypeRegistrationCancelled = "registration.cancelled"
)

// TicketLine is one ticket on a confirmation; its PDF travels as an attachment.
type TicketLine struct {
	TicketCode string
	TypeName   string
}

// OrderDetails is everything the templates need. It is a plain struct rather
// than a store type so the templates can be unit-tested without a database,
// and so a change to the store's shape cannot silently reword an email.
type OrderDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale      string
	BuyerName   string
	BuyerEmail  string
	OrderNumber string
	EventTitle  string
	EventVenue  string
	EventWhen   string
	TotalKZT    string
	Tickets     []TicketLine
	// OrderURL is the attendee's order page, where every ticket can be
	// downloaded at once. Empty when the site has no public address, because
	// a localhost link is useless anywhere but the machine running it.
	OrderURL string
	// Attachments are the ticket PDFs and the inline poster (BF-100).
	Attachments []Attachment
}

// OrderConfirmation builds the message sent when a checkout completes.
func OrderConfirmation(d OrderDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.BuyerName))
	// Each ticket is a PDF attached to this email (BF-100).
	if len(d.Tickets) == 1 {
		fmt.Fprintf(&b, T(d.Locale, "Your order %s is confirmed. Your ticket is attached.\n\n"), d.OrderNumber)
	} else {
		fmt.Fprintf(&b, T(d.Locale, "Your order %s is confirmed. Your %d tickets are attached.\n\n"), d.OrderNumber, len(d.Tickets))
	}

	fmt.Fprintf(&b, T(d.Locale, "  Event:  %s\n"), d.EventTitle)
	if d.EventWhen != "" {
		fmt.Fprintf(&b, T(d.Locale, "  When:   %s\n"), d.EventWhen)
	}
	if d.EventVenue != "" {
		fmt.Fprintf(&b, T(d.Locale, "  Where:  %s\n"), d.EventVenue)
	}
	fmt.Fprintf(&b, T(d.Locale, "  Paid:   %s KZT (simulated payment)\n"), d.TotalKZT)
	b.WriteString("\n")

	if len(d.Tickets) > 0 {
		b.WriteString(T(d.Locale, "Tickets:\n\n"))
		for _, t := range d.Tickets {
			fmt.Fprintf(&b, T(d.Locale, "  %s  %s\n"), t.TicketCode, t.TypeName)
		}
		b.WriteString("\n")
	}

	if d.OrderURL != "" {
		fmt.Fprintf(&b, T(d.Locale, "All of them on one page: %s\n\n"), d.OrderURL)
	}

	b.WriteString(T(d.Locale, "Show the QR code on your phone or on paper at the entrance.\n\n"))
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:      d.Locale,
		Type:        TypeOrderConfirmation,
		To:          d.BuyerEmail,
		Subject:     fmt.Sprintf(T(d.Locale, "Your Tickets to %s"), d.EventTitle),
		Body:        b.String(),
		Attachments: d.Attachments,
	}
}

// RefundDetails is what a refund notification needs.
type RefundDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale      string
	BuyerName   string
	BuyerEmail  string
	OrderNumber string
	EventTitle  string
	AmountKZT   string
	TicketCount int
	Reason      string
}

// RefundCompleted builds the message sent when an organizer refunds an order
// (SRS 4.10, "refund completion").
func RefundCompleted(d RefundDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.BuyerName))
	fmt.Fprintf(&b, T(d.Locale, "Your order %s for %s has been refunded.\n\n"), d.OrderNumber, d.EventTitle)

	fmt.Fprintf(&b, T(d.Locale, "  Refunded: %s KZT (simulated)\n"), d.AmountKZT)
	fmt.Fprintf(&b, T(d.Locale, "  Tickets:  %d, now void\n"), d.TicketCount)
	if d.Reason != "" {
		fmt.Fprintf(&b, T(d.Locale, "  Reason:   %s\n"), d.Reason)
	}
	b.WriteString("\n")

	b.WriteString(T(d.Locale, "The QR codes on these tickets will no longer be admitted at the\nentrance. There is nothing else you need to do.\n\n"))
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypeRefundCompleted,
		To:      d.BuyerEmail,
		Subject: fmt.Sprintf(T(d.Locale, "Refund for %s"), d.EventTitle),
		Body:    b.String(),
	}
}

// CancellationDetails is what a free-registration cancellation needs. It
// deliberately carries no amount: a free registration has nothing to refund,
// and printing "0.00 KZT refunded" would invite a question that has no answer.
type CancellationDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale      string
	BuyerName   string
	BuyerEmail  string
	OrderNumber string
	EventTitle  string
	TicketCount int
	Reason      string
}

// RegistrationCancelled builds the message sent when an organizer cancels a
// free registration (SRS 4.9, and SRS 4.10's notification list).
func RegistrationCancelled(d CancellationDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.BuyerName))
	fmt.Fprintf(&b, T(d.Locale, "Your registration %s for %s has been cancelled by the organizer.\n\n"),
		d.OrderNumber, d.EventTitle)

	if d.TicketCount == 1 {
		b.WriteString(T(d.Locale, "  Cancelled: 1 ticket, now void\n"))
	} else {
		fmt.Fprintf(&b, T(d.Locale, "  Cancelled: %d tickets, now void\n"), d.TicketCount)
	}
	if d.Reason != "" {
		fmt.Fprintf(&b, T(d.Locale, "  Reason: %s\n"), d.Reason)
	}
	b.WriteString("\n")

	b.WriteString(T(d.Locale, "The QR code on this registration will no longer be admitted at the\nentrance. Nothing was charged, so there is no refund to wait for.\n\nIf you think this was a mistake, reply to the organizer through the\nsupport link on your order page.\n\n"))
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypeRegistrationCancelled,
		To:      d.BuyerEmail,
		Subject: fmt.Sprintf(T(d.Locale, "Your registration for %s was cancelled"), d.EventTitle),
		Body:    b.String(),
	}
}

// greet opens a message with the first name, so it does not read like a
// database row. An empty name degrades to a plain greeting rather than "Hi ,".
func greet(locale, full string) string {
	fields := strings.Fields(full)
	if len(fields) == 0 {
		return T(locale, "Hi there,\n\n")
	}
	return fmt.Sprintf(T(locale, "Hi %s,\n\n"), fields[0])
}

// Notification types added in Phase 12 (SRS 4.1, 4.10).
const (
	TypeEmailVerification = "account.email_verification"
	TypePasswordReset     = "account.password_reset"
	TypeEventCancelled    = "event.cancelled"
	TypeSupportMessage    = "support.new_message"
)

// The remaining notification triggers SRS 4.10 lists. Six of the nine existed;
// these are the rest.
const (
	TypePaymentFailed        = "payment.failed"
	TypeEventUpdated         = "event.updated"
	TypePayoutStatus         = "payout.status"
	TypeSupportAssigned      = "support.case_assigned"
	TypeSupportStatusChanged = "support.status_changed"
)

// PaymentFailureDetails is what a failed payment notification needs
// (SRS 4.10, "payment failure").
type PaymentFailureDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale      string
	BuyerName   string
	BuyerEmail  string
	OrderNumber string
	EventTitle  string
	AmountKZT   string
	Reason      string
	RetryURL    string
}

// PaymentFailed tells a buyer their payment did not go through and that no
// tickets were issued (SRS 4.6: "Failed or abandoned transactions shall not
// create valid tickets").
func PaymentFailed(d PaymentFailureDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.BuyerName))
	fmt.Fprintf(&b, T(d.Locale, "The payment for order %s did not go through, so no tickets\nwere issued for %s.\n\n"), d.OrderNumber, d.EventTitle)

	// The amount is omitted rather than guessed: the decline happens before the
	// order is priced in SQL, and re-deriving a total in Go would be a second,
	// divergent copy of the pricing rules.
	if d.AmountKZT != "" {
		fmt.Fprintf(&b, T(d.Locale, "  Attempted: %s KZT (simulated)\n"), d.AmountKZT)
	}
	if d.Reason != "" {
		fmt.Fprintf(&b, T(d.Locale, "  Reason:    %s\n"), d.Reason)
	}
	if d.AmountKZT != "" || d.Reason != "" {
		b.WriteString("\n")
	}

	b.WriteString(T(d.Locale, "Nothing was charged. Your seats were released back to the event, so\nthey may be gone if you wait.\n\n"))
	if d.RetryURL != "" {
		fmt.Fprintf(&b, T(d.Locale, "Try again: %s\n\n"), d.RetryURL)
	}
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypePaymentFailed,
		To:      d.BuyerEmail,
		Subject: fmt.Sprintf(T(d.Locale, "Payment failed for %s"), d.EventTitle),
		Body:    b.String(),
	}
}

// EventUpdateDetails carries a change an attendee needs to know about.
type EventUpdateDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale        string
	AttendeeName  string
	AttendeeEmail string
	EventTitle    string
	// Changes are human-readable lines, already phrased as before/after by the
	// caller. The template does not compare rows: what counts as a change
	// worth an email is a decision for the handler that made it.
	Changes  []string
	EventURL string
}

// EventUpdated tells ticket holders that something they planned around has
// moved (SRS 4.10, "event updates").
func EventUpdated(d EventUpdateDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.AttendeeName))
	fmt.Fprintf(&b, T(d.Locale, "%s has been updated since you booked.\n\n"), d.EventTitle)

	for _, line := range d.Changes {
		fmt.Fprintf(&b, "  %s\n", changeLine(d.Locale, line))
	}
	if len(d.Changes) > 0 {
		b.WriteString("\n")
	}

	b.WriteString(T(d.Locale, "Your ticket is unchanged and still admits you.\n\n"))
	if d.EventURL != "" {
		fmt.Fprintf(&b, T(d.Locale, "Event page: %s\n\n"), d.EventURL)
	}
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypeEventUpdated,
		To:      d.AttendeeEmail,
		Subject: fmt.Sprintf(T(d.Locale, "Update to %s"), d.EventTitle),
		Body:    b.String(),
	}
}

// PayoutStatusDetails is an organizer-facing payout update.
type PayoutStatusDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale         string
	OrganizerName  string
	OrganizerEmail string
	EventTitle     string
	Status         string
	AmountKZT      string
	MaskedAccount  string
	Note           string
}

// PayoutStatus tells an organizer where their money is (SRS 4.10, "organizer
// payout status"). Nothing moves: SRS 8 excludes real payouts from the MVP,
// so the message says so rather than implying a transfer.
func PayoutStatus(d PayoutStatusDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.OrganizerName))
	fmt.Fprintf(&b, T(d.Locale, "Payout status for %s: %s.\n\n"), d.EventTitle, d.Status)

	if d.AmountKZT != "" {
		fmt.Fprintf(&b, T(d.Locale, "  Amount:      %s KZT (simulated)\n"), d.AmountKZT)
	}
	if d.MaskedAccount != "" {
		fmt.Fprintf(&b, T(d.Locale, "  Destination: %s\n"), d.MaskedAccount)
	}
	if d.Note != "" {
		fmt.Fprintf(&b, T(d.Locale, "  Note:        %s\n"), d.Note)
	}
	b.WriteString("\n")

	b.WriteString(T(d.Locale, "This is a demonstration record. No money has moved and none will:\nreal payouts are outside the scope of this release.\n\n"))
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypePayoutStatus,
		To:      d.OrganizerEmail,
		Subject: fmt.Sprintf(T(d.Locale, "Payout %s for %s"), d.Status, d.EventTitle),
		Body:    b.String(),
	}
}

// SupportCaseDetails carries an assignment or a status change.
type SupportCaseDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale         string
	RecipientName  string
	RecipientEmail string
	CaseNumber     string
	Subject        string
	// AssigneeName is set for an assignment, Status for a status change.
	AssigneeName string
	Status       string
	CaseURL      string
}

// SupportCaseAssigned tells the requester who picked their case up
// (SRS 4.13: "support-case assignment").
func SupportCaseAssigned(d SupportCaseDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.RecipientName))
	fmt.Fprintf(&b, T(d.Locale, "%s is now with %s.\n\n"), d.CaseNumber, d.AssigneeName)
	fmt.Fprintf(&b, T(d.Locale, "  Subject: %s\n\n"), d.Subject)
	if d.CaseURL != "" {
		fmt.Fprintf(&b, T(d.Locale, "Read the conversation: %s\n\n"), d.CaseURL)
	}
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypeSupportAssigned,
		To:      d.RecipientEmail,
		Subject: fmt.Sprintf(T(d.Locale, "%s assigned to %s"), d.CaseNumber, d.AssigneeName),
		Body:    b.String(),
	}
}

// SupportCaseStatusChanged tells the requester their case moved
// (SRS 4.13: "support-case status changes").
func SupportCaseStatusChanged(d SupportCaseDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.RecipientName))
	fmt.Fprintf(&b, T(d.Locale, "%s is now %s.\n\n"), d.CaseNumber, readableStatus(d.Locale, d.Status))
	fmt.Fprintf(&b, T(d.Locale, "  Subject: %s\n\n"), d.Subject)

	if d.Status == "waiting_for_customer" {
		b.WriteString(T(d.Locale, "Support is waiting on a reply from you before they can go further.\n\n"))
	}
	if d.CaseURL != "" {
		fmt.Fprintf(&b, T(d.Locale, "Read the conversation: %s\n\n"), d.CaseURL)
	}
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypeSupportStatusChanged,
		To:      d.RecipientEmail,
		Subject: fmt.Sprintf(T(d.Locale, "%s is now %s"), d.CaseNumber, readableStatus(d.Locale, d.Status)),
		Body:    b.String(),
	}
}

// readableStatus turns an enum label into something an attendee reads without
// wondering what an underscore means.
func readableStatus(locale, status string) string {
	switch status {
	case "in_progress":
		return T(locale, "in progress")
	case "waiting_for_customer":
		return T(locale, "waiting for your reply")
	default:
		return T(locale, status)
	}
}

// AccountTokenDetails carries a single-use 6-digit code to its owner. There is
// no link: the person types the code where they already are (BF-100).
type AccountTokenDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale   string
	FullName string
	Email    string
	// Code is the plaintext secret. It appears in the message and nowhere
	// else - the database stores only its hash.
	Code      string
	ExpiresIn string
}

// EmailVerification asks a new account to confirm its address (SRS 4.1).
func EmailVerification(d AccountTokenDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.FullName))
	b.WriteString(T(d.Locale, "Confirm this address to finish setting up your BiletFlow account.\n\n"))
	fmt.Fprintf(&b, T(d.Locale, "Your confirmation code:\n\n  %s\n\n"), d.Code)
	b.WriteString(T(d.Locale, "Enter it on BiletFlow: in the banner at the top of the website, or in the app's Account tab.\n\n"))
	fmt.Fprintf(&b, T(d.Locale, "The code stops working in %s.\n\n"), T(d.Locale, d.ExpiresIn))
	b.WriteString(T(d.Locale, "If you did not create an account, ignore this message.\n\n"))
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypeEmailVerification,
		To:      d.Email,
		Subject: T(d.Locale, "Confirm your BiletFlow email address"),
		Body:    b.String(),
	}
}

// PasswordReset carries a reset token (SRS 4.1, 4.10).
func PasswordReset(d AccountTokenDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.FullName))
	b.WriteString(T(d.Locale, "Somebody asked to reset the password on this BiletFlow account.\n\n"))
	fmt.Fprintf(&b, T(d.Locale, "Your reset code:\n\n  %s\n\n"), d.Code)
	b.WriteString(T(d.Locale, "Enter it on the password reset page together with your new password.\n\n"))
	fmt.Fprintf(&b, T(d.Locale, "The code stops working in %s, and only once.\n\n"), T(d.Locale, d.ExpiresIn))
	b.WriteString(T(d.Locale, "If this was not you, nothing has changed and you can ignore this\nmessage. Your current password still works.\n\n"))
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypePasswordReset,
		To:      d.Email,
		Subject: T(d.Locale, "Reset your BiletFlow password"),
		Body:    b.String(),
	}
}

// EventCancelledDetails is what a cancellation notice needs.
type EventCancelledDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale       string
	AttendeeName string
	Email        string
	EventTitle   string
	EventWhen    string
	OrderNumber  string
	TicketCount  int
	RefundPolicy string
}

// EventCancelled tells a ticket holder their event is off (SRS 4.10).
func EventCancelled(d EventCancelledDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.AttendeeName))
	fmt.Fprintf(&b, T(d.Locale, "%s has been cancelled by the organizer.\n\n"), d.EventTitle)

	if d.EventWhen != "" {
		fmt.Fprintf(&b, T(d.Locale, "  Was due:  %s\n"), d.EventWhen)
	}
	fmt.Fprintf(&b, T(d.Locale, "  Order:    %s\n"), d.OrderNumber)
	fmt.Fprintf(&b, T(d.Locale, "  Tickets:  %d, now void\n"), d.TicketCount)
	b.WriteString("\n")

	if d.RefundPolicy != "" {
		b.WriteString(T(d.Locale, "The organizer's refund policy:\n\n"))
		for _, line := range strings.Split(strings.TrimSpace(d.RefundPolicy), "\n") {
			fmt.Fprintf(&b, T(d.Locale, "  %s\n"), line)
		}
		b.WriteString("\n")
	} else {
		b.WriteString(T(d.Locale, "Contact the organizer from your order page about a refund.\n\n"))
	}

	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypeEventCancelled,
		To:      d.Email,
		Subject: fmt.Sprintf(T(d.Locale, "%s has been cancelled"), d.EventTitle),
		Body:    b.String(),
	}
}

// SupportMessageDetails is what a new-message notice needs.
type SupportMessageDetails struct {
	// Locale is the recipient's language: "kk", "ru" or "en" (the default).
	Locale         string
	RecipientName  string
	Email          string
	EventTitle     string
	CaseSubject    string
	SenderName     string
	MessagePreview string
	CaseURL        string
}

// NewSupportMessage tells the other side of a conversation that a reply has
// arrived (SRS 4.10, 4.13).
func NewSupportMessage(d SupportMessageDetails) Message {
	var b strings.Builder

	b.WriteString(greet(d.Locale, d.RecipientName))
	fmt.Fprintf(&b, T(d.Locale, "%s replied about %s.\n\n"), d.SenderName, d.EventTitle)

	fmt.Fprintf(&b, T(d.Locale, "  Case: %s\n\n"), d.CaseSubject)
	for _, line := range strings.Split(strings.TrimSpace(d.MessagePreview), "\n") {
		fmt.Fprintf(&b, T(d.Locale, "  > %s\n"), line)
	}
	b.WriteString("\n")

	if d.CaseURL != "" {
		fmt.Fprintf(&b, T(d.Locale, "Reply here: %s\n\n"), d.CaseURL)
	}
	b.WriteString("- BiletFlow\n")

	return Message{
		Locale:  d.Locale,
		Type:    TypeSupportMessage,
		To:      d.Email,
		Subject: fmt.Sprintf(T(d.Locale, "New message about %s"), d.EventTitle),
		Body:    b.String(),
	}
}

package api

import (
	"context"
	"io/fs"
	"log/slog"
	"net"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/biletflow/api/internal/email"
	"github.com/biletflow/api/internal/media"
	"github.com/biletflow/api/internal/store"
	"github.com/biletflow/api/internal/ticketpdf"
)

// webLink is a link into the website for an email, or "" when the website has
// no public address (BF-100). A localhost link opens nothing on the phone the
// email is read on, so on a development machine the emails carry no links:
// the tickets travel as attachments and codes are typed in, not clicked.
func (s *Server) webLink(pathAndQuery string) string {
	u, err := url.Parse(s.cfg.WebBaseURL)
	if err != nil || u.Host == "" || isLocalHost(u.Hostname()) {
		return ""
	}
	return strings.TrimRight(s.cfg.WebBaseURL, "/") + pathAndQuery
}

func isLocalHost(host string) bool {
	if host == "localhost" || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && (ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified())
}

// ticketAttachments renders every ticket of an order as a PDF for the
// confirmation email (SRS 4.10: ticket delivery). A ticket that fails to
// render is logged and left out; the order page still has it.
func (s *Server) ticketAttachments(ctx context.Context, tickets []store.Ticket) []email.Attachment {
	out := make([]email.Attachment, 0, len(tickets))
	for _, t := range tickets {
		detail, err := s.tickets.GetDetail(ctx, t.ID)
		if err != nil {
			slog.Error("email: could not load ticket for its PDF", "ticket", t.ID, "err", err)
			continue
		}
		pdf, err := ticketpdf.Render(ticketpdf.Ticket{
			EventTitle:     detail.EventTitle,
			StartsAt:       detail.StartsAt,
			EndsAt:         detail.EndsAt,
			Timezone:       detail.Timezone,
			VenueName:      detail.VenueName,
			VenueAddress:   detail.VenueAddress,
			AttendeeName:   detail.AttendeeName,
			AttendeeEmail:  detail.AttendeeEmail,
			TicketTypeName: detail.TicketTypeName,
			TicketCode:     detail.TicketCode,
			TicketID:       detail.ID.String(),
			OrderNumber:    detail.OrderNumber,
			SeatSection:    detail.SeatSection,
			SeatRow:        detail.SeatRow,
			SeatNumber:     detail.SeatNumber,
			QRToken:        detail.QRToken,
		})
		if err != nil {
			slog.Error("email: could not render ticket PDF", "ticket", t.ID, "err", err)
			continue
		}
		out = append(out, email.Attachment{
			Filename:    "biletflow-" + safeFilename(detail.TicketCode) + ".pdf",
			ContentType: "application/pdf",
			Data:        pdf,
		})
	}
	return out
}

// posterAttachment is the event's poster as an inline image for the HTML part,
// read from the compiled-in catalogue or the uploads folder. No poster, no
// image: the email reads the same without it.
func (s *Server) posterAttachment(cover *string) []email.Attachment {
	if cover == nil || *cover == "" {
		return nil
	}
	var (
		data []byte
		err  error
		name string
	)
	switch {
	case strings.HasPrefix(*cover, media.URLPrefix):
		name = path.Base(*cover)
		data, err = fs.ReadFile(media.Files, name)
	case strings.Contains(*cover, uploadURLPrefix):
		name = path.Base(*cover)
		data, err = os.ReadFile(filepath.Join(s.cfg.UploadDir, name))
	default:
		return nil
	}
	if err != nil || len(data) == 0 || len(data) > 3<<20 {
		return nil
	}
	contentType := "image/jpeg"
	switch strings.ToLower(filepath.Ext(name)) {
	case ".png":
		contentType = "image/png"
	case ".webp":
		contentType = "image/webp"
	case ".gif":
		contentType = "image/gif"
	}
	return []email.Attachment{{Filename: name, ContentType: contentType, Data: data, ContentID: email.PosterContentID}}
}

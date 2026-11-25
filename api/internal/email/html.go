package email

import (
	"fmt"
	"html"
	"regexp"
	"strings"
)

// Attachment is a file sent with a message (BF-100): a ticket PDF, or with a
// ContentID an image the HTML part shows inline, such as the event poster.
type Attachment struct {
	Filename    string
	ContentType string
	Data        []byte
	// ContentID makes the file an inline part, referenced as "cid:<ContentID>".
	ContentID string
}

// PosterContentID is the inline image an HTML email shows above its text.
const PosterContentID = "poster"

// footerNote is the line every email ends with, as on the website.
const footerNote = "BiletFlow is a student project made by AAOAA at Nazarbayev University. Data is taken from Ticketon, please, don't sue us. We do not sell anything."

var (
	codeLine  = regexp.MustCompile(`^\d{6}$`)
	factLine  = regexp.MustCompile(`^([^:]{1,40}):\s+(.+)$`)
	urlInText = regexp.MustCompile(`https?://[^\s<>"]+`)
)

// RenderHTML is the HTML part of a message (BF-100), built from its plain-text
// body so both parts always say the same thing in the same language:
//
//   - the greeting stays a paragraph;
//   - an indented block of "Label: value" lines becomes a table of facts;
//   - an indented six-digit line becomes a large code;
//   - an indented list of other lines (tickets) becomes a list;
//   - links stay links, and the closing "- BiletFlow" is dropped because the
//     header already carries the name.
//
// The markup is table-based with inline styles, which is what mail clients
// render reliably.
func RenderHTML(msg Message) string {
	var content strings.Builder

	for _, a := range msg.Attachments {
		if a.ContentID == PosterContentID {
			fmt.Fprintf(&content,
				`<p style="margin:0 0 24px;text-align:center"><img src="cid:%s" width="180" alt="" style="width:180px;max-width:60%%;border-radius:6px;display:inline-block"></p>`,
				PosterContentID)
		}
	}

	for _, para := range strings.Split(strings.TrimSpace(msg.Body), "\n\n") {
		lines := strings.Split(strings.Trim(para, "\n"), "\n")
		if len(lines) == 0 || strings.TrimSpace(para) == "" || strings.TrimSpace(para) == "- BiletFlow" {
			continue
		}

		indented := true
		for _, l := range lines {
			if !strings.HasPrefix(l, "  ") {
				indented = false
			}
		}
		if !indented {
			text := make([]string, len(lines))
			for i, l := range lines {
				text[i] = linkify(l)
			}
			fmt.Fprintf(&content, `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#14161b">%s</p>`,
				strings.Join(text, "<br>"))
			continue
		}

		if len(lines) == 1 && codeLine.MatchString(strings.TrimSpace(lines[0])) {
			fmt.Fprintf(&content,
				`<p style="margin:0 0 20px;text-align:center"><span style="display:inline-block;padding:14px 22px;background:#f0f0f2;border-radius:6px;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#14161b">%s</span></p>`,
				html.EscapeString(strings.TrimSpace(lines[0])))
			continue
		}

		facts := true
		for _, l := range lines {
			if !factLine.MatchString(strings.TrimSpace(l)) {
				facts = false
			}
		}
		if facts {
			content.WriteString(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse">`)
			for _, l := range lines {
				m := factLine.FindStringSubmatch(strings.TrimSpace(l))
				fmt.Fprintf(&content,
					`<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #e4e4e8;font-size:13px;color:#5f6168;white-space:nowrap;vertical-align:top">%s</td><td style="padding:8px 0;border-bottom:1px solid #e4e4e8;font-size:14px;font-weight:600;color:#14161b">%s</td></tr>`,
					html.EscapeString(m[1]), linkify(m[2]))
			}
			content.WriteString(`</table>`)
			continue
		}

		content.WriteString(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse">`)
		for _, l := range lines {
			fmt.Fprintf(&content,
				`<tr><td style="padding:8px 12px;border-left:3px solid #e8174f;background:#f7f7f8;font-size:14px;color:#14161b">%s</td></tr><tr><td style="height:6px"></td></tr>`,
				linkify(strings.TrimSpace(l)))
		}
		content.WriteString(`</table>`)
	}

	return fmt.Sprintf(`<!doctype html>
<html lang="%s"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f7f7f8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;border-collapse:collapse">
<tr><td style="background:#14161b;border-radius:8px 8px 0 0;padding:18px 28px">
<span style="display:inline-block;background:#e8174f;color:#ffffff;font-weight:700;font-size:14px;padding:5px 9px;border-radius:4px;vertical-align:middle">BF</span>
<span style="display:inline-block;margin-left:10px;color:#ffffff;font-weight:700;font-size:19px;vertical-align:middle">BiletFlow</span>
</td></tr>
<tr><td style="background:#ffffff;padding:32px 28px 16px;border-left:1px solid #e4e4e8;border-right:1px solid #e4e4e8">%s</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e4e4e8;border-top:0;border-radius:0 0 8px 8px;padding:0 28px 24px"></td></tr>
<tr><td style="padding:18px 8px;font-size:12px;line-height:1.5;color:#5f6168;text-align:center">%s</td></tr>
</table>
</td></tr></table>
</body></html>
`, html.EscapeString(normalizeLocaleOrEn(msg.Locale)), html.EscapeString(msg.Subject), content.String(),
		html.EscapeString(T(msg.Locale, footerNote)))
}

// linkify escapes a line of text and turns any URL in it into a link.
func linkify(text string) string {
	var b strings.Builder
	last := 0
	for _, loc := range urlInText.FindAllStringIndex(text, -1) {
		b.WriteString(html.EscapeString(text[last:loc[0]]))
		url := text[loc[0]:loc[1]]
		fmt.Fprintf(&b, `<a href="%s" style="color:#e8174f;font-weight:600">%s</a>`,
			html.EscapeString(url), html.EscapeString(url))
		last = loc[1]
	}
	b.WriteString(html.EscapeString(text[last:]))
	return b.String()
}

func normalizeLocaleOrEn(locale string) string {
	switch l := normalizeLocale(locale); l {
	case "kk", "ru":
		return l
	default:
		return "en"
	}
}

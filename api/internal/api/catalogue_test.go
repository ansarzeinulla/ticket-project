package api

import (
	"io/fs"
	"net/http"
	"strings"
	"testing"

	"github.com/biletflow/api/internal/media"
)

// The home page's city picker filters on the venue address, in any of the
// spellings an organizer may have typed (BF-100).
func TestListEventsFiltersByCity(t *testing.T) {
	c := newClient(t)
	owner := c.register("cities")

	for title, address := range map[string]string{
		"Almaty In Russian": "улица Калдаякова, 35, Алматы",
		"Almaty In English": "Abay Avenue 44, Almaty",
		"Astana Event":      "проспект Мангилик Ел, Астана",
	} {
		body := validEventBody(title)
		body["venue_address"] = address
		res := c.post("/api/v1/events", owner.Token, body)
		requireStatus(t, res, http.StatusCreated)
		requireStatus(t, c.post("/api/v1/events/"+res.eventString("id")+"/publish", owner.Token, nil), http.StatusOK)
	}

	count := func(path string) int {
		res := c.get(path, "")
		requireStatus(t, res, http.StatusOK)
		return len(res.Body["events"].([]any))
	}
	if got := count("/api/v1/events?city=almaty"); got != 2 {
		t.Errorf("almaty: got %d events, want 2 (both spellings)", got)
	}
	if got := count("/api/v1/events?city=astana"); got != 1 {
		t.Errorf("astana: got %d events, want 1", got)
	}
	if got := count("/api/v1/events?city=shymkent"); got != 0 {
		t.Errorf("shymkent: got %d events, want 0", got)
	}
	requireErrorCode(t, c.get("/api/v1/events?city=paris", ""), http.StatusUnprocessableEntity, "validation_failed")
}

// The catalogue's posters are compiled in and served without authentication.
func TestMediaServesTheCataloguePosters(t *testing.T) {
	c := newClient(t)

	entries, err := fs.ReadDir(media.Files, ".")
	if err != nil || len(entries) == 0 {
		t.Fatalf("no embedded posters: %v", err)
	}

	res := c.getBinary(media.URLPrefix+entries[0].Name(), "")
	if res.Status != http.StatusOK {
		t.Fatalf("poster status = %d, want 200", res.Status)
	}
	if ct := res.Header.Get("Content-Type"); ct != "image/jpeg" {
		t.Errorf("content type = %q, want image/jpeg", ct)
	}
	if len(res.Body) == 0 {
		t.Error("empty poster")
	}

	if got := c.getBinary(media.URLPrefix+"missing.jpg", "").Status; got != http.StatusNotFound {
		t.Errorf("missing poster status = %d, want 404", got)
	}
	if got := c.getBinary(media.URLPrefix+"..%2Fmedia.go", "").Status; got != http.StatusNotFound {
		t.Errorf("traversal status = %d, want 404", got)
	}
}

// Browsers send the page language as a custom header, so a cross-origin
// client (the app's web build) needs it allowed in the CORS preflight.
func TestCORSAllowsTheLanguageHeader(t *testing.T) {
	c := newClient(t)
	req, _ := http.NewRequest(http.MethodOptions, c.server.URL+"/api/v1/events", nil)
	req.Header.Set("Origin", "http://localhost:8081")
	req.Header.Set("Access-Control-Request-Method", "GET")
	req.Header.Set("Access-Control-Request-Headers", "x-biletflow-locale")
	res, err := c.server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	allowed := res.Header.Get("Access-Control-Allow-Headers")
	if !strings.Contains(strings.ToLower(allowed), "x-biletflow-locale") {
		t.Errorf("Access-Control-Allow-Headers = %q", allowed)
	}
}

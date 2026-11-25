package api

import (
	"io/fs"
	"net/http"
	"strings"
	"testing"

	"github.com/biletflow/api/internal/media"
)

// The home page's city picker filters on the city the organizer picked in the
// event form, not on the address text (BF-100).
func TestListEventsFiltersByCity(t *testing.T) {
	c := newClient(t)
	owner := c.register("cities")

	for title, city := range map[string]string{
		"Almaty Concert": "almaty",
		"Almaty Lecture": "almaty",
		"Astana Event":   "astana",
		"Somewhere Else": "other",
	} {
		body := validEventBody(title)
		body["city"] = city
		// The address alone no longer decides the city.
		body["venue_address"] = "Abay Avenue 44, Almaty"
		res := c.post("/api/v1/events", owner.Token, body)
		requireStatus(t, res, http.StatusCreated)
		if got := res.eventString("city"); got != city {
			t.Errorf("%s: city = %q, want %q", title, got, city)
		}
		requireStatus(t, c.post("/api/v1/events/"+res.eventString("id")+"/publish", owner.Token, nil), http.StatusOK)
	}

	count := func(path string) int {
		res := c.get(path, "")
		requireStatus(t, res, http.StatusOK)
		return len(res.Body["events"].([]any))
	}
	if got := count("/api/v1/events?city=almaty"); got != 2 {
		t.Errorf("almaty: got %d events, want 2", got)
	}
	if got := count("/api/v1/events?city=astana"); got != 1 {
		t.Errorf("astana: got %d events, want 1", got)
	}
	if got := count("/api/v1/events?city=shymkent"); got != 0 {
		t.Errorf("shymkent: got %d events, want 0", got)
	}
	requireErrorCode(t, c.get("/api/v1/events?city=paris", ""), http.StatusUnprocessableEntity, "validation_failed")
	requireErrorCode(t, c.get("/api/v1/events?city=other", ""), http.StatusUnprocessableEntity, "validation_failed")
}

// The city is one of four values on create and on edit, and can be changed.
func TestEventCityIsValidated(t *testing.T) {
	c := newClient(t)
	owner := c.register("citycheck")

	body := validEventBody("Paris Event")
	body["city"] = "paris"
	requireErrorCode(t, c.post("/api/v1/events", owner.Token, body), http.StatusUnprocessableEntity, "validation_failed")

	// Older clients send no city at all, and that still works.
	id, _ := c.createEvent(owner.Token, "No City Yet")
	path := "/api/v1/events/" + id.String()
	requireErrorCode(t, c.patch(path, owner.Token, map[string]any{"city": "paris"}),
		http.StatusUnprocessableEntity, "validation_failed")

	res := c.patch(path, owner.Token, map[string]any{"city": "shymkent"})
	requireStatus(t, res, http.StatusOK)
	if got := res.eventString("city"); got != "shymkent" {
		t.Errorf("city after edit = %q, want shymkent", got)
	}
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

package api

import (
	"net/http"

	"github.com/biletflow/api/internal/httpx"
	"github.com/biletflow/api/internal/store"
)

type venuesResponse struct {
	Venues []store.VenueLayout `json:"venues"`
}

// handleListVenues lists the predefined seat layouts an organizer can choose
// for an assigned-seating event (SRS 4.3.1). There is no layout editor: the
// MVP ships predefined venues only.
func (s *Server) handleListVenues(w http.ResponseWriter, r *http.Request) {
	venues, err := s.seating.PredefinedVenues(r.Context())
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, venuesResponse{Venues: venues})
}

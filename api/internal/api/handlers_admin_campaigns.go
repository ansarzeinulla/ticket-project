package api

import (
	"net/http"

	"github.com/biletflow/api/internal/httpx"
	"github.com/biletflow/api/internal/store"
)

// adminCampaignLimit keeps the platform view to a readable page; the newest
// campaigns are the ones worth watching for abuse.
const adminCampaignLimit = 200

type adminCampaignsResponse struct {
	Campaigns []store.AdminCampaign `json:"campaigns"`
}

// handleAdminCampaigns lists promo-code activity across every event, newest
// first, with redemptions and the discount given (SRS 4.12: "review ...
// promotional-code activity").
func (s *Server) handleAdminCampaigns(w http.ResponseWriter, r *http.Request) {
	campaigns, err := s.campaigns.ListAll(r.Context(), adminCampaignLimit)
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, adminCampaignsResponse{Campaigns: campaigns})
}

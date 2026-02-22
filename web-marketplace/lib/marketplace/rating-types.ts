export interface MarketplaceRating {
  id: string;
  event_id: string;
  rater_id: string;
  ratee_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

export interface MarketplaceRatingsResponse {
  canRate: boolean;
  blindWindowActive: boolean;
  blindWindowExpiresAt: string | null;
  viewerRating: { rating: number; review: string | null } | null;
  ratings?: MarketplaceRating[];
}

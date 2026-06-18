export interface Showing {
  title: string;
  times: string[]; // e.g. ["7:30", "9:55"]
  tag: string;     // e.g. "35mm", "70mm", "" — shown muted after title
}

export type VenueStatus = "open" | "dark" | "pending";

export interface VenueData {
  key: string;
  status: VenueStatus;
  showings: Showing[];
  // Cinematheque only: split by sub-venue
  aero?: Showing[];
  losFeliz?: Showing[];
}

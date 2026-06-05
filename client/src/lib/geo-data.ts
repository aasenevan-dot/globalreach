// Domestic (US) geography helpers powering territory + "similar nearby" features.
import type { Lead } from "@shared/schema";

// US state code → full name (lower 48 + AK/HI + DC).
export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export function stateName(code?: string | null): string {
  if (!code) return "—";
  return US_STATES[code] ?? code;
}

// Anchor coordinates for the metros used by GlobalReach (decimal degrees).
export const METRO_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  "Indianapolis, IN": { lat: 39.7684, lng: -86.1581, state: "IN" },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298, state: "IL" },
  "Boston, MA": { lat: 42.3601, lng: -71.0589, state: "MA" },
  "Dallas, TX": { lat: 32.7767, lng: -96.797, state: "TX" },
  "San Francisco, CA": { lat: 37.7749, lng: -122.4194, state: "CA" },
  "Portland, OR": { lat: 45.5152, lng: -122.6784, state: "OR" },
  "New York, NY": { lat: 40.7128, lng: -74.006, state: "NY" },
  "Austin, TX": { lat: 30.2672, lng: -97.7431, state: "TX" },
  "Columbus, OH": { lat: 39.9612, lng: -82.9988, state: "OH" },
  "Seattle, WA": { lat: 47.6062, lng: -122.3321, state: "WA" },
  "Denver, CO": { lat: 39.7392, lng: -104.9903, state: "CO" },
  "Atlanta, GA": { lat: 33.749, lng: -84.388, state: "GA" },
};

// Great-circle distance between two lat/lng points, in miles. Haversine formula.
export function haversineMiles(
  aLat: number, aLng: number, bLat: number, bLng: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Format a mile distance for display.
export function formatMiles(mi: number): string {
  if (mi < 1) return "< 1 mi";
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

// Format a US location label from a lead's city/state.
export function usLocationLabel(lead: Pick<Lead, "city" | "state">): string {
  if (lead.city && lead.state) return `${lead.city}, ${lead.state}`;
  if (lead.city) return lead.city;
  if (lead.state) return stateName(lead.state);
  return "—";
}

// Company-size band ordering, so we can match "similar size" within ±1 band.
export const SIZE_BANDS = ["1-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"];

export function sizeBandIndex(size?: string | null): number {
  if (!size) return -1;
  return SIZE_BANDS.indexOf(size);
}

export interface NearbyResult {
  lead: Lead;
  miles: number | null; // null when coordinates are missing
}

/**
 * Rank US leads that are "similar" to a given lead:
 *  - same industry
 *  - company size within ±1 band (or unknown band tolerated)
 *  - within `radiusMiles` (when both have coordinates)
 * Sorted nearest-first; coordinate-less matches sink to the bottom.
 */
export function findSimilarNearby(
  target: Lead,
  all: Lead[],
  radiusMiles: number,
): NearbyResult[] {
  const tBand = sizeBandIndex(target.companySize);
  const hasTargetCoords = target.lat != null && target.lng != null;

  const results: NearbyResult[] = [];
  for (const l of all) {
    if (l.id === target.id) continue;
    if (l.country !== "United States") continue;
    if (l.industry !== target.industry) continue;

    const lBand = sizeBandIndex(l.companySize);
    if (tBand >= 0 && lBand >= 0 && Math.abs(tBand - lBand) > 1) continue;

    let miles: number | null = null;
    if (hasTargetCoords && l.lat != null && l.lng != null) {
      miles = haversineMiles(target.lat!, target.lng!, l.lat, l.lng);
      if (miles > radiusMiles) continue;
    }
    results.push({ lead: l, miles });
  }

  results.sort((a, b) => {
    if (a.miles == null && b.miles == null) return 0;
    if (a.miles == null) return 1;
    if (b.miles == null) return -1;
    return a.miles - b.miles;
  });
  return results;
}

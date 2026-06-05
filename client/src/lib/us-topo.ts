// US map geometry: Albers USA projection + state outlines for the Territory Map.
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import statesTopo from "us-atlas/states-10m.json";

// Fixed viewBox the projection is fit to. Keeps pin math and SVG in lockstep.
export const MAP_W = 960;
export const MAP_H = 600;

// Build the GeoJSON FeatureCollection of US states from the bundled topology.
const statesFc = feature(statesTopo as any, (statesTopo as any).objects.states) as any;

// One shared projection, fit to the viewBox. geoAlbersUsa already insets AK/HI.
const projection = geoAlbersUsa().fitSize([MAP_W, MAP_H], statesFc);
const pathGen = geoPath(projection);

export interface StatePath {
  id: string; // numeric FIPS id as string
  name: string;
  d: string; // SVG path data
}

// Precomputed state outlines (path data) for rendering.
export const STATE_PATHS: StatePath[] = statesFc.features.map((f: any) => ({
  id: String(f.id),
  name: f.properties?.name ?? "",
  d: pathGen(f) ?? "",
}));

// Project a lat/lng to SVG coordinates within the viewBox. Returns null if
// the point falls outside the Albers USA frame (e.g. non-US coordinates).
export function projectPoint(lat: number, lng: number): { x: number; y: number } | null {
  const p = projection([lng, lat]);
  if (!p) return null;
  const [x, y] = p;
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

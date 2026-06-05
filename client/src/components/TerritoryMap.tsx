import { useMemo, useState } from "react";
import type { Lead } from "@shared/schema";
import { STATE_PATHS, projectPoint, MAP_W, MAP_H } from "@/lib/us-topo";
import { stateName, usLocationLabel } from "@/lib/geo-data";
import { STATUS_META } from "@/lib/i18n-data";
import { CheckCircle2, MapPin, X } from "lucide-react";

// Semantic pin colors per pipeline stage (consistent across light/dark).
const STATUS_COLOR: Record<string, string> = {
  new: "#64748b",       // slate
  contacted: "#3b82f6", // blue
  engaged: "#8b5cf6",   // violet
  meeting: "#f59e0b",   // amber
  won: "#10b981",       // emerald
  lost: "#f43f5e",      // rose
};

// Pin radius by company-size band — bigger company, bigger dot.
const SIZE_RADIUS: Record<string, number> = {
  "1-50": 4, "51-200": 5, "201-500": 6, "501-1000": 7, "1001-5000": 8, "5001+": 9,
};

interface MetroCluster {
  key: string;
  x: number;
  y: number;
  leads: Lead[];
}

export function TerritoryMap({
  leads,
  selectedState,
  onSelectState,
  onOpenLead,
}: {
  leads: Lead[];
  selectedState: string | null;
  onSelectState: (fips: string | null) => void;
  onOpenLead: (id: number) => void;
}) {
  const [hover, setHover] = useState<{ cluster: MetroCluster } | null>(null);

  // Group US leads with coordinates into metro clusters at a shared projected point.
  const clusters = useMemo<MetroCluster[]>(() => {
    const map = new Map<string, MetroCluster>();
    for (const l of leads) {
      if (l.country !== "United States" || l.lat == null || l.lng == null) continue;
      const pt = projectPoint(l.lat, l.lng);
      if (!pt) continue;
      const key = l.metro ?? `${l.lat},${l.lng}`;
      if (!map.has(key)) map.set(key, { key, x: pt.x, y: pt.y, leads: [] });
      map.get(key)!.leads.push(l);
    }
    return [...map.values()];
  }, [leads]);

  // Which FIPS state ids have at least one lead (for subtle "active territory" fill).
  const activeStateNames = useMemo(() => {
    const s = new Set<string>();
    for (const l of leads) if (l.state) s.add(stateName(l.state));
    return s;
  }, [leads]);

  const totalPins = clusters.reduce((n, c) => n + c.leads.length, 0);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="US territory map"
        data-testid="territory-map-svg"
      >
        {/* State outlines */}
        <g>
          {STATE_PATHS.map((s) => {
            const isActive = activeStateNames.has(s.name);
            const isSelected = selectedState === s.id;
            return (
              <path
                key={s.id}
                d={s.d}
                data-testid={`map-state-${s.id}`}
                onClick={() => onSelectState(isSelected ? null : s.id)}
                className={[
                  "cursor-pointer transition-colors duration-150 stroke-border",
                  isSelected
                    ? "fill-primary/25"
                    : isActive
                    ? "fill-primary/10 hover:fill-primary/20"
                    : "fill-muted hover:fill-muted-foreground/10",
                ].join(" ")}
                strokeWidth={0.6}
              />
            );
          })}
        </g>

        {/* Metro clusters */}
        <g>
          {clusters.map((c) => {
            const top = c.leads[0];
            const r = Math.max(...c.leads.map((l) => SIZE_RADIUS[l.companySize] ?? 5));
            const color = STATUS_COLOR[top.status] ?? "#64748b";
            const multi = c.leads.length > 1;
            return (
              <g
                key={c.key}
                transform={`translate(${c.x},${c.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHover({ cluster: c })}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  if (c.leads.length === 1) onOpenLead(c.leads[0].id);
                  else setHover({ cluster: c });
                }}
                data-testid={`map-cluster-${c.key.replace(/[^a-zA-Z0-9]/g, "-")}`}
              >
                {/* halo */}
                <circle r={r + 4} fill={color} opacity={0.18} />
                <circle
                  r={r}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={1.5}
                  className="dark:[stroke:hsl(var(--background))]"
                />
                {multi && (
                  <text
                    textAnchor="middle"
                    dy="0.32em"
                    className="fill-white text-[9px] font-semibold pointer-events-none"
                  >
                    {c.leads.length}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover / cluster tooltip */}
      {hover && (
        <div
          className="absolute z-10 max-w-[280px] rounded-lg border border-border bg-popover shadow-lg p-3 text-sm"
          style={{
            left: `${(hover.cluster.x / MAP_W) * 100}%`,
            top: `${(hover.cluster.y / MAP_H) * 100}%`,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
          data-testid="map-tooltip"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {hover.cluster.leads[0].metro ?? usLocationLabel(hover.cluster.leads[0])}
              <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
                {hover.cluster.leads.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHover(null)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="map-tooltip-close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {hover.cluster.leads.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onOpenLead(l.id)}
                className="w-full text-left rounded-md px-2 py-1.5 hover-elevate"
                data-testid={`map-tooltip-lead-${l.id}`}
              >
                <div className="font-medium text-xs flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: STATUS_COLOR[l.status] ?? "#64748b" }}
                  />
                  {l.company}
                  {l.verified && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                </div>
                <div className="text-[11px] text-muted-foreground pl-3.5">
                  {l.industry} · {l.companySize} · {STATUS_META[l.status]?.label ?? l.status}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground" data-testid="map-pin-total">
          {totalPins} businesses mapped
        </span>
        {Object.entries(STATUS_META).map(([k, meta]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[k] }} />
            {meta.label}
          </span>
        ))}
        <span className="ml-auto italic">Dot size = company size · click a state to focus a territory</span>
      </div>
    </div>
  );
}

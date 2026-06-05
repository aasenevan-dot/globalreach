export function scoreLead(lead: {
  status: string;
  verified: boolean;
  companySize: string;
  industry: string;
  dealValue?: number | null;
}): number {
  let s = 0;
  const statusMap: Record<string, number> = { new: 5, contacted: 15, engaged: 30, meeting: 50, won: 90, lost: 5 };
  s += statusMap[lead.status] ?? 5;
  if (lead.verified) s += 10;
  const sizeMap: Record<string, number> = { "1-10": 0, "11-50": 5, "51-200": 10, "201-500": 15, "501-1000": 20, "1000+": 25 };
  s += sizeMap[lead.companySize] ?? 0;
  if (["SaaS","FinTech","Healthcare","Software","Technology"].includes(lead.industry)) s += 5;
  const dv = lead.dealValue ?? 0;
  if (dv > 100000) s += 10;
  else if (dv > 50000) s += 7;
  else if (dv > 10000) s += 4;
  else if (dv > 0) s += 2;
  return Math.min(100, Math.max(0, s));
}

export function scoreLabel(score: number): { label: string; className: string } {
  if (score >= 76) return { label: "Qualified", className: "text-emerald-500" };
  if (score >= 56) return { label: "Hot", className: "text-orange-500" };
  if (score >= 31) return { label: "Warm", className: "text-amber-400" };
  return { label: "Cold", className: "text-slate-400" };
}

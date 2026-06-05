export interface ScoringInput {
  status: string;
  verified: boolean;
  companySize: string;
  industry: string;
  dealValue?: number | null;
  messageCount?: number;
  repliedCount?: number;
}

export function scoreLead(input: ScoringInput): number {
  let s = 0;
  const statusMap: Record<string, number> = { new: 5, contacted: 15, engaged: 30, meeting: 50, won: 90, lost: 5 };
  s += statusMap[input.status] ?? 5;
  if (input.verified) s += 10;
  const sizeMap: Record<string, number> = { "1-10": 0, "11-50": 5, "51-200": 10, "201-500": 15, "501-1000": 20, "1000+": 25 };
  s += sizeMap[input.companySize] ?? 0;
  if (["SaaS","FinTech","Healthcare","Software","Technology"].includes(input.industry)) s += 5;
  const dv = input.dealValue ?? 0;
  if (dv > 100000) s += 10;
  else if (dv > 50000) s += 7;
  else if (dv > 10000) s += 4;
  else if (dv > 0) s += 2;
  const mc = input.messageCount ?? 0;
  if (mc > 5) s += 5; else if (mc > 2) s += 3; else if (mc > 0) s += 1;
  if ((input.repliedCount ?? 0) > 0) s += 8;
  return Math.min(100, Math.max(0, s));
}

export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 76) return { label: "Qualified", color: "text-emerald-500" };
  if (score >= 56) return { label: "Hot", color: "text-orange-500" };
  if (score >= 31) return { label: "Warm", color: "text-amber-400" };
  return { label: "Cold", color: "text-blue-400" };
}

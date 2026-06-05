import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

// Country → IANA timezone + default language (mirrors Add/Edit lead).
const COUNTRY_DEFAULTS: Record<string, { tz: string; lang: string }> = {
  "United States": { tz: "America/New_York", lang: "en" },
  Germany: { tz: "Europe/Berlin", lang: "de" },
  Spain: { tz: "Europe/Madrid", lang: "es" },
  France: { tz: "Europe/Paris", lang: "fr" },
  Italy: { tz: "Europe/Rome", lang: "it" },
  Brazil: { tz: "America/Sao_Paulo", lang: "pt" },
  Poland: { tz: "Europe/Warsaw", lang: "pl" },
  Japan: { tz: "Asia/Tokyo", lang: "ja" },
  China: { tz: "Asia/Shanghai", lang: "zh" },
  "United Arab Emirates": { tz: "Asia/Dubai", lang: "ar" },
  Ireland: { tz: "Europe/Dublin", lang: "en" },
};

const SAMPLE = `full_name,title,company,email,phone,country,city,industry,company_size
Jordan Mitchell,VP Sales,Brightline Logistics,jordan@brightline.com,555-0101,United States,Chicago,Logistics,201-500
Priya Anand,Head of Ops,Northwind Tech,priya@northwind.com,,United States,Austin,SaaS,51-200`;

// Minimal CSV parser handling quoted fields and commas inside quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  return rows;
}

// Map a header label to a known field key.
const HEADER_ALIASES: Record<string, string> = {
  full_name: "fullName", fullname: "fullName", name: "fullName",
  title: "title", role: "title",
  company: "company", organization: "company",
  email: "email", "email address": "email",
  phone: "phone", "phone number": "phone",
  country: "country",
  city: "city", location: "city",
  industry: "industry",
  company_size: "companySize", "company size": "companySize", size: "companySize",
};

type ParsedLead = {
  fullName: string; title: string; company: string; email: string;
  phone: string | null; country: string; city: string | null;
  industry: string; companySize: string;
};

export function ImportLeadsDialog() {
  const { isInternational } = useMode();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");

  const { valid, invalid, total } = useMemo(() => {
    const rows = parseCsv(raw.trim());
    if (rows.length < 2) return { valid: [] as ParsedLead[], invalid: 0, total: 0 };
    const headers = rows[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim().toLowerCase());
    const out: ParsedLead[] = [];
    let bad = 0;
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const rec: Record<string, string> = {};
      headers.forEach((h, i) => { rec[h] = (cells[i] ?? "").trim(); });
      // Required fields.
      if (!rec.fullName || !rec.company || !rec.email) { bad++; continue; }
      // Local mode forces the home country.
      const country = isInternational ? (rec.country || "United States") : "United States";
      out.push({
        fullName: rec.fullName,
        title: rec.title || "—",
        company: rec.company,
        email: rec.email,
        phone: rec.phone || null,
        country,
        city: rec.city || null,
        industry: rec.industry || "General",
        companySize: rec.companySize || "51-200",
      });
    }
    return { valid: out, invalid: bad, total: rows.length - 1 };
  }, [raw, isInternational]);

  const importMut = useMutation({
    mutationFn: async () => {
      const leads = valid.map((l) => {
        const d = COUNTRY_DEFAULTS[l.country] ?? { tz: "America/New_York", lang: "en" };
        return { ...l, timezone: d.tz, language: d.lang, verified: false, status: "new" };
      });
      return apiRequest("POST", "/api/leads/bulk", { leads });
    },
    onSuccess: async (res: any) => {
      const data = await res.json().catch(() => ({ created: valid.length, skipped: invalid }));
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Import complete",
        description: `${data.created} lead${data.created === 1 ? "" : "s"} added${data.skipped ? `, ${data.skipped} skipped` : ""}.`,
      });
      setRaw("");
      setOpen(false);
    },
    onError: () => toast({ title: "Import failed", variant: "destructive" }),
  });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setRaw(await file.text()); }
    catch { toast({ title: "Couldn't read file", variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5" data-testid="button-import-leads">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            Paste CSV rows or choose a file. The header row is required — at minimum
            <span className="font-medium"> full_name, company, email</span>.
            {!isInternational && " In Local mode every lead is set to your home country."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer rounded-md border border-border px-3 py-1.5 hover-elevate" data-testid="label-file-import">
              <FileText className="h-4 w-4" /> Choose .csv file
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} data-testid="input-file-import" />
            </label>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              data-testid="button-load-sample"
              onClick={() => setRaw(SAMPLE)}
            >
              Load sample data
            </button>
          </div>

          <Textarea
            data-testid="input-csv"
            rows={8}
            className="font-mono text-xs"
            placeholder={SAMPLE}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />

          {total > 0 && (
            <div className="flex items-center gap-4 text-sm" data-testid="text-import-summary">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {valid.length} ready to import
              </span>
              {invalid > 0 && (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> {invalid} skipped (missing name, company, or email)
                </span>
              )}
            </div>
          )}

          {valid.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-1.5 font-medium">Name</th>
                      <th className="px-3 py-1.5 font-medium">Company</th>
                      <th className="px-3 py-1.5 font-medium">Email</th>
                      {isInternational && <th className="px-3 py-1.5 font-medium">Country</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {valid.slice(0, 50).map((l, i) => (
                      <tr key={i} className="border-t border-border" data-testid={`row-preview-${i}`}>
                        <td className="px-3 py-1.5">{l.fullName}</td>
                        <td className="px-3 py-1.5">{l.company}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{l.email}</td>
                        {isInternational && <td className="px-3 py-1.5">{l.country}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            data-testid="button-confirm-import"
            disabled={valid.length === 0 || importMut.isPending}
            onClick={() => importMut.mutate()}
          >
            {importMut.isPending ? "Importing…" : `Import ${valid.length} lead${valid.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

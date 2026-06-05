import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import { LANGUAGES, COUNTRY_FLAG } from "@/lib/i18n-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

// Country → sensible IANA timezone + default language defaults.
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

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

const EMPTY = {
  fullName: "", title: "", company: "", email: "", phone: "",
  country: "United States", city: "", industry: "", companySize: "51-200",
};

export function AddLeadDialog() {
  const { isInternational } = useMode();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const { toast } = useToast();

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      const d = COUNTRY_DEFAULTS[form.country] ?? { tz: "America/New_York", lang: "en" };
      return apiRequest("POST", "/api/leads", {
        fullName: form.fullName,
        title: form.title || "—",
        company: form.company,
        email: form.email,
        phone: form.phone || null,
        country: form.country,
        city: form.city || null,
        timezone: d.tz,
        language: d.lang,
        industry: form.industry || "General",
        companySize: form.companySize,
        verified: false,
        status: "new",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead added", description: `${form.fullName} added to your database.` });
      setForm({ ...EMPTY });
      setOpen(false);
    },
    onError: () => toast({ title: "Couldn't add lead", description: "Check the required fields.", variant: "destructive" }),
  });

  const valid = form.fullName.trim() && form.company.trim() && form.email.trim();
  // Local mode locks the country to the home market.
  const countries = isInternational ? Object.keys(COUNTRY_DEFAULTS) : ["United States"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-lead" className="gap-1.5">
          <UserPlus className="h-4 w-4" /> Add lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a new lead</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="ld-name">Full name *</Label>
            <Input id="ld-name" data-testid="input-lead-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Jordan Mitchell" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="ld-title">Title</Label>
            <Input id="ld-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="VP of Sales" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="ld-company">Company *</Label>
            <Input id="ld-company" data-testid="input-lead-company" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Brightline Logistics" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="ld-email">Email *</Label>
            <Input id="ld-email" data-testid="input-lead-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="j.mitchell@brightline.com" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label>Country</Label>
            <Select value={form.country} onValueChange={(v) => set("country", v)}>
              <SelectTrigger data-testid="select-lead-country"><SelectValue /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>{COUNTRY_FLAG[c] ?? "🌍"} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="ld-city">City</Label>
            <Input id="ld-city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Chicago" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="ld-industry">Industry</Label>
            <Input id="ld-industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Logistics" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label>Company size</Label>
            <Select value={form.companySize} onValueChange={(v) => set("companySize", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isInternational && (
            <p className="col-span-2 text-xs text-muted-foreground">
              Timezone and language are set automatically from the selected country so outreach localizes correctly.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button data-testid="button-save-lead" disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Adding…" : "Add lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

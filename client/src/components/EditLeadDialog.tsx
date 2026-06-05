import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import { COUNTRY_FLAG } from "@/lib/i18n-data";
import type { Lead } from "@shared/schema";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Country → IANA timezone + default language. Mirrors AddLeadDialog.
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

export function EditLeadDialog({
  lead, open, onOpenChange,
}: { lead: Lead; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { isInternational } = useMode();
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: lead.fullName, title: lead.title, company: lead.company,
    email: lead.email, phone: lead.phone ?? "", country: lead.country,
    city: lead.city ?? "", industry: lead.industry, companySize: lead.companySize,
  });

  // Re-sync when a different lead is opened.
  useEffect(() => {
    setForm({
      fullName: lead.fullName, title: lead.title, company: lead.company,
      email: lead.email, phone: lead.phone ?? "", country: lead.country,
      city: lead.city ?? "", industry: lead.industry, companySize: lead.companySize,
    });
  }, [lead.id]);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const nameError = touched.fullName && !form.fullName.trim() ? "This field is required" : "";
  const companyError = touched.company && !form.company.trim() ? "This field is required" : "";
  const emailError = touched.email
    ? !form.email.trim()
      ? "This field is required"
      : !isValidEmail(form.email)
      ? "Please enter a valid email address"
      : ""
    : "";

  const update = useMutation({
    mutationFn: async () => {
      // Keep timezone/language in sync if the country changed.
      const patch: Record<string, any> = {
        fullName: form.fullName,
        title: form.title || "—",
        company: form.company,
        email: form.email,
        phone: form.phone || null,
        country: form.country,
        city: form.city || null,
        industry: form.industry || "General",
        companySize: form.companySize,
      };
      if (form.country !== lead.country) {
        const d = COUNTRY_DEFAULTS[form.country] ?? { tz: "America/New_York", lang: "en" };
        patch.timezone = d.tz;
        patch.language = d.lang;
      }
      return apiRequest("PATCH", `/api/leads/${lead.id}`, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id] });
      toast({ title: "Lead updated", description: `${form.fullName} saved.` });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Couldn't save", description: "Check the required fields.", variant: "destructive" }),
  });

  const valid = form.fullName.trim() && form.company.trim() && form.email.trim() && isValidEmail(form.email);
  const countries = isInternational ? Object.keys(COUNTRY_DEFAULTS) : ["United States"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="el-name">Full name *</Label>
            <Input id="el-name" data-testid="input-edit-lead-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} onBlur={() => touch("fullName")} className={nameError ? "border-red-500 focus-visible:ring-red-500" : ""} />
            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="el-title">Title</Label>
            <Input id="el-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="el-company">Company *</Label>
            <Input id="el-company" data-testid="input-edit-lead-company" value={form.company} onChange={(e) => set("company", e.target.value)} onBlur={() => touch("company")} className={companyError ? "border-red-500 focus-visible:ring-red-500" : ""} />
            {companyError && <p className="text-xs text-red-500">{companyError}</p>}
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="el-email">Email *</Label>
            <Input id="el-email" data-testid="input-edit-lead-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} onBlur={() => touch("email")} className={emailError ? "border-red-500 focus-visible:ring-red-500" : ""} />
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="el-phone">Phone</Label>
            <Input id="el-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label>Country</Label>
            <Select value={form.country} onValueChange={(v) => set("country", v)}>
              <SelectTrigger data-testid="select-edit-lead-country"><SelectValue /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>{COUNTRY_FLAG[c] ?? "🌍"} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="el-city">City</Label>
            <Input id="el-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="el-industry">Industry</Label>
            <Input id="el-industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
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
          {isInternational && form.country !== lead.country && (
            <p className="col-span-2 text-xs text-muted-foreground">
              Timezone and language will update automatically to match the new country.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-testid="button-update-lead" disabled={!valid || update.isPending} onClick={() => { setTouched({ fullName: true, company: true, email: true }); if (valid) update.mutate(); }}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

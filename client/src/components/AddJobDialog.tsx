import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ROOF_TYPES } from "@/lib/i18n-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { HardHat } from "lucide-react";

const EMPTY = {
  homeowner: "", phone: "", email: "", address: "", city: "Greensburg", state: "IN",
  roofType: "Asphalt shingle", referredBy: "", value: "",
};

// `knownSources` powers a datalist so referral sources stay consistent for ROI.
export function AddJobDialog({ knownSources = [] }: { knownSources?: string[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [insuranceClaim, setInsuranceClaim] = useState(false);
  const { toast } = useToast();

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/jobs", {
        homeowner: form.homeowner,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        roofType: form.roofType,
        insuranceClaim,
        referredBy: form.referredBy || null,
        value: form.value ? Math.round(Number(form.value)) : null,
        stage: "inspection",
        notes: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job added", description: `${form.homeowner}'s job is in Inspection.` });
      setForm({ ...EMPTY });
      setInsuranceClaim(false);
      setOpen(false);
    },
    onError: () => toast({ title: "Couldn't add job", description: "Check the required fields.", variant: "destructive" }),
  });

  const valid = form.homeowner.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-job" className="gap-1.5">
          <HardHat className="h-4 w-4" /> Add job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a homeowner job</DialogTitle>
        </DialogHeader>
        <datalist id="job-sources">
          {knownSources.map((s) => <option key={s} value={s} />)}
        </datalist>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="jb-name">Homeowner *</Label>
            <Input id="jb-name" data-testid="input-job-homeowner" value={form.homeowner} onChange={(e) => set("homeowner", e.target.value)} placeholder="Carol Whitmore" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="jb-phone">Phone</Label>
            <Input id="jb-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 812 555 0142" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="jb-address">Property address</Label>
            <Input id="jb-address" data-testid="input-job-address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="412 Maple St" />
          </div>
          <div className="col-span-1 space-y-1.5">
            <Label htmlFor="jb-city">City</Label>
            <Input id="jb-city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Greensburg" />
          </div>
          <div className="col-span-1 space-y-1.5">
            <Label htmlFor="jb-state">State</Label>
            <Input id="jb-state" value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="IN" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label>Roof / service type</Label>
            <Select value={form.roofType} onValueChange={(v) => set("roofType", v)}>
              <SelectTrigger data-testid="select-job-roof-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROOF_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label htmlFor="jb-value">Estimated value (USD)</Label>
            <Input id="jb-value" data-testid="input-job-value" type="number" inputMode="numeric" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="14500" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="jb-source">Referral source</Label>
            <Input id="jb-source" data-testid="input-job-source" list="job-sources" value={form.referredBy} onChange={(e) => set("referredBy", e.target.value)} placeholder="State Farm — Greensburg (Tom Reilly)" />
            <p className="text-xs text-muted-foreground">Who sent this homeowner your way. Feeds source ROI in Analytics.</p>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Insurance claim</div>
              <div className="text-xs text-muted-foreground">Storm/hail damage filed through a carrier</div>
            </div>
            <Switch data-testid="switch-job-insurance" checked={insuranceClaim} onCheckedChange={setInsuranceClaim} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button data-testid="button-save-job" disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Adding…" : "Add job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

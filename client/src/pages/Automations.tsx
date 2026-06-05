import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  Plus, Trash2, ArrowLeft, Zap, ChevronRight, GitBranch,
  PlayCircle, PauseCircle, Save, ArrowRight, Filter, Settings2,
} from "lucide-react";

interface Form { id: number; name: string; }
interface Campaign { id: number; name: string; }
interface Automation {
  id: number;
  name: string;
  triggerType: string;
  triggerConfig: string;
  conditions: string;
  actions: string;
  active: boolean;
  runCount: number;
  createdAt: string;
}

const TRIGGER_TYPES = [
  { value: "lead_created", label: "Lead Created", desc: "Fires when a new lead is added to your pipeline" },
  { value: "status_changed", label: "Lead Status Changed", desc: "Fires when a lead moves to a specific stage" },
  { value: "form_submitted", label: "Form Submitted", desc: "Fires when someone submits a form" },
  { value: "campaign_replied", label: "Campaign Reply", desc: "Fires when a lead replies to a campaign message" },
];

const CONDITION_FIELDS = [
  { value: "industry", label: "Industry" },
  { value: "companySize", label: "Company Size" },
  { value: "country", label: "Country" },
  { value: "status", label: "Current Status" },
];

const CONDITION_OPS = [
  { value: "eq", label: "is" },
  { value: "neq", label: "is not" },
  { value: "contains", label: "contains" },
];

const ACTION_TYPES = [
  { value: "update_status", label: "Update Lead Status", icon: Settings2 },
  { value: "add_to_campaign", label: "Enroll in Campaign", icon: Zap },
  { value: "notify", label: "Send Notification", icon: PlayCircle },
];

const STATUS_OPTIONS = ["new","contacted","engaged","meeting","won","lost"];
const INDUSTRIES = ["SaaS","FinTech","Healthcare","Manufacturing","Retail","Consulting","E-Commerce","Cybersecurity"];

interface Condition { id: string; field: string; op: string; value: string; }
interface Action { id: string; type: string; value?: string; campaignId?: number; message?: string; }

function uid() { return Math.random().toString(36).slice(2, 9); }
function parse<T>(s: string, fallback: T): T { try { return JSON.parse(s); } catch { return fallback; } }

function TriggerBlock({ triggerType, triggerConfig, onChange, forms, campaigns }: {
  triggerType: string;
  triggerConfig: Record<string, any>;
  onChange: (type: string, config: Record<string, any>) => void;
  forms: Form[];
  campaigns: Campaign[];
}) {
  const trigger = TRIGGER_TYPES.find(t => t.value === triggerType) || TRIGGER_TYPES[0];

  return (
    <div className="bg-card border-2 border-primary/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-primary">Trigger</span>
      </div>
      <Select value={triggerType} onValueChange={v => onChange(v, {})}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRIGGER_TYPES.map(t => (
            <SelectItem key={t.value} value={t.value}>
              <div>
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.desc}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {triggerType === "status_changed" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">When status becomes</span>
          <Select value={triggerConfig.toStatus || ""} onValueChange={v => onChange(triggerType, { ...triggerConfig, toStatus: v })}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder="any status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {triggerType === "form_submitted" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">When form:</span>
          <Select value={String(triggerConfig.formId || "any")} onValueChange={v => onChange(triggerType, { ...triggerConfig, formId: v === "any" ? undefined : parseInt(v) })}>
            <SelectTrigger className="h-8 w-48">
              <SelectValue placeholder="Any form" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any form</SelectItem>
              {forms.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function ConditionBlock({ conditions, onChange }: { conditions: Condition[]; onChange: (c: Condition[]) => void }) {
  const add = () => onChange([...conditions, { id: uid(), field: "industry", op: "eq", value: "" }]);
  const update = (id: string, patch: Partial<Condition>) => onChange(conditions.map(c => c.id === id ? { ...c, ...patch } : c));
  const remove = (id: string) => onChange(conditions.filter(c => c.id !== id));

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Filter className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Conditions</span>
          <span className="text-xs text-muted-foreground">(optional filters)</span>
        </div>
        <Button variant="ghost" size="sm" onClick={add} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      {conditions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No conditions — automation runs for all matching triggers.</p>
      ) : (
        <div className="space-y-2">
          {conditions.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2">
              {i > 0 && <span className="text-xs text-muted-foreground w-6">AND</span>}
              {i === 0 && <span className="text-xs text-muted-foreground w-6">If</span>}
              <Select value={c.field} onValueChange={v => update(c.id, { field: v })}>
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={c.op} onValueChange={v => update(c.id, { op: v })}>
                <SelectTrigger className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {c.field === "industry" ? (
                <Select value={c.value} onValueChange={v => update(c.id, { value: v })}>
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : c.field === "status" ? (
                <Select value={c.value} onValueChange={v => update(c.id, { value: v })}>
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={c.value} onChange={e => update(c.id, { value: e.target.value })} className="h-8 flex-1" placeholder="Value" />
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(c.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionsBlock({ actions, onChange, campaigns }: { actions: Action[]; onChange: (a: Action[]) => void; campaigns: Campaign[]; }) {
  const add = () => onChange([...actions, { id: uid(), type: "update_status", value: "contacted" }]);
  const update = (id: string, patch: Partial<Action>) => onChange(actions.map(a => a.id === id ? { ...a, ...patch } : a));
  const remove = (id: string) => onChange(actions.filter(a => a.id !== id));

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <ChevronRight className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Actions</span>
        </div>
        <Button variant="ghost" size="sm" onClick={add} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No actions yet — add at least one.</p>
      ) : (
        <div className="space-y-2">
          {actions.map((action, i) => (
            <div key={action.id} className="flex items-center gap-2">
              {i > 0 && <span className="text-xs text-muted-foreground w-6">then</span>}
              {i === 0 && <span className="text-xs text-muted-foreground w-6">Do</span>}
              <Select value={action.type} onValueChange={v => update(action.id, { type: v })}>
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {action.type === "update_status" && (
                <Select value={action.value || ""} onValueChange={v => update(action.id, { value: v })}>
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {action.type === "add_to_campaign" && (
                <Select value={String(action.campaignId || "")} onValueChange={v => update(action.id, { campaignId: parseInt(v) })}>
                  <SelectTrigger className="h-8 w-48">
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {action.type === "notify" && (
                <Input value={action.message || ""} onChange={e => update(action.id, { message: e.target.value })} className="h-8 flex-1" placeholder="Notification message" />
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(action.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AutomationBuilder({ automation, onClose }: { automation?: Automation; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(automation?.name || "");
  const [triggerType, setTriggerType] = useState(automation?.triggerType || "lead_created");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(parse(automation?.triggerConfig || "{}", {}));
  const [conditions, setConditions] = useState<Condition[]>(parse(automation?.conditions || "[]", []));
  const [actions, setActions] = useState<Action[]>(parse(automation?.actions || "[]", []));
  const [active, setActive] = useState(automation?.active || false);

  const { data: forms = [] } = useQuery<Form[]>({ queryKey: ["/api/forms"] });
  const { data: campaigns = [] } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name || "Untitled Automation",
        triggerType,
        triggerConfig: JSON.stringify(triggerConfig),
        conditions: JSON.stringify(conditions),
        actions: JSON.stringify(actions),
        active,
        runCount: automation?.runCount || 0,
        createdAt: automation?.createdAt || new Date().toISOString(),
      };
      const url = automation ? `/api/automations/${automation.id}` : "/api/automations";
      const method = automation ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/automations"] }); toast({ title: "Automation saved" }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="h-4 w-4" /></Button>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Automation name…"
          className="text-lg font-semibold h-10 border-none shadow-none px-0 focus-visible:ring-0 max-w-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setActive(a => !a)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${active ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" : "border-border text-muted-foreground"}`}
          >
            {active ? <><PlayCircle className="h-4 w-4" /> Active</> : <><PauseCircle className="h-4 w-4" /> Inactive</>}
          </button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            <Save className="h-3.5 w-3.5" /> {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl space-y-3">
        <TriggerBlock
          triggerType={triggerType}
          triggerConfig={triggerConfig}
          onChange={(type, config) => { setTriggerType(type); setTriggerConfig(config); }}
          forms={forms}
          campaigns={campaigns}
        />
        <div className="flex justify-center py-1">
          <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
        </div>
        <ConditionBlock conditions={conditions} onChange={setConditions} />
        <div className="flex justify-center py-1">
          <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
        </div>
        <ActionsBlock actions={actions} onChange={setActions} campaigns={campaigns} />
      </div>
    </div>
  );
}

export default function Automations() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Automation | undefined>();
  const [creating, setCreating] = useState(false);

  const { data: automationsList = [], isLoading } = useQuery<Automation[]>({ queryKey: ["/api/automations"] });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const r = await fetch(`/api/automations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/automations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/automations/${id}`, { method: "DELETE" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/automations"] }); toast({ title: "Automation deleted" }); },
  });

  if (creating) return <AutomationBuilder onClose={() => setCreating(false)} />;
  if (editing) return <AutomationBuilder automation={editing} onClose={() => setEditing(undefined)} />;

  const triggerLabel = (type: string) => TRIGGER_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground text-sm mt-1">Build workflows that run automatically when triggers fire</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Automation
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : automationsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
          <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold mb-1">No automations yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Automate repetitive tasks like enrolling leads in campaigns or updating statuses.</p>
          <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="h-4 w-4" /> Create your first automation</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {automationsList.map(auto => {
            const actionsArr = parse<Action[]>(auto.actions, []);
            const conditionsArr = parse<Condition[]>(auto.conditions, []);
            return (
              <div key={auto.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${auto.active ? "bg-emerald-500/15" : "bg-muted"}`}>
                    <GitBranch className={`h-5 w-5 ${auto.active ? "text-emerald-500" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{auto.name}</span>
                      <Badge variant={auto.active ? "default" : "secondary"} className="text-xs">
                        {auto.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{triggerLabel(auto.triggerType)}</span>
                      {conditionsArr.length > 0 && (
                        <><ArrowRight className="h-3 w-3" /><span>{conditionsArr.length} condition{conditionsArr.length !== 1 ? "s" : ""}</span></>
                      )}
                      {actionsArr.length > 0 && (
                        <><ArrowRight className="h-3 w-3" /><span>{actionsArr.length} action{actionsArr.length !== 1 ? "s" : ""}</span></>
                      )}
                      <span className="text-muted-foreground/60">· ran {auto.runCount} time{auto.runCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ id: auto.id, active: !auto.active })}
                    className={`h-8 px-3 rounded-md text-sm font-medium transition-colors ${auto.active ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {auto.active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  </button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(auto)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(auto.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

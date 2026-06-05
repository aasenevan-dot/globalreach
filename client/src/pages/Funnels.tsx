import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ArrowLeft, Copy, Eye, Globe, EyeOff,
  TrendingUp, MousePointerClick, Save, Layers,
} from "lucide-react";

interface Form { id: number; name: string; }
interface Funnel {
  id: number;
  name: string;
  headline: string;
  subheadline: string;
  bodyText: string;
  ctaText: string;
  formId: number | null;
  theme: string;
  published: boolean;
  slug: string;
  createdAt: string;
  views: number;
  conversions: number;
}

const THEMES = [
  { value: "dark", label: "Dark", preview: "bg-gray-950 text-white" },
  { value: "light", label: "Light", preview: "bg-white text-gray-900 border border-gray-200" },
  { value: "gradient", label: "Gradient", preview: "bg-gradient-to-br from-teal-900 to-blue-950 text-white" },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function FunnelPreview({ funnel, form }: { funnel: Partial<Funnel>; form?: Form }) {
  const theme = THEMES.find(t => t.value === funnel.theme) || THEMES[0];
  const bgClass = theme.value === "dark"
    ? "bg-gray-950"
    : theme.value === "light"
    ? "bg-white"
    : "bg-gradient-to-br from-teal-900 to-blue-950";
  const textClass = theme.value === "light" ? "text-gray-900" : "text-white";
  const borderClass = theme.value === "light" ? "border-gray-200 bg-white" : "border-white/10 bg-white/5";
  const inputClass = theme.value === "light" ? "bg-white border-gray-300 text-gray-900" : "bg-white/10 border-white/20 text-white placeholder:text-white/40";

  return (
    <div className={`rounded-xl overflow-hidden border ${theme.value === "light" ? "border-gray-200" : "border-white/10"}`}>
      <div className={`${bgClass} ${textClass} p-8 min-h-64`}>
        <div className={`max-w-sm mx-auto border ${borderClass} rounded-xl p-6 backdrop-blur-sm`}>
          <h2 className="text-xl font-bold mb-1 leading-tight">{funnel.headline || "Your Headline Here"}</h2>
          {funnel.subheadline && <p className="text-sm opacity-70 mb-2">{funnel.subheadline}</p>}
          {funnel.bodyText && <p className="text-xs opacity-55 mb-4 leading-relaxed">{funnel.bodyText}</p>}
          {form ? (
            <div className="space-y-2">
              <input className={`w-full px-3 py-2 rounded-md border text-sm ${inputClass}`} placeholder="Full Name" readOnly />
              <input className={`w-full px-3 py-2 rounded-md border text-sm ${inputClass}`} placeholder="Email" readOnly />
              <button className="w-full py-2.5 rounded-md bg-gradient-to-r from-red-500 to-teal-500 text-white text-sm font-bold mt-1">
                {funnel.ctaText || "Get Started"}
              </button>
            </div>
          ) : (
            <button className="w-full py-2.5 rounded-md bg-gradient-to-r from-red-500 to-teal-500 text-white text-sm font-bold">
              {funnel.ctaText || "Get Started"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FunnelEditor({ funnel, onClose }: { funnel?: Funnel; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(funnel?.name || "");
  const [headline, setHeadline] = useState(funnel?.headline || "");
  const [subheadline, setSubheadline] = useState(funnel?.subheadline || "");
  const [bodyText, setBodyText] = useState(funnel?.bodyText || "");
  const [ctaText, setCtaText] = useState(funnel?.ctaText || "Get Started");
  const [theme, setTheme] = useState(funnel?.theme || "dark");
  const [formId, setFormId] = useState<number | null>(funnel?.formId ?? null);
  const [published, setPublished] = useState(funnel?.published || false);
  const [slug, setSlug] = useState(funnel?.slug || "");

  const { data: forms = [] } = useQuery<Form[]>({ queryKey: ["/api/forms"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const computedSlug = slug || slugify(name || headline || "funnel");
      const payload = { name: name || headline || "Untitled Funnel", headline, subheadline, bodyText, ctaText, theme, formId, published, slug: computedSlug, createdAt: funnel?.createdAt || new Date().toISOString(), views: funnel?.views || 0, conversions: funnel?.conversions || 0 };
      const url = funnel ? `/api/funnels/${funnel.id}` : "/api/funnels";
      const method = funnel ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/funnels"] });
      toast({ title: "Funnel saved" });
    },
  });

  const previewFunnel = { headline, subheadline, bodyText, ctaText, theme, published };
  const selectedForm = forms.find(f => f.id === formId);
  const publicUrl = `${window.location.origin}/f/${slug || slugify(name || headline || "funnel")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="h-4 w-4" /></Button>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Funnel name…"
          className="text-lg font-semibold h-10 border-none shadow-none px-0 focus-visible:ring-0 max-w-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          {funnel && (
            <>
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "URL copied" }); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> {publicUrl}
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(publicUrl, "_blank")}
                className="gap-2"
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </Button>
            </>
          )}
          <Button
            variant={published ? "secondary" : "outline"}
            size="sm"
            onClick={() => setPublished(p => !p)}
            className="gap-2"
          >
            {published ? <><EyeOff className="h-3.5 w-3.5" /> Unpublish</> : <><Globe className="h-3.5 w-3.5" /> Publish</>}
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            <Save className="h-3.5 w-3.5" /> {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content</label>
            <div className="space-y-2">
              <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Main headline" className="font-medium" />
              <Input value={subheadline} onChange={e => setSubheadline(e.target.value)} placeholder="Subheadline (optional)" />
              <textarea
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                placeholder="Body text (optional) — describe your offer…"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
              <Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="CTA button text" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme</label>
            <div className="flex gap-2">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${t.preview} ${theme === t.value ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-90"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Form</label>
            <Select value={formId ? String(formId) : "none"} onValueChange={v => setFormId(v === "none" ? null : parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a form…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No form (CTA button only)</SelectItem>
                {forms.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/f/</span>
              <Input
                value={slug}
                onChange={e => setSlug(slugify(e.target.value))}
                placeholder={slugify(name || headline || "my-funnel")}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</div>
          </div>
          <FunnelPreview funnel={previewFunnel} form={selectedForm} />
          {published && funnel && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium mb-1">
                <Globe className="h-3.5 w-3.5" /> Published
              </div>
              <p className="text-muted-foreground text-xs">Your funnel is live at <code className="text-primary">{publicUrl}</code></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Funnels() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Funnel | undefined>();
  const [creating, setCreating] = useState(false);

  const { data: funnelsList = [], isLoading } = useQuery<Funnel[]>({ queryKey: ["/api/funnels"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/funnels/${id}`, { method: "DELETE" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/funnels"] }); toast({ title: "Funnel deleted" }); },
  });

  if (creating) return <FunnelEditor onClose={() => setCreating(false)} />;
  if (editing) return <FunnelEditor funnel={editing} onClose={() => setEditing(undefined)} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Funnels</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Build high-converting landing pages that feed leads straight into your pipeline</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Funnel
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2].map(i => <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />)}
        </div>
      ) : funnelsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
          <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold mb-1">No funnels yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create a landing page funnel to capture and convert leads.</p>
          <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="h-4 w-4" /> Create your first funnel</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {funnelsList.map(funnel => {
            const convRate = funnel.views > 0 ? ((funnel.conversions / funnel.views) * 100).toFixed(1) : "0";
            const publicUrl = `${window.location.origin}/f/${funnel.slug}`;
            return (
              <div key={funnel.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${funnel.published ? "bg-emerald-500/15" : "bg-muted"}`}>
                    {funnel.published ? <Globe className="h-5 w-5 text-emerald-500" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{funnel.name}</span>
                      <Badge variant={funnel.published ? "default" : "secondary"} className="text-xs">
                        {funnel.published ? "Live" : "Draft"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-4">
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{funnel.views.toLocaleString()} views</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" />{funnel.conversions} conversions</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" />{convRate}% rate</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {funnel.published && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "URL copied" }); }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 max-w-48 truncate"
                    >
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">/f/{funnel.slug}</span>
                    </button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setEditing(funnel)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(funnel.id)}>
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

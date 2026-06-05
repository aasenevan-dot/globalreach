import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  Plus, GripVertical, Trash2, ChevronRight, Eye, Save, Copy,
  FileText, Users, ArrowLeft, CheckCircle2, Mail, Phone, AlignLeft, AlignJustify, ChevronDown,
} from "lucide-react";

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "company" | "textarea" | "select" | "name";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string; // comma-separated for select type
}

interface Form {
  id: number;
  name: string;
  fields: string;
  createdAt: string;
  submissionCount?: number;
}

const FIELD_TYPES = [
  { value: "name", label: "Full Name", icon: Users },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "text", label: "Short Text", icon: AlignLeft },
  { value: "company", label: "Company", icon: ChevronRight },
  { value: "textarea", label: "Long Text", icon: AlignJustify },
  { value: "select", label: "Dropdown", icon: ChevronDown },
];

const FIELD_TYPE_DEFAULTS: Record<string, Partial<FormField>> = {
  name: { label: "Full Name", placeholder: "Enter your name" },
  email: { label: "Email", placeholder: "you@company.com" },
  phone: { label: "Phone", placeholder: "+1 (555) 000-0000" },
  text: { label: "Text Field", placeholder: "" },
  company: { label: "Company", placeholder: "Your company" },
  textarea: { label: "Message", placeholder: "Tell us more..." },
  select: { label: "Department", options: "Sales,Marketing,Engineering,Other" },
};

function uid() { return Math.random().toString(36).slice(2, 9); }
function parseFields(raw: string): FormField[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function FormPreview({ fields, name }: { fields: FormField[]; name: string }) {
  return (
    <div className="bg-background border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-base">{name || "Untitled Form"}</h3>
      {fields.length === 0 && (
        <p className="text-muted-foreground text-sm">Add fields to preview your form.</p>
      )}
      {fields.map(field => (
        <div key={field.id} className="space-y-1.5">
          <label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === "textarea" ? (
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              placeholder={field.placeholder}
              rows={3}
              readOnly
            />
          ) : field.type === "select" ? (
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9">
              <option value="">Select an option…</option>
              {(field.options || "").split(",").map(o => <option key={o}>{o.trim()}</option>)}
            </select>
          ) : (
            <input
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
              placeholder={field.placeholder}
              readOnly
            />
          )}
        </div>
      ))}
      {fields.length > 0 && (
        <button className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold mt-2">
          Submit
        </button>
      )}
    </div>
  );
}

function FormBuilder({ form, onClose }: { form?: Form; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(form?.name || "");
  const [fields, setFields] = useState<FormField[]>(form ? parseFields(form.fields) : [
    { id: uid(), type: "name", label: "Full Name", placeholder: "Enter your name", required: true },
    { id: uid(), type: "email", label: "Email", placeholder: "you@company.com", required: true },
    { id: uid(), type: "company", label: "Company", placeholder: "Your company", required: false },
  ]);
  const dragRef = useRef<number | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: name || "Untitled Form", fields: JSON.stringify(fields), createdAt: new Date().toISOString() };
      const url = form ? `/api/forms/${form.id}` : "/api/forms";
      const method = form ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({ title: "Form saved" });
    },
  });

  const addField = (type: FormField["type"]) => {
    const defaults = FIELD_TYPE_DEFAULTS[type] || {};
    setFields(f => [...f, { id: uid(), type, label: defaults.label || "Field", placeholder: defaults.placeholder || "", required: false, options: defaults.options }]);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields(f => f.map(field => field.id === id ? { ...field, ...patch } : field));
  };

  const removeField = (id: string) => setFields(f => f.filter(field => field.id !== id));

  const onDragStart = (i: number) => { dragRef.current = i; };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragRef.current === null || dragRef.current === i) return;
    const next = [...fields];
    const [item] = next.splice(dragRef.current, 1);
    next.splice(i, 0, item);
    dragRef.current = i;
    setFields(next);
  };
  const onDragEnd = () => { dragRef.current = null; };

  const copyEmbedCode = () => {
    if (!form) return;
    const code = `<script src="${window.location.origin}/embed.js" data-form-id="${form.id}" async></script>`;
    navigator.clipboard.writeText(code);
    toast({ title: "Embed code copied" });
  };

  const FieldTypeIcon = ({ type }: { type: string }) => {
    const ft = FIELD_TYPES.find(f => f.value === type);
    if (!ft) return null;
    const Icon = ft.icon;
    return <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="h-4 w-4" /></Button>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Form name…"
          className="text-lg font-semibold h-10 border-none shadow-none px-0 focus-visible:ring-0 max-w-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          {form && (
            <Button variant="outline" size="sm" onClick={copyEmbedCode} className="gap-2">
              <Copy className="h-3.5 w-3.5" /> Embed
            </Button>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            <Save className="h-3.5 w-3.5" /> {saveMutation.isPending ? "Saving…" : "Save Form"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Fields editor */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Form Fields</div>
          {fields.map((field, i) => (
            <div
              key={field.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              className="bg-card border border-border rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <FieldTypeIcon type={field.type} />
                <Input
                  value={field.label}
                  onChange={e => updateField(field.id, { label: e.target.value })}
                  className="h-7 text-sm"
                />
                <Select value={field.type} onValueChange={v => updateField(field.id, { type: v as FormField["type"] })}>
                  <SelectTrigger className="h-7 w-32 text-xs shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => updateField(field.id, { required: !field.required })}
                  className={`text-xs px-2 py-0.5 rounded border shrink-0 ${field.required ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground"}`}
                >
                  {field.required ? "Required" : "Optional"}
                </button>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeField(field.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
              {field.type === "select" && (
                <div className="pl-6">
                  <Input
                    value={field.options || ""}
                    onChange={e => updateField(field.id, { options: e.target.value })}
                    placeholder="Option 1, Option 2, Option 3"
                    className="h-7 text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated options</p>
                </div>
              )}
              {field.type !== "select" && (
                <div className="pl-6">
                  <Input
                    value={field.placeholder || ""}
                    onChange={e => updateField(field.id, { placeholder: e.target.value })}
                    placeholder="Placeholder text…"
                    className="h-7 text-xs"
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add field buttons */}
          <div className="bg-muted/30 border border-dashed border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Add field</p>
            <div className="flex flex-wrap gap-1.5">
              {FIELD_TYPES.map(ft => {
                const Icon = ft.icon;
                return (
                  <button
                    key={ft.value}
                    onClick={() => addField(ft.value as FormField["type"])}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-background border border-border hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Icon className="h-3 w-3" /> {ft.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</div>
          </div>
          <FormPreview fields={fields} name={name} />
        </div>
      </div>
    </div>
  );
}

export default function Forms() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Form | undefined>();
  const [creating, setCreating] = useState(false);

  const { data: formsList = [], isLoading } = useQuery<Form[]>({ queryKey: ["/api/forms"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/forms/${id}`, { method: "DELETE" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/forms"] }); toast({ title: "Form deleted" }); },
  });

  if (creating) return <FormBuilder onClose={() => { setCreating(false); }} />;
  if (editing) return <FormBuilder form={editing} onClose={() => { setEditing(undefined); }} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Forms</h1>
          <p className="text-muted-foreground text-sm mt-1">Build lead-capture forms and embed them anywhere</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Form
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : formsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold mb-1">No forms yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create a form to capture leads from your website or funnels.</p>
          <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="h-4 w-4" /> Create your first form</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {formsList.map(form => {
            const fieldCount = parseFields(form.fields).length;
            return (
              <div key={form.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{form.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3">
                      <span>{fieldCount} field{fieldCount !== 1 ? "s" : ""}</span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {form.submissionCount || 0} submission{form.submissionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(form)} className="gap-2">
                    <AlignLeft className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/forms/${form.id}/submit`);
                    toast({ title: "Endpoint URL copied" });
                  }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(form.id)}>
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

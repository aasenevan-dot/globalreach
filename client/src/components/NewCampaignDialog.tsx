import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import {
  LANGUAGES, COUNTRY_FLAG, CHANNELS, LOCAL_CHANNELS, INTL_CHANNELS, flagForLang, langName,
} from "@/lib/i18n-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Phone, Smartphone, MessageCircle, Linkedin } from "lucide-react";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail, call: Phone, sms: Smartphone, whatsapp: MessageCircle, linkedin: Linkedin,
};

const COUNTRIES = Object.keys(COUNTRY_FLAG).filter((c) => c !== "United States");

export function NewCampaignDialog() {
  const { isInternational } = useMode();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [languages, setLanguages] = useState<string[]>(["en"]);
  const [countries, setCountries] = useState<string[]>([]);
  const [winStart, setWinStart] = useState(9);
  const [winEnd, setWinEnd] = useState(17);
  const [respectTz, setRespectTz] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const { toast } = useToast();

  const available = isInternational ? INTL_CHANNELS : LOCAL_CHANNELS;

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const reset = () => {
    setName(""); setChannels(["email"]); setLanguages(["en"]); setCountries([]);
    setWinStart(9); setWinEnd(17); setRespectTz(true); setAutoTranslate(true);
  };

  const create = useMutation({
    mutationFn: async () => {
      const res: any = await apiRequest("POST", "/api/campaigns", {
        name,
        status: "draft",
        channels: JSON.stringify(channels),
        languages: JSON.stringify(isInternational ? languages : ["en"]),
        targetCountries: JSON.stringify(isInternational ? countries : []),
        sendWindowStart: winStart,
        sendWindowEnd: winEnd,
        respectTimezone: isInternational ? respectTz : false,
        autoTranslate: isInternational ? autoTranslate : false,
      });
      const campaign = await res.json();
      // Seed two starter steps so the sequence isn't empty.
      const firstChannel = channels[0] ?? "email";
      await apiRequest("POST", "/api/steps", {
        campaignId: campaign.id, stepOrder: 1, channel: firstChannel, delayDays: 0,
        subject: firstChannel === "email" ? "Quick idea for {{company}}" : null,
        body: "Hi {{firstName}}, I work with teams like {{company}} and had one specific idea worth sharing. Open to a quick chat?",
        translations: "{}",
      });
      await apiRequest("POST", "/api/steps", {
        campaignId: campaign.id, stepOrder: 2, channel: channels[1] ?? firstChannel, delayDays: 3,
        subject: null,
        body: "Following up on my note — happy to send a short overview tailored to {{company}}. Worth 15 minutes next week?",
        translations: "{}",
      });
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign created", description: `"${name}" added as a draft with a starter sequence.` });
      reset();
      setOpen(false);
    },
    onError: () => toast({ title: "Couldn't create campaign", variant: "destructive" }),
  });

  const valid = name.trim() && channels.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-campaign" className="gap-1.5">
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cmp-name">Campaign name *</Label>
            <Input id="cmp-name" data-testid="input-campaign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="US Mid-Market Outbound Q3" />
          </div>

          <div className="space-y-2">
            <Label>Channels *</Label>
            <div className="flex flex-wrap gap-2">
              {available.map((ch) => {
                const Icon = CHANNEL_ICONS[ch] ?? Mail;
                const on = channels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    data-testid={`chip-channel-${ch}`}
                    onClick={() => toggle(channels, setChannels, ch)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover-elevate"}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {CHANNELS[ch]?.label ?? ch}
                  </button>
                );
              })}
            </div>
          </div>

          {isInternational && (
            <>
              <div className="space-y-2">
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(LANGUAGES).map((l) => {
                    const on = languages.includes(l);
                    return (
                      <button
                        key={l}
                        type="button"
                        data-testid={`chip-lang-${l}`}
                        onClick={() => toggle(languages, setLanguages, l)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover-elevate"}`}
                      >
                        {flagForLang(l)} {langName(l)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target markets</Label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.map((c) => {
                    const on = countries.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggle(countries, setCountries, c)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover-elevate"}`}
                      >
                        {COUNTRY_FLAG[c]} {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Send window (local hours)</Label>
            <div className="flex items-center gap-3 text-sm">
              <Input type="number" min={0} max={23} value={winStart} onChange={(e) => setWinStart(Number(e.target.value))} className="w-20" data-testid="input-win-start" />
              <span className="text-muted-foreground">to</span>
              <Input type="number" min={0} max={23} value={winEnd} onChange={(e) => setWinEnd(Number(e.target.value))} className="w-20" data-testid="input-win-end" />
              <span className="text-muted-foreground">{winStart}:00 – {winEnd}:00</span>
            </div>
          </div>

          {isInternational && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Respect each prospect's time zone</Label>
                  <p className="text-xs text-muted-foreground">Send within the window in their local time.</p>
                </div>
                <Switch checked={respectTz} onCheckedChange={setRespectTz} data-testid="switch-respect-tz" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Auto-translate</Label>
                  <p className="text-xs text-muted-foreground">Localize every step to the prospect's language.</p>
                </div>
                <Switch checked={autoTranslate} onCheckedChange={setAutoTranslate} data-testid="switch-auto-translate" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button data-testid="button-save-campaign" disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

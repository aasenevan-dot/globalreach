import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import type { Lead, Message } from "@shared/schema";
import {
  COUNTRY_FLAG, flagForLang, langName, localTimeIn, tzAbbrev, CHANNELS,
} from "@/lib/i18n-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard, SkeletonListItem } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Phone, Smartphone, MessageCircle, Linkedin, Clock, Send, Wand2, Languages,
} from "lucide-react";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail, call: Phone, sms: Smartphone, whatsapp: MessageCircle, linkedin: Linkedin,
};

export default function Inbox() {
  const { isInternational } = useMode();
  const { data: messages, isLoading } = useQuery<Message[]>({ queryKey: ["/api/messages"] });
  const { data: leads } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const [activeLead, setActiveLead] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const sendMsg = useMutation({
    mutationFn: async (payload: any) => apiRequest("POST", "/api/messages", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setDraft("");
      toast({ title: "Message scheduled", description: "Queued to send in the prospect's business hours." });
    },
  });

  if (isLoading) return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid lg:grid-cols-[280px_1fr] gap-4 min-h-[560px]">
        <Card className="overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border"><Skeleton className="h-4 w-28" /></div>
          <div className="flex-1">
            {[...Array(5)].map((_, i) => <SkeletonListItem key={i} />)}
          </div>
        </Card>
        <SkeletonCard />
      </div>
    </div>
  );

  const allLeads = leads ?? [];
  const leadMap = new Map(allLeads.map((l) => [l.id, l]));
  const allMsgs = messages ?? [];

  // group messages by lead → conversations
  const convoLeadIds = [...new Set(allMsgs.map((m) => m.leadId))];
  const conversations = convoLeadIds
    .map((id) => leadMap.get(id))
    .filter((l): l is Lead => !!l)
    .filter((l) => isInternational || l.country === "United States");

  const current = activeLead ? leadMap.get(activeLead) : conversations[0];
  const currentId = current?.id ?? null;
  const thread = allMsgs
    .filter((m) => m.leadId === currentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const t = current && isInternational ? localTimeIn(current.timezone) : null;

  const draftMutation = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error("No lead selected");
      const r = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: current.id }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      return data.draft as string;
    },
    onSuccess: (draft) => {
      setDraft(draft);
      toast({
        title: "AI draft ready",
        description: isInternational
          ? `Personalized for ${current?.fullName}. Will be localized on send.`
          : `Personalized for ${current?.fullName} at ${current?.company}.`,
      });
    },
    onError: (e: any) => {
      // Fallback to local template if API key not set
      if (!current) return;
      const first = current.fullName.split(" ")[0];
      const closer = current.status === "new" || current.status === "contacted"
        ? `Worth a quick 15-min call this week?`
        : `Want me to put together a tailored plan for ${current.company}?`;
      setDraft(`Hi ${first}, I work with ${current.industry} teams like ${current.company} — ${closer}\n\n`);
      toast({
        title: "Using local draft",
        description: e.message.includes("API key") ? "Add a Claude API key in Settings → AI to enable real AI drafts." : e.message,
        variant: "destructive",
      });
    },
  });

  function generateDraft() {
    if (!current || draftMutation.isPending) return;
    setGenerating(true);
    draftMutation.mutate(undefined, { onSettled: () => setGenerating(false) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Unified Inbox</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isInternational
            ? "Every channel and language in one thread — replies land where you can act on them."
            : "All your conversations across email, SMS and calls in one place."}
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 min-h-[560px]">
        {/* Conversation list */}
        <Card className="overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border text-sm font-medium">Conversations</div>
          <div className="flex-1 overflow-auto">
            {conversations.map((l) => {
              const last = allMsgs.filter((m) => m.leadId === l.id).slice(-1)[0];
              const unread = allMsgs.some((m) => m.leadId === l.id && m.direction === "inbound" && m.status === "replied");
              return (
                <button
                  key={l.id}
                  onClick={() => setActiveLead(l.id)}
                  data-testid={`convo-${l.id}`}
                  className={`w-full text-left px-4 py-3 border-b border-border hover-elevate ${currentId === l.id ? "bg-muted/60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{l.fullName}</span>
                    {isInternational && <span>{COUNTRY_FLAG[l.country] ?? "🌍"}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{l.company}</div>
                  {last && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {unread && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      <span className="text-xs text-muted-foreground truncate">{last.body}</span>
                    </div>
                  )}
                </button>
              );
            })}
            {conversations.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">No conversations yet.</div>
            )}
          </div>
        </Card>

        {/* Thread */}
        <Card className="flex flex-col overflow-hidden">
          {current ? (
            <>
              <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
                <div>
                  <div className="font-display font-semibold flex items-center gap-2">
                    {current.fullName}
                    {isInternational && <span className="text-sm text-muted-foreground">· {current.title}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span>{current.company}</span>
                    {isInternational && (
                      <>
                        <span className="flex items-center gap-1">{flagForLang(current.language)} {langName(current.language)}</span>
                        {t && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {t.time} {tzAbbrev(current.timezone)}
                            <span className={`h-1.5 w-1.5 rounded-full ${t.inWindow ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* messages */}
              <div className="flex-1 overflow-auto p-5 space-y-4">
                {thread.map((m) => {
                  const Icon = CHANNEL_ICONS[m.channel] ?? Mail;
                  const outbound = m.direction === "outbound";
                  return (
                    <div key={m.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${outbound ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <div className={`flex items-center gap-1.5 text-xs mb-1 ${outbound ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          <Icon className="h-3 w-3" />
                          {CHANNELS[m.channel]?.label}
                          {isInternational && <span>· {flagForLang(m.language)}</span>}
                          {m.localSendTime && <span>· {m.localSendTime}</span>}
                          <span className={`capitalize flex items-center gap-1 ${
                            m.status === "replied" ? "text-emerald-400" :
                            m.status === "opened" ? "text-teal-400" :
                            m.status === "sent" || m.status === "delivered" ? "text-blue-400" :
                            m.status === "failed" ? "text-red-400" :
                            ""
                          }`}>
                            · <span className={`h-1.5 w-1.5 rounded-full ${
                              m.status === "replied" ? "bg-emerald-400" :
                              m.status === "opened" ? "bg-teal-400" :
                              m.status === "sent" || m.status === "delivered" ? "bg-blue-400" :
                              m.status === "failed" ? "bg-red-400" :
                              "bg-muted-foreground/40"
                            }`} /> {m.status}
                          </span>
                        </div>
                        {m.subject && <div className="font-medium text-sm mb-0.5">{m.subject}</div>}
                        <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                      </div>
                    </div>
                  );
                })}
                {thread.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No messages in this thread.</div>}
              </div>

              {/* composer */}
              <div className="border-t border-border p-3 space-y-2">
                {isInternational && current.language !== "en" && (
                  <div className="flex items-center gap-1.5 text-xs text-primary px-1">
                    <Wand2 className="h-3 w-3" /> Auto-translate ON — your message will be sent in {langName(current.language)}.
                  </div>
                )}
                <div className="flex justify-between items-center px-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="button-ai-draft"
                    disabled={generating}
                    onClick={generateDraft}
                    className="gap-1.5 h-7 text-xs"
                  >
                    <Wand2 className="h-3 w-3" /> {generating ? "Drafting…" : "AI draft"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    data-testid="input-reply"
                    placeholder={isInternational ? "Type in English — we localize on send…" : "Type your reply…"}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-[44px] resize-none"
                  />
                  <Button
                    data-testid="button-send"
                    disabled={!draft.trim() || sendMsg.isPending}
                    onClick={() =>
                      sendMsg.mutate({
                        leadId: current.id,
                        channel: "email",
                        direction: "outbound",
                        language: isInternational ? current.language : "en",
                        subject: null,
                        body: draft,
                        scheduledFor: new Date().toISOString(),
                        localSendTime: isInternational ? `next window · ${tzAbbrev(current.timezone)}` : "now",
                        status: "scheduled",
                        createdAt: new Date().toISOString(),
                      })
                    }
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

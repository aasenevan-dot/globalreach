import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Copy, ChevronLeft, ChevronRight, Plus, Video, Link, Users } from "lucide-react";

interface Meeting {
  id: number;
  leadName: string;
  leadEmail?: string;
  company?: string;
  title: string;
  datetime: string;
  duration: number;
}

interface CalendarSettings {
  meetingDuration: number;
  workdayStartHour: number;
  workdayEndHour: number;
  daysAhead: number;
}

function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseMeetingTime(datetime: string): string {
  const d = new Date(datetime);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const DAY_ABBREVS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MEETING_COLORS = [
  "bg-primary/15 border-primary/30",
  "bg-blue-500/15 border-blue-500/30",
  "bg-green-500/15 border-green-500/30",
  "bg-purple-500/15 border-purple-500/30",
  "bg-orange-500/15 border-orange-500/30",
];

export default function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"schedule" | "booking">("schedule");
  const [weekOffset, setWeekOffset] = useState(0);
  const [showNewMeetingForm, setShowNewMeetingForm] = useState(false);

  // New meeting form state
  const [newMeeting, setNewMeeting] = useState({
    leadName: "",
    leadEmail: "",
    company: "",
    datetime: "",
    duration: "30",
  });

  // Calendar settings form state
  const [settingsForm, setSettingsForm] = useState<CalendarSettings>({
    meetingDuration: 30,
    workdayStartHour: 9,
    workdayEndHour: 17,
    daysAhead: 14,
  });

  const weekDates = getWeekDates(weekOffset);

  // Fetch meetings
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    queryFn: async () => {
      const res = await fetch("/api/meetings");
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json();
    },
  });

  // Fetch calendar settings
  const { data: calendarSettings } = useQuery<CalendarSettings>({
    queryKey: ["/api/calendar-settings"],
    queryFn: async () => {
      const res = await fetch("/api/calendar-settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    onSuccess: (data: CalendarSettings) => {
      setSettingsForm(data);
    },
  } as any);

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (data: typeof newMeeting) => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, duration: parseInt(data.duration) }),
      });
      if (!res.ok) throw new Error("Failed to create meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setShowNewMeetingForm(false);
      setNewMeeting({ leadName: "", leadEmail: "", company: "", datetime: "", duration: "30" });
      toast({ title: "Meeting created", description: "Your meeting has been scheduled." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create meeting.", variant: "destructive" });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: CalendarSettings) => {
      const res = await fetch("/api/calendar-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-settings"] });
      toast({ title: "Settings saved", description: "Booking settings updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  // Filter meetings for the current week
  const weekDateKeys = weekDates.map(formatDateKey);
  const meetingsForWeek = meetings.filter((m) =>
    weekDateKeys.includes(m.datetime.slice(0, 10))
  );

  const getMeetingsForDay = (date: Date) => {
    const key = formatDateKey(date);
    return meetingsForWeek
      .filter((m) => m.datetime.slice(0, 10) === key)
      .sort((a, b) => a.datetime.localeCompare(b.datetime));
  };

  const bookingUrl = window.location.origin + "/#/book";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast({ title: "Copied!", description: "Booking link copied to clipboard." });
    } catch {
      toast({ title: "Error", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeeting.leadName || !newMeeting.datetime) return;
    createMeetingMutation.mutate(newMeeting);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(settingsForm);
  };

  const isToday = weekOffset === 0;
  const weekRangeLabel = (() => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  return (
    <div className="flex flex-col h-full bg-background text-foreground min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold tracking-tight">Calendar</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "schedule"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            My Schedule
          </button>
          <button
            onClick={() => setActiveTab("booking")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "booking"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Booking Link
          </button>
        </div>
      </div>

      {/* MY SCHEDULE TAB */}
      {activeTab === "schedule" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Week nav bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWeekOffset((o) => o - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-foreground min-w-[200px] text-center">
                {weekRangeLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWeekOffset((o) => o + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {!isToday && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs ml-1"
                  onClick={() => setWeekOffset(0)}
                >
                  Today
                </Button>
              )}
            </div>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowNewMeetingForm((v) => !v)}
            >
              <Plus className="w-3.5 h-3.5" />
              New Meeting
            </Button>
          </div>

          {/* New Meeting inline form */}
          {showNewMeetingForm && (
            <div className="px-6 py-4 bg-card border-b border-border">
              <form onSubmit={handleCreateMeeting} className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1 min-w-[150px]">
                  <label className="text-xs text-muted-foreground">Lead Name *</label>
                  <Input
                    placeholder="Jane Smith"
                    value={newMeeting.leadName}
                    onChange={(e) => setNewMeeting((p) => ({ ...p, leadName: e.target.value }))}
                    className="h-8 text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-[160px]">
                  <label className="text-xs text-muted-foreground">Lead Email</label>
                  <Input
                    type="email"
                    placeholder="jane@company.com"
                    value={newMeeting.leadEmail}
                    onChange={(e) => setNewMeeting((p) => ({ ...p, leadEmail: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-[130px]">
                  <label className="text-xs text-muted-foreground">Company</label>
                  <Input
                    placeholder="Acme Corp"
                    value={newMeeting.company}
                    onChange={(e) => setNewMeeting((p) => ({ ...p, company: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-[190px]">
                  <label className="text-xs text-muted-foreground">Date & Time *</label>
                  <Input
                    type="datetime-local"
                    value={newMeeting.datetime}
                    onChange={(e) => setNewMeeting((p) => ({ ...p, datetime: e.target.value }))}
                    className="h-8 text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-[110px]">
                  <label className="text-xs text-muted-foreground">Duration</label>
                  <Select
                    value={newMeeting.duration}
                    onValueChange={(v) => setNewMeeting((p) => ({ ...p, duration: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8"
                    disabled={createMeetingMutation.isPending}
                  >
                    {createMeetingMutation.isPending ? "Saving..." : "Schedule"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => setShowNewMeetingForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Week grid */}
          <div className="flex flex-1 overflow-x-auto overflow-y-auto">
            {meetingsLoading ? (
              // Skeleton shimmer
              <div className="flex flex-1 gap-0">
                {DAY_ABBREVS.map((day) => (
                  <div key={day} className="flex-1 border-r border-border/50 min-h-48 p-2">
                    <div className="h-8 rounded-md bg-muted animate-pulse mb-3" />
                    <div className="space-y-2">
                      <div className="h-14 rounded-lg bg-muted/60 animate-pulse" />
                      <div className="h-14 rounded-lg bg-muted/40 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 min-w-0">
                {weekDates.map((date, i) => {
                  const todayKey = formatDateKey(new Date());
                  const isCurrentDay = formatDateKey(date) === todayKey;
                  const dayMeetings = getMeetingsForDay(date);
                  return (
                    <div
                      key={i}
                      className="flex-1 border-r border-border/50 min-h-48 p-2 space-y-1"
                    >
                      {/* Column header */}
                      <div
                        className={`flex flex-col items-center pb-2 mb-1 ${
                          isCurrentDay ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {DAY_ABBREVS[i]}
                        </span>
                        <span
                          className={`text-lg font-semibold leading-tight ${
                            isCurrentDay
                              ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm"
                              : "text-foreground"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                      </div>

                      {/* Meeting cards */}
                      {dayMeetings.length === 0 ? (
                        <div className="text-xs text-muted-foreground/40 text-center pt-4 select-none">
                          —
                        </div>
                      ) : (
                        dayMeetings.map((meeting, mi) => (
                          <div
                            key={meeting.id}
                            className={`border rounded-lg p-2 text-xs cursor-default ${
                              MEETING_COLORS[mi % MEETING_COLORS.length]
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-0.5">
                              <span className="font-semibold text-foreground truncate leading-tight">
                                {meeting.leadName}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1 py-0 h-4 shrink-0"
                              >
                                {meeting.duration}m
                              </Badge>
                            </div>
                            <div className="text-muted-foreground truncate">{meeting.title}</div>
                            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{parseMeetingTime(meeting.datetime)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOOKING LINK TAB */}
      {activeTab === "booking" && (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 max-w-2xl">
          {/* Shareable link section */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Link className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Your Booking Link</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link so prospects can schedule time with you directly.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground font-mono truncate select-all">
                {bookingUrl}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={handleCopyLink}
              >
                <Copy className="w-3.5 h-3.5" />
                Copy link
              </Button>
            </div>
          </div>

          {/* Booking settings section */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Booking Settings</h2>
            </div>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Meeting Duration</label>
                  <Select
                    value={String(settingsForm.meetingDuration)}
                    onValueChange={(v) =>
                      setSettingsForm((p) => ({ ...p, meetingDuration: parseInt(v) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Days Ahead</label>
                  <Select
                    value={String(settingsForm.daysAhead)}
                    onValueChange={(v) =>
                      setSettingsForm((p) => ({ ...p, daysAhead: parseInt(v) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Workday Start</label>
                  <Select
                    value={String(settingsForm.workdayStartHour)}
                    onValueChange={(v) =>
                      setSettingsForm((p) => ({ ...p, workdayStartHour: parseInt(v) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[6, 7, 8, 9, 10, 11, 12].map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {h < 12 ? `${h}:00 AM` : "12:00 PM"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Workday End</label>
                  <Select
                    value={String(settingsForm.workdayEndHour)}
                    onValueChange={(v) =>
                      setSettingsForm((p) => ({ ...p, workdayEndHour: parseInt(v) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {h === 12
                            ? "12:00 PM"
                            : h < 12
                            ? `${h}:00 AM`
                            : `${h - 12}:00 PM`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateSettingsMutation.isPending}
                  className="gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

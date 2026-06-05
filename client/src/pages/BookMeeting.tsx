import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Globe, Clock, Video, CheckCircle2, ChevronLeft, ArrowLeft } from "lucide-react";

type Step = "date" | "time" | "form" | "success";

interface FormData {
  name: string;
  email: string;
  company: string;
  notes: string;
}

interface TimeSlot {
  time: string;
  datetime: string;
}

interface PageState {
  step: Step;
  selectedDate: string;
  selectedSlot: TimeSlot | null;
  formData: FormData;
}

function getNext14Weekdays(): { iso: string; day: string; date: number; month: string }[] {
  const results = [];
  const today = new Date();
  let current = new Date(today);
  current.setHours(0, 0, 0, 0);

  while (results.length < 14) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const iso = current.toISOString().split("T")[0];
      const day = current.toLocaleDateString("en-US", { weekday: "short" });
      const date = current.getDate();
      const month = current.toLocaleDateString("en-US", { month: "short" });
      results.push({ iso, day, date, month });
    }
    current.setDate(current.getDate() + 1);
  }
  return results;
}

function formatSelectedDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function BookMeeting() {
  const [state, setState] = useState<PageState>({
    step: "date",
    selectedDate: "",
    selectedSlot: null,
    formData: { name: "", email: "", company: "", notes: "" },
  });

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const weekdays = getNext14Weekdays();

  const slotsQuery = useQuery<TimeSlot[]>({
    queryKey: ["booking-slots", state.selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/booking/slots?date=${state.selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch slots");
      return res.json();
    },
    enabled: !!state.selectedDate && state.step === "time",
  });

  const confirmMutation = useMutation({
    mutationFn: async (payload: {
      datetime: string;
      name: string;
      email: string;
      company: string;
      notes: string;
    }) => {
      const res = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to confirm booking");
      return res.json();
    },
    onSuccess: () => {
      setState((prev) => ({ ...prev, step: "success" }));
    },
  });

  function handleDateSelect(iso: string) {
    setState((prev) => ({ ...prev, selectedDate: iso, step: "time" }));
  }

  function handleSlotSelect(slot: TimeSlot) {
    setState((prev) => ({ ...prev, selectedSlot: slot, step: "form" }));
  }

  function handleFormChange(field: keyof FormData, value: string) {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
    }));
  }

  function handleConfirm() {
    if (!state.selectedSlot) return;
    confirmMutation.mutate({
      datetime: state.selectedSlot.datetime,
      name: state.formData.name,
      email: state.formData.email,
      company: state.formData.company,
      notes: state.formData.notes,
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 lg:grid lg:grid-cols-2">
      {/* LEFT COLUMN */}
      <div className="bg-gray-900 min-h-screen lg:min-h-screen p-12 lg:sticky lg:top-0 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Globe className="h-7 w-7 text-teal-400" />
            <span className="text-2xl font-black text-white">GlobalReach</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-white mt-8 mb-6">Schedule a Meeting</h1>

          {/* Info rows */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-teal-400 flex-shrink-0" />
              <span className="text-gray-300 text-sm">30 minutes</span>
            </div>
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5 text-teal-400 flex-shrink-0" />
              <span className="text-gray-300 text-sm">Video call · Link sent on confirmation</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-teal-400 flex-shrink-0" />
              <span className="text-gray-300 text-sm">{timezone}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm mt-8 leading-relaxed">
            Pick a time that works and we'll send a confirmation right away.
          </p>
        </div>

        {/* Subtle branding at bottom */}
        <div className="mt-12">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} GlobalReach. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="bg-white dark:bg-gray-950 p-8 lg:p-12 flex flex-col justify-center">

        {/* STEP: date */}
        {state.step === "date" && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Select a Date</h2>
            <div className="grid grid-cols-4 gap-2">
              {weekdays.map(({ iso, day, date, month }) => (
                <button
                  key={iso}
                  onClick={() => handleDateSelect(iso)}
                  className={
                    state.selectedDate === iso
                      ? "flex flex-col items-center justify-center p-3 rounded-xl bg-teal-600 text-white cursor-pointer transition-all"
                      : "flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-400 text-gray-700 dark:text-gray-300 cursor-pointer transition-all"
                  }
                >
                  <span className="text-xs font-medium uppercase tracking-wide">{day}</span>
                  <span className="text-2xl font-bold mt-1">{date}</span>
                  <span className="text-xs mt-0.5 opacity-70">{month}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: time */}
        {state.step === "time" && (
          <div>
            <button
              onClick={() => setState((prev) => ({ ...prev, step: "date" }))}
              className="flex items-center gap-1 text-teal-600 hover:text-violet-700 text-sm font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Available times</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {state.selectedDate ? formatSelectedDate(state.selectedDate) : ""}
            </p>

            {slotsQuery.isLoading && (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-11 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"
                  />
                ))}
              </div>
            )}

            {slotsQuery.isSuccess && slotsQuery.data && slotsQuery.data.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {slotsQuery.data.map((slot) => (
                  <button
                    key={slot.datetime}
                    onClick={() => handleSlotSelect(slot)}
                    className="px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm font-medium hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer"
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}

            {slotsQuery.isSuccess && (!slotsQuery.data || slotsQuery.data.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No slots available for this date. Please choose another day.
                </p>
                <button
                  onClick={() => setState((prev) => ({ ...prev, step: "date" }))}
                  className="text-teal-600 hover:text-violet-700 text-sm font-medium underline transition-colors"
                >
                  Choose another day
                </button>
              </div>
            )}

            {slotsQuery.isError && (
              <p className="text-red-500 text-sm">Failed to load available times. Please try again.</p>
            )}
          </div>
        )}

        {/* STEP: form */}
        {state.step === "form" && (
          <div>
            <button
              onClick={() => setState((prev) => ({ ...prev, step: "time" }))}
              className="flex items-center gap-1 text-teal-600 hover:text-violet-700 text-sm font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {/* Selected slot badge */}
            {state.selectedSlot && (
              <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-teal-900/40 text-violet-700 dark:text-teal-300 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
                <Clock className="h-3.5 w-3.5" />
                {state.selectedDate ? formatSelectedDate(state.selectedDate) : ""} at {state.selectedSlot.time}
              </div>
            )}

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={state.formData.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={state.formData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={state.formData.company}
                  onChange={(e) => handleFormChange("company", e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes / What would you like to discuss?{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={state.formData.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  placeholder="Tell us a bit about what you'd like to cover..."
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            {confirmMutation.isError && (
              <p className="text-red-500 text-sm mt-3">Something went wrong. Please try again.</p>
            )}

            <button
              onClick={handleConfirm}
              disabled={
                !state.formData.name ||
                !state.formData.email ||
                confirmMutation.isPending
              }
              className="mt-6 w-full py-4 font-bold rounded-xl text-white bg-gradient-to-r from-red-500 to-teal-500 hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer text-base"
            >
              {confirmMutation.isPending ? "Confirming..." : "Confirm Meeting"}
            </button>
          </div>
        )}

        {/* STEP: success */}
        {state.step === "success" && (
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Meeting Confirmed!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              We'll send a confirmation to{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{state.formData.email}</span>
            </p>

            {/* Details card */}
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-left mb-8 space-y-3">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-teal-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {state.selectedDate ? formatSelectedDate(state.selectedDate) : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-teal-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Time</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {state.selectedSlot?.time ?? ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-teal-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Duration</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">30 min</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Video className="h-4 w-4 text-teal-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Location</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Video call</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => { window.location.hash = "#/"; }}
              className="inline-flex items-center gap-2 text-teal-600 hover:text-violet-700 font-medium text-sm transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Homepage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Lead, Campaign, Job } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAudience } from "@/lib/audience";
import {
  Users, Zap, MessageSquare, Home, CheckCircle2,
} from "lucide-react";

interface QuickStartStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: {
    label: string;
    href?: string;
  };
}

export function QuickStartModal() {
  const { isConsumer } = useAudience();
  const [open, setOpen] = useState(false);
  const { data: leads } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: campaigns } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });
  const { data: jobs } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });

  // Show onboarding if no data exists and modal hasn't been dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem("quickstart-dismissed");
    const isEmpty = !dismissed && (
      (isConsumer && (!jobs || jobs.length === 0)) ||
      (!isConsumer && (!leads || leads.length === 0))
    );
    setOpen(isEmpty);
  }, [leads, campaigns, jobs, isConsumer]);

  const handleDismiss = () => {
    localStorage.setItem("quickstart-dismissed", "true");
    setOpen(false);
  };

  const steps: QuickStartStep[] = isConsumer
    ? [
        {
          id: "add-job",
          icon: <Home className="h-6 w-6" />,
          title: "Add Your First Job",
          description: "Create a new residential job and track it through your pipeline",
          action: { label: "Add Job", href: "/jobs" },
        },
        {
          id: "track-progress",
          icon: <CheckCircle2 className="h-6 w-6" />,
          title: "Track Progress",
          description: "Move jobs through stages from inspection to completion",
          action: { label: "View Pipeline", href: "/pipeline" },
        },
      ]
    : [
        {
          id: "add-leads",
          icon: <Users className="h-6 w-6" />,
          title: "Add Leads",
          description: "Import contacts or search our database of verified B2B leads",
          action: { label: "Find Leads", href: "/find" },
        },
        {
          id: "create-campaign",
          icon: <Zap className="h-6 w-6" />,
          title: "Launch a Campaign",
          description: "Build multi-channel outreach sequences with auto-localization",
          action: { label: "New Campaign", href: "/campaigns" },
        },
        {
          id: "track-conversations",
          icon: <MessageSquare className="h-6 w-6" />,
          title: "Track Conversations",
          description: "Unified inbox for all inbound messages across channels",
          action: { label: "View Inbox", href: "/inbox" },
        },
      ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welcome to GlobalReach CRM</DialogTitle>
          <DialogDescription>
            Get started in 3 steps
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <Card key={step.id} className="p-4 flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="text-sm font-semibold">{idx + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-primary">{step.icon}</span>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                asChild
              >
                <a href={step.action.href} onClick={handleDismiss}>
                  {step.action.label}
                </a>
              </Button>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            You can access this guide later from settings
          </p>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Got it, let's go
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

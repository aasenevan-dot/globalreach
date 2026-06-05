import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
  children,
}: EmptyStateCardProps) {
  return (
    <Card className="border-dashed border-2 p-12 text-center">
      <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
        <div className="inline-flex p-3 bg-muted rounded-lg">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        </div>
        {children}
        <div className="flex items-center gap-2 mt-4">
          {actionLabel && onAction && (
            <Button onClick={onAction} size="sm">
              {actionLabel}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="sm"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

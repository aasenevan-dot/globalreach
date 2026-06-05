import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonLoaderProps {
  count?: number;
  variant?: "card" | "table-row" | "list-item";
}

export function SkeletonLoader({
  count = 3,
  variant = "card",
}: SkeletonLoaderProps) {
  if (variant === "card") {
    return (
      <div className="space-y-3">
        {[...Array(count)].map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "table-row") {
    return (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3"><Skeleton className="h-4 w-4" /></th>
                <th className="px-4 py-3"><Skeleton className="h-4 w-24" /></th>
                <th className="px-4 py-3"><Skeleton className="h-4 w-32" /></th>
                <th className="px-4 py-3"><Skeleton className="h-4 w-20" /></th>
              </tr>
            </thead>
            <tbody>
              {[...Array(count)].map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

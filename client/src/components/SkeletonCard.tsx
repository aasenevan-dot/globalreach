import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b border-border/50">
      <td className="pl-4 py-3">
        <Skeleton className="h-4 w-4 rounded" />
      </td>
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <td key={i} className="py-3 pr-4">
          <Skeleton className="h-3 w-24" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border/50">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

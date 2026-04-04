import { Card, CardContent, CardHeader } from "@repo/ui/card";
import { Skeleton } from "@repo/ui/skeleton";

export default function EmployeesListLoading() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
            <Skeleton className="h-8 w-36 sm:shrink-0" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Skeleton className="h-9 w-full max-w-xs" />
            <Skeleton className="h-6 w-44" />
          </div>
          <Skeleton className="h-3 w-56" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-3 w-48" />
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

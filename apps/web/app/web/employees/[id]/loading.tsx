import { Card, CardContent, CardHeader } from "@repo/ui/card";
import { Skeleton } from "@repo/ui/skeleton";

export default function EmployeeDetailLoading() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <Skeleton className="h-8 w-40" />
      {[0, 1, 2].map((k) => (
        <Card key={k} className="border-border/80 bg-muted/15 shadow-none">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-24 w-full max-w-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

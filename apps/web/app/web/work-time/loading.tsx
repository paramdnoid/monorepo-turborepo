import { Loader2 } from "lucide-react";

export default function WorkTimeLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      <Loader2 className="size-8 animate-spin" aria-hidden />
    </div>
  );
}

import { secondaryTrades } from "@/content/trades";
import { uiText } from "@/content/ui-text";

export function SecondaryTrades() {
  return (
    <div className="mt-14 border-t border-border/30 pt-8 sm:mt-20 sm:pt-10">
      <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
        {uiText.landingSections.trades.secondaryHeading}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {secondaryTrades.map((trade) => (
          <div
            key={trade.name}
            className="flex items-center gap-2 rounded-full border border-border/40 bg-muted/20 px-4 py-2 text-sm text-muted-foreground"
          >
            <trade.icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            {trade.name}
            {trade.comingSoon && (
              <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {uiText.landingSections.trades.comingSoon}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

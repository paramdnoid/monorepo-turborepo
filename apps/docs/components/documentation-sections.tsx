import { getFaqs } from "@web/content/faqs";
import { getFeatures } from "@web/content/features";
import { getSteps } from "@web/content/steps";
import { getSecondaryTrades, getTrades } from "@web/content/trades";
import { getUiText } from "@web/content/ui-text";
import type { Locale } from "@web/lib/i18n/locale";
import { getMarketingSiteUrl } from "@/lib/site-url";
import { cn } from "@repo/ui/utils";

type DocumentationSectionsProps = {
  locale?: Locale;
};

function slugifyFaqId(index: number) {
  return `faq-${index + 1}`;
}

export function DocumentationSections({ locale = "de" }: DocumentationSectionsProps) {
  const ui = getUiText(locale);
  const hero = ui.landingSections.hero;
  const featuresIntro = ui.landingSections.features;
  const how = ui.landingSections.howItWorks;
  const tradesIntro = ui.landingSections.trades;
  const cta = ui.landingSections.cta;
  const pricing = ui.landing.pricing;
  const footer = ui.landing.footer;

  const features = getFeatures(locale);
  const steps = getSteps(locale);
  const trades = getTrades(locale);
  const secondaryTrades = getSecondaryTrades(locale);
  const faqs = getFaqs(locale);

  const siteUrl = getMarketingSiteUrl();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    name: "ZunftGewerk Dokumentation",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const sectionClass = "scroll-mt-32 space-y-6 md:scroll-mt-36";
  const h2Class =
    "text-[1.65rem] font-semibold tracking-tight text-foreground md:text-[1.85rem] md:leading-snug";
  const leadClass = "docs-lead max-w-[var(--docs-prose-max)]";

  return (
    <>
      <article className="docs-article w-full max-w-3xl flex-1 py-12 pb-28 text-left md:py-16">
        <header id="einfuehrung" className={cn(sectionClass, "pb-14")}>
          <p className="docs-kicker mb-5">{hero.badge}</p>
          <h1 className="text-balance text-left text-[1.85rem] font-semibold leading-[1.12] tracking-tight text-foreground md:text-[2.35rem]">
            <span className="block">{hero.headingPrefix}</span>
            <span className="mt-1.5 block text-primary">{hero.headingHighlight}</span>
          </h1>
          <p className={cn(leadClass, "mt-5")}>{hero.description}</p>
          <p className="mt-6 max-w-[var(--docs-prose-max)] text-[0.9375rem] leading-relaxed text-muted-foreground">
            <strong className="font-medium text-foreground">ZunftGewerk</strong> — {footer.brandDescription}
          </p>
          <div className="docs-divider mt-14" aria-hidden />
        </header>

        <section id="produkt" className={cn(sectionClass, "pt-16")}>
          <h2 className={h2Class}>Produktüberblick</h2>
          <p className={leadClass}>
            {featuresIntro.description} Im Erlebnis der Website werden Nutzen und Vertrauen unter anderem über
            Kennzahlen wie &quot;{hero.metricTempoDescription}&quot; und &quot;
            {hero.metricControlDescription}&quot; vermittelt — ergänzt durch die Vertrauensbausteine im
            Call-to-Action-Bereich (z.&nbsp;B. {cta.trustItems[0]}, {cta.trustItems[1]}).
          </p>
          <div className="mt-10 grid gap-0 sm:grid-cols-2 sm:gap-px sm:rounded-lg sm:border sm:border-border sm:bg-border">
            <DocStat
              label={hero.metricTempoLabel}
              value={hero.metricTempoValue}
              description={hero.metricTempoDescription}
            />
            <DocStat
              label={hero.metricControlLabel}
              value={hero.metricControlValue}
              description={hero.metricControlDescription}
            />
          </div>
        </section>

        <section id="funktionen" className={cn(sectionClass, "pt-16")}>
          <p className="docs-kicker mb-2">{featuresIntro.badge}</p>
          <h2 className={h2Class}>
            {featuresIntro.headingPrefix}{" "}
            <span className="text-primary">{featuresIntro.headingHighlight}</span>
          </h2>
          <p className={leadClass}>{featuresIntro.description}</p>
          <div className="mt-12 divide-y divide-border/80">
            {features.map((f) => (
              <div key={f.title} className="py-10 first:pt-8">
                <div className="flex gap-4">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center text-primary">
                    <f.icon className="size-[1.125rem] stroke-[1.75]" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-3">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{f.title}</h3>
                    <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{f.description}</p>
                    <ul className="list-disc space-y-1.5 pl-5 text-[0.875rem] leading-relaxed text-muted-foreground">
                      {f.benefits.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="gewerke" className={cn(sectionClass, "pt-16")}>
          <p className="docs-kicker mb-2">{tradesIntro.specificLabel}</p>
          <h2 className={h2Class}>
            {tradesIntro.headingPrefix}{" "}
            <span className="text-primary">{tradesIntro.headingHighlight}</span>
          </h2>
          <p className={leadClass}>{tradesIntro.description}</p>
          <div className="mt-12 space-y-16">
            {trades.map((trade, tradeIndex) => (
              <div key={trade.slug} className="space-y-5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="flex size-8 items-center justify-center text-primary">
                    <trade.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">{trade.name}</h3>
                </div>
                <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{trade.description}</p>
                {trade.highlight ? (
                  <p className="text-sm font-medium text-primary">{trade.highlight}</p>
                ) : null}
                <dl className="flex flex-wrap gap-x-6 gap-y-3">
                  {trade.stats.map((s) => (
                    <div key={s.label}>
                      <dt className="sr-only">{s.label}</dt>
                      <dd className="flex flex-col gap-0.5">
                        <span className="text-lg font-semibold tabular-nums text-foreground">{s.value}</span>
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Branchenfunktionen
                  </h4>
                  <ul className="space-y-2.5 text-[0.875rem] leading-relaxed text-muted-foreground">
                    {trade.tradeFeatures.map((tf) => (
                      <li key={tf.label}>
                        <span className="font-medium text-foreground">{tf.label}.</span> {tf.description}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {tradesIntro.coreFeaturesLabel}
                  </h4>
                  <ul className="space-y-2.5 text-[0.875rem] leading-relaxed text-muted-foreground">
                    {trade.coreFeatures.map((cf) => (
                      <li key={cf.label}>
                        <span className="font-medium text-foreground">{cf.label}.</span> {cf.description}
                      </li>
                    ))}
                  </ul>
                </div>
                {tradeIndex < trades.length - 1 ? <div className="docs-divider pt-4" aria-hidden /> : null}
              </div>
            ))}
          </div>
          <div className="mt-14 border border-dashed border-border/90 bg-muted/15 px-5 py-6 md:px-6">
            <h3 className="text-base font-semibold text-foreground">{tradesIntro.secondaryHeading}</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {secondaryTrades.map((t) => (
                <li
                  key={t.name}
                  className="inline-flex items-center gap-2 border border-border/80 bg-background px-3 py-1.5 text-sm text-muted-foreground"
                >
                  <t.icon className="size-3.5 text-primary" aria-hidden />
                  <span>{t.name}</span>
                  {t.comingSoon ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {tradesIntro.comingSoon}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="einstieg" className={cn(sectionClass, "pt-16")}>
          <p className="docs-kicker mb-2">{how.kicker}</p>
          <h2 className={h2Class}>
            {how.headingPrefix}{" "}
            <span className="text-primary">{how.headingHighlight}</span>
          </h2>
          <p className={leadClass}>{how.description}</p>
          <ol className="mt-10 max-w-[var(--docs-prose-max)] space-y-8">
            {steps.map((s) => (
              <li key={s.step} className="flex gap-4">
                <span className="mt-0.5 w-9 shrink-0 text-right font-mono text-[12px] font-bold tabular-nums text-primary">
                  {s.step}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="preise" className={cn(sectionClass, "pt-16")}>
          <h2 className={h2Class}>
            {pricing.headingPrefix} <span className="text-primary">{pricing.headingHighlight}</span>
          </h2>
          <p className={leadClass}>{pricing.description}</p>
          <p className="text-sm text-muted-foreground">{pricing.priceHint}</p>
          <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-14">
            {pricing.plans.map((plan) => (
              <div key={plan.tier} className="flex flex-col">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-primary/80" aria-hidden>
                        –
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`${siteUrl}${plan.ctaLink}`}
                  className="mt-8 inline-flex w-fit items-center text-sm font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:decoration-primary"
                >
                  {plan.ctaText} →
                </a>
              </div>
            ))}
          </div>
        </section>

        <section id="sicherheit" className={cn(sectionClass, "pt-16")}>
          <h2 className={h2Class}>Sicherheit, Hosting &amp; Vertrauen</h2>
          <p className={leadClass}>{cta.description}</p>
          <ul className="mt-8 max-w-[var(--docs-prose-max)] list-disc space-y-2 pl-5 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {cta.trustItems.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mt-8 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Zusätzlich gelten die auf der Website beschriebenen Hinweise zu DSGVO, Verschlüsselung und
            Hosting in Deutschland — siehe auch die FAQ unten und die{" "}
            <a
              href={`${siteUrl}/legal/privacy`}
              className="font-medium text-primary underline decoration-primary/35 underline-offset-4 hover:decoration-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Datenschutzerklärung
            </a>
            .
          </p>
        </section>

        <section id="faq" className={cn(sectionClass, "pt-16")}>
          <h2 className={h2Class}>Häufige Fragen</h2>
          <p className={leadClass}>
            Antworten auf die wichtigsten Fragen zu ZunftGewerk — inhaltlich abgestimmt mit der FAQ auf der
            Landing Page.
          </p>
          <div className="mt-10 space-y-12">
            {faqs.map((faq, index) => (
              <div key={faq.question} id={slugifyFaqId(index)} className="scroll-mt-32 md:scroll-mt-36">
                <h3 className="text-[1.05rem] font-semibold tracking-tight text-foreground">{faq.question}</h3>
                <p className="mt-3 text-[0.9375rem] leading-[1.7] text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}

function DocStat({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="border-b border-border py-8 sm:border-b-0 sm:bg-muted/10 sm:px-6 sm:py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-primary">{value}</p>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

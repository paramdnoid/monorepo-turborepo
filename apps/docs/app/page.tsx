"use client";

import Image from "next/image";
import {
  alertMessage,
  deployHrefDocs,
  description,
  docsHref,
  step1CodePathDocs,
  step2Text,
  templatesHref,
  title,
  turborepoSiteHref,
} from "@repo/turborepo-starter";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Code } from "@repo/ui/code";
import { Separator } from "@repo/ui/separator";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16">
        <div className="relative h-[38px] w-[180px] shrink-0">
          <Image
            className="object-contain dark:hidden"
            src="/turborepo-dark.svg"
            alt="Turborepo"
            fill
            sizes="180px"
            priority
          />
          <Image
            className="hidden object-contain dark:block"
            src="/turborepo-light.svg"
            alt=""
            fill
            sizes="180px"
            priority
            aria-hidden
          />
        </div>

        <Card className="w-full max-w-lg border-border/80 shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="font-mono text-sm">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-sm leading-6">
            <ol className="list-inside list-decimal space-y-2 text-left text-muted-foreground">
              <li>
                Bearbeite{" "}
                <Code className="text-foreground">{step1CodePathDocs}</Code>
              </li>
              <li>{step2Text}</li>
            </ol>
            <Separator />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button asChild size="lg" className="rounded-full">
                <a
                  href={deployHrefDocs}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="relative mr-2 inline-block size-5 shrink-0">
                    <Image
                      src="/vercel.svg"
                      alt=""
                      fill
                      className="object-contain dark:invert"
                      sizes="20px"
                    />
                  </span>
                  Deploy now
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full"
                asChild
              >
                <a href={docsHref} target="_blank" rel="noopener noreferrer">
                  Read our docs
                </a>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full"
                type="button"
                onClick={() => {
                  window.alert(alertMessage);
                }}
              >
                Open alert
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <a
              className="inline-flex items-center gap-2 underline-offset-4 hover:text-foreground hover:underline"
              href={templatesHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/window.svg"
                alt=""
                width={16}
                height={16}
              />
              Examples
            </a>
            <a
              className="inline-flex items-center gap-2 underline-offset-4 hover:text-foreground hover:underline"
              href={turborepoSiteHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/globe.svg"
                alt=""
                width={16}
                height={16}
              />
              Go to turborepo.dev →
            </a>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

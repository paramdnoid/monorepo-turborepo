"use client";

import Image from "next/image";
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

const deployHref =
  "https://vercel.com/new/clone?demo-description=Learn+to+implement+a+monorepo+with+a+two+Next.js+sites+that+has+installed+three+local+packages.&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2F4K8ZISWAzJ8X1504ca0zmC%2F0b21a1c6246add355e55816278ef54bc%2FBasic.png&demo-title=Monorepo+with+Turborepo&demo-url=https%3A%2F%2Fexamples-basic-web.vercel.sh%2F&from=templates&project-name=Monorepo+with+Turborepo&repository-name=monorepo-turborepo&repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fturborepo%2Ftree%2Fmain%2Fexamples%2Fbasic&root-directory=apps%2Fdocs&skippable-integrations=1&teamSlug=vercel&utm_source=create-turbo";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16">
        <div className="relative h-[38px] w-[180px] shrink-0">
          <Image
            className="dark:hidden"
            src="/turborepo-dark.svg"
            alt="Turborepo"
            width={180}
            height={38}
            priority
          />
          <Image
            className="hidden dark:block"
            src="/turborepo-light.svg"
            alt=""
            width={180}
            height={38}
            priority
            aria-hidden
          />
        </div>

        <Card className="w-full max-w-lg border-border/80 shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Turborepo Starter
            </CardTitle>
            <CardDescription className="font-mono text-sm">
              Monorepo mit Next.js, Tailwind und shadcn/ui
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-sm leading-6">
            <ol className="list-inside list-decimal space-y-2 text-left text-muted-foreground">
              <li>
                Bearbeite{" "}
                <Code className="text-foreground">apps/docs/app/page.tsx</Code>
              </li>
              <li>Speichern — Änderungen erscheinen sofort.</li>
            </ol>
            <Separator />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button asChild size="lg" className="rounded-full">
                <a href={deployHref} target="_blank" rel="noopener noreferrer">
                  <Image
                    src="/vercel.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-2 dark:invert"
                  />
                  Deploy now
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full"
                asChild
              >
                <a
                  href="https://turborepo.dev/docs?utm_source"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read our docs
                </a>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full"
                type="button"
                onClick={() => {
                  window.alert("Hello from @repo/ui");
                }}
              >
                Open alert
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <a
              className="inline-flex items-center gap-2 underline-offset-4 hover:text-foreground hover:underline"
              href="https://vercel.com/templates?search=turborepo&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
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
              href="https://turborepo.dev?utm_source=create-turbo"
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

"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { uiText } from "@/content/ui-text"
import { cn } from "@repo/ui/utils"

type TocEntry = { id: string; text: string }

export function LegalTableOfContents() {
  const [headings, setHeadings] = useState<TocEntry[]>([])
  const [activeId, setActiveId] = useState("")
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const timer = setTimeout(() => {
      const article = document.querySelector("[data-legal-article]")
      if (!article) return

      const h2s = article.querySelectorAll("h2")
      const entries: TocEntry[] = []

      h2s.forEach((h2, i) => {
        if (!h2.id) h2.id = `section-${i}`
        entries.push({ id: h2.id, text: h2.textContent ?? "" })
      })

      setHeadings(entries)
      if (entries.length > 0) {
        const first = entries[0];
        if (first) setActiveId(first.id);
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [pathname])

  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (headings.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    )

    for (const { id } of headings) {
      const el = document.getElementById(id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav aria-label={uiText.legal.tocAriaLabel} className="hidden xl:block">
      <div className="sticky top-28">
        <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {uiText.legal.tocHeading}
        </p>
        <ul className="space-y-0.5 border-l border-border">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={(event) => {
                  event.preventDefault()
                  const el = document.getElementById(heading.id)
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 96
                    window.scrollTo({ top: y, behavior: "smooth" })
                    const nextSearch = searchParams.toString()
                    const hashUrl = nextSearch ? `${pathname}?${nextSearch}#${heading.id}` : `${pathname}#${heading.id}`
                    window.history.replaceState(null, "", hashUrl)
                  }
                }}
                className={cn(
                  "-ml-px block border-l-2 py-1.5 pl-4 text-[13px] leading-snug transition-colors",
                  activeId === heading.id
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

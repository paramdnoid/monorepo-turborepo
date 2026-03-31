/** Rendert FAQ-Antworten mit Absaetzen (getrennt durch \\n\\n in den Content-Strings). */
export function FaqAnswer({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
      {paragraphs.map((p, i) => (
        <p key={i} className="leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  );
}

export function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="hero-text-gloss-accent animate-gradient-x bg-linear-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent">
      {children}
    </span>
  );
}

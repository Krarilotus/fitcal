import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AuthShellProps {
  backHomeLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthShell({
  backHomeLabel,
  eyebrow,
  title,
  description,
  controls,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="fc-shell min-h-screen px-4 py-6 text-[var(--fc-ink)] sm:px-6 sm:py-10">
      <div className="fc-noise pointer-events-none absolute inset-0 -z-20" />
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--fc-muted)] fc-rise">
          <Link href="/" className="inline-flex items-center gap-2 font-medium transition-colors hover:text-[var(--fc-ink)]">
            {backHomeLabel}
          </Link>
          {controls}
        </div>

        <div className="fc-rise fc-rise-delay-1">
          <Badge variant="accent">{eyebrow}</Badge>
          <h1 className="fc-display mt-4 text-[clamp(1.8rem,4vw,2.8rem)]">{title}</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--fc-muted)] sm:text-base">{description}</p>
        </div>

        <div className="mt-8 fc-rise fc-rise-delay-2">
          <div className="space-y-5">{children}</div>
          <Separator className="mt-8 bg-[var(--fc-border)]" />
          <div className="pt-4 text-sm text-[var(--fc-muted)] [&_a]:font-medium [&_a]:text-[var(--fc-accent-2)] [&_a]:transition-colors hover:[&_a]:text-[var(--fc-accent)]">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

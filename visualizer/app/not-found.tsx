import { Link } from "@tanstack/react-router";

import { NonobenchMark } from "@/components/nonobench-mark";

export function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />
      <div className="pointer-events-none fixed inset-0 grid-pattern" />
      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
        <NonobenchMark size="sm" />
        <h1 className="font-display text-2xl font-medium lowercase">
          <span className="font-mono text-ember">404</span> · this page could not be found.
        </h1>
        <Link
          to="/"
          className="text-sm text-ember underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ember-bright"
        >
          Back to results
        </Link>
      </main>
    </div>
  );
}

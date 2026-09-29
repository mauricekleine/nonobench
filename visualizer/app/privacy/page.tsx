import type { Metadata } from "next";
import Link from "next/link";
import { NonobenchMark } from "@/components/nonobench-mark";

export const metadata: Metadata = { title: "Privacy | Nonobench", description: "What Nonobench collects when you visit the site or use the API and MCP server." };

const linkClass = "text-ember underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ember-bright";

export default function Privacy() {
  return <div className="min-h-screen bg-background text-foreground"><div className="noise-overlay" /><div className="pointer-events-none fixed inset-0 grid-pattern" /><main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
    <header className="mb-10 border-b border-border pb-7"><div className="flex items-center gap-3"><NonobenchMark size="sm" /><Link href="/" className="font-display text-lg font-semibold lowercase focus-visible:outline-2 focus-visible:outline-ember-bright">nonobench</Link></div><h1 className="mt-7 font-display text-2xl font-medium lowercase sm:text-3xl">privacy</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Nonobench has no accounts, no cookies and no ads. Last updated 29 September 2026.</p></header>
    <div className="space-y-9 text-sm leading-relaxed">
      <section><h2 className="font-display text-base font-medium lowercase">the website</h2><p className="mt-2 text-muted-foreground">Visits are counted with <a href="https://www.simpleanalytics.com" className={linkClass}>Simple Analytics</a>, which sets no cookies and collects no personal data. It records page views, referrers, countries and device types in aggregate, so no individual visitor can be identified.</p></section>
      <section><h2 className="font-display text-base font-medium lowercase">the API and MCP server</h2><p className="mt-2 text-muted-foreground">The <Link href="/how-it-works" className={linkClass}>API and MCP server</Link> need no key or account. They serve public benchmark data and don’t store your requests. Grids you send to <code className="font-mono text-xs">check_solution</code> are checked and then discarded.</p></section>
      <section><h2 className="font-display text-base font-medium lowercase">hosting</h2><p className="mt-2 text-muted-foreground">The site runs behind Cloudflare. Like any web server, Cloudflare and the hosting server may keep standard request logs, including IP addresses, for a short time to keep the site secure and running. Nonobench doesn’t use them for anything else and never sells or shares data.</p></section>
      <section><h2 className="font-display text-base font-medium lowercase">contact</h2><p className="mt-2 text-muted-foreground">Questions about privacy or anything else: <a href="mailto:hello@nonobench.com" className={linkClass}>hello@nonobench.com</a>. Nonobench is made by Maurice Kleine.</p></section>
    </div><footer className="mt-12 border-t border-border pt-5 text-xs text-muted-foreground"><Link href="/" className={linkClass}>Back to results</Link></footer>
  </main></div>;
}

import Link from "next/link";
import {
  Zap,
  GitFork,
  Bot,
  Database,
  ShieldCheck,
  Users,
  FileBarChart,
  Network,
  CheckCircle2,
} from "lucide-react";

const APP_URL = "https://app.pipeledger.ai";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <span className="text-xs font-bold text-primary-foreground">PL</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              PipeLedger<span className="ml-0.5 font-normal text-accent">AI</span>
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href="#how-it-works"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              How it works
            </a>
            <a
              href="#features"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Pricing
            </a>
            <Link
              href={`${APP_URL}/login`}
              className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-24 lg:px-6 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <CheckCircle2 className="h-3 w-3" />
              GL Intelligence Platform · Private Beta
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight lg:text-6xl">
              Your ERP data,{" "}
              <span className="text-accent">ready for AI</span>
            </h1>
            <p className="mb-10 text-lg text-primary-foreground/70 lg:text-xl">
              PipeLedger extracts general ledger data from your ERP, transforms
              it through auditable dbt pipelines, and delivers it to your AI
              assistant via MCP — so your CFO can finally ask questions and
              trust the answers.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`${APP_URL}/login`}
                className="w-full rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 sm:w-auto"
              >
                Get early access
              </Link>
              <a
                href="#how-it-works"
                className="w-full rounded-md border border-primary-foreground/20 px-6 py-3 text-sm font-medium text-primary-foreground/80 transition-colors hover:border-primary-foreground/40 hover:text-primary-foreground sm:w-auto"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight lg:text-4xl">
              How it works
            </h2>
            <p className="text-base text-muted-foreground">
              Three steps from raw GL data to AI-ready intelligence.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="absolute right-0 top-7 hidden h-px w-1/2 translate-x-1/2 bg-border md:block" />
                )}
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {i + 1}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-muted py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight lg:text-4xl">
              Built for finance teams
            </h2>
            <p className="text-base text-muted-foreground">
              Everything you need to trust the numbers your AI is working with.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight lg:text-4xl">
              Simple, usage-based pricing
            </h2>
            <p className="text-base text-muted-foreground">
              Pay for what you use. No seat licenses. No surprises.
              <br />
              <span className="font-medium text-accent">
                Pricing launches with general availability.
              </span>
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-xl border p-6 ${
                  tier.highlighted
                    ? "border-accent bg-accent/5 shadow-md"
                    : "border-border bg-card"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-white">
                    Most popular
                  </div>
                )}
                <div className="mb-1 text-sm font-semibold">{tier.name}</div>
                <div className="mb-4 text-2xl font-bold text-muted-foreground">
                  {tier.price}
                </div>
                <ul className="space-y-2">
                  {tier.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent/50" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href={`${APP_URL}/login`}
              className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Join the private beta
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              No credit card required. We will reach out before charging anything.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-foreground/10">
                <span className="text-xs font-bold text-primary-foreground">PL</span>
              </div>
              <span className="text-sm font-semibold">
                PipeLedger<span className="ml-0.5 font-normal text-accent">AI</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-primary-foreground/60">
              <Link
                href={`${APP_URL}/login`}
                className="transition-colors hover:text-primary-foreground"
              >
                Sign in
              </Link>
              <span>Privacy</span>
              <span>Terms</span>
            </div>
            <p className="text-xs text-primary-foreground/40">
              © {new Date().getFullYear()} PipeLedger AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const STEPS = [
  {
    icon: Zap,
    title: "Connect your ERP",
    description:
      "Plug in NetSuite, QuickBooks, and more with guided setup wizards. Credentials are encrypted and never leave your environment.",
  },
  {
    icon: GitFork,
    title: "Transform with dbt",
    description:
      "Your GL data runs through auditable dbt pipelines on BigQuery. Every transformation is deterministic, versioned, and tested.",
  },
  {
    icon: Bot,
    title: "Deliver to AI",
    description:
      "An MCP server exposes mart tables to Claude, GPT-4, and any compatible assistant. Ask questions. Get auditable answers.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "ERP Connectors",
    description:
      "Native connectors for NetSuite, QuickBooks, and Xero. Scheduled extraction with incremental syncs.",
  },
  {
    icon: GitFork,
    title: "dbt Transformations",
    description:
      "Staging → intermediate → mart. Fully layered, fully tested. Debits always equal credits.",
  },
  {
    icon: FileBarChart,
    title: "Financial Taxonomy",
    description:
      "US GAAP and IFRS taxonomy mapping built in. Chart of accounts normalised automatically.",
  },
  {
    icon: Network,
    title: "MCP + REST Delivery",
    description:
      "Serve financial data to AI assistants via MCP or any system via REST. Signed URLs, no raw DB access.",
  },
  {
    icon: ShieldCheck,
    title: "Audit Trail",
    description:
      "Every pipeline run, approval, and delivery is logged immutably. Full lineage from ERP to AI.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description:
      "Owner, Admin, Analyst, and Viewer roles. Sensitive accounts restricted at the row level.",
  },
  {
    icon: Database,
    title: "BigQuery Native",
    description:
      "Data stays in your GCP project. PipeLedger never stores your GL data on its own servers.",
  },
  {
    icon: CheckCircle2,
    title: "Human Checkpoints",
    description:
      "Input and output review gates before any data is delivered. Humans stay in the loop.",
  },
  {
    icon: Bot,
    title: "AI Commentary",
    description:
      "LLM-generated variance commentary and NL descriptions — advisory only, downstream of the mart.",
  },
];

const TIERS = [
  {
    name: "Starter",
    price: "Coming soon",
    highlighted: false,
    features: [
      "1 ERP connection",
      "Up to 5 pipeline runs / month",
      "MCP + REST delivery",
      "US GAAP or IFRS taxonomy",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "Coming soon",
    highlighted: true,
    features: [
      "3 ERP connections",
      "Unlimited pipeline runs",
      "Multi-entity support",
      "Custom taxonomy mapping",
      "Slack support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    highlighted: false,
    features: [
      "Unlimited connections",
      "Dedicated BigQuery project",
      "SLA + audit support",
      "SSO / SAML",
      "Dedicated success manager",
    ],
  },
];

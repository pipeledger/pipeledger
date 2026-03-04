import Link from "next/link";
import {
  Zap,
  GitFork,
  ShieldCheck,
  FileBarChart,
  Network,
  CheckCircle2,
  Eye,
  RotateCcw,
  TrendingUp,
  BookOpen,
  AlertCircle,
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
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              The infrastructure that transforms ERP financial data into{" "}
              <span className="text-accent">AI-ready intelligence.</span>
            </h1>
            <p className="mb-10 text-lg text-primary-foreground/70 lg:text-xl">
              PipeLedger turns ERP general ledger data into AI-ready, audit-grade
              datasets with BigQuery row-level security, sensitive-data redaction,
              and human approvals. CFOs can safely serve financial truth to their
              organization, modern data platforms, and autonomous AI agents.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`${APP_URL}/login`}
                className="w-full rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 sm:w-auto"
              >
                Request private beta
              </Link>
              <a
                href="#how-it-works"
                className="w-full rounded-md border border-primary-foreground/20 px-6 py-3 text-sm font-medium text-primary-foreground/80 transition-colors hover:border-primary-foreground/40 hover:text-primary-foreground sm:w-auto"
              >
                See how governance works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Narrative bridge ── */}
      <section className="border-b border-border bg-muted/50 py-10">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-6">
          <p className="text-base text-muted-foreground lg:text-lg">
            Once the organization starts asking{" "}
            <span className="font-medium text-foreground">
              &ldquo;Can we just connect Claude Code to the general ledger?&rdquo;
            </span>
            , the CFO needs an answer that&rsquo;s safe.{" "}
            <span className="font-medium text-foreground">
              PipeLedger is that answer.
            </span>
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mb-3 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight lg:text-4xl">
              How it works
            </h2>
            <p className="mb-1 text-base text-muted-foreground">
              Three stages from raw ERP data to governed AI delivery.
            </p>
            <p className="text-sm font-semibold text-accent">
              CFO-approved sharing, at scale.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute right-0 top-7 hidden h-px w-1/2 translate-x-1/2 bg-border md:block" />
                )}
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {i + 1} — {step.subtitle}
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
              Built for finance teams that need to trust AI.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="mb-1 text-sm font-semibold">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
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
              Predictable base. Scales with AI adoption.
            </h2>
            <p className="mx-auto max-w-xl text-base text-muted-foreground">
              A platform subscription plus usage that grows as humans and AI
              agents query financial data — without adding finance headcount.
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
              No surprises: real-time usage dashboard + approvals before delivery.
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
    subtitle: "Extract, don't export",
    title: "Connect your ERP",
    description:
      "Typed connectors pull GL, dimensions, chart of accounts, and budgets. No messy CSV exports. Scope is reviewed at the input checkpoint before anything moves.",
  },
  {
    icon: GitFork,
    subtitle: "Make it machine-legible",
    title: "Deterministic dbt transformations",
    description:
      "Balance movements, taxonomy mapping, currency adjustments, period alignment, and dimensional enrichment — versioned, tested, and traceable from mart back to raw ERP fields.",
  },
  {
    icon: ShieldCheck,
    subtitle: "Your governance wedge",
    title: "Deliver with enforced access controls",
    description:
      "BigQuery native row-level policies, role views, and sensitive-data redaction. Nothing reaches MCP, API, or export files until an approver confirms what each role will see.",
  },
];


const FEATURES = [
  {
    icon: FileBarChart,
    title: "AI-Safe General Ledger",
    description:
      "GL movements, dimensions, and taxonomy transformed into machine-legible, queryable tables.",
  },
  {
    icon: ShieldCheck,
    title: "BigQuery Native Row-Level Security",
    description:
      "Policies enforced at the data layer — API bugs can't leak restricted rows.",
  },
  {
    icon: AlertCircle,
    title: "Sensitive Data Redaction",
    description:
      "Automatically exclude executive comp, legal, M&A, and board-level categories by policy.",
  },
  {
    icon: Eye,
    title: "Dual Approval Checkpoints",
    description:
      "Nothing reaches AI until a human approves scope and role-based visibility.",
  },
  {
    icon: GitFork,
    title: "Deterministic dbt Transformations",
    description:
      "Versioned, tested, and auditable — staging → intermediate → security → marts.",
  },
  {
    icon: TrendingUp,
    title: "Budget vs Actual, Pre-Joined",
    description:
      "Variance-ready marts so CFOs can ask \"Where are we off plan?\" instantly.",
  },
  {
    icon: BookOpen,
    title: "Context Enrichment",
    description:
      "Turn codes into meaning: accounts + dimensions + documents → readable finance context.",
  },
  {
    icon: Network,
    title: "MCP + API Delivery",
    description:
      "Serve governed finance datasets to Claude and internal tools without raw DB access.",
  },
  {
    icon: RotateCcw,
    title: "Audit Trail & Revocation",
    description:
      "Every extract, approval, delivery, and access event logged. Revoke deliveries instantly.",
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

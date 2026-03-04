import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Logo + wordmark */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
          <span className="text-sm font-bold text-primary-foreground">PL</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          PipeLedger <span className="text-accent">AI</span>
        </h1>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-border bg-card p-8">
        <LoginForm />
      </div>
    </div>
  );
}

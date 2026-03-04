"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signUpSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;
type Mode = "password" | "magic-link";

// ─── Sign-in form ─────────────────────────────────────────────────────────────

function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("password");
  const [magicSent, setMagicSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  async function onPasswordSubmit(values: SignInValues) {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      toast.error(error.message);
    } else {
      window.location.href = "/home";
    }
  }

  async function onMagicLink() {
    const email = getValues("email");
    if (!email) {
      toast.error("Enter your email address first");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setMagicSent(true);
    }
  }

  if (magicSent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
          <Mail className="h-5 w-5 text-accent" />
        </div>
        <p className="text-sm font-medium text-foreground">Check your inbox</p>
        <p className="text-xs text-muted-foreground">
          We sent a sign-in link to{" "}
          <span className="font-medium">{getValues("email")}</span>
        </p>
        <button
          onClick={() => setMagicSent(false)}
          className="text-xs text-accent underline-offset-2 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Sign in to your account
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      {mode === "password" && (
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
      )}

      {mode === "password" ? (
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      ) : (
        <Button
          type="button"
          className="w-full"
          disabled={isSubmitting}
          onClick={onMagicLink}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send magic link
        </Button>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={() => setMode(mode === "password" ? "magic-link" : "password")}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors"
        >
          {mode === "password"
            ? "Sign in with a magic link instead"
            : "Sign in with password instead"}
        </button>
      </div>

      <div className="border-t border-border pt-4 text-center">
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors"
        >
          Don&apos;t have an account?{" "}
          <span className="text-accent font-medium">Sign up</span>
        </button>
      </div>
    </form>
  );
}

// ─── Sign-up form ─────────────────────────────────────────────────────────────

function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const supabase = createClient();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(values: SignUpValues) {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
          <Mail className="h-5 w-5 text-accent" />
        </div>
        <p className="text-sm font-medium text-foreground">Check your inbox</p>
        <p className="text-xs text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="font-medium">{getValues("email")}</span>. Click it to
          activate your account.
        </p>
        <button
          onClick={onSwitchToSignIn}
          className="text-xs text-accent underline-offset-2 hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Create your account
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="su-email">Email</Label>
        <Input
          id="su-email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-password">Password</Label>
        <Input
          id="su-password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-confirm">Confirm password</Label>
        <Input
          id="su-confirm"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create account
      </Button>

      <div className="border-t border-border pt-4 text-center">
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors"
        >
          Already have an account?{" "}
          <span className="text-accent font-medium">Sign in</span>
        </button>
      </div>
    </form>
  );
}

// ─── Toggle wrapper ───────────────────────────────────────────────────────────

export function LoginForm() {
  const [view, setView] = useState<"sign-in" | "sign-up">("sign-in");

  return view === "sign-in" ? (
    <SignInForm onSwitchToSignUp={() => setView("sign-up")} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setView("sign-in")} />
  );
}

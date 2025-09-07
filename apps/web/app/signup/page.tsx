"use client";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      window.location.href = "/summaries";
      return;
    }
    const j = await res.json().catch(() => ({}));
    setError(j?.error || "Signup failed");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded p-6">
        <h1 className="text-xl font-semibold">Create Account</h1>
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <div>
          <label htmlFor="email" className="block text-sm">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm">Password</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" className="w-full border rounded px-3 py-2 bg-black text-white">Sign up</button>
        <div className="text-sm text-muted-foreground">Already have an account? <a className="underline" href="/login">Sign in</a></div>
      </form>
    </main>
  );
}


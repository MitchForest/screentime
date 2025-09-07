"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/summaries";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, next }),
    });
    if (res.redirected) {
      window.location.href = res.url;
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error || "Login failed");
      return;
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded p-6">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <div>
          <label htmlFor="email" className="block text-sm">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm">Password</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" className="w-full border rounded px-3 py-2 bg-black text-white">Sign in</button>
        <div className="text-sm text-muted-foreground">No account? <a className="underline" href="/signup">Sign up</a></div>
      </form>
    </main>
  );
}

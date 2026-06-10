"use client";

import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto } from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import { AuthShell } from "@kloqra/web-shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api<AuthSessionDto & { accessToken: string }>(ROUTES.AUTH.REGISTER, {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      setSession(res, res.accessToken);
      router.push("/timer");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Your time is safe — try again."
      );
    }
  }

  return (
    <AuthShell title="Create account">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit">Register</Button>
      </form>
    </AuthShell>
  );
}

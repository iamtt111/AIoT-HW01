"use client";

import { FormEvent, useEffect, useState } from "react";

const copy = {
  checking: "\u6b63\u5728\u78ba\u8a8d\u7ba1\u7406\u54e1\u72c0\u614b\u2026",
  password: "\u7ba1\u7406\u54e1\u5bc6\u78bc",
  signIn: "\u767b\u5165",
  signOut: "\u767b\u51fa",
  loginFailed: "\u7121\u6cd5\u767b\u5165\uff0c\u8acb\u78ba\u8a8d\u5bc6\u78bc\u3002",
  title: "\u9810\u5831\u7ba1\u7406\u4ecb\u9762",
  description: "\u6b64\u9801\u53ea\u9650\u53d7\u4fdd\u8b77\u7684\u7ba1\u7406\u54e1\u5b58\u53d6\u3002",
  sync: "\u57f7\u884c\u624b\u52d5\u540c\u6b65",
  raw: "\u986f\u793a\u6700\u65b0\u539f\u59cb\u56de\u61c9",
  accepted: "\u5df2\u5c07\u540c\u6b65\u4efb\u52d9\u4ea4\u7d66 GitHub Actions\u3002\u7d50\u679c\u5c07\u5728\u5b8c\u6210\u5f8c\u66f4\u65b0\u65bc\u516c\u958b\u5100\u8868\u677f\u3002",
  alreadyRunning: "\u76ee\u524d\u5df2\u6709\u540c\u6b65\u6b63\u5728\u57f7\u884c\u3002",
  requestFailed: "\u7ba1\u7406\u54e1\u64cd\u4f5c\u5931\u6557\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002",
  noPayload: "\u5c1a\u7121\u4fdd\u7559\u7684\u539f\u59cb\u56de\u61c9\u3002",
};

type RawResponse = { payload: unknown | null };

export function AdminConsole() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [rawPayload, setRawPayload] = useState<unknown | null>(null);

  useEffect(() => {
    void fetch("/api/admin/session")
      .then(async (response) => response.ok ? response.json() as Promise<{ authenticated: boolean }> : { authenticated: false })
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/session", {
      body: JSON.stringify({ password }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      setMessage(copy.loginFailed);
      return;
    }
    setPassword("");
    setAuthenticated(true);
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setRawPayload(null);
  }

  async function dispatchSync() {
    setMessage("");
    const response = await fetch("/api/admin/sync", { method: "POST" });
    if (response.status === 409) {
      setMessage(copy.alreadyRunning);
      return;
    }
    if (!response.ok) {
      setMessage(copy.requestFailed);
      return;
    }
    setMessage(copy.accepted);
  }

  async function inspectPayload() {
    setMessage("");
    const response = await fetch("/api/admin/raw-payload");
    if (!response.ok) {
      setMessage(copy.requestFailed);
      return;
    }
    const result = await response.json() as RawResponse;
    setRawPayload(result.payload);
  }

  if (authenticated === null) return <main className="min-h-screen bg-slate-50 p-8 text-slate-900">{copy.checking}</main>;
  if (!authenticated) return <main className="min-h-screen bg-slate-50 p-8 text-slate-900"><form className="mx-auto max-w-md space-y-4 rounded-xl bg-white p-6 shadow-sm" onSubmit={signIn}><h1 className="text-2xl font-bold">{copy.title}</h1><p className="text-sm text-slate-600">{copy.description}</p><label className="block font-medium">{copy.password}<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white" type="submit">{copy.signIn}</button>{message && <p className="text-sm text-red-700">{message}</p>}</form></main>;

  return <main className="min-h-screen bg-slate-50 p-8 text-slate-900"><section className="mx-auto max-w-4xl space-y-4 rounded-xl bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">{copy.title}</h1><p className="text-sm text-slate-600">{copy.description}</p></div><button className="rounded-md border border-slate-300 px-4 py-2" onClick={signOut}>{copy.signOut}</button></div><div className="flex flex-wrap gap-3"><button className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white" onClick={dispatchSync}>{copy.sync}</button><button className="rounded-md border border-slate-300 px-4 py-2" onClick={inspectPayload}>{copy.raw}</button></div>{message && <p className="rounded-md bg-slate-100 p-3 text-sm">{message}</p>}{rawPayload === null ? null : <pre className="max-h-[32rem] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(rawPayload, null, 2)}</pre>}</section></main>;
}

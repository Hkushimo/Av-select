"use client";
import { useState } from "react";

export default function InviteForm() {
  const [inviteUrl, setInviteUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function generate() {
    setBusy(true); setError(""); setNotice(""); setInviteUrl("");
    try {
      const response = await fetch("/api/admin/invite", { method: "POST" });
      const result = await response.json() as { inviteUrl?: string; error?: string };
      if (!response.ok || !result.inviteUrl) throw new Error(result.error || "Could not create invitation.");
      setInviteUrl(result.inviteUrl);
      setNotice("Private invite ready. Tap Share to choose how to send it.");
    } catch (err) { setError(err instanceof Error ? err.message : "Invite failed."); }
    finally { setBusy(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(inviteUrl); setNotice("Invite link copied."); }
    catch { setError("Please select and copy the link below."); }
  }

  async function share() {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join AV Select",
          text: "You've been invited to join the AV Select technician roster. This private link is for you:",
          url: inviteUrl,
        });
        return;
      } catch (err) { if (err instanceof Error && err.name === "AbortError") return; }
    }
    await copy();
  }

  return <section className="panel space-y-4" id="invite-technician">
    <div>
      <h2 className="text-xl font-bold">Invite a technician</h2>
      <p className="muted text-sm mt-2">Generate a private, single-use link. Share it however you like using your Android share menu. No email address needed here.</p>
    </div>
    <button type="button" className="primary w-full sm:w-auto" disabled={busy} onClick={generate}>
      {busy ? "Generating…" : "Generate invite link"}
    </button>
    {inviteUrl && <div className="space-y-3 border-t border-slate-700 pt-4">
      <p className="text-sm font-medium">Your invite is ready</p>
      <button type="button" className="primary w-full flex justify-center items-center gap-2" onClick={share}>
        <span aria-hidden="true">↗</span> Share invite
      </button>
      <button type="button" className="pill w-full" onClick={copy}>Copy link instead</button>
      <details className="text-xs muted"><summary className="cursor-pointer">Show private invitation link</summary>
        <textarea readOnly rows={3} className="mt-2 text-xs" value={inviteUrl} onFocus={e => e.currentTarget.select()} />
      </details>
      <p className="muted text-xs">One person can use this link once. It expires in 7 days. Anyone with the link can claim it, so send it privately.</p>
    </div>}
    {notice && <p role="status" className="text-green-300 text-sm">{notice}</p>}
    {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
  </section>;
}

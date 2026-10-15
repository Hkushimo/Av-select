"use client";
import { FormEvent, useState } from "react";

export default function InviteForm() {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function createInvite(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice(""); setInviteUrl("");
    try {
      const response = await fetch("/api/admin/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json() as { inviteUrl?: string; error?: string };
      if (!response.ok || !result.inviteUrl) throw new Error(result.error || "Couldn't create invitation.");
      setInviteUrl(result.inviteUrl);
      setInvitedEmail(email.trim().toLowerCase());
      setNotice("Invite ready. Share it privately with the intended technician.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    setError("");
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AV Select technician invitation",
          text: "You've been invited to join AV Select as a technician. Open this private link to get started:",
          url: inviteUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await copyInvite();
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("Invitation link copied. Send it privately to " + invitedEmail + ".");
    } catch {
      setError("Could not copy automatically. Select and copy the link below.");
    }
  }

  return <section className="panel space-y-4">
    <div>
      <h2 className="text-xl font-bold">Invite a technician</h2>
      <p className="muted text-sm mt-1">Create a one-person invite link, then share it by text, WhatsApp, or another app on your phone. No email service required.</p>
    </div>
    <form onSubmit={createInvite} className="flex flex-col sm:flex-row gap-3">
      <input aria-label="Technician email" type="email" required placeholder="technician@example.com"
        value={email} onChange={e => setEmail(e.target.value)} className="flex-1" />
      <button className="primary" disabled={busy}>{busy ? "Creating…" : "Create invite link"}</button>
    </form>
    {inviteUrl && <div className="space-y-3 border-t border-slate-700 pt-4">
      <p className="text-sm">Invite prepared for <strong>{invitedEmail}</strong></p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="primary" onClick={shareInvite}>Share invite</button>
        <button type="button" className="pill" onClick={copyInvite}>Copy link</button>
      </div>
      <label className="block"><span className="label">Private link (keep confidential)</span>
        <textarea rows={3} readOnly value={inviteUrl} onFocus={e => e.currentTarget.select()} />
      </label>
      <p className="muted text-xs">This is a sign-in invitation link. Anyone with it may be able to activate the invited account until the link expires. Send it only to the intended person; do not post it publicly.</p>
    </div>}
    {notice && <p role="status" className="text-green-300 text-sm">{notice}</p>}
    {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
  </section>;
}

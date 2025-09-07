import { createDb, listDeviceTokens, mintDeviceToken, revokeDeviceToken } from "@screentime/db";

export const dynamic = "force-dynamic";

async function MintForm() {
  async function action(formData: FormData) {
    "use server";
    const db = createDb();
    const ttl = Number(formData.get("ttl_hours") || "0");
    const note = String(formData.get("note") || "");
    await mintDeviceToken(db, { ttl_hours: Number.isFinite(ttl) && ttl > 0 ? ttl : undefined, note });
  }
  return (
    <form action={action} className="flex items-end gap-2">
      <div>
        <label htmlFor="ttl_hours" className="block text-sm">TTL (hours)</label>
        <input id="ttl_hours" name="ttl_hours" type="number" placeholder="24" className="border rounded px-2 py-1" />
      </div>
      <div>
        <label htmlFor="note" className="block text-sm">Note</label>
        <input id="note" name="note" type="text" placeholder="dev token" className="border rounded px-2 py-1" />
      </div>
      <button type="submit" className="border rounded px-3 py-2 bg-black text-white">Mint</button>
    </form>
  );
}

async function RevokeForm({ token }: { token: string }) {
  async function action() {
    "use server";
    const db = createDb();
    await revokeDeviceToken(db, token);
  }
  return (
    <form action={action}>
      <button type="submit" className="text-red-600 underline">Revoke</button>
    </form>
  );
}

export default async function AdminTokensPage() {
  const db = createDb();
  const tokens = await listDeviceTokens(db, 100);
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Device Tokens</h1>
      <MintForm />
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2">Token</th>
            <th className="py-2">Created</th>
            <th className="py-2">Expires</th>
            <th className="py-2">Revoked</th>
            <th className="py-2">Note</th>
            <th className="py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t) => (
            <tr key={t.token} className="border-b">
              <td className="py-2 font-mono">{t.token}</td>
              <td className="py-2">{new Date(t.created_at).toISOString()}</td>
              <td className="py-2">{t.expires_at ? new Date(t.expires_at).toISOString() : ""}</td>
              <td className="py-2">{t.revoked_at ? new Date(t.revoked_at).toISOString() : ""}</td>
              <td className="py-2">{t.note || ""}</td>
              <td className="py-2">{t.revoked_at ? null : <RevokeForm token={t.token} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}


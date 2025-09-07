type SummaryRow = {
  summary_id: string;
  student_id: string;
  day: string | Date;
  total_duration_ms: number;
  idle_ms: number;
};
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SummariesPage() {
  const base = process.env.EDGE_BASE_URL || "http://localhost:8787";
  const headers: Record<string, string> = {};
  if (process.env.EDGE_DASHBOARD_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.EDGE_DASHBOARD_API_KEY}`;
  }
  const res = await fetch(`${base}/api/summaries?limit=20`, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load summaries: ${res.status}`);
  }
  const json = (await res.json()) as { rows: SummaryRow[] };
  const summaries = json.rows;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Recent Summaries</h1>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2">Summary</th>
            <th className="py-2">Student</th>
            <th className="py-2">Day</th>
            <th className="py-2">Duration</th>
            <th className="py-2">Idle</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.summary_id} className="border-b">
              <td className="py-2">
                <Link href={`/summaries/${s.summary_id}`} className="text-primary underline">
                  {s.summary_id}
                </Link>
              </td>
              <td className="py-2">{s.student_id}</td>
              <td className="py-2">{new Date(s.day as any).toISOString().slice(0, 10)}</td>
              <td className="py-2">{s.total_duration_ms} ms</td>
              <td className="py-2">{s.idle_ms} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

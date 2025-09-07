type ActivityRow = {
  activity_id: string;
  started_at: string | Date;
  app: string;
  type: string;
  lesson_title?: string | null;
  topic?: string | null;
  score?: number | null;
  evidence?: Array<{ image_url?: string; bbox?: [number, number, number, number] }> | null;
};
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SummaryDetailPage({ params }: { params: { id: string } }) {
  const base = process.env.EDGE_BASE_URL || "http://localhost:8787";
  const headers: Record<string, string> = {};
  if (process.env.EDGE_DASHBOARD_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.EDGE_DASHBOARD_API_KEY}`;
  }
  const res = await fetch(`${base}/api/summaries/${params.id}`, { headers, cache: "no-store" });
  if (!res.ok) {
    return (
      <main className="p-6">
        <p>Summary not found.</p>
        <a className="text-primary underline" href="/summaries">Back</a>
      </main>
    );
  }
  const data = (await res.json()) as { summary: any; activities: ActivityRow[] };
  if (!data) {
    return (
      <main className="p-6">
        <p>Summary not found.</p>
        <Link className="text-primary underline" href="/summaries">
          Back
        </Link>
      </main>
    );
  }
  const { summary, activities } = data;
  return (
    <main className="p-6 space-y-6">
      <div>
        <Link className="text-primary underline" href="/summaries">
          ← Back to summaries
        </Link>
      </div>
      <section>
        <h1 className="text-2xl font-semibold mb-2">Summary {summary.summary_id}</h1>
        <div className="text-sm text-muted-foreground">Student: {summary.student_id}</div>
        <div className="text-sm text-muted-foreground">Day: {new Date(summary.day).toISOString().slice(0, 10)}</div>
        <div className="mt-2">Duration: {summary.total_duration_ms} ms; Idle: {summary.idle_ms} ms</div>
        {Array.isArray(summary.highlights) ? (
          <div className="mt-2">
            <div className="font-medium">Highlights</div>
            <ul className="list-disc ml-6">
              {(summary.highlights as unknown as string[]).map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Activities</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-2">When</th>
              <th className="py-2">App</th>
              <th className="py-2">Type</th>
              <th className="py-2">Title</th>
              <th className="py-2">Score</th>
              <th className="py-2">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.activity_id} className="border-b">
                <td className="py-2">{new Date(a.started_at as any).toISOString()}</td>
                <td className="py-2">{a.app}</td>
                <td className="py-2">{a.type}</td>
                <td className="py-2">{a.lesson_title || a.topic || ""}</td>
                <td className="py-2">{a.score ?? ""}</td>
                <td className="py-2">
                  {Array.isArray(a.evidence)
                    ? (a.evidence as any[]).map((e, i) =>
                        e?.image_url ? (
                          <a
                            key={i}
                            href={e.image_url}
                            rel="noreferrer noopener"
                            target="_blank"
                            className="text-primary underline mr-2"
                          >
                            View
                          </a>
                        ) : null
                      )
                    : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

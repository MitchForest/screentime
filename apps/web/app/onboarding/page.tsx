import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Get Started</h1>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">1) Sign in</h2>
        <p>
          Use the admin login at <Link href="/login" className="text-primary underline">/login</Link>. For pilot testing,
          credentials come from your environment (<code>ADMIN_EMAIL</code>/<code>ADMIN_PASSWORD</code>).
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">2) Create a device token</h2>
        <p>
          Visit <Link href="/admin/tokens" className="text-primary underline">/admin/tokens</Link> and mint a token. Use this as the API key in
          both the Chrome extension and the macOS agent.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">3) Install the Chrome Extension</h2>
        <p>
          Option A (dev): Open <code>chrome://extensions</code>, enable Developer Mode, click <em>Load unpacked</em>, and select
          the <code>apps/extension</code> folder. Then open the extension Options and set your Backend Base URL and API key.
        </p>
        <p>
          Option B (store): If published, follow the Chrome Web Store link and then set options as above.
        </p>
        <p>
          Use <strong>Cmd/Ctrl+Shift+U</strong> to capture and upload the current tab.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">4) Install the macOS Agent</h2>
        <p>
          For development, open the Swift package in Xcode: <code>apps/mac-native/ScreentimeAgent/Package.swift</code>, run, and allow
          Screen Recording permission when prompted. Set the Backend Base URL and API key in Settings.
        </p>
        <p>
          For distribution, use a signed & notarized DMG (coming soon). The app will capture at a fixed cadence, downscale/compress,
          upload, and trigger the model via the backend.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">5) View Summaries</h2>
        <p>
          After captures, visit <Link href="/summaries" className="text-primary underline">/summaries</Link> to see recent summaries and drill into details.
        </p>
      </section>
    </main>
  );
}


macOS Native App (Production Path)

Goals
- Capture screens via ScreenCaptureKit at 15–30s cadence (pause on idle)
- Preprocess on-device (downscale ≤1024 px, JPEG/WebP 70–85%, redaction, pHash dedup)
- Upload via `/api/uploads/sign` then PUT; send telemetry to `/v1/events`
- Menubar UI (start/stop, sampling, redaction)
- TCC permissions flow; codesign + notarize; App Sandbox entitlements

Project Setup
- Create an Xcode project in this folder named `ScreentimeAgent` (bundle id, signing team)
- Enable Screen Recording entitlement and App Sandbox where applicable

Networking & Config
- Read base URL and optional API key from a small preferences pane
- Use `Authorization: Bearer <EDGE_API_KEY>` when configured

Persistence
- Cache a session_id (ULID) for the active run; rotate at session start/end

Next Steps
1) Scaffold a SwiftUI app with a menubar extra and background capture service
2) Implement ScreenCaptureKit capture and resize/compress via CoreImage
3) Implement `/api/uploads/sign` + PUT + `/v1/events`
4) Package and notarize; document install steps


// Service worker for Screentime Uploader (MV3)

const DEFAULT_BASE_URL = "http://localhost:8787";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["baseUrl"], (res) => {
    if (!res.baseUrl) {
      chrome.storage.sync.set({ baseUrl: DEFAULT_BASE_URL });
    }
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "capture-and-upload") {
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    return;
  }

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: "png" });
    const blob = dataUrlToBlob(dataUrl);
    const baseUrl = await getBaseUrl();
    const apiKey = await getApiKey();
    const sessionId = await getOrCreateSessionId();

    const signRes = await fetch(`${baseUrl}/api/uploads/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ contentType: "image/png" }),
    });
    if (!signRes.ok) {
      throw new Error(await signRes.text());
    }
    const { putUrl, getUrl, headers } = await signRes.json();

    const putRes = await fetch(putUrl, { method: "PUT", headers, body: blob });
    if (!putRes.ok) {
      throw new Error(await putRes.text());
    }

    // Send a telemetry event (context.update)
    const at = new Date().toISOString();
    const url = tab.url || undefined;
    const window_title = tab.title || undefined;
    await postJson(`${baseUrl}/v1/events`, { type: "context.update", session_id: sessionId, at, active_app: "Chrome", url, window_title }, apiKey);

    // Trigger model via backend proxy
    const telemetry = { active_app: "Chrome", url: tab.url || undefined, window_title: tab.title || undefined };
    await postJson(`${baseUrl}/v1/responses/proxy`, { image_url: getUrl, telemetry, session: { session_id: await getOrCreateSessionId(), student_id: "ext_user", started_at: new Date().toISOString(), device: "chromebook" } }, await getApiKey());

    await chrome.action.setBadgeText({ text: "OK" });
    const BADGE_RESET_MS = 2000;
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), BADGE_RESET_MS);
  } catch (_err) {
    await chrome.action.setBadgeText({ text: "ERR" });
    const BADGE_RESET_MS = 2000;
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), BADGE_RESET_MS);
  }
});

const DATA_URL_RE = /data:(.*);base64/;

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = DATA_URL_RE.exec(meta)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

function getBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["baseUrl"], (res) => resolve(res.baseUrl || DEFAULT_BASE_URL));
  });
}

function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey"], (res) => resolve(res.apiKey || ""));
  });
}

function getOrCreateSessionId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sessionId"], (res) => {
      if (res.sessionId) return resolve(res.sessionId);
      const id = `ext_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      chrome.storage.local.set({ sessionId: id }, () => resolve(id));
    });
  });
}

async function postJson(url, body, apiKey, attempt = 0) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    return true;
  } catch (_e) {
    if (attempt >= 1) return false; // one retry with backoff
    await new Promise((r) => setTimeout(r, 1000));
    return postJson(url, body, apiKey, attempt + 1);
  }
}

function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey"], (res) => resolve(res.apiKey || ""));
  });
}

function getOrCreateSessionId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sessionId"], (res) => {
      if (res.sessionId) return resolve(res.sessionId);
      const id = `ext_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      chrome.storage.local.set({ sessionId: id }, () => resolve(id));
    });
  });
}

async function postJson(url, body, apiKey, attempt = 0) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    return true;
  } catch (_e) {
    if (attempt >= 1) return false; // one retry with backoff
    await new Promise((r) => setTimeout(r, 1000));
    return postJson(url, body, apiKey, attempt + 1);
  }
}

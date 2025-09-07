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

    const signRes = await fetch(`${baseUrl}/api/uploads/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "image/png" }),
    });
    if (!signRes.ok) {
      throw new Error(await signRes.text());
    }
    const { putUrl, headers } = await signRes.json();

    const putRes = await fetch(putUrl, { method: "PUT", headers, body: blob });
    if (!putRes.ok) {
      throw new Error(await putRes.text());
    }

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

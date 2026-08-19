const POLL_MS = 10_000;
const MAX_WAIT_MS = 25 * 60 * 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runWorkerDigest({ date, seenUrls, preservedItems, runKey }) {
  const baseUrl = process.env.DIGEST_WORKER_URL?.replace(/\/$/, "");
  const token = process.env.DIGEST_TRIGGER_TOKEN;
  if (!baseUrl || !token) throw new Error("DIGEST_WORKER_URL and DIGEST_TRIGGER_TOKEN are required");
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const start = await fetch(`${baseUrl}/jobs`, { method: "POST", headers, body: JSON.stringify({ date, seenUrls, preservedItems, runKey }) });
  const startPayload = await start.json();
  if (!start.ok && start.status !== 409) throw new Error(`Digest Worker start failed: HTTP ${start.status}`);
  const id = startPayload.id || `digest-${date}${runKey ? `-${runKey}` : ""}`;
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/jobs/${id}`, { headers: { authorization: `Bearer ${token}` } });
    const status = await response.json();
    if (!response.ok) throw new Error(`Digest Worker status failed: HTTP ${response.status}`);
    if (status.status === "complete") {
      if (!status.output || !Array.isArray(status.output.items)) throw new Error("Digest Worker returned an invalid result");
      return status.output;
    }
    if (["errored", "terminated"].includes(status.status)) {
      throw new Error(`Digest Worker ${status.status}: ${status.error?.message || "unknown error"}`);
    }
    await sleep(POLL_MS);
  }
  throw new Error("Digest Worker timed out while waiting for completion");
}

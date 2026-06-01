export async function POST() {
  const keyId = process.env.TURN_KEY_ID;
  const token = process.env.TURN_API_TOKEN;
  if (!keyId || !token) {
    return Response.json({ error: "TURN not configured" }, { status: 503 });
  }
  try {
    const r = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 86400 }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!r.ok) {
      return Response.json({ error: "upstream error" }, { status: 502 });
    }
    const data = await r.json() as { iceServers: RTCIceServer[] | RTCIceServer };
    // Cloudflare returns a single object, not an array
    const raw = data.iceServers;
    const servers: RTCIceServer[] = Array.isArray(raw) ? raw : [raw];
    return Response.json({ iceServers: servers });
  } catch {
    return Response.json({ error: "fetch failed" }, { status: 502 });
  }
}

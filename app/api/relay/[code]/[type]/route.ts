import Redis from "ioredis";
import { NextRequest } from "next/server";

const kv = new Redis(process.env.REDIS_URL!);

const VALID_CODE = /^[A-Z2-9]{6}$/;
const VALID_TYPE = ["offer", "answer"];
const TTL = 600;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string; type: string }> }
) {
  const { code, type } = await params;
  if (!VALID_CODE.test(code) || !VALID_TYPE.includes(type)) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  try {
    const sdp = await kv.get(`${code}:${type}`);
    if (!sdp) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ [type]: sdp });
  } catch (err) {
    console.error("KV GET error:", err);
    return Response.json({ error: "KV unavailable", detail: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; type: string }> }
) {
  const { code, type } = await params;
  if (!VALID_CODE.test(code) || !VALID_TYPE.includes(type)) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const body = await req.json() as Record<string, unknown>;
  const sdp = body[type];
  if (!sdp || typeof sdp !== "string") {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  try {
    await kv.set(`${code}:${type}`, sdp, "EX", TTL);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("KV SET error:", err);
    return Response.json({ error: "KV unavailable", detail: String(err) }, { status: 500 });
  }
}

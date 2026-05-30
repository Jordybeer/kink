import { kv } from "@vercel/kv";
import { NextRequest } from "next/server";

const VALID_CODE = /^[A-Z2-9]{6}$/;
const VALID_TYPE = ["offer", "answer"];
const TTL = 120;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string; type: string }> }
) {
  const { code, type } = await params;
  if (!VALID_CODE.test(code) || !VALID_TYPE.includes(type)) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  const sdp = await kv.get<string>(`${code}:${type}`);
  if (!sdp) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ [type]: sdp });
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
  await kv.set(`${code}:${type}`, sdp, { ex: TTL });
  return Response.json({ ok: true });
}

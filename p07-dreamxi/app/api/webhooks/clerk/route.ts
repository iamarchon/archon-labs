import { createHmac, timingSafeEqual } from "node:crypto";
import { supabase } from "@/lib/supabase";

interface ClerkUserCreatedEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address?: string }>;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    image_url?: string | null;
  };
}

export async function POST(request: Request) {
  const payload = await request.text();
  const headers = request.headers;
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  if (!secret) {
    return Response.json({ error: "Missing CLERK_WEBHOOK_SECRET" }, { status: 500 });
  }

  const verified = verifySvixSignature({ payload, svixId, svixTimestamp, svixSignature, secret });
  if (!verified) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as ClerkUserCreatedEvent;
  if (event.type !== "user.created") {
    return Response.json({ received: true, ignored: event.type });
  }

  if (!supabase) {
    return Response.json({ received: true, warning: "Supabase client unavailable due to missing env vars" });
  }

  const email = event.data.email_addresses?.[0]?.email_address ?? null;
  const fullName = [event.data.first_name, event.data.last_name].filter(Boolean).join(" ").trim() || event.data.username || email || "DreamXI User";
  const profile = {
    id: event.data.id,
    clerk_id: event.data.id,
    email,
    full_name: fullName,
    avatar_url: event.data.image_url ?? null,
    username: event.data.username ?? null,
  };

  const profileResult = await supabase.from("profiles").upsert(profile, { onConflict: "id" });
  if (profileResult.error) {
    const userResult = await supabase.from("users").upsert(profile, { onConflict: "id" });
    if (userResult.error) {
      return Response.json({ error: userResult.error.message }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}

function verifySvixSignature({ payload, svixId, svixTimestamp, svixSignature, secret }: { payload: string; svixId: string; svixTimestamp: string; svixSignature: string; secret: string; }) {
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const secretValue = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(secretValue, "base64");
  const digest = createHmac("sha256", key).update(signedContent).digest("base64");
  const expected = Buffer.from(digest);

  return svixSignature
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      const [, signature = ""] = entry.split(",");
      const value = signature.startsWith("v1,") ? signature.slice(3) : signature;
      const provided = Buffer.from(value);
      return provided.length === expected.length && timingSafeEqual(provided, expected);
    });
}

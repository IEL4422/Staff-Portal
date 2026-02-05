import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_EMAIL_DOMAIN = "illinoisestatelaw.com";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(detail: string, status = 400) {
  return jsonResponse({ detail }, status);
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  if (stored.startsWith("pbkdf2:")) {
    const parts = stored.split(":");
    const iterations = parseInt(parts[1]);
    const saltHex = parts[2];
    const storedHashHex = parts[3];
    const salt = new Uint8Array(
      saltHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16))
    );
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      keyMaterial,
      256
    );
    const hashHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex === storedHashHex;
  }

  if (stored.startsWith("$2")) {
    return bcrypt.compare(password, stored);
  }

  return false;
}

async function createJwt(
  userId: string,
  email: string,
  role: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    email,
    role,
    iat: now,
    exp: now + 7 * 24 * 60 * 60,
  };

  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

async function verifyJwt(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const encoder = new TextEncoder();
    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigB64 = parts[2].replace(/-/g, "+").replace(/_/g, "/");
    const padded = sigB64 + "=".repeat((4 - (sigB64.length % 4)) % 4);
    const signature = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));

    const valid = await crypto.subtle.verify("HMAC", key, signature, data);
    if (!valid) return null;

    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload =
      payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
    const payload = JSON.parse(atob(paddedPayload));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/auth/, "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const jwtSecret =
      Deno.env.get("JWT_SECRET") || "your-secret-key-change-in-production";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (path === "/register" && req.method === "POST") {
      const { email, password, name } = await req.json();
      const normalizedEmail = email.toLowerCase().trim();

      if (!normalizedEmail.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
        return errorResponse(
          `Only @${ALLOWED_EMAIL_DOMAIN} email addresses are allowed`
        );
      }

      if (!password || password.length < 8) {
        return errorResponse("Password must be at least 8 characters");
      }

      if (!name || !name.trim()) {
        return errorResponse("Name is required");
      }

      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existing) {
        return errorResponse("An account with this email already exists");
      }

      const userId = crypto.randomUUID();
      const now = new Date().toISOString();
      const passwordHash = await hashPassword(password);

      const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        name: name.trim(),
        role: "staff",
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        return errorResponse("Failed to create account", 500);
      }

      const token = await createJwt(userId, normalizedEmail, "staff", jwtSecret);

      return jsonResponse({
        access_token: token,
        token_type: "bearer",
        user: {
          id: userId,
          email: normalizedEmail,
          name: name.trim(),
          role: "staff",
          is_active: true,
          created_at: now,
        },
      });
    }

    if (path === "/login" && req.method === "POST") {
      const { email, password } = await req.json();
      const normalizedEmail = email.toLowerCase().trim();

      const { data: user, error: queryError } = await supabase
        .from("users")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (queryError || !user) {
        return errorResponse("Invalid credentials", 401);
      }

      if (!user.is_active) {
        return errorResponse("Account is deactivated", 401);
      }

      const passwordValid = await verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        return errorResponse("Invalid credentials", 401);
      }

      const token = await createJwt(
        user.id,
        user.email,
        user.role || "staff",
        jwtSecret
      );

      return jsonResponse({
        access_token: token,
        token_type: "bearer",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || "staff",
          is_active: user.is_active,
          created_at: user.created_at,
        },
      });
    }

    if (path === "/me" && req.method === "GET") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return errorResponse("Not authenticated", 401);
      }

      const token = authHeader.slice(7);
      const payload = await verifyJwt(token, jwtSecret);
      if (!payload) {
        return errorResponse("Invalid or expired token", 401);
      }

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", payload.sub as string)
        .maybeSingle();

      if (!user) {
        return errorResponse("User not found", 401);
      }

      if (!user.is_active) {
        return errorResponse("Account is deactivated", 401);
      }

      return jsonResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || "staff",
        is_active: user.is_active,
        created_at: user.created_at,
      });
    }

    if (path === "/check-role" && req.method === "GET") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return errorResponse("Not authenticated", 401);
      }

      const token = authHeader.slice(7);
      const payload = await verifyJwt(token, jwtSecret);
      if (!payload) {
        return errorResponse("Invalid or expired token", 401);
      }

      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", payload.sub as string)
        .maybeSingle();

      if (!user) {
        return errorResponse("User not found", 401);
      }

      return jsonResponse({
        role: user.role || "staff",
        is_admin: user.role === "admin",
      });
    }

    if (path === "/profile" && req.method === "PATCH") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return errorResponse("Not authenticated", 401);
      }

      const token = authHeader.slice(7);
      const payload = await verifyJwt(token, jwtSecret);
      if (!payload) {
        return errorResponse("Invalid or expired token", 401);
      }

      const body = await req.json();
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (body.name !== undefined) updates.name = body.name;

      await supabase
        .from("users")
        .update(updates)
        .eq("id", payload.sub as string);

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", payload.sub as string)
        .maybeSingle();

      return jsonResponse({
        success: true,
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              is_active: user.is_active,
              created_at: user.created_at,
            }
          : null,
      });
    }

    if (path === "/change-password" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return errorResponse("Not authenticated", 401);
      }

      const token = authHeader.slice(7);
      const payload = await verifyJwt(token, jwtSecret);
      if (!payload) {
        return errorResponse("Invalid or expired token", 401);
      }

      const { current_password, new_password } = await req.json();

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", payload.sub as string)
        .maybeSingle();

      if (!user) {
        return errorResponse("User not found", 401);
      }

      const currentValid = await verifyPassword(
        current_password,
        user.password_hash
      );
      if (!currentValid) {
        return errorResponse("Current password is incorrect");
      }

      if (!new_password || new_password.length < 8) {
        return errorResponse("Password must be at least 8 characters");
      }

      const newHash = await hashPassword(new_password);
      await supabase
        .from("users")
        .update({
          password_hash: newHash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.sub as string);

      return jsonResponse({
        success: true,
        message: "Password changed successfully",
      });
    }

    if (path === "/admin/users" && req.method === "GET") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return errorResponse("Not authenticated", 401);
      }

      const token = authHeader.slice(7);
      const payload = await verifyJwt(token, jwtSecret);
      if (!payload) {
        return errorResponse("Invalid or expired token", 401);
      }

      const { data: currentUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", payload.sub as string)
        .maybeSingle();

      if (!currentUser || currentUser.role !== "admin") {
        return errorResponse("Admin access required", 403);
      }

      const { data: users } = await supabase
        .from("users")
        .select("id, email, name, role, is_active, created_at")
        .order("created_at", { ascending: false });

      return jsonResponse({ users: users || [] });
    }

    if (path === "/seed-admin" && req.method === "POST") {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .limit(1);

      if (existing && existing.length > 0) {
        return errorResponse(
          "Users already exist. Seed is only for initial setup."
        );
      }

      const userId = crypto.randomUUID();
      const now = new Date().toISOString();
      const passwordHash = await hashPassword("AdminPass123!");

      await supabase.from("users").insert({
        id: userId,
        email: "admin@illinoisestatelaw.com",
        password_hash: passwordHash,
        name: "Administrator",
        role: "admin",
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      return jsonResponse({
        success: true,
        message: "Admin user created",
        credentials: {
          email: "admin@illinoisestatelaw.com",
          password: "AdminPass123!",
        },
      });
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    console.error("Auth function error:", err);
    return errorResponse("Internal server error", 500);
  }
});

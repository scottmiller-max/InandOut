/**
 * Shared authentication & authorization helpers for edge functions.
 *
 * Unlike the old authMiddleware.ts (which said "copy this into every function"),
 * this module is meant to be IMPORTED. Relative imports from _shared are bundled
 * by Supabase when a function is deployed, so a single source of truth is fine and
 * far safer than copy-paste (copy-paste is exactly how several functions ended up
 * with no auth at all).
 *
 * Usage inside a function:
 *   import { requireRole, jsonError, STAFF_ROLES } from "../_shared/auth.ts";
 *   const auth = await requireRole(req, STAFF_ROLES);
 *   if (!auth.authorized) return jsonError(auth.error!, auth.status, corsHeaders);
 *   // auth.user, auth.role now available
 */

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";

// Plain string[] (not `as const`) so `.includes(someString)` type-checks cleanly.
export const STAFF_ROLES: string[] = ["master_admin", "admin", "dispatcher"];
export const ADMIN_ROLES: string[] = ["master_admin", "admin"];

export interface AuthResult {
  authorized: boolean;
  status: number;
  error?: string;
  user?: { id: string; email: string };
  role?: string;
  /** true when the caller authenticated with the internal shared secret, not a user JWT */
  viaSecret?: boolean;
}

/**
 * Identify the caller without rejecting anyone — for dual-role functions (like Riley)
 * that serve staff, signed-in customers, AND anonymous website visitors differently.
 *
 *   staff    -> a signed-in user whose role is in STAFF_ROLES (full access)
 *   customer -> a signed-in user who is NOT staff (scope to their own data)
 *   anon     -> no/invalid user JWT (general info only; no CRM reads)
 *
 * The caller decides what each mode is allowed to do; this only classifies.
 */
export interface Actor {
  mode: "staff" | "customer" | "anon";
  userId?: string;
  email?: string;
  role?: string;
}

export async function identifyActor(
  req: Request,
  supabase?: SupabaseClient,
): Promise<Actor> {
  const sb = supabase ?? serviceClient();
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { mode: "anon" };

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return { mode: "anon" };

  const { data: userRole } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = userRole?.role;
  const base = { userId: user.id, email: user.email ?? undefined, role };
  if (role && STAFF_ROLES.includes(role)) return { mode: "staff", ...base };
  return { mode: "customer", ...base };
}

/** Service-role client. Bypasses RLS — only use after an auth check has passed. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Require a signed-in user whose role is in `allowedRoles`.
 * Pass an empty array to allow any authenticated user that has a role row.
 */
export async function requireRole(
  req: Request,
  allowedRoles: readonly string[],
  supabase?: SupabaseClient,
): Promise<AuthResult> {
  const sb = supabase ?? serviceClient();

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { authorized: false, status: 401, error: "Missing authorization header" };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: { user }, error: userError } = await sb.auth.getUser(token);
  if (userError || !user) {
    return { authorized: false, status: 401, error: "Invalid or expired token" };
  }

  const { data: userRole, error: roleError } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !userRole) {
    return { authorized: false, status: 403, error: "User role not found" };
  }

  const identity = { user: { id: user.id, email: user.email ?? "" }, role: userRole.role };

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole.role)) {
    return { authorized: false, status: 403, error: "Insufficient permissions", ...identity };
  }

  return { authorized: true, status: 200, ...identity };
}

/**
 * Constant-time comparison of a request-supplied secret against an env var.
 * Use for machine-to-machine webhooks (Vapi) and internal server-to-server calls.
 * The secret may arrive in the `x-webhook-secret` header (default) or `?secret=`.
 */
export function verifyWebhookSecret(
  req: Request,
  envVarName: string,
  headerName = "x-webhook-secret",
): boolean {
  const expected = Deno.env.get(envVarName);
  if (!expected) return false; // fail closed if the secret isn't configured
  const provided =
    req.headers.get(headerName) ??
    new URL(req.url).searchParams.get("secret") ??
    "";
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Allow EITHER a staff user JWT OR the internal shared secret.
 * For functions that are called both from the app (staff) and server-to-server
 * by other edge functions / automations (send-sms, send-email, log-interaction,
 * riley-call-summary). Internal callers send header `x-internal-secret`.
 */
export async function requireStaffOrSecret(
  req: Request,
  allowedRoles: readonly string[] = STAFF_ROLES,
  secretEnvVar = "INTERNAL_FUNCTION_SECRET",
  supabase?: SupabaseClient,
): Promise<AuthResult> {
  if (verifyWebhookSecret(req, secretEnvVar, "x-internal-secret")) {
    return { authorized: true, status: 200, viaSecret: true, role: "internal" };
  }
  return requireRole(req, allowedRoles, supabase);
}

/** Small helper to return a JSON error with CORS headers. */
export function jsonError(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

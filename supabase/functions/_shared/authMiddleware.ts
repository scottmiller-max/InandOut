/**
 * Edge Function Authentication Middleware
 *
 * IMPORTANT: Edge functions should NOT import this file directly.
 * Instead, copy the relevant auth pattern into each edge function.
 *
 * This file serves as documentation and a template for implementing
 * role-based authentication in edge functions.
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

export interface AuthContext {
  user: {
    id: string;
    email: string;
  };
  role: string;
  permissions: string[];
}

export interface AuthCheckResult {
  authorized: boolean;
  context?: AuthContext;
  error?: string;
}

/**
 * Template: Authenticate and authorize user
 * Copy this function into your edge function
 */
export async function authenticateRequest(
  req: Request,
  requiredPermissions?: string[]
): Promise<AuthCheckResult> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return {
      authorized: false,
      error: "Missing authorization header"
    };
  }

  // Initialize Supabase client with service role
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get user from JWT
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      authorized: false,
      error: "Invalid or expired token"
    };
  }

  // Get user's role
  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !userRole) {
    return {
      authorized: false,
      error: "User role not found"
    };
  }

  // Get user's permissions
  const { data: permissions, error: permError } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role", userRole.role);

  if (permError) {
    return {
      authorized: false,
      error: "Failed to fetch permissions"
    };
  }

  const userPermissions = permissions?.map(p => p.permission) || [];

  // Check required permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(perm =>
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      return {
        authorized: false,
        error: "Insufficient permissions"
      };
    }
  }

  return {
    authorized: true,
    context: {
      user: {
        id: user.id,
        email: user.email || ""
      },
      role: userRole.role,
      permissions: userPermissions
    }
  };
}

/**
 * Template: Check if user has specific role
 * Copy this function into your edge function
 */
export async function checkUserRole(
  req: Request,
  allowedRoles: string[]
): Promise<AuthCheckResult> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return {
      authorized: false,
      error: "Missing authorization header"
    };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      authorized: false,
      error: "Invalid or expired token"
    };
  }

  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !userRole) {
    return {
      authorized: false,
      error: "User role not found"
    };
  }

  if (!allowedRoles.includes(userRole.role)) {
    return {
      authorized: false,
      error: `Access denied. Required roles: ${allowedRoles.join(", ")}`
    };
  }

  // Get permissions for context
  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role", userRole.role);

  const userPermissions = permissions?.map(p => p.permission) || [];

  return {
    authorized: true,
    context: {
      user: {
        id: user.id,
        email: user.email || ""
      },
      role: userRole.role,
      permissions: userPermissions
    }
  };
}

/**
 * Template: Log audit trail
 * Copy this function into your edge function
 */
export async function logAudit(
  userId: string,
  userRole: string,
  actionType: string,
  actionCategory: 'auth' | 'crm' | 'jobs' | 'roles' | 'settings' | 'messaging' | 'data',
  affectedEntityType?: string,
  affectedEntityId?: string,
  actionDetails?: Record<string, unknown>,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await supabase.from("audit_log").insert({
    user_id: userId,
    user_role: userRole,
    action_type: actionType,
    action_category: actionCategory,
    affected_entity_type: affectedEntityType,
    affected_entity_id: affectedEntityId,
    action_details: actionDetails || {},
    success,
    error_message: errorMessage
  });
}

/**
 * Template: Check if user can access job (for crew members)
 * Copy this function into your edge function
 */
export async function checkJobAccess(
  userId: string,
  userRole: string,
  jobId: string
): Promise<{ hasAccess: boolean; error?: string }> {
  // Admins and dispatchers have access to all jobs
  if (['master_admin', 'admin', 'dispatcher'].includes(userRole)) {
    return { hasAccess: true };
  }

  // Crew members can only access assigned jobs
  if (userRole === 'crew') {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: job, error } = await supabase
      .from("jobs")
      .select("team_lead_id, crew_ids")
      .eq("id", jobId)
      .maybeSingle();

    if (error || !job) {
      return { hasAccess: false, error: "Job not found" };
    }

    const isAssigned = job.team_lead_id === userId ||
                      (job.crew_ids && job.crew_ids.includes(userId));

    if (!isAssigned) {
      return { hasAccess: false, error: "Not assigned to this job" };
    }

    return { hasAccess: true };
  }

  return { hasAccess: false, error: "Unauthorized" };
}

/**
 * Example Usage in an Edge Function:
 *
 * import { authenticateRequest, logAudit } from "./_shared/authMiddleware.ts";
 *
 * Deno.serve(async (req: Request) => {
 *   // ... CORS handling ...
 *
 *   // Check authentication and permissions
 *   const authResult = await authenticateRequest(req, ['customers:edit']);
 *
 *   if (!authResult.authorized) {
 *     return new Response(
 *       JSON.stringify({ error: authResult.error }),
 *       { status: 403, headers: corsHeaders }
 *     );
 *   }
 *
 *   const { user, role, permissions } = authResult.context!;
 *
 *   // Perform the operation...
 *
 *   // Log the action
 *   await logAudit(
 *     user.id,
 *     role,
 *     'update_customer',
 *     'crm',
 *     'customer',
 *     customerId,
 *     { changes: updateData }
 *   );
 *
 *   // Return response...
 * });
 */

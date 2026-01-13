import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ApproveRequest {
  draft_job_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's role
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: "User role not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization check: Only dispatcher, admin, or master_admin can approve/reject draft jobs
    const allowedRoles = ['master_admin', 'admin', 'dispatcher'];
    if (!allowedRoles.includes(userRole.role)) {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        user_role: userRole.role,
        action_type: 'approve_draft_job_attempt',
        action_category: 'jobs',
        success: false,
        error_message: 'Insufficient permissions'
      });

      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Required roles: admin, dispatcher" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ApproveRequest = await req.json();

    if (!body.draft_job_id || !body.action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: draft_job_id, action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['approve', 'reject'].includes(body.action)) {
      return new Response(
        JSON.stringify({ error: "Action must be 'approve' or 'reject'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the draft job
    const { data: draftJob, error: draftError } = await supabase
      .from("draft_jobs")
      .select("*")
      .eq("id", body.draft_job_id)
      .maybeSingle();

    if (draftError || !draftJob) {
      return new Response(
        JSON.stringify({ error: "Draft job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (draftJob.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Draft job already ${draftJob.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === 'reject') {
      // Reject the draft job
      const { error: updateError } = await supabase
        .from("draft_jobs")
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: body.rejection_reason || 'No reason provided'
        })
        .eq("id", body.draft_job_id);

      if (updateError) {
        console.error("Failed to reject draft job:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to reject draft job", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("audit_log").insert({
        user_id: user.id,
        user_role: userRole.role,
        action_type: 'reject_draft_job',
        action_category: 'jobs',
        affected_entity_type: 'draft_job',
        affected_entity_id: body.draft_job_id,
        action_details: { rejection_reason: body.rejection_reason },
        success: true
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Draft job rejected"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Approve and convert to actual job
    const jobData = draftJob.job_data as Record<string, unknown>;

    const { data: newJob, error: jobError } = await supabase
      .from("jobs")
      .insert({
        customer_id: draftJob.customer_id,
        status: 'lead',
        from_address: jobData.from_address || '',
        from_city: jobData.from_city || '',
        from_state: jobData.from_state || '',
        from_zip: jobData.from_zip || '',
        to_address: jobData.to_address || '',
        to_city: jobData.to_city || '',
        to_state: jobData.to_state || '',
        to_zip: jobData.to_zip || '',
        move_date: jobData.move_date || null,
        move_time: jobData.move_time || null,
        home_size: jobData.home_size || '',
        num_bedrooms: jobData.num_bedrooms || 0,
        num_movers: jobData.num_movers || 2,
        special_items: jobData.special_items || [],
        stairs_origin: jobData.stairs_origin || 0,
        stairs_destination: jobData.stairs_destination || 0,
        notes: `Riley AI suggestion: ${draftJob.riley_notes || ''}`,
        internal_notes: `Created from draft job ${body.draft_job_id}. Riley confidence: ${draftJob.riley_confidence_score || 0}`
      })
      .select()
      .single();

    if (jobError) {
      console.error("Failed to create job:", jobError);
      return new Response(
        JSON.stringify({ error: "Failed to create job", details: jobError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update draft job status
    await supabase
      .from("draft_jobs")
      .update({
        status: 'converted',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        converted_job_id: newJob.id
      })
      .eq("id", body.draft_job_id);

    await supabase.from("audit_log").insert({
      user_id: user.id,
      user_role: userRole.role,
      action_type: 'approve_draft_job',
      action_category: 'jobs',
      affected_entity_type: 'job',
      affected_entity_id: newJob.id,
      action_details: { draft_job_id: body.draft_job_id, job_number: newJob.job_number },
      success: true
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Draft job approved and converted",
        job: newJob
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("approve-draft-job error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

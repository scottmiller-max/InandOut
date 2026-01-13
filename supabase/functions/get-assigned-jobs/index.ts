import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
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

    // Authorization check: Only crew members use this endpoint
    // Admins and dispatchers should use full job management endpoints
    if (userRole.role !== 'crew') {
      return new Response(
        JSON.stringify({ error: "This endpoint is for crew members only. Use the full jobs API." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get jobs where user is assigned as team_lead or in crew_ids
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        id,
        job_number,
        status,
        move_date,
        move_time,
        from_address,
        from_city,
        from_state,
        from_zip,
        to_address,
        to_city,
        to_state,
        to_zip,
        home_size,
        num_bedrooms,
        num_movers,
        special_items,
        stairs_origin,
        stairs_destination,
        estimated_hours,
        truck_number,
        notes,
        progress_percentage,
        started_at,
        team_lead_id,
        crew_ids,
        customers!inner (
          id,
          full_name,
          phone,
          email
        )
      `)
      .or(`team_lead_id.eq.${user.id},crew_ids.cs.{${user.id}}`);

    if (jobsError) {
      console.error("Failed to fetch assigned jobs:", jobsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch assigned jobs", details: jobsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter and shape the response to include only necessary customer info
    const assignedJobs = (jobs || []).map(job => ({
      id: job.id,
      job_number: job.job_number,
      status: job.status,
      move_date: job.move_date,
      move_time: job.move_time,
      from_address: job.from_address,
      from_city: job.from_city,
      from_state: job.from_state,
      from_zip: job.from_zip,
      to_address: job.to_address,
      to_city: job.to_city,
      to_state: job.to_state,
      to_zip: job.to_zip,
      home_size: job.home_size,
      num_bedrooms: job.num_bedrooms,
      num_movers: job.num_movers,
      special_items: job.special_items,
      stairs_origin: job.stairs_origin,
      stairs_destination: job.stairs_destination,
      estimated_hours: job.estimated_hours,
      truck_number: job.truck_number,
      notes: job.notes,
      progress_percentage: job.progress_percentage,
      started_at: job.started_at,
      is_team_lead: job.team_lead_id === user.id,
      customer: {
        id: job.customers.id,
        full_name: job.customers.full_name,
        phone: job.customers.phone,
        email: job.customers.email
      }
    }));

    return new Response(
      JSON.stringify({
        success: true,
        jobs: assignedJobs,
        count: assignedJobs.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("get-assigned-jobs error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

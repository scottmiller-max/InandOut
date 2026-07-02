import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { requireRole, jsonError, STAFF_ROLES } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // AUTHORIZATION: this returns full customer PII (profile, jobs, interactions,
  // AI summaries, call logs). Staff only. Without this check anyone could
  // enumerate customer records by email.
  const auth = await requireRole(req, STAFF_ROLES);
  if (!auth.authorized) return jsonError(auth.error!, auth.status, corsHeaders);

  try {
    // Support both GET (query params) and POST (body)
    let customerId: string | null = null;
    let email: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      customerId = url.searchParams.get("customer_id");
      email = url.searchParams.get("email");
    } else {
      const body = await req.json();
      customerId = body.customer_id || null;
      email = body.email || null;
    }

    // Must have either customer_id or email
    if (!customerId && !email) {
      return new Response(
        JSON.stringify({ error: "Either customer_id or email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch customer
    let customerQuery = supabase.from("customers").select("*");
    
    if (customerId) {
      customerQuery = customerQuery.eq("id", customerId);
    } else if (email) {
      customerQuery = customerQuery.eq("email", email);
    }

    const { data: customer, error: customerError } = await customerQuery.maybeSingle();

    if (customerError) {
      console.error("Customer lookup failed:", customerError);
      return new Response(
        JSON.stringify({ error: "Failed to lookup customer" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recent jobs (limit 10)
    const { data: jobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch recent interactions (limit 20)
    const { data: interactions } = await supabase
      .from("interactions")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch latest AI summary
    const { data: aiSummary } = await supabase
      .from("ai_summaries")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch call logs (limit 10)
    const { data: callLogs } = await supabase
      .from("call_logs")
      .select("*")
      .eq("customer_id", customer.id)
      .order("call_time", { ascending: false })
      .limit(10);

    // Compute stats
    const totalJobs = jobs?.length || 0;
    const completedJobs = jobs?.filter(job => job.status === "completed").length || 0;
    const activeJobs = jobs?.filter(job => job.status === "active" || job.status === "scheduled").length || 0;
    const totalSpent = jobs?.reduce((sum, job) => sum + (job.final_cost || 0), 0) || 0;
    const totalInteractions = interactions?.length || 0;

    // Build profile object
    const profile = {
      customer: customer,
      jobs: jobs || [],
      interactions: interactions || [],
      ai_summary: aiSummary || null,
      call_logs: callLogs || [],
      stats: {
        total_jobs: totalJobs,
        completed_jobs: completedJobs,
        active_jobs: activeJobs,
        total_spent: totalSpent,
        total_interactions: totalInteractions,
      },
    };

    return new Response(
      JSON.stringify({
        success: true,
        profile: profile,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("get-customer-profile error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

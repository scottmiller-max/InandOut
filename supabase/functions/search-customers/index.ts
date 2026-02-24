import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchRequest {
  search_term: string;
  search_type?: "all" | "name" | "email" | "phone" | "job_number";
  limit?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const allowedRoles = ["master_admin", "admin", "dispatcher", "crew"];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { search_term, search_type = "all", limit = 50 }: SearchRequest = await req.json();

    if (!search_term || search_term.length < 2) {
      return new Response(
        JSON.stringify({ error: "Search term must be at least 2 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let query = adminClient
      .from("customers")
      .select(`
        id,
        full_name,
        email,
        phone,
        address,
        city,
        state,
        created_at
      `)
      .limit(limit);

    const searchPattern = `%${search_term}%`;

    switch (search_type) {
      case "name":
        query = query.ilike("full_name", searchPattern);
        break;
      case "email":
        query = query.ilike("email", searchPattern);
        break;
      case "phone":
        query = query.ilike("phone", searchPattern);
        break;
      case "job_number":
        const { data: jobCustomers } = await adminClient
          .from("jobs")
          .select("customer_id")
          .ilike("job_number", searchPattern);

        const customerIds = jobCustomers?.map(j => j.customer_id).filter(Boolean) || [];
        if (customerIds.length === 0) {
          return new Response(
            JSON.stringify({ data: [] }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        query = query.in("id", customerIds);
        break;
      default:
        query = query.or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`);
    }

    const { data: customers, error: searchError } = await query.order("full_name");

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(
        JSON.stringify({ error: "Search failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const customerIds = customers?.map(c => c.id) || [];

    let jobStats: Record<string, { total: number; last_date: string | null }> = {};

    if (customerIds.length > 0) {
      const { data: jobs } = await adminClient
        .from("jobs")
        .select("customer_id, move_date")
        .in("customer_id", customerIds);

      if (jobs) {
        for (const job of jobs) {
          if (!job.customer_id) continue;

          if (!jobStats[job.customer_id]) {
            jobStats[job.customer_id] = { total: 0, last_date: null };
          }

          jobStats[job.customer_id].total++;

          if (job.move_date) {
            if (!jobStats[job.customer_id].last_date ||
                job.move_date > jobStats[job.customer_id].last_date) {
              jobStats[job.customer_id].last_date = job.move_date;
            }
          }
        }
      }
    }

    const results = customers?.map(customer => ({
      ...customer,
      total_jobs: jobStats[customer.id]?.total || 0,
      last_job_date: jobStats[customer.id]?.last_date || null,
    })) || [];

    return new Response(
      JSON.stringify({ data: results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

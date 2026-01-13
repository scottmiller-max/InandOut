import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateCustomerRequest {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  source?: string;
  email_consent?: boolean;
  sms_consent?: boolean;
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
    // Initialize Supabase client with service role
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

    // Authorization check: Only admin, master_admin, or dispatcher can create customers
    const allowedRoles = ['master_admin', 'admin', 'dispatcher'];
    if (!allowedRoles.includes(userRole.role)) {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        user_role: userRole.role,
        action_type: 'create_customer_attempt',
        action_category: 'crm',
        success: false,
        error_message: 'Insufficient permissions'
      });

      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Required roles: admin, dispatcher" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateCustomerRequest = await req.json();

    // Validate required fields
    if (!body.full_name || !body.email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: full_name and email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert customer (by email)
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          full_name: body.full_name,
          email: body.email,
          phone: body.phone || null,
          address: body.address || null,
          city: body.city || null,
          state: body.state || null,
          zip_code: body.zip_code || null,
          source: body.source || "admin",
          email_consent: body.email_consent ?? true,
          sms_consent: body.sms_consent ?? false,
          last_interaction_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (customerError) {
      console.error("Customer upsert failed:", customerError);

      await supabase.from("audit_log").insert({
        user_id: user.id,
        user_role: userRole.role,
        action_type: 'create_customer',
        action_category: 'crm',
        action_details: { email: body.email },
        success: false,
        error_message: customerError.message
      });

      return new Response(
        JSON.stringify({ error: "Failed to create customer", details: customerError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful action
    await supabase.from("audit_log").insert({
      user_id: user.id,
      user_role: userRole.role,
      action_type: 'create_customer',
      action_category: 'crm',
      affected_entity_type: 'customer',
      affected_entity_id: customer.id,
      action_details: { customer_email: customer.email, customer_name: customer.full_name },
      success: true
    });

    return new Response(
      JSON.stringify({
        success: true,
        customer: customer,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("create-customer error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

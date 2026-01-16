import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
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
    const { document_type } = await req.json();

    if (!document_type) {
      return new Response(
        JSON.stringify({ error: "document_type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* -------------------------------
       Determine caller role
    -------------------------------- */

    let role: string | null = null;
    let userId: string | null = null;

    const authHeader = req.headers.get("authorization");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");

      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (user) {
        userId = user.id;

        const { data: staff } = await supabase
          .from("staff_profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        role = staff?.role ?? "customer";
      }
    }

    if (!role) role = "public";

    /* -------------------------------
       Visibility rules
    -------------------------------- */

    let allowedVisibility: string[] = ["public"];

    if (role === "customer") {
      allowedVisibility.push("customer");
    }

    if (["crew", "dispatcher", "admin"].includes(role)) {
      allowedVisibility.push("customer", "staff");
    }

    if (["admin", "dispatcher"].includes(role)) {
      allowedVisibility.push("admin");
    }

    if (role === "master_admin") {
      allowedVisibility = ["public", "customer", "staff", "admin"];
    }

    /* -------------------------------
       Fetch document
    -------------------------------- */

    const { data: doc, error } = await supabase
      .from("documents_registry")
      .select("*")
      .eq("document_type", document_type)
      .eq("active", true)
      .in("visibility", allowedVisibility)
      .single();

    if (error || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* -------------------------------
       Signed URL
    -------------------------------- */

    const { data: signed } = await supabase.storage
      .from(doc.storage_bucket)
      .createSignedUrl(doc.storage_path, 300); // 5 min

    /* -------------------------------
       Optional audit log
    -------------------------------- */

    await supabase.from("audit_log").insert({
      action: "document_accessed",
      actor_id: userId,
      user_role: role,
      action_category: "data",
      metadata: {
        document_type,
        version: doc.version,
        role,
      },
    });

    return new Response(
      JSON.stringify({
        id: doc.id,
        title: doc.title,
        document_type: doc.document_type,
        version: doc.version,
        effective_date: doc.effective_date,
        requires_acknowledgement: doc.requires_acknowledgement,
        signed_url: signed?.signedUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

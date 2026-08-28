import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

// Apple App Store Guideline 5.1.1(v): an app that lets people create an account
// must let them delete it from inside the app. This function does that.
//
// Policy (chosen by the business owner): ANONYMIZE, don't destroy job history.
// The customer's personal data is scrubbed, but the customers row and its jobs
// survive so revenue and tax records stay intact.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ---- 1. Identify the caller from their own access token. --------------
    // A user may only ever delete themselves. We deliberately ignore any
    // user id supplied in the request body.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return json({ error: "Not signed in." }, 401);
    }

    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      return json({ error: "Not signed in." }, 401);
    }
    const userId = user.id;

    // Staff accounts shouldn't be self-deletable - it would strand jobs and
    // remove an admin without anyone noticing.
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    const staffRoles = ["master_admin", "admin", "dispatcher", "crew"];
    if (roleRow?.role && staffRoles.includes(roleRow.role)) {
      return json({
        error:
          "Staff accounts can't be deleted from the app. Please contact the office at 833-466-6881.",
      }, 403);
    }

    const steps: string[] = [];

    // ---- 2. Remove the customer's photo files from private storage. -------
    // The customer_photos ROWS cascade when the auth user goes, but the actual
    // objects in the bucket do not - they'd linger indefinitely.
    try {
      const { data: files } = await admin.storage
        .from("customer-photos")
        .list(userId, { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        await admin.storage.from("customer-photos").remove(paths);
        steps.push(`removed ${paths.length} photo file(s)`);
      }
    } catch (e) {
      console.error("storage cleanup failed:", e);
      // Non-fatal: never block a deletion request on storage cleanup.
    }

    // ---- 3. Anonymize the customer record, keeping job history. -----------
    // customers.user_id is SET NULL on delete, so without this the row would
    // survive still holding name, email, phone and address.
    const { data: customerRow } = await admin
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (customerRow?.id) {
      const { error: anonError } = await admin
        .from("customers")
        .update({
          full_name: "Deleted user",
          // email is NOT NULL, so it needs a unique placeholder rather than null
          email: `deleted-${userId}@account-removed.invalid`,
          phone: null,
          address: null,
          city: null,
          state: null,
          zip_code: null,
          notes: null,
          email_consent: false,
          sms_consent: false,
          user_id: null,
        })
        .eq("id", customerRow.id);

      if (anonError) {
        console.error("anonymize failed:", anonError);
        return json({ error: "Could not complete deletion. Please contact support." }, 500);
      }
      steps.push("anonymized customer record, job history retained");
    }

    // ---- 4. Clear the Stripe mapping row. ---------------------------------
    // stripe_customers.user_id is NO ACTION, so leaving it in place would
    // BLOCK the auth deletion below outright.
    const { error: stripeError } = await admin
      .from("stripe_customers")
      .delete()
      .eq("user_id", userId);
    if (stripeError) {
      console.error("stripe_customers cleanup failed:", stripeError);
    } else {
      steps.push("cleared stripe mapping");
    }

    // ---- 5. Delete the auth user. -----------------------------------------
    // Cascades moves, customer_photos rows, user_roles, notifications,
    // preferences, project files/settings and acknowledgements.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("auth delete failed:", deleteError);
      return json({ error: "Could not complete deletion. Please contact support." }, 500);
    }
    steps.push("deleted login");

    console.log(`account deletion complete for ${userId}: ${steps.join("; ")}`);
    return json({ success: true, message: "Your account has been deleted." });
  } catch (err) {
    console.error("delete-account error:", err);
    return json({ error: "Could not complete deletion. Please contact support." }, 500);
  }
});

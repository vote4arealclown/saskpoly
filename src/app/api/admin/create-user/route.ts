import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseAdminUntyped } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const { data: user, error } = await getSupabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split("@")[0],
        role: "user",
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create notification
    await getSupabaseAdminUntyped().from("notifications").insert({
      type: "user_joined",
      title: `${displayName || email} was added by admin`,
      message: "A new friend was directly invited",
      user_id: user.user?.id,
      user_name: displayName || email,
    });

    return NextResponse.json({ success: true, user: user.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}

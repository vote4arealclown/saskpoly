import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdminUntyped } from "@/lib/supabase-admin";

const AUTHOR_EMAILS = ["admin@saskpoly.xyz", "jasondspooner@gmail.com"];

function isAuthor(email?: string) {
  return AUTHOR_EMAILS.includes(email || "");
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

// GET /api/posts — list published posts (or all for authors)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const showDrafts = searchParams.get("drafts") === "true" && isAuthor(user.email);

    const query = getSupabaseAdminUntyped()
      .from("posts")
      .select("id, title, slug, excerpt, published, created_at, updated_at, author_id")
      .order("created_at", { ascending: false });

    if (!showDrafts) {
      query.eq("published", true);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ posts: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/posts — create new post
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAuthor(user.email)) {
      return NextResponse.json({ error: "Author only" }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, excerpt, published = false } = body;
    if (!title || !content) {
      return NextResponse.json({ error: "Title and content required" }, { status: 400 });
    }

    let slug = slugify(title);
    // Ensure unique slug
    const { data: existing } = await getSupabaseAdminUntyped()
      .from("posts")
      .select("slug")
      .eq("slug", slug)
      .single();
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    const { data, error } = await getSupabaseAdminUntyped()
      .from("posts")
      .insert({
        title,
        slug,
        content,
        excerpt: excerpt || content.slice(0, 200),
        published,
        author_id: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, post: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

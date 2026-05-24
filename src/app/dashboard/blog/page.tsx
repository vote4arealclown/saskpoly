"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PenLine,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  X,
  Check,
  Calendar,
  ArrowLeft,
  Edit3,
} from "lucide-react";

const AUTHOR_EMAILS = ["admin@saskpoly.xyz", "jasondspooner@gmail.com"];

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
  created_at: string;
}

export default function BlogDashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editing, setEditing] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      if (!AUTHOR_EMAILS.includes(user.email || "")) {
        router.push("/");
        return;
      }

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(prof);
      setChecking(false);
      loadPosts();
    };
    check();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const res = await fetch("/api/posts?drafts=true");
    const json = await res.json();
    setPosts(json.posts || []);
    setLoading(false);
  };

  const resetEditor = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setExcerpt("");
    setPublished(false);
  };

  const startNew = () => {
    resetEditor();
    setEditing({ id: "", title: "", slug: "", content: "", excerpt: "", published: false, created_at: "" });
  };

  const startEdit = (post: Post) => {
    setEditing(post);
    setTitle(post.title);
    setContent(post.content);
    setExcerpt(post.excerpt || "");
    setPublished(post.published);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);

    if (editing?.id) {
      // Update existing
      const res = await fetch(`/api/posts/${editing.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, excerpt, published }),
      });
      if (res.ok) {
        resetEditor();
        loadPosts();
      }
    } else {
      // Create new
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, excerpt, published }),
      });
      if (res.ok) {
        resetEditor();
        loadPosts();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${slug}`, { method: "DELETE" });
    if (res.ok) loadPosts();
  };

  const handleTogglePublish = async (post: Post) => {
    const res = await fetch(`/api/posts/${post.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !post.published }),
    });
    if (res.ok) loadPosts();
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenLine className="w-6 h-6 text-emerald-400" />
            Blog Manager
          </h1>
        </div>
        <button
          onClick={startNew}
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Editor */}
      {editing && (
        <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{editing.id ? "Edit Post" : "New Post"}</h2>
            <button onClick={resetEditor} className="text-zinc-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short excerpt (optional, auto-generated from content if empty)"
              rows={2}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              rows={12}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none font-mono text-sm"
            />

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-900"
                />
                Published
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || !content.trim()}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : editing.id ? "Update" : "Publish"}
              </button>
              {editing.id && (
                <Link
                  href={`/blog/${editing.slug}`}
                  target="_blank"
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Posts list */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <PenLine className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No posts yet. Click "New Post" to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{post.title}</p>
                {post.published ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] uppercase flex items-center gap-0.5">
                    <Eye className="w-3 h-3" /> Live
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] uppercase flex items-center gap-0.5">
                    <EyeOff className="w-3 h-3" /> Draft
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(post.created_at).toLocaleDateString()}
                <span className="text-zinc-600">· /blog/{post.slug}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleTogglePublish(post)}
                className="rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-zinc-400 hover:text-white hover:border-zinc-600 transition"
                title={post.published ? "Unpublish" : "Publish"}
              >
                {post.published ? <EyeOff className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => startEdit(post)}
                className="rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-zinc-400 hover:text-white hover:border-zinc-600 transition"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(post.slug)}
                className="rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Newspaper, Loader2, Calendar, ArrowRight } from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  published: boolean;
  created_at: string;
}

export default function BlogPage() {
  const supabase = createClient();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      loadPosts();
    };
    init();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const res = await fetch("/api/posts");
    const json = await res.json();
    setPosts(json.posts || []);
    setLoading(false);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Newspaper className="w-6 h-6 text-emerald-400" />
          Blog
        </h1>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No posts yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="block rounded-2xl border border-zinc-800 bg-zinc-950 p-6 hover:border-zinc-700 transition"
          >
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
              <Calendar className="w-3 h-3" />
              {formatDate(post.created_at)}
              {!post.published && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] uppercase">Draft</span>
              )}
            </div>
            <h2 className="text-lg font-semibold mb-1">{post.title}</h2>
            <p className="text-sm text-zinc-400 line-clamp-2">{post.excerpt}</p>
            <div className="flex items-center gap-1 text-xs text-emerald-400 mt-3">
              Read more <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

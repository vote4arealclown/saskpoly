"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export default function BlogPostPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      loadPost();
    };
    init();
  }, [slug]);

  const loadPost = async () => {
    setLoading(true);
    const res = await fetch(`/api/posts/${slug}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const json = await res.json();
    setPost(json.post || null);
    setLoading(false);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-zinc-500">Post not found.</p>
        <Link href="/blog" className="text-emerald-400 text-sm mt-4 inline-block">
          ← Back to blog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/blog" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to blog
      </Link>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <Calendar className="w-3 h-3" />
          {formatDate(post.created_at)}
          {post.updated_at !== post.created_at && (
            <span className="text-zinc-600">· Updated {formatDate(post.updated_at)}</span>
          )}
          {!post.published && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] uppercase">Draft</span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-6">{post.title}</h1>

        <div className="prose prose-invert prose-zinc max-w-none">
          {post.content.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-zinc-300 leading-relaxed mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}

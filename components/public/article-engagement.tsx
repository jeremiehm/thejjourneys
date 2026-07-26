"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Eye, Heart } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const VISITOR_KEY = "dot-visitor-id";
const VIEWED_PREFIX = "dot-viewed:";
const LIKED_PREFIX = "dot-liked:";

type ArticleEngagementProps = {
  articleId: string;
  initialViewCount: number;
  initialLikeCount: number;
};

function getVisitorKey(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n / 1000)}k`;
}

export function ArticleEngagement({
  articleId,
  initialViewCount,
  initialLikeCount,
}: ArticleEngagementProps) {
  const [viewCount, setViewCount] = useState(initialViewCount);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [ready, setReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const recordedView = useRef(false);

  useEffect(() => {
    const visitorKey = getVisitorKey();
    let cancelled = false;

    async function bootstrap() {
      const supabase = createSupabaseBrowserClient();
      const localLiked = window.localStorage.getItem(`${LIKED_PREFIX}${articleId}`) === "1";

      if (!supabase) {
        if (!cancelled) {
          setLiked(localLiked);
          setReady(true);
        }
        return;
      }

      const { data: remoteLiked } = await supabase.rpc("get_article_liked", {
        p_article_id: articleId,
        p_visitor_key: visitorKey,
      });

      if (cancelled) return;

      const isLiked = Boolean(remoteLiked);
      setLiked(isLiked);
      window.localStorage.setItem(`${LIKED_PREFIX}${articleId}`, isLiked ? "1" : "0");
      setReady(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    if (recordedView.current) return;
    recordedView.current = true;

    const viewKey = `${VIEWED_PREFIX}${articleId}`;
    try {
      if (window.sessionStorage.getItem(viewKey)) return;
      window.sessionStorage.setItem(viewKey, "1");
    } catch {
      // sessionStorage unavailable — still try to record once per mount
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setViewCount((n) => n + 1);
      return;
    }

    void supabase.rpc("increment_article_view", { p_article_id: articleId }).then(({ data, error }) => {
      if (!error && typeof data === "number") setViewCount(data);
      else setViewCount((n) => n + 1);
    });
  }, [articleId]);

  function onToggleLike() {
    if (isPending || !ready) return;

    const visitorKey = getVisitorKey();
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((n) => Math.max(0, n + (nextLiked ? 1 : -1)));
    window.localStorage.setItem(`${LIKED_PREFIX}${articleId}`, nextLiked ? "1" : "0");

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      const { data, error } = await supabase.rpc("toggle_article_like", {
        p_article_id: articleId,
        p_visitor_key: visitorKey,
      });

      if (error || !data) {
        setLiked(!nextLiked);
        setLikeCount((n) => Math.max(0, n + (nextLiked ? -1 : 1)));
        window.localStorage.setItem(`${LIKED_PREFIX}${articleId}`, nextLiked ? "0" : "1");
        return;
      }

      const payload = data as { liked?: boolean; like_count?: number };
      if (typeof payload.liked === "boolean") setLiked(payload.liked);
      if (typeof payload.like_count === "number") setLikeCount(payload.like_count);
      window.localStorage.setItem(
        `${LIKED_PREFIX}${articleId}`,
        payload.liked ? "1" : "0",
      );
    });
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <div
        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-600"
        title="Vues"
      >
        <Eye className="size-4 text-stone-500" aria-hidden />
        <span className="font-medium tabular-nums text-stone-900">{formatCount(viewCount)}</span>
        <span className="text-stone-500">{viewCount === 1 ? "vue" : "vues"}</span>
      </div>

      <button
        type="button"
        onClick={onToggleLike}
        disabled={!ready || isPending}
        aria-pressed={liked}
        aria-label={liked ? "Retirer le like" : "Liker cet article"}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition",
          liked
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-stone-200 bg-white text-stone-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",
          (!ready || isPending) && "opacity-70",
        )}
      >
        <Heart
          className={cn("size-4 transition", liked ? "fill-rose-500 text-rose-500" : "text-current")}
          aria-hidden
        />
        <span className="font-medium tabular-nums text-stone-900">{formatCount(likeCount)}</span>
        <span>{likeCount === 1 ? "like" : "likes"}</span>
      </button>
    </div>
  );
}

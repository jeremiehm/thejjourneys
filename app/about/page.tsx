import type { Metadata } from "next";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export const metadata: Metadata = {
  title: "About",
  description: "Meet Jeremie, the traveler behind Dot On The Map.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm uppercase tracking-[0.25em] text-amber-700">About</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight text-stone-950">
          One traveler, one map of places that stay with me.
        </h1>
        <div className="mt-8 space-y-6 text-lg leading-8 text-stone-600">
          <p>
            Dot On The Map is my space to share the trips I plan, live, and revisit through photos —
            itineraries, favorite addresses, and the moments that make a place feel like home for a while.
          </p>
          <p>
            I love early morning light, routes that leave room to wander, and stories that make you want to
            keep walking. Here you will find collections built around real journeys, not checklist tourism.
          </p>
          <p>
            This blog is designed to stay alive: flexible collections, rich articles, and an admin interface
            that lets me publish without touching code.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

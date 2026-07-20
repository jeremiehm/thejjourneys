import type { Metadata } from "next";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export const metadata: Metadata = { title: "About", description: "Meet Jeremie and Julie, the authors behind JJourneys." };

export default function AboutPage() {
  return <><SiteHeader /><main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8"><p className="text-sm uppercase tracking-[0.25em] text-amber-700">About</p><h1 className="mt-3 text-5xl font-semibold tracking-tight text-stone-950">Two perspectives, one travel journal.</h1><div className="mt-8 space-y-6 text-lg leading-8 text-stone-600"><p>JJourneys is our space to tell the stories of the trips we plan, live, and revisit through photos.</p><p>Jeremie loves itineraries, early morning light, and stories that make you want to keep walking. Julie spots markets, simple addresses, and the details that make a place memorable.</p><p>This blog is designed to stay alive: flexible collections, rich articles, and an admin interface that lets us publish without touching code.</p></div></main><SiteFooter /></>;
}

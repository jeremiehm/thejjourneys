import Link from "next/link";
import { ArticleCard } from "@/components/public/article-card";
import { CollectionCard } from "@/components/public/collection-card";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { AppImage } from "@/components/ui/app-image";
import { getArticleCoverUrl, getArticles, getCollections, isVisibleOnPublicSite } from "@/lib/data";

export default async function Home() {
  const [collections, latestArticles] = await Promise.all([getCollections(), getArticles({ limit: 12 })]);
  const publicArticles = latestArticles.filter(isVisibleOnPublicSite);
  const featured = publicArticles[0];

  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Travel blog by Jeremie & Julie</p>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-stone-950 sm:text-7xl">Vivid, beautiful travel journals that are easy to explore.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">TheJJourneys gathers our itineraries, photos, tips, and stories into immersive collections.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/collections" className="rounded-full bg-stone-950 px-6 py-3 font-semibold text-white">Explore collections</Link><Link href="/about" className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-900">Get to know us</Link></div>
          </div>
          {featured && featured.collection ? <Link href={`/collections/${featured.collection.slug}/${featured.slug}`} className="group relative min-h-[520px] overflow-hidden rounded-[2.5rem] bg-stone-950 text-white shadow-2xl"><AppImage src={getArticleCoverUrl(featured)} alt={featured.title} priority /><div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" /><div className="absolute bottom-0 p-8"><p className="text-sm uppercase tracking-[0.3em] text-amber-100">Featured article</p><h2 className="mt-3 text-4xl font-semibold">{featured.title}</h2><p className="mt-3 max-w-lg text-stone-100">{featured.excerpt}</p></div></Link> : null}
        </section>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8"><div className="mb-7 flex items-end justify-between"><div><p className="text-sm uppercase tracking-[0.25em] text-amber-700">Collections</p><h2 className="mt-2 text-3xl font-semibold text-stone-950">Our journeys</h2></div><Link href="/collections" className="text-sm font-semibold text-stone-700 hover:text-stone-950">View all</Link></div><div className="grid gap-6 md:grid-cols-2">{collections.map((collection) => <CollectionCard key={collection.id} collection={collection} articles={publicArticles} />)}</div></section>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8"><div className="mb-7"><p className="text-sm uppercase tracking-[0.25em] text-amber-700">Latest stories</p><h2 className="mt-2 text-3xl font-semibold text-stone-950">Read now</h2></div><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{publicArticles.map((article) => <ArticleCard key={article.id} article={article} />)}</div></section>
      </main>
      <SiteFooter />
    </>
  );
}

import Link from "next/link";
import { getCollections } from "@/lib/data";

export async function SiteHeader() {
  const collections = await getCollections();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-stone-950">
          TheJJourneys
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-stone-600">
          <Link href="/collections" className="hover:text-stone-950">Collections</Link>
          <div className="hidden items-center gap-4 md:flex">
            {collections.slice(0, 3).map((collection) => (
              <Link key={collection.id} href={`/collections/${collection.slug}`} className="hover:text-stone-950">
                {collection.title}
              </Link>
            ))}
          </div>
          <Link href="/about" className="hover:text-stone-950">About</Link>
          <Link href="/admin" className="rounded-full border border-stone-300 px-3 py-1.5 hover:border-stone-950 hover:text-stone-950">Admin</Link>
        </nav>
      </div>
    </header>
  );
}

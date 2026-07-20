import type { Article, Author, Collection } from "@/lib/blocks/types";

export const demoAuthors: Author[] = [
  {
    id: "author-jeremie",
    name: "Jeremie",
    slug: "jeremie",
    avatar_url: null,
    bio: "Curious photographer, always looking for good coffee and beautiful light.",
  },
];

export const demoCollections: Collection[] = [
  {
    id: "collection-vietnam",
    title: "Northern Vietnam",
    slug: "northern-vietnam",
    description: "From Hanoi to the rice terraces of Sapa, a travel journal of mist, street food, and mountains.",
    cover_image_url: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80",
    status: "published",
    created_at: "2026-01-05T10:00:00.000Z",
    updated_at: "2026-01-10T10:00:00.000Z",
    layout: [
      {
        id: "layout-hero-vietnam",
        type: "hero",
        data: {
          title: "Northern Vietnam",
          subtitle: "An itinerary through Hanoi, Ninh Binh, Ha Long, and Sapa.",
          imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80",
          align: "center",
        },
      },
      {
        id: "layout-text-vietnam",
        type: "text",
        data: {
          heading: "Why this trip",
          body: "A trip planned as a slow loop, with time to stop in markets, night trains, and mountain villages.",
        },
      },
      { id: "layout-grid-vietnam", type: "article_grid", data: { title: "The stops", columns: 3 } },
    ],
  },
  {
    id: "collection-portugal",
    title: "Portugal Escapes",
    slug: "portugal-escapes",
    description: "Lisbon, Alentejo, and the roads facing the Atlantic.",
    cover_image_url: "https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=1600&q=80",
    status: "published",
    created_at: "2026-02-01T10:00:00.000Z",
    updated_at: "2026-02-05T10:00:00.000Z",
    layout: [{ id: "layout-grid-portugal", type: "article_grid", data: { title: "Articles", columns: 2 } }],
  },
];

const rawDemoArticles: Omit<Article, "author" | "collection">[] = [
  {
    id: "article-hanoi",
    collection_id: "collection-vietnam",
    author_id: "author-jeremie",
    title: "48 hours in Hanoi",
    slug: "48-hours-in-hanoi",
    excerpt: "First impressions, the old quarter lanes, and the best bowls of pho of the trip.",
    meta_description: null,
    lang: "en",
    cover_image_url: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=1600&q=80",
    cover_type: "banner",
    status: "published",
    published_at: "2026-01-12T08:00:00.000Z",
    position: 1,
    created_at: "2026-01-08T08:00:00.000Z",
    updated_at: "2026-01-12T08:00:00.000Z",
    content: [
      { id: "hanoi-text-1", type: "text", data: { markdown: "## Arriving in the old quarter\n\nHanoi reveals itself through scooters, fruit vendors, and hidden cafes tucked inside old buildings." } },
      { id: "hanoi-tip", type: "tip_card", data: { icon: "💡", label: "Budget", body: "A street food meal often costs between EUR 1 and 2. Keep small change for the stalls." } },
      { id: "hanoi-image", type: "image", data: { url: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=1400&q=80", caption: "End of day near Hoan Kiem Lake", alt: "Busy street in Hanoi" } },
    ],
  },
  {
    id: "article-sapa",
    collection_id: "collection-vietnam",
    author_id: "author-jeremie",
    title: "Night train to Sapa",
    slug: "night-train-to-sapa",
    excerpt: "A misty climb toward rice terraces and mountain trails.",
    meta_description: null,
    lang: "en",
    cover_image_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    cover_type: "banner",
    status: "published",
    published_at: "2026-01-18T08:00:00.000Z",
    position: 2,
    created_at: "2026-01-14T08:00:00.000Z",
    updated_at: "2026-01-18T08:00:00.000Z",
    content: [
      { id: "sapa-text-1", type: "text", data: { markdown: "## Gaining altitude\n\nThe train leaves Hanoi late at night. By morning, the air is cooler and the landscapes feel vertiginous." } },
      { id: "sapa-quote", type: "quote", data: { text: "The mist turns every bend into a postcard.", attribution: "Jeremie" } },
    ],
  },
  {
    id: "article-lisbonne",
    collection_id: "collection-portugal",
    author_id: "author-jeremie",
    title: "Lisbon by tram and viewpoints",
    slug: "lisbon-trams-viewpoints",
    excerpt: "A day of climbing, descending, eating pasteis, and watching the Tagus.",
    meta_description: null,
    lang: "en",
    cover_image_url: "https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=1600&q=80",
    cover_type: "banner",
    status: "published",
    published_at: "2026-02-10T08:00:00.000Z",
    position: 1,
    created_at: "2026-02-07T08:00:00.000Z",
    updated_at: "2026-02-10T08:00:00.000Z",
    content: [{ id: "lisbon-text", type: "text", data: { markdown: "## Alfama at sunrise\n\nThe lanes are almost empty before 9 a.m. It is the best time to hear the city wake up." } }],
  },
];

export const demoArticles: Article[] = rawDemoArticles.map((article) => ({
  ...article,
  author: demoAuthors.find((author) => author.id === article.author_id) ?? null,
  collection: demoCollections.find((collection) => collection.id === article.collection_id) ?? null,
}));

insert into public.authors (name, slug, bio)
values
  ('Jeremie', 'jeremie', 'Curious photographer, always looking for good coffee and beautiful light.'),
  ('Julie', 'julie', 'Explorer of markets, side streets, and simple places worth sharing.')
on conflict (slug) do update set name = excluded.name, bio = excluded.bio;

insert into public.collections (title, slug, description, cover_image_url, status, layout)
values (
  'Northern Vietnam',
  'northern-vietnam',
  'From Hanoi to the rice terraces of Sapa, a travel journal of mist, street food, and mountains.',
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80',
  'published',
  '[{"id":"seed-layout-hero","type":"hero","data":{"title":"Northern Vietnam","subtitle":"Our itinerary through Hanoi, Ninh Binh, Ha Long, and Sapa.","imageUrl":"https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80","align":"center"}},{"id":"seed-layout-grid","type":"article_grid","data":{"title":"The stops","columns":3}}]'::jsonb
)
on conflict (slug) do update set description = excluded.description, cover_image_url = excluded.cover_image_url, status = excluded.status, layout = excluded.layout;

insert into public.articles (collection_id, author_id, title, slug, excerpt, cover_image_url, status, published_at, position, content)
select c.id, a.id, '48 hours in Hanoi', '48-hours-in-hanoi', 'Our first impressions in the old quarter.', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=1600&q=80', 'published', now(), 1,
  '[{"id":"seed-text","type":"text","data":{"markdown":"## Arriving in the old quarter\n\nHanoi reveals itself through scooters, fruit vendors, and hidden cafes."}},{"id":"seed-tip","type":"tip_card","data":{"icon":"💡","label":"Budget","body":"A street food meal often costs between EUR 1 and 2."}}]'::jsonb
from public.collections c, public.authors a
where c.slug = 'northern-vietnam' and a.slug = 'julie'
on conflict (slug) do nothing;

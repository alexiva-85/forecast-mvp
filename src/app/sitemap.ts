import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPublicMarketSitemapEntries } from "@/lib/markets";
import { getSiteOrigin } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  const supabase = await createClient();
  const markets = await getPublicMarketSitemapEntries(supabase);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: origin,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${origin}/login`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const marketRoutes: MetadataRoute.Sitemap = markets.map((m) => ({
    url: `${origin}/market/${m.slug}`,
    lastModified: m.updated_at,
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...marketRoutes];
}

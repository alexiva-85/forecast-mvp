import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/portfolio",
        "/profile",
        "/login",
        "/auth/",
        "/sentry-example-page",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}

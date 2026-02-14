import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/settings", "/favorites", "/teams/", "/lists/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

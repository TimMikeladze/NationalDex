import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nationaldex.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/settings", "/favorites", "/teams/", "/lists/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

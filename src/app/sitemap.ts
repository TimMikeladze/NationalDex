import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";
import {
  getAllAbilities,
  getAllItems,
  getAllMoves,
  getAllSpecies,
  getAllTypes,
  toID,
} from "@/lib/pkmn";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/comparison`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/whos-that-pokemon`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/moves`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/abilities`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/items`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/types`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/locations`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  const pokemonPages: MetadataRoute.Sitemap = getAllSpecies(9, {
    includeFormes: true,
  }).map((s) => ({
    url: `${baseUrl}/pokemon/${toID(s.name)}`,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const movePages: MetadataRoute.Sitemap = getAllMoves().map((m) => ({
    url: `${baseUrl}/moves/${toID(m.name)}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const abilityPages: MetadataRoute.Sitemap = getAllAbilities().map((a) => ({
    url: `${baseUrl}/abilities/${toID(a.name)}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const itemPages: MetadataRoute.Sitemap = getAllItems().map((i) => ({
    url: `${baseUrl}/items/${toID(i.name)}`,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  const typePages: MetadataRoute.Sitemap = getAllTypes().map((t) => ({
    url: `${baseUrl}/types/${toID(t.name)}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...pokemonPages,
    ...movePages,
    ...abilityPages,
    ...itemPages,
    ...typePages,
  ];
}

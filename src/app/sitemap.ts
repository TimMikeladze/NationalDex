import type { MetadataRoute } from "next";
import {
  getAllAbilities,
  getAllItems,
  getAllMoves,
  getAllSpecies,
  getAllTypes,
  toID,
} from "@/lib/pkmn";
import { getAllRegions } from "@/lib/pokeapi";
import { getTcgSeriesWithSets } from "@/lib/tcg";
import { SITE_URL } from "@/lib/utils";

/**
 * `lastModified` is the build time rather than a per-page date: the dex data
 * only changes when the app is rebuilt, so that is exactly when any of these
 * pages can have changed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const lastModified = new Date();

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
      url: `${baseUrl}/types`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/cards`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cards/sets`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/locations`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/feedback`,
      changeFrequency: "monthly",
      priority: 0.2,
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

  // Card sets and locations come from external catalogues. A failure there must
  // not take the whole sitemap down with it, so each falls back to nothing.
  const series = await getTcgSeriesWithSets().catch(() => []);
  const cardSetPages: MetadataRoute.Sitemap = series
    .flatMap((serie) => serie.sets ?? [])
    .map((set) => ({
      url: `${baseUrl}/cards/sets/${set.id.toLowerCase()}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  const regions = await getAllRegions().catch(() => []);
  const locationPages: MetadataRoute.Sitemap = regions
    .flatMap((region) => region.locations)
    .map((location) => ({
      url: `${baseUrl}/locations/${location.name}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    }));

  return [
    ...staticPages,
    ...pokemonPages,
    ...movePages,
    ...abilityPages,
    ...itemPages,
    ...typePages,
    ...cardSetPages,
    ...locationPages,
  ].map((entry) => ({ lastModified, ...entry }));
}

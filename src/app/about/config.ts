import type { LucideIcon } from "lucide-react";
import {
  Database,
  Download,
  GitCompareArrows,
  Github,
  Heart,
  HelpCircle,
  ListChecks,
  MapPin,
  Moon,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Twitter,
  Users,
  Zap,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { Butterfly } from "@/components/icons/bluesky";

type IconComponent =
  | LucideIcon
  | ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export interface HeroConfig {
  title: string;
  tagline: string;
  description: string;
  cta?: {
    label: string;
    href: string;
  };
}

export interface FeatureConfig {
  icon: IconComponent;
  title: string;
  description: string;
  accent?: string;
}

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface DataSource {
  label: string;
  href: string;
  description?: string;
}

export interface ContactLink {
  label: string;
  href: string;
  icon: IconComponent;
}

export interface AboutPageConfig {
  hero: HeroConfig;
  features: FeatureConfig[];
  footerLinks: FooterLink[];
  contact: {
    title: string;
    handle: string;
    handleHref: string;
    links: ContactLink[];
  };
  attribution: {
    dataSources: DataSource[];
    spriteSources: DataSource[];
    disclaimer: string;
  };
}

export const aboutConfig: AboutPageConfig = {
  hero: {
    title: "NationalDex",
    tagline: "The Pokedex App",
    description:
      "A fast, beautiful, and feature-rich Pokedex built for trainers who want instant access to everything Pokemon.",
    cta: {
      label: "Explore the Dex",
      href: "/",
    },
  },

  features: [
    {
      icon: Search,
      title: "Instant Search",
      description:
        "Find any Pokemon, move, ability, or item in milliseconds with smart search.",
      accent: "#6366f1",
    },
    {
      icon: Heart,
      title: "Favorites",
      description:
        "Save your favorite Pokemon for quick access anytime, anywhere.",
      accent: "#ec4899",
    },
    {
      icon: Users,
      title: "Team Builder",
      description:
        "Build and manage your dream teams with type coverage analysis and Showdown import/export.",
      accent: "#14b8a6",
    },
    {
      icon: GitCompareArrows,
      title: "Compare Pokemon",
      description:
        "Side-by-side stat comparisons to find the perfect fit for your team.",
      accent: "#f97316",
    },
    {
      icon: MapPin,
      title: "Locations",
      description:
        "Discover where to find Pokemon across all regions and games.",
      accent: "#22c55e",
    },
    {
      icon: Moon,
      title: "Dark Mode",
      description: "Easy on the eyes with automatic light and dark themes.",
      accent: "#8b5cf6",
    },
    {
      icon: Smartphone,
      title: "Install as App",
      description:
        "Add to your home screen for a native app experience on any device.",
      accent: "#06b6d4",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed with instant navigation.",
      accent: "#eab308",
    },
    {
      icon: Sparkles,
      title: "Every Sprite Sheet",
      description:
        "Swap between Gen 1 through Gen 9 sprites — Red/Blue, Crystal, Emerald, HeartGold, animated Black/White and X/Y, Scarlet/Violet, HOME renders and more.",
      accent: "#f43f5e",
    },
    {
      icon: HelpCircle,
      title: "Who's That Pokemon?",
      description:
        "Test your knowledge with a silhouette quiz featuring difficulty levels, streaks, and scoring.",
      accent: "#a855f7",
    },
    {
      icon: ListChecks,
      title: "Custom Lists",
      description:
        "Create and organize themed Pokemon lists beyond just favorites.",
      accent: "#0ea5e9",
    },
    {
      icon: Shield,
      title: "Type Chart",
      description:
        "Explore type effectiveness matchups and find Pokemon or moves by type.",
      accent: "#ef4444",
    },
    {
      icon: Download,
      title: "Data Backup",
      description:
        "Export and import all your data — favorites, teams, lists, and settings.",
      accent: "#10b981",
    },
    {
      icon: Database,
      title: "Complete Data",
      description:
        "Full Pokedex with stats, moves, abilities, evolutions, and more.",
      accent: "#64748b",
    },
  ],

  footerLinks: [
    { label: "Feedback", href: "/feedback" },
    { label: "Settings", href: "/settings" },
    {
      label: "GitHub",
      href: "https://github.com/TimMikeladze/nationaldex",
      external: true,
    },
  ],

  contact: {
    title: "built by",
    handle: "@linesofcode",
    handleHref: "https://linesofcode.dev",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/TimMikeladze",
        icon: Github,
      },
      {
        label: "Twitter",
        href: "https://twitter.com/linesofcode",
        icon: Twitter,
      },
      {
        label: "Bluesky",
        href: "https://bsky.app/profile/linesofcode.bsky.social",
        icon: Butterfly,
      },
    ],
  },

  attribution: {
    dataSources: [
      {
        label: "PokeAPI",
        href: "https://github.com/PokeAPI/pokeapi",
        description: "Pokemon data and game information",
      },
      {
        label: "pkmn/ps",
        href: "https://github.com/pkmn/ps",
        description: "Dex, learnsets and competitive data",
      },
    ],
    spriteSources: [
      {
        label: "Pokemon Showdown",
        href: "https://play.pokemonshowdown.com/sprites/",
        description: "Gen 1-6 game sprites, dex art, items and type icons",
      },
      {
        label: "@pkmn/img",
        href: "https://github.com/pkmn/ps/tree/main/img",
        description: "Sprite URL resolution and per-generation fallbacks",
      },
      {
        label: "PokemonDB",
        href: "https://pokemondb.net/sprites",
        description:
          "Platinum, X/Y, Sword/Shield, Scarlet/Violet, HOME renders and official artwork",
      },
      {
        label: "PokeAPI Sprites",
        href: "https://github.com/PokeAPI/sprites",
        description: "Fallback sprites and official artwork by dex number",
      },
      {
        label: "Smogon Sprite Project",
        href: "https://smogon.com/forums/threads/3647722/",
        description: "Community-made sprites for forms the games never drew",
      },
    ],
    disclaimer:
      "MIT Licensed · Pokemon is a trademark of Nintendo / Creatures Inc. / GAME FREAK Inc. This project is not affiliated with or endorsed by any of these companies.",
  },
};

import type { LucideIcon } from "lucide-react";
import {
  Database,
  Download,
  Gamepad2,
  GitCompareArrows,
  Github,
  Heart,
  HelpCircle,
  Layers,
  Library,
  ListChecks,
  MapPin,
  Moon,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Twitter,
  Users,
  WalletCards,
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
    /** Where card scans, symbols and prices come from. */
    cardSources: DataSource[];
    /** What a visitor should know about the card artwork and prices shown. */
    cardNotes: string[];
    disclaimer: string;
  };
}

export const aboutConfig: AboutPageConfig = {
  hero: {
    title: "NationalDex",
    tagline: "The Pokedex App",
    description:
      "A fast, beautiful, and feature-rich Pokedex built for trainers who want instant access to everything Pokemon — games and trading cards alike.",
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
        "Find any Pokemon, move, ability, item — or trading card — in milliseconds with smart search.",
      accent: "#6366f1",
    },
    {
      icon: Heart,
      title: "Favorites",
      description:
        "Save favorite Pokemon and trading cards for quick access anytime, anywhere.",
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
      icon: Gamepad2,
      title: "Play by Game",
      description:
        "Lock the dex to a single game — stats, learnsets, sprites and availability all follow the generation you picked.",
      accent: "#3b82f6",
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
      icon: Library,
      title: "Card Sets",
      description:
        "Every set from both games, newest first — expansion symbols, release dates and full card checklists.",
      accent: "#f59e0b",
    },
    {
      icon: Layers,
      title: "Trading Cards",
      description:
        "Browse every card from the Pokemon TCG and TCG Pocket. Browsing opens on the newest sets, with the whole catalogue one tap away. Filter by set, energy type, rarity, HP, stage, regulation mark, illustrator or printing, sort however you like, hold any card up full size and walk the results with the arrow keys, favorite cards, and jump between a card and the Pokemon it depicts.",
      accent: "#0ea5e9",
    },
    {
      icon: WalletCards,
      title: "Swipe Through Cards",
      description:
        "Deal the same search one card at a time. Swipe right to favorite, left to pass, up to file it in a list — or use the arrow keys.",
      accent: "#d946ef",
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
        "Export and import all your data — favorite Pokemon and cards, teams, lists, and settings.",
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
    cardSources: [
      {
        label: "TCGdex",
        href: "https://tcgdex.dev",
        description:
          "Card data, card scans, set logos and expansion symbols for the Pokemon TCG and TCG Pocket, in every catalogue language",
      },
      {
        label: "Bulbagarden Archives",
        href: "https://archives.bulbagarden.net/wiki/Category:Energy_symbols",
        description: "Energy type symbols used in attack costs and type badges",
      },
      {
        label: "TCGplayer",
        href: "https://www.tcgplayer.com",
        description: "Market prices per printing, in USD, by way of TCGdex",
      },
      {
        label: "Cardmarket",
        href: "https://www.cardmarket.com",
        description:
          "Average prices per printing, in EUR, used where TCGplayer has none",
      },
    ],
    cardNotes: [
      "Card scans, artwork, set logos and expansion symbols are the property of The Pokemon Company, Nintendo, Creatures Inc. and GAME FREAK Inc., and of the illustrators who drew them. They are shown here for identification and reference only. Every card's page credits its illustrator by name.",
      "Not every card has a scan on file — promos especially. Where TCGdex has no image, the card is drawn as a stand-in printed with its number, name and set.",
      "Prices are the last figures TCGdex read from the market sites. They are a rough guide to what a printing trades for, not an appraisal, an offer, or a price this site can sell you a card at.",
      "Each language is its own catalogue rather than a translation: Japanese prints sets English never got, and card numbering follows the language you are browsing.",
    ],
    disclaimer:
      "MIT Licensed · Pokemon is a trademark of Nintendo / Creatures Inc. / GAME FREAK Inc. This project is not affiliated with or endorsed by any of these companies.",
  },
};

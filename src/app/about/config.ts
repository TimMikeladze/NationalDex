import type { LucideIcon } from "lucide-react";
import { Github, Linkedin, Twitter } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { Butterfly } from "@/components/icons/bluesky";

type IconComponent =
  | LucideIcon
  | ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

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
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/tim-mikeladze/",
        icon: Linkedin,
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

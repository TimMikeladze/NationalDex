"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type {
  AboutPageConfig,
  FeatureConfig,
  FooterLink,
  HeroConfig,
  StatConfig,
} from "./config";
import { aboutConfig } from "./config";

function HeroSection({ hero }: { hero: HeroConfig }) {
  return (
    <section className="space-y-4 text-center py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        {hero.title}
      </h1>
      <p className="text-sm md:text-base text-muted-foreground font-medium">
        {hero.tagline}
      </p>
      <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto">
        {hero.description}
      </p>
    </section>
  );
}

function StatsSection({ stats }: { stats: StatConfig[] }) {
  return (
    <section className="py-6 border-y">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-xl md:text-2xl font-semibold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: FeatureConfig }) {
  const Icon = feature.icon;
  return (
    <div className="flex items-start gap-3 p-4 border hover:bg-muted/50 transition-colors">
      <Icon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{feature.title}</p>
        <p className="text-xs text-muted-foreground">{feature.description}</p>
      </div>
    </div>
  );
}

function FeaturesSection({ features }: { features: FeatureConfig[] }) {
  return (
    <section className="space-y-4">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        Features
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </div>
    </section>
  );
}

function FooterLinksSection({ links }: { links: FooterLink[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {links.map((link) =>
        link.external ? (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            {link.label}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <Link
            key={link.label}
            href={link.href}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {link.label}
          </Link>
        ),
      )}
    </div>
  );
}

function AttributionSection({
  attribution,
}: {
  attribution: AboutPageConfig["attribution"];
}) {
  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <p>
        data:{" "}
        <a
          href={attribution.dataSource.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {attribution.dataSource.label}
        </a>
      </p>
      <p>{attribution.disclaimer}</p>
    </div>
  );
}

function FooterSection({
  links,
  attribution,
}: {
  links: FooterLink[];
  attribution: AboutPageConfig["attribution"];
}) {
  return (
    <section className="pt-8 border-t space-y-4">
      <FooterLinksSection links={links} />
      <AttributionSection attribution={attribution} />
    </section>
  );
}

export default function AboutPage() {
  const { hero, features, stats, footerLinks, attribution } = aboutConfig;

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <HeroSection hero={hero} />
        <StatsSection stats={stats} />
        <FeaturesSection features={features} />
        <FooterSection links={footerLinks} attribution={attribution} />
      </div>
    </div>
  );
}

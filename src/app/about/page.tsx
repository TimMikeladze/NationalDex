"use client";

import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { FeatureConfig, FooterLink } from "./config";
import { aboutConfig } from "./config";

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary gradient orb */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-transparent blur-3xl animate-pulse" />
      {/* Secondary orb */}
      <div className="absolute top-1/3 -left-20 w-60 h-60 bg-gradient-to-tr from-indigo-500/8 via-cyan-500/8 to-transparent blur-3xl" />
      {/* Bottom accent */}
      <div className="absolute -bottom-20 right-1/4 w-72 h-72 bg-gradient-to-t from-amber-500/6 via-rose-500/6 to-transparent blur-3xl" />
    </div>
  );
}

function GridPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

function HeroSection() {
  const { hero } = aboutConfig;

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 py-20">
      <FloatingOrbs />
      <GridPattern />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
        {/* Logo mark */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 border border-foreground/10 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-foreground/80 to-foreground/40" />
            </div>
            <div className="absolute -inset-4 border border-foreground/5" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter">
            {hero.title}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium tracking-tight">
            {hero.tagline}
          </p>
        </div>

        {/* Description */}
        <p className="text-base text-muted-foreground/70 max-w-xl mx-auto leading-relaxed">
          {hero.description}
        </p>

        {/* CTA */}
        {hero.cta && (
          <div className="pt-4">
            <Link
              href={hero.cta.href}
              className="group inline-flex items-center gap-3 px-8 py-4 text-sm font-medium border border-foreground/20 hover:bg-foreground hover:text-background transition-all duration-300"
            >
              {hero.cta.label}
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}

        {/* Scroll indicator */}
        <div className="pt-12 flex justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
            <span className="text-[10px] uppercase tracking-[0.3em]">
              Explore
            </span>
            <div className="w-px h-8 bg-gradient-to-b from-foreground/20 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

function BentoFeatureCard({
  feature,
  className = "",
  size = "default",
}: {
  feature: FeatureConfig;
  className?: string;
  size?: "default" | "large" | "wide";
}) {
  const Icon = feature.icon;

  const sizeClasses = {
    default: "p-6",
    large: "p-8 md:row-span-2",
    wide: "p-6 md:col-span-2",
  };

  return (
    <div
      className={`group relative border border-foreground/[0.06] hover:border-foreground/[0.12] bg-foreground/[0.01] hover:bg-foreground/[0.03] transition-all duration-500 ${sizeClasses[size]} ${className}`}
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-0 w-full h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(to right, transparent, ${feature.accent}40, transparent)`,
        }}
      />

      <div
        className={`flex flex-col h-full ${size === "large" ? "justify-between" : "gap-4"}`}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 flex items-center justify-center border transition-colors duration-500"
          style={{
            borderColor: `${feature.accent}20`,
            backgroundColor: `${feature.accent}08`,
          }}
        >
          <Icon
            className="size-5 transition-colors duration-500"
            style={{ color: feature.accent }}
          />
        </div>

        {/* Content */}
        <div className={`space-y-2 ${size === "large" ? "mt-auto" : ""}`}>
          <h3 className="text-base font-medium tracking-tight">
            {feature.title}
          </h3>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const { features } = aboutConfig;

  // Arrange features in a visually interesting bento layout
  const layoutPattern = [
    "large", // Search
    "default", // Favorites
    "default", // Team Builder
    "wide", // Compare
    "default", // Locations
    "default", // Dark Mode
    "default", // Install
    "large", // Lightning Fast
    "default", // Animated Sprites
    "wide", // Complete Data
  ] as const;

  return (
    <section className="relative px-6 py-20">
      {/* Section header */}
      <div className="max-w-5xl mx-auto mb-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.3em]">
            Everything you need
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        </div>
      </div>

      {/* Bento grid */}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {features.map((feature, i) => (
            <BentoFeatureCard
              key={feature.title}
              feature={feature}
              size={layoutPattern[i] || "default"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function VisualDivider() {
  return (
    <div className="relative py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center gap-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-foreground/10" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-1 bg-foreground/20"
                style={{ opacity: 1 - i * 0.3 }}
              />
            ))}
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-foreground/10" />
        </div>
      </div>
    </div>
  );
}

function FooterLinksSection({ links }: { links: FooterLink[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-8">
      {links.map((link) =>
        link.external ? (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group text-sm text-muted-foreground/50 hover:text-foreground transition-colors duration-300 inline-flex items-center gap-2"
          >
            {link.label}
            <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ) : (
          <Link
            key={link.label}
            href={link.href}
            className="text-sm text-muted-foreground/50 hover:text-foreground transition-colors duration-300"
          >
            {link.label}
          </Link>
        ),
      )}
    </div>
  );
}

function FooterSection() {
  const { footerLinks, attribution } = aboutConfig;

  return (
    <footer className="relative px-6 py-16">
      <div className="max-w-5xl mx-auto space-y-12">
        <FooterLinksSection links={footerLinks} />

        {/* Attribution */}
        <div className="text-center space-y-3">
          <p className="text-xs text-muted-foreground/30">
            data via{" "}
            <a
              href={attribution.dataSource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-muted-foreground/50 transition-colors"
            >
              {attribution.dataSource.label}
            </a>
          </p>
          <p className="text-[10px] text-muted-foreground/20">
            {attribution.disclaimer}
          </p>
        </div>

        {/* Bottom accent */}
        <div className="flex justify-center">
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
        </div>
      </div>
    </footer>
  );
}

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroSection />
      <VisualDivider />
      <FeaturesSection />
      <FooterSection />
    </div>
  );
}

"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BuiltBy } from "@/components/built-by";
import { cn } from "@/lib/utils";
import type { DataSource, FeatureConfig, FooterLink } from "./config";
import { aboutConfig } from "./config";

const WIDE_INDICES = new Set([3, 6]);

function Hero() {
  const { hero } = aboutConfig;

  return (
    <section className="px-6 pt-20 pb-12 md:pt-28 md:pb-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em] mb-8 font-medium">
          v0.1.0
        </div>

        <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter mb-6">
          {hero.title}
        </h1>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-muted-foreground/30 select-none">{">"}</span>
          <p className="text-lg md:text-xl text-muted-foreground">
            {hero.tagline}
            <span className="inline-block w-[2px] h-[1.1em] bg-foreground/50 ml-1 align-text-bottom animate-pulse" />
          </p>
        </div>

        <p className="text-sm text-muted-foreground/60 max-w-md leading-relaxed mb-10">
          {hero.description}
        </p>

        {hero.cta && (
          <Link
            href={hero.cta.href}
            className="group inline-flex items-center gap-3 bg-foreground text-background px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {hero.cta.label}
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  isWide,
}: {
  feature: FeatureConfig;
  isWide: boolean;
}) {
  const Icon = feature.icon;

  return (
    <div
      className={cn(
        "group relative border border-foreground/[0.06] bg-background p-5 md:p-6 transition-colors hover:border-foreground/[0.12] hover:bg-muted/20",
        isWide && "md:col-span-2",
      )}
    >
      <div
        className="absolute left-0 top-0 w-[2px] h-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: feature.accent }}
      />
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5" style={{ color: feature.accent }}>
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-1.5">{feature.title}</h3>
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function Features() {
  const { features } = aboutConfig;

  return (
    <section className="px-6 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em] mb-8 font-medium">
          Features
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {features.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              isWide={WIDE_INDICES.has(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <BuiltBy />
      </div>
    </section>
  );
}

function Footer() {
  const { footerLinks, attribution } = aboutConfig;

  return (
    <footer className="px-6 py-10 mt-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground/50 mb-8">
          {footerLinks.map((link: FooterLink) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
          data via{" "}
          {attribution.dataSources.map((source: DataSource, index: number) => (
            <span key={source.label}>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-muted-foreground/70"
              >
                {source.label}
              </a>
              {index < attribution.dataSources.length - 1 && " & "}
            </span>
          ))}
          {" · "}
          {attribution.disclaimer}
        </p>
      </div>
    </footer>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <Contact />
      <Footer />
    </div>
  );
}

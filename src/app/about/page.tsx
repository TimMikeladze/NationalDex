"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { DataSource, FeatureConfig, FooterLink } from "./config";
import { BuiltBy } from "@/components/built-by";
import { aboutConfig } from "./config";

function HeroSection() {
  const { hero } = aboutConfig;

  return (
    <section className="px-6 pt-16 pb-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          {hero.title}
        </h1>
        <p className="text-muted-foreground mb-6">{hero.tagline}</p>
        <p className="text-sm text-muted-foreground/80 mb-8 max-w-lg">
          {hero.description}
        </p>
        {hero.cta && (
          <Link
            href={hero.cta.href}
            className="group inline-flex items-center gap-2 text-sm font-medium hover:text-muted-foreground transition-colors"
          >
            {hero.cta.label}
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
    </section>
  );
}

function FeatureItem({ feature }: { feature: FeatureConfig }) {
  const Icon = feature.icon;

  return (
    <div className="group flex gap-3 py-3 border-b border-foreground/[0.04] last:border-0">
      <Icon
        className="size-4 mt-0.5 shrink-0"
        style={{ color: feature.accent }}
      />
      <div className="min-w-0">
        <h3 className="text-sm font-medium">{feature.title}</h3>
        <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const { features } = aboutConfig;
  const mid = Math.ceil(features.length / 2);
  const leftColumn = features.slice(0, mid);
  const rightColumn = features.slice(mid);

  return (
    <section className="px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-4">
          Features
        </p>
        <div className="grid md:grid-cols-2 gap-x-8">
          <div>
            {leftColumn.map((feature) => (
              <FeatureItem key={feature.title} feature={feature} />
            ))}
          </div>
          <div>
            {rightColumn.map((feature) => (
              <FeatureItem key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <BuiltBy />
      </div>
    </section>
  );
}

function FooterSection() {
  const { footerLinks, attribution } = aboutConfig;

  return (
    <footer className="px-6 py-8 mt-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground/60 mb-6">
          {footerLinks.map((link: FooterLink) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-muted-foreground transition-colors"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/50">
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
      <HeroSection />
      <FeaturesSection />
      <ContactSection />
      <FooterSection />
    </div>
  );
}

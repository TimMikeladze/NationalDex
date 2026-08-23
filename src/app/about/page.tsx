"use client";

import Link from "next/link";
import type { ContactLink, DataSource, FooterLink } from "./config";
import { aboutConfig } from "./config";

/** One labelled list of who a part of the app is built on. */
function CreditGroup({
  label,
  sources,
}: {
  label: string;
  sources: DataSource[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs md:text-sm text-muted-foreground/70 uppercase tracking-wider">
        {label}
      </p>
      <dl className="space-y-3 text-sm md:text-base text-muted-foreground/70 leading-relaxed">
        {sources.map((source: DataSource) => (
          <div key={source.label} className="flex flex-wrap gap-x-2 gap-y-0.5">
            <dt className="shrink-0">
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {source.label}
              </a>
            </dt>
            <dd className="text-muted-foreground/60">{source.description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function AboutPage() {
  const { footerLinks, attribution, contact } = aboutConfig;

  return (
    <div className="min-h-full px-6 py-12 md:py-20">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-5">
            <span className="text-base md:text-lg text-muted-foreground/80">
              {contact.title}{" "}
              <a
                href={contact.handleHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {contact.handle}
              </a>
            </span>
            <div className="flex items-center gap-4">
              {contact.links.map((link: ContactLink) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground/70 hover:text-foreground transition-colors"
                    aria-label={link.label}
                  >
                    <Icon className="size-5" />
                  </a>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-base md:text-lg text-muted-foreground/80">
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
        </div>

        <div className="space-y-10">
          <CreditGroup
            label="data and sprites"
            sources={[...attribution.dataSources, ...attribution.spriteSources]}
          />

          {/* Card scans are somebody else's artwork, so where they come from
              and what may be done with them is spelled out rather than filed
              under a one-line credit. */}
          <div className="space-y-5">
            <CreditGroup
              label="trading cards"
              sources={attribution.cardSources}
            />
            <div className="space-y-4">
              {attribution.cardNotes.map((note: string) => (
                <p
                  key={note}
                  className="text-sm md:text-base text-muted-foreground/60 leading-relaxed"
                >
                  {note}
                </p>
              ))}
            </div>
          </div>

          <p className="text-sm md:text-base text-muted-foreground/60 leading-relaxed">
            {attribution.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}

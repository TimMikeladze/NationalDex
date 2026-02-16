"use client";

import { ExternalLink, Github, Mail } from "lucide-react";

export default function FeedbackPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="space-y-8">
        <section className="space-y-3">
          <h1 className="text-lg font-medium">Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Have a suggestion, found a bug, or want to request a feature? We'd
            love to hear from you.
          </p>
        </section>

        <section className="space-y-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            Get in Touch
          </p>

          <div className="space-y-3">
            <a
              href="https://github.com/yourusername/nationaldex/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Github className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">GitHub Issues</p>
                <p className="text-xs text-muted-foreground">
                  Report bugs or request features
                </p>
              </div>
              <ExternalLink className="size-4 text-muted-foreground shrink-0" />
            </a>

            <a
              href="mailto:Tim.Mikeladze@gmail.com"
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Mail className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">
                  Send us a message directly
                </p>
              </div>
              <ExternalLink className="size-4 text-muted-foreground shrink-0" />
            </a>
          </div>
        </section>

        <section className="space-y-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            What to Include
          </p>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>When reporting a bug, please include:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>What you were trying to do</li>
              <li>What happened instead</li>
              <li>Your device and browser</li>
              <li>Screenshots if possible</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

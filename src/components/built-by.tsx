import { aboutConfig, type ContactLink } from "@/app/about/config";

export function BuiltBy() {
  const { contact } = aboutConfig;

  return (
    <div className="border border-foreground/[0.06] rounded-lg p-5 bg-muted/30">
      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-4">
        {contact.title}
      </p>
      <div className="flex flex-wrap gap-4">
        {contact.links.map((link: ContactLink) => {
          const Icon = link.icon;
          return (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              <Icon className="size-4" />
              {link.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

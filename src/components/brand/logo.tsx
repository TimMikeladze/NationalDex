import { cn } from "@/lib/utils";

type LogoProps = {
  showLabel?: boolean;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  iconSrc?: string;
};

/** The NationalDex mark, shared by the app chrome and PWA loading surface. */
export function Logo({
  showLabel = true,
  className,
  iconClassName,
  labelClassName,
  iconSrc = "/icons/logo-app.svg",
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* biome-ignore lint/performance/noImgElement: the mark is a tiny local SVG used as shared brand chrome */}
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className={cn("size-7 shrink-0", iconClassName)}
      />
      {showLabel && (
        <span className={cn("font-medium tracking-tight", labelClassName)}>
          NationalDex.app
        </span>
      )}
    </span>
  );
}

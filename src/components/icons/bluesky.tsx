import type { SVGProps } from "react";

export function Butterfly({
  className,
  ...props
}: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Bluesky"
      {...props}
    >
      <path d="M12 21c-2-3-8-6-8-10a4 4 0 0 1 7.5-2 .5.5 0 0 0 1 0A4 4 0 0 1 20 11c0 4-6 7-8 10Z" />
      <path d="M12 14v7" />
    </svg>
  );
}

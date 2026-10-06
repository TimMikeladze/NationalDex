"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type {
  ComponentProps,
  FocusEvent,
  PointerEvent,
  TouchEvent,
} from "react";

type Props = ComponentProps<typeof NextLink>;

/**
 * `next/link` that prefetches on intent (hover, touch, focus) instead of when
 * the link scrolls into view. Viewport prefetching made every list page fetch
 * every row's route; see docs/prefetch.md. Pass `prefetch` to opt back in.
 */
export default function Link({
  prefetch,
  onPointerEnter,
  onTouchStart,
  onFocus,
  ...props
}: Props) {
  const router = useRouter();
  if (prefetch !== undefined) {
    return (
      <NextLink
        prefetch={prefetch}
        onPointerEnter={onPointerEnter}
        onTouchStart={onTouchStart}
        onFocus={onFocus}
        {...props}
      />
    );
  }
  const warm = () => {
    if (typeof props.href === "string" && props.href.startsWith("/")) {
      router.prefetch(props.href);
    }
  };
  return (
    <NextLink
      prefetch={false}
      onPointerEnter={(e: PointerEvent<HTMLAnchorElement>) => {
        warm();
        onPointerEnter?.(e);
      }}
      onTouchStart={(e: TouchEvent<HTMLAnchorElement>) => {
        warm();
        onTouchStart?.(e);
      }}
      onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
        warm();
        onFocus?.(e);
      }}
      {...props}
    />
  );
}

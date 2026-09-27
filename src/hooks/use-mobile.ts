import * as React from "react";

/**
 * A phone: narrow, or a short touch screen — a phone on its side is still a
 * phone. Mirrors the `max-lg` short-screen rule in globals.css so JS and CSS
 * agree on what a phone is.
 */
export const PHONE_QUERY =
  "(max-width: 767px), (max-height: 500px) and (pointer: coarse)";

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

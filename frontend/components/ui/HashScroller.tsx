"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToHashWhenReady } from "@/lib/anchor";

/**
 * Puts the reader in the right place after a link to an anchor on another
 * page.
 *
 * The router moves to the anchor by itself, but it forgets the sticky
 * header, so the section would land under it. This puts it back where it
 * belongs.
 *
 * The section is not always on the screen when the router says the page has
 * changed, because the page waits for live data before it is finished. So
 * this waits for the section instead of giving up on it.
 */
export function HashScroller() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    // The router does a scroll of its own. This one comes after it and puts
    // the section clear of the header.
    const timer = window.setTimeout(() => scrollToHashWhenReady(hash), 80);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}

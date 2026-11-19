"use client";

import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { scrollToSection } from "@/lib/anchor";

/**
 * A link to a section of the one page.
 *
 * The whole site is a single page now, so choosing an item in the bar moves
 * the reader down to that section instead of opening another page.
 *
 * The section sits under the sticky header, so the reader has to be put just
 * below it. The router moves to an anchor by itself, but it forgets the
 * header, so the scroll is done here.
 *
 * The click is only taken over for a plain left click. A click with a
 * modifier key is left to the browser, so the section can still be opened in
 * a new tab.
 */
export function SectionLink({
  id,
  className,
  children,
  ...rest
}: {
  /** The id of the section on the page. */
  id: string;
  className?: string;
  children: ReactNode;
} & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "id" | "className" | "children"
>) {
  const router = useRouter();

  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      // The browser opens the section in a new tab. Nothing to take over.
      return;
    }

    const target = document.getElementById(id);
    if (!target) {
      // The section is not on the page. The browser knows what to do.
      return;
    }

    event.preventDefault();
    scrollToSection(target);

    // The address bar has to follow the reader, but the router must stay in
    // step with it and must not take the scroll over. Writing to the history
    // by hand does not keep the router in step, so the router does the work.
    //
    // The query is carried over, so a choice that is kept in the address is
    // not lost when another section is chosen.
    const path = window.location.pathname;
    const search = window.location.search;
    router.replace(`${path}${search}#${id}`, { scroll: false });

    // A hash change can still make the router scroll on its own, and that
    // scroll puts the section under the header. This one comes after it and
    // puts it back where it belongs.
    window.setTimeout(() => {
      if (window.location.hash !== `#${id}`) return;
      const header = document.querySelector("header");
      const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
      if (target.getBoundingClientRect().top >= headerBottom - 1) return;
      scrollToSection(target);
    }, 80);
  }

  return (
    <a href={`/#${id}`} onClick={open} className={className} {...rest}>
      {children}
    </a>
  );
}

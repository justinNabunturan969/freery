"use client";

import { useEffect, useState } from "react";

/**
 * Works out which section of the page the reader is looking at.
 *
 * The line just under the sticky header is the reading line. The section that
 * owns it is the active one, so the bar can underline it.
 *
 * The measurement waits for a frame, so a fast scroll does not make the page
 * work harder than it has to. The body is watched as well, because a page
 * that is still loading its live data grows afterwards, and that growth moves
 * the sections without a scroll happening.
 */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");

  // The ids are joined into one string, so the effect only runs again when
  // the list of sections really changes.
  const list = ids.join("|");

  useEffect(() => {
    const sections = list ? list.split("|") : [];
    if (sections.length === 0) return;

    let frame = 0;

    function measure() {
      frame = 0;

      const header = document.querySelector("header");
      const line = (header ? header.getBoundingClientRect().bottom : 0) + 24;

      let current = sections[0] ?? "";
      for (const id of sections) {
        const element = document.getElementById(id);
        if (!element) continue;
        // The last section that has started above the reading line is the
        // one the reader is in.
        if (element.getBoundingClientRect().top <= line) current = id;
      }

      setActive((previous) => (previous === current ? previous : current));
    }

    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    }

    measure();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      observer.observe(document.body);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [list]);

  return active;
}

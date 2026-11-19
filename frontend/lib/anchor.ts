/**
 * Moving the reader to a section of the page.
 *
 * The header sticks to the top, so a section has to be put just below it
 * rather than under it. The router moves to an anchor by itself, but it
 * forgets the header, so the scroll is done here.
 */

/** The space left above the section, so the header does not cover it. */
const HEADER_GAP = 8;

/** The height of the sticky header, or zero when there is none. */
function headerHeight(): number {
  const header = document.querySelector("header");
  if (!header) return 0;
  return header.getBoundingClientRect().bottom;
}

/**
 * Scrolls a section into view, clear of the sticky header.
 *
 * A reader who asked for less motion gets there straight away.
 */
export function scrollToSection(target: HTMLElement): void {
  const offset = headerHeight() + HEADER_GAP;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  const reduced =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
}

/**
 * Finds a section by its anchor name and scrolls to it.
 *
 * Returns false when there is no such section on the page.
 */
export function scrollToHash(hash: string): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return false;
  const target = document.getElementById(id);
  if (!target) return false;
  scrollToSection(target);
  return true;
}

/** How long to keep looking for a section that has not shown up yet. */
const LOOK_MS = 5000;

/** How long to keep watching the section once it has been put in place. */
const SETTLE_MS = 1500;

/** How often to look. */
const LOOK_EVERY_MS = 60;

/**
 * Scrolls to an anchor as soon as its section is on the screen, and keeps it
 * there.
 *
 * A page that waits for live data is not finished when the router says the
 * page has changed, so the section can still be missing at that moment. This
 * waits for it instead of giving up.
 *
 * The content above the section can also still grow after the section has
 * been put in place, which would leave it out of sight. So this keeps
 * watching for a moment and puts it back if the page moves it.
 *
 * A reader who scrolls away is left alone, because only the page moving the
 * section brings it back.
 */
export function scrollToHashWhenReady(hash: string): void {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return;

  const foundBy = Date.now() + LOOK_MS;
  let watchUntil = 0;
  let placed: number | null = null;

  const look = () => {
    const target = document.getElementById(id);
    if (!target) {
      if (Date.now() < foundBy) {
        window.setTimeout(look, LOOK_EVERY_MS);
      }
      return;
    }

    if (watchUntil === 0) {
      watchUntil = Date.now() + SETTLE_MS;
    }

    // Where the section sits in the page. This does not change when the
    // reader scrolls, so a reader who moves does not bring it back.
    const where = target.getBoundingClientRect().top + window.scrollY;

    if (placed === null || Math.abs(where - placed) > 1) {
      scrollToSection(target);
      placed = where;
    }

    if (Date.now() < watchUntil) {
      window.setTimeout(look, LOOK_EVERY_MS);
    }
  };

  look();
}

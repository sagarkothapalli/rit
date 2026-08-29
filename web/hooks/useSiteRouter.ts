"use client";

const siteRouter = {
  push(href: string) {
    window.location.assign(href);
  },
};

/** Full-document navigation fallback for programmatic route changes. */
export function useSiteRouter() {
  return siteRouter;
}

import type { ComponentPropsWithoutRef } from "react";

type SiteLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
};

/**
 * Reliable cross-route navigation for the hosted build.
 *
 * ChatGPT Sites serves every application route directly. A normal anchor lets
 * the browser request that route without depending on the framework's RSC
 * prefetch runtime, which is not available in the current hosted bundle.
 */
export default function SiteLink({ href, ...props }: SiteLinkProps) {
  return <a href={href} {...props} />;
}

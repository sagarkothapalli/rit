/* ============================================================
   State Emblem of India — the Lion Capital of Ashoka.

   Rendered from an authoritative vector source (see
   assets/emblem/state-emblem-source.svg) at 1x and 2x of the
   largest on-screen size, so it stays crisp on retina displays
   and under the text-size slider.

   Stored as grayscale+alpha rather than RGBA: the mark is a pure
   white silhouette, so only the alpha channel carries any
   information. That is 5.6 KB for the 1x asset against 146 KB
   for the previous artwork, which was also upscaled and soft.

   Intrinsic aspect ratio is 0.6275 (w/h), preserved exactly by
   deriving the width from the requested height.
   ============================================================ */

const ASPECT = 0.6275;

export default function Emblem({
  className,
  /** Rendered height in px. Width follows the emblem's own proportions. */
  size = 46,
  /** Decorative next to the wordmark; labelled when it stands alone. */
  decorative = true,
}: {
  className?: string;
  size?: number;
  decorative?: boolean;
}) {
  const height = Math.round(size);
  const width = Math.round(height * ASPECT);

  return (
    // A plain <img> rather than next/image: the asset is a 5.6 KB fixed-size
    // mark already emitted at exactly 1x and 2x, and the static-export build
    // runs with images unoptimized, so the loader would add work and no benefit.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={decorative ? "" : "State Emblem of India"}
      aria-hidden={decorative || undefined}
      className={className}
      decoding="async"
      height={height}
      loading="eager"
      src="/emblem/state-emblem-white.png"
      srcSet="/emblem/state-emblem-white.png 1x, /emblem/state-emblem-white@2x.png 2x"
      width={width}
    />
  );
}

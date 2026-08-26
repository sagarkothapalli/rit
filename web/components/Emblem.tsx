export default function Emblem({
  className,
  height,
  width,
}: {
  className?: string;
  height: number;
  width: number;
}) {
  return (
    <img
      alt="State Emblem of India"
      className={className}
      decoding="async"
      height={height}
      src="/india-emblem-white.png"
      width={width}
    />
  );
}

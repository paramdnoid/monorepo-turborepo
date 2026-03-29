"use client";

import { motion, type MotionValue, useTransform } from "framer-motion";
import { memo, type ReactNode, useMemo } from "react";

const TWO_PI = Math.PI * 2;

export function EllipseCarousel({ children, containerHeight }: { children: ReactNode; containerHeight: number }) {
  return <div className="relative w-full" style={{ height: containerHeight }}>{children}</div>;
}

export type DepthConfig = {
  scaleRange: [number, number];
  opacityRange: [number, number];
};

const DEFAULT_DEPTH: DepthConfig = {
  scaleRange: [0.6, 1.0],
  opacityRange: [0.55, 1.0],
};

/** Depth via transform + opacity only (compositor-friendly; no animated filter/box-shadow). */
function computeCardStyles(
  rotation: number,
  angleStep: number,
  index: number,
  radiusX: number,
  radiusY: number,
  depth: DepthConfig,
) {
  const angle = angleStep * index + rotation;
  const cos = Math.cos(angle);
  const t = (1 + cos) / 2;
  return {
    x: Math.sin(angle) * radiusX,
    y: -cos * radiusY,
    scale: depth.scaleRange[0] + t * (depth.scaleRange[1] - depth.scaleRange[0]),
    zIndex: Math.round(t * 100),
    opacity: depth.opacityRange[0] + t * (depth.opacityRange[1] - depth.opacityRange[0]),
  };
}

export const EllipseCard = memo(function EllipseCard({
  index,
  totalCount,
  rotation,
  radiusX,
  radiusY,
  onClick,
  children,
  cardWidth,
  cardHeight,
  depth = DEFAULT_DEPTH,
  ariaLabel,
  isActive = false,
}: {
  index: number;
  totalCount: number;
  rotation: MotionValue<number>;
  radiusX: number;
  radiusY: number;
  onClick: () => void;
  children: ReactNode;
  cardWidth: number;
  cardHeight: number;
  depth?: DepthConfig;
  ariaLabel?: string;
  isActive?: boolean;
}) {
  const angleStep = TWO_PI / totalCount;
  const styles = useTransform(rotation, (r) =>
    computeCardStyles(r, angleStep, index, radiusX, radiusY, depth),
  );
  const x = useTransform(styles, (s) => s.x);
  const y = useTransform(styles, (s) => s.y);
  const scale = useTransform(styles, (s) => s.scale);
  const zIndex = useTransform(styles, (s) => s.zIndex);
  const opacity = useTransform(styles, (s) => s.opacity);

  const staticStyles = useMemo(
    () => ({
      position: "absolute" as const,
      left: "50%",
      top: "50%",
      width: cardWidth,
      marginLeft: -(cardWidth / 2),
      marginTop: -(cardHeight / 2),
      willChange: "transform, opacity",
    }),
    [cardWidth, cardHeight],
  );

  return (
    <motion.button
      type="button"
      style={{ x, y, scale, zIndex, opacity, ...staticStyles }}
      onClick={onClick}
      className="cursor-pointer overflow-hidden rounded-2xl text-left shadow-none ring-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={ariaLabel}
      aria-pressed={isActive}
    >
      {children}
    </motion.button>
  );
});

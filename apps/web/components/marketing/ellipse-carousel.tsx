"use client";

import { motion, type MotionValue, useTransform } from "framer-motion";
import { memo, type ReactNode, useMemo } from "react";

const TWO_PI = Math.PI * 2;

export function EllipseCarousel({ children, containerHeight }: { children: ReactNode; containerHeight: number }) {
  return <div className="relative w-full" style={{ height: containerHeight }}>{children}</div>;
}

export type DepthConfig = {
  scaleRange: [number, number];
  blurMax: number;
  brightnessRange: [number, number];
  opacityRange: [number, number];
  shadowSpreadMax: number;
  shadowAlphaMax: number;
};

const DEFAULT_DEPTH: DepthConfig = {
  scaleRange: [0.6, 1.0],
  blurMax: 2.5,
  brightnessRange: [0.6, 1.0],
  opacityRange: [0.55, 1.0],
  shadowSpreadMax: 30,
  shadowAlphaMax: 0.25,
};

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
  const brightness = depth.brightnessRange[0] + t * (depth.brightnessRange[1] - depth.brightnessRange[0]);
  const blur = (1 - t) * depth.blurMax;
  const spread = Math.round(t * depth.shadowSpreadMax);
  const alpha = (t * depth.shadowAlphaMax).toFixed(2);
  return {
    x: Math.sin(angle) * radiusX,
    y: -cos * radiusY,
    scale: depth.scaleRange[0] + t * (depth.scaleRange[1] - depth.scaleRange[0]),
    zIndex: Math.round(t * 100),
    filter: `brightness(${brightness}) blur(${blur}px)`,
    opacity: depth.opacityRange[0] + t * (depth.opacityRange[1] - depth.opacityRange[0]),
    boxShadow: `0 ${spread}px ${spread * 2}px rgba(0,0,0,${alpha})`,
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
  const filter = useTransform(styles, (s) => s.filter);
  const opacity = useTransform(styles, (s) => s.opacity);
  const boxShadow = useTransform(styles, (s) => s.boxShadow);

  const staticStyles = useMemo(
    () => ({
      position: "absolute" as const,
      left: "50%",
      top: "50%",
      width: cardWidth,
      marginLeft: -(cardWidth / 2),
      marginTop: -(cardHeight / 2),
      willChange: "transform, filter, opacity" as const,
    }),
    [cardWidth, cardHeight],
  );

  return (
    <motion.button
      type="button"
      style={{ x, y, scale, zIndex, filter, opacity, boxShadow, ...staticStyles }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl text-left"
      aria-label={ariaLabel}
      aria-pressed={isActive}
    >
      {children}
    </motion.button>
  );
});

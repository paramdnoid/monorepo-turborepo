"use client";

import dynamic from "next/dynamic";

const FeaturesCarouselDynamic = dynamic(
  () => import("@/components/marketing/features-carousel").then((module) => module.FeaturesCarousel),
  {
    ssr: false,
    loading: () => <div className="h-[250px] sm:h-[274px] md:h-[306px]" aria-hidden />,
  },
);

export function FeaturesCarouselClient() {
  return <FeaturesCarouselDynamic />;
}

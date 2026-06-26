"use client";
import dynamic from "next/dynamic";

const MapWidget = dynamic(() => import("@/components/map/map-widget"), { ssr: false });

export default function MapSection() {
  return <MapWidget />;
}

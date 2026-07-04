"use client";
import dynamic from "next/dynamic";
import type { ProfileSettings } from "@/lib/profile-settings";

const MapWidget = dynamic(() => import("@/components/map/map-widget"), { ssr: false });

export default function MapSection({ profile }: { profile: ProfileSettings }) {
  return (
    <MapWidget
      center={[profile.longitude, profile.latitude]}
      locationLabel={profile.locationLabel}
    />
  );
}

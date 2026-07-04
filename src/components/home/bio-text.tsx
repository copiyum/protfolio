import TextHighlights from "@/components/home/text-highlights";
import type { ProfileSettings } from "@/lib/profile-settings";

export default function BioText({ active = false, profile }: { active?: boolean; profile: ProfileSettings }) {
  return (
    <p className="text-left text-[15px] leading-[1.6] tracking-[-0.01em] text-[color:var(--foreground)]">
      <TextHighlights
        text={profile.bioText}
        highlights={profile.bioHighlights}
        active={active}
        dimOthers={true}
      />
    </p>
  );
}

"use client";
import { useState } from "react";
import Reveal from "@/components/ui/reveal";
import ProfileBlock from "@/components/home/profile-block";
import BioText from "@/components/home/bio-text";

// Owns the avatar-hover "highlight" state shared between ProfileBlock (source)
// and BioText (consumer) — a local lift instead of a global window event bus.
export default function IntroSection() {
  const [active, setActive] = useState(false);

  return (
    <>
      <Reveal delay={120} className="mt-3">
        <ProfileBlock onActiveChange={setActive} />
      </Reveal>
      <Reveal delay={220} className="mt-3">
        <BioText active={active} />
      </Reveal>
    </>
  );
}

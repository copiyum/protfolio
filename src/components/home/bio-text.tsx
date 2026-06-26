import TextHighlights from "@/components/home/text-highlights";

export default function BioText({ active = false }: { active?: boolean }) {
  return (
    <p className="text-left text-[15px] leading-[1.6] tracking-[-0.01em] text-[color:var(--foreground)]">
      <TextHighlights
        text="I'm a software developer. I specialize in clean design and crafting engaging user experiences with great attention to detail."
        highlights={["UI design", "engaging user experiences"]}
        active={active}
        dimOthers={true}
      />
    </p>
  );
}

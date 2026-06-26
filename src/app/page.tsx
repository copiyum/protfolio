import AnimatedStars from "@/components/ui/animated-stars";
import IntroSection from "@/components/home/intro-section";
import TechStack from "@/components/home/tech-stack";
import InteractiveShowcase from "@/components/showcase/interactive-showcase";
import Tag from "@/components/ui/Tag";
import FeaturedProjects from "@/components/home/featured-projects";
import Experience from "@/components/home/experience";
import GithubContributions from "@/components/home/github-contributions";
import SocialLinks from "@/components/home/social-links";
import DrawingCarousel from "@/components/showcase/drawing-carousel";
import MapSection from "@/components/home/map-section";
import Calendar from "@/components/ui/calendar";
import { TypingSimulator } from "@/components/typing";
import Reveal from "@/components/ui/reveal";
import SectionPanel from "@/components/ui/section-panel";

export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <AnimatedStars />

      <MapSection />
      <main className="relative z-10 mx-auto max-w-[550px] px-1">
        <IntroSection />

        {/* Socials — right under the intro */}
        <Reveal delay={300} className="mt-6">
          <SectionPanel label="Elsewhere">
            <SocialLinks />
          </SectionPanel>
        </Reveal>

        <Reveal className="mt-14">
          <TechStack />
        </Reveal>

        {/* Interactive showcase + drawing carousel — golden split, equal heights */}
        <Reveal className="mt-14">
          <div className="w-full mx-auto">
            {/* Tag: UI (above the interactive + drawing container) */}
            <div className="mb-3 flex justify-start">
              <Tag className="uppercase tracking-wide" size="sm" variant="outline">
                UI
              </Tag>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.618fr_1fr] gap-3 items-stretch">
              <InteractiveShowcase />
              <DrawingCarousel />
            </div>
          </div>
        </Reveal>

        {/* Calendar inserted below interactive and drawing elements; matches container width */}
        <Reveal className="mt-14">
          <Calendar />
        </Reveal>

        {/* Typing simulator — monkeytype-style, same centered max width */}
        <Reveal className="mt-14">
          <TypingSimulator />
        </Reveal>

        {/* Experience */}
        <Reveal className="mt-14">
          <SectionPanel label="Experience">
            <Experience />
          </SectionPanel>
        </Reveal>

        {/* Featured projects */}
        <Reveal className="mt-14">
          <SectionPanel label="Featured projects">
            <FeaturedProjects />
          </SectionPanel>
        </Reveal>

        {/* GitHub contributions */}
        <Reveal className="mt-14 mb-20">
          <SectionPanel label="Contributions">
            <GithubContributions />
          </SectionPanel>
        </Reveal>
      </main>
    </div>
  );
}

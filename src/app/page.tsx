import AnimatedStars from "@/components/ui/animated-stars";
import IntroSection from "@/components/home/intro-section";
import BentoBlock from "@/components/home/bento-block";
import TechStack from "@/components/home/tech-stack";
import InteractiveShowcase from "@/components/showcase/interactive-showcase";
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

			<main className="relative z-10 mx-auto max-w-[550px] px-2 pb-20">
				<Reveal className="mt-10">
					<section className="overflow-hidden rounded-[28px] border border-[color:var(--foreground)]/8 bg-[color:var(--foreground)]/[0.018] p-2">
						<MapSection />
						<div className="px-1 pb-2 pt-4">
							<IntroSection />
							<div className="mt-6">
								<SocialLinks />
							</div>
							<div className="mt-6">
								<BentoBlock />
							</div>
						</div>
					</section>
				</Reveal>

				{/* Case-study band — Experience + Featured Projects as one tinted area on the
						white page. Surface swap is via --band-surface (CSS var, overridden under
						.dark); no Tailwind dark: classes (codebase has no @custom-variant). */}
				<div className="mt-[72px] -mx-2 rounded-3xl bg-[color:var(--band-surface)] px-3 py-6 ring-1 ring-[color:var(--foreground)]/8">
					<Reveal>
						<SectionPanel label="Experience">
							<Experience />
						</SectionPanel>
					</Reveal>

					<Reveal className="mt-4">
						<SectionPanel label="Featured Projects">
							<FeaturedProjects />
						</SectionPanel>
					</Reveal>
				</div>

				<Reveal className="mt-[72px]">
					<section className="space-y-5">
						<h2 className="text-xl font-semibold tracking-normal text-[color:var(--foreground)]">
							Playground
						</h2>
						<div className="space-y-4">
							<div className="rounded-[24px] border border-[color:var(--foreground)]/8 bg-[color:var(--foreground)]/[0.018] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.12)]">
								<div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1.7fr_1fr]">
									<InteractiveShowcase />
									<DrawingCarousel />
								</div>
							</div>
							<Calendar />
							<TypingSimulator />
						</div>
					</section>
				</Reveal>

				<Reveal className="mt-[72px]">
					<section className="space-y-5">
						<h2 className="text-xl font-semibold tracking-normal text-[color:var(--foreground)]">
							Stack
						</h2>
						<TechStack />
					</section>
				</Reveal>

				<Reveal className="mt-[72px]">
					<SectionPanel label="Contributions">
						<GithubContributions />
					</SectionPanel>
				</Reveal>
			</main>
		</div>
	);
}

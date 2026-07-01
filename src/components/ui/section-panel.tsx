import type { ReactNode } from "react";

export default function SectionPanel({
	label,
	children,
	className = "",
}: {
	label: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={`space-y-4 ${className}`}>
			<h2 className="text-xl font-semibold tracking-normal text-[color:var(--foreground)]">
				{label}
			</h2>
			<div className="overflow-hidden rounded-2xl border border-[color:var(--foreground)]/8 bg-[color:var(--foreground)]/[0.018]">
				{children}
			</div>
		</section>
	);
}

import VisitorsBoard from "@/components/visitors/VisitorsBoard";
import AnimatedStars from "@/components/ui/animated-stars";

export default function VisitorsPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <AnimatedStars />
      
      <div className="relative z-10 mx-auto max-w-[550px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Visitors</h1>
          <p className="text-neutral-400 mt-1 text-sm">Drop a doodle and a short message. Drag cards around the board.</p>
        </div>
        <VisitorsBoard />
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight } from "lucide-react";
import type { Skill } from "../../types/index.js";
import { CATEGORIES } from "../../types/index.js";
import StarRating from "../shared/StarRating.js";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatOG(wei: string) {
  return parseFloat((Number(BigInt(wei)) / 1e18).toFixed(6));
}

export default function SkillCard({ skill }: { skill: Skill }) {
  const cat = CATEGORIES.find((c) => c.value === skill.category);

  return (
    <div className="group bg-canvas border border-hairline rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-[#c5c9d0]">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-strong flex items-center justify-center text-lg shrink-0">
          {cat?.emoji ?? "✨"}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink text-[14px] leading-tight line-clamp-1">
            {skill.name}
          </h3>
          <p className="text-[12px] text-muted mt-0.5">
            by {truncateAddress(skill.creator_address)}
          </p>
        </div>
        <span className="shrink-0 text-[12px] font-mono font-medium text-brand-500 bg-brand-50 px-2 py-1 rounded-lg">
          {formatOG(skill.price_wei)} OG
        </span>
      </div>

      {/* Description */}
      <p className="text-[13px] text-body line-clamp-2 flex-1 leading-relaxed">
        {skill.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-hairline">
        <div className="flex items-center gap-3">
          <StarRating value={skill.avg_rating} count={skill.rating_count} size={12} />
          <span className="flex items-center gap-1 text-[12px] text-muted">
            <TrendingUp size={11} />
            {skill.total_runs.toLocaleString()}
          </span>
        </div>

        <Link
          to={`/skills/${skill.id}`}
          className="flex items-center gap-1 text-[13px] font-semibold px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-pill transition-colors"
        >
          Hire
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

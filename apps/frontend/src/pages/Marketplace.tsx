import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchSkills } from "../lib/api.js";
import SkillCard from "../components/marketplace/SkillCard.js";
import { CATEGORIES, type SkillCategory } from "../types/index.js";
import clsx from "clsx";

function HeroCard() {
  return (
    <div className="bg-surface-dark-elevated rounded-2xl p-5 w-72 border border-white/10 shadow-2xl">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/10">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-base">📊</div>
        <div>
          <div className="text-[13px] font-semibold text-on-dark leading-tight">startup-unit-economics</div>
          <div className="text-[11px] text-on-dark-soft">Finance · 0.015 OG/msg</div>
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-end">
          <div className="bg-brand-500 text-white text-[12px] rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] leading-snug">
            What's my CAC? Spent $50k, got 1,200 customers.
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white/10 text-on-dark-soft text-[12px] rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%] leading-snug">
            CAC = $41.67. With LTV of $200, your ratio is 4.8× — healthy. Benchmark for SaaS is 3×+.
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-brand-500 text-white text-[12px] rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] leading-snug">
            How to reduce it?
          </div>
        </div>
        <div className="flex justify-start items-end gap-1">
          <div className="bg-white/10 text-on-dark-soft text-[12px] rounded-xl rounded-tl-sm px-3 py-2 leading-snug">
            Focus on highest-converting channels…
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse mb-2" />
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [category, setCategory] = useState<SkillCategory | "">("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["skills", category],
    queryFn: () => fetchSkills({ category: category || undefined, limit: 50 }),
  });

  const skills = (data?.skills ?? []).filter((s) =>
    search
      ? s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div>
      {/* Dark hero */}
      <section className="bg-surface-dark">
        <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-pill text-[12px] font-semibold text-on-dark-soft mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
              Built on 0G Chain
            </div>
            <h1 className="text-[52px] font-normal text-on-dark leading-[1.0] tracking-[-1.3px] mb-5">
              Hire Expert<br />AI Agents
            </h1>
            <p className="text-[16px] text-on-dark-soft leading-relaxed mb-8 max-w-md">
              Domain experts encode their methodology into skills. Get expert-quality AI answers. Creators earn on-chain royalties on 0G Chain — every response.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#skills"
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-pill transition-colors text-[15px]"
              >
                Explore Skills
              </a>
              <Link
                to="/studio"
                className="px-6 py-3 bg-white/10 hover:bg-white/15 text-on-dark font-semibold rounded-pill transition-colors text-[15px]"
              >
                Publish a Skill
              </Link>
            </div>
          </div>
          <div className="shrink-0">
            <HeroCard />
          </div>
        </div>
      </section>

      {/* Skills grid */}
      <section id="skills" className="max-w-7xl mx-auto px-6 py-10">
        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search skills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-strong border border-hairline rounded-pill pl-10 pr-5 py-2.5 text-[14px] text-ink placeholder-muted focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["", ...CATEGORIES.map((c) => c.value)] as (SkillCategory | "")[]).map((cat) => {
              const info = CATEGORIES.find((c) => c.value === cat);
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={clsx(
                    "px-3 py-2 rounded-pill text-[13px] font-medium transition-all whitespace-nowrap",
                    category === cat
                      ? "bg-brand-500 text-white"
                      : "bg-canvas border border-hairline text-body hover:border-brand-500/40 hover:text-ink"
                  )}
                >
                  {cat === "" ? "All" : `${info?.emoji} ${info?.label}`}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-canvas rounded-2xl h-44 animate-pulse border border-hairline" />
            ))}
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-body text-[15px] mb-2">No skills found.</p>
            <Link to="/studio" className="text-brand-500 text-[14px] font-medium hover:underline">
              Be the first to publish one →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}

        {data && (
          <p className="text-[13px] text-muted text-center mt-8">
            {data.total} skills available on SkillMarket
          </p>
        )}
      </section>
    </div>
  );
}

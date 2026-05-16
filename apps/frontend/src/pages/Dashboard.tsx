import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, Zap, ExternalLink, BarChart2, AlertCircle,
  Loader2, ArrowDownToLine, Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useEffect } from "react";
import { fetchDashboard } from "../lib/api.js";
import { CATEGORIES } from "../types/index.js";
import StarRating from "../components/shared/StarRating.js";
import { zeroGTestnet } from "../config/wagmi.js";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "../config/contracts.js";

function StatCard({
  label, value, sub, icon: Icon,
}: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="bg-canvas border border-hairline rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[13px] text-muted">{label}</span>
        <Icon size={16} className="text-brand-500 opacity-70" />
      </div>
      <div className="text-[24px] font-semibold text-ink leading-none">{value}</div>
      {sub && <div className="text-[12px] text-muted mt-1.5">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", address],
    queryFn: () => fetchDashboard(address!),
    enabled: !!address,
  });

  const { writeContract, data: withdrawTxHash, isPending: isWithdrawing } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: withdrawConfirmed } =
    useWaitForTransactionReceipt({ hash: withdrawTxHash });

  useEffect(() => {
    if (withdrawConfirmed) {
      toast.success("Earnings withdrawn successfully!");
      qc.invalidateQueries({ queryKey: ["dashboard", address] });
    }
  }, [withdrawConfirmed, qc, address]);

  function handleWithdraw() {
    writeContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: "withdraw" });
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={28} className="text-amber-500" />
        <p className="text-body">Connect your wallet to view your dashboard</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-canvas rounded-2xl h-24 animate-pulse border border-hairline" />
          ))}
        </div>
      </div>
    );
  }

  const pendingWei = BigInt(data?.pendingWithdrawalWei ?? "0");
  const pendingOG = Number(pendingWei) / 1e18;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-ink">Creator Dashboard</h1>
          <p className="text-body text-[14px] mt-1">Your skill performance and earnings</p>
        </div>
        <Link
          to="/studio"
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-pill text-[14px] transition-colors"
        >
          + New Skill
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Skill Runs"
          value={(data?.totalRuns ?? 0).toLocaleString()}
          icon={TrendingUp}
          sub="all time"
        />
        <StatCard
          label="Est. Earnings"
          value={`${parseFloat(data?.estimatedEarningsOG ?? "0").toFixed(4)} OG`}
          icon={Wallet}
          sub="80% royalty share"
        />
        <StatCard
          label="Skills Published"
          value={String(data?.skills.length ?? 0)}
          icon={Zap}
          sub="active skills"
        />
        <StatCard
          label="Claimable On-chain"
          value={`${pendingOG.toFixed(4)} OG`}
          icon={BarChart2}
          sub="pending withdrawal"
        />
      </div>

      {/* Skills table */}
      {data?.skills && data.skills.length > 0 ? (
        <div className="bg-canvas border border-hairline rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">Your Skills</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-hairline text-[12px] text-muted">
                  <th className="text-left px-5 py-3">Skill</th>
                  <th className="text-right px-5 py-3">Runs</th>
                  <th className="text-right px-5 py-3">Price</th>
                  <th className="text-right px-5 py-3">Est. Earned</th>
                  <th className="text-right px-5 py-3">Rating</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.skills.map((skill) => {
                  const cat = CATEGORIES.find((c) => c.value === skill.category);
                  const priceOG = Number(BigInt(skill.price_wei)) / 1e18;
                  return (
                    <tr key={skill.id} className="border-b border-hairline last:border-0 hover:bg-surface-soft">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-surface-strong flex items-center justify-center text-sm shrink-0">
                            {cat?.emoji}
                          </div>
                          <div>
                            <div className="font-medium text-ink">{skill.name}</div>
                            <div className="text-[11px] text-muted">{cat?.label}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-body tabular-nums">
                        {skill.total_runs.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right text-brand-500 font-mono text-[12px] tabular-nums">
                        {parseFloat(priceOG.toFixed(6))} OG
                      </td>
                      <td className="px-5 py-3.5 text-right text-body font-mono text-[12px] tabular-nums">
                        {parseFloat((skill.total_runs * priceOG * 0.8).toFixed(6))} OG
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <StarRating value={(skill as { avg_rating?: number }).avg_rating ?? 0} size={12} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link to={`/skills/${skill.id}`} className="text-muted hover:text-brand-500">
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-canvas border border-hairline rounded-2xl p-12 text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-surface-strong flex items-center justify-center mx-auto mb-4">
            <Zap size={20} className="text-muted" />
          </div>
          <p className="text-body text-[14px] mb-4">No skills published yet</p>
          <Link to="/studio" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-pill text-[14px] transition-colors">
            Create your first skill
          </Link>
        </div>
      )}

      {/* Top queries */}
      {data?.topQueries && data.topQueries.length > 0 && (
        <div className="bg-canvas border border-hairline rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">Top Buyer Queries</h2>
          </div>
          <div className="divide-y divide-hairline">
            {data.topQueries.map((q, i) => (
              <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                <span className="text-[12px] text-muted w-5 shrink-0 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-ink truncate">{q.content}</p>
                  <p className="text-[12px] text-muted">{q.skill_name}</p>
                </div>
                <span className="text-[12px] text-muted shrink-0 tabular-nums">×{q.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw */}
      {pendingOG > 0 && (
        <div className="bg-surface-dark rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-on-dark">
              {pendingOG.toFixed(6)} OG claimable
            </p>
            <p className="text-[13px] text-on-dark-soft mt-0.5">
              80% royalty earned — withdraw to your wallet
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`${zeroGTestnet.blockExplorers.default.url}/address/${REGISTRY_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-dark-soft hover:text-on-dark"
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || isWithdrawConfirming}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-[14px] font-semibold rounded-pill transition-colors"
            >
              {isWithdrawing || isWithdrawConfirming
                ? <Loader2 size={14} className="animate-spin" />
                : <ArrowDownToLine size={14} />}
              {isWithdrawConfirming ? "Confirming…" : "Withdraw"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

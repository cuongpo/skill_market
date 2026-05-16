import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import {
  Play, ExternalLink, TrendingUp, Shield, ArrowLeft, Loader2, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { fetchSkill, createSession } from "../lib/api.js";
import { CATEGORIES } from "../types/index.js";
import StarRating from "../components/shared/StarRating.js";
import { zeroGTestnet } from "../config/wagmi.js";
import { useState } from "react";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatOG(wei: string) {
  return parseFloat((Number(BigInt(wei)) / 1e18).toFixed(6));
}

export default function SkillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [starting, setStarting] = useState(false);

  const { data: skill, isLoading } = useQuery({
    queryKey: ["skill", id],
    queryFn: () => fetchSkill(id!),
    enabled: !!id,
  });

  async function handleStartChat() {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to start chatting");
      return;
    }
    if (!skill) return;
    setStarting(true);
    try {
      const session = await createSession(address, skill.id);
      navigate(`/chat/${session.sessionId}`, { state: { skill, session } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      if (msg.includes("Insufficient")) {
        toast.error("Insufficient credits — top up from the nav bar");
      } else {
        toast.error(msg);
      }
    } finally {
      setStarting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={28} className="text-semantic-down" />
        <p className="text-muted">Skill not found</p>
      </div>
    );
  }

  const cat = CATEGORIES.find((c) => c.value === skill.category);
  const explorerUrl =
    skill.tx_hash && skill.tx_hash !== "0x" + "0".repeat(64)
      ? `${zeroGTestnet.blockExplorers.default.url}/tx/${skill.tx_hash}`
      : null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-muted hover:text-ink text-[14px] mb-8 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Marketplace
      </button>

      {/* Main card */}
      <div className="bg-canvas border border-hairline rounded-2xl p-8 mb-4">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-surface-strong flex items-center justify-center text-3xl shrink-0">
              {cat?.emoji ?? "✨"}
            </div>
            <div>
              <h1 className="text-[22px] font-semibold text-ink leading-tight">{skill.name}</h1>
              <p className="text-[13px] text-muted mt-0.5">
                {cat?.label ?? "Other"} · by {truncateAddress(skill.creator_address)}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[28px] font-semibold text-ink font-mono leading-none">
              {formatOG(skill.price_wei)}
            </div>
            <div className="text-[12px] text-muted mt-1">OG per response</div>
          </div>
        </div>

        <p className="text-body text-[15px] leading-relaxed mb-6">{skill.description}</p>

        {/* Stats */}
        <div className="flex items-center gap-5 text-[13px] mb-6 pb-6 border-b border-hairline">
          <StarRating value={skill.avg_rating} count={skill.rating_count} />
          <div className="flex items-center gap-1.5 text-muted">
            <TrendingUp size={13} />
            <span>{skill.total_runs.toLocaleString()} runs</span>
          </div>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-brand-500 hover:text-brand-600 transition-colors"
            >
              <Shield size={13} />
              <span>On-chain verified</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleStartChat}
          disabled={starting}
          className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-100 disabled:text-brand-200 text-white font-semibold rounded-pill transition-colors flex items-center justify-center gap-2 text-[16px]"
        >
          {starting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} className="fill-white" />}
          {starting ? "Starting session…" : `Start Chat — ${formatOG(skill.price_wei)} OG/message`}
        </button>

        {!isConnected && (
          <p className="text-[12px] text-muted text-center mt-3">Connect wallet to start</p>
        )}
      </div>

      {/* On-chain provenance */}
      <div className="bg-canvas border border-hairline rounded-2xl p-5 text-[12px] text-muted">
        <div className="flex items-center gap-2 mb-3 text-ink font-medium text-[13px]">
          <Shield size={13} className="text-brand-500" />
          On-Chain Provenance
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono">
          <span className="text-muted">Skill ID</span>
          <span className="text-body truncate">{skill.skill_id_onchain}</span>
          <span className="text-muted">Storage Hash</span>
          <span className="text-body truncate">{skill.storage_hash}</span>
          {skill.tx_hash && skill.tx_hash !== "0x" + "0".repeat(64) && (
            <>
              <span className="text-muted">Tx Hash</span>
              <a
                href={`${zeroGTestnet.blockExplorers.default.url}/tx/${skill.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-500 hover:text-brand-600 truncate flex items-center gap-1"
              >
                {skill.tx_hash.slice(0, 20)}…
                <ExternalLink size={10} />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

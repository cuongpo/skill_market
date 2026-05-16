import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { Loader2, Upload, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { uploadSkill } from "../lib/api.js";
import { CATEGORIES, type SkillCategory } from "../types/index.js";
import { zeroGTestnet } from "../config/wagmi.js";

const SKILL_TEMPLATE = `---
name: your-skill-name
description: One line describing what this skill does and who it's for.
author: your-name
price_per_use: 0.50
version: 1.0
---

# Skill Title

## When to use this skill
Describe the type of question or task this skill handles.

## Approach
1. Step one — describe your methodology
2. Step two — how you analyze the problem
3. Step three — what you produce as output

## Rules
- Rule one: important constraint or guard rail
- Rule two: when to recommend professional consultation
- Rule three: what information you always need before answering
`;

export default function Studio() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [content, setContent] = useState(SKILL_TEMPLATE);
  const [category, setCategory] = useState<SkillCategory>("accounting");
  const [priceUsd, setPriceUsd] = useState("0.50");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; txHash: string; storageHash: string } | null>(null);

  async function handlePublish() {
    if (!isConnected || !address) { toast.error("Connect your wallet first"); return; }
    const price = parseFloat(priceUsd);
    if (isNaN(price) || price < 0.1) { toast.error("Minimum price is 0.10"); return; }
    setLoading(true);
    try {
      const res = await uploadSkill(address, { content, price_usd: price, category });
      setResult(res);
      toast.success("Skill published! Now live on the marketplace.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const explorerUrl =
      result.txHash && result.txHash !== "0x" + "0".repeat(64)
        ? `${zeroGTestnet.blockExplorers.default.url}/tx/${result.txHash}`
        : null;

    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f0fdf4] flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={32} className="text-semantic-up" />
        </div>
        <h2 className="text-[28px] font-semibold text-ink mb-3">Skill Published!</h2>
        <p className="text-body text-[15px] mb-8 leading-relaxed">
          Your skill is live on SkillMarket. You'll earn 80% royalty every time it runs.
        </p>

        <div className="bg-surface-soft border border-hairline rounded-2xl p-5 text-left mb-6 font-mono text-[12px]">
          <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5">
            <span className="text-muted">Skill ID</span>
            <span className="text-body truncate">{result.id}</span>
            <span className="text-muted">Storage Hash</span>
            <span className="text-body truncate">{result.storageHash}</span>
            {result.txHash && result.txHash !== "0x" + "0".repeat(64) && (
              <>
                <span className="text-muted">Tx Hash</span>
                <span className="text-body truncate">{result.txHash}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-3">
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-canvas border border-hairline text-body rounded-pill text-[14px] font-medium hover:border-brand-500/40 hover:text-ink transition-colors"
            >
              <ExternalLink size={14} />
              0G Explorer
            </a>
          )}
          <button
            onClick={() => navigate("/marketplace")}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-pill text-[14px] font-semibold transition-colors"
          >
            View on Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-ink mb-2">Skill Studio</h1>
        <p className="text-body text-[15px] leading-relaxed">
          Encode your expertise into a SKILL.md file. Earn 80% royalty every time an AI agent runs your skill.
        </p>
      </div>

      {!isConnected && (
        <div className="flex items-center gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[14px] mb-6">
          <AlertCircle size={16} />
          Connect your wallet to publish a skill
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Category */}
        <div>
          <label className="block text-[13px] font-medium text-ink mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SkillCategory)}
            className="w-full bg-canvas border border-hairline rounded-xl px-3 py-2.5 text-[14px] text-ink focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block text-[13px] font-medium text-ink mb-2">Price per run (OG)</label>
          <input
            type="number"
            min="0.01"
            max="10"
            step="0.01"
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
            className="w-full bg-canvas border border-hairline rounded-xl px-3 py-2.5 text-[14px] text-ink focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10"
          />
          <p className="text-[12px] text-muted mt-1.5">
            You earn 80% = {(parseFloat(priceUsd || "0") * 0.8).toFixed(4)} OG/run
          </p>
        </div>

        {/* Earnings preview */}
        <div className="bg-surface-dark rounded-xl p-4 flex flex-col justify-center">
          <p className="text-[12px] text-on-dark-soft mb-1">At 100 runs/day</p>
          <p className="text-[24px] font-semibold text-on-dark font-mono leading-none">
            {(parseFloat(priceUsd || "0") * 0.8 * 100 * 30).toFixed(2)}
          </p>
          <p className="text-[12px] text-on-dark-soft mt-1">OG / month passive</p>
        </div>
      </div>

      {/* Editor */}
      <div className="mb-5">
        <label className="block text-[13px] font-medium text-ink mb-2">SKILL.md Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-canvas border border-hairline rounded-xl px-4 py-3 text-[13px] font-mono text-body focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10 resize-none"
          rows={22}
          spellCheck={false}
        />
      </div>

      {/* Tips */}
      <div className="text-[13px] text-body mb-5 bg-brand-50 border border-brand-100 rounded-xl p-4 leading-relaxed">
        <strong className="text-ink font-medium">Required frontmatter:</strong>{" "}
        <code className="text-brand-500 font-mono">name</code>,{" "}
        <code className="text-brand-500 font-mono">description</code>.
        {" "}Your skill runs a test prompt before publishing. The SKILL.md is stored on{" "}
        <strong className="text-ink">0G Storage</strong> and registered on{" "}
        <strong className="text-ink">0G Chain</strong>.
      </div>

      <button
        onClick={handlePublish}
        disabled={loading || !isConnected}
        className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-100 disabled:text-brand-200 text-white font-semibold rounded-pill transition-colors flex items-center justify-center gap-2 text-[16px]"
      >
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Publishing to 0G…</>
          : <><Upload size={18} /> Publish Skill</>}
      </button>
    </div>
  );
}

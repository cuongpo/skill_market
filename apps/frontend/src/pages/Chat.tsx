import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, ArrowLeft, Loader2, ExternalLink, Star } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  streamMessage, fetchSessionMessages, fetchSkill, submitRating,
} from "../lib/api.js";
import type { ChatMessage, Skill, Session } from "../types/index.js";
import { CATEGORIES } from "../types/index.js";
import { zeroGTestnet } from "../config/wagmi.js";
import StarRating from "../components/shared/StarRating.js";

function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[78%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
          isUser
            ? "bg-brand-500 text-white rounded-tr-sm"
            : "bg-surface-strong text-ink border border-hairline rounded-tl-sm",
          isStreaming && !isUser && "typing-cursor"
        )}
      >
        <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
      </div>
    </div>
  );
}

export default function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { address } = useAccount();
  const qc = useQueryClient();

  const stateSkill: Skill | undefined = location.state?.skill;
  const stateSession: Session | undefined = location.state?.session;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [rated, setRated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const { data: skill } = useQuery({
    queryKey: ["skill", stateSkill?.id],
    queryFn: () => fetchSkill(stateSkill!.id),
    enabled: !!stateSkill?.id,
    initialData: stateSkill,
  });

  const { data: existingMessages } = useQuery({
    queryKey: ["messages", sessionId],
    queryFn: () => fetchSessionMessages(address!, sessionId!),
    enabled: !!address && !!sessionId,
  });

  useEffect(() => { if (existingMessages) setMessages(existingMessages); }, [existingMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming || !address || !sessionId) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingText("");
    let accumulated = "";

    cancelRef.current = streamMessage(
      address, sessionId, userMsg.content,
      (delta) => { accumulated += delta; setStreamingText((t) => t + delta); },
      (txHash) => {
        setStreaming(false);
        setMessages((prev) => [...prev, { id: Date.now() + "-ai", role: "assistant", content: accumulated }]);
        setStreamingText("");
        if (txHash && txHash !== "0x" + "0".repeat(64)) setLastTxHash(txHash);
        qc.invalidateQueries({ queryKey: ["balance"] });
      },
      (err) => {
        setStreaming(false);
        setStreamingText("");
        toast.error(err.includes("Insufficient") ? "Insufficient credits — top up from the nav bar" : err);
      }
    );
  }, [input, streaming, address, sessionId, qc]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  async function handleRate(rating: number) {
    if (!address || !sessionId || !skill || rated) return;
    try {
      await submitRating(address, skill.id, sessionId, rating);
      setRated(true);
      toast.success("Thanks for your rating!");
    } catch { toast.error("Couldn't submit rating"); }
  }

  const cat = CATEGORIES.find((c) => c.value === skill?.category);
  const formatOG = (wei: string) => parseFloat((Number(BigInt(wei)) / 1e18).toFixed(6));

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-surface-soft">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-hairline bg-canvas flex-col p-5 gap-4 shrink-0">
        <button
          onClick={() => navigate("/marketplace")}
          className="flex items-center gap-1.5 text-muted hover:text-ink text-[13px] transition-colors"
        >
          <ArrowLeft size={13} />
          Marketplace
        </button>

        {skill && (
          <div className="bg-surface-soft rounded-xl p-4 border border-hairline">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-surface-strong flex items-center justify-center text-base shrink-0">
                {cat?.emoji}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink line-clamp-2 leading-tight">{skill.name}</div>
                <div className="text-[11px] text-brand-500 font-mono mt-0.5">
                  {formatOG(skill.price_wei)} OG/msg
                </div>
              </div>
            </div>
            <StarRating value={skill.avg_rating} count={skill.rating_count} size={11} />
          </div>
        )}

        {lastTxHash && (
          <a
            href={`${zeroGTestnet.blockExplorers.default.url}/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] text-brand-500 hover:text-brand-600 transition-colors"
          >
            <ExternalLink size={11} />
            Last tx on 0G
          </a>
        )}

        {messages.length >= 2 && !rated && (
          <div className="mt-auto">
            <p className="text-[12px] text-muted mb-2">Rate this skill</p>
            <StarRating value={0} interactive onChange={handleRate} size={20} />
          </div>
        )}
      </aside>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-hairline bg-canvas">
          <div className="w-8 h-8 rounded-full bg-surface-strong flex items-center justify-center text-base shrink-0">
            {cat?.emoji ?? "🤖"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-ink truncate">
              {skill?.name ?? "Loading…"}
            </div>
            <div className="text-[12px] text-muted">
              {stateSession?.priceWei
                ? `${formatOG(stateSession.priceWei)} OG per response`
                : "Skill session"}
            </div>
          </div>
          {rated && (
            <div className="flex items-center gap-1 text-[12px] text-brand-500 font-medium">
              <Star size={12} className="fill-brand-500" />
              Rated
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
          {messages.length === 0 && !streaming && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-surface-strong flex items-center justify-center text-3xl mx-auto mb-4">
                  {cat?.emoji ?? "🤖"}
                </div>
                <p className="text-ink font-semibold text-[16px] mb-2">{skill?.name}</p>
                <p className="text-body text-[14px] max-w-xs leading-relaxed">
                  {skill?.description ?? "Ask your first question to get started."}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}

          {streaming && streamingText && (
            <MessageBubble msg={{ id: "streaming", role: "assistant", content: streamingText }} isStreaming />
          )}

          {streaming && !streamingText && (
            <div className="flex justify-start">
              <div className="bg-surface-strong border border-hairline rounded-2xl rounded-tl-sm px-4 py-3">
                <Loader2 size={14} className="animate-spin text-brand-500" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-hairline bg-canvas">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${skill?.name ?? "the AI"}…`}
              rows={1}
              className="flex-1 resize-none bg-surface-soft border border-hairline rounded-2xl px-4 py-3 text-[14px] text-ink placeholder-muted focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10 max-h-32 overflow-y-auto"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="shrink-0 w-11 h-11 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-strong disabled:text-muted rounded-2xl flex items-center justify-center transition-colors"
            >
              {streaming
                ? <Loader2 size={16} className="animate-spin text-white" />
                : <Send size={16} className="text-white" />}
            </button>
          </div>
          <p className="text-[12px] text-muted text-center mt-2">
            {skill ? formatOG(skill.price_wei) : "…"} OG per message · Royalty auto-paid to creator on 0G Chain
          </p>
        </div>
      </div>
    </div>
  );
}

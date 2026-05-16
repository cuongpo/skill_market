import { useState, useEffect } from "react";
import { X, Zap, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain, useGasPrice } from "wagmi";
import { parseEther, parseGwei } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { confirmTopUp, fetchPlatformWallet } from "../../lib/api.js";
import { zeroGTestnet } from "../../config/wagmi.js";
import clsx from "clsx";

const PRESETS = [
  { label: "0.1 OG", value: "0.1" },
  { label: "0.5 OG", value: "0.5" },
  { label: "1 OG",   value: "1"   },
  { label: "5 OG",   value: "5"   },
] as const;

export default function TopUpModal({ onClose }: { onClose: () => void }) {
  const { address, chainId } = useAccount();
  const qc = useQueryClient();
  const { switchChain } = useSwitchChain();

  const [selected, setSelected] = useState("0.5");
  const [platformWallet, setPlatformWallet] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { sendTransaction, data: txHash, isPending: isSending, error: sendError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const { data: networkGasPrice } = useGasPrice({ chainId: zeroGTestnet.id });

  useEffect(() => {
    fetchPlatformWallet().then((r) => setPlatformWallet(r.address)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!txConfirmed || !txHash || !address || confirming) return;
    setConfirming(true);
    confirmTopUp(address, txHash)
      .then((r) => {
        qc.invalidateQueries({ queryKey: ["balance"] });
        toast.success(`Credited ${r.creditedOG} OG — new balance: ${parseFloat(r.newBalanceOG).toFixed(4)} OG`);
        onClose();
      })
      .catch((err) => toast.error(err.message ?? "Failed to credit — contact support with tx hash"))
      .finally(() => setConfirming(false));
  }, [txConfirmed, txHash, address, confirming, qc, onClose]);

  useEffect(() => {
    if (sendError) toast.error(sendError.message.slice(0, 120));
  }, [sendError]);

  const isWrongChain = chainId !== zeroGTestnet.id;

  function handleSend() {
    if (!platformWallet) return;
    if (isWrongChain) { switchChain({ chainId: zeroGTestnet.id }); return; }
    sendTransaction({
      to: platformWallet as `0x${string}`,
      value: parseEther(selected),
      gas: 21000n,
      gasPrice: networkGasPrice ?? parseGwei("1"),
    });
  }

  const explorerUrl = txHash ? `${zeroGTestnet.blockExplorers.default.url}/tx/${txHash}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="bg-canvas border border-hairline rounded-2xl w-full max-w-sm p-6 shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-ink flex items-center gap-2 text-[15px]">
            <Zap size={16} className="text-brand-500 fill-brand-500" />
            Add OG Credits
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-[13px] text-body mb-5">
          Send OG tokens to the platform wallet. Credits are applied instantly after on-chain confirmation.
        </p>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setSelected(value)}
              className={clsx(
                "py-2.5 rounded-lg text-[13px] font-semibold border transition-all",
                selected === value
                  ? "bg-brand-500 border-brand-500 text-white"
                  : "bg-canvas border-hairline text-body hover:border-brand-500/50 hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Platform wallet */}
        {platformWallet && (
          <div className="bg-surface-soft rounded-xl p-3 mb-4 text-[12px] font-mono border border-hairline">
            <p className="text-muted mb-1">Sending to platform wallet</p>
            <p className="text-body truncate">{platformWallet}</p>
          </div>
        )}

        {/* Wrong chain */}
        {isWrongChain && (
          <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            Switch to 0G Galileo Testnet to continue
          </div>
        )}

        {/* Tx status */}
        {txHash && (
          <div className={clsx(
            "rounded-xl p-3 mb-4 text-[12px] border",
            txConfirmed
              ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]"
              : "bg-surface-soft border-hairline text-muted"
          )}>
            <div className="flex items-center gap-2 mb-1">
              {txConfirmed
                ? <CheckCircle size={13} />
                : <Loader2 size={13} className="animate-spin" />}
              <span>{txConfirmed ? "Confirmed!" : confirming ? "Crediting account…" : "Waiting for confirmation…"}</span>
            </div>
            {explorerUrl && (
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand-500 hover:text-brand-600 mt-1">
                <ExternalLink size={11} /> View on 0G Explorer
              </a>
            )}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={isSending || isConfirming || confirming || !platformWallet}
          className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-100 disabled:text-brand-200 text-white font-semibold rounded-pill transition-colors flex items-center justify-center gap-2 text-[15px]"
        >
          {isSending || isConfirming || confirming
            ? <Loader2 size={16} className="animate-spin" />
            : <Zap size={16} />}
          {isWrongChain
            ? "Switch to 0G Testnet"
            : isSending      ? "Confirm in wallet…"
            : isConfirming   ? "Confirming on-chain…"
            : confirming     ? "Crediting…"
            : `Send ${selected} OG`}
        </button>
      </div>
    </div>
  );
}

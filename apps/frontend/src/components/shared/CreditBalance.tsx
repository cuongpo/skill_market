import { Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { fetchBalance } from "../../lib/api.js";
import TopUpModal from "./TopUpModal.js";
import { useState } from "react";

export default function CreditBalance() {
  const { address } = useAccount();
  const [showTopUp, setShowTopUp] = useState(false);

  const { data } = useQuery({
    queryKey: ["balance", address],
    queryFn: () => fetchBalance(address!),
    enabled: !!address,
    refetchInterval: 15_000,
  });

  return (
    <>
      <button
        onClick={() => setShowTopUp(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-pill bg-surface-strong text-ink text-[14px] font-medium hover:bg-hairline transition-colors"
      >
        <Wallet size={14} className="text-brand-500" />
        <span className="font-mono text-[13px]">
          {data ? parseFloat(data.balanceOG).toFixed(4) : "0.0000"} OG
        </span>
      </button>

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
    </>
  );
}

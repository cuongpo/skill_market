import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Zap, LayoutGrid, PenTool, BarChart2 } from "lucide-react";
import clsx from "clsx";
import CreditBalance from "../shared/CreditBalance.js";

const NAV_LINKS = [
  { to: "/marketplace", label: "Marketplace", icon: LayoutGrid },
  { to: "/studio",      label: "Skill Studio", icon: PenTool },
  { to: "/dashboard",   label: "Dashboard",    icon: BarChart2 },
];

export default function Navbar() {
  const location = useLocation();
  const { isConnected } = useAccount();

  return (
    <header className="sticky top-0 z-50 bg-canvas border-b border-hairline">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">
        {/* Logo */}
        <Link to="/marketplace" className="flex items-center gap-2 shrink-0">
          <Zap size={18} className="text-brand-500 fill-brand-500" />
          <span className="font-semibold text-ink text-[15px] tracking-tight">
            Skill<span className="text-brand-500">Market</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors",
                location.pathname.startsWith(to)
                  ? "text-ink bg-surface-strong"
                  : "text-body hover:text-ink hover:bg-surface-soft"
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="ml-auto flex items-center gap-3">
          {isConnected && <CreditBalance />}
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="avatar"
          />
        </div>
      </div>
    </header>
  );
}

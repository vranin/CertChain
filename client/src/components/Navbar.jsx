import { Link, NavLink } from "react-router-dom";
import { Shield, Moon, Sun, Menu, X, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { connectWallet, getConnectedWallet } from "../utils/wallet";

export default function Navbar() {
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    getConnectedWallet().then((res) => {
      if (res && res.address) {
        setWalletAddress(res.address);
      }
    });

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setWalletAddress(accounts[0] || null);
      });
    }
  }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const res = await connectWallet();
      setWalletAddress(res.address);
    } catch (err) {
      alert(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive ? "text-emerald-400" : "text-slate-400 hover:text-white"
    }`;

  const truncate = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/90 backdrop-blur-md border-b border-slate-800"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">
            Cert<span className="text-emerald-400">Chain</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/issue" className={navLinkClass}>
            Issue
          </NavLink>
          <NavLink to="/verify" className={navLinkClass}>
            Verify
          </NavLink>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDark(!dark)}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={walletAddress ? undefined : handleConnect}
            disabled={connecting}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-medium transition"
            title={walletAddress ? `Connected: ${walletAddress}` : "Connect MetaMask Wallet (Free Local Testnet)"}
          >
            <Wallet size={14} />
            {walletAddress ? truncate(walletAddress) : connecting ? "Connecting..." : "Connect Wallet"}
          </button>

          <Link to="/issue" className="hidden md:block btn-primary py-2 px-4 text-xs">
            Issue Certificate
          </Link>

          {/* Hamburger */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 flex flex-col gap-4">
          <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/issue" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Issue Certificate
          </NavLink>
          <NavLink to="/verify" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Verify Certificate
          </NavLink>
        </div>
      )}
    </nav>
  );
}

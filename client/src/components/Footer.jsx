import { Shield, Github } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Shield size={14} className="text-emerald-400" />
          </div>
          <span className="text-slate-400 text-sm">
            <span className="font-semibold text-white">CertChain</span> — Blockchain Certificate Verification
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link to="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <Link to="/issue" className="hover:text-slate-300 transition-colors">Issue</Link>
          <Link to="/verify" className="hover:text-slate-300 transition-colors">Verify</Link>
        </div>

        <p className="text-slate-600 text-xs">
          Mini project — Runs on local Hardhat blockchain
        </p>
      </div>
    </footer>
  );
}

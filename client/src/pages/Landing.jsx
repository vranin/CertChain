import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Hash, Globe, FileText, BadgeCheck, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Reusable animated section wrapper ────────────────────────────────────────
function FadeInSection({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── How-it-works step ────────────────────────────────────────────────────────
function Step({ icon: Icon, title, desc, step, color }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 p-8 glass-card relative group hover:border-white/20 transition-colors duration-300">
      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${color} text-white shadow-lg`}>
        {step}
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} bg-opacity-20 border border-white/10`}>
        <Icon size={24} className="text-white" />
      </div>
      <h3 className="font-semibold text-white text-base">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────
function StatsStrip() {
  const [stats, setStats] = useState({ total: "—", revoked: "—" });

  useEffect(() => {
    fetch("/api/certificates")
      .then((r) => r.json())
      .then((d) => {
        if (d.certificates) {
          setStats({ total: d.total ?? d.certificates.length, revoked: d.revoked ?? 0 });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800 rounded-2xl overflow-hidden border border-slate-800">
      {[
        { label: "Certificates Issued", value: stats.total, color: "text-emerald-400" },
        { label: "Revoked", value: stats.revoked, color: "text-rose-400" },
        { label: "Blockchain Network", value: "Local", color: "text-sky-400" },
        { label: "Verification Method", value: "SHA-256", color: "text-amber-400" },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-slate-900 px-6 py-5 flex flex-col gap-1">
          <span className={`text-2xl font-bold ${color}`}>{value}</span>
          <span className="text-slate-500 text-xs font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-32">

      {/* Hero */}
      <section className="text-center space-y-8 pt-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-8">
            <ShieldCheck size={13} />
            Tamper-Proof · Blockchain-Secured · Instantly Verifiable
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight">
            Certificates that{" "}
            <span className="gradient-text">can't be faked</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Issue academic certificates with their cryptographic fingerprint stored immutably on the blockchain.
            Anyone can verify authenticity in seconds — no central authority needed.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link to="/issue" className="btn-primary text-base px-8 py-4">
            <FileText size={18} />
            Issue Certificate
          </Link>
          <Link to="/verify" className="btn-ghost text-base px-8 py-4">
            <BadgeCheck size={18} />
            Verify Certificate
          </Link>
        </motion.div>

        {/* Hero glow */}
        <div className="relative mt-16">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-sky-500/10 blur-3xl rounded-full" />
          <div className="relative glass-card p-8 sm:p-12 text-left max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <span className="text-slate-500 text-xs font-mono">certificate-verification.json</span>
            </div>
            <pre className="text-sm font-mono text-slate-300 leading-relaxed overflow-x-auto">
{`{
  "certId": "CERT-1714000000000",
  "studentName": "Alice Johnson",
  "course": "Computer Science",
  "hash": "0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
  "status": `}<span className="text-emerald-400 font-bold">"VALID"</span>{`,
  "blockchain": "Hardhat Local",
  "verifiedAt": "2024-04-25T12:00:00.000Z"
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Stats */}
      <FadeInSection>
        <StatsStrip />
      </FadeInSection>

      {/* How it works */}
      <section>
        <FadeInSection>
          <div className="text-center mb-16">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Three steps to tamper-proof trust
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              The PDF never touches the blockchain — only its unique fingerprint does.
            </p>
          </div>
        </FadeInSection>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "1", icon: FileText, color: "bg-sky-500",
              title: "Issue Certificate",
              desc: "The issuer enters student details. A professional PDF is generated with a QR code linking back to the verifier.",
            },
            {
              step: "2", icon: Hash, color: "bg-emerald-500",
              title: "Hash Goes On-Chain",
              desc: "The server computes the SHA-256 fingerprint of the PDF and registers it immutably on the blockchain. The PDF stays off-chain.",
            },
            {
              step: "3", icon: Globe, color: "bg-violet-500",
              title: "Verify Anywhere",
              desc: "Anyone can upload the PDF or scan the QR code. The hash is recomputed and checked against the blockchain. Instant result.",
            },
          ].map((s, i) => (
            <FadeInSection key={s.step} delay={i * 0.15}>
              <Step {...s} />
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* Why blockchain */}
      <FadeInSection>
        <div className="glass-card p-8 sm:p-12 text-center space-y-6">
          <TrendingUp size={36} className="text-emerald-400 mx-auto" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Why store only the hash?
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Blockchains are public, immutable ledgers — great for proofs, not for storing sensitive data.
            By hashing the PDF and putting only the hash on-chain, we get tamper-proof verification
            while keeping personal data off the public ledger. If even one byte of the PDF changes,
            the hash changes, and verification fails.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            {["Immutable", "Decentralized", "Instant", "Trustless", "Privacy-friendly"].map((tag) => (
              <span key={tag} className="px-4 py-1.5 rounded-full bg-slate-800 text-slate-300 text-sm border border-slate-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </FadeInSection>
    </div>
  );
}

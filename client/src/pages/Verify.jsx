import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Search, RotateCcw, Shield, Calendar, Hash, User, BookOpen
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function truncateHash(h) {
  if (!h || h.length < 20) return h;
  return h.slice(0, 12) + "…" + h.slice(-10);
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ result }) {
  const status =
    !result.exists ? "NOT_FOUND"
    : result.revoked ? "REVOKED"
    : "VALID";

  const config = {
    VALID: {
      icon: CheckCircle2,
      color: "emerald",
      label: "VALID",
      bg: "from-emerald-950/60 to-emerald-900/20",
      border: "border-emerald-500/40",
      iconColor: "text-emerald-400",
      badgeBg: "bg-emerald-500",
      message: "This certificate is authentic and has not been tampered with.",
    },
    REVOKED: {
      icon: XCircle,
      color: "rose",
      label: "REVOKED",
      bg: "from-rose-950/60 to-rose-900/20",
      border: "border-rose-500/40",
      iconColor: "text-rose-400",
      badgeBg: "bg-rose-500",
      message: "This certificate has been revoked by the issuer.",
    },
    NOT_FOUND: {
      icon: AlertTriangle,
      color: "amber",
      label: "NOT FOUND",
      bg: "from-amber-950/60 to-amber-900/20",
      border: "border-amber-500/40",
      iconColor: "text-amber-400",
      badgeBg: "bg-amber-500",
      message: "No matching record found. The certificate may be invalid or tampered.",
    },
  }[status];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`rounded-2xl border ${config.border} bg-gradient-to-br ${config.bg} p-6 space-y-5`}
    >
      {/* Status header */}
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${config.color}-500/20 border border-${config.color}-500/30`}
        >
          <Icon size={28} className={config.iconColor} />
        </motion.div>
        <div>
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${config.badgeBg} mb-1`}>
            {config.label}
          </div>
          <p className="text-slate-300 text-sm">{config.message}</p>
        </div>
      </div>

      {/* Details */}
      {result.exists && (
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: User, label: "Student Name", value: result.studentName },
            { icon: BookOpen, label: "Course", value: result.course },
            { icon: Calendar, label: "Issued At", value: formatDate(result.issuedAt) },
            { icon: Shield, label: "Certificate ID", value: result.certId, mono: true },
          ].map(({ icon: I, label, value, mono }) => (
            <div key={label} className="bg-black/20 rounded-xl px-4 py-3 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <I size={12} /> {label}
              </div>
              <p className={`text-slate-100 text-sm font-medium ${mono ? "font-mono" : ""} break-all`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Hash */}
      {result.hash && (
        <div className="bg-black/20 rounded-xl px-4 py-3 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Hash size={12} /> SHA-256 Hash
          </div>
          <p className="text-slate-300 font-mono text-xs break-all">{result.hash}</p>
        </div>
      )}

      {status === "NOT_FOUND" && (
        <p className="text-amber-400/70 text-xs italic text-center">
          💡 Tip: Try editing one character of the PDF and verifying again — it will fail.
        </p>
      )}
    </motion.div>
  );
}

// ─── Checking animation ───────────────────────────────────────────────────────

function CheckingState() {
  const steps = ["Reading file…", "Computing SHA-256…", "Querying blockchain…", "Decoding result…"];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 700);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass-card p-8 flex flex-col items-center gap-5 text-center"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
          <Shield size={28} className="text-emerald-400" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
      <div>
        <p className="font-semibold text-white mb-1">Checking blockchain…</p>
        <p className="text-slate-400 text-sm">{steps[step]}</p>
      </div>
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
              i <= step ? "bg-emerald-500" : "bg-slate-700"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Verify page ──────────────────────────────────────────────────────────────

export default function Verify() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("upload"); // "upload" | "id"
  const [file, setFile] = useState(null);
  const [certId, setCertId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-verify if ?id= is in URL (from QR code)
  const urlId = searchParams.get("id");
  useEffect(() => {
    if (urlId) {
      setTab("id");
      setCertId(urlId);
      verifyById(urlId);
    }
  }, [urlId]);

  const verifyByFile = useCallback(async (f) => {
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("certificate", f);
    try {
      const res = await fetch("/api/verify-file", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ ...data });
    } catch (err) {
      setResult({ exists: false, error: err.message, hash: null });
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyById = useCallback(async (id) => {
    if (!id?.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/verify-id/${encodeURIComponent(id.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setResult({ exists: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); verifyByFile(f); }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); verifyByFile(f); }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setCertId("");
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white">Verify Certificate</h1>
        <p className="text-slate-400 mt-2">
          Upload a certificate PDF or enter a certificate ID to check blockchain authenticity.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800"
      >
        {[
          { key: "upload", label: "Upload PDF", icon: Upload },
          { key: "id", label: "Enter ID", icon: Search },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            id={`tab-${key}`}
            onClick={() => { setTab(key); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === key
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </motion.div>

      {/* Tab panels */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {tab === "upload" && (
          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            id="drop-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
              id="file-input"
            />
            {file ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <FileText size={22} className="text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Upload size={22} className="text-slate-500" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Drop your PDF here</p>
                  <p className="text-slate-500 text-sm">or click to browse</p>
                </div>
                <p className="text-slate-600 text-xs">Supports PDF files up to 20 MB</p>
              </>
            )}
          </div>
        )}

        {tab === "id" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Certificate ID</label>
            <div className="flex gap-3">
              <input
                id="cert-id-input"
                type="text"
                className="input-field flex-1"
                placeholder="e.g. CERT-1714000000000"
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") verifyById(certId); }}
              />
              <button
                id="verify-id-btn"
                onClick={() => verifyById(certId)}
                disabled={loading || !certId.trim()}
                className="btn-primary px-5 py-3"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {loading && <CheckingState key="loading" />}
        {!loading && result && (
          <div key="result" className="space-y-4">
            <ResultCard result={result} />
            <button
              onClick={reset}
              className="btn-ghost w-full justify-center"
            >
              <RotateCcw size={15} /> Verify another
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Hint */}
      {!loading && !result && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-slate-600 text-sm"
        >
          💡 Edit one byte of any PDF and try again — it will show NOT FOUND.
        </motion.p>
      )}
    </div>
  );
}

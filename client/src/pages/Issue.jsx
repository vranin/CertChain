import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Upload, FileText, Check, Copy, Loader2, AlertTriangle,
  BadgeCheck, XCircle, Clock, RefreshCw, Trash2, Hash
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str, n = 18) {
  if (!str || str.length <= n) return str;
  return str.slice(0, 8) + "…" + str.slice(-6);
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors" title="Copy">
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

function StatusBadge({ revoked }) {
  return revoked ? (
    <span className="badge-revoked"><XCircle size={11} /> Revoked</span>
  ) : (
    <span className="badge-valid"><BadgeCheck size={11} /> Active</span>
  );
}

// ─── Revoke confirm dialog ────────────────────────────────────────────────────
function RevokeDialog({ certId, onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card p-6 max-w-md w-full space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-rose-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Revoke Certificate?</h3>
            <p className="text-slate-400 text-sm mt-1">
              This will mark <span className="font-mono text-slate-200">{certId}</span> as revoked on the blockchain. This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-ghost py-2 px-4">Cancel</button>
          <button onClick={onConfirm} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-rose-500 hover:bg-rose-400 text-white transition-all duration-200 active:scale-95">
            <Trash2 size={14} /> Revoke
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Success card ─────────────────────────────────────────────────────────────
function SuccessCard({ result, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass-card border-emerald-500/30 p-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <BadgeCheck size={20} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Certificate Registered!</h3>
          <p className="text-slate-400 text-xs">Hash recorded on blockchain · Keep your original PDF safe</p>
        </div>
        <button onClick={onDismiss} className="ml-auto p-1.5 text-slate-500 hover:text-white transition-colors">
          <XCircle size={16} />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {[
          { label: "Certificate ID", key: "certId" },
          { label: "Tx Hash", key: "txHash" },
          { label: "PDF Hash (SHA-256)", key: "hash" },
          { label: "File Registered", key: "fileName" },
        ].map(({ label, key }) => (
          <div key={key} className="flex items-center justify-between gap-2 bg-slate-800 rounded-lg px-3 py-2">
            <span className="text-slate-500 text-xs">{label}</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-slate-200 text-xs">{truncate(result[key], 30)}</span>
              <CopyBtn text={result[key]} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
        <p className="text-amber-400 text-xs">
          ⚠️ Keep the original PDF file — it is the only thing that will verify as VALID. Any modification will break verification.
        </p>
      </div>
    </motion.div>
  );
}

// ─── PDF drop zone ────────────────────────────────────────────────────────────
function PDFDropZone({ file, onFile }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      className={`drop-zone ${dragOver ? "drag-over" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); }}
      />
      {file ? (
        <>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <FileText size={22} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">{file.name}</p>
            <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(1)} KB · Ready to register</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Upload size={22} className="text-slate-500" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">Upload Certificate PDF</p>
            <p className="text-slate-500 text-sm">Drag & drop or click to browse</p>
          </div>
          <p className="text-slate-600 text-xs">The exact bytes of this file will be hashed and stored on-chain</p>
        </>
      )}
    </div>
  );
}

// ─── Issue page ───────────────────────────────────────────────────────────────
export default function Issue() {
  const [form, setForm] = useState({ studentName: "", course: "" });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [certs, setCerts] = useState([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(null);

  const loadCerts = useCallback(async () => {
    setCertsLoading(true);
    try {
      const r = await fetch("/api/certificates");
      const d = await r.json();
      setCerts((d.certificates || []).slice().reverse());
    } catch { } finally {
      setCertsLoading(false);
    }
  }, []);

  useEffect(() => { loadCerts(); }, [loadCerts]);

  const validate = () => {
    const e = {};
    if (!form.studentName.trim()) e.studentName = "Student name is required";
    if (!form.course.trim()) e.course = "Course name is required";
    if (!file) e.file = "A certificate PDF is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSuccessResult(null);
    try {
      // Send as multipart form — the PDF file + metadata fields
      const formData = new FormData();
      formData.append("studentName", form.studentName);
      formData.append("course", form.course);
      formData.append("certificate", file);

      const res = await fetch("/api/issue", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Issue failed");

      setSuccessResult(data);
      setForm({ studentName: "", course: "" });
      setFile(null);
      toast.success("Certificate registered on blockchain!");
      loadCerts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(revokeTarget);
    setRevokeTarget(null);
    try {
      const res = await fetch("/api/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certId: revokeTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revoke failed");
      toast.success(`${revokeTarget} revoked`);
      loadCerts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        {revokeTarget && (
          <RevokeDialog certId={revokeTarget} onConfirm={handleRevoke} onCancel={() => setRevokeTarget(null)} />
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-bold text-white">Issuer Dashboard</h1>
          <p className="text-slate-400 mt-2">
            Upload an existing certificate PDF — its SHA-256 hash gets registered on the blockchain.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left: Issue form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="glass-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Hash size={17} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Register Certificate</h2>
                  <p className="text-slate-500 text-xs">Upload the PDF · its hash goes on-chain</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* PDF upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Certificate PDF</label>
                  <PDFDropZone file={file} onFile={(f) => { setFile(f); setErrors({ ...errors, file: "" }); }} />
                  {errors.file && <p className="text-rose-400 text-xs mt-1">{errors.file}</p>}
                </div>

                {/* Student name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Student Name</label>
                  <input
                    id="student-name"
                    type="text"
                    className={`input-field ${errors.studentName ? "border-rose-500 focus:ring-rose-500" : ""}`}
                    placeholder="e.g. Alice Johnson"
                    value={form.studentName}
                    onChange={(e) => { setForm({ ...form, studentName: e.target.value }); setErrors({ ...errors, studentName: "" }); }}
                  />
                  {errors.studentName && <p className="text-rose-400 text-xs mt-1">{errors.studentName}</p>}
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Course / Qualification</label>
                  <input
                    id="course-name"
                    type="text"
                    className={`input-field ${errors.course ? "border-rose-500 focus:ring-rose-500" : ""}`}
                    placeholder="e.g. Bachelor of Computer Science"
                    value={form.course}
                    onChange={(e) => { setForm({ ...form, course: e.target.value }); setErrors({ ...errors, course: "" }); }}
                  />
                  {errors.course && <p className="text-rose-400 text-xs mt-1">{errors.course}</p>}
                </div>

                <button id="issue-btn" type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Registering on blockchain…</>
                  ) : (
                    <><Hash size={16} /> Register Certificate Hash</>
                  )}
                </button>
              </form>

              {/* How it works mini note */}
              <div className="bg-slate-800/60 rounded-xl px-4 py-3 space-y-1 text-xs text-slate-500">
                <p className="font-medium text-slate-400">How this works</p>
                <p>1. You upload the PDF you already have (from Word, Canva, etc.)</p>
                <p>2. The server computes its SHA-256 hash</p>
                <p>3. Only the hash is stored on-chain — the PDF stays with you</p>
                <p>4. To verify later, upload the same original file</p>
              </div>
            </div>

            {/* Success card */}
            <AnimatePresence>
              {successResult && (
                <SuccessCard result={successResult} onDismiss={() => setSuccessResult(null)} />
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right: Registry table */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Certificate Registry</h2>
              <button onClick={loadCerts} disabled={certsLoading} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800" title="Refresh">
                <RefreshCw size={15} className={certsLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {certsLoading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-slate-500">
                <Loader2 size={18} className="animate-spin" /> Loading…
              </div>
            ) : certs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-600">
                <FileText size={32} strokeWidth={1} />
                <p className="text-sm">No certificates registered yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs">
                      <th className="text-left py-2 px-2 font-medium">ID</th>
                      <th className="text-left py-2 px-2 font-medium">Name</th>
                      <th className="text-left py-2 px-2 font-medium hidden sm:table-cell">Date</th>
                      <th className="text-left py-2 px-2 font-medium">Status</th>
                      <th className="py-2 px-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {certs.map((c) => (
                      <motion.tr key={c.certId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-slate-300">{truncate(c.certId, 16)}</span>
                            <CopyBtn text={c.certId} />
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-200 font-medium">{c.studentName}</td>
                        <td className="py-3 px-2 text-slate-500 text-xs hidden sm:table-cell">
                          <div className="flex items-center gap-1"><Clock size={11} /> {formatDate(c.issuedAt)}</div>
                        </td>
                        <td className="py-3 px-2"><StatusBadge revoked={c.revoked} /></td>
                        <td className="py-3 px-2 text-right">
                          {!c.revoked && (
                            <button
                              id={`revoke-${c.certId}`}
                              onClick={() => setRevokeTarget(c.certId)}
                              disabled={revoking === c.certId}
                              className="text-xs text-rose-500 hover:text-rose-400 transition-colors disabled:opacity-50"
                            >
                              {revoking === c.certId ? <Loader2 size={12} className="animate-spin" /> : "Revoke"}
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}

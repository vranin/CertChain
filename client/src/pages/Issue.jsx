import { useState } from "react";

export default function Issue() {
  const [certId, setCertId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const downloadBase64Pdf = (base64Data, filename) => {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to generate PDF download blob:", err);
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!file || !certId.trim()) {
      setError("Please provide a Certificate ID and select a PDF file.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const formData = new FormData();
      formData.append("certId", certId.trim());
      formData.append("recipientName", recipientName.trim());
      formData.append("courseName", courseName.trim());
      formData.append("expiresAt", expiresAt);
      formData.append("file", file);

      const res = await fetch("/api/issue", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data);

        if (data.pdfBase64) {
          downloadBase64Pdf(data.pdfBase64, `${certId}_stamped.pdf`);
        }
      } else {
        setError(data.error || "Failed to issue certificate.");
      }
    } catch (err) {
      setError("Cannot reach backend server. Ensure the API server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-sm my-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Issue New Certificate</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload a certificate PDF. It will receive a QR verification stamp and be registered on-chain.
      </p>

      {error && (
        <div className="p-3 mb-4 text-sm bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 mb-4 text-sm bg-green-100 text-green-800 rounded-lg space-y-1">
          <p className="font-semibold">Certificate Issued & QR Code Stamped!</p>
          <p className="font-mono text-xs break-all">Doc Hash: {result.docHash}</p>
          {result.txHash && (
            <p className="font-mono text-xs break-all">Tx Hash: {result.txHash}</p>
          )}
          <p className="text-xs">Stamped PDF download started automatically.</p>
        </div>
      )}

      <form onSubmit={handleIssue} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Certificate ID *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. CERT-2026-001"
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Name
            </label>
            <input
              type="text"
              placeholder="e.g. Jane Doe"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course / Credential
            </label>
            <input
              type="text"
              placeholder="e.g. Blockchain Development"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiration Date <span className="text-gray-400 font-normal">(Leave blank if it never expires)</span>
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Certificate PDF File *
          </label>
          <input
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition disabled:bg-blue-300"
        >
          {loading ? "Generating QR & Registering..." : "Issue & Stamp Certificate"}
        </button>
      </form>
    </div>
  );
}
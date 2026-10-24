import React, { useState, useEffect } from "react";

const Activity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || "Failed to load audit logs");
      }
    } catch (err) {
      setError("Unable to reach backend server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action) => {
    switch (action) {
      case "CERTIFICATE_ISSUED":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">Issued</span>;
      case "CERTIFICATE_REVOKED":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">Revoked</span>;
      case "ISSUER_ADDED":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">Issuer Added</span>;
      case "ISSUER_REMOVED":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">Issuer Removed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">{action}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity & Audit Log</h1>
          <p className="text-sm text-gray-500">Immutable trace of on-chain issuance and authority management</p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition"
        >
          Refresh Logs
        </button>
      </div>

      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading audit history...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No recorded activities yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b">
                <tr>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Identifier / Target</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 font-mono text-xs font-medium text-gray-900">
                      {log.certId || log.issuerAddress || "—"}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {log.action === "CERTIFICATE_ISSUED" && (
                        <span>
                          Issued to <b>{log.recipientName}</b> for {log.courseName}
                          {log.expiresAt ? ` (Expires: ${new Date(log.expiresAt * 1000).toLocaleDateString()})` : " (No Expiry)"}
                        </span>
                      )}
                      {log.action === "CERTIFICATE_REVOKED" && <span>Reason: {log.reason}</span>}
                      {log.action === "ISSUER_ADDED" && <span>Name: {log.issuerName}</span>}
                      {log.action === "ISSUER_REMOVED" && <span>Removed by admin</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {log.txHash ? (
                        <span className="text-blue-600 truncate max-w-[120px] inline-block" title={log.txHash}>
                          {log.txHash.slice(0, 10)}...
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Activity;
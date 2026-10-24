import React, { useState, useEffect } from "react";

const Admin = () => {
  const [issuers, setIssuers] = useState([]);
  const [addressInput, setAddressInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  const loadIssuers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/issuers");
      const data = await res.json();
      if (data.success) {
        setIssuers(data.issuers || []);
      }
    } catch (err) {
      setStatusMessage({ text: "Could not load issuer list from node", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssuers();
  }, []);

  const handleAddIssuer = async (e) => {
    e.preventDefault();
    if (!addressInput || !nameInput) return;

    try {
      setStatusMessage({ text: "Submitting transaction...", type: "info" });
      const res = await fetch("/api/issuers/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerAddress: addressInput, name: nameInput }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: "Issuer successfully added!", type: "success" });
        setAddressInput("");
        setNameInput("");
        loadIssuers();
      } else {
        setStatusMessage({ text: data.error || "Failed to add issuer", type: "error" });
      }
    } catch (err) {
      setStatusMessage({ text: "Request failed", type: "error" });
    }
  };

  const handleRemoveIssuer = async (issuerAddress) => {
    try {
      setStatusMessage({ text: "Revoking issuer role...", type: "info" });
      const res = await fetch("/api/issuers/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: "Issuer role revoked.", type: "success" });
        loadIssuers();
      } else {
        setStatusMessage({ text: data.error || "Failed to remove issuer", type: "error" });
      }
    } catch (err) {
      setStatusMessage({ text: "Network error", type: "error" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Issuer Administration</h1>
      <p className="text-sm text-gray-500 mb-6">Authorize or remove institution addresses permitted to issue certificates.</p>

      {statusMessage.text && (
        <div
          className={`p-4 mb-6 text-sm rounded-lg ${
            statusMessage.type === "success"
              ? "bg-green-100 text-green-800"
              : statusMessage.type === "error"
              ? "bg-red-100 text-red-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Add Issuer Form */}
      <form onSubmit={handleAddIssuer} className="bg-white border rounded-xl p-5 shadow-sm mb-8 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Register New Issuer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Wallet Address (0x...)"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Department / Institution Name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition"
        >
          Authorize Issuer
        </button>
      </form>

      {/* Issuers Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">Current Issuers</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading issuers...</div>
        ) : (
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {issuers.map((issuer) => (
                <tr key={issuer.address} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{issuer.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-600">{issuer.address}</td>
                  <td className="py-3 px-4">
                    {issuer.isActive ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-600">Revoked</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {issuer.isActive && (
                      <button
                        onClick={() => handleRemoveIssuer(issuer.address)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Revoke Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Admin;
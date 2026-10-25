const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const QRCode = require("qrcode");
const { PDFDocument } = require("pdf-lib");
const { ethers } = require("ethers");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// 1. Data Directories & Activity Log Persistence
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve("data");
const LOGS_FILE = path.join(DATA_DIR, "activity-logs.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), "utf8");
}

function logActivity(action, details = {}) {
  try {
    const raw = fs.readFileSync(LOGS_FILE, "utf8");
    const logs = JSON.parse(raw || "[]");
    const entry = {
      id: crypto.randomUUID(),
      action,
      timestamp: new Date().toISOString(),
      ...details,
    };
    logs.unshift(entry);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, 500), null, 2), "utf8");
    return entry;
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
}

// ---------------------------------------------------------------------------
// 2. Blockchain / Contract Setup (Ethers v6)
// ---------------------------------------------------------------------------
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DEFAULT_HARDHAT_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const PRIVATE_KEY = process.env.PRIVATE_KEY || DEFAULT_HARDHAT_PK;

let contractAddressEnv = process.env.CONTRACT_ADDRESS;
try {
  const contractConfigPath = path.resolve("config/contract.json");
  if (!contractAddressEnv && fs.existsSync(contractConfigPath)) {
    const configData = JSON.parse(fs.readFileSync(contractConfigPath, "utf8"));
    contractAddressEnv = configData.address;
  }
} catch (e) {
  // ignore
}

const CONTRACT_ADDRESS = contractAddressEnv;

let registryContract = null;
let provider = null;
let signer = null;

try {
  const artifactPath = path.resolve(
    "artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json"
  );
  if (fs.existsSync(artifactPath) && CONTRACT_ADDRESS && PRIVATE_KEY) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    provider = new ethers.JsonRpcProvider(RPC_URL);
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    registryContract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
    console.log("Connected to CertificateRegistry at:", CONTRACT_ADDRESS);
  } else {
    console.warn("Notice: Contract details or env variables not configured yet. Running in offline mode.");
  }
} catch (error) {
  console.warn("Could not load contract artifact:", error.message);
}

// ---------------------------------------------------------------------------
// 3. Helper: QR Code Stamping on PDF
// ---------------------------------------------------------------------------
async function stampQRCodeOnPDF(pdfBuffer, verifyUrl) {
  const qrImageBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 120,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const qrImage = await pdfDoc.embedPng(qrImageBuffer);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width } = firstPage.getSize();

  const qrSize = 75;
  const margin = 25;

  firstPage.drawImage(qrImage, {
    x: width - qrSize - margin,
    y: margin,
    width: qrSize,
    height: qrSize,
  });

  return await pdfDoc.save();
}

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

// ---------------------------------------------------------------------------
// 4. API Endpoints
// ---------------------------------------------------------------------------

// Audit / Activity Log
app.get("/api/logs", (req, res) => {
  try {
    const raw = fs.readFileSync(LOGS_FILE, "utf8");
    const logs = JSON.parse(raw || "[]");
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ error: "Failed to retrieve logs" });
  }
});

// Multi-Issuer: Get All Issuers
app.get("/api/issuers", async (req, res) => {
  try {
    if (!registryContract) {
      return res.status(503).json({ error: "Blockchain contract not connected." });
    }
    const [addrs, names, statuses] = await registryContract.getAllIssuers();
    const issuers = addrs.map((addr, idx) => ({
      address: addr,
      name: names[idx],
      isActive: statuses[idx],
    }));
    return res.json({ success: true, issuers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Multi-Issuer: Add Issuer
app.post("/api/issuers/add", async (req, res) => {
  try {
    const { issuerAddress, name } = req.body;
    if (!issuerAddress || !name) {
      return res.status(400).json({ error: "issuerAddress and name required" });
    }
    if (!registryContract) {
      return res.status(503).json({ error: "Blockchain contract not connected." });
    }

    const tx = await registryContract.addIssuer(issuerAddress, name);
    await tx.wait();

    logActivity("ISSUER_ADDED", {
      issuerAddress,
      issuerName: name,
      addedBy: await signer.getAddress(),
      txHash: tx.hash,
    });

    return res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Multi-Issuer: Remove Issuer
app.post("/api/issuers/remove", async (req, res) => {
  try {
    const { issuerAddress } = req.body;
    if (!issuerAddress) {
      return res.status(400).json({ error: "issuerAddress required" });
    }
    if (!registryContract) {
      return res.status(503).json({ error: "Blockchain contract not connected." });
    }

    const tx = await registryContract.removeIssuer(issuerAddress);
    await tx.wait();

    logActivity("ISSUER_REMOVED", {
      issuerAddress,
      removedBy: await signer.getAddress(),
      txHash: tx.hash,
    });

    return res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Certificate Issuance (QR Stamping + Expiry)
app.post("/api/issue", upload.single("file"), async (req, res) => {
  try {
    const { certId, recipientName, courseName, expiresAt } = req.body;

    if (!certId) {
      return res.status(400).json({ error: "certId is required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Certificate PDF file is required" });
    }

    const expirationTimestamp = expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : 0;

    const clientBaseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const verificationUrl = `${clientBaseUrl}/verify?id=${encodeURIComponent(certId)}`;

    const stampedPdfBytes = await stampQRCodeOnPDF(req.file.buffer, verificationUrl);

    const docHashBytes = crypto.createHash("sha256").update(Buffer.from(stampedPdfBytes)).digest();
    const docHash = ethers.hexlify(docHashBytes);

    let txHash = null;
    if (registryContract) {
      const tx = await registryContract.issueCertificate(certId, docHash, expirationTimestamp);
      await tx.wait();
      txHash = tx.hash;
    }

    const currentSignerAddr = signer ? await signer.getAddress() : "0x0000000000000000000000000000000000000000";
    logActivity("CERTIFICATE_ISSUED", {
      certId,
      recipientName: recipientName || "N/A",
      courseName: courseName || "N/A",
      docHash,
      issuer: currentSignerAddr,
      expiresAt: expirationTimestamp,
      txHash,
    });

    return res.json({
      success: true,
      certId,
      docHash,
      expiresAt: expirationTimestamp,
      txHash,
      pdfBase64: Buffer.from(stampedPdfBytes).toString("base64"),
    });
  } catch (err) {
    console.error("Issuance failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Certificate Revocation
app.post("/api/revoke", async (req, res) => {
  try {
    const { certId, reason } = req.body;
    if (!certId) {
      return res.status(400).json({ error: "certId required" });
    }
    if (!registryContract) {
      return res.status(503).json({ error: "Blockchain contract not connected." });
    }

    const tx = await registryContract.revokeCertificate(certId);
    await tx.wait();

    const caller = await signer.getAddress();
    logActivity("CERTIFICATE_REVOKED", {
      certId,
      reason: reason || "Revoked by issuer",
      revokedBy: caller,
      txHash: tx.hash,
    });

    return res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Verification Route
app.get("/api/verify/:certId", async (req, res) => {
  try {
    const { certId } = req.params;
    if (!registryContract) {
      return res.status(503).json({ error: "Blockchain contract not connected." });
    }

    const result = await registryContract.verifyById(certId);
    const [exists, docHash, issuer, issuerName, issuedAt, expiresAt, isRevoked, isExpired] = result;

    return res.json({
      success: true,
      exists,
      docHash,
      issuer,
      issuerName,
      issuedAt: Number(issuedAt),
      expiresAt: Number(expiresAt),
      isRevoked,
      isExpired,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`CertChain backend listening on http://localhost:${PORT}`);
});

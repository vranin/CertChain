/**
 * server.js
 * Express API server for the Blockchain Certificate Verification System.
 *
 * Run order:
 *   1. npx hardhat node           (terminal 1)
 *   2. npm run compile && npm run deploy && npm start   (terminal 2)
 */

"use strict";

const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const CHAIN_URL = "http://127.0.0.1:8545";

// Well-known Hardhat account #0 private key (safe for local dev only)
const ISSUER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Load deployed contract config (written by scripts/deploy.js)
const CONTRACT_CONFIG_PATH = path.join(__dirname, "config", "contract.json");

function loadContractConfig() {
  if (!fs.existsSync(CONTRACT_CONFIG_PATH)) {
    console.error(
      "ERROR: config/contract.json not found. Run `npm run deploy` first."
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONTRACT_CONFIG_PATH, "utf8"));
}

const { address: CONTRACT_ADDRESS, abi: CONTRACT_ABI } = loadContractConfig();

// ─── Ethers setup ─────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(CHAIN_URL);
const signer = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
const contractReader = contract.connect(provider); // read-only for non-signed calls

// ─── Express setup ────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Multer – store uploads in memory so we can hash the exact bytes received
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 of a Buffer and return it as a 0x-prefixed hex bytes32.
 */
function sha256Bytes32(buf) {
  const hex = crypto.createHash("sha256").update(buf).digest("hex");
  return "0x" + hex;
}

/**
 * Generate a certificate PDF and return the raw Buffer.
 * The QR code encodes the verify URL so verifiers can scan and check.
 */
async function generateCertificatePDF({ certId, studentName, course, issuedAt }) {
  const verifyUrl = `http://localhost:${PORT}/verify?id=${certId}`;

  // Generate QR code as a PNG buffer
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 120,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 60,
      info: { Title: "Certificate of Completion", Author: "CertChain Institute" },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const M = 48; // margin

    // ── Outer border ──────────────────────────────────────────────────────────
    doc
      .rect(M, M, W - M * 2, H - M * 2)
      .lineWidth(3)
      .strokeColor("#0f172a")
      .stroke();

    doc
      .rect(M + 6, M + 6, W - (M + 6) * 2, H - (M + 6) * 2)
      .lineWidth(1)
      .strokeColor("#475569")
      .stroke();

    // ── Header band ───────────────────────────────────────────────────────────
    doc.rect(M, M, W - M * 2, 80).fillColor("#0f172a").fill();

    doc
      .fillColor("#10b981")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("CertChain Institute", M + 20, M + 14, { width: W - M * 2 - 40, align: "center" });

    doc
      .fillColor("#f8fafc")
      .fontSize(22)
      .text("CERTIFICATE OF COMPLETION", M + 20, M + 34, {
        width: W - M * 2 - 40,
        align: "center",
      });

    // ── Body ──────────────────────────────────────────────────────────────────
    let y = M + 110;

    doc
      .fillColor("#475569")
      .fontSize(12)
      .font("Helvetica")
      .text("This is to certify that", 0, y, { align: "center" });

    y += 32;
    doc
      .fillColor("#0f172a")
      .fontSize(32)
      .font("Helvetica-Bold")
      .text(studentName, 0, y, { align: "center" });

    // Decorative line under name
    const lineY = y + 46;
    doc
      .moveTo(W / 2 - 120, lineY)
      .lineTo(W / 2 + 120, lineY)
      .lineWidth(1.5)
      .strokeColor("#10b981")
      .stroke();

    y = lineY + 20;
    doc
      .fillColor("#475569")
      .fontSize(12)
      .font("Helvetica")
      .text("has successfully completed the course", 0, y, { align: "center" });

    y += 28;
    doc
      .fillColor("#0f172a")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(course, 0, y, { align: "center" });

    y += 40;
    const dateStr = new Date(issuedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc
      .fillColor("#64748b")
      .fontSize(11)
      .font("Helvetica")
      .text(`Date of Issue: ${dateStr}`, 0, y, { align: "center" });

    // ── Issuer signature ──────────────────────────────────────────────────────
    y += 80;
    const sigX = W / 2 - 80;
    doc
      .moveTo(sigX, y)
      .lineTo(sigX + 160, y)
      .lineWidth(1)
      .strokeColor("#94a3b8")
      .stroke();

    doc
      .fillColor("#475569")
      .fontSize(10)
      .text("Authorized Signatory", 0, y + 6, { align: "center" });

    doc
      .fillColor("#10b981")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("CertChain Institute", 0, y + 20, { align: "center" });

    // ── QR code (bottom-right) ────────────────────────────────────────────────
    const qrSize = 90;
    const qrX = W - M - qrSize - 20;
    const qrY = H - M - qrSize - 40;
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc
      .fillColor("#94a3b8")
      .fontSize(7)
      .font("Helvetica")
      .text("Scan to verify", qrX, qrY + qrSize + 2, { width: qrSize, align: "center" });

    // ── Certificate ID (bottom strip) ─────────────────────────────────────────
    const stripY = H - M - 28;
    doc
      .rect(M, stripY, W - M * 2, 28)
      .fillColor("#f1f5f9")
      .fill();

    doc
      .fillColor("#64748b")
      .fontSize(8)
      .font("Helvetica")
      .text(`Certificate ID: ${certId}`, M + 10, stripY + 9, {
        width: W - M * 2 - 20,
        align: "left",
      });

    doc
      .fillColor("#94a3b8")
      .fontSize(8)
      .text("Verify at: certchain.local", M + 10, stripY + 9, {
        width: W - M * 2 - 20,
        align: "right",
      });

    doc.end();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/issue
 * Multipart form: fields studentName + course, file field "certificate" (PDF).
 *
 * The issuer uploads an existing certificate PDF they already have.
 * The server hashes it and registers the hash on-chain.
 * The same PDF can later be uploaded on the verify page to confirm authenticity.
 */
app.post("/api/issue", upload.single("certificate"), async (req, res) => {
  try {
    const { studentName, course } = req.body;
    if (!studentName || !course) {
      return res.status(400).json({ error: "studentName and course are required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "A certificate PDF file is required" });
    }

    const certId = `CERT-${Date.now()}`;

    // 1. Hash the uploaded PDF bytes exactly as received
    const pdfBuffer = req.file.buffer;
    const hashHex = sha256Bytes32(pdfBuffer);

    // 2. Register the hash on-chain
    const tx = await contract.issueCertificate(certId, hashHex, studentName, course);
    const receipt = await tx.wait();

    // 3. Return metadata — the issuer keeps the original PDF
    res.json({
      certId,
      txHash: receipt.hash,
      hash: hashHex,
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error("Issue error:", err);
    res.status(500).json({ error: err.message || "Failed to issue certificate" });
  }
});

/**
 * POST /api/verify-file
 * Multipart: field name "certificate" -> PDF file.
 * Hashes the uploaded file and queries the chain by hash.
 */
app.post("/api/verify-file", upload.single("certificate"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const hashHex = sha256Bytes32(req.file.buffer);
    const [exists, revoked, certId, studentName, course, issuedAt] =
      await contractReader.verifyByHash(hashHex);

    res.json({
      hash: hashHex,
      exists,
      revoked,
      certId,
      studentName,
      course,
      issuedAt: exists ? Number(issuedAt) * 1000 : null, // convert to ms
    });
  } catch (err) {
    console.error("Verify-file error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/verify-id/:id
 * Looks up a certificate by its ID.
 */
app.get("/api/verify-id/:id", async (req, res) => {
  try {
    const certId = req.params.id;
    const [exists, revoked, id, studentName, course, issuedAt] =
      await contractReader.verifyById(certId);

    res.json({
      exists,
      revoked,
      certId: id,
      studentName,
      course,
      issuedAt: exists ? Number(issuedAt) * 1000 : null,
    });
  } catch (err) {
    console.error("Verify-id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/revoke
 * Body: { certId: string }
 * Revokes a certificate on-chain.
 */
app.post("/api/revoke", async (req, res) => {
  try {
    const { certId } = req.body;
    if (!certId) return res.status(400).json({ error: "certId is required" });

    const tx = await contract.revokeCertificate(certId);
    const receipt = await tx.wait();

    res.json({ success: true, certId, txHash: receipt.hash });
  } catch (err) {
    console.error("Revoke error:", err);
    res.status(500).json({ error: err.reason || err.message || "Revoke failed" });
  }
});

/**
 * GET /api/certificates
 * Returns all issued certificates (from CertificateIssued events) with revoke status.
 *
 * NOTE: certId is indexed in the event, so `e.args.certId` comes back as a topic hash.
 * We use the non-indexed `studentName` and `course` args directly, and recover the
 * certId by calling verifyByHash using the non-indexed `hash` arg.
 */
app.get("/api/certificates", async (req, res) => {
  try {
    // Query CertificateIssued events from block 0
    const issuedFilter = contract.filters.CertificateIssued();
    const issuedEvents = await contract.queryFilter(issuedFilter, 0, "latest");

    // For each issued event, recover the certId via verifyByHash (hash IS non-indexed)
    const certificates = await Promise.all(
      issuedEvents.map(async (e) => {
        const block = await e.getBlock();
        const hash = e.args.hash; // non-indexed bytes32 — readable directly

        // verifyByHash gives us the real certId string
        const [, revoked, certId] = await contractReader.verifyByHash(hash);

        return {
          certId,
          studentName: e.args.studentName,
          course: e.args.course,
          issuedAt: block.timestamp * 1000,
          revoked,
        };
      })
    );

    const revokedCount = certificates.filter((c) => c.revoked).length;
    res.json({ certificates, total: certificates.length, revoked: revokedCount });
  } catch (err) {
    console.error("Certificates list error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Static file serving (production build) ───────────────────────────────────

const clientDist = path.join(__dirname, "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Return index.html for any non-/api route so React Router can handle it
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (req, res) =>
    res.json({ message: "API running. Build the client with `npm run build:client`." })
  );
}

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nCertChain server running at http://localhost:${PORT}`);
  console.log(`Contract address: ${CONTRACT_ADDRESS}`);
  console.log(`Issuer (account #0): ${signer.address}\n`);
});

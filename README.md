# CertChain — Blockchain-Based Certificate Verification System

A mini project that issues tamper-proof academic certificates by storing their SHA-256 hash on a local Ethereum blockchain (Hardhat). Only the hash goes on-chain — the PDF stays off.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Git (optional) | any |

---

## Setup

```bash
# 1. Install root dependencies (Hardhat, Express, ethers, pdfkit, qrcode…)
cd blockchain-cert-verifier
npm install

# 2. Install frontend dependencies (React, Vite, Tailwind…)
npm install --prefix client
```

---

## Run Order (3 terminals)

### Terminal 1 — Start local blockchain
```bash
npm run node
```
This starts a Hardhat in-process Ethereum node on `http://127.0.0.1:8545` with 20 funded test accounts.

### Terminal 2 — Compile, deploy, and start API server
```bash
npm run compile   # Solidity -> artifacts/
npm run deploy    # Deploys contract, writes config/contract.json
npm start         # Express API on http://localhost:3000
```

### Terminal 3 — Start the React dev server (development)
```bash
npm run client    # Vite dev server on http://localhost:5173
```

**OR** build the client and open the production URL:
```bash
npm run build:client
# Then open http://localhost:3000 (Express serves client/dist)
```

---

## Demo Script

1. **Issue a certificate**
   - Open `http://localhost:5173/issue`
   - Enter a student name and course → click "Issue Certificate"
   - Wait ~2 s for the blockchain transaction
   - Download the PDF

2. **Verify the original PDF** → should show **VALID**
   - Go to `/verify` → Upload PDF tab → drag in the downloaded PDF

3. **Scan QR code** → open the link → auto-verifies by ID → **VALID**

4. **Tamper test** → open the PDF in a text editor, change one character, save, re-upload → **NOT FOUND**

5. **Revoke** → back on `/issue`, click "Revoke" next to the certificate → confirm

6. **Verify after revoke** → upload original PDF again → **REVOKED**

---

## Architecture

```
┌──────────────┐       HTTPS/REST        ┌─────────────────────┐
│  React SPA   │ ──────────────────────► │  Express API        │
│  (Vite)      │                         │  server.js          │
└──────────────┘                         │                     │
                                         │  - /api/issue       │
                                         │  - /api/verify-file │
                                         │  - /api/verify-id   │
                                         │  - /api/revoke      │
                                         │  - /api/certificates│
                                         └────────┬────────────┘
                                                  │ ethers v6
                                                  ▼
                                         ┌─────────────────────┐
                                         │  Hardhat Node       │
                                         │  (local EVM)        │
                                         │                     │
                                         │  CertificateRegistry│
                                         │  .sol               │
                                         └─────────────────────┘
```

### What goes on-chain
- Certificate ID (string)
- SHA-256 hash of the PDF (bytes32)
- Student name, course (strings)
- Unix timestamp (uint256)
- Revoked flag (bool)

### What stays off-chain
- The PDF file itself
- Any personally sensitive data beyond name/course

---

## File Structure

```
blockchain-cert-verifier/
├── contracts/
│   └── CertificateRegistry.sol   ← Solidity contract
├── test/
│   └── CertificateRegistry.test.js ← Hardhat/Chai tests
├── scripts/
│   └── deploy.js                 ← Deploys & writes config/contract.json
├── config/
│   └── contract.json             ← Auto-generated: address + ABI
├── client/                       ← Vite + React + Tailwind frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Issue.jsx
│   │   │   └── Verify.jsx
│   │   └── components/
│   │       ├── Navbar.jsx
│   │       └── Footer.jsx
│   └── vite.config.js
├── server.js                     ← Express API
├── hardhat.config.js
├── package.json
├── README.md
└── docs/
    └── VIVA_NOTES.md
```

---

## Run Tests

```bash
# Keep the Hardhat node running (Terminal 1), then:
npm test
```

All 11 tests should pass.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `config/contract.json not found` | Run `npm run deploy` first |
| Port 8545 in use | Kill other Hardhat nodes |
| `ECONNREFUSED` on API calls | Start Express with `npm start` |
| PDF opens blank in browser | Download it and open with a PDF reader |

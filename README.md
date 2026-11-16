# CertChain — Blockchain-Based Certificate Verification System

A mini project that issues tamper-proof academic certificates by storing their SHA-256 hash on a local Ethereum blockchain (Hardhat). Only the hash goes on-chain — the PDF stays off.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Git | any |
| MetaMask Browser Extension | latest |

---

## Quick Start (Clone & Run)

### Linux / macOS

```bash
# 1. Clone the repository
git clone https://github.com/vranin/CertChain.git
cd CertChain

# 2. Install root dependencies (Hardhat, Express, ethers, pdfkit, qrcode…)
npm install

# 3. Install frontend dependencies (React, Vite, Tailwind…)
npm install --prefix client

# 4. Terminal 1: Start local blockchain
npm run node

# 5. Terminal 2: Compile, deploy, and start API server
npm run compile
npm run deploy
npm start

# 6. Terminal 3: Start the React dev server
npm run dev --prefix client
# OR: npm run client
```

### Windows (Command Prompt / PowerShell)

```cmd
:: 1. Clone the repository
git clone https://github.com/vranin/CertChain.git
cd CertChain

:: 2. Install root dependencies
npm install

:: 3. Install frontend dependencies
npm install --prefix client

:: 4. Terminal 1: Start local blockchain (open new terminal window)
npm run node

:: 5. Terminal 2: Compile, deploy, and start API server (open new terminal window)
npm run compile
npm run deploy
npm start

:: 6. Terminal 3: Start the React dev server (open new terminal window)
npm run dev --prefix client
:: OR: npm run client
```

### Windows (Git Bash / WSL)

Same commands as **Linux / macOS** above.

---

## MetaMask Setup (Free Local Testnet)

1. Install **MetaMask** browser extension.
2. Click the network dropdown → **Add Network** → **Add a network manually**.
3. Enter:
   - **Network Name**: `Hardhat Local`
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
4. Click **Save**.
5. **Import test account** (free 10,000 ETH):
   - In Terminal 1 (Hardhat node), copy any private key shown (e.g., `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).
   - MetaMask → Account menu → **Add account or hardware wallet** → **Import account** → Paste private key → **Import**.

---

## Run Order (3 Terminals Required)

| Terminal | Command | Purpose |
|----------|---------|---------|
| 1 | `npm run node` | Starts Hardhat node on `http://127.0.0.1:8545` |
| 2 | `npm run compile && npm run deploy && npm start` | Compiles contract, deploys, starts Express API on `http://localhost:5000` |
| 3 | `npm run dev --prefix client` | Starts Vite React dev server on `http://localhost:5173` |

> **Note**: Keep all three terminals running simultaneously. The Hardhat node must stay running for blockchain transactions to work.

---

## Demo Script

1. **Issue a certificate**
   - Open `http://localhost:5173/issue`
   - Connect MetaMask wallet (click **Connect Wallet** in navbar)
   - Fill in: Certificate ID (or click **Auto-Generate ID**), Recipient Name, Course, Expiration Date (optional)
   - Upload a PDF template file
   - Click **Issue & Stamp Certificate**
   - Wait ~2 seconds for blockchain confirmation
   - Stamped PDF with QR code downloads automatically

2. **Verify by PDF upload** → should show **VALID**
   - Go to `/verify` → **Upload PDF** tab → drag in the downloaded `_stamped.pdf`
   - Do **not** open/re-save the PDF in a PDF reader before verifying (this changes the hash)

3. **Verify by QR Code** → scan QR on certificate → opens `/verify?id=<CERT-ID>` → **VALID**

4. **Tamper test** → open PDF in text editor, change one character, save, re-upload → **NOT FOUND**

5. **Revoke certificate** → go to `/issue`, click **Revoke** next to the certificate → confirm

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
                                         │  - /api/issuers     │
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
- SHA-256 hash of the **stamped** PDF (bytes32)
- Issuer address, issuance timestamp, expiration timestamp
- Revoked flag (bool)

### What stays off-chain
- The PDF file itself
- Student name & course (stored in local activity logs for display)

---

## File Structure

```
CertChain/
├── contracts/
│   └── CertificateRegistry.sol   ← Solidity contract
├── test/
│   └── CertificateRegistry.test.js ← Hardhat/Chai tests
├── scripts/
│   └── deploy.js                 ← Deploys & writes config/contract.json
├── config/
│   └── contract.json             ← Auto-generated: address + ABI
├── data/
│   └── activity-logs.json        ← Local issuance/revocation audit log
├── client/                       ← Vite + React + Tailwind frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Issue.jsx
│   │   │   └── Verify.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── Footer.jsx
│   │   └── utils/
│   │       └── wallet.js         ← MetaMask/EIP-1193 integration
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

All 7 tests should pass (multi-issuer roles, expiry, revocation permissions).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `config/contract.json not found` | Run `npm run deploy` first |
| Port 8545 in use | Kill other Hardhat nodes: `lsof -ti:8545 \| xargs kill -9` (Linux) / `netstat -ano \| findstr :8545` then `taskkill /PID <pid> /F` (Windows) |
| Port 5000 in use | Change port: `PORT=5001 npm start` |
| `ECONNREFUSED` on API calls | Ensure Express is running (`npm start` in Terminal 2) |
| PDF opens blank in browser | Download it and open with a PDF reader |
| "MetaMask not detected" | Open `http://localhost:5173` in a normal browser tab (not an embedded preview/iframe) |
| Verification shows **NOT FOUND** | Ensure you uploaded the downloaded `_stamped.pdf` (not the original), and Hardhat node wasn't restarted |
| Contract call fails | Ensure `npm run deploy` ran after `npm run node` and before `npm start` |
| Duplicate Certificate ID error | Click **Auto-Generate ID** for a unique `CERT-YYYY-XXXXXXXXXX` format |

---

## License

MIT License — feel free to use for learning, hackathons, or college projects.
# VIVA NOTES — Blockchain Certificate Verification System

Prepared for mini project viva. Read once the night before — these are the questions examiners always ask.

---

## Q1: Why store only the hash on-chain, not the PDF?

**Answer:**

Blockchains are public, append-only ledgers. Storing a full PDF would mean:
- **Privacy violation** — anyone can read it forever.
- **Cost** — on a real network like Ethereum, every byte costs gas money. A 200 KB PDF would cost hundreds of dollars.
- **Scalability** — nodes must store every byte of the chain forever.

The SHA-256 hash is only 32 bytes. It is a unique "fingerprint" of the file. If the file is unchanged, the hash matches. If even one byte changes, the hash is completely different. So the hash gives us **proof of integrity without exposing the content**.

---

## Q2: What happens if the issuer's private key is compromised?

**Answer:**

The private key in our project (`0xac0974bec3…`) is the well-known Hardhat test key — it is **not secret** and only works on the local chain. For a real deployment:

- An attacker with the private key could issue fake certificates or revoke real ones.
- Mitigation: Use a **hardware wallet / HSM** for the issuer key so the private key never leaves secure hardware.
- Mitigation: Use a **multi-signature scheme** — require 2-of-3 authorized signers to approve issuance.
- Mitigation: Emit **events** so a monitoring service can detect anomalous behaviour.

---

## Q3: Advantages over a centralized database

| Aspect | Centralized DB | Blockchain |
|--------|----------------|-----------|
| Single point of failure | Yes | No |
| Tamper-proof | No (admin can edit rows) | Yes (immutable once confirmed) |
| Trust required | Yes (trust the owner) | No (math/cryptography) |
| Auditability | Requires access to logs | All events are public |
| 24/7 availability | Depends on hosting | Node runs as long as one validator is up |

---

## Q4: Limitations of this system

1. **The chain proves issuance, not truthfulness.** If Alice never completed the course but the issuer issues her a certificate anyway, the blockchain will say it is VALID. The blockchain only proves "this hash was registered by this key at this time" — not that the underlying fact is true.

2. **Key centralisation.** There is still one issuer key. If that key is lost or stolen, everything breaks. A real system would use a governance contract with multiple signers.

3. **Local blockchain only.** Our Hardhat node resets every time it restarts. On a public testnet (Sepolia) or mainnet, data would be permanent.

4. **No identity layer.** Anyone with the right certId can verify. There is no login or role-based access for verifiers.

5. **PDF link in QR is localhost.** In production, this would be a public domain.

---

## Q5: Future work / improvements

| Feature | Description |
|---------|-------------|
| **Testnet / Mainnet** | Deploy to Sepolia or Polygon for real permanence |
| **IPFS storage** | Store the encrypted PDF on IPFS; hash the IPFS CID on-chain |
| **MetaMask integration** | Let the browser wallet sign transactions; no server-side private key |
| **Multi-issuer roles** | A governance contract with multiple authorized issuers (e.g. per department) |
| **Batch issuance** | Issue certificates for an entire batch in one transaction |
| **Expiry dates** | Add an `expiresAt` timestamp field for time-limited certifications |
| **ENS / DID** | Use Ethereum Name Service or Decentralized Identifiers for the issuer |

---

## Quick Technical Summary (30-second elevator pitch)

> "We generate a certificate PDF for the student. We compute its SHA-256 hash — a 64-character fingerprint. Only that hash goes on the Ethereum blockchain, along with the student's name, course, and a timestamp. To verify, anyone uploads the PDF; we recompute the hash and ask the smart contract: 'Do you know this hash?' The contract replies VALID, REVOKED, or NOT FOUND. No central server can tamper with the registry because the blockchain is immutable."

---

## Key Code Concepts

- **`bytes32 hash`** — Solidity type for exactly 32 bytes, fits a SHA-256 digest perfectly.
- **`mapping(string => Certificate)`** — O(1) lookup by certificate ID.
- **`mapping(bytes32 => string)`** — Reverse index prevents issuing two certificates with the same PDF.
- **`event CertificateIssued`** — Emitted on issuance; the frontend reads these events to build the registry list without needing a database.
- **`onlyOwner modifier`** — Guard that reverts the transaction if `msg.sender != owner`, ensuring only the deployer can issue/revoke.
- **`ethers.JsonRpcProvider`** — Connects the Node.js backend to the local Hardhat chain.
- **`contract.queryFilter`** — Reads past events from the blockchain (used by `/api/certificates`).

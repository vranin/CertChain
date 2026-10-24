const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry", function () {
  let registry, owner, other;

  // Fake 32-byte hashes (keccak256 of a string — fine as placeholder bytes32)
  const HASH_1 = ethers.id("certificate-pdf-content-1");
  const HASH_2 = ethers.id("certificate-pdf-content-2");

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateRegistry");
    registry = await Factory.deploy();
  });

  // ── Issuance ──────────────────────────────────────────────────────────────

  it("owner can issue a certificate", async function () {
    const tx = await registry.issueCertificate("CERT-001", HASH_1, "Alice", "Computer Science");
    const receipt = await tx.wait();

    // Check event was emitted — use receipt log parsing to avoid indexed-param timestamp race
    const parsed = parseEvent(registry, receipt, "CertificateIssued");
    expect(parsed).to.not.be.null;
    expect(parsed.args.studentName).to.equal("Alice");
    expect(parsed.args.course).to.equal("Computer Science");

    // Verify on-chain storage
    const [exists, revoked, certId, name, course] = await registry.verifyById("CERT-001");
    expect(exists).to.be.true;
    expect(revoked).to.be.false;
    expect(certId).to.equal("CERT-001");
    expect(name).to.equal("Alice");
    expect(course).to.equal("Computer Science");
  });

  it("reverts on duplicate certificate ID", async function () {
    await registry.issueCertificate("CERT-002", HASH_1, "Bob", "Math");
    await expect(
      registry.issueCertificate("CERT-002", HASH_2, "Carol", "Physics")
    ).to.be.revertedWith("Certificate ID already exists");
  });

  it("reverts on duplicate hash", async function () {
    await registry.issueCertificate("CERT-003", HASH_1, "Dave", "Biology");
    await expect(
      registry.issueCertificate("CERT-004", HASH_1, "Eve", "Chemistry")
    ).to.be.revertedWith("Hash already registered");
  });

  it("non-owner cannot issue a certificate", async function () {
    await expect(
      registry.connect(other).issueCertificate("CERT-005", HASH_1, "Frank", "Law")
    ).to.be.revertedWith("Not owner");
  });

  // ── Revocation ────────────────────────────────────────────────────────────

  it("owner can revoke a certificate", async function () {
    await registry.issueCertificate("CERT-006", HASH_1, "Grace", "Art");
    const tx = await registry.revokeCertificate("CERT-006");
    const receipt = await tx.wait();

    // Check CertificateRevoked event exists and has a reasonable timestamp
    const parsed = parseEvent(registry, receipt, "CertificateRevoked");
    expect(parsed).to.not.be.null;
    expect(parsed.args.revokedAt).to.be.gt(0n);

    // Confirm the revoked flag flipped
    const [, revoked] = await registry.verifyById("CERT-006");
    expect(revoked).to.be.true;
  });

  it("non-owner cannot revoke a certificate", async function () {
    await registry.issueCertificate("CERT-007", HASH_1, "Heidi", "Music");
    await expect(
      registry.connect(other).revokeCertificate("CERT-007")
    ).to.be.revertedWith("Not owner");
  });

  it("reverts on double revoke", async function () {
    await registry.issueCertificate("CERT-008", HASH_1, "Ivan", "Sports");
    await registry.revokeCertificate("CERT-008");
    await expect(registry.revokeCertificate("CERT-008")).to.be.revertedWith("Already revoked");
  });

  it("reverts when revoking non-existent certificate", async function () {
    await expect(registry.revokeCertificate("CERT-GHOST")).to.be.revertedWith(
      "Certificate not found"
    );
  });

  // ── Verification ──────────────────────────────────────────────────────────

  it("verifyByHash returns correct data", async function () {
    await registry.issueCertificate("CERT-009", HASH_1, "Judy", "Engineering");
    const [exists, revoked, certId, name, course, issuedAt] =
      await registry.verifyByHash(HASH_1);
    expect(exists).to.be.true;
    expect(revoked).to.be.false;
    expect(certId).to.equal("CERT-009");
    expect(name).to.equal("Judy");
    expect(course).to.equal("Engineering");
    expect(issuedAt).to.be.gt(0n);
  });

  it("verifyByHash returns exists=false for unknown hash", async function () {
    const [exists] = await registry.verifyByHash(HASH_2);
    expect(exists).to.be.false;
  });

  it("verifyById returns exists=false for unknown ID", async function () {
    const [exists] = await registry.verifyById("CERT-UNKNOWN");
    expect(exists).to.be.false;
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a named event from a transaction receipt using the contract interface. */
function parseEvent(contract, receipt, eventName) {
  const iface = contract.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === eventName) return parsed;
    } catch {
      // not this contract's event
    }
  }
  return null;
}

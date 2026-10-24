const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CertificateRegistry", function () {
  let registry, owner, issuer1, issuer2, user;

  beforeEach(async function () {
    [owner, issuer1, issuer2, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateRegistry");
    registry = await Factory.deploy();
  });

  describe("Multi-Issuer Roles", function () {
    it("owner is initial active issuer", async function () {
      const info = await registry.issuers(owner.address);
      expect(info.isActive).to.be.true;
    });

    it("owner can add and remove issuers", async function () {
      await registry.addIssuer(issuer1.address, "Engineering Dept");
      let info = await registry.issuers(issuer1.address);
      expect(info.isActive).to.be.true;
      expect(info.name).to.equal("Engineering Dept");

      await registry.removeIssuer(issuer1.address);
      info = await registry.issuers(issuer1.address);
      expect(info.isActive).to.be.false;
    });

    it("non-issuer cannot issue a certificate", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-doc-1"));
      await expect(
        registry.connect(user).issueCertificate("CERT-001", hash, 0)
      ).to.be.revertedWith("Caller is not an authorized issuer");
    });

    it("removed issuer cannot issue a certificate", async function () {
      await registry.addIssuer(issuer1.address, "Engineering Dept");
      await registry.removeIssuer(issuer1.address);

      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-doc-2"));
      await expect(
        registry.connect(issuer1).issueCertificate("CERT-002", hash, 0)
      ).to.be.revertedWith("Caller is not an authorized issuer");
    });
  });

  describe("Certificate Expiry", function () {
    it("reports valid with 0 expiry (never expires)", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("never-expire-doc"));
      await registry.issueCertificate("CERT-NEVER", hash, 0);

      const res = await registry.verifyById("CERT-NEVER");
      expect(res.exists).to.be.true;
      expect(res.isExpired).to.be.false;
    });

    it("valid when expiresAt is future, expired after time advances", async function () {
      const now = await time.latest();
      const expiresAt = now + 3600;
      const hash = ethers.keccak256(ethers.toUtf8Bytes("expiring-doc"));

      await registry.issueCertificate("CERT-EXP", hash, expiresAt);
      let res = await registry.verifyById("CERT-EXP");
      expect(res.isExpired).to.be.false;

      await time.increase(3601);
      res = await registry.verifyById("CERT-EXP");
      expect(res.isExpired).to.be.true;
    });
  });

  describe("Revocation Permissions", function () {
    it("original issuer and owner can revoke, other issuers cannot", async function () {
      await registry.addIssuer(issuer1.address, "Issuer 1");
      await registry.addIssuer(issuer2.address, "Issuer 2");

      const hash = ethers.keccak256(ethers.toUtf8Bytes("doc-123"));
      await registry.connect(issuer1).issueCertificate("CERT-REV", hash, 0);

      await expect(
        registry.connect(issuer2).revokeCertificate("CERT-REV")
      ).to.be.revertedWith("Only owner or issuing address can revoke");

      await expect(registry.connect(owner).revokeCertificate("CERT-REV"))
        .to.emit(registry, "CertificateRevoked");
    });
  });
});

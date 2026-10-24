// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CertificateRegistry
/// @notice Stores and verifies SHA-256 hashes of issued certificates on-chain.
/// @dev Only the deployer (owner) can issue or revoke certificates.
contract CertificateRegistry {
    address public owner;

    /// @notice Data stored on-chain for each certificate.
    struct Certificate {
        bytes32 hash;        // SHA-256 hash of the PDF
        string studentName;
        string course;
        uint256 issuedAt;    // Unix timestamp
        bool revoked;
        bool exists;         // sentinel flag to distinguish missing from zero-value
    }

    /// @dev Primary index: certId -> Certificate
    mapping(string => Certificate) private _certs;

    /// @dev Reverse index: hash -> certId (prevents duplicate PDFs)
    mapping(bytes32 => string) private _hashToCertId;

    // ─── Events ────────────────────────────────────────────────────────────────

    event CertificateIssued(
        string indexed certId,
        bytes32 indexed hash,
        string studentName,
        string course,
        uint256 issuedAt
    );

    event CertificateRevoked(string indexed certId, uint256 revokedAt);

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─── Write functions ───────────────────────────────────────────────────────

    /// @notice Issue a new certificate. Reverts on duplicate ID or duplicate hash.
    /// @param certId  Unique certificate identifier (e.g. "CERT-1714000000000")
    /// @param hash    SHA-256 hash of the certificate PDF
    /// @param studentName  Full name of the recipient
    /// @param course  Name of the course / qualification
    function issueCertificate(
        string calldata certId,
        bytes32 hash,
        string calldata studentName,
        string calldata course
    ) external onlyOwner {
        require(!_certs[certId].exists, "Certificate ID already exists");
        require(bytes(_hashToCertId[hash]).length == 0, "Hash already registered");

        _certs[certId] = Certificate({
            hash: hash,
            studentName: studentName,
            course: course,
            issuedAt: block.timestamp,
            revoked: false,
            exists: true
        });
        _hashToCertId[hash] = certId;

        emit CertificateIssued(certId, hash, studentName, course, block.timestamp);
    }

    /// @notice Revoke a certificate. Reverts if not found or already revoked.
    /// @param certId  The certificate to revoke
    function revokeCertificate(string calldata certId) external onlyOwner {
        require(_certs[certId].exists, "Certificate not found");
        require(!_certs[certId].revoked, "Already revoked");

        _certs[certId].revoked = true;
        emit CertificateRevoked(certId, block.timestamp);
    }

    // ─── Read functions ────────────────────────────────────────────────────────

    /// @notice Look up a certificate by its PDF hash.
    function verifyByHash(bytes32 hash)
        external
        view
        returns (
            bool exists,
            bool revoked,
            string memory certId,
            string memory studentName,
            string memory course,
            uint256 issuedAt
        )
    {
        certId = _hashToCertId[hash];
        if (bytes(certId).length == 0) {
            return (false, false, "", "", "", 0);
        }
        Certificate storage cert = _certs[certId];
        return (cert.exists, cert.revoked, certId, cert.studentName, cert.course, cert.issuedAt);
    }

    /// @notice Look up a certificate by its ID.
    function verifyById(string calldata certId)
        external
        view
        returns (
            bool exists,
            bool revoked,
            string memory id,
            string memory studentName,
            string memory course,
            uint256 issuedAt
        )
    {
        Certificate storage cert = _certs[certId];
        if (!cert.exists) {
            return (false, false, certId, "", "", 0);
        }
        return (cert.exists, cert.revoked, certId, cert.studentName, cert.course, cert.issuedAt);
    }
}

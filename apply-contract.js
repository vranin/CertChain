const fs = require("fs");

const sol = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CertificateRegistry {
    address public owner;

    struct Certificate {
        string certId;
        bytes32 docHash;
        address issuer;
        uint256 issuedAt;
        uint256 expiresAt; // 0 = never expires
        bool isRevoked;
    }

    struct IssuerInfo {
        bool isActive;
        string name;
    }

    mapping(bytes32 => Certificate) private certificatesByHash;
    mapping(string => bytes32) private certIdToHash;
    mapping(address => IssuerInfo) public issuers;
    address[] public issuerAddresses;

    event CertificateIssued(
        string indexed certId,
        bytes32 indexed docHash,
        address indexed issuer,
        uint256 issuedAt,
        uint256 expiresAt
    );

    event CertificateRevoked(
        string indexed certId,
        bytes32 indexed docHash,
        address indexed revokedBy,
        uint256 revokedAt
    );

    event IssuerAdded(address indexed issuerAddress, string name, address addedBy);
    event IssuerRemoved(address indexed issuerAddress, address removedBy);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyIssuer() {
        require(issuers[msg.sender].isActive, "Caller is not an authorized issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
        issuers[msg.sender] = IssuerInfo(true, "Root Admin Issuer");
        issuerAddresses.push(msg.sender);
        emit IssuerAdded(msg.sender, "Root Admin Issuer", msg.sender);
    }

    function addIssuer(address _issuer, string calldata _name) external onlyOwner {
        require(_issuer != address(0), "Invalid address");
        require(!issuers[_issuer].isActive, "Issuer already active");

        if (bytes(issuers[_issuer].name).length == 0) {
            issuerAddresses.push(_issuer);
        }
        issuers[_issuer] = IssuerInfo(true, _name);
        emit IssuerAdded(_issuer, _name, msg.sender);
    }

    function removeIssuer(address _issuer) external onlyOwner {
        require(issuers[_issuer].isActive, "Not an active issuer");
        require(_issuer != owner, "Cannot remove contract owner");

        issuers[_issuer].isActive = false;
        emit IssuerRemoved(_issuer, msg.sender);
    }

    function getAllIssuers() external view returns (address[] memory addrs, string[] memory names, bool[] memory statuses) {
        uint256 len = issuerAddresses.length;
        addrs = new address[](len);
        names = new string[](len);
        statuses = new bool[](len);

        for (uint256 i = 0; i < len; i++) {
            address addr = issuerAddresses[i];
            addrs[i] = addr;
            names[i] = issuers[addr].name;
            statuses[i] = issuers[addr].isActive;
        }
        return (addrs, names, statuses);
    }

    function issueCertificate(
        string calldata _certId,
        bytes32 _docHash,
        uint256 _expiresAt
    ) external onlyIssuer {
        require(bytes(_certId).length > 0, "certId required");
        require(_docHash != bytes32(0), "docHash required");
        require(certIdToHash[_certId] == bytes32(0), "certId already exists");
        require(certificatesByHash[_docHash].docHash == bytes32(0), "docHash already registered");

        certificatesByHash[_docHash] = Certificate({
            certId: _certId,
            docHash: _docHash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            expiresAt: _expiresAt,
            isRevoked: false
        });

        certIdToHash[_certId] = _docHash;

        emit CertificateIssued(_certId, _docHash, msg.sender, block.timestamp, _expiresAt);
    }

    function revokeCertificate(string calldata _certId) external {
        bytes32 docHash = certIdToHash[_certId];
        require(docHash != bytes32(0), "Certificate not found");
        Certificate storage cert = certificatesByHash[docHash];
        require(!cert.isRevoked, "Already revoked");
        require(msg.sender == owner || msg.sender == cert.issuer, "Only owner or issuing address can revoke");

        cert.isRevoked = true;

        emit CertificateRevoked(_certId, docHash, msg.sender, block.timestamp);
    }

    function verifyByHash(bytes32 _docHash) external view returns (
        bool exists,
        string memory certId,
        address issuer,
        string memory issuerName,
        uint256 issuedAt,
        uint256 expiresAt,
        bool isRevoked,
        bool isExpired
    ) {
        Certificate memory cert = certificatesByHash[_docHash];
        if (cert.docHash == bytes32(0)) {
            return (false, "", address(0), "", 0, 0, false, false);
        }

        bool expired = (cert.expiresAt != 0 && block.timestamp > cert.expiresAt);
        return (
            true,
            cert.certId,
            cert.issuer,
            issuers[cert.issuer].name,
            cert.issuedAt,
            cert.expiresAt,
            cert.isRevoked,
            expired
        );
    }

    function verifyById(string calldata _certId) external view returns (
        bool exists,
        bytes32 docHash,
        address issuer,
        string memory issuerName,
        uint256 issuedAt,
        uint256 expiresAt,
        bool isRevoked,
        bool isExpired
    ) {
        bytes32 hash = certIdToHash[_certId];
        if (hash == bytes32(0)) {
            return (false, bytes32(0), address(0), "", 0, 0, false, false);
        }

        Certificate memory cert = certificatesByHash[hash];
        bool expired = (cert.expiresAt != 0 && block.timestamp > cert.expiresAt);
        return (
            true,
            cert.docHash,
            cert.issuer,
            issuers[cert.issuer].name,
            cert.issuedAt,
            cert.expiresAt,
            cert.isRevoked,
            expired
        );
    }
}
`;

fs.writeFileSync("contracts/CertificateRegistry.sol", sol.trim() + "\n", "utf8");
console.log("CONTRACT FILE APPLIED.");
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SkillRegistry — SkillMarket on-chain registry for the 0G Hackathon
 *
 * Responsibilities:
 *   - Store skill metadata (creator, 0G storage hash, price)
 *   - Execute skill payments with 80/20 creator/platform split
 *   - Accumulate creator earnings for trustless withdrawal
 *   - Record ratings per skill
 */
contract SkillRegistry {
    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant CREATOR_BPS = 8000; // 80%
    uint256 public constant MIN_PRICE_WEI = 0.0001 ether;

    // ── Storage ───────────────────────────────────────────────────────────────

    address public immutable platform;

    struct Skill {
        address creator;
        string storageHash; // 0G Storage Merkle root hash
        string name;
        string description;
        string category;
        uint256 priceWei;
        bool active;
        uint256 totalRuns;
        uint256 totalEarningsWei;
        uint256 createdAt;
    }

    mapping(bytes32 => Skill) public skills;
    bytes32[] public skillIds;

    mapping(address => uint256) public pendingWithdrawal; // claimable creator earnings
    mapping(bytes32 => uint256[]) private _skillRatings;
    mapping(address => bytes32[]) public creatorSkills; // creator → their skill IDs

    // ── Events ────────────────────────────────────────────────────────────────

    event SkillRegistered(
        bytes32 indexed skillId,
        address indexed creator,
        string name,
        string storageHash,
        uint256 priceWei,
        string category
    );

    event SkillExecuted(
        bytes32 indexed skillId,
        address indexed executor,
        uint256 creatorShare,
        uint256 platformShare
    );

    event EarningsWithdrawn(address indexed creator, uint256 amount);
    event SkillRated(bytes32 indexed skillId, uint8 rating, uint256 newTotal, uint256 newCount);
    event SkillDeactivated(bytes32 indexed skillId);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _platform) {
        require(_platform != address(0), "Invalid platform address");
        platform = _platform;
    }

    // ── Creator: Register ─────────────────────────────────────────────────────

    function registerSkill(
        string calldata name,
        string calldata description,
        string calldata category,
        string calldata storageHash,
        uint256 priceWei
    ) external returns (bytes32 skillId) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(storageHash).length > 0, "Storage hash required");
        require(priceWei >= MIN_PRICE_WEI, "Price below minimum");

        skillId = keccak256(abi.encodePacked(msg.sender, name, storageHash));
        require(!skills[skillId].active, "Skill already registered");

        skills[skillId] = Skill({
            creator: msg.sender,
            storageHash: storageHash,
            name: name,
            description: description,
            category: category,
            priceWei: priceWei,
            active: true,
            totalRuns: 0,
            totalEarningsWei: 0,
            createdAt: block.timestamp
        });

        skillIds.push(skillId);
        creatorSkills[msg.sender].push(skillId);

        emit SkillRegistered(skillId, msg.sender, name, storageHash, priceWei, category);
    }

    // ── Platform: Execute (called by backend platform wallet per AI response) ─

    function executeSkill(bytes32 skillId) external payable {
        Skill storage skill = skills[skillId];
        require(skill.active, "Skill not active");
        require(msg.value == skill.priceWei, "Incorrect payment amount");

        uint256 creatorShare = (msg.value * CREATOR_BPS) / 10000;
        uint256 platformShare = msg.value - creatorShare;

        pendingWithdrawal[skill.creator] += creatorShare;
        payable(platform).transfer(platformShare);

        skill.totalRuns++;
        skill.totalEarningsWei += creatorShare;

        emit SkillExecuted(skillId, msg.sender, creatorShare, platformShare);
    }

    // ── Creator: Withdraw earnings ────────────────────────────────────────────

    function withdraw() external {
        uint256 amount = pendingWithdrawal[msg.sender];
        require(amount > 0, "No earnings to withdraw");

        // CEI pattern — zero before transfer
        pendingWithdrawal[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit EarningsWithdrawn(msg.sender, amount);
    }

    // ── Rating ────────────────────────────────────────────────────────────────

    function rateSkill(bytes32 skillId, uint8 rating) external {
        require(skills[skillId].active, "Skill not active");
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");

        _skillRatings[skillId].push(rating);

        emit SkillRated(
            skillId,
            rating,
            getRatingSum(skillId),
            _skillRatings[skillId].length
        );
    }

    // ── Creator: Deactivate ───────────────────────────────────────────────────

    function deactivateSkill(bytes32 skillId) external {
        require(skills[skillId].creator == msg.sender, "Not your skill");
        skills[skillId].active = false;
        emit SkillDeactivated(skillId);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getSkillCount() external view returns (uint256) {
        return skillIds.length;
    }

    function getSkillIds(uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory result)
    {
        uint256 total = skillIds.length;
        if (offset >= total) return new bytes32[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = skillIds[i];
        }
    }

    function getCreatorSkills(address creator) external view returns (bytes32[] memory) {
        return creatorSkills[creator];
    }

    function getRatingCount(bytes32 skillId) external view returns (uint256) {
        return _skillRatings[skillId].length;
    }

    function getRatingSum(bytes32 skillId) public view returns (uint256 sum) {
        uint256[] storage ratings = _skillRatings[skillId];
        for (uint256 i = 0; i < ratings.length; i++) {
            sum += ratings[i];
        }
    }

    // Returns average rating * 100 (e.g. 450 = 4.50 stars), count
    function getAverageRating(bytes32 skillId)
        external
        view
        returns (uint256 avgX100, uint256 count)
    {
        count = _skillRatings[skillId].length;
        if (count == 0) return (0, 0);
        avgX100 = (getRatingSum(skillId) * 100) / count;
    }
}

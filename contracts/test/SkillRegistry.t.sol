// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SkillRegistry.sol";

contract SkillRegistryTest is Test {
    SkillRegistry public registry;

    address platform = makeAddr("platform");
    address creator  = makeAddr("creator");
    address buyer    = makeAddr("buyer");

    uint256 constant PRICE = 0.001 ether;

    bytes32 skillId;

    function setUp() public {
        registry = new SkillRegistry(platform);
        vm.deal(buyer, 10 ether);

        vm.prank(creator);
        skillId = registry.registerSkill(
            "test-skill",
            "A test skill",
            "accounting",
            "0xabc123",
            PRICE
        );
    }

    function test_RegisterSkill() public view {
        (
            address c,
            string memory hash,
            string memory name,
            ,
            ,
            uint256 price,
            bool active,
            ,
            ,

        ) = registry.skills(skillId);
        assertEq(c, creator);
        assertEq(hash, "0xabc123");
        assertEq(name, "test-skill");
        assertEq(price, PRICE);
        assertTrue(active);
    }

    function test_RegisterSkill_DuplicateFails() public {
        vm.prank(creator);
        vm.expectRevert("Skill already registered");
        registry.registerSkill("test-skill", "A test skill", "accounting", "0xabc123", PRICE);
    }

    function test_RegisterSkill_BelowMinPrice() public {
        vm.prank(creator);
        vm.expectRevert("Price below minimum");
        registry.registerSkill("cheap", "Cheap skill", "other", "0xdef456", 1 wei);
    }

    function test_ExecuteSkill() public {
        uint256 platformBefore = platform.balance;
        uint256 expectedCreatorShare = (PRICE * 8000) / 10000;
        uint256 expectedPlatformShare = PRICE - expectedCreatorShare;

        vm.prank(buyer);
        registry.executeSkill{value: PRICE}(skillId);

        assertEq(registry.pendingWithdrawal(creator), expectedCreatorShare);
        assertEq(platform.balance, platformBefore + expectedPlatformShare);

        (, , , , , , , uint256 runs, uint256 earnings, ) = registry.skills(skillId);
        assertEq(runs, 1);
        assertEq(earnings, expectedCreatorShare);
    }

    function test_ExecuteSkill_WrongAmount() public {
        vm.prank(buyer);
        vm.expectRevert("Incorrect payment amount");
        registry.executeSkill{value: PRICE - 1}(skillId);
    }

    function test_Withdraw() public {
        vm.prank(buyer);
        registry.executeSkill{value: PRICE}(skillId);

        uint256 pending = registry.pendingWithdrawal(creator);
        uint256 creatorBefore = creator.balance;

        vm.prank(creator);
        registry.withdraw();

        assertEq(creator.balance, creatorBefore + pending);
        assertEq(registry.pendingWithdrawal(creator), 0);
    }

    function test_RateSkill() public {
        vm.prank(buyer);
        registry.rateSkill(skillId, 5);

        vm.prank(buyer);
        registry.rateSkill(skillId, 4);

        (uint256 avg, uint256 count) = registry.getAverageRating(skillId);
        assertEq(count, 2);
        assertEq(avg, 450); // (5+4)/2 * 100 = 450
    }

    function test_RateSkill_InvalidRating() public {
        vm.prank(buyer);
        vm.expectRevert("Rating must be 1-5");
        registry.rateSkill(skillId, 6);
    }

    function test_DeactivateSkill() public {
        vm.prank(creator);
        registry.deactivateSkill(skillId);

        (, , , , , , bool active, , , ) = registry.skills(skillId);
        assertFalse(active);
    }

    function test_DeactivateSkill_NotOwner() public {
        vm.prank(buyer);
        vm.expectRevert("Not your skill");
        registry.deactivateSkill(skillId);
    }

    function test_GetSkillIds_Pagination() public {
        vm.startPrank(creator);
        registry.registerSkill("skill-2", "desc", "accounting", "hash2", PRICE);
        registry.registerSkill("skill-3", "desc", "legal", "hash3", PRICE);
        vm.stopPrank();

        bytes32[] memory page1 = registry.getSkillIds(0, 2);
        bytes32[] memory page2 = registry.getSkillIds(2, 2);

        assertEq(page1.length, 2);
        assertEq(page2.length, 1);
    }
}

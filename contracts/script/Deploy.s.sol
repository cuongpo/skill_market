// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SkillRegistry.sol";

contract DeploySkillRegistry is Script {
    function run() external {
        address platformWallet = vm.envAddress("PLATFORM_WALLET_ADDRESS");

        vm.startBroadcast();
        SkillRegistry registry = new SkillRegistry(platformWallet);
        vm.stopBroadcast();

        console.log("SkillRegistry deployed at:", address(registry));
        console.log("Platform wallet:", platformWallet);
        console.log("Chain ID:", block.chainid);
    }
}

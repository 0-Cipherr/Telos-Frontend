/**
 * Deterministic fallback contract for the strategy lab.
 *
 * When the LLM is unavailable the chat still has to hand a real, compilable
 * IStrategy implementation to the create-vault flow. This template keeps 100%
 * of the asset idle inside the strategy: it is deliberately boring, has no
 * external protocol calls and no admin path.
 *
 * It is NOT audited and it does not earn yield. The UI labels it as a local
 * template so it can never be mistaken for a protocol-specific strategy.
 */

type LocalContractInput = {
  name: string;
  asset: string;
  chain: string;
  risk: string;
  thesis: string;
};

function contractName(name: string): string {
  const base = name.replace(/[^A-Za-z0-9]/g, "");
  const safe = /^[0-9]/.test(base) ? `T${base}` : base;
  return `${safe || "Telos"}Strategy`;
}

function cleanComment(value: string): string {
  return value
    .replace(/\.\.\./g, ".")
    .replace(/\*\//g, "* /")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export function buildLocalContract(input: LocalContractInput): {
  code: string;
  contractName: string;
} {
  const name = contractName(input.name);
  const thesis = cleanComment(input.thesis);
  const chain = cleanComment(input.chain);
  const risk = cleanComment(input.risk);

  const code = `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {IStrategy} from "./IStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ${name}
/// @notice Local Telos strategy template. Holds the vault asset idle.
/// @dev Chain: ${chain}. Risk label: ${risk}. ${thesis}
contract ${name} is IStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 private immutable _asset;
    address public immutable override asset;
    address public immutable override vault;
    uint256 private _lastTotalAssets;

    error Unauthorized();
    error ZeroAddress();
    error InvalidAmount();
    error InsufficientLiquidity();

    modifier onlyVault() {
        if (msg.sender != vault) revert Unauthorized();
        _;
    }

    constructor(address vault_, address asset_) {
        if (vault_ == address(0) || asset_ == address(0)) revert ZeroAddress();
        vault = vault_;
        asset = asset_;
        _asset = IERC20(asset_);
    }

    function totalAssets() external view override returns (uint256) {
        return _asset.balanceOf(address(this));
    }

    function deposit(
        uint256 assets,
        bytes calldata
    ) external override onlyVault nonReentrant returns (uint256 assetsDeployed) {
        if (assets == 0) revert InvalidAmount();
        assetsDeployed = _asset.balanceOf(address(this));
        _lastTotalAssets += assets;
        emit Deposited(vault, assets, assetsDeployed);
    }

    function withdraw(
        uint256 assets,
        bytes calldata
    ) external override onlyVault nonReentrant returns (uint256 assetsReturned) {
        if (assets == 0) revert InvalidAmount();
        uint256 available = _asset.balanceOf(address(this));
        uint256 amount = assets > available ? available : assets;
        if (amount == 0) revert InsufficientLiquidity();

        uint256 vaultBefore = _asset.balanceOf(vault);
        _asset.safeTransfer(vault, amount);
        assetsReturned = _asset.balanceOf(vault) - vaultBefore;

        uint256 last = _lastTotalAssets;
        _lastTotalAssets = assetsReturned >= last ? 0 : last - assetsReturned;
        emit Withdrawn(vault, assets, assetsReturned);
    }

    function withdrawAll(
        bytes calldata
    ) external override onlyVault nonReentrant returns (uint256 assetsReturned) {
        uint256 amount = _asset.balanceOf(address(this));
        uint256 vaultBefore = _asset.balanceOf(vault);
        if (amount > 0) _asset.safeTransfer(vault, amount);
        assetsReturned = _asset.balanceOf(vault) - vaultBefore;
        _lastTotalAssets = 0;
        emit WithdrawnAll(vault, assetsReturned);
    }

    function harvest(
        bytes calldata
    ) external override onlyVault nonReentrant returns (
        uint256 currentAssets,
        int256 profitOrLoss
    ) {
        currentAssets = _asset.balanceOf(address(this));
        if (currentAssets > uint256(type(int256).max)) revert InvalidAmount();
        profitOrLoss = int256(currentAssets) - int256(_lastTotalAssets);
        _lastTotalAssets = currentAssets;
        emit Harvested(vault, currentAssets, profitOrLoss);
    }
}
`;

  return { code, contractName: name };
}

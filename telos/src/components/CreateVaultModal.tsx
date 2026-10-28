import { useWallets } from "@privy-io/react-auth";
import { useState, type FormEvent } from "react";
import { decodeEventLog, type Address } from "viem";
import { useCreatedVaults } from "../custom-contexts/CreatedVaultsContext";
import { useRegistryActionModal } from "../custom-contexts/ModalContext";
import {
  parseCreatorFeeBps,
  TELOS_CHAINS,
  VAULT_FACTORY_ABI,
  type TelosChain,
} from "../onchain/vaultContracts";
import { publicClientFor, walletClientFor } from "../onchain/walletClient";
import { MAX_CREATOR_FEE_PERCENT, PROTOCOL_FEE_PERCENT, type Vault } from "../vaults";

type Created = { vaultId: number; vault: Address };

function readVaultCreated(logs: readonly { data: `0x${string}`; topics: readonly `0x${string}`[] }[]): Created | null {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: VAULT_FACTORY_ABI,
        data: log.data,
        topics: log.topics as unknown as [`0x${string}`, ...`0x${string}`[]],
      });
      if (decoded.eventName === "VaultCreated") {
        return { vaultId: Number(decoded.args.vaultId), vault: decoded.args.vault };
      }
    } catch {
      // Log from another contract or event; keep looking.
    }
  }
  return null;
}

function buildVault(telos: TelosChain, created: Created, name: string, creator: string, creatorFeePercent: string): Vault {
  return {
    id: `onchain-${telos.id}-${created.vaultId}`,
    name,
    asset: "ETH",
    chain: telos.name,
    chains: [telos.name],
    kind: "custom",
    strategy: "Creator-operated ETH vault",
    strategySummary: "Depositors hold shares of native ETH. The creator can bridge idle ETH with Stargate.",
    description: `Native ETH vault on ${telos.name}.`,
    risk: "HIGH",
    apy: 0,
    tvl: "0 ETH",
    tvlUsd: 0,
    fee: Number(creatorFeePercent),
    protocolFee: PROTOCOL_FEE_PERCENT,
    creator,
    creatorAddress: creator,
    color: "#8fd400",
    h: [0, 0, 0, 0, 0, 0, 0],
    status: "live",
    createdAt: new Date().toISOString(),
    onchain: { chainId: telos.id, vaultId: created.vaultId, address: created.vault },
  };
}

export default function CreateVaultModal() {
  const { setOpen } = useRegistryActionModal();
  const { addVault } = useCreatedVaults();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [creatorFee, setCreatorFee] = useState("0");
  const [chainId, setChainId] = useState(TELOS_CHAINS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const telos = TELOS_CHAINS.find((item) => item.id === chainId);
    if (!telos) return setError("Pick a supported chain.");
    if (!wallet) return setError("Connect a wallet first.");
    if (!name.trim() || !symbol.trim()) return setError("Vault name and symbol are required.");
    const creatorFeeBps = parseCreatorFeeBps(creatorFee);
    if (creatorFeeBps === null) return setError(`Creator fee must be between 0 and ${MAX_CREATOR_FEE_PERCENT}%.`);
    if (!telos.factory) return setError(`No factory address set for ${telos.name} (VITE_VAULT_FACTORY).`);

    setBusy(true);
    try {
      const walletClient = await walletClientFor(wallet, telos);
      const hash = await walletClient.writeContract({
        address: telos.factory,
        abi: VAULT_FACTORY_ABI,
        functionName: "createVault",
        args: [name.trim(), symbol.trim(), creatorFeeBps],
        account: wallet.address as Address,
        chain: telos.chain,
      });
      const receipt = await publicClientFor(telos).waitForTransactionReceipt({ hash });
      const created = readVaultCreated(receipt.logs);
      if (!created) throw new Error("Transaction mined, but no VaultCreated event was found.");

      addVault(buildVault(telos, created, name.trim(), wallet.address, creatorFee));
      setOpen(false);
    } catch (caught) {
      const message = caught as { shortMessage?: string; message?: string };
      setError(message.shortMessage ?? message.message ?? "Vault creation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div
        className="panel modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-vault-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleCreate}>
          <div className="modal-head">
            <div>
              <h2 id="create-vault-title">Create a vault</h2>
              <p className="field-hint">Native ETH vault. Deployed through VaultFactory.</p>
            </div>
            <button type="button" className="btn btn-plain btn-sm" onClick={() => setOpen(false)} aria-label="Close dialog">
              ✕
            </button>
          </div>

          <div className="field">
            <label htmlFor="create-vault-name">Vault name</label>
            <input id="create-vault-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="create-vault-symbol">Share symbol</label>
            <input id="create-vault-symbol" className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="create-vault-fee">Creator fee (%)</label>
            <input
              id="create-vault-fee"
              className="input"
              type="number"
              min={0}
              max={MAX_CREATOR_FEE_PERCENT}
              step={0.1}
              value={creatorFee}
              onChange={(e) => setCreatorFee(e.target.value)}
            />
            <p className="field-hint">
              Charged on withdrawals. Protocol fee is {PROTOCOL_FEE_PERCENT}%, and half of it returns to you.
            </p>
          </div>

          <div className="field">
            <label htmlFor="create-vault-chain">Chain</label>
            <select id="create-vault-chain" className="input" value={chainId} onChange={(e) => setChainId(Number(e.target.value))}>
              {TELOS_CHAINS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p className="registry-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="modal-actions">
            <button type="submit" className="btn" disabled={busy || !wallet}>
              {busy ? "Creating…" : "Create vault"}
            </button>
            <button type="button" className="btn btn-plain" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

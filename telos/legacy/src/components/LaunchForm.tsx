import { useState } from "react";
import { useRegistryActionModal } from "../custom-contexts/ModalContext";
import type { Vault } from "../vaults";
import { ASSETS, CHAINS, STRATS } from "../vaults";
import { VaultPreview } from "./VaultTable";

type LaunchFormProps = {
  address?: string;
};

export default function LaunchForm({ address }: LaunchFormProps) {
  const [name, setName] = useState("My Yield Vault");
  const [asset, setAsset] = useState("USDC");
  const [chain, setChain] = useState("Base");
  const [strategy, setStrategy] = useState("Lending");
  const [fee, setFee] = useState<any>(8);

  const {
    setOpen,
    setVaultName,
    setVaultTicker,
    setVaultDescription,
    setVaultChains,
    setVaultFee,
    setStrategy: setRegistryStrategy,
  } = useRegistryActionModal();

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "you";

  const preview: Vault = {
    id: "TL-DRAFT",
    name: name || "Untitled Vault",
    asset: asset.slice(0, 2),
    chain,
    chains: [chain],
    kind: "custom",
    strategy,
    strategySummary: `${strategy} strategy draft via the Telos registry.`,
    description:
      "Draft configuration. Open the create-vault dialog to attach the full contract source, launchpad listings and address array.",
    risk: fee > 15 ? "HIGH" : "MEDIUM",
    apy: 8,
    tvl: "0",
    tvlUsd: 0,
    fee,
    creator: short,
    color: "#ec6a4c",
    h: [3, 4, 4, 5, 6, 6, 7, 8, 8, 9],
    status: "draft",
  };

  const openCreate = () => {
    setVaultName(name || "Untitled Vault");
    setVaultTicker(asset.toUpperCase());
    setVaultDescription(
      `${strategy} vault on ${chain}. Configured from the launch panel.`,
    );
    setVaultChains([chain]);
    setVaultFee(fee);
    setRegistryStrategy(strategy);
    setOpen(true);
  };

  return (
    <section id="launch" className="section">
      <h2>🚀 Launch a vault</h2>
      <div className="two">
        <div className="panel">
          <div className="field">
            <label htmlFor="launch-name">Vault name</label>
            <input
              id="launch-name"
              className="input"
              value={name}
              maxLength={32}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="launch-asset">Asset</label>
            <select
              id="launch-asset"
              className="input"
              value={asset}
              onChange={(event) => setAsset(event.target.value)}
            >
              {ASSETS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="launch-chain">Primary chain</label>
            <select
              id="launch-chain"
              className="input"
              value={chain}
              onChange={(event) => setChain(event.target.value)}
            >
              {CHAINS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <p className="field-hint">
              Add more EVM networks, Robinhood launchpad listings and creator
              reward routing in the create dialog.
            </p>
          </div>
          <div className="field">
            <label htmlFor="launch-strategy">Strategy</label>
            <select
              id="launch-strategy"
              className="input"
              value={strategy}
              onChange={(event) => setStrategy(event.target.value)}
            >
              {STRATS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="launch-fee">
              Creator fee <b>{fee}%</b>
            </label>
            <input
              id="launch-fee"
              type="range"
              min={0}
              max={8}
              value={fee}
              onChange={(event) => setFee(Number(event.target.value))}
            />
          </div>
          <button type="button" className="btn" onClick={openCreate}>
            🚀 Open create-vault dialog
          </button>
        </div>

        <div>
          <div className="preview-title">Live preview · {strategy}</div>
          <VaultPreview vault={preview} />
          <p className="note">
            Preview only. APY is a placeholder. The create dialog accepts the
            contract source, an `address[]` parameter, all EVM networks,
            Robinhood launchpad listings and creator-reward routing.
          </p>
        </div>
      </div>
    </section>
  );
}

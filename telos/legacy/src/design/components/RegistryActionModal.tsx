import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isAddress } from "viem";
import { EVM_CHAINS } from "../../chains";
import { useCreatedVaults } from "../../custom-contexts/CreatedVaultsContext";
import { useRegistryActionModal } from "../../custom-contexts/ModalContext";
import { useTxConfirmer } from "../../custom-contexts/TxConfirmerContext";
import { lockBodyScroll } from "../../utils/scrollLock";
import {
  CREATOR_REWARDS,
  LAUNCHPADS,
  creatorRewardLabel,
  type CreatorRewardMode,
  type Vault,
  type VaultRisk,
} from "../../vaults";

type Props = {
  address?: string;
};

function shortAddress(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function riskFromSpec(risk?: "LOW" | "MED" | "HIGH"): VaultRisk {
  if (risk === "LOW") return "LOW";
  if (risk === "HIGH") return "HIGH";
  return "MEDIUM";
}

export default function RegistryActionModal({ address }: Props) {
  const navigate = useNavigate();
  const { addVault } = useCreatedVaults();
  const { confirmTx } = useTxConfirmer();
  const {
    open,
    setOpen,
    setOwner,
    vaultName,
    vaultTicker,
    vaultDescription,
    vaultChains,
    vaultAddresses,
    vaultLaunchpads,
    vaultCreatorRewards,
    vaultFee,
    feeReceiver,
    strategy,
    strategySpec,
    setVaultName,
    setVaultTicker,
    setVaultDescription,
    setVaultChains,
    setVaultAddresses,
    setVaultLaunchpads,
    setVaultCreatorRewards,
    setVaultFee,
    setFeeReceiver,
    setStrategy,
    setStrategySpec,
    enableAgent,
    setEnableAgent,
  } = useRegistryActionModal();

  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState(5);
  const [feeReceiverValue, setFeeReceiverValue] = useState("");
  const [strategyValue, setStrategyValue] = useState("");
  const [chains, setChains] = useState<string[]>(["Base"]);
  const [launchpads, setLaunchpads] = useState<string[]>(["pons"]);
  const [creatorRewards, setCreatorRewards] =
    useState<CreatorRewardMode>("mine-ai");
  const [stakeEnabled, setStakeEnabled] = useState(true);
  const [showCreatorRewards, setShowCreatorRewards] = useState(true);
  const [addresses, setAddresses] = useState<string[]>([""]);
  const [agentKey, setAgentKey] = useState("");
  const [agentModel, setAgentModel] = useState("openai/gpt-4o-mini");
  const [error, setError] = useState("");

  // Keep the form in sync with the calling flow (strategy lab, launch panel,
  // or a plain "Create Vault" click). Only reset on open so typing is stable.
  useEffect(() => {
    if (!open) return;
    setName(vaultName || "");
    setTicker(vaultTicker || "");
    setDescription(vaultDescription || strategySpec?.thesis || "");
    setFee(Number.isFinite(vaultFee) ? vaultFee : 5);
    setFeeReceiverValue(feeReceiver || address || "");
    setStrategyValue(strategy || "");
    setChains(vaultChains.length ? vaultChains : ["Base"]);
    setLaunchpads(vaultLaunchpads.length ? vaultLaunchpads : ["pons"]);
    setCreatorRewards(vaultCreatorRewards);
    setStakeEnabled(true);
    setShowCreatorRewards(true);
    const seededAddresses =
      vaultAddresses.length > 0 ? vaultAddresses : address ? [address] : [""];
    setAddresses(seededAddresses.length ? seededAddresses : [""]);
    setError("");
    // The context setters are stable state functions; opening the dialog is the
    // only moment we want to overwrite the local draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const unlockScroll = lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
    };
  }, [open, setOpen]);

  const hasSolidity = /pragma\s+solidity/i.test(strategyValue);
  const contractName =
    strategyValue.match(/contract\s+([A-Za-z_]\w*)\s+is\s+IStrategy/)?.[1] ??
    "";

  const cleanAddresses = addresses.map((item) => item.trim()).filter(Boolean);
  const badAddress = cleanAddresses.find((item) => !isAddress(item));

  const toggleChain = (chain: string) => {
    setChains((current) =>
      current.includes(chain)
        ? current.filter((item) => item !== chain)
        : [...current, chain],
    );
  };

  const toggleLaunchpad = (id: string) => {
    setLaunchpads((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const updateAddress = (index: number, value: string) => {
    setAddresses((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  };

  const addAddress = () => setAddresses((current) => [...current, ""]);

  const removeAddress = (index: number) => {
    setAddresses((current) =>
      current.length === 1
        ? [""]
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedTicker = ticker.trim().toUpperCase();
    const trimmedReceiver = feeReceiverValue.trim();

    if (!trimmedName) return setError("A vault name is required.");
    if (!trimmedTicker) return setError("A ticker is required.");
    if (!trimmedReceiver || !isAddress(trimmedReceiver)) {
      return setError("Fee receiver must be a valid EVM address.");
    }
    if (fee < 0 || fee > 8)
      return setError("Creator fee must be between 0 and 8%.");
    if (chains.length === 0)
      return setError("Select at least one EVM network.");
    if (launchpads.length === 0) {
      return setError("Select at least one launchpad listing.");
    }
    if (cleanAddresses.length === 0) {
      return setError("Add at least one address to the address[] parameter.");
    }
    if (badAddress) {
      return setError(`Invalid address in the array: ${badAddress}`);
    }

    const launchpadNames = launchpads
      .map((id) => {
        const item = LAUNCHPADS.find((entry) => entry.id === id);
        return item ? `${item.emoji} ${item.name}` : id;
      })
      .join(", ");

    const confirmed = await confirmTx({
      kind: "deploy",
      chains,
      rows: [
        { label: "Vault", value: trimmedName },
        { label: "Ticker", value: trimmedTicker },
        { label: "Fee receiver", value: shortAddress(trimmedReceiver) },
        { label: "Creator fee", value: `${fee}%` },
        { label: "Networks", value: `${chains.length} EVM networks` },
        { label: "Launchpads", value: launchpadNames },
        {
          label: "Creator rewards",
          value: creatorRewardLabel(creatorRewards),
        },
        {
          label: "Token features",
          value:
            [
              stakeEnabled ? "staking" : null,
              showCreatorRewards ? "creator rewards" : null,
            ]
              .filter(Boolean)
              .join(" · ") || "none",
        },
        {
          label: "Address array",
          value: `${cleanAddresses.length} address${
            cleanAddresses.length === 1 ? "" : "es"
          }`,
        },
        {
          label: "Agent",
          value: enableAgent
            ? `enabled · ${agentModel || "default model"}`
            : "disabled",
        },
      ],
      note: "Testnet only. Deployment is simulated in this build — no contract call is made.",
    });

    if (!confirmed) return;

    const now = new Date();
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const id = `TL-${now.getTime().toString(36).toUpperCase()}${suffix}`;

    const vault: Vault = {
      id,
      name: trimmedName,
      asset: (strategySpec?.asset ?? trimmedTicker).slice(0, 3).toUpperCase(),
      chain: chains[0],
      chains,
      kind: "custom",
      proto:
        strategySpec?.source === "local" ? "Local template" : "Strategy Lab",
      strategy: strategySpec?.name ?? contractName ?? "Custom strategy",
      strategySummary:
        strategySpec?.thesis ||
        description.trim() ||
        "Creator-defined strategy.",
      description:
        description.trim() ||
        strategySpec?.thesis ||
        "A creator-defined Telos vault.",
      allocations: strategySpec?.allocations,
      risk: riskFromSpec(strategySpec?.risk),
      apy: 0,
      tvl: "0",
      tvlUsd: 0,
      fee,
      creator: shortAddress(trimmedReceiver),
      creatorAddress: trimmedReceiver,
      color: "#8fd400",
      h: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      status: "draft",
      createdAt: now.toISOString().slice(0, 10),
      addresses: cleanAddresses,
      launchpads,
      creatorRewards,
      stakeEnabled,
      showCreatorRewards,
      contractCode: hasSolidity ? strategyValue : undefined,
      contractName: contractName || undefined,
      strategyModel: strategySpec?.model,
      agentEnabled: enableAgent,
      agentModel: enableAgent ? agentModel : undefined,
    };

    setOwner(trimmedReceiver);
    setVaultName(trimmedName);
    setVaultTicker(trimmedTicker);
    setVaultDescription(vault.description);
    setVaultChains(chains);
    setVaultAddresses(cleanAddresses);
    setVaultLaunchpads(launchpads);
    setVaultCreatorRewards(creatorRewards);
    setVaultFee(fee);
    setFeeReceiver(trimmedReceiver);
    setStrategy(strategyValue);
    setStrategySpec(strategySpec);

    addVault(vault);
    setOpen(false);
    navigate(`/vaults/${id}`);
  };

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div
        className="panel modal registry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registry-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleCreate}>
          <div className="modal-head">
            <div>
              <span className="registry-kicker">REGISTRY / VAULT FACTORY</span>
              <h2 id="registry-modal-title">🛠️ Create a vault</h2>
            </div>
            <button
              type="button"
              className="btn btn-plain btn-sm"
              onClick={() => setOpen(false)}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <div className="registry-scroll">
            <div className="registry-grid-2">
              <div className="field">
                <label htmlFor="registry-vault-name">📛 Vault name</label>
                <input
                  id="registry-vault-name"
                  className="input"
                  type="text"
                  value={name}
                  maxLength={32}
                  placeholder="My Yield Vault"
                  onChange={(event) => setName(event.target.value)}
                  autoFocus
                  required
                />
                <p className="field-hint">{name.length}/32 characters.</p>
              </div>
              <div className="field">
                <label htmlFor="registry-ticker">🏷️ Ticker</label>
                <input
                  id="registry-ticker"
                  className="input"
                  type="text"
                  value={ticker}
                  maxLength={8}
                  placeholder="TLS"
                  spellCheck={false}
                  onChange={(event) => setTicker(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="registry-grid-2">
              <div className="field">
                <label htmlFor="registry-fee-receiver">💲 Fee receiver</label>
                <input
                  id="registry-fee-receiver"
                  className="input"
                  type="text"
                  value={feeReceiverValue}
                  placeholder="0x…"
                  spellCheck={false}
                  onChange={(event) => setFeeReceiverValue(event.target.value)}
                  required
                />
                <p className="field-hint">
                  Receives the creator fee. Must be a valid EVM address.
                </p>
              </div>
              <div className="field">
                <label htmlFor="registry-fee">
                  💸 Creator fee <b>{fee}%</b>
                </label>
                <input
                  id="registry-fee"
                  className="input"
                  type="number"
                  min={0}
                  max={8}
                  step={1}
                  value={fee}
                  onChange={(event) => setFee(Number(event.target.value))}
                />
                <p className="field-hint">Hard-capped at 8% by the standard.</p>
              </div>
            </div>

            <div className="field">
              <label htmlFor="registry-description">📝 Description</label>
              <textarea
                id="registry-description"
                className="input registry-textarea"
                value={description}
                rows={3}
                placeholder="What does this vault do? Shown on the vault file."
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <fieldset className="registry-group">
              <legend>
                <span>🧾 Address array</span>
                <span className="registry-count">
                  address[{cleanAddresses.length}]
                </span>
              </legend>
              <p className="field-hint registry-group-hint">
                One of the vault factory parameters is an `address[]`. The first
                one is usually the connected wallet; add as many as you need.
              </p>
              <div className="address-list-input">
                {addresses.map((value, index) => (
                  <div className="address-row" key={index}>
                    <span className="address-row-index">
                      [{String(index).padStart(2, "0")}]
                    </span>
                    <input
                      className="input"
                      type="text"
                      value={value}
                      placeholder={
                        index === 0 ? (address ?? "0x… (owner)") : "0x…"
                      }
                      spellCheck={false}
                      onChange={(event) =>
                        updateAddress(index, event.target.value)
                      }
                      aria-label={`Address ${index + 1}`}
                    />
                    {index === 0 && address ? (
                      <button
                        type="button"
                        className="btn btn-plain btn-sm"
                        onClick={() => updateAddress(0, address)}
                      >
                        Me
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-plain btn-sm"
                      onClick={() => removeAddress(index)}
                      aria-label={`Remove address ${index + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-plain btn-sm registry-add"
                onClick={addAddress}
              >
                ＋ Add address
              </button>
              {badAddress ? (
                <p className="registry-invalid">Invalid: {badAddress}</p>
              ) : null}
            </fieldset>

            <fieldset className="registry-group">
              <legend>
                <span>🌐 Deploy networks</span>
                <span className="registry-count">
                  {chains.length} / {EVM_CHAINS.length}
                </span>
              </legend>
              <div className="registry-group-actions">
                <span className="field-hint">
                  Every check is an EVM deployment target.
                </span>
                <span className="registry-mini-actions">
                  <button
                    type="button"
                    className="linklike"
                    onClick={() =>
                      setChains(EVM_CHAINS.map((item) => item.name))
                    }
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="linklike"
                    onClick={() => setChains([])}
                  >
                    Clear
                  </button>
                </span>
              </div>
              <div className="chain-picker">
                {EVM_CHAINS.map((item) => {
                  const active = chains.includes(item.name);
                  const Icon = item.Icon;
                  return (
                    <label
                      key={item.name}
                      className={`chain-option${active ? " is-on" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleChain(item.name)}
                      />
                      <span className="chain-check" aria-hidden="true" />
                      <Icon variant="branded" size={16} aria-hidden="true" />
                      <span className="chain-name">{item.name}</span>
                      <span className="chain-short">{item.short}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="registry-group">
              <legend>
                <span>🚀 Launchpad listings</span>
                <span className="registry-count">
                  {launchpads.length} selected
                </span>
              </legend>
              <p className="field-hint registry-group-hint">
                Both listings are on Robinhood Chain. Pons runs a bonding curve;
                Hookr.fun launches with Uniswap v4 hooks.
              </p>
              <div className="launchpad-picker">
                {LAUNCHPADS.map((item) => {
                  const active = launchpads.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`launchpad-option${active ? " is-on" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleLaunchpad(item.id)}
                      />
                      <span className="chain-check" aria-hidden="true" />
                      <img
                        className={`launchpad-logo launchpad-logo--${item.id}`}
                        src={item.logo}
                        alt=""
                        width={24}
                        height={24}
                        loading="lazy"
                      />
                      <span className="launchpad-copy">
                        <b>
                          <span aria-hidden="true">{item.emoji}</span>{" "}
                          {item.name}
                        </b>
                        <span>{item.description}</span>
                        <span className="launchpad-chain">{item.chain}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="registry-group">
              <legend>
                <span>🎁 Creator rewards</span>
                <span className="registry-count">
                  {creatorRewardLabel(creatorRewards)}
                </span>
              </legend>
              <p className="field-hint registry-group-hint">
                Choose where your share of yield goes. Mine AI tokens or stake
                rewards instead of taking fees as cash.
              </p>
              <div className="reward-picker">
                {CREATOR_REWARDS.map((item) => {
                  const active = creatorRewards === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`reward-option${active ? " is-on" : ""}`}
                    >
                      <input
                        type="radio"
                        name="registry-creator-rewards"
                        checked={active}
                        onChange={() => setCreatorRewards(item.id)}
                      />
                      <span className="reward-emoji" aria-hidden="true">
                        {item.emoji}
                      </span>
                      <span className="reward-copy">
                        <b>{item.label}</b>
                        <span>{item.description}</span>
                      </span>
                      <span className="chain-check" aria-hidden="true" />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="registry-group">
              <legend>
                <span>✨ Token features</span>
                <span className="registry-count">
                  {[stakeEnabled, showCreatorRewards].filter(Boolean).length}{" "}
                  selected
                </span>
              </legend>
              <p className="field-hint registry-group-hint">
                Choose what holders see on the vault page. Enable share staking,
                surface creator rewards, or both.
              </p>
              <div className="feature-picker">
                <label
                  className={`feature-option${stakeEnabled ? " is-on" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={stakeEnabled}
                    onChange={(event) => setStakeEnabled(event.target.checked)}
                  />
                  <span className="chain-check" aria-hidden="true" />
                  <span className="reward-emoji" aria-hidden="true">
                    🥩
                  </span>
                  <span className="reward-copy">
                    <b>Stake vault shares</b>
                    <span>
                      Let holders stake this vault token and compound from the
                      vault page.
                    </span>
                  </span>
                </label>
                <label
                  className={`feature-option${
                    showCreatorRewards ? " is-on" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={showCreatorRewards}
                    onChange={(event) =>
                      setShowCreatorRewards(event.target.checked)
                    }
                  />
                  <span className="chain-check" aria-hidden="true" />
                  <span className="reward-emoji" aria-hidden="true">
                    🎁
                  </span>
                  <span className="reward-copy">
                    <b>Show creator rewards</b>
                    <span>
                      Display where the creator&apos;s share of yield is routed.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <div className="registry-group">
              <label className="registry-toggle">
                <input
                  type="checkbox"
                  checked={enableAgent}
                  onChange={(event) => setEnableAgent(event.target.checked)}
                />
                <span className="chain-check" aria-hidden="true" />
                <span>
                  <b>🤖 Enable onchain agent</b>
                  <span>
                    Let the vault run a strategy agent between harvests.
                  </span>
                </span>
              </label>
              {enableAgent ? (
                <div className="registry-agent-config">
                  <div className="field">
                    <label htmlFor="registry-agent-key">
                      OpenRouter API key
                    </label>
                    <input
                      id="registry-agent-key"
                      className="input"
                      type="password"
                      value={agentKey}
                      placeholder="sk-or-v1-…"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) => setAgentKey(event.target.value)}
                    />
                    <p className="field-hint">
                      Kept in this dialog only. Never written to the vault or
                      localStorage.
                    </p>
                  </div>
                  <div className="field">
                    <label htmlFor="registry-agent-model">
                      Model preference
                    </label>
                    <input
                      id="registry-agent-model"
                      className="input"
                      type="text"
                      value={agentModel}
                      spellCheck={false}
                      onChange={(event) => setAgentModel(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="registry-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="modal-actions registry-actions">
            <button type="submit" className="btn">
              Create vault
            </button>
            <button
              type="button"
              className="btn btn-plain"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

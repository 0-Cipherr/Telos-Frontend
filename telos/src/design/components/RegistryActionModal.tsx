import { NetworkArbitrumSepolia, NetworkBaseSepolia } from "@web3icons/react";
import { useEffect, useState, type FormEvent } from "react";
import { useRegistryActionModal } from "../../custom-contexts/ModalContext";
import { useTxConfirmer } from "../../custom-contexts/TxConfirmerContext";
import { lockBodyScroll } from "../../utils/scrollLock";

const chainsAvailable = [
  {
    name: "Base Sepolia",
    Icon: NetworkBaseSepolia,
  },
  {
    name: "Arbitrum Sepolia",
    Icon: NetworkArbitrumSepolia,
  },
];

function RegistryActionModal() {
  const {
    setOpen,
    setVaultName,
    setFeeReceiver,
    setVaultTicker,
    setVsultChains,
    strategy,
    setStrategy,
  } = useRegistryActionModal();
  const { confirmTx } = useTxConfirmer();

  const [name, setName] = useState("");
  const [feeReceiver, setFeeReceiverValue] = useState("");
  const [ticker, setTicker] = useState("");
  const [strategyValue, setStrategyValue] = useState(strategy);
  const [chains, setChains] = useState<string[]>([chainsAvailable[0].name]);

  useEffect(() => {
    setStrategyValue(strategy);
  }, [strategy]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const unlockScroll = lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
    };
  }, [setOpen]);

  const toggleChain = (nameToToggle: string) => {
    setChains((current) => {
      if (current.includes(nameToToggle)) {
        // Keep at least one network selected.
        if (current.length === 1) return current;
        return current.filter((item) => item !== nameToToggle);
      }
      return [...current, nameToToggle];
    });
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const confirmed = await confirmTx({
      kind: "deploy",
      chains,
      rows: [
        { label: "Vault", value: name.trim() || "Untitled vault" },
        { label: "Ticker", value: ticker.trim().toUpperCase() || "—" },
        { label: "Fee receiver", value: feeReceiver.trim() || "—" },
        {
          label: "Strategy",
          value: strategyValue.includes("pragma solidity")
            ? `Solidity contract · ${strategyValue.split("\n").length} lines · IStrategy`
            : strategyValue.trim() || "—",
        },
      ],
      note: "Testnet only. Deployment is simulated in this build — no contract call is made.",
    });

    if (!confirmed) return;

    setVaultName(name.trim());
    setFeeReceiver(feeReceiver.trim());
    setVaultTicker(ticker.trim().toUpperCase());
    setStrategy(strategyValue.trim());
    setVsultChains(chains);
    setOpen(false);
  };

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div
        className="panel modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registry-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleCreate}>
          <div className="modal-head">
            <h2 id="registry-modal-title">🛠️ Create a vault</h2>
            <button
              type="button"
              className="btn btn-plain btn-sm"
              onClick={() => setOpen(false)}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
          <div className="field">
            <label htmlFor="registry-vault-name">📛 Name</label>
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
          </div>
          <div className="field">
            <label htmlFor="registry-fee-receiver">💲 Fee receiver</label>
            <input
              id="registry-fee-receiver"
              className="input"
              type="text"
              value={feeReceiver}
              placeholder="0x…"
              spellCheck={false}
              onChange={(event) => setFeeReceiverValue(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="registry-ticker">💲 Ticker</label>
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
          <div className="field">
            <label htmlFor="registry-strategy">Strategy</label>
            <textarea
              id="registry-strategy"
              className="input strategy-input"
              value={strategyValue}
              rows={strategyValue.includes("pragma solidity") ? 10 : 3}
              placeholder="Describe the strategy — or generate a contract with ✦ Create Strategy"
              spellCheck={false}
              onChange={(event) => setStrategyValue(event.target.value)}
              required
            />
            <p className="field-hint">
              Tip: use ✦ Create Strategy in the top bar to draft this with the
              LLM strategist.
            </p>
          </div>{" "}
          <div className="field">
            <label htmlFor="registry-fee-receiver text-[12px]">
              🤖 Enable Agent
            </label>
            <div className="flex gap-2">
              <div className="flex gap-2">
                {" "}
                <label
                  htmlFor="registry-fee-receiver"
                  className="text-[10px] m-auto"
                >
                  Enable{" "}
                </label>
                <input type="checkbox" />
              </div>
              <input
                id="registry-fee-receiver"
                className="input"
                type="text"
                value={feeReceiver}
                placeholder="OpenRouter API KEY"
                spellCheck={false}
                onChange={(event) => setFeeReceiverValue(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="registry-fee-receiver">🤖 Model Preference</label>
            <input
              id="registry-fee-receiver"
              className="input"
              type="text"
              value={feeReceiver}
              placeholder="Enter Model"
              spellCheck={false}
              onChange={(event) => setFeeReceiverValue(event.target.value)}
              required
            />
          </div>{" "}
          <div className="field">
            <span className="lab">📠 Networks</span>
            <div className="chain-picker">
              {chainsAvailable.map((item) => {
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
                    <Icon variant="branded" size={16} />
                    <span>{item.name}</span>
                  </label>
                );
              })}
            </div>
            <p className="field-hint">
              The first network is the native deployment; additional networks
              are deployed cross-chain.
            </p>
          </div>
          <div className="modal-actions">
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

export default RegistryActionModal;

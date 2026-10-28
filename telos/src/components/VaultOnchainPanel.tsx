import { useWallets } from "@privy-io/react-auth";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatEther, formatUnits, parseEther, type Address } from "viem";
import {
  BRIDGE_DESTINATIONS,
  SHARE_DECIMALS,
  telosChain,
  VAULT_ABI,
} from "../onchain/vaultContracts";
import { publicClientFor, walletClientFor } from "../onchain/walletClient";
import type { Vault } from "../vaults";

type Stats = {
  totalAssets: bigint;
  totalSupply: bigint;
  deployedValue: bigint;
  creator: Address;
  creatorFeeBps: bigint;
  myShares: bigint;
  myNetValue: bigint;
};

function errorText(caught: unknown): string {
  const err = caught as { shortMessage?: string; message?: string };
  return err.shortMessage ?? err.message ?? "Transaction failed.";
}

/** Live onchain state and actions for a vault created through VaultFactory. */
export default function VaultOnchainPanel({ vault }: { vault: Vault }) {
  const onchain = vault.onchain!;
  const telos = telosChain(onchain.chainId);
  const address = onchain.address as Address;
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const user = wallet?.address as Address | undefined;

  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [depositEth, setDepositEth] = useState("");
  const [bridgeEid, setBridgeEid] = useState<number>(BRIDGE_DESTINATIONS[0].eid);
  const [bridgeTo, setBridgeTo] = useState("");
  const [bridgeEth, setBridgeEth] = useState("");
  const [markEth, setMarkEth] = useState("");

  const load = useCallback(async () => {
    if (!telos) return;
    const client = publicClientFor(telos);
    try {
      const [totalAssets, totalSupply, deployedValue, creator, creatorFeeBps, myShares] = await Promise.all([
        client.readContract({ address, abi: VAULT_ABI, functionName: "totalAssets" }),
        client.readContract({ address, abi: VAULT_ABI, functionName: "totalSupply" }),
        client.readContract({ address, abi: VAULT_ABI, functionName: "deployedValue" }),
        client.readContract({ address, abi: VAULT_ABI, functionName: "creator" }),
        client.readContract({ address, abi: VAULT_ABI, functionName: "creatorFeeBps" }),
        user
          ? client.readContract({ address, abi: VAULT_ABI, functionName: "balanceOf", args: [user] })
          : Promise.resolve(0n),
      ]);
      const myNetValue =
        myShares > 0n
          ? await client.readContract({ address, abi: VAULT_ABI, functionName: "previewWithdraw", args: [myShares] })
          : 0n;
      setStats({ totalAssets, totalSupply, deployedValue, creator, creatorFeeBps, myShares, myNetValue });
      setLoadError(null);
    } catch (caught) {
      setLoadError(errorText(caught));
    }
  }, [address, telos, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!telos) return <p className="field-hint">Chain {onchain.chainId} is not supported by this app.</p>;

  const isCreator = !!user && !!stats && stats.creator.toLowerCase() === user.toLowerCase();

  /** Runs a wallet transaction on this vault's chain and refreshes the stats after it confirms. */
  async function send(label: string, run: (wc: Awaited<ReturnType<typeof walletClientFor>>) => Promise<`0x${string}`>) {
    setError(null);
    setStatus(null);
    if (!wallet) return setError("Connect a wallet first.");
    setBusy(true);
    try {
      const wc = await walletClientFor(wallet, telos!);
      const hash = await run(wc);
      setStatus(`${label}: waiting for confirmation…`);
      await publicClientFor(telos!).waitForTransactionReceipt({ hash });
      setStatus(`${label}: confirmed.`);
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  function onDeposit(event: FormEvent) {
    event.preventDefault();
    let value: bigint;
    try {
      value = parseEther(depositEth);
    } catch {
      return setError("Enter an ETH amount.");
    }
    if (value <= 0n) return setError("Deposit must be greater than zero.");
    send("Deposit", (wc) =>
      wc.writeContract({
        address,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [user!],
        value,
        account: user!,
        chain: telos!.chain,
      }),
    );
  }

  function onWithdrawAll() {
    if (!stats || stats.myShares === 0n) return;
    send("Withdraw", (wc) =>
      wc.writeContract({
        address,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [stats.myShares, user!],
        account: user!,
        chain: telos!.chain,
      }),
    );
  }

  async function onBridge(event: FormEvent) {
    event.preventDefault();
    let amount: bigint;
    try {
      amount = parseEther(bridgeEth);
    } catch {
      return setError("Enter an ETH amount to bridge.");
    }
    const to = (bridgeTo || user || "") as Address;
    if (!to) return setError("Enter a destination address.");
    setError(null);
    try {
      const client = publicClientFor(telos!);
      const [nativeFee, amountReceived] = await client.readContract({
        address,
        abi: VAULT_ABI,
        functionName: "quoteBridgeOut",
        args: [bridgeEid, to, amount],
      });
      // Allow 0.5% slippage on the received amount.
      const minAmountReceived = (amountReceived * 9950n) / 10000n;
      send("Bridge out", (wc) =>
        wc.writeContract({
          address,
          abi: VAULT_ABI,
          functionName: "bridgeOut",
          args: [bridgeEid, to, amount, minAmountReceived],
          value: nativeFee,
          account: user!,
          chain: telos!.chain,
        }),
      );
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  function onMark(event: FormEvent) {
    event.preventDefault();
    let value: bigint;
    try {
      value = parseEther(markEth);
    } catch {
      return setError("Enter the ETH value currently deployed outside the vault.");
    }
    send("Update deployed value", (wc) =>
      wc.writeContract({
        address,
        abi: VAULT_ABI,
        functionName: "setDeployedValue",
        args: [value],
        account: user!,
        chain: telos!.chain,
      }),
    );
  }

  return (
    <section className="panel" aria-labelledby="vault-onchain-heading">
      <h2 id="vault-onchain-heading">Onchain vault</h2>
      <p className="field-hint">
        {telos.name} · <code>{address}</code>
      </p>

      {loadError ? <p className="registry-error" role="alert">{loadError}</p> : null}

      {stats ? (
        <dl className="vault-stats">
          <div>
            <dt>Total assets</dt>
            <dd>{formatEther(stats.totalAssets)} ETH</dd>
          </div>
          <div>
            <dt>Deployed outside vault</dt>
            <dd>{formatEther(stats.deployedValue)} ETH</dd>
          </div>
          <div>
            <dt>Shares outstanding</dt>
            <dd>{formatUnits(stats.totalSupply, SHARE_DECIMALS)}</dd>
          </div>
          <div>
            <dt>Your shares</dt>
            <dd>{formatUnits(stats.myShares, SHARE_DECIMALS)}</dd>
          </div>
          <div>
            <dt>Your value if withdrawn now</dt>
            <dd>{formatEther(stats.myNetValue)} ETH (after fees)</dd>
          </div>
          <div>
            <dt>Creator fee</dt>
            <dd>{Number(stats.creatorFeeBps) / 100}%</dd>
          </div>
        </dl>
      ) : null}

      {!wallet ? <p className="field-hint">Connect a wallet to deposit or withdraw.</p> : null}

      <form onSubmit={onDeposit} className="field">
        <label htmlFor="vault-deposit">Deposit ETH</label>
        <div className="registry-grid-2">
          <input id="vault-deposit" className="input" inputMode="decimal" placeholder="0.0" value={depositEth} onChange={(e) => setDepositEth(e.target.value)} />
          <button type="submit" className="btn" disabled={busy || !wallet}>
            Deposit
          </button>
        </div>
      </form>

      <div className="field">
        <button type="button" className="btn btn-plain" onClick={onWithdrawAll} disabled={busy || !wallet || !stats || stats.myShares === 0n}>
          Withdraw all my shares
        </button>
      </div>

      {isCreator ? (
        <>
          {telos.canBridge ? (
            <form onSubmit={onBridge} className="field">
              <label htmlFor="vault-bridge-chain">Bridge idle ETH out (Stargate)</label>
              <select id="vault-bridge-chain" className="input" value={bridgeEid} onChange={(e) => setBridgeEid(Number(e.target.value))}>
                {BRIDGE_DESTINATIONS.map((item) => (
                  <option key={item.eid} value={item.eid}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input className="input" placeholder={`Recipient (default: you)`} value={bridgeTo} onChange={(e) => setBridgeTo(e.target.value)} />
              <input className="input" inputMode="decimal" placeholder="ETH amount" value={bridgeEth} onChange={(e) => setBridgeEth(e.target.value)} />
              <button type="submit" className="btn" disabled={busy}>
                Bridge out
              </button>
              <p className="field-hint">The Stargate fee is paid by you, not the vault.</p>
            </form>
          ) : (
            <p className="field-hint">Bridging is not available on {telos.name}: Stargate has no native ETH pool there.</p>
          )}

          <form onSubmit={onMark} className="field">
            <label htmlFor="vault-mark">Set value deployed outside the vault (ETH)</label>
            <div className="registry-grid-2">
              <input id="vault-mark" className="input" inputMode="decimal" placeholder="0.0" value={markEth} onChange={(e) => setMarkEth(e.target.value)} />
              <button type="submit" className="btn" disabled={busy}>
                Update
              </button>
            </div>
          </form>
        </>
      ) : null}

      {status ? <p className="field-hint" role="status">{status}</p> : null}
      {error ? <p className="registry-error" role="alert">{error}</p> : null}
    </section>
  );
}

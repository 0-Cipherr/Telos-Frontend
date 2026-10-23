import { useRegistryActionModal } from "../custom-contexts/ModalContext";
import ThemeToggle from "./ThemeToggle";

type NavbarProps = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
  onCreateStrategy: () => void;
};

export default function Navbar({
  ready,
  authenticated,
  login,
  logout,
  address,
  onCreateStrategy,
}: NavbarProps) {
  const short = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Disconnect";
  const { setOpen } = useRegistryActionModal();

  const action = !ready ? null : authenticated ? (
    <button type="button" className="btn btn-sm" onClick={logout}>
      {short}
    </button>
  ) : (
    <button type="button" className="btn btn-sm" onClick={login}>
      Connect Wallet
    </button>
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <nav className="toplinks" aria-label="Main">
            <a href="#vaults">Browse</a>
            <span className="sep" aria-hidden="true">
              |
            </span>
            <a href="#calculator">Governance</a>
            <span className="sep" aria-hidden="true">
              |
            </span>
            <a href="#launch">Fourm </a>
            <span className="sep" aria-hidden="true">
              |
            </span>
            <a href="#launch">Vaults</a>
            <span className="sep" aria-hidden="true">
              |
            </span>
            <a
              href="#launch"
              onClick={() => {
                setOpen(true);
              }}
            >
              Create Vault
            </a>
            <span className="sep" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              className="nav-strategy"
              onClick={onCreateStrategy}
              title="Draft a strategy with the LLM strategist"
            >
              <span className="nav-strategy-spark" aria-hidden="true">
                ✦
              </span>
              Create Strategy
            </button>
          </nav>
          <div className="top-actions">
            <ThemeToggle />
            {action}
          </div>
        </div>
      </header>
    </>
  );
}

import { Link, useLocation } from "react-router-dom";
import { useRegistryActionModal } from "../custom-contexts/ModalContext";
import { useStrategyLauncher } from "../custom-contexts/StrategyLauncherContext";
import CreatorAvatar from "./CreatorAvatar";
import ThemeToggle from "./ThemeToggle";

type NavbarProps = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
};

const LINKS = [
  { to: "/vaults", label: "Vaults", index: "01" },
  { to: "/deeds", label: "Deeds", index: "02" },
  { to: "/forums", label: "AI Forums", index: "03" },
  { to: "/#calculator", label: "Calculator", index: "04" },
  { to: "/#how", label: "How it works", index: "05" },
];

export default function Navbar({
  ready,
  authenticated,
  login,
  logout,
  address,
}: NavbarProps) {
  const short = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Disconnect";
  const { setOpen } = useRegistryActionModal();
  const { openStrategy } = useStrategyLauncher();
  const location = useLocation();

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
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="topbar-brand">
          tel<span className="lime-text">os</span>
        </Link>
        <nav className="toplinks" aria-label="Main">
          {LINKS.map((link) => {
            const active =
              (link.to === "/vaults" &&
                location.pathname.startsWith("/vaults")) ||
              (link.to === "/deeds" &&
                location.pathname.startsWith("/deeds")) ||
              (link.to === "/forums" &&
                location.pathname.startsWith("/forums"));
            return (
              <span className="toplink-wrap" key={link.to}>
                <Link
                  to={link.to}
                  className={active ? "is-active" : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
                <span className="sep" aria-hidden="true">
                  |
                </span>
              </span>
            );
          })}
          <button
            type="button"
            className="linklike"
            onClick={() => setOpen(true)}
          >
            Create Vault
          </button>
          <span className="sep" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            className="nav-strategy"
            onClick={openStrategy}
            title="Draft a strategy with the LLM strategist"
          >
            <span className="nav-strategy-code" aria-hidden="true">
              {"{}"}
            </span>
            Create Strategy
          </button>
        </nav>
        <div className="top-actions">
          {authenticated && address ? (
            <Link
              to={`/creators/${encodeURIComponent(address)}`}
              className={`nav-profile${
                location.pathname.startsWith("/creators") ||
                location.pathname.startsWith("/profile")
                  ? " is-active"
                  : ""
              }`}
              title="Open your creator profile"
            >
              <CreatorAvatar address={address} size={18} />
              <span>Profile</span>
            </Link>
          ) : null}
          <ThemeToggle />
          {action}
        </div>
      </div>
    </header>
  );
}

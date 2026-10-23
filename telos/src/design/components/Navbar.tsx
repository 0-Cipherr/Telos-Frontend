import { useState } from "react";
import { useRegistryActionModal } from "../../custom-contexts/ModalContext";
import { truncateAddress } from "../data";
import type { TemplateProps } from "../types";
import RegistryActionModal from "./RegistryActionModal";
import TemplateMark from "./TemplateMark";

const LINKS = [
  { href: "#marketplace", label: "Marketplace", index: "01" },
  { href: "#thesis", label: "Theses", index: "02" },
  { href: "#builder", label: "Build", index: "03" },
  { href: "#calculator", label: "Calculator", index: "04" },
  { href: "#faq", label: "FAQ", index: "05" },
];

type Props = Pick<
  TemplateProps,
  "ready" | "authenticated" | "login" | "logout" | "address"
>;

export default function Navbar({
  ready,
  authenticated,
  login,
  logout,
  address,
}: Props) {
  const [open, setOpen] = useState(false);
  const registryModalContext: any = useRegistryActionModal();

  const wallet = !ready ? (
    <button type="button" className="tl-btn tl-btn--sm" disabled>
      SYNCING…
    </button>
  ) : authenticated ? (
    <button
      type="button"
      className="tl-btn tl-btn--sm tl-btn--wallet"
      onClick={logout}
      aria-label={`Disconnect wallet ${address ?? ""}`}
      title="Disconnect wallet"
    >
      <span className="tl-dot tl-dot--live" aria-hidden="true" />
      {truncateAddress(address)}
    </button>
  ) : (
    <button
      type="button"
      className="tl-btn tl-btn--sm tl-btn--primary"
      onClick={login}
    >
      CONNECT WALLET
    </button>
  );

  return (
    <header className="tl-nav">
      {registryModalContext.open && <RegistryActionModal />}
      <div className="tl-wrap tl-nav__inner">
        <a href="#top" className="tl-brand" aria-label="Telos home">
          <TemplateMark size={28} />
          <span className="tl-brand__text">
            TELOS
            <span className="tl-brand__meta">V.01 / TESTNET</span>
          </span>
        </a>

        <nav className="tl-nav__links" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="tl-nav__link">
              <span aria-hidden="true">{link.index}</span>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="tl-nav__actions">
          <span className="tl-status" title="Base Sepolia and Arbitrum Sepolia">
            <span className="tl-dot tl-dot--live" aria-hidden="true" />
            TESTNET
          </span>
          {wallet}
          <button
            type="button"
            className="tl-menu-btn"
            aria-expanded={open}
            aria-controls="tl-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="tl-sr">Toggle navigation</span>
            <span
              className={`tl-menu-icon ${open ? "is-open" : ""}`}
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div className="tl-mobile" id="tl-mobile-menu">
          <div className="tl-wrap">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="tl-mobile__link"
                onClick={() => setOpen(false)}
              >
                <span>{link.index}</span>
                {link.label}
                <span aria-hidden="true">→</span>
              </a>
            ))}
            <p className="tl-mobile__note">
              BASE SEPOLIA · ARBITRUM SEPOLIA
              <br />
              All market data on this page is sample data.
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );
}

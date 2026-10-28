import type { TemplateProps } from "./types";
import { VAULTS } from "./data";
import "./telos.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marketplace from "./components/Marketplace";
import ThesisBoard from "./components/ThesisBoard";
import YieldCalculator from "./components/YieldCalculator";
import VaultBuilder from "./components/VaultBuilder";
import NetworkSection from "./components/NetworkSection";
import Faq from "./components/Faq";
import ClosingBand from "./components/ClosingBand";
import Footer from "./components/Footer";

/**
 * Drop-in visual replacement for Home.tsx. Same props, same sections,
 * same sample data, same wallet handlers — zero contract calls added.
 */
export default function TelosTemplate({
  ready,
  authenticated,
  login,
  logout,
  address,
  preview,
}: TemplateProps) {
  return (
    <div className="telos" id="top">
      <a className="tl-skip" href="#main">
        Skip to content
      </a>

      {preview ? (
        <div className="tl-preview">
          PREVIEW MODE · VITE_PRIVY_APP_ID NOT SET · WALLET ACTIONS DISABLED
        </div>
      ) : null}

      <div className="tl-bg" aria-hidden="true" />
      <div className="tl-glow" aria-hidden="true" />

      <Navbar
        ready={ready}
        authenticated={authenticated}
        login={login}
        logout={logout}
        address={address}
      />

      <main id="main">
        <Hero vaults={VAULTS} />
        <Marketplace />
        <ThesisBoard address={address} />
        <YieldCalculator />
        <VaultBuilder
          ready={ready}
          authenticated={authenticated}
          login={login}
          address={address}
        />
        <NetworkSection />
        <Faq />
        <ClosingBand
          ready={ready}
          authenticated={authenticated}
          login={login}
          address={address}
        />
      </main>

      <Footer />
    </div>
  );
}

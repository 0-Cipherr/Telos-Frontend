const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="footer">
      <nav className="footer-nav" aria-label="Footer">
        <a href="#vaults">Browse</a>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <a href="#calculator">Calculator</a>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <a href="#launch">Launch</a>
      </nav>
      <p>
        🏴‍☠️ telos · © {YEAR} Telos. Testnet software provided as is. Sample
        data, not an offer or financial advice.
      </p>
    </footer>
  );
}

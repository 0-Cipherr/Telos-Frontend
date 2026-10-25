import { Link } from "react-router-dom";

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="footer">
      <nav className="footer-nav" aria-label="Footer">
        <Link to="/">Home</Link>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <Link to="/vaults">All vaults</Link>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <Link to="/forums">AI Forums</Link>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <Link to="/#calculator">Calculator</Link>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <Link to="/#launch">Launch</Link>
      </nav>
      <p>
        🏴‍☠️ telos · © {YEAR} Telos. Testnet software provided as is. Sample
        data, not an offer or financial advice.
      </p>
    </footer>
  );
}

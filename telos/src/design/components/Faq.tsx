import SectionHead from "./SectionHead";

const FAQS = [
  {
    q: "Who sets a vault's fee?",
    a: "The vault creator sets their own fee when they deploy. Each vault shows its creator and fee before you deposit.",
  },
  {
    q: "Is Telos live on mainnet?",
    a: "Not yet. Telos is deployed on Base Sepolia and Arbitrum Sepolia testnets.",
  },
  {
    q: "Are the APYs and vaults on this page real?",
    a: "No. Every APY, TVL, creator and fee in this template is sample data for design preview. Protocol names are example strategy targets, not partnerships.",
  },
  {
    q: "What are ready-made vaults?",
    a: "Vaults wrapping an existing DeFi app's strategy through a StrategyAdapter, so users get that yield in a standard ERC-4626 vault.",
  },
  {
    q: "What are custom vaults?",
    a: "Vaults where a creator defines their own strategy, asset and fee, then launches it on supported chains.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="tl-wrap tl-section" aria-labelledby="tl-faq-title">
      <SectionHead
        id="tl-faq-title"
        index="07"
        kicker="REFERENCE / FAQ"
        title="Straight answers."
        lede="What the protocol does, what this page does not do, and which numbers are placeholders."
        meta="05 ENTRIES"
      />

      <div className="tl-faq">
        {FAQS.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

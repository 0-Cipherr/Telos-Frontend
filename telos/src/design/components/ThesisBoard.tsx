import { useState } from "react";
import type { FormEvent } from "react";
import { ASSETS, CHAINS, THESES, truncateAddress } from "../data";
import type { TemplateProps } from "../types";
import SectionHead from "./SectionHead";
import { Field, Select } from "./Field";

type Props = Pick<TemplateProps, "address">;

type FormState = {
  name: string;
  asset: string;
  network: string;
  abstract: string;
};

export default function ThesisBoard({ address }: Props) {
  const [form, setForm] = useState<FormState>({
    name: "",
    asset: ASSETS[0],
    network: CHAINS[0],
    abstract: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (key: keyof FormState, value: string) => {
    setSubmitted(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section
      id="thesis"
      className="tl-wrap tl-section"
      aria-labelledby="tl-thesis-title"
    >
      <SectionHead
        id="tl-thesis-title"
        index="03"
        kicker="RESEARCH / STRATEGY FILES"
        title="Strategy thesis board."
        lede="A thesis is the argument before the allocation. Read the risk case, check the assets and networks, then decide whether the vault earns your capital."
        meta="04 FILES / OPEN ACCESS"
      />

      <div className="tl-thesis-layout">
        <div className="tl-thesis-grid">
          {THESES.map((thesis) => (
            <details className="tl-thesis" key={thesis.id}>
              <summary>
                <div className="tl-thesis__top">
                  <span className="tl-card__id">{thesis.id}</span>
                  <span
                    className={`tl-risk tl-risk--${thesis.risk.toLowerCase()}`}
                  >
                    <i aria-hidden="true" />
                    {thesis.risk} RISK
                  </span>
                </div>
                <h3>{thesis.name}</h3>
                <p className="tl-thesis__summary">{thesis.summary}</p>
                <div className="tl-thesis__foot">
                  <span className="tl-chip">{thesis.assets.join(" / ")}</span>
                  <span className="tl-thesis__open">OPEN FILE</span>
                </div>
              </summary>
              <div className="tl-thesis__body">
                <p>{thesis.body}</p>
                <dl>
                  <div>
                    <dt>ASSETS</dt>
                    <dd>{thesis.assets.join(" · ")}</dd>
                  </div>
                  <div>
                    <dt>NETWORKS</dt>
                    <dd>{thesis.networks.join(" · ")}</dd>
                  </div>
                  <div>
                    <dt>RISK CLASS</dt>
                    <dd>{thesis.risk}</dd>
                  </div>
                </dl>
                <p className="tl-disclaimer">
                  Research preview. Not investment advice and not an offer to
                  sell any product.
                </p>
              </div>
            </details>
          ))}
        </div>

        <div className="tl-submit">
          <div className="tl-panel__bar">
            <span className="tl-label">SUBMIT A THESIS</span>
            <span className="tl-panel__meta">PREVIEW</span>
          </div>

          <form onSubmit={handleSubmit}>
            <Field label="THESIS TITLE" htmlFor="tl-thesis-name">
              <input
                id="tl-thesis-name"
                className="tl-input"
                type="text"
                value={form.name}
                maxLength={80}
                required
                placeholder="e.g. Short-duration stable carry"
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>

            <div className="tl-form-row">
              <Field label="PRIMARY ASSET" htmlFor="tl-thesis-asset">
                <Select
                  id="tl-thesis-asset"
                  value={form.asset}
                  options={ASSETS}
                  onChange={(value) => update("asset", value)}
                />
              </Field>
              <Field label="NETWORK" htmlFor="tl-thesis-network">
                <Select
                  id="tl-thesis-network"
                  value={form.network}
                  options={CHAINS}
                  onChange={(value) => update("network", value)}
                />
              </Field>
            </div>

            <Field
              label="ABSTRACT"
              htmlFor="tl-thesis-abstract"
              meta={`${form.abstract.length}/400`}
              hint="State the edge, the failure mode, and the exit."
            >
              <textarea
                id="tl-thesis-abstract"
                className="tl-input tl-textarea"
                value={form.abstract}
                maxLength={400}
                minLength={20}
                required
                rows={5}
                placeholder="What does this strategy earn, and what breaks it?"
                onChange={(event) => update("abstract", event.target.value)}
              />
            </Field>

            <button type="submit" className="tl-btn tl-btn--primary tl-btn--block">
              SUBMIT FOR REVIEW <span aria-hidden="true">→</span>
            </button>

            <p className="tl-field__hint">
              Submitting as {address ? truncateAddress(address) : "guest"}.
            </p>

            {submitted ? (
              <p className="tl-form-status" role="status">
                PREVIEW ONLY — this proposal is not saved. No submission
                endpoint is connected to this template.
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}

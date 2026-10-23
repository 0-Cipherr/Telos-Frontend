type Props = {
  id: string;
  index: string;
  kicker: string;
  title: string;
  lede: string;
  meta?: string;
};

export default function SectionHead({
  id,
  index,
  kicker,
  title,
  lede,
  meta,
}: Props) {
  return (
    <div className="tl-section__head">
      <div>
        <div className="tl-anno">
          <span className="tl-anno__box">[{index}]</span>
          <span className="tl-anno__line" aria-hidden="true" />
          <span>{kicker}</span>
        </div>
        <h2 id={id}>{title}</h2>
        <p className="tl-lede">{lede}</p>
      </div>
      {meta ? <span className="tl-section__meta">{meta}</span> : null}
    </div>
  );
}

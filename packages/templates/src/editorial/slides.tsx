import type { CSSProperties, ReactNode } from "react";
import { formatNumber, formatPrice, slideCounter } from "../format.ts";
import { templateHeadingStyle } from "../heading-font.ts";
import type { SlideComponent, SlideContext } from "../types.ts";

/**
 * Editorial display type is Playfair Display when the brand kit keeps the default heading font
 * (Inter); a brand kit that picked another bundled font keeps it. See heading-font.ts.
 */
const EDITORIAL_HEADING_FONT = "Playfair Display";

function Photo({ file, ctx, className }: { file: string; ctx: SlideContext; className: string }) {
  const focal = ctx.focalPoints[file] ?? { x: 0.5, y: 0.5 };
  const style: CSSProperties = { objectPosition: `${focal.x * 100}% ${focal.y * 100}%` };
  return (
    <div className={`pic ${className}`}>
      <img className="photo" src={ctx.photoUrl(file)} alt="" style={style} />
    </div>
  );
}

/** Running footer like a magazine folio: city on the left, page number on the right. */
function Shell({
  ctx,
  className,
  children,
}: {
  ctx: SlideContext;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={`slide ${className}`} style={templateHeadingStyle(ctx, EDITORIAL_HEADING_FONT)}>
      {children}
      <div className="folio">
        <span className="folio-city line" data-fit="folio-city">
          {ctx.listing.address.city}
        </span>
        <span className="counter">{slideCounter(ctx.index, ctx.total)}</span>
      </div>
    </div>
  );
}

export const Cover: SlideComponent<"cover"> = ({ slide, ctx }) => {
  const { address } = ctx.listing;
  return (
    <Shell ctx={ctx} className="cover">
      <Photo file={slide.photo} ctx={ctx} className="hero" />
      <div className="columns">
        <div className="main">
          <div className="bar" />
          <h1 className="headline" data-fit="headline">
            {slide.headline}
          </h1>
        </div>
        <div className="side">
          <div className="price line" data-fit="price">
            {formatPrice(ctx.listing.price_cad)}
          </div>
          <div className="address" data-fit="address">
            {address.street}, {address.city}
          </div>
        </div>
      </div>
    </Shell>
  );
};

export const Feature: SlideComponent<"feature"> = ({ slide, ctx }) => (
  <Shell ctx={ctx} className="feature">
    <Photo file={slide.photo} ctx={ctx} className="hero" />
    <div className="number">{String(ctx.index + 1).padStart(2, "0")}</div>
    <div className="text">
      <h2 className="headline" data-fit="headline">
        {slide.headline}
      </h2>
      <p className="quote" data-fit="body">
        {slide.body}
      </p>
    </div>
  </Shell>
);

export const Stats: SlideComponent<"stats"> = ({ slide, ctx }) => {
  const { beds, baths, sqft, price_cad } = ctx.listing;
  const items = [
    { value: formatNumber(beds), label: beds === 1 ? "Bed" : "Beds" },
    { value: formatNumber(baths), label: baths === 1 ? "Bath" : "Baths" },
    { value: formatNumber(sqft), label: "Sq ft" },
  ];
  return (
    <Shell ctx={ctx} className={`stats${slide.photo ? "" : " no-photo"}`}>
      <h2 className="headline" data-fit="headline">
        {slide.headline}
      </h2>
      {slide.photo ? <Photo file={slide.photo} ctx={ctx} className="side-photo" /> : null}
      <div className="rows">
        {items.map((item) => (
          <div className="row" key={item.label}>
            <div className="value line" data-fit={`stat-${item.label}`}>
              {item.value}
            </div>
            <div className="label line">{item.label}</div>
          </div>
        ))}
        <div className="row price-row">
          <div className="price line" data-fit="price">
            {formatPrice(price_cad)}
          </div>
          <div className="label line">Price</div>
        </div>
      </div>
    </Shell>
  );
};

export const Gallery: SlideComponent<"gallery"> = ({ slide, ctx }) => (
  <Shell ctx={ctx} className={`gallery n${slide.photos.length}`}>
    <h2 className="headline" data-fit="headline">
      {slide.headline}
    </h2>
    {slide.photos.map((file, i) => (
      <Photo file={file} ctx={ctx} className={`p${i + 1}`} key={file} />
    ))}
    {slide.photos.length === 2 ? (
      <div className="caption" data-fit="caption">
        {ctx.listing.address.street}
      </div>
    ) : null}
  </Shell>
);

export const Neighbourhood: SlideComponent<"neighbourhood"> = ({ slide, ctx }) => (
  <Shell ctx={ctx} className="neighbourhood">
    <Photo file={slide.photo} ctx={ctx} className="hero" />
    <h2 className="headline" data-fit="headline">
      {slide.headline}
    </h2>
    {/* A drop cap only reads well on a letter; "9081 Lookout…" would set a giant digit. */}
    <p className={/^[A-Za-z]/.test(slide.body) ? "body dropcap" : "body"} data-fit="body">
      {slide.body}
    </p>
  </Shell>
);

export const Cta: SlideComponent<"cta"> = ({ slide, ctx }) => {
  const agent = ctx.brandKit;
  return (
    <Shell ctx={ctx} className={`cta${slide.photo ? "" : " no-photo"}`}>
      {slide.photo ? <Photo file={slide.photo} ctx={ctx} className="hero" /> : null}
      <div className="content">
        <div className="pair">
          <h2 className="headline" data-fit="headline">
            {slide.headline}
          </h2>
          <p className="quote" data-fit="body">
            {slide.body}
          </p>
        </div>
        <div className="agent">
          <div className="agent-name line" data-fit="agent-name">
            {agent.agentName}
          </div>
          <div className="agent-line line" data-fit="brokerage">
            {agent.brokerage}
          </div>
          <div className="agent-line line" data-fit="phone">
            {agent.phone}
          </div>
          <div className="agent-line line" data-fit="email">
            {agent.email}
          </div>
        </div>
      </div>
    </Shell>
  );
};

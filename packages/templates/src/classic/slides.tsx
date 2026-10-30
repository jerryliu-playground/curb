import type { CSSProperties, ReactNode } from "react";
import { formatNumber, formatPrice, slideCounter } from "../format.ts";
import { templateHeadingStyle } from "../heading-font.ts";
import type { SlideComponent, SlideContext } from "../types.ts";

/**
 * Classic headings are set in Cormorant Garamond when the brand kit keeps the default heading
 * font (Inter); a brand kit that picked another bundled font keeps it. See heading-font.ts.
 */
const CLASSIC_HEADING_FONT = "Cormorant Garamond";

function Photo({ file, ctx }: { file: string; ctx: SlideContext }) {
  const focal = ctx.focalPoints[file] ?? { x: 0.5, y: 0.5 };
  const style: CSSProperties = { objectPosition: `${focal.x * 100}% ${focal.y * 100}%` };
  return <img className="photo" src={ctx.photoUrl(file)} alt="" style={style} />;
}

function Frame({ file, ctx, className }: { file: string; ctx: SlideContext; className: string }) {
  return (
    <div className={`frame ${className}`}>
      <Photo file={file} ctx={ctx} />
    </div>
  );
}

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
    <div className={`slide ${className}`} style={templateHeadingStyle(ctx, CLASSIC_HEADING_FONT)}>
      {children}
      <div className="counter">{slideCounter(ctx.index, ctx.total)}</div>
    </div>
  );
}

const Rule = () => <div className="rule" />;

export const Cover: SlideComponent<"cover"> = ({ slide, ctx }) => {
  const { address } = ctx.listing;
  return (
    <Shell ctx={ctx} className="cover">
      <Frame file={slide.photo} ctx={ctx} className="hero" />
      <div className="text">
        <h1 className="headline" data-fit="headline">
          {slide.headline}
        </h1>
        <Rule />
        <div className="price line" data-fit="price">
          {formatPrice(ctx.listing.price_cad)}
        </div>
        <div className="address" data-fit="address">
          {address.street}, {address.city}
        </div>
      </div>
    </Shell>
  );
};

export const Feature: SlideComponent<"feature"> = ({ slide, ctx }) => (
  <Shell ctx={ctx} className="feature">
    <Frame file={slide.photo} ctx={ctx} className="hero" />
    <div className="text">
      <h2 className="headline" data-fit="headline">
        {slide.headline}
      </h2>
      <Rule />
      <p className="body" data-fit="body">
        {slide.body}
      </p>
    </div>
  </Shell>
);

export const Stats: SlideComponent<"stats"> = ({ slide, ctx }) => {
  const { beds, baths, sqft, price_cad } = ctx.listing;
  const items = [
    { value: formatNumber(beds), label: beds === 1 ? "Bedroom" : "Bedrooms" },
    { value: formatNumber(baths), label: baths === 1 ? "Bathroom" : "Bathrooms" },
    { value: formatNumber(sqft), label: "Square feet" },
  ];
  return (
    <Shell ctx={ctx} className={`stats${slide.photo ? "" : " no-photo"}`}>
      {slide.photo ? <Frame file={slide.photo} ctx={ctx} className="hero" /> : null}
      <div className="text">
        <h2 className="headline" data-fit="headline">
          {slide.headline}
        </h2>
        <Rule />
        <div className="grid">
          {items.map((item) => (
            <div className="stat" key={item.label}>
              <div className="value line" data-fit={`stat-${item.label}`}>
                {item.value}
              </div>
              <div className="label line">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="price line" data-fit="price">
          {formatPrice(price_cad)}
        </div>
      </div>
    </Shell>
  );
};

export const Gallery: SlideComponent<"gallery"> = ({ slide, ctx }) => (
  <Shell ctx={ctx} className="gallery">
    <div className="text">
      <h2 className="headline" data-fit="headline">
        {slide.headline}
      </h2>
      <Rule />
    </div>
    <div className={`grid n${slide.photos.length}`}>
      {slide.photos.map((file) => (
        <Frame file={file} ctx={ctx} className="cell" key={file} />
      ))}
    </div>
  </Shell>
);

export const Neighbourhood: SlideComponent<"neighbourhood"> = ({ slide, ctx }) => (
  <Shell ctx={ctx} className="neighbourhood">
    <Frame file={slide.photo} ctx={ctx} className="arch" />
    <div className="text">
      <h2 className="headline" data-fit="headline">
        {slide.headline}
      </h2>
      <Rule />
      <p className="body" data-fit="body">
        {slide.body}
      </p>
    </div>
  </Shell>
);

export const Cta: SlideComponent<"cta"> = ({ slide, ctx }) => {
  const agent = ctx.brandKit;
  return (
    <Shell ctx={ctx} className={`cta${slide.photo ? "" : " no-photo"}`}>
      {slide.photo ? <Frame file={slide.photo} ctx={ctx} className="hero" /> : null}
      <div className="text">
        <h2 className="headline" data-fit="headline">
          {slide.headline}
        </h2>
        <p className="body" data-fit="body">
          {slide.body}
        </p>
        <Rule />
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
    </Shell>
  );
};

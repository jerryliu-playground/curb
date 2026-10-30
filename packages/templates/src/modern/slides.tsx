import type { CSSProperties } from "react";
import { formatNumber, formatPrice, slideCounter } from "../format.ts";
import type { SlideComponent, SlideContext } from "../types.ts";

function Photo({ file, ctx }: { file: string; ctx: SlideContext }) {
  const focal = ctx.focalPoints[file] ?? { x: 0.5, y: 0.5 };
  const style: CSSProperties = { objectPosition: `${focal.x * 100}% ${focal.y * 100}%` };
  return <img className="photo" src={ctx.photoUrl(file)} alt="" style={style} />;
}

function Counter({ ctx }: { ctx: SlideContext }) {
  return <div className="counter">{slideCounter(ctx.index, ctx.total)}</div>;
}

export const Cover: SlideComponent<"cover"> = ({ slide, ctx }) => {
  const { address } = ctx.listing;
  return (
    <div className="slide cover">
      <Photo file={slide.photo} ctx={ctx} />
      <div className="scrim" />
      <Counter ctx={ctx} />
      <div className="text">
        <h1 className="headline" data-fit="headline">
          {slide.headline}
        </h1>
        <div className="price line" data-fit="price">
          {formatPrice(ctx.listing.price_cad)}
        </div>
        <div className="address" data-fit="address">
          {address.street}, {address.city}
        </div>
      </div>
    </div>
  );
};

export const Feature: SlideComponent<"feature"> = ({ slide, ctx }) => (
  <div className="slide feature">
    <div className="media">
      <Photo file={slide.photo} ctx={ctx} />
    </div>
    <Counter ctx={ctx} />
    <div className="panel">
      <h2 className="headline" data-fit="headline">
        {slide.headline}
      </h2>
      <p className="body" data-fit="body">
        {slide.body}
      </p>
    </div>
  </div>
);

export const Stats: SlideComponent<"stats"> = ({ slide, ctx }) => {
  const { beds, baths, sqft, price_cad } = ctx.listing;
  const items = [
    { value: formatNumber(beds), label: beds === 1 ? "Bed" : "Beds" },
    { value: formatNumber(baths), label: baths === 1 ? "Bath" : "Baths" },
    { value: formatNumber(sqft), label: "Sq ft" },
  ];
  return (
    <div className={`slide stats${slide.photo ? "" : " no-photo"}`}>
      {slide.photo ? (
        <div className="media">
          <Photo file={slide.photo} ctx={ctx} />
        </div>
      ) : null}
      <Counter ctx={ctx} />
      <div className="content">
        <h2 className="headline" data-fit="headline">
          {slide.headline}
        </h2>
        <div className="grid">
          {items.map((item) => (
            <div key={item.label}>
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
    </div>
  );
};

export const Gallery: SlideComponent<"gallery"> = ({ slide, ctx }) => (
  <div className="slide gallery">
    <div className="bar">
      <h2 className="headline" data-fit="headline">
        {slide.headline}
      </h2>
    </div>
    <Counter ctx={ctx} />
    <div className={`grid n${slide.photos.length}`}>
      {slide.photos.map((file) => (
        <div className="cell" key={file}>
          <Photo file={file} ctx={ctx} />
        </div>
      ))}
    </div>
  </div>
);

export const Neighbourhood: SlideComponent<"neighbourhood"> = ({ slide, ctx }) => (
  <div className="slide neighbourhood">
    <Photo file={slide.photo} ctx={ctx} />
    <Counter ctx={ctx} />
    <div className="box">
      <h2 className="headline" data-fit="headline">
        {slide.headline}
      </h2>
      <p className="body" data-fit="body">
        {slide.body}
      </p>
    </div>
  </div>
);

export const Cta: SlideComponent<"cta"> = ({ slide, ctx }) => {
  const agent = ctx.brandKit;
  return (
    <div className={`slide cta${slide.photo ? "" : " no-photo"}`}>
      {slide.photo ? (
        <div className="media">
          <Photo file={slide.photo} ctx={ctx} />
        </div>
      ) : null}
      <Counter ctx={ctx} />
      <div className="content">
        <h2 className="headline" data-fit="headline">
          {slide.headline}
        </h2>
        <p className="body" data-fit="body">
          {slide.body}
        </p>
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
    </div>
  );
};

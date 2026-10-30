// Editorial: magazine layout with large display type, asymmetric grids, pull-quote body text,
// rules and a running folio; mixes full-bleed and inset photos (SPEC.md §4).
// Sizes are in CSS px on a 1080×1350 slide. `--template-heading` is set per slide (heading-font.ts).
export const EDITORIAL_CSS = `
.slide { position: relative; width: 1080px; height: 1350px; overflow: hidden;
  background: var(--c-bg); color: var(--c-text); font-family: var(--font-body); }
.pic { position: absolute; overflow: hidden; }
.photo { position: absolute; width: 100%; height: 100%; object-fit: cover; }
.headline { font-family: var(--template-heading); font-weight: 700; line-height: 1.3;
  letter-spacing: -0.01em; overflow: hidden; overflow-wrap: break-word; }
.quote { font: italic 400 32px/1.35 var(--template-heading); overflow: hidden;
  overflow-wrap: break-word; padding-left: 28px; border-left: 4px solid var(--c-accent); }
.line { white-space: nowrap; overflow: hidden; }
.folio { position: absolute; left: 72px; right: 72px; bottom: 48px; display: flex;
  justify-content: space-between; gap: 40px; padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  font: 500 20px/1.2 var(--font-body); letter-spacing: 0.18em; text-transform: uppercase; }
.folio-city { max-width: 720px; height: 24px; }
.counter { flex: none; }

/* cover */
.cover .hero { top: 0; left: 0; right: 0; height: 760px; }
.cover .columns { position: absolute; top: 800px; left: 72px; right: 72px; bottom: 120px;
  display: grid; grid-template-columns: 600px 1fr; gap: 40px; }
.cover .bar { width: 80px; height: 6px; margin-bottom: 24px; background: var(--c-accent); }
.cover .headline { font-size: 90px; max-height: 351px; }
.cover .side { padding: 30px 0 0 32px; border-left: 1px solid color-mix(in srgb, var(--c-text) 25%, transparent);
  min-width: 0; }
.cover .price { font: 700 44px/1.3 var(--template-heading); color: var(--c-primary); height: 58px; }
.cover .address { margin-top: 16px; font: 400 24px/1.4 var(--font-body); max-height: 101px;
  overflow: hidden; overflow-wrap: break-word; }

/* feature */
.feature .hero { top: 0; left: 288px; right: 0; height: 820px; }
.feature .number { position: absolute; top: 48px; left: 72px; width: 200px;
  font: italic 400 150px/1.15 var(--template-heading); color: var(--c-accent); }
.feature::before { content: ""; position: absolute; top: 260px; left: 108px; width: 1px;
  height: 560px; background: color-mix(in srgb, var(--c-text) 30%, transparent); }
.feature .text { position: absolute; top: 820px; left: 72px; right: 72px; bottom: 120px;
  display: flex; flex-direction: column; justify-content: center; }
.feature .headline { font-size: 72px; max-width: 860px; max-height: 188px; }
.feature .quote { margin-top: 28px; font-size: 30px; max-height: 163px; }

/* stats */
.stats .headline { position: absolute; top: 72px; left: 72px; right: 72px; font-size: 72px;
  max-height: 188px; }
.stats .side-photo { top: 300px; left: 600px; right: 0; bottom: 130px; }
.stats .rows { position: absolute; top: 300px; left: 72px; width: 480px; bottom: 130px;
  display: flex; flex-direction: column; justify-content: space-between; }
.stats.no-photo .rows { width: 936px; }
.stats.no-photo .value { font-size: 140px; height: 184px; }
.stats .row { display: flex; align-items: baseline; justify-content: space-between; gap: 24px;
  padding-top: 16px; border-top: 1px solid color-mix(in srgb, var(--c-text) 30%, transparent); }
.stats .value { flex: 1 1 auto; min-width: 0; font: 400 96px/1.3 var(--template-heading);
  color: var(--c-primary); height: 125px; }
.stats .price { flex: 1 1 auto; min-width: 0; font: 700 52px/1.3 var(--template-heading);
  color: var(--c-primary); height: 68px; }
.stats .price-row { padding-bottom: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--c-text) 30%, transparent); }
.stats .label { flex: none; font: 600 22px/1.2 var(--font-body); letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--c-accent); }

/* gallery */
.gallery .headline { position: absolute; top: 64px; left: 72px; width: 760px; font-size: 60px;
  max-height: 156px; }
.gallery::before { content: ""; position: absolute; top: 244px; left: 72px; right: 72px;
  height: 2px; background: var(--c-accent); }
.gallery.n3 .p1 { top: 276px; left: 0; right: 0; height: 488px; }
.gallery.n3 .p2 { top: 796px; left: 72px; width: 568px; bottom: 120px; }
.gallery.n3 .p3 { top: 796px; left: 672px; right: 72px; bottom: 120px; }
.gallery.n2 .p1 { top: 276px; left: 0; right: 0; height: 548px; }
.gallery.n2 .p2 { top: 856px; left: 312px; right: 72px; bottom: 120px; }
.gallery .caption { position: absolute; top: 856px; left: 72px; width: 208px; max-height: 140px;
  overflow: hidden; overflow-wrap: break-word; padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--c-text) 30%, transparent);
  font: italic 400 28px/1.25 var(--template-heading); }

/* neighbourhood */
.neighbourhood .hero { top: 0; left: 0; right: 0; height: 820px; }
.neighbourhood .headline { position: absolute; top: 868px; left: 72px; width: 400px;
  font-size: 56px; max-height: 220px; }
.neighbourhood::after { content: ""; position: absolute; top: 876px; left: 491px; width: 1px;
  height: 300px; background: color-mix(in srgb, var(--c-text) 30%, transparent); }
.neighbourhood .body { position: absolute; top: 874px; left: 512px; right: 72px;
  font: 400 28px/1.5 var(--font-body); height: 252px; overflow: hidden;
  overflow-wrap: break-word; }
.neighbourhood .body.dropcap::first-letter { float: left; margin: 6px 12px 0 0;
  font: 700 96px/1 var(--template-heading); color: var(--c-accent); }

/* cta */
.cta { background: var(--c-primary); color: var(--c-bg); }
.cta .hero { top: 0; left: 0; right: 0; height: 600px; }
.cta .content { position: absolute; top: 648px; left: 72px; right: 72px; bottom: 120px;
  display: flex; flex-direction: column; justify-content: flex-end; gap: 56px; }
.cta .pair { display: grid; grid-template-columns: 528px 1fr; gap: 40px; align-items: start; }
.cta .headline { font-size: 60px; max-height: 234px; }
.cta .quote { max-height: 216px; font-size: 30px; }
.cta.no-photo .content { top: 120px; justify-content: center; gap: 96px; }
.cta.no-photo .pair { display: block; }
.cta.no-photo .headline { font-size: 96px; max-height: 375px; }
.cta.no-photo .quote { margin-top: 40px; max-width: 760px; max-height: 162px; }
.cta .agent { padding-top: 28px; border-top: 1px solid color-mix(in srgb, currentColor 30%, transparent); }
.cta .agent-name { font: 700 48px/1.3 var(--template-heading); color: var(--c-accent); height: 63px; }
.cta .agent-line { margin-top: 8px; font: 400 24px/1.3 var(--font-body); height: 32px; }

/* last, so the font shorthands above don't reset it */
.slide .value, .slide .price { font-variant-numeric: lining-nums; }
`;

// Classic: serif headings, generous white space, photos framed with margins (SPEC.md §4).
// Sizes are in CSS px on a 1080×1350 slide. `--template-heading` is set per slide (heading-font.ts).
export const CLASSIC_CSS = `
.slide { position: relative; width: 1080px; height: 1350px; overflow: hidden;
  background: var(--c-bg); color: var(--c-text); font-family: var(--font-body); }
.photo { position: absolute; width: 100%; height: 100%; object-fit: cover; }
.frame { position: absolute; overflow: hidden; }
.frame.hero, .frame.arch { outline: 1px solid color-mix(in srgb, var(--c-primary) 35%, transparent);
  outline-offset: 14px; }
.counter { position: absolute; left: 0; right: 0; bottom: 48px; text-align: center;
  font: 500 20px/1 var(--font-body); letter-spacing: 0.24em; color: var(--c-text); opacity: 0.55; }
.text { position: absolute; left: 72px; right: 72px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; }
.headline { font-family: var(--template-heading); font-weight: 500; color: var(--c-primary);
  line-height: 1.25; letter-spacing: -0.005em; overflow: hidden; overflow-wrap: break-word;
  text-wrap: balance; }
.body { font: 400 30px/1.5 var(--font-body); overflow: hidden; overflow-wrap: break-word;
  text-wrap: pretty; }
.line { white-space: nowrap; overflow: hidden; }
.rule { flex: none; width: 64px; height: 1px; margin: 26px 0; background: var(--c-accent); }

/* cover */
.cover .hero { top: 72px; left: 72px; right: 72px; height: 720px; }
.cover .text { top: 832px; bottom: 104px; }
.cover .headline { font-size: 76px; max-width: 800px; max-height: 190px; }
.cover .price { font: 600 54px/1.25 var(--template-heading); height: 68px; max-width: 936px; }
.cover .address { margin-top: 10px; font: 400 26px/1.35 var(--font-body); letter-spacing: 0.02em;
  max-width: 820px; max-height: 72px; overflow: hidden; opacity: 0.8; }

/* feature */
.feature .hero { top: 72px; left: 72px; right: 72px; height: 740px; }
.feature .text { top: 852px; bottom: 104px; }
.feature .headline { font-size: 64px; max-width: 680px; max-height: 160px; }
.feature .body { max-width: 860px; max-height: 180px; }

/* stats */
.stats .hero { top: 72px; left: 72px; right: 72px; height: 540px; }
.stats .text { top: 652px; bottom: 104px; }
.stats.no-photo .text { top: 96px; }
.stats.no-photo::before { content: ""; position: absolute; inset: 40px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 35%, transparent); }
.stats .headline { font-size: 64px; max-width: 680px; max-height: 160px; }
.stats .grid { display: grid; grid-template-columns: repeat(3, 1fr); width: 936px; }
.stats .stat { padding: 0 16px; }
.stats .stat + .stat { border-left: 1px solid color-mix(in srgb, var(--c-text) 20%, transparent); }
.stats .value { font: 500 84px/1.25 var(--template-heading); color: var(--c-primary); height: 105px; }
.stats .label { margin-top: 12px; font: 500 20px/1.2 var(--font-body); letter-spacing: 0.2em;
  text-transform: uppercase; height: 24px; opacity: 0.75; }
.stats .price { margin-top: 44px; font: 600 52px/1.25 var(--template-heading); height: 65px;
  max-width: 936px; }
.stats .value, .stats .price, .cover .price { font-variant-numeric: lining-nums; }
.stats.no-photo .headline { font-size: 76px; max-width: 800px; max-height: 190px; }
.stats.no-photo .stat { padding: 0 8px; }
.stats.no-photo .value { font-size: 100px; height: 125px; }
.stats.no-photo .label { margin-top: 16px; }
.stats.no-photo .price { margin-top: 64px; font-size: 64px; height: 80px; }

/* gallery */
.gallery .text { top: 80px; }
.gallery .rule { margin-bottom: 0; }
.gallery .headline { font-size: 60px; max-width: 640px; max-height: 150px; }
.gallery .grid { position: absolute; top: 330px; left: 72px; right: 72px; bottom: 120px;
  display: grid; gap: 28px; }
.gallery .cell { position: relative; }
.gallery .grid.n2 { grid-template-columns: 1fr 1fr; }
.gallery .grid.n3 { grid-template-columns: 1.25fr 1fr; grid-template-rows: 1fr 1fr; }
.gallery .grid.n3 .cell:first-child { grid-row: 1 / 3; }

/* neighbourhood */
.neighbourhood .arch { top: 72px; left: 230px; width: 620px; height: 700px;
  border-radius: 310px 310px 0 0; }
.neighbourhood .text { top: 812px; bottom: 104px; }
.neighbourhood .headline { font-size: 64px; max-width: 680px; max-height: 160px; }
.neighbourhood .body { max-width: 860px; max-height: 180px; }

/* cta */
.cta .hero { top: 72px; left: 72px; right: 72px; height: 540px; }
.cta .text { top: 652px; bottom: 104px; }
.cta.no-photo .text { top: 96px; }
.cta.no-photo::before { content: ""; position: absolute; inset: 40px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 35%, transparent); }
.cta .headline { font-size: 64px; max-width: 680px; max-height: 160px; }
.cta .body { margin-top: 18px; max-width: 860px; max-height: 135px; }
.cta .agent-name { font: 600 52px/1.25 var(--template-heading); color: var(--c-primary);
  height: 65px; max-width: 936px; }
.cta .agent-line { margin-top: 8px; font: 400 24px/1.3 var(--font-body); height: 32px;
  max-width: 936px; }
`;

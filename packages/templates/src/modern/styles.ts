// Modern: bold sans, full-bleed photos (SPEC.md §4). Sizes are in CSS px on a 1080×1350 slide.
export const MODERN_CSS = `
.slide { position: relative; width: 1080px; height: 1350px; overflow: hidden;
  background: var(--c-bg); color: var(--c-text); font-family: var(--font-body); }
.photo { position: absolute; width: 100%; height: 100%; object-fit: cover; }
.fill { position: absolute; inset: 0; }
.counter { position: absolute; top: 48px; right: 48px; z-index: 3; padding: 10px 18px;
  border-radius: 999px; background: rgba(0, 0, 0, 0.45); color: #fff;
  font: 600 26px/1 var(--font-body); letter-spacing: 0.04em; }
.headline { font-family: var(--font-heading); font-weight: 800; letter-spacing: -0.02em;
  overflow: hidden; overflow-wrap: break-word; }
.body { overflow: hidden; overflow-wrap: break-word; }
.line { white-space: nowrap; overflow: hidden; }

/* cover */
.cover .scrim { position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 38%, rgba(0,0,0,0.78) 100%); }
.cover .text { position: absolute; left: 72px; right: 72px; bottom: 88px; color: #fff; }
.cover .headline { font-size: 88px; line-height: 1.2; max-height: 212px; }
.cover .price { margin-top: 20px; font: 800 68px/1.2 var(--font-heading); color: var(--c-accent);
  height: 82px; }
.cover .address { margin-top: 12px; font: 500 36px/1.25 var(--font-body); height: 90px; overflow: hidden; }

/* feature */
.feature .media { position: absolute; top: 0; left: 0; width: 1080px; height: 860px; }
.feature .panel { position: absolute; top: 860px; left: 0; right: 0; bottom: 0;
  padding: 56px 72px 0; border-top: 12px solid var(--c-accent); }
.feature .headline { font-size: 72px; line-height: 1.2; max-height: 173px; color: var(--c-primary); }
.feature .body { margin-top: 24px; font: 400 38px/1.3 var(--font-body); max-height: 198px; }

/* stats */
.stats { background: var(--c-primary); color: var(--c-bg); }
.stats .media { position: absolute; top: 0; left: 0; width: 1080px; height: 500px; }
.stats .content { position: absolute; left: 72px; right: 72px; bottom: 96px; }
.stats .headline { font-size: 80px; line-height: 1.2; max-height: 192px; }
.stats .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 56px; }
.stats .value { font: 800 104px/1.2 var(--font-heading); color: var(--c-accent); height: 125px; }
.stats .label { margin-top: 14px; font: 600 30px/1 var(--font-body); letter-spacing: 0.08em;
  text-transform: uppercase; height: 34px; }
.stats .price { margin-top: 56px; padding-top: 32px; border-top: 2px solid rgba(255,255,255,0.25);
  font: 700 56px/1.2 var(--font-heading); height: 100px; }
.stats.no-photo .content { top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; }

/* gallery */
.gallery .bar { position: absolute; top: 0; left: 0; right: 0; height: 220px;
  padding: 0 72px; display: flex; align-items: center; background: var(--c-primary); color: var(--c-bg); }
.gallery .headline { font-size: 64px; line-height: 1.2; max-height: 154px; max-width: 800px; }
.gallery .grid { position: absolute; top: 228px; left: 0; right: 0; bottom: 0; display: grid; gap: 8px; }
.gallery .grid.n2 { grid-template-rows: 1fr 1fr; }
.gallery .grid.n3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.gallery .grid.n3 .cell:first-child { grid-column: 1 / 3; }
.gallery .cell { position: relative; overflow: hidden; }

/* neighbourhood */
.neighbourhood .box { position: absolute; left: 72px; right: 72px; bottom: 96px; padding: 56px;
  background: var(--c-primary); color: var(--c-bg); border-left: 12px solid var(--c-accent); }
.neighbourhood .headline { font-size: 72px; line-height: 1.2; max-height: 173px; }
.neighbourhood .body { margin-top: 24px; font: 400 38px/1.3 var(--font-body); max-height: 198px; }

/* cta */
.cta { background: var(--c-primary); color: var(--c-bg); }
.cta .media { position: absolute; top: 0; left: 0; width: 1080px; height: 540px; }
.cta .content { position: absolute; left: 72px; right: 72px; bottom: 96px; }
.cta .headline { font-size: 80px; line-height: 1.2; max-height: 192px; }
.cta .body { margin-top: 24px; font: 400 40px/1.3 var(--font-body); max-height: 156px; }
.cta .agent { margin-top: 56px; padding-top: 40px; border-top: 2px solid rgba(255,255,255,0.25); }
.cta .agent-name { font: 800 52px/1.2 var(--font-heading); color: var(--c-accent); height: 63px; }
.cta .agent-line { margin-top: 10px; font: 500 34px/1.25 var(--font-body); height: 43px; }
.cta.no-photo .content { top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; }
`;

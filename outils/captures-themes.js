// Captures d'Arc dans chaque thème (Simple avec une carte ouverte + Expert), puis deux planches comparatives.
// Usage (depuis le dossier Arc) : node outils/captures-themes.js [dossier de sortie, défaut captures]
// Prérequis : playwright-core installé (npm i playwright-core) et le Chromium de Playwright dans ~/Library/Caches/ms-playwright.
const path = require('path'), fs = require('fs'), os = require('os');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), __dirname] }));
const pw = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const dir = fs.readdirSync(pw).filter(d => d.startsWith('chromium-')).sort().pop();
const exe = path.join(pw, dir, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const page = 'file://' + path.resolve(__dirname, '../index.html');
const out = path.resolve(process.argv[2] || 'captures');
const THEMES = ['ambre', 'vinyle', 'neon', 'ocean', 'graphite', 'papier'];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: exe }), errs = [];
  for (const th of THEMES) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    // même morceau pour tous les thèmes : Math.random rendu déterministe
    await ctx.addInitScript(t => { localStorage.setItem('arc.theme', JSON.stringify(t)); let x = .42; Math.random = () => (x = (x * 9301 + 49297) % 233280 / 233280); }, th);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(th + ' : ' + e.message));
    await p.goto(page);
    await p.tap('[data-act=generate]'); await p.waitForTimeout(200);
    await p.tap('#sc3 .sch'); await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}/${th}-simple.png` });
    await p.tap('[data-act=ui][data-v=expert]'); await p.waitForTimeout(250);
    await p.screenshot({ path: `${out}/${th}-expert.png` });
    await ctx.close();
  }
  // planches : une page HTML qui aligne les captures (en data: URI, file:// est bloqué), photographiée par le même navigateur
  const p = await b.newPage({ viewport: { width: 1240, height: 900 } });
  for (const mode of ['simple', 'expert']) {
    const cells = THEMES.map(t => `<figure><img src="data:image/png;base64,${fs.readFileSync(`${out}/${t}-${mode}.png`).toString('base64')}"><figcaption>${t}</figcaption></figure>`).join('');
    await p.setContent(`<style>body{margin:0;background:#3a3a3a;font:600 18px -apple-system,sans-serif;color:#eee}main{display:grid;grid-template-columns:repeat(3,390px);gap:20px;padding:20px}figure{margin:0}img{width:390px;display:block;border-radius:14px}figcaption{text-align:center;padding:8px 0 0;text-transform:capitalize}</style><main>${cells}</main>`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/planche-${mode}.png`, fullPage: true });
  }
  await b.close();
  console.log(errs.length ? 'Erreurs :\n' + errs.join('\n') : `Captures dans ${out}`);
})();

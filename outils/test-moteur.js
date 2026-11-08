// Test du moteur d'Arc : node outils/test-moteur.js index.html (puis node --check outils/arc-extracted.js)
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
fs.writeFileSync(__dirname + '/arc-extracted.js', js);
const engine = js.slice(0, js.indexOf('/* ============ INTERFACE'));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(engine + '\nthis.API={EL,SEC,FAM,FLAV,TPL,R,ORDER,MIG,parseSeq,poolOf,tplOf,buildVersion,timeline,migrate,loopTypeOf};', ctx);
const A = ctx.API;

let runs = 0, errors = [];
const fail = (m, c) => { if (errors.length < 30) errors.push(m + ' :: ' + JSON.stringify(c)); };
const elSets = {
  defaut: Object.fromEntries(A.ORDER.map(e => [e, e !== 'f'])),
  tout: Object.fromEntries(A.ORDER.map(e => [e, true])),
  kickSeul: Object.fromEntries(A.ORDER.map(e => [e, e === 'k'])),
  sansBatterie: Object.fromEntries(A.ORDER.map(e => [e, !'ksdp'.includes(e)])),
};
const loops = [{ type: 'none', len: 16 }];
['main', 'verse', 'break'].forEach(t => [8, 16].forEach(len => loops.push({ type: t, len })));
const covered = {};

for (const fam of Object.keys(A.FAM)) {
  const flavors = [null, ...Object.keys(A.FLAV).filter(k => A.FLAV[k].fam === fam)];
  for (const flavor of flavors) for (const vocal of [true, false]) for (const [elName, base] of Object.entries(elSets)) for (const loop of loops) {
    const el = Object.assign({}, base); if (elName !== 'kickSeul') el.v = vocal;
    for (let n = 0; n < 40; n++) {
      const song = { style: fam, flavor, bpm: flavor ? A.FLAV[flavor].bpm : A.FAM[fam].bpm, el, loop, seed: 's' + n + fam + (flavor || '') + elName + loop.type + loop.len, versions: {} };
      const tpl = A.tplOf(song);
      (covered[fam] = covered[fam] || new Set()).add(tpl.n);
      for (const fmt of ['radio', 'standard', 'extended']) {
        runs++;
        const c = { fam, flavor, vocal, elName, loop, fmt, tpl: tpl.n, seed: song.seed };
        try {
          song.fmt = fmt;
          const ver = A.buildVersion(song, fmt), T = A.timeline(song, ver);
          if (!ver.sections.length) fail('aucune section', c);
          // jamais raccourcir couplets / refrains / drops
          const ref = A.parseSeq(tpl.s, fmt);
          ver.sections.forEach((s, i) => { if (['verse', 'chorus', 'drop'].includes(s.type) && !s.loop && s.bars < ref[i].bars) fail('section protégée raccourcie ' + s.type, c); });
          let sum = 0;
          T.secs.forEach(s => {
            if (!(s.bars > 0)) fail('section de taille nulle ' + s.type, c);
            if (!s.phrases.length) fail('section vide ' + s.type, c);
            const ps = s.phrases.reduce((a, p) => a + p.bars, 0);
            if (ps !== s.bars) fail(`phrases ${ps} ≠ section ${s.bars} (${s.type})`, c);
            if (s.phrases.some(p => !(p.bars > 0))) fail('phrase de taille nulle', c);
            if (s.loop && s.bars % loop.len) fail('section loop non multiple', c);
            if (!s.name) fail('nom manquant', c);
            s.phrases.forEach(p => { for (const e in p.lv) if (!el[e] || !A.EL[e] || p.lv[e] < 0 || p.lv[e] > 3) fail('niveau invalide ' + e, c); });
            sum += s.bars;
          });
          if (sum !== T.total) fail('somme sections ≠ total', c);
          if (T.energy.length !== T.total || T.barInfo.length !== T.total) fail('longueur énergie', c);
          if (T.energy.some(v => !Number.isFinite(v) || v < 0 || v > 1)) fail('énergie invalide', c);
          if (loop.type !== 'none' && A.loopTypeOf(fam, loop.type, ver.sections) && !T.secs.some(s => s.loop)) fail('loop non placé', c);
        } catch (e) { fail('exception ' + e.message, c); }
      }
    }
  }
}
for (const fam of Object.keys(A.TPL)) {
  const missing = A.TPL[fam].filter(t => !covered[fam].has(t.n)).map(t => t.n);
  if (missing.length) fail('structures jamais tirées', { fam, missing });
}
// migrate() : anciennes sauvegardes
const old = A.migrate({ style: 'french', versions: { radio: {} } });
if (old.style !== 'house' || old.flavor !== 'french' || Object.keys(old.versions).length) fail('migrate french', old);
if (A.migrate({ style: 'vocalhouse' }).style !== 'house') fail('migrate vocalhouse', {});

console.log(`${runs} générations testées, ${errors.length ? errors.length + ' erreur(s)' : 'aucune erreur'}`);
errors.forEach(e => console.log(' ✗ ' + e));
process.exit(errors.length ? 1 : 0);

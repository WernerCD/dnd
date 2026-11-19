// node test/importer/run.js  -> parses every JSON sample with site/importer.js. The Fight Club 5 XML sample needs DOMParser:
// open site/characters.html from a local server and run DndImport.read(await (await fetch("/test/importer/fc5-cleric-fighter.xml")).text()).
// All samples are invented characters written for these tests.
const fs = require('fs'), path = require('path');
const I = require('../../site/importer.js');
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.json'))) {
  const r = I.read(fs.readFileSync(path.join(__dirname, f), 'utf8'), 'auto');
  console.log('\n== ' + f + ' (' + r.kind + ', sid ' + r.sid + ', ' + JSON.stringify(r.imp).length + ' chars)');
  const { spells, items, ...rest } = r.imp;
  console.log(JSON.stringify(rest));
  console.log('spells', spells.map(s => s.n + ':' + s.lvl + ':' + (s.cls || '-') + (s.p ? '' : ':unprep')).join(', '));
  console.log('items', items.map(i => i.n + ' x' + i.qty + (i.eq ? ' eq' : '') + (i.att ? ' att' : '')).join(', '));
  r.warn.forEach(w => console.log('  warn: ' + w));
}

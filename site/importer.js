/* D&D Toolbox character importer (hub, site/importer.js). Reads a character the user exported from another
 * site or app and turns it into the names-and-numbers summary kept in the shared record as `ch.imp`
 * (STYLE.md 6g). It never keeps descriptions, rules text or anything else beyond names and numbers.
 * Runs entirely in the browser; the only network request on the Characters page is the D&D Beyond fetch.
 *
 *   DndImport.read(textOrObject, kind) -> { imp, warn: [strings], sid, kind }
 *   DndImport.parse(textOrObject, kind) -> imp            (same, summary only)
 *   DndImport.detect(textOrObject) -> 'ddb' | 'foundry' | 'fc5' | 'dicecloud' | null
 *   DndImport.ddbId(link) -> '12345678' | null      DndImport.ddbUrl(id)      DndImport.isShortLink(text)
 * kind: 'ddb' (character-service JSON), 'foundry' (dnd5e actor JSON), 'fc5' (Fight Club 5 / Game Master 5 XML),
 *       'dicecloud' (DiceCloud v2 creature JSON), or 'auto'.
 * imp = { v:1, src, at, ed, name, classes:[{cls,lvl,subName}], ab:[6], hp, ac, speed, init, saves:[], skills:{prof:[],exp:[]},
 *         passive:{prc,inv,ins}, resist:[], immune:[], species, background, feats:[names], spells:[{n,lvl,cls,p}], items:[{n,qty,eq,att}] }
 * Skill names are lowercase SRD names ('sleight of hand'); saves are 'str'...'cha'; damage types and conditions lowercase.
 */
(function (root) {
  'use strict';
  var AB = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  var AB_LONG = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  // [name, ability, Foundry key]
  var SKILLS = [['acrobatics', 'dex', 'acr'], ['animal handling', 'wis', 'ani'], ['arcana', 'int', 'arc'], ['athletics', 'str', 'ath'],
    ['deception', 'cha', 'dec'], ['history', 'int', 'his'], ['insight', 'wis', 'ins'], ['intimidation', 'cha', 'itm'],
    ['investigation', 'int', 'inv'], ['medicine', 'wis', 'med'], ['nature', 'int', 'nat'], ['perception', 'wis', 'prc'],
    ['performance', 'cha', 'prf'], ['persuasion', 'cha', 'per'], ['religion', 'int', 'rel'], ['sleight of hand', 'dex', 'slt'],
    ['stealth', 'dex', 'ste'], ['survival', 'wis', 'sur']];
  var CLASSES = ['artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
  var SRC = { ddb: 'D&D Beyond', foundry: 'Foundry VTT', fc5: 'Fight Club 5', dicecloud: 'DiceCloud' };

  var mod = function (s) { return Math.floor(((+s || 10) - 10) / 2); };
  var pbFor = function (lvl) { return Math.floor((Math.max(1, lvl) - 1) / 4) + 2; };
  var num = function (v) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : null; };
  var int = function (v) { var n = num(v); return n == null ? null : Math.round(n); };
  var str = function (s, max) { s = s == null ? '' : String(s).replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max || 80) : null; };
  var low = function (s) { return String(s || '').toLowerCase().trim(); };
  var slug = function (s) { return low(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var uniq = function (a) { var seen = {}; return a.filter(function (x) { var k = low(x); if (!x || seen[k]) return false; seen[k] = 1; return true; }); };
  var arr = function (v) { return Array.isArray(v) ? v : v && typeof v === 'object' ? Object.keys(v).map(function (k) { return v[k]; }) : []; };

  // ---------------------------------------------------------------- shared finishing
  // Fills what a source left out (passives from skills, initiative from Dex), cleans every value, keeps it small.
  function finish(o, src, warn) {
    var lvl = o.classes.reduce(function (t, c) { return t + c.lvl; }, 0) || 1, pb = pbFor(lvl);
    var ab = (o.ab || []).length === 6 ? o.ab.map(function (n) { return Math.max(1, Math.min(30, int(n) || 10)); }) : [10, 10, 10, 10, 10, 10];
    var prof = uniq((o.skills && o.skills.prof) || []).map(low), exp = uniq((o.skills && o.skills.exp) || []).map(low);
    prof = prof.filter(function (s) { return exp.indexOf(s) < 0; });
    function skill(name) {
      var row = SKILLS.filter(function (r) { return r[0] === name; })[0], m = mod(ab[AB.indexOf(row[1])]);
      return m + (exp.indexOf(name) >= 0 ? 2 * pb : prof.indexOf(name) >= 0 ? pb : o.jack ? Math.floor(pb / 2) : 0);
    }
    var pas = o.passive || {};
    var out = {
      v: 1, src: src, at: new Date().toISOString(), ed: o.ed === '2014' ? '2014' : '2024',
      name: str(o.name, 60) || 'Imported character',
      classes: o.classes.map(function (c) { return { cls: low(c.cls).slice(0, 30), lvl: Math.max(1, Math.min(20, int(c.lvl) || 1)), subName: str(c.subName, 80) }; }),
      ab: ab,
      hp: int(o.hp) != null && o.hp > 0 ? Math.min(999, int(o.hp)) : null,
      ac: int(o.ac) != null && o.ac > 0 ? Math.min(40, int(o.ac)) : null,
      speed: str(o.speed, 60),
      init: int(o.init) != null ? int(o.init) : mod(ab[1]),
      saves: uniq((o.saves || []).filter(function (s) { return AB.indexOf(s) >= 0; })),
      skills: { prof: prof, exp: exp },
      passive: { prc: int(pas.prc) || 10 + skill('perception') + (o.pasBonus || 0), inv: int(pas.inv) || 10 + skill('investigation'), ins: int(pas.ins) || 10 + skill('insight') },
      resist: uniq((o.resist || []).map(low)).slice(0, 30),
      immune: uniq((o.immune || []).map(low)).slice(0, 30),
      species: str(o.species), background: str(o.background),
      feats: uniq((o.feats || []).map(function (f) { return str(f); })).slice(0, 60),
      spells: [], items: []
    };
    var seen = {};
    (o.spells || []).forEach(function (s) {
      var n = str(s.n); if (!n) return;
      var k = low(n) + '|' + (s.cls || ''); if (seen[k]) { if (s.p) seen[k].p = 1; return; }
      var row = { n: n, lvl: Math.max(0, Math.min(9, int(s.lvl) || 0)), cls: s.cls ? low(s.cls).slice(0, 30) : null, p: s.p ? 1 : 0 };
      seen[k] = row; out.spells.push(row);
    });
    out.spells.sort(function (a, b) { return a.lvl - b.lvl || a.n.localeCompare(b.n); });
    var iseen = {};
    (o.items || []).forEach(function (it) {
      var n = str(it.n); if (!n) return;
      var row = { n: n, qty: Math.max(1, Math.min(9999, int(it.qty) || 1)), eq: !!it.eq, att: !!it.att };
      var k = low(n) + '|' + row.eq + '|' + row.att;
      if (iseen[k]) { iseen[k].qty = Math.min(9999, iseen[k].qty + row.qty); return; }
      iseen[k] = row; out.items.push(row);
    });
    // character.js keeps imp only up to 40000 characters: drop unequipped items first, then cantrip-free spell tail
    var cut = false;
    while (JSON.stringify(out).length > 38000 && out.items.length) { var i = -1; out.items.forEach(function (it, j) { if (!it.eq && !it.att) i = j; }); out.items.splice(i < 0 ? out.items.length - 1 : i, 1); cut = true; }
    while (JSON.stringify(out).length > 38000 && out.spells.length) { out.spells.pop(); cut = true; }
    if (cut) warn.push('The character is very large, so some items or spells were left out of the summary.');
    return out;
  }
  function classWarnings(classes, warn, orderNote) {
    classes.forEach(function (c) {
      if (CLASSES.indexOf(low(c.cls)) < 0) warn.push('"' + c.cls + '" isn\'t one of the classes the tools know (it may be homebrew). It is kept on the character as a locked class: it counts toward level and proficiency, but the tools won\'t show its features or spells.');
    });
    if (classes.length > 1 && orderNote) warn.push(orderNote);
    var total = classes.reduce(function (t, c) { return t + c.lvl; }, 0);
    if (total > 20) warn.push('The levels add up to ' + total + '; the tools stop at 20.');
  }

  // ---------------------------------------------------------------- D&D Beyond (character-service v5 JSON)
  var DDB_2024 = [145];              // Player's Handbook (2024)
  var DDB_2014 = [1, 2];             // Basic Rules (2014), Player's Handbook (2014)
  function ddb(json, warn) {
    var c = json && json.data && typeof json.data === 'object' && (json.data.classes || json.data.stats) ? json.data : json;
    if (json && json.success === false) throw new Error('D&D Beyond said: ' + (json.message || 'the character could not be loaded') + '. If the character is private, set it to public on D&D Beyond (Home > Character settings > Privacy), or paste its data below.');
    if (!c || !Array.isArray(c.classes) || !Array.isArray(c.stats)) throw new Error('That does not look like D&D Beyond character data. Open the character data link, copy the whole page and paste it again.');
    var inv = arr(c.inventory);
    var activeDefs = {};   // item definition ids whose modifiers apply: equipped, and attuned when the item needs it
    inv.forEach(function (it) { var d = it.definition || {}; if (it.equipped && (!d.canAttune || it.isAttuned)) activeDefs[d.id] = 1; });
    var M = c.modifiers || {}, mods = [];
    ['race', 'class', 'background', 'feat', 'condition'].forEach(function (k) { arr(M[k]).forEach(function (m) { if (m) mods.push(m); }); });
    var itemMods = arr(M.item).filter(function (m) { return m && activeDefs[m.componentId]; });
    var all = mods.concat(itemMods);
    var has = function (list, type, sub) { return list.filter(function (m) { return m.type === type && (sub == null || m.subType === sub); }); };
    var sum = function (list) { return list.reduce(function (t, m) { return t + (typeof m.value === 'number' ? m.value : 0); }, 0); };

    // classes, starting class first
    var classes = c.classes.slice().sort(function (a, b) { return (b.isStartingClass ? 1 : 0) - (a.isStartingClass ? 1 : 0); }).map(function (k) {
      return { cls: str((k.definition || {}).name, 30) || 'unknown', lvl: int(k.level) || 1, subName: k.subclassDefinition && str(k.subclassDefinition.name), _id: k.id, _def: k.definition || {} };
    });
    classWarnings(classes, warn, 'D&D Beyond doesn\'t record the order levels were taken, so the starting class is listed first and the rest follow the sheet\'s order.');
    var lvl = classes.reduce(function (t, k) { return t + k.lvl; }, 0) || 1, pb = pbFor(lvl);

    // edition: vote by the source books of the classes, species and background
    var votes = { '2014': 0, '2024': 0 };
    var vote = function (sources, w) { arr(sources).forEach(function (s) { if (DDB_2024.indexOf(s.sourceId) >= 0) votes['2024'] += w; if (DDB_2014.indexOf(s.sourceId) >= 0) votes['2014'] += w; }); };
    classes.forEach(function (k) { vote(k._def.sources, 2); });
    if (c.race) vote(c.race.sources, 1);
    if (c.background && c.background.definition) vote(c.background.definition.sources, 1);
    var ed = votes['2024'] > votes['2014'] ? '2024' : votes['2014'] > votes['2024'] ? '2014' : null;
    if (!ed) { ed = '2024'; warn.push('Could not tell whether the character uses the 2014 or 2024 rules; set to 2024. Change Rules in the editor if that is wrong.'); }

    // ability scores: base + bonus + species/class/background/feat bonuses; overrides win. Items are left out (like the planner).
    var ab = AB_LONG.map(function (name, i) {
      var pick = function (list) { var x = arr(list).filter(function (s) { return s && s.id === i + 1; })[0]; return x && x.value != null ? x.value : null; };
      var over = pick(c.overrideStats); if (over != null) return over;
      return (pick(c.stats) || 10) + (pick(c.bonusStats) || 0) + sum(has(mods, 'bonus', name + '-score'));
    });
    var abItems = itemMods.filter(function (m) { return /-score$/.test(m.subType || '') && (m.type === 'bonus' || m.type === 'set'); });
    if (abItems.length) warn.push('An equipped magic item changes an ability score; the scores here leave items out.');

    // hit points
    var conMod = mod(ab[2]), hp;
    if (num(c.overrideHitPoints)) hp = num(c.overrideHitPoints);
    else hp = (num(c.baseHitPoints) || 0) + (num(c.bonusHitPoints) || 0) + conMod * lvl + sum(has(all, 'bonus', 'hit-points-per-level')) * lvl + sum(has(all, 'bonus', 'hit-points'));

    // armor class: equipped armor and shield, unarmored defence features, flat bonuses
    var dex = mod(ab[1]), armor = null, shield = 0;
    inv.forEach(function (it) {
      var d = it.definition || {}; if (!it.equipped || !num(d.armorClass)) return;
      if (d.armorTypeId === 4) shield = Math.max(shield, num(d.armorClass));
      else if (d.armorTypeId >= 1 && d.armorTypeId <= 3) {
        var cap = d.armorTypeId === 1 ? 99 : d.armorTypeId === 2 ? (has(all, 'set', 'ac-max-dex-armored-modifier').length ? 3 : 2) : 0;
        var v = num(d.armorClass) + Math.min(dex, cap);
        if (armor == null || v > armor) armor = v;
      }
    });
    var ac;
    if (armor != null) ac = armor + sum(has(all, 'bonus', 'armored-armor-class'));
    else {
      ac = 10 + dex;
      has(all, 'set', 'unarmored-armor-class').forEach(function (m) {
        var v = 10 + dex + (typeof m.value === 'number' ? m.value : 0) + (m.statId ? mod(ab[m.statId - 1]) : 0);
        if (v > ac) ac = v;
      });
      ac += sum(has(all, 'bonus', 'unarmored-armor-class'));
    }
    ac += shield + sum(has(all, 'bonus', 'armor-class'));
    var acOver = arr(c.characterValues).filter(function (v) { return v && v.typeId === 1 && num(v.value); })[0];
    if (acOver) ac = num(acOver.value);
    else warn.push('AC is worked out from equipped armor, shield and features. Check it against D&D Beyond; some magic items and homebrew aren\'t counted.');

    // speed
    var ws = (c.race && c.race.weightSpeeds && c.race.weightSpeeds.normal) || {};
    var walk = (num(ws.walk) || 30) + sum(has(all, 'bonus', 'speed')) + sum(has(all, 'bonus', 'speed-walking')) + (armor == null ? sum(has(all, 'bonus', 'unarmored-movement')) : 0);
    var sp = [walk + ' ft.'];
    [['fly', 'flying'], ['swim', 'swimming'], ['climb', 'climbing'], ['burrow', 'burrowing']].forEach(function (p) {
      var base = num(ws[p[0]]), set = has(all, 'set', 'innate-speed-' + p[1])[0];
      var v = set ? (typeof set.value === 'number' && set.value ? set.value : walk) : base;
      if (v) sp.push(p[0] + ' ' + v + ' ft.');
    });

    // proficiencies
    var saves = AB_LONG.map(function (n, i) { return has(all, 'proficiency', n + '-saving-throws').length ? AB[i] : null; }).filter(Boolean);
    var sk = { prof: [], exp: [] };
    SKILLS.forEach(function (r) {
      var s = slug(r[0]);
      if (has(all, 'expertise', s).length) sk.exp.push(r[0]);
      else if (has(all, 'proficiency', s).length) sk.prof.push(r[0]);
    });
    var jack = has(all, 'half-proficiency', 'ability-checks').length > 0;
    var initMods = has(all, 'bonus', 'initiative');
    var init = dex + sum(initMods) + (jack || has(all, 'half-proficiency', 'initiative').length ? Math.floor(pb / 2) : 0);
    if (initMods.some(function (m) { return typeof m.value !== 'number'; })) { init += pb; warn.push('Initiative includes a bonus equal to your proficiency bonus (for example the Alert feat); check it.'); }

    // defences
    var resist = has(all, 'resistance').map(function (m) { return (m.subType || '').replace(/-/g, ' '); });
    var immune = has(all, 'immunity').map(function (m) { return (m.subType || '').replace(/-/g, ' '); });

    // spells, per class, then those granted by species, feats and items
    var byClassId = {}; classes.forEach(function (k) { byClassId[k._id] = low(k.cls); });
    var spells = [];
    arr(c.classSpells).forEach(function (cs) {
      var cls = byClassId[cs.characterClassId] || null, list = arr(cs.spells);
      var anyPrep = list.some(function (s) { return s.prepared && !s.alwaysPrepared && (s.definition || {}).level > 0; });
      list.forEach(function (s) {
        var d = s.definition || {};
        spells.push({ n: d.name, lvl: d.level, cls: cls, p: !anyPrep || s.prepared || s.alwaysPrepared || !d.level });
      });
    });
    var granted = c.spells || {};
    ['race', 'class', 'feat', 'item', 'background'].forEach(function (k) {
      arr(granted[k]).forEach(function (s) { var d = s.definition || {}; spells.push({ n: d.name, lvl: d.level, cls: null, p: true }); });
    });

    var items = inv.map(function (it) { var d = it.definition || {}; return { n: d.name, qty: it.quantity, eq: it.equipped, att: it.isAttuned }; });
    var bg = c.background || {};
    var out = finish({
      ed: ed, name: c.name, classes: classes, ab: ab, hp: hp, ac: ac, speed: sp.join(', '), init: init, saves: saves, skills: sk, jack: jack,
      pasBonus: sum(has(all, 'bonus', 'passive-perception')),
      resist: resist, immune: immune,
      species: c.race && (c.race.fullName || c.race.baseRaceName),
      background: (bg.definition && bg.definition.name) || (bg.hasCustomBackground && bg.customBackground && bg.customBackground.name) || null,
      feats: arr(c.feats).map(function (f) { return f && f.definition && f.definition.name; }),
      spells: spells, items: items
    }, 'ddb', warn);
    warn.push('Ability scores include species, background, class and feat bonuses but not magic items.');
    return { imp: out, sid: c.id != null ? String(c.id) : null };
  }

  // ---------------------------------------------------------------- Foundry VTT dnd5e actor export (JSON)
  function foundry(a, warn) {
    if (!a || !a.system || !Array.isArray(a.items)) throw new Error('That does not look like a Foundry VTT actor export. In Foundry, right-click the actor in the Actors tab and choose Export Data.');
    if (a.type && a.type !== 'character') warn.push('This Foundry actor is a "' + a.type + '", not a player character; imported anyway.');
    var S = a.system, at = S.attributes || {}, items = a.items;
    var ofType = function (t) { return items.filter(function (i) { return i && i.type === t; }); };
    var sys = function (i) { return i.system || i.data || {}; };

    var subs = ofType('subclass');
    var classes = ofType('class').map(function (k) {
      var s = sys(k), id = s.identifier || slug(k.name);
      var sub = subs.filter(function (x) { return (sys(x).classIdentifier || '') === id; })[0];
      return { cls: k.name, lvl: int(s.levels) || 1, subName: sub ? sub.name : (s.subclass || null), _s: s, _start: k._id && k._id === ((S.details || {}).originalClass) };
    });
    if (!classes.length) throw new Error('No class items found in that Foundry actor.');
    var orig = classes.some(function (k) { return k._start; });
    classes.sort(function (x, y) { return (y._start ? 1 : 0) - (x._start ? 1 : 0); });
    classWarnings(classes, warn, 'Foundry doesn\'t record the order levels were taken, so the starting class is listed first' + (orig ? '' : ' (a guess)') + '.');
    var lvl = classes.reduce(function (t, k) { return t + k.lvl; }, 0) || 1;

    var votes = { '2014': 0, '2024': 0 };
    classes.concat(ofType('race'), ofType('background')).forEach(function (i) {
      var src = (i._s || sys(i)).source || {}, rules = String(src.rules || ''), book = String(src.book || '');
      if (rules === '2024' || /XPHB|2024/i.test(book)) votes['2024']++;
      else if (rules === '2014' || /^PHB$|2014|SRD 5\.1/i.test(book)) votes['2014']++;
    });
    var ed = votes['2024'] > votes['2014'] ? '2024' : votes['2014'] > votes['2024'] ? '2014' : null;
    if (!ed) { ed = '2014'; warn.push('Could not tell whether the character uses the 2014 or 2024 rules; set to 2014. Change Rules in the editor if that is wrong.'); }

    var abil = S.abilities || {};
    var ab = AB.map(function (k) { return num((abil[k] || {}).value) || 10; });
    if (items.some(function (i) { return arr(i.effects).length && i.type !== 'spell'; }) || arr(a.effects).length) warn.push('Foundry active effects (magic items, conditions) aren\'t applied; scores and numbers are the sheet\'s base values.');

    // hit points: the stored max when the sheet has one, otherwise from the class hit point advancements
    var hpS = at.hp || {}, hp = num(hpS.max);
    if (!hp) {
      var conMod = mod(ab[2]); hp = 0;
      classes.forEach(function (k) {
        var s = k._s, faces = parseInt(String((s.hd && s.hd.denomination) || s.hitDice || 'd8').replace(/\D/g, ''), 10) || 8;
        var adv = arr(s.advancement).filter(function (x) { return x && x.type === 'HitPoints'; })[0], vals = (adv && adv.value) || {}, got = 0;
        Object.keys(vals).forEach(function (L) { var v = vals[L]; got++; hp += v === 'max' ? faces : v === 'avg' ? Math.floor(faces / 2) + 1 : (num(v) || 0); });
        hp += Math.max(0, k.lvl - got) * (Math.floor(faces / 2) + 1);   // levels without a recorded roll: average
      });
      hp += conMod * lvl;
      var b = hpS.bonuses || {};
      hp += (int(b.level) || 0) * lvl + (int(b.overall) || 0);
      warn.push('Max HP was worked out from the class hit dice and Constitution, because the export doesn\'t store it.');
    }

    // armor class
    var acS = at.ac || {}, dex = mod(ab[1]), ac = null, calc = acS.calc || 'default';
    var flat = num(acS.flat);
    if ((calc === 'flat' || calc === 'natural') && flat) ac = flat;
    else {
      var armor = null, shield = 0;
      items.forEach(function (i) {
        if (i.type !== 'equipment') return;
        var s = sys(i), t = (s.type && s.type.value) || s.armor && s.armor.type || '';
        if (!s.equipped || !s.armor || !num(s.armor.value)) return;
        if (t === 'shield') { shield = Math.max(shield, num(s.armor.value) + (num(s.armor.magicalBonus) || 0)); return; }
        if (['light', 'medium', 'heavy'].indexOf(t) < 0) return;
        var cap = s.armor.dex != null && s.armor.dex !== '' ? num(s.armor.dex) : t === 'light' ? 99 : t === 'medium' ? 2 : 0;
        var v = num(s.armor.value) + (num(s.armor.magicalBonus) || 0) + Math.min(dex, cap == null ? 99 : cap);
        if (armor == null || v > armor) armor = v;
      });
      var un = { unarmoredMonk: 10 + dex + mod(ab[4]), unarmoredBarb: 10 + dex + mod(ab[2]), draconic: 13 + dex, mage: 13 + dex, unarmoredBard: 10 + dex + mod(ab[5]) }[calc];
      ac = (armor != null ? armor : un || 10 + dex) + shield;
      if (calc === 'custom') warn.push('The sheet uses a custom AC formula, which isn\'t read; AC is from equipped armor and shield instead.');
    }
    var acB = int(acS.bonus); if (acB) ac += acB;
    if (calc !== 'flat' && calc !== 'natural') warn.push('AC is worked out from equipped armor, shield and the sheet\'s AC setting; bonuses from magic items (active effects) aren\'t counted. Check it.');

    // speed
    var mv = {}, mvS = at.movement || {}, raceMv = (sys(ofType('race')[0] || {}).movement) || {};
    for (var k5 in mvS) mv[k5] = mvS[k5];
    if (mvS.speeds && typeof mvS.speeds === 'object') for (var k6 in mvS.speeds) mv[k6] = mvS.speeds[k6];   // dnd5e 6.x
    ['walk', 'fly', 'swim', 'climb', 'burrow'].forEach(function (k) { if (!num(mv[k]) && num(raceMv[k])) mv[k] = raceMv[k]; });   // empty = the species' speed
    var units = mv.units || raceMv.units || 'ft';
    var sp = [];
    if (num(mv.walk)) sp.push(num(mv.walk) + ' ' + units + '.');
    ['fly', 'swim', 'climb', 'burrow'].forEach(function (k) { if (num(mv[k])) sp.push(k + ' ' + num(mv[k]) + ' ' + units + '.'); });
    if (mv.hover) sp.push('hover');

    var saves = AB.filter(function (k) { return num((abil[k] || {}).proficient) >= 1; });
    var sk = { prof: [], exp: [] }, skS = S.skills || {}, jack = !!(a.flags && a.flags.dnd5e && a.flags.dnd5e.jackOfAllTrades);
    SKILLS.forEach(function (r) { var v = num((skS[r[2]] || {}).value) || 0; if (v >= 2) sk.exp.push(r[0]); else if (v >= 1) sk.prof.push(r[0]); });
    var init = mod(ab[1]) + (int((at.init || {}).bonus) || 0) + (jack ? Math.floor(pbFor(lvl) / 2) : 0);
    if (a.flags && a.flags.dnd5e && a.flags.dnd5e.initiativeAlert) init += ed === '2024' ? pbFor(lvl) : 5;

    var tr = S.traits || {};
    var vals = function (t) { if (!t) return []; var v = arr(t.value); if (t.custom) v = v.concat(String(t.custom).split(/[;,]/)); return v.map(function (x) { return String(x).trim(); }).filter(Boolean); };

    // spells: prepared unless the sheet marks a "prepared"-mode spell as unprepared
    var classByIdent = {}; classes.forEach(function (k) { classByIdent[k._s.identifier || slug(k.cls)] = low(k.cls); });
    var spells = ofType('spell').map(function (i) {
      var s = sys(i), prep = s.preparation || {}, mode = s.method || prep.mode || 'prepared';
      var p = s.prepared != null && typeof s.prepared !== 'object' ? +s.prepared >= 1 : prep.prepared;
      var lvlS = int(s.level) || 0;
      var isPrep = mode !== 'prepared' && mode !== 'spell' ? true : lvlS === 0 || !!p;
      return { n: i.name, lvl: lvlS, cls: classByIdent[s.sourceClass || String(s.sourceItem || '').replace(/^class:/, '')] || (classes.length === 1 && (mode === 'prepared' || mode === 'spell' || mode === 'pact') ? low(classes[0].cls) : null), p: isPrep };
    });
    var GEAR = ['weapon', 'equipment', 'consumable', 'tool', 'loot', 'container', 'backpack'];
    var gear = items.filter(function (i) { return GEAR.indexOf(i.type) >= 0; }).map(function (i) {
      var s = sys(i);
      var att = s.attuned === true || s.attunement === 2;
      return { n: i.name, qty: s.quantity, eq: s.equipped, att: att };
    });
    var feats = ofType('feat').filter(function (i) { var t = (sys(i).type || {}).value; return t === 'feat' || (!t && !(sys(i).requirements)); }).map(function (i) { return i.name; });
    var det = S.details || {};
    var race = ofType('race')[0], bgI = ofType('background')[0];
    var out = finish({
      ed: ed, name: a.name, classes: classes, ab: ab, hp: hp, ac: ac, speed: sp.join(', ') || null, init: init, saves: saves, skills: sk, jack: jack,
      resist: vals(tr.dr), immune: vals(tr.di).concat(vals(tr.ci)),
      species: race ? race.name : typeof det.race === 'string' && !/^[A-Za-z0-9]{16}$/.test(det.race) ? det.race : null,
      background: bgI ? bgI.name : typeof det.background === 'string' && !/^[A-Za-z0-9]{16}$/.test(det.background) ? det.background : null,
      feats: feats, spells: spells, items: gear
    }, 'foundry', warn);
    return { imp: out, sid: a._id ? String(a._id) : null };
  }

  // ---------------------------------------------------------------- Fight Club 5 / Game Master 5 (XML)
  function fc5(text, warn) {
    if (typeof DOMParser === 'undefined') throw new Error('XML import needs a browser.');
    var doc = new DOMParser().parseFromString(String(text), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('That file is not valid XML.');
    var ch = doc.getElementsByTagName('character')[0];
    if (!ch) throw new Error('No <character> found. In Fight Club 5, export the character (Share > Export) and choose the XML file.');
    return fc5Read(ch, warn);
  }
  var kids = function (el, tag) { return Array.prototype.filter.call(el ? el.children : [], function (k) { return k.tagName === tag; }); };
  var kid = function (el, tag) { return kids(el, tag)[0] || null; };
  var txt = function (el, tag) { var k = tag ? kid(el, tag) : el; return k ? k.textContent.trim() : ''; };
  // Fight Club stores BASE scores in <abilities> plus <mod> elements (category 1 = ability score, 4 = skill);
  // proficiencies are codes: 0-5 saving throws, 100-117 skills (alphabetical). Missing <level>/<type>/<category> = default.
  function fcMod(m, item) { return { cat: int(txt(m, 'category')) || 0, type: int(txt(m, 'type')) || 0, value: txt(m, 'value') === '' ? null : int(txt(m, 'value')), name: txt(m, 'name'), item: item }; }
  function fc5Read(ch, warn) {
    var classesEl = kids(ch, 'class'), raceEl = kid(ch, 'race'), bgEl = kid(ch, 'background'), featEls = kids(ch, 'feat');
    if (!classesEl.length) throw new Error('No classes found in that Fight Club 5 file.');
    var base = txt(ch, 'abilities').split(',').map(function (n) { return parseInt(n, 10); }).filter(function (n) { return !isNaN(n); });
    if (base.length < 6) throw new Error('That Fight Club 5 file has no ability scores.');
    var ab = base.slice(0, 6);
    var owners = [ch].concat(raceEl ? [raceEl] : [], bgEl ? [bgEl] : [], classesEl, featEls, kids(raceEl, 'feat'), kids(bgEl, 'feat'));
    classesEl.forEach(function (c) { owners = owners.concat(kids(c, 'feat')); });
    var mods = [], profs = [];
    owners.forEach(function (o) {
      kids(o, 'mod').forEach(function (m) { mods.push(fcMod(m, 0)); });
      kids(o, 'proficiency').forEach(function (p) { profs.push(txt(p)); });
    });
    var items = kids(ch, 'item');
    items.forEach(function (it) { if (int(txt(it, 'slot'))) kids(it, 'mod').forEach(function (m) { mods.push(fcMod(m, 1)); }); });
    mods.forEach(function (m) { if (m.cat === 1 && !m.item && m.type >= 0 && m.type < 6 && m.value) ab[m.type] += m.value; });
    if (mods.some(function (m) { return m.cat === 1 && m.item; })) warn.push('An equipped magic item changes an ability score; the scores here leave items out.');
    var saves = [], sk = { prof: [], exp: [] };
    profs.forEach(function (p) {
      var n = parseInt(p, 10);
      if (!isNaN(n) && n >= 0 && n < 6) saves.push(AB[n]);
      else if (!isNaN(n) && n >= 100 && n < 118) sk.prof.push(SKILLS[n - 100][0]);
      else { var hit = SKILLS.filter(function (r) { return r[0] === low(p); })[0]; if (hit) sk.prof.push(hit[0]); }
    });
    mods.forEach(function (m) {   // category 4 with no value: proficiency, or expertise when already proficient
      if (m.cat !== 4 || m.value || m.item || m.type < 0 || m.type > 17) return;
      var name = SKILLS[m.type][0];
      if (sk.prof.indexOf(name) >= 0 || /expert/i.test(m.name || '')) sk.exp.push(name); else sk.prof.push(name);
    });
    // subclass = the chosen "Heading: Subclass" class feature (other choices such as Fighting Style are skipped)
    var classes = classesEl.map(function (c) {
      var feats = kids(c, 'feat').map(function (f) { return { n: txt(f, 'name'), opt: txt(f, 'optional') === '1' }; });
      var sub = null;
      feats.forEach(function (f) {
        var m = /^([^:]+):\s*(.+)$/.exec(f.n); if (sub || !m || !f.opt) return;
        if (/fighting style|metamagic|invocation|pact boon|maneuver|favored enemy|natural explorer|expertise|ability score|land type|totem|draconic ancestry/i.test(m[1])) return;
        var y = m[2].replace(/\s*\((HB|UA)\)\s*$/i, '').trim();
        var used = feats.some(function (g) { return g !== f && (g.n.indexOf(y + ':') === 0 || g.n.indexOf('(' + y + ')') >= 0); });
        if (used || /archetype|oath|domain|circle|college|tradition|patron|origin|path|way|conclave|subclass|school|order|specialist|calling/i.test(m[1])) sub = m[2].trim();
      });
      return { cls: txt(c, 'name') || 'unknown', lvl: int(txt(c, 'level')) || 1, subName: sub, _el: c };
    });
    classWarnings(classes, warn, 'Fight Club 5 lists classes in the order they were added; that order is kept, with the first class as the starting class.');
    var dex = mod(ab[1]);
    // AC from equipped armor (item type 1 light, 2 medium, 3 heavy) and shield (type 4); slot = equipped
    var armor = null, shield = 0;
    items.forEach(function (it) {
      var slot = int(txt(it, 'slot')), t = int(txt(it, 'type')), acv = int(txt(it, 'ac'));
      if (!slot || !acv) return;
      if (t === 4) shield = Math.max(shield, acv);
      else if (t >= 1 && t <= 3) { var v = acv + (t === 1 ? dex : t === 2 ? Math.min(dex, 2) : 0); if (armor == null || v > armor) armor = v; }
    });
    var ac = (armor != null ? armor : 10 + dex) + shield;
    var initB = mods.filter(function (m) { return m.cat === 0 && m.type === 12 && m.value; }).reduce(function (t, m) { return t + m.value; }, 0);
    warn.push('Fight Club 5 doesn\'t store AC, so it is worked out from equipped armor and shield (unarmored defence and magic bonuses aren\'t counted). Check it.');
    warn.push('Fight Club 5 files don\'t say which rules edition the character uses; set to 2014. Change Rules in the editor if it is a 2024 character.');
    var spells = [];
    classes.forEach(function (k) {
      var cl = low(k.cls), list = kids(k._el, 'spell');
      var anyPrep = list.some(function (sp) { return txt(sp, 'prepared') === '1'; });
      list.forEach(function (sp) { var L = int(txt(sp, 'level')) || 0; spells.push({ n: txt(sp, 'name'), lvl: L, cls: cl, p: !anyPrep || L === 0 || txt(sp, 'prepared') === '1' }); });
    });
    kids(raceEl, 'spell').forEach(function (sp) { spells.push({ n: txt(sp, 'name'), lvl: int(txt(sp, 'level')) || 0, cls: null, p: true }); });
    var gear = items.map(function (it) { return { n: txt(it, 'name'), qty: int(txt(it, 'quantity')) || 1, eq: !!int(txt(it, 'slot')), att: txt(it, 'attuned') === '1' }; });
    kids(ch, 'container').forEach(function (c) { kids(c, 'item').forEach(function (it) { gear.push({ n: txt(it, 'name'), qty: int(txt(it, 'quantity')) || 1, eq: false, att: false }); }); });
    var spd = raceEl && int(txt(raceEl, 'speed'));
    if (!spd) warn.push('No speed in the file; set to 30 ft.');
    warn.push('Resistances and immunities aren\'t stored in Fight Club 5 files, so none were imported.');
    var out = finish({
      ed: '2014', name: txt(ch, 'name'), classes: classes, ab: ab, hp: int(txt(ch, 'hpMax')), ac: ac, speed: (spd || 30) + ' ft.', init: dex + initB,
      saves: saves, skills: sk, resist: [], immune: [],
      species: raceEl && txt(raceEl, 'name'), background: bgEl && txt(bgEl, 'name'),
      feats: featEls.map(function (f) { return txt(f, 'name'); }), spells: spells, items: gear
    }, 'fc5', warn);
    return { imp: out, sid: txt(ch, 'uid') || txt(ch, 'uniqueID') || null };
  }

  // ---------------------------------------------------------------- DiceCloud v2 (creature JSON: API response or archive file)
  function dicecloud(j, warn) {
    var cr = j.creature || (Array.isArray(j.creatures) && j.creatures[0]) || {};
    var props = (j.creatureProperties || j.properties || []).filter(function (p) { return p && !p.removed && !p.inactive && !p.deactivatedByAncestor && !p.disabled; });
    if (!props.length) throw new Error('That DiceCloud file has no properties.');
    var byVar = function (v) { return props.filter(function (p) { return p.type === 'attribute' && p.variableName === v && !p.overridden; })[0]; };
    var total = function (v) { var p = byVar(v); return p ? num(p.total != null ? p.total : p.value) : null; };
    var ab = AB_LONG.map(function (n) { return total(n) || 10; });
    var cls = props.filter(function (p) { return p.type === 'class'; }).map(function (p) { return { cls: p.name || p.variableName, lvl: int(p.level) || 1, subName: null }; });
    if (!cls.length) {   // only classLevel props: the highest level per class
      var mx = {}; props.filter(function (p) { return p.type === 'classLevel'; }).forEach(function (p) { var k = p.variableName || p.name; mx[k] = Math.max(mx[k] || 0, int(p.level) || 1); });
      cls = Object.keys(mx).map(function (k) { return { cls: k.replace(/([a-z])([A-Z])/g, '$1 $2'), lvl: mx[k], subName: null }; });
    }
    if (!cls.length) throw new Error('No classes found in that DiceCloud character.');
    classWarnings(cls, warn, 'DiceCloud doesn\'t mark a starting class, so classes keep the sheet\'s order.');
    var sk = { prof: [], exp: [] }, saves = [];
    props.filter(function (p) { return p.type === 'skill' && !p.overridden; }).forEach(function (p) {
      var pr = num(p.proficiency) || 0, v = String(p.variableName || '');
      if (p.skillType === 'save') { var i = AB_LONG.indexOf(v.replace(/Save$/, '')); if (i >= 0 && pr >= 1) saves.push(AB[i]); return; }
      if (p.skillType && p.skillType !== 'skill') return;
      var name = v.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(), hit = SKILLS.filter(function (r) { return r[0] === name; })[0];
      if (!hit) return; if (pr >= 2) sk.exp.push(hit[0]); else if (pr >= 1) sk.prof.push(hit[0]);
    });
    var resist = [], immune = [];
    props.filter(function (p) { return p.type === 'damageMultiplier'; }).forEach(function (p) { (p.damageTypes || []).forEach(function (t) { if (p.value === 0) immune.push(t); else if (p.value === 0.5) resist.push(t); }); });
    var parentOf = function (p) { return (p.parent && p.parent.id) || p.parentId || (Array.isArray(p.ancestors) && p.ancestors.length ? p.ancestors[p.ancestors.length - 1].id : null); };
    var byId = {}; props.forEach(function (p) { byId[p._id] = p; });
    var tagged = function (t) { var p = props.filter(function (x) { return (x.tags || []).concat(x.libraryTags || []).indexOf(t) >= 0 && /folder|feature|note/.test(x.type); })[0]; return p ? p.name : null; };
    var spells = props.filter(function (p) { return p.type === 'spell'; }).map(function (p) {
      var list = null, id = parentOf(p), guard = 0;
      while (id && byId[id] && guard++ < 20) { if (byId[id].type === 'spellList') { list = byId[id]; break; } id = parentOf(byId[id]); }
      var c = list && cls.filter(function (k) { return low(list.name).indexOf(low(k.cls)) >= 0; })[0];
      return { n: p.name, lvl: p.level != null ? p.level : 1, cls: c ? low(c.cls) : null, p: !!(p.prepared || p.alwaysPrepared || p.level === 0) };
    });
    var items = props.filter(function (p) { return p.type === 'item'; }).map(function (p) { return { n: p.name, qty: p.quantity, eq: p.equipped, att: p.attuned }; });
    var feats = props.filter(function (p) { return p.type === 'feature' && (p.tags || []).concat(p.libraryTags || []).indexOf('feat') >= 0; }).map(function (p) { return p.name; });
    var spd = total('speed');
    warn.push('DiceCloud doesn\'t say which rules edition the character uses; set to 2014. Change Rules in the editor if needed.');
    warn.push('DiceCloud has no fixed place for subclasses, so none was imported; add it in the editor.');
    var out = finish({
      ed: '2014', name: cr.name, classes: cls, ab: ab, hp: total('hitPoints'), ac: total('armor') || total('armorClass'), speed: spd ? spd + ' ft.' : null,
      init: total('initiative'), saves: saves, skills: sk, resist: resist, immune: immune,
      species: tagged('race') || tagged('subrace'), background: tagged('background'), feats: feats, spells: spells, items: items
    }, 'dicecloud', warn);
    return { imp: out, sid: cr._id ? String(cr._id) : null };
  }

  // ---------------------------------------------------------------- entry points
  function toObj(x) {
    if (typeof x !== 'string') return x;
    var t = x.trim().replace(/^﻿/, '');
    if (t.charAt(0) === '<') return t;
    return JSON.parse(t);
  }
  function detect(x) {
    var o; try { o = toObj(x); } catch (e) { return null; }
    if (typeof o === 'string') return /<character[\s>]/.test(o) ? 'fc5' : null;
    if (!o || typeof o !== 'object') return null;
    var d = o.data && typeof o.data === 'object' ? o.data : o;
    if (Array.isArray(d.classes) && Array.isArray(d.stats)) return 'ddb';
    if (o.system && Array.isArray(o.items)) return 'foundry';
    if (Array.isArray(o.creatureProperties) || (o.creature && Array.isArray(o.properties)) || (Array.isArray(o.creatures) && o.creatureProperties)) return 'dicecloud';
    if (o.success === false && 'message' in o) return 'ddb';
    return null;
  }
  function read(x, kind) {
    var warn = [], o = toObj(x);
    if (!kind || kind === 'auto') kind = detect(o);
    if (!kind) throw new Error('Couldn\'t recognise that file. Supported: D&D Beyond character data, a Foundry VTT dnd5e actor export, a Fight Club 5 / Game Master 5 XML export and DiceCloud v2 JSON.');
    var r = kind === 'ddb' ? ddb(o, warn) : kind === 'foundry' ? foundry(o, warn) : kind === 'fc5' ? fc5(typeof o === 'string' ? o : x, warn) : kind === 'dicecloud' ? dicecloud(o, warn) : null;
    if (!r) throw new Error('Unknown import kind "' + kind + '".');
    return { imp: r.imp, warn: warn, sid: r.sid, kind: kind };
  }

  function isShortLink(text) { return /(^|\/\/|\s)(www\.)?ddb\.ac\//i.test(String(text || '')); }
  function ddbId(text) {
    var m = String(text || '').match(/dndbeyond\.com\/(?:profile\/[^/]+\/)?characters\/(\d+)/i) || String(text || '').match(/character\/v\d+\/character\/(\d+)/i) || String(text || '').match(/^\s*(\d{4,})\s*$/);
    return m ? m[1] : null;
  }
  function ddbUrl(id) { return 'https://character-service.dndbeyond.com/character/v5/character/' + id; }

  var API = { read: read, parse: function (x, kind) { return read(x, kind).imp; }, detect: detect, ddbId: ddbId, ddbUrl: ddbUrl, isShortLink: isShortLink,
    SRC: SRC, SKILLS: SKILLS.map(function (r) { return r[0]; }) };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DndImport = API;
})(this);

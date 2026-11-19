/* D&D Toolbox: Character Sheet (sheet.html?char=<id>).
 * Built only from the shared character (character.js) and the tools' read-only sheet summaries
 * (ch.sheet[repo], STYLE.md section 6e). This page never writes to the shared record or to another site's key.
 * Play state (HP, slots used, conditions, death saves) lives in its own key:
 *   'dnd.sheet.play' = { v: 1, chars: { <id>: Play } }
 *   Play = { hp: current|null (null = full), temp, max: hand-set max HP|null, slots: [used x9], pact: used,
 *            res: { <name>: used }, ws: used, hd: { <die>: used }, cond: [names], exh: 0-6, ds: [successes, failures],
 *            conc: spell name|null, t: last change (ms) }
 * The Party page reads this key too (read-only) to show current HP.
 */
(function () {
  var C = window.DndChar; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (v) { if (v == null || v === "" || typeof v === "boolean") return null; v = Number(v); return isFinite(v) ? v : null; };
  var int = function (v, lo, hi) { if (v == null || v === "") return null; v = Math.round(Number(v)); if (!isFinite(v)) return null; return Math.max(lo, Math.min(hi, v)); };
  var arr = function (v) { return Array.isArray(v) ? v : []; };
  var str = function (v, n) { return v == null ? '' : String(v).slice(0, n || 120); };
  var sign = function (n) { return (n >= 0 ? '+' : '−') + Math.abs(n); };
  var cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };

  var ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  var ABN = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
  var TOOL = {
    planner: { repo: 'dnd-multiclass-planner', name: 'Multiclass Planner' },
    magic: { repo: 'dnd-magic', name: 'Spell Planner' },
    wild: { repo: 'dnd-druid-wildshapes', name: 'Wild Shape' },
    feats: { repo: 'dnd-feats', name: 'Feats & Origins' },
    items: { repo: 'dnd-items', name: 'Item Finder' }
  };
  var CASTERS = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];
  var THIRD = /eldritch[\s-]*knight|arcane[\s-]*trickster/i;
  var CONDS = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];
  var EXH14 = ['', 'Disadvantage on ability checks', 'Speed halved', 'Disadvantage on attack rolls and saving throws', 'Hit point maximum halved', 'Speed reduced to 0', 'Death'];
  var PER = { short: 'Short rest', long: 'Long rest', turn: 'Per turn', day: 'Per day' };
  var ORD = ['Cantrips', '1st level', '2nd level', '3rd level', '4th level', '5th level', '6th level', '7th level', '8th level', '9th level'];
  var TIME = { '1A': 'Action', '1BA': 'Bonus action', '1R': 'Reaction', '1m': '1 minute', '10m': '10 minutes', '1h': '1 hour', '8h': '8 hours', '12h': '12 hours', '24h': '24 hours' };
  var HD = { barbarian: 12, fighter: 10, paladin: 10, ranger: 10, sorcerer: 6, wizard: 6 };   // every other class: d8
  var PKEY = 'dnd.sheet.play';
  var RULES = 'https://wernercd.github.io/dnd-rules/#';
  function rule(id, label, cls) { return '<a class="rule-link' + (cls ? ' ' + cls : '') + '" href="' + RULES + id + '" target="_blank" rel="noopener" aria-label="' + esc(label) + ' rules (Rules Reference)" title="' + esc(label) + ' rules">?</a>'; }

  // ---------- data from the shared record and the summaries ----------
  function sum(ch, repo) { var s = ch && ch.sheet && ch.sheet[repo]; return s && typeof s === 'object' && !Array.isArray(s) ? s : null; }
  function firstField(ch, field) {   // a field a future summary may add (ac, speed, passive, resist...), from whichever tool has it
    var order = ['dnd-multiclass-planner', 'dnd-feats', 'dnd-items', 'dnd-magic', 'dnd-druid-wildshapes'];
    for (var k in (ch.sheet || {})) if (order.indexOf(k) < 0) order.push(k);
    for (var i = 0; i < order.length; i++) { var s = sum(ch, order[i]); if (s && s[field] != null) return s[field]; }
    return null;
  }
  function isCaster(ch) { return ch.classes.some(function (x) { return CASTERS.indexOf(x.cls) >= 0 || THIRD.test(x.subName || x.sub || ''); }); }
  function model(ch) {
    var P = sum(ch, TOOL.planner.repo), M = sum(ch, TOOL.magic.repo), W = sum(ch, TOOL.wild.repo), F = sum(ch, TOOL.feats.repo), I = sum(ch, TOOL.items.repo);
    // the planner's summary is for the full planned build; the shared record's classes are where the character is now
    // The planner's summary is for the full planned build. When the character is below it, the planner adds
    // now: {lvl, src, hp, slots, pact?, res?} at the current level. The shared record's classes equal the plan.
    var N = P && P.now && typeof P.now === 'object' && int(P.now.lvl, 1, 20) ? P.now : null;
    var recLvl = C.level(ch), planLvl = int(P && P.lvl, 1, 20);
    var lvl = N ? int(N.lvl, 1, 20) : (recLvl || planLvl || 1), ahead = N ? lvl < (planLvl || 20) : !!(planLvl && recLvl && planLvl > recLvl);
    var single = ch.classes.length === 1;
    var ab = P && Array.isArray(P.ab) && P.ab.length === 6 && P.ab.every(function (n) { return num(n) != null; }) ? P.ab.map(function (n) { return int(n, 1, 30); }) : ch.ab;
    var m = {
      ch: ch, P: P, M: M, W: W, F: F, I: I, lvl: lvl, planLvl: planLvl, ahead: ahead, N: N, single: single,
      pb: (!ahead && int(P && P.pb, 2, 6)) || Math.ceil(lvl / 4) + 1, pbGuess: ahead || !(P && num(P.pb)),
      ab: ab, abFromPlanner: ab !== ch.ab,
      mod: function (a) { return Math.floor((ab[ABIL.indexOf(a)] - 10) / 2); },
      saves: arr(P && P.saves).map(function (s) { return String(s).toLowerCase().slice(0, 3); }),
      hp: N ? int(N.hp, 1, 999) : ahead ? null : int(P && P.hp, 1, 999), planHp: int(P && P.hp, 1, 999),
      hd: N ? (N.hd ? parseHD(N.hd) : single ? hdFromClasses(ch, lvl) : []) : ahead || !(P && P.hd) ? hdFromClasses(ch) : parseHD(P.hd),
      hdUnknown: !!(N && !N.hd && !single),
      slots: slotsOf(N ? N.slots : P && P.slots),
      pact: pactOf(N ? N.pact : P && P.pact),
      dc: arr(P && P.dc).filter(function (d) { return d && typeof d === 'object'; }).slice(0, 6),
      dcAhead: ahead,
      attacks: int(P && P.attacks, 1, 8),
      res: arr(N ? N.res : P && P.res).filter(function (r) { return r && r.name; }).slice(0, 40).map(function (r) { var per = PER[r.per] ? r.per : 'long'; return { name: str(r.name, 60), max: per === 'turn' ? 0 : (int(r.max, 0, 99) || 0), per: per, note: str(r.note, 120) }; }),   // per-turn (Sneak Attack) and unlimited pools get no pips
      ws: parseUses(W && W.uses),
      ed: ch.ed,
      skills: P && P.skills && typeof P.skills === 'object' ? P.skills : firstField(ch, 'skills'),
      ac: num(firstField(ch, 'ac')), speed: firstField(ch, 'speed'), init: num(firstField(ch, 'init')), passive: firstField(ch, 'passive'),
      resist: firstField(ch, 'resist'), immune: firstField(ch, 'immune')
    };
    if (m.pact && !m.pact.n) m.pact = null;
    m.caster = isCaster(ch) || !!M || m.slots.some(Boolean) || !!m.pact || m.dc.length > 0;
    m.druid = C.levelIn(ch, 'druid') > 0 || !!W;
    return m;
  }
  function slotsOf(a) { return Array.isArray(a) ? a.slice(0, 9).map(function (n) { return int(n, 0, 9) || 0; }) : []; }
  function pactOf(o) { return o && typeof o === 'object' ? { n: int(o.n, 0, 9) || 0, lvl: int(o.lvl, 1, 9) || 1 } : null; }
  function hdFromClasses(ch, only) {   // hit dice from the shared record's classes; `only` = level of a single-class character
    var by = {}; ch.classes.forEach(function (x) { var d = HD[x.cls] || 8; by[d] = (by[d] || 0) + (only || x.lvl); });
    return Object.keys(by).map(Number).sort(function (a, b) { return b - a; }).map(function (d) { return { n: Math.min(20, by[d]), d: d }; });
  }
  function parseUses(u) {   // Wild Shape publishes a display string: "3 / long rest", "2 / short rest", "Unlimited" (or a plain number)
    if (u == null || u === '') return null;
    var t = str(u, 40), unl = /unlimited/i.test(t), n = int((/\d+/.exec(t) || [])[0], 0, 20);
    return { label: typeof u === 'number' ? '' : t, n: unl ? 0 : (n || 0), unl: unl, per: /short/i.test(t) ? 'short' : /long/i.test(t) ? 'long' : null };
  }
  function passiveFrom(m, skill, abil) {
    var sk = m.skills; if (!sk) return null;
    var has = function (list) { return arr(list).some(function (x) { return String(x).toLowerCase().indexOf(skill) === 0; }); };
    return 10 + m.mod(abil) + (has(sk.exp) ? 2 * m.pb : has(sk.prof) ? m.pb : 0);
  }
  function parseHD(s) {   // "3d12+5d8" -> [{n:3, d:12}, {n:5, d:8}]
    var out = []; String(s || '').replace(/(\d+)\s*d\s*(\d+)/gi, function (_, n, d) { n = int(n, 0, 20); d = int(d, 4, 12); if (n && d) out.push({ n: n, d: d }); return ''; });
    return out;
  }

  // ---------- play state (own key) ----------
  function readPlay() {
    try { var d = JSON.parse(localStorage.getItem(PKEY) || 'null'); if (d && d.chars && typeof d.chars === 'object') return d; } catch (e) { /* private mode */ }
    return { v: 1, chars: {} };
  }
  function norm(p) {
    p = p && typeof p === 'object' ? p : {};
    var slots = arr(p.slots).slice(0, 9).map(function (n) { return int(n, 0, 9) || 0; }); while (slots.length < 9) slots.push(0);
    var o = function (v) { var r = {}; if (v && typeof v === 'object') for (var k in v) { var n = int(v[k], 0, 99); if (n) r[String(k).slice(0, 60)] = n; } return r; };
    return {
      hp: p.hp == null ? null : int(p.hp, 0, 999), temp: int(p.temp, 0, 999) || 0, max: p.max == null ? null : int(p.max, 1, 999),
      slots: slots, pact: int(p.pact, 0, 9) || 0, res: o(p.res), ws: int(p.ws, 0, 20) || 0, hd: o(p.hd),
      cond: arr(p.cond).filter(function (c) { return CONDS.indexOf(c) >= 0; }), exh: int(p.exh, 0, 6) || 0,
      ds: [int(arr(p.ds)[0], 0, 3) || 0, int(arr(p.ds)[1], 0, 3) || 0], conc: p.conc ? str(p.conc, 80) : null, t: p.t || 0
    };
  }
  function getPlay(id) { return norm(readPlay().chars[id]); }
  function setPlay(id, fn) {
    var d = readPlay(), p = norm(d.chars[id]);   // re-read first, so another tab's change is kept
    fn(p); p.t = Date.now(); d.chars[id] = p;
    try { localStorage.setItem(PKEY, JSON.stringify(d)); } catch (e) { toast('Could not save: this browser is blocking storage.'); }
    render();
  }
  window.addEventListener('storage', function (e) { if (e.key === PKEY) render(); });

  // ---------- view state ----------
  var want = window.SHEET_WANT || null, missingId = null, amt = '', undo = null;
  if (want && !C.get(want)) missingId = want;

  function maxHP(m, p) { return m.hp || p.max || null; }
  function curHP(m, p) { var mx = maxHP(m, p); return p.hp == null ? mx : (mx ? Math.min(p.hp, mx) : p.hp); }

  // pips: a row of tap targets; filled = available (or, for death saves, marked)
  function pips(key, max, filled, label) {
    var h = '<span class="pips" role="group" aria-label="' + esc(label) + ': ' + filled + ' of ' + max + '">';
    for (var i = 0; i < max; i++) h += '<button type="button" class="pip' + (i < filled ? ' on' : '') + '" data-a="pip" data-p="' + esc(key) + '" data-i="' + i + '" data-k="' + esc(key + ':' + i) + '" aria-pressed="' + (i < filled) + '" aria-label="' + esc(label) + ' ' + (i + 1) + ' of ' + max + '"></button>';
    return h + '</span>';
  }
  function src(m, t) { return '<a class="sh-src" href="' + esc(C.url(TOOL[t].repo, m.ch.id)) + '">' + esc(TOOL[t].name) + ' &rarr;</a>'; }
  function missing(m, t, what) { return '<p class="sh-missing">Not planned yet. <a href="' + esc(C.url(TOOL[t].repo, m.ch.id)) + '">Plan ' + esc(what) + ' in the ' + esc(TOOL[t].name) + ' &rarr;</a></p>'; }
  function card(key, title, links, body, wide) {
    return '<section class="sh-card sh-' + key + (wide ? ' wide' : '') + '" aria-labelledby="h-' + key + '"><div class="sh-ch"><h3 id="h-' + key + '">' + title + '</h3><span class="sh-srcs">' + links + '</span></div>' + body + '</section>';
  }
  function edNote(m, s, t) { return s && (s.ed === '2014' || s.ed === '2024') && s.ed !== m.ed ? '<p class="sh-note">The ' + esc(TOOL[t].name) + ' planned this for ' + s.ed + ' rules; the character uses ' + m.ed + '.</p>' : ''; }

  // ---------- sections ----------
  function topBlock(m, p) {
    var ch = m.ch, F = m.F;
    var subs = ch.classes.filter(function (x) { return x.subName; }).map(function (x) { return esc(x.subName); }).join(', ');
    var origin = [F && F.species && str(F.species, 60), F && F.background && str(F.background, 60)].filter(Boolean).map(esc).join(' &middot; ');
    var wisP = 10 + m.mod('wis'), pv = m.passive && typeof m.passive === 'object' ? m.passive : null;
    var stats = [
      ['Level', m.lvl], ['Proficiency', sign(m.pb)],
      m.ac != null ? ['AC', m.ac] : null,
      ['Initiative', sign(m.init != null ? m.init : m.mod('dex'))],
      m.speed != null ? ['Speed', esc(str(m.speed, 20))] : null,
      m.skills ? ['Passive Perception', passiveFrom(m, 'percep', 'wis')] : pv && num(pv.prc) != null ? ['Passive Perception', num(pv.prc)] : ['Passive Wisdom', wisP, 'Passive Perception before any proficiency: 10 + Wisdom modifier'],
      m.skills ? ['Passive Insight', passiveFrom(m, 'insight', 'wis')] : pv && num(pv.ins) != null ? ['Passive Insight', num(pv.ins)] : null,
      m.skills ? ['Passive Investigation', passiveFrom(m, 'investig', 'int')] : pv && num(pv.inv) != null ? ['Passive Investigation', num(pv.inv)] : null,
      m.attacks ? ['Attacks', m.attacks + ' per action'] : null
    ].filter(Boolean);
    var srcTxt = m.N ? (m.N.src === 'import' ? ' (from the imported character)' : m.N.src === 'at' ? ' (the planner\'s "At level" setting)' : '') : '';
    var lvlNote = m.N && m.ahead ? '<p class="sh-note">The Multiclass Planner build goes to level ' + m.planLvl + '; this sheet shows level ' + m.lvl + srcTxt + '.' +
        (m.single ? '' : ' Features and feats are filtered by total level only' + (m.hdUnknown ? ', and hit dice per class aren\'t known yet' : '') + '.') + '</p>'
      : m.ahead ? '<p class="sh-note warn">The Multiclass Planner build goes to level ' + m.planLvl + '; the character is level ' + m.lvl + ' now. Level, proficiency, hit dice, features and feats here follow level ' + m.lvl + '. Slots and resources are from the level ' + m.planLvl + ' plan, and max HP needs setting by hand.</p>'
      : m.planLvl && m.planLvl < m.lvl ? '<p class="sh-note">The Multiclass Planner build stops at level ' + m.planLvl + '; the character is level ' + m.lvl + '.</p>' : '';
    return '<section class="sh-top" aria-labelledby="shName">' +
      '<div class="sh-id"><h2 id="shName">' + esc(ch.name) + '</h2>' +
      '<p class="sh-cls">' + (esc(C.summary(ch)) || 'No classes yet') + (subs ? ' &middot; ' + subs : '') + ' &middot; ' + ch.ed + ' rules' + (origin ? '<br>' + origin : '') + '</p></div>' +
      '<dl class="sh-stats">' + stats.map(function (s) { return '<div' + (s[2] ? ' title="' + esc(s[2]) + '"' : '') + '><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>'; }).join('') + '</dl>' +
      lvlNote + '</section>';
  }

  function vitals(m, p) {
    var mx = maxHP(m, p), cur = curHP(m, p), pct = mx ? Math.max(0, Math.min(100, Math.round(100 * cur / mx))) : 0;
    var h = '<div class="hp-row"><div class="hp-big"><span class="hp-cur" aria-label="Current hit points">' + (cur == null ? '&ndash;' : cur) + '</span><span class="hp-max"><span class="hp-sl"> / </span>' + (mx || '?') + '</span></div>' +
      '<div class="hp-temp' + (p.temp ? ' on' : '') + '">Temp <b>' + (p.temp || 0) + '</b></div></div>' +
      '<div class="hp-bar' + (pct <= 25 ? ' low' : '') + '" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
      '<p class="print-only hp-write">Current ______ &nbsp; Temp ______</p>' +
      '<div class="sh-ctl hp-ctl"><label class="sr" for="hpAmt">Amount</label><input id="hpAmt" type="number" inputmode="numeric" min="0" max="999" placeholder="Amount" value="' + esc(amt) + '">' +
      '<button type="button" class="btn dmg" data-a="dmg" data-k="dmg">Damage</button><button type="button" class="btn heal" data-a="heal" data-k="heal">Heal</button>' +
      '<button type="button" class="btn" data-a="temp" data-k="temp" title="Temporary hit points don\'t stack: this replaces them">Temp HP</button></div>';
    if (!m.hp) h += '<div class="sh-ctl hp-setmax"><label>Max HP <input id="hpMax" type="number" inputmode="numeric" min="1" max="999" value="' + (p.max || '') + '"></label>' +
      (m.ahead && m.planHp ? '<span class="muted small">The plan\'s ' + m.planHp + ' HP is for level ' + m.planLvl + '.</span>' : m.P ? '<span class="muted small">The planner has no HP for this character.</span>' : '') + '</div>';
    if (m.hdUnknown) h += '<p class="sh-note">Hit dice at level ' + m.lvl + ' aren\'t known for this multiclass build.</p>';
    if (m.hd.length) {
      var con = m.mod('con');
      h += '<div class="sh-row"><span class="sh-lbl">Hit dice <span class="muted">(' + sign(con) + ' Con each)</span></span><span class="sh-pipset">' +
        m.hd.map(function (x) { var used = Math.min(p.hd['d' + x.d] || 0, x.n); return '<span class="pipgrp"><b>d' + x.d + '</b> ' + pips('hd:' + x.d, x.n, x.n - used, 'd' + x.d + ' hit dice') + '</span>'; }).join('') + '</span></div>';
    }
    var down = cur === 0;
    h += '<div class="sh-row ds' + (down ? ' down' : '') + '"><span class="sh-lbl">Death saves ' + rule('death-saves', 'Death saving throw') + (down ? ' <b class="warn">at 0 HP</b>' : '') + '</span><span class="sh-pipset">' +
      '<span class="pipgrp">Successes ' + pips('ds:0', 3, p.ds[0], 'Death save successes') + '</span>' +
      '<span class="pipgrp fail">Failures ' + pips('ds:1', 3, p.ds[1], 'Death save failures') + '</span></span></div>' +
      (p.ds[1] >= 3 ? '<p class="sh-note warn">Three failures: the character dies.</p>' : p.ds[0] >= 3 ? '<p class="sh-note">Three successes: stable at 0 HP.</p>' : '');
    h += '<div class="sh-ctl rest"><button type="button" class="btn" data-a="short" data-k="short">Short rest</button><button type="button" class="btn primary" data-a="long" data-k="long">Long rest</button></div>';
    return card('hp', 'Hit points', m.P ? src(m, 'planner') : '', h + (m.P ? edNote(m, m.P, 'planner') : missing(m, 'planner', 'HP, hit dice and levels')));
  }

  function conditions(m, p) {
    var exhTxt = !p.exh ? 'None' : m.ed === '2014' ? EXH14.slice(1, p.exh + 1).join('; ') : (p.exh >= 6 ? 'Death' : '−' + 2 * p.exh + ' to D20 Tests, speed −' + 5 * p.exh + ' ft');
    var concs = m.M ? arr(m.M.spells).filter(function (s) { return s && s.conc && s.n; }).map(function (s) { return str(s.n, 80); }) : [];
    if (p.conc && concs.indexOf(p.conc) < 0) concs.unshift(p.conc);
    var h = '<div class="chips" role="group" aria-label="Conditions">' + CONDS.map(function (c) {
      var on = p.cond.indexOf(c) >= 0;
      return '<span class="chipw"><button type="button" class="chip' + (on ? ' on' : '') + '" data-a="cond" data-c="' + c + '" data-k="cond:' + c + '" aria-pressed="' + on + '">' + c + '</button>' + rule('condition-' + c.toLowerCase(), c) + '</span>';
    }).join('') + '</div>' +
      '<p class="print-only">Conditions: ________________________________</p>' +
      '<div class="sh-row"><span class="sh-lbl">Exhaustion ' + rule('condition-exhaustion', 'Exhaustion') + '</span><span class="exh"><button type="button" class="btn sq" data-a="exh-" data-k="exh-" aria-label="Less exhaustion">&minus;</button>' +
      '<b class="exh-n" aria-live="polite">' + p.exh + '</b><button type="button" class="btn sq" data-a="exh+" data-k="exh+" aria-label="More exhaustion">+</button></span>' +
      '<span class="exh-t' + (p.exh ? ' warn' : ' muted') + '">' + esc(exhTxt) + '</span></div>' +
      '<div class="sh-row sh-ctl"><span class="sh-lbl"><label for="concSel">Concentrating on</label> ' + rule('concentration', 'Concentration') + '</span><select id="concSel"><option value="">Nothing</option>' +
      concs.map(function (n) { return '<option' + (n === p.conc ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>';
    return card('cond', 'Conditions', '', h);
  }

  function abilities(m) {
    var h = '<div class="abil">' + ABIL.map(function (a, i) {
      var mod = m.mod(a), prof = m.saves.indexOf(a) >= 0;
      return '<div class="ab"><span class="ab-n" title="' + ABN[a] + '">' + a.toUpperCase() + '</span><b class="ab-m">' + sign(mod) + '</b><span class="ab-s">' + m.ab[i] + '</span>' +
        '<span class="ab-sv' + (prof ? ' prof' : '') + '" title="' + ABN[a] + ' saving throw' + (prof ? ' (proficient)' : '') + '">Save ' + sign(mod + (prof ? m.pb : 0)) + (prof ? ' &#9679;' : '') + '</span></div>';
    }).join('') + '</div>';
    var note = m.abFromPlanner ? '<p class="sh-note">Ability scores as entered in the planner (it doesn\'t add increases from feats or ASIs).</p>' : '<p class="sh-note">' + (m.P ? 'Scores from the shared character; the planner did not send final scores.' : 'Scores from the shared character, before any planned increases.') + (m.saves.length ? '' : ' Saving throw proficiencies come from the Multiclass Planner.') + '</p>';
    return card('ab', 'Abilities and saves', m.P ? src(m, 'planner') : '', h + note + (m.pbGuess ? '<p class="sh-note">Proficiency bonus worked out from the current total level.</p>' : ''));
  }

  function spellcasting(m, p) {
    var h = '';
    if (m.dc.length) h += '<dl class="sh-dc">' + m.dc.map(function (d) {
      var ab = String(d.abil || '').toLowerCase().slice(0, 3);
      var redo = m.dcAhead && ABN[ab];   // plan ahead of the character: 8 + current proficiency + modifier
      return '<div><dt>' + esc(ABN[ab] || cap(str(d.abil, 20)) || 'Spells') + '</dt><dd>DC <b>' + (redo ? 8 + m.pb + m.mod(ab) : int(d.dc, 1, 40) || '?') + '</b> &middot; attack <b>' + (redo ? sign(m.pb + m.mod(ab)) : num(d.atk) != null ? sign(int(d.atk, -10, 30)) : '?') + '</b></dd></div>';
    }).join('') + '</dl>';
    var any = false, rows = '';
    m.slots.forEach(function (n, i) { if (!n) return; any = true; var used = Math.min(p.slots[i], n); rows += '<div class="slot"><span class="slot-l">' + ORD[i + 1].replace(' level', '') + '</span>' + pips('slot:' + i, n, n - used, ORD[i + 1] + ' slots') + '<span class="slot-c">' + (n - used) + '/' + n + '</span></div>'; });
    if (m.pact) { any = true; var pu = Math.min(p.pact, m.pact.n); rows += '<div class="slot pact"><span class="slot-l">Pact (' + ORD[m.pact.lvl].replace(' level', '') + ')</span>' + pips('pact', m.pact.n, m.pact.n - pu, 'Pact slots') + '<span class="slot-c">' + (m.pact.n - pu) + '/' + m.pact.n + '</span></div>'; }
    if (any) h += '<div class="slots"><h4>Spell slots' + (m.ahead && !m.N ? ' <span class="warn">(level ' + m.planLvl + ' plan)</span>' : '') + '</h4>' + rows + (m.pact ? '<p class="sh-note">Pact slots come back on a short rest.</p>' : '') + '</div>';
    var links = m.P ? src(m, 'planner') : '';
    if (!m.P) h += missing(m, 'planner', 'slots and spell save DCs');
    // spells
    links += m.M ? ' ' + src(m, 'magic') : '';
    if (m.M) {
      var all = arr(m.M.spells).filter(function (x) { return x && x.n; });
      var groups = [], gi = {};   // by class when the Spell Planner says which class a spell counts for (multiclass), then by level
      all.forEach(function (x) { var c = str(x.cls, 30); if (!(c in gi)) { gi[c] = groups.length; groups.push({ cls: c, by: {} }); } var g = groups[gi[c]], l = int(x.lvl, 0, 9) || 0; (g.by[l] = g.by[l] || []).push(x); });
      var multi = groups.length > 1;
      var item = function (x) {
        var t = str(x.t, 12), on = p.conc && p.conc === str(x.n, 80), unprep = x.p === 0 || x.p === '0';
        return '<li class="' + (on ? 'concing' : '') + (unprep ? ' unprep' : '') + '"><span class="sp-n">' + esc(str(x.n, 80)) + '</span>' +
          (x.conc ? '<a class="mk c" href="' + RULES + 'concentration" target="_blank" rel="noopener" title="Concentration (rules)">C</a>' : '') + (x.rit ? '<abbr class="mk r" title="Ritual">R</abbr>' : '') +
          (x.always ? '<span class="tag soft" title="Always prepared (subclass or feature)">always</span>' : '') +
          (x.other ? '<span class="tag soft" title="From a feat or item">feat/item</span>' : '') +
          (unprep ? '<span class="tag soft" title="In the spellbook, not prepared">not prepared</span>' : '') +
          '<span class="sp-m">' + esc(TIME[t] || t) + (x.r ? ' &middot; ' + esc(str(x.r, 30)) : '') + '</span></li>';
      };
      h += '<div class="spells"><h4>Spells' + (m.M.list ? ' <span class="muted">&middot; ' + esc(str(m.M.list, 60)) + '</span>' : '') + '</h4>' +
        (all.length ? groups.map(function (g) {
          var lv = Object.keys(g.by).map(Number).sort(function (a, b) { return a - b; });
          return (multi ? '<h5 class="sp-cls">' + esc(g.cls ? cap(g.cls) : 'Other') + '</h5>' : '') + lv.map(function (l) {
            return '<div class="sp-lvl"><h5>' + ORD[l] + '</h5><ul>' + g.by[l].map(item).join('') + '</ul></div>';
          }).join('');
        }).join('') : '<p class="muted">No spells chosen yet.</p>') + '</div>' + edNote(m, m.M, 'magic');
    } else h += missing(m, 'magic', 'spells');
    return card('spells', 'Spellcasting', links, h, true);
  }

  function resources(m, p) {
    var h = '';
    if (m.res.length) h += '<ul class="res">' + m.res.map(function (r, i) {
      if (!r.max) return '<li><span class="res-n">' + esc(r.name) + '</span><span class="res-per">' + PER[r.per] + '</span>' + (r.note ? '<span class="res-note">' + esc(r.note) + '</span>' : '') + '</li>';
      var used = Math.min(p.res[r.name] || 0, r.max);
      return '<li><span class="res-n">' + esc(r.name) + ' <span class="slot-c">' + (r.max - used) + '/' + r.max + '</span></span>' + (r.max <= 12 ? pips('res:' + i, r.max, r.max - used, r.name) : '<span class="sh-ctl exh"><button type="button" class="btn sq" data-a="resn-" data-r="' + i + '" data-k="resn-' + i + '" aria-label="Use one ' + esc(r.name) + '">&minus;</button><button type="button" class="btn sq" data-a="resn+" data-r="' + i + '" data-k="resn+' + i + '" aria-label="Regain one ' + esc(r.name) + '">+</button></span>') +
        '<span class="res-per">' + PER[r.per] + '</span>' + (r.note ? '<span class="res-note">' + esc(r.note) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
    else if (m.P) h += '<p class="muted">No limited-use resources at this level.</p>';
    else h += missing(m, 'planner', 'class resources');
    return card('res', 'Resources', m.P ? src(m, 'planner') : '', h);
  }

  function wildshape(m, p) {
    var W = m.W, h = '';
    if (!W) return card('ws', 'Wild Shape', '', missing(m, 'wild', 'forms'));
    var plannerWS = wsRes(m), U = m.ws, wsEd = (W.ed || m.ed);
    if (plannerWS) h += '<p class="small muted">Uses are tracked under Resources, from the Multiclass Planner.</p>';
    else if (U && U.unl) h += '<p class="small">Uses: <b>' + esc(U.label || 'Unlimited') + '</b></p>';
    else if (U && U.n) { var used = Math.min(p.ws, U.n); h += '<div class="sh-row"><span class="sh-lbl">Uses <span class="slot-c">' + (U.n - used) + '/' + U.n + '</span></span>' + pips('ws', U.n, U.n - used, 'Wild Shape uses') +
      '<span class="res-per">' + (U.per === 'short' || wsEd === '2014' ? 'All back on a short or long rest' : 'One back on a short rest, all on a long rest') + '</span></div>'; }
    if (W.maxcr != null) h += '<p class="small muted">Highest CR: ' + esc(str(W.maxcr, 8)) + '</p>';
    var forms = arr(W.forms).filter(function (f) { return f && f.n; }).slice(0, 60);
    h += forms.length ? '<div class="tw"><table class="forms"><thead><tr><th scope="col">Form</th><th scope="col">CR</th><th scope="col">AC</th><th scope="col">HP</th><th scope="col">Speed</th></tr></thead><tbody>' +
      forms.map(function (f) { var d = function (v, n) { v = str(v, n); return v ? esc(v) : '&ndash;'; }; return '<tr><th scope="row">' + esc(str(f.n, 60)) + '</th><td>' + d(f.cr, 6) + '</td><td>' + d(f.ac, 6) + '</td><td>' + d(f.hp, 8) + '</td><td>' + d(f.spd, 40) + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<p class="muted">No forms starred yet.</p>';
    return card('ws', 'Wild Shape', src(m, 'wild'), h + edNote(m, W, 'wild'));
  }

  function wsRes(m) { for (var i = 0; i < m.res.length; i++) if (/wild\s*shape/i.test(m.res[i].name) && m.res[i].max) return m.res[i]; return null; }
  function featsFeatures(m) {
    var P = m.P, F = m.F, h = '';
    var fo = arr(F && F.feats).filter(function (f) { return f && f.n; }).map(function (f) { return { n: str(f.n, 80), cat: str(f.cat, 30), st: f.status === 'planned' ? 'planned' : 'taken', lvl: null }; });
    var taken = fo.filter(function (f) { return f.st === 'taken' && !/origin/i.test(f.cat); }), list = [];
    arr(P && P.feats).filter(function (f) { return f && f.name; }).sort(function (a, b) { return (a.lvl || 0) - (b.lvl || 0); }).forEach(function (f) {
      var lv = int(f.lvl, 1, 20), nm = str(f.name, 80), slot = /^(asi or feat|epic boon)$/i.test(nm);
      var named = slot ? taken.shift() : null;
      if (named) { named.lvl = lv; named.used = true; list.push(named); }
      else list.push({ n: nm, cat: '', st: '', lvl: lv, slot: slot });
    });
    fo.forEach(function (f) { if (!f.used) list.push(f); });
    list.forEach(function (f) { if (f.lvl && f.lvl > m.lvl) f.later = true; });
    var planned = list.filter(function (f) { return f.st === 'planned'; }), have = list.filter(function (f) { return f.st !== 'planned'; });
    var li = function (f) {
      return '<li' + (f.later ? ' class="unprep"' : '') + '>' + (f.lvl ? '<span class="lv">L' + f.lvl + '</span>' : '') + '<span' + (f.slot ? ' class="muted"' : '') + '>' + esc(f.n) + '</span>' + (f.cat ? '<span class="muted small"> ' + esc(f.cat) + '</span>' : '') +
        (f.later ? '<span class="tag soft">at level ' + f.lvl + '</span>' : '') + '</li>';
    };
    h += '<h4>Feats</h4>' + (have.length ? '<ul class="feats">' + have.map(li).join('') + '</ul>' : (P || F ? '<p class="muted">No feats yet.</p>' : missing(m, 'feats', 'feats, species and background'))) +
      (planned.length ? '<h4>Planned feats</h4><ul class="feats">' + planned.map(li).join('') + '</ul>' : '');
    if (P) {
      var by = {}, order = [];
      var later = 0;
      arr(P.features).forEach(function (f) {
        if (!f || !f.name) return; var c = str(f.cls, 30).toLowerCase() || 'other', have = m.N ? m.lvl : C.levelIn(m.ch, c);   // with now{}: class levels unknown for multiclass, so total level is the cap
        if (have && int(f.lvl, 1, 20) > have) { later++; return; }   // planned for a later level of that class
        if (!by[c]) { by[c] = []; order.push(c); } by[c].push(f);
      });
      h += '<h4>Features</h4>' + (order.length ? order.map(function (c) {
        return '<div class="feat-cls"><h5>' + esc(cap(c)) + '</h5><ul class="feat-list">' + by[c].sort(function (a, b) { return (a.lvl || 0) - (b.lvl || 0); }).map(function (f) {
          return '<li><span class="lv">' + (int(f.lvl, 1, 20) || '') + '</span>' + esc(str(f.name, 80)) + '</li>';
        }).join('') + '</ul></div>';
      }).join('') : '<p class="muted">No features listed.</p>') + (later ? '<p class="sh-note">' + later + ' more feature' + (later === 1 ? '' : 's') + ' planned for later levels.</p>' : '');
      var pr = P.prof && typeof P.prof === 'object' ? P.prof : null;
      if (pr && (pr.armor || pr.weapons || pr.tools)) h += '<h4>Proficiencies</h4><dl class="prof">' + [['Armor', pr.armor], ['Weapons', pr.weapons], ['Tools', pr.tools]].filter(function (x) { return x[1]; }).map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(str(x[1], 200)) + '</dd></div>'; }).join('') + '</dl>';
    } else h += '<h4>Features</h4>' + missing(m, 'planner', 'class features');
    var links = (P ? src(m, 'planner') : '') + (F ? ' ' + src(m, 'feats') : '');
    if (!F && (P && list.length)) h += '<p class="sh-note">Species and background come from <a href="' + esc(C.url(TOOL.feats.repo, m.ch.id)) + '">Feats &amp; Origins</a>.</p>';
    return card('feats', 'Feats and features', links, h, true);
  }

  function items(m) {
    var I = m.I;
    if (!I) return card('items', 'Items', '', missing(m, 'items', 'items'));
    var list = arr(I.items).filter(function (x) { return x && x.n; }).slice(0, 80), at = int(I.attuned, 0, 9);
    var nAtt = list.filter(function (x) { return x.att; }).length;
    var h = (at != null || nAtt ? '<p class="small">Attuned: <b>' + (at != null ? at : nAtt) + '</b> of 3</p>' : '') +
      (list.length ? '<ul class="items">' + list.map(function (x) {
        return '<li><span>' + esc(str(x.n, 80)) + '</span>' + (x.rar ? '<span class="muted small">' + esc(str(x.rar, 20)) + '</span>' : '') + (x.att ? '<abbr class="mk a" title="Requires attunement">A</abbr>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="muted">No items on the list yet.</p>');
    return card('items', 'Items', src(m, 'items'), h + edNote(m, I, 'items'));
  }

  function defenses(m) {
    var r = arr(m.resist).map(function (x) { return str(x, 30); }).filter(Boolean), im = arr(m.immune).map(function (x) { return str(x, 30); }).filter(Boolean);
    if (!r.length && !im.length) return '';
    return card('def', 'Defenses', '', (r.length ? '<p><b>Resistant:</b> ' + r.map(esc).join(', ') + '</p>' : '') + (im.length ? '<p><b>Immune:</b> ' + im.map(esc).join(', ') + '</p>' : ''));
  }

  function noChar() {
    var list = C.all();
    return '<section class="sh-empty"><h2>' + (missingId ? 'That character isn\'t in this browser' : 'No character selected') + '</h2>' +
      '<p>' + (missingId ? 'The link points to a character this browser doesn\'t have. Ask for a Share link instead, which carries the character with it.' : 'Pick a character to see its sheet.') + '</p>' +
      (list.length ? '<ul class="sh-pick">' + list.map(function (c) { return '<li><a class="btn" href="sheet.html?char=' + encodeURIComponent(c.id) + '">' + esc(c.name) + (c.classes.length ? ' <span class="muted">' + esc(C.short(c)) + '</span>' : '') + '</a></li>'; }).join('') + '</ul>'
        : '<p><a class="btn primary" href="./#characters">Make a character</a></p>') + '</section>';
  }

  // ---------- render ----------
  var cur = null;
  function render() {
    var ch = missingId ? null : C.active();
    cur = ch;
    var main = $('sheet'), fk = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-k');
    var fid = document.activeElement && document.activeElement.id;
    if (!ch) { main.innerHTML = noChar(); document.title = 'Character Sheet · D&D Toolbox'; return; }
    document.title = ch.name + ' · Character Sheet · D&D Toolbox';
    var m = model(ch), p = getPlay(ch.id);
    main.innerHTML = topBlock(m, p) +
      '<div class="sh-grid">' + vitals(m, p) + conditions(m, p) + abilities(m) + defenses(m) + resources(m, p) +
      (m.druid ? wildshape(m, p) : '') + (m.caster ? spellcasting(m, p) : '') + featsFeatures(m) + items(m) + '</div>' +
      '<p class="sh-foot muted small">Play tracking (HP, slots, conditions) is saved in this browser only. ' +
      '<a href="party.html">Party view</a> &middot; <button type="button" class="link" data-a="print">Print this sheet</button> &middot; <button type="button" class="link danger" data-a="reset">Clear play tracking</button></p>';
    if (fk) { var el = main.querySelector('[data-k="' + fk.replace(/"/g, '\\"') + '"]'); if (el) el.focus(); }
    else if (fid && $(fid)) { $(fid).focus(); }
  }

  function toast(msg, withUndo) {
    var t = $('shToast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (withUndo ? ' <button type="button" class="btn" id="shUndo">Undo</button>' : '') + ' <button type="button" class="link" id="shClose" aria-label="Dismiss">Dismiss</button>';
    t.hidden = false; if (window.DndUI) DndUI.enter(t);
    clearTimeout(toast.tm); toast.tm = setTimeout(function () { t.hidden = true; undo = null; }, 9000);
  }
  $('shToast').addEventListener('click', function (e) {
    if (e.target.id === 'shUndo' && undo && cur && undo.id === cur.id) { var u = undo; undo = null; setPlay(u.id, function (p) { var o = norm(u.prev); for (var k in o) p[k] = o[k]; }); $('shToast').hidden = true; }
    if (e.target.id === 'shClose') $('shToast').hidden = true;
  });

  function amount() { var n = int($('hpAmt') && $('hpAmt').value, 0, 999); return n || 0; }
  function rest(kind) {
    if (!cur) return; var m = model(cur), before = getPlay(cur.id);
    undo = { id: cur.id, prev: before };
    setPlay(cur.id, function (p) {
      m.res.forEach(function (r) { if (kind === 'long' || r.per === 'short' || r.per === 'turn') delete p.res[r.name]; });
      p.pact = 0;
      var ws14 = (m.W && m.W.ed || m.ed) === '2014', wsShort = ws14 || (m.ws && m.ws.per === 'short');
      if (kind === 'long' || wsShort) p.ws = 0; else p.ws = Math.max(0, p.ws - 1);
      // 2024 Wild Shape tracked under the planner's resources: one use back on a short rest
      var wr = wsRes(m); if (wr && kind === 'short' && wr.per === 'long' && !ws14 && p.res[wr.name]) { if (p.res[wr.name] > 1) p.res[wr.name]--; else delete p.res[wr.name]; }
      if (kind === 'long') {
        p.hp = null; p.temp = 0; p.slots = [0, 0, 0, 0, 0, 0, 0, 0, 0]; p.ds = [0, 0]; p.exh = Math.max(0, p.exh - 1);
        if (m.ed === '2014') {   // regain spent hit dice up to half the total (at least one), biggest dice first
          var total = m.hd.reduce(function (s, x) { return s + x.n; }, 0), back = Math.max(1, Math.floor(total / 2));
          m.hd.slice().sort(function (a, b) { return b.d - a.d; }).forEach(function (x) { var k = 'd' + x.d, u = p.hd[k] || 0, g = Math.min(u, back); back -= g; if (u - g) p.hd[k] = u - g; else delete p.hd[k]; });
        } else p.hd = {};
      }
    });
    toast(kind === 'long' ? 'Long rest: HP, slots, hit dice and resources restored' + (before.exh ? ', exhaustion down one' : '') + '.' : 'Short rest: short-rest resources' + (m.pact ? ' and pact slots' : '') + ' restored. Spend hit dice by tapping them.', true);
  }

  var main = $('sheet');
  main.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || !cur) return;
    var a = b.getAttribute('data-a'), id = cur.id, m = model(cur);
    if (a === 'pip') {
      var key = b.getAttribute('data-p'), i = +b.getAttribute('data-i'), on = b.classList.contains('on'), next = on ? i : i + 1;   // tap a filled pip: down to it; an empty one: up to it
      setPlay(id, function (p) {
        var parts = key.split(':');
        if (parts[0] === 'slot') p.slots[+parts[1]] = Math.max(0, m.slots[+parts[1]] - next);
        else if (parts[0] === 'pact') p.pact = Math.max(0, m.pact.n - next);
        else if (parts[0] === 'res') { var r = m.res[+parts[1]]; if (r) { if (r.max - next) p.res[r.name] = r.max - next; else delete p.res[r.name]; } }
        else if (parts[0] === 'ws') p.ws = Math.max(0, (m.ws ? m.ws.n : 0) - next);
        else if (parts[0] === 'hd') { var x = m.hd.filter(function (h) { return h.d === +parts[1]; })[0]; if (x) { if (x.n - next) p.hd['d' + x.d] = x.n - next; else delete p.hd['d' + x.d]; } }
        else if (parts[0] === 'ds') p.ds[+parts[1]] = next;
      });
    } else if (a === 'dmg' || a === 'heal' || a === 'temp') {
      var n = amount(); if (!n) { $('hpAmt').focus(); return; }
      setPlay(id, function (p) {
        var mx = maxHP(m, p), c = curHP(m, p);
        if (a === 'temp') { p.temp = n; return; }
        if (a === 'heal') { c = (c || 0) + n; if (mx) c = Math.min(mx, c); p.hp = mx && c >= mx ? null : c; p.ds = [0, 0]; return; }
        var t = Math.min(p.temp, n); p.temp -= t; n -= t;
        if (!n) return;
        if (c === 0) { p.ds[1] = Math.min(3, p.ds[1] + 1); return; }   // damage at 0 HP is a failed death save
        p.hp = Math.max(0, (c == null ? 0 : c) - n);
      });
      amt = ''; var inp = $('hpAmt'); if (inp) inp.value = '';
    } else if (a === 'cond') {
      var c0 = b.getAttribute('data-c');
      setPlay(id, function (p) { var k = p.cond.indexOf(c0); if (k >= 0) p.cond.splice(k, 1); else p.cond.push(c0); });
    } else if (a === 'exh+' || a === 'exh-') setPlay(id, function (p) { p.exh = Math.max(0, Math.min(6, p.exh + (a === 'exh+' ? 1 : -1))); });
    else if (a === 'resn+' || a === 'resn-') {
      var r1 = m.res[+b.getAttribute('data-r')]; if (!r1) return;
      setPlay(id, function (p) { var u = Math.max(0, Math.min(r1.max, (p.res[r1.name] || 0) + (a === 'resn-' ? 1 : -1))); if (u) p.res[r1.name] = u; else delete p.res[r1.name]; });
    } else if (a === 'short' || a === 'long') rest(a);
    else if (a === 'print') window.print();
    else if (a === 'reset') { if (confirm('Clear HP, slots used, conditions and death saves for ' + cur.name + '? The plans in the tools are not touched.')) { undo = { id: id, prev: getPlay(id) }; setPlay(id, function (p) { var o = norm({ max: p.max }); for (var k in o) p[k] = o[k]; }); toast('Play tracking cleared.', true); } }
  });
  main.addEventListener('input', function (e) { if (e.target.id === 'hpAmt') amt = e.target.value; });
  main.addEventListener('keydown', function (e) { if (e.target.id === 'hpAmt' && e.key === 'Enter') { e.preventDefault(); var d = main.querySelector('[data-a="dmg"]'); if (d) d.click(); } });
  main.addEventListener('change', function (e) {
    if (!cur) return;
    if (e.target.id === 'hpMax') { var v = int(e.target.value, 1, 999); setPlay(cur.id, function (p) { p.max = v || null; }); }
    if (e.target.id === 'concSel') { var s = e.target.value; setPlay(cur.id, function (p) { p.conc = s || null; }); }
  });

  C.onChange(function () { if (missingId && C.get(missingId)) missingId = null; render(); });
  // picking a character in the header after an unknown ?char= link shows that one
  document.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('#charPick')) missingId = null; }, true);
  render();
})();

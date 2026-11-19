/* D&D Toolbox: Party (party.html).
 * Members are characters from the shared list (character.js); who is in the party lives in this page's own key:
 *   'dnd.party' = { v: 1, ids: [character id, ...] }
 * It reads the tools' sheet summaries (ch.sheet[repo], STYLE.md 6e) and, read-only, the Character Sheet's play
 * state ('dnd.sheet.play') for current HP and conditions. It never writes to either.
 * window.DndParty holds the reusable numbers (XP per level, party level) for a later encounter builder.
 */
(function () {
  var C = window.DndChar; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (v) { if (v == null || v === "" || typeof v === "boolean") return null; v = Number(v); return isFinite(v) ? v : null; };
  var int = function (v, lo, hi) { if (v == null || v === "") return null; v = Math.round(Number(v)); if (!isFinite(v)) return null; return Math.max(lo, Math.min(hi, v)); };
  var arr = function (v) { return Array.isArray(v) ? v : []; };
  var str = function (v, n) { return v == null ? '' : String(v).slice(0, n || 120); };
  var KEY = 'dnd.party', PLAY = 'dnd.sheet.play', PEND = 'dnd.party.pending';
  var REPOS = { planner: 'dnd-multiclass-planner', magic: 'dnd-magic', wild: 'dnd-druid-wildshapes', feats: 'dnd-feats', items: 'dnd-items' };
  var NAMES = { 'dnd-multiclass-planner': 'Multiclass Planner', 'dnd-magic': 'Spell Planner' };
  var CASTERS = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];
  var THIRD = /eldritch[\s-]*knight|arcane[\s-]*trickster/i;

  // ---------- reusable party numbers ----------
  // XP needed to reach each level (SRD 5.1 / 5.2 Character Advancement; the same in both editions). XP[lvl - 1].
  var XP = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  function levelOf(ch) { var P = sum(ch, REPOS.planner); return int(P && P.lvl, 1, 20) || C.level(ch) || 1; }
  var DndParty = {
    XP: XP,
    xpFor: function (lvl) { return XP[(int(lvl, 1, 20) || 1) - 1]; },
    levels: function (chars) { return chars.map(levelOf); },
    stats: function (chars) {   // { n, total, avg, apl (rounded average, the "party level"), min, max }
      var L = DndParty.levels(chars), n = L.length, t = L.reduce(function (s, x) { return s + x; }, 0);
      return { n: n, total: t, avg: n ? t / n : 0, apl: n ? Math.max(1, Math.round(t / n)) : 0, min: n ? Math.min.apply(null, L) : 0, max: n ? Math.max.apply(null, L) : 0 };
    },
    members: function () { var ids = readParty(); return ids.map(C.get).filter(Boolean); }
  };
  window.DndParty = DndParty;

  // ---------- storage ----------
  function readParty() { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.ids)) return d.ids.filter(function (x) { return typeof x === 'string'; }); } catch (e) { /* private mode */ } return []; }
  function writeParty(ids) { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, ids: ids })); } catch (e) { msg('Could not save: this browser is blocking storage.'); } render(); }
  function toggle(id, on) { var ids = readParty().filter(function (x) { return x !== id; }); if (on) ids.push(id); writeParty(ids); }
  function play(id) { try { var d = JSON.parse(localStorage.getItem(PLAY) || 'null'); var p = d && d.chars && d.chars[id]; return p && typeof p === 'object' ? p : null; } catch (e) { return null; } }
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === PLAY) render(); });

  function sum(ch, repo) { var s = ch && ch.sheet && ch.sheet[repo]; return s && typeof s === 'object' && !Array.isArray(s) ? s : null; }
  function field(ch, f) { var o = ch.sheet || {}; var order = [REPOS.planner, REPOS.feats, REPOS.items, REPOS.magic, REPOS.wild]; for (var k in o) if (order.indexOf(k) < 0) order.push(k); for (var i = 0; i < order.length; i++) { var s = sum(ch, order[i]); if (s && s[f] != null) return s[f]; } return null; }
  function wisMod(ch) { var P = sum(ch, REPOS.planner), ab = P && Array.isArray(P.ab) && P.ab.length === 6 ? P.ab : ch.ab; return Math.floor(((int(ab[4], 1, 30) || 10) - 10) / 2); }
  function spells(ch) { var M = sum(ch, REPOS.magic); return arr(M && M.spells).filter(function (s) { return s && s.n; }).map(function (s) { return str(s.n, 80); }); }
  function key(n) { return String(n).toLowerCase().replace(/^[a-z]+['’]s\s+/, '').replace(/[^a-z ]+/g, '').replace(/\s+/g, ' ').trim(); }   // "Leomund's Tiny Hut" -> "tiny hut"
  function isCaster(ch) { return ch.classes.some(function (x) { return CASTERS.indexOf(x.cls) >= 0 || THIRD.test(x.subName || x.sub || ''); }); }

  // ---------- what the party can do ----------
  var HEAL = ['cure wounds', 'healing word', 'mass cure wounds', 'mass healing word', 'prayer of healing', 'heal', 'mass heal', 'regenerate', 'aura of vitality', 'goodberry', 'healing spirit', 'power word heal', 'life transference'];
  var HEAL_FEAT = /lay on hands|preserve life|healing light|wholeness of body|healing hands|disciple of life|blessed healer|hands of healing/i;
  var UTIL = [
    ['Bring back the fallen', ['spare the dying', 'revivify', 'raise dead', 'reincarnate', 'resurrection', 'true resurrection']],
    ['Cure and remove', ['lesser restoration', 'greater restoration', 'remove curse', 'dispel magic', 'protection from poison', 'dispel evil and good']],
    ['Detect and identify', ['detect magic', 'identify', 'detect evil and good', 'detect poison and disease', 'see invisibility', 'locate object', 'locate creature', 'clairvoyance', 'true seeing', 'scrying']],
    ['Get around', ['misty step', 'feather fall', 'jump', 'longstrider', 'spider climb', 'levitate', 'fly', 'water breathing', 'water walk', 'dimension door', 'passwall', 'tree stride', 'teleportation circle', 'teleport', 'word of recall', 'plane shift']],
    ['Talk and learn', ['message', 'comprehend languages', 'speak with animals', 'tongues', 'speak with dead', 'speak with plants', 'sending', 'augury', 'divination', 'commune', 'legend lore']],
    ['Protect', ['shield', 'sanctuary', 'shield of faith', 'protection from evil and good', 'warding bond', 'counterspell', 'death ward', 'banishment', 'globe of invulnerability']],
    ['Explore and camp', ['light', 'guidance', 'mage hand', 'alarm', 'find familiar', 'unseen servant', 'darkvision', 'invisibility', 'knock', 'pass without trace', 'rope trick', 'tiny hut', 'create food and water']]
  ];
  function healers(list) {
    return list.map(function (ch) {
      var sp = spells(ch).filter(function (n) { return HEAL.indexOf(key(n)) >= 0; });
      var P = sum(ch, REPOS.planner), F = sum(ch, REPOS.feats), ft = [];
      arr(P && P.features).concat(arr(P && P.res)).forEach(function (f) { var n = f && (f.name || f.n); if (n && HEAL_FEAT.test(n) && !ft.some(function (x) { return key(x) === key(n); })) ft.push(str(n, 60)); });
      if (F && /aasimar/i.test(str(F.species, 60)) && !ft.some(function (x) { return /healing hands/i.test(x); })) ft.push('Healing Hands (Aasimar)');
      return { ch: ch, spells: sp, feats: ft };
    }).filter(function (h) { return h.spells.length || h.feats.length; });
  }

  // ---------- page skeleton (built once, so the paste box keeps what you typed) ----------
  var main = $('party');
  main.innerHTML =
    '<p class="pt-intro">Pick which of this browser\'s characters are in the party, or add a player\'s character from their Share link. Each card links to that character\'s sheet. Everything stays in this browser.</p>' +
    '<details class="pt-pick" id="ptPick"><summary id="ptPickSum">Who\'s in the party</summary><ul id="ptPickList"></ul>' +
    '<div class="pt-paste"><label class="sr" for="ptPaste">Share link</label><input id="ptPaste" type="url" inputmode="url" autocomplete="off" placeholder="Paste a share link to add a character">' +
    '<button type="button" class="btn primary" id="ptAdd">Add</button><span class="pt-msg muted small" id="ptMsg" role="status"></span></div></details>' +
    '<ul class="pt-cards" id="ptCards" data-reveal></ul>' +
    '<section class="pt-over" id="ptOver" aria-labelledby="ptOverH"><h2 id="ptOverH">Party overview</h2>' +
    '<dl class="pt-kpis" id="ptKpis"></dl>' +
    '<div class="pt-grid">' +
    '<section class="sh-card" aria-labelledby="ptHealH"><div class="sh-ch"><h3 id="ptHealH">Healing</h3></div><div id="ptHeal"></div></section>' +
    '<section class="sh-card" aria-labelledby="ptResH"><div class="sh-ch"><h3 id="ptResH">Damage resistances</h3></div><div id="ptRes"></div></section>' +
    '<section class="sh-card wide" aria-labelledby="ptUtilH"><div class="sh-ch"><h3 id="ptUtilH">Key utility spells</h3></div><div id="ptUtil"></div></section>' +
    '<section class="sh-card wide" aria-labelledby="ptChartH"><div class="sh-ch"><h3 id="ptChartH">Levels and hit points</h3></div>' +
    '<div class="pt-chart-tabs" role="group" aria-label="Chart shows"><button type="button" data-m="lvl" aria-pressed="true">Level</button><button type="button" data-m="hp" aria-pressed="false">Max HP</button></div>' +
    '<div id="ptChart"></div></section>' +
    '</div></section>';

  function msg(t) { $('ptMsg').textContent = t; }

  // ---------- render ----------
  var chart = null, chartMode = 'lvl';
  function cardFor(ch) {
    var P = sum(ch, REPOS.planner), p = play(ch.id) || {};
    var lvl = levelOf(ch), max = int(P && P.hp, 1, 999) || int(p.max, 1, 999);
    var cur = p.hp == null ? max : int(p.hp, 0, 999); if (max && cur != null) cur = Math.min(cur, max);
    var ac = num(field(ch, 'ac')), pv = field(ch, 'passive'), prc = pv && typeof pv === 'object' ? num(pv.prc) : null;
    var dcs = arr(P && P.dc).map(function (d) { return d && int(d.dc, 1, 40); }).filter(Boolean);
    var stats = [
      ['Level', lvl], ['HP', max ? (cur != null && cur !== max ? cur + '/' + max : max) + (int(p.temp, 0, 999) ? ' +' + int(p.temp, 0, 999) : '') : '?'],
      ['AC', ac != null ? ac : '?'],
      prc != null ? ['Passive Perc.', prc] : ['Passive Wis', 10 + wisMod(ch), '10 + Wisdom modifier, before any Perception proficiency'],
      ['Spell DC', dcs.length ? dcs.filter(function (v, i) { return dcs.indexOf(v) === i; }).join(' / ') : (isCaster(ch) && !P ? '?' : '&ndash;')],
      ['Rules', ch.ed]
    ];
    var pct = max && cur != null ? Math.round(100 * cur / max) : null;
    var flags = arr(p.cond).map(function (c) { return str(c, 20); });
    if (cur === 0) flags.unshift('0 HP');
    if (int(p.exh, 0, 6)) flags.push('Exhaustion ' + int(p.exh, 0, 6));
    if (p.conc) flags.push('Concentrating: ' + str(p.conc, 40));
    var miss = [];
    if (!P) miss.push(NAMES[REPOS.planner]);
    if (isCaster(ch) && !sum(ch, REPOS.magic)) miss.push(NAMES[REPOS.magic]);
    var sheetUrl = 'sheet.html?char=' + encodeURIComponent(ch.id);
    return '<li class="pt-card" data-spot>' +
      '<h3><a href="' + sheetUrl + '">' + esc(ch.name) + '</a></h3>' +
      '<p class="pt-sum">' + (esc(C.summary(ch)) || 'No classes yet') + (ch.classes.some(function (x) { return x.subName; }) ? '<br><span class="muted">' + ch.classes.filter(function (x) { return x.subName; }).map(function (x) { return esc(x.subName); }).join(', ') + '</span>' : '') + '</p>' +
      (pct != null ? '<div class="pt-hpbar' + (pct <= 25 ? ' low' : '') + '" aria-hidden="true"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>' : '') +
      '<dl class="pt-stats">' + stats.map(function (s) { return '<div' + (s[2] ? ' title="' + esc(s[2]) + '"' : '') + '><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>'; }).join('') + '</dl>' +
      (flags.length ? '<div class="pt-flags">' + flags.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' : '') +
      (miss.length ? '<p class="pt-miss">Not planned yet in: ' + miss.map(esc).join(', ') + '</p>' : '') +
      '<div class="pt-acts"><a class="btn primary" href="' + sheetUrl + '">Open sheet</a><button type="button" class="link" data-out="' + esc(ch.id) + '" data-k="out:' + esc(ch.id) + '">Remove from party</button></div></li>';
  }

  function render() {
    var all = C.all(), ids = readParty(), members = ids.map(C.get).filter(Boolean);
    var fk = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-k');
    // picker
    $('ptPickSum').textContent = 'Who\'s in the party (' + members.length + ' of ' + all.length + ' character' + (all.length === 1 ? '' : 's') + ')';
    $('ptPickList').innerHTML = all.length ? all.map(function (ch) {
      var on = ids.indexOf(ch.id) >= 0;
      return '<li><label><input type="checkbox" data-in="' + esc(ch.id) + '" data-k="in:' + esc(ch.id) + '"' + (on ? ' checked' : '') + '> <span>' + esc(ch.name) + ' <span class="muted small">' + esc(C.short(ch)) + '</span></span></label></li>';
    }).join('') : '<li class="pt-empty">No characters in this browser yet. <a href="./#characters">Make one</a>, or paste a share link below.</li>';
    if (!members.length) $('ptPick').open = true;
    // cards
    $('ptCards').innerHTML = members.length ? members.map(cardFor).join('') : '<li class="pt-empty">Nobody in the party yet. Tick characters above to add them.</li>';
    // overview
    $('ptOver').hidden = !members.length;
    if (members.length) overview(members);
    if (fk) { var el = main.querySelector('[data-k="' + fk.replace(/"/g, '\\"') + '"]'); if (el) el.focus(); }
  }

  function overview(list) {
    var s = DndParty.stats(list);
    var hpTot = list.reduce(function (t, ch) { var P = sum(ch, REPOS.planner), p = play(ch.id) || {}; return t + (int(P && P.hp, 1, 999) || int(p.max, 1, 999) || 0); }, 0);
    var H = healers(list);
    $('ptKpis').innerHTML = [
      ['Members', s.n],
      ['Party level', s.apl, s.min !== s.max ? 'levels ' + s.min + '&ndash;' + s.max : ''],
      ['Average level', (Math.round(s.avg * 10) / 10).toString()],
      ['Total levels', s.total],
      ['Total max HP', hpTot || '?'],
      ['Healers', H.length]
    ].map(function (k) { return '<div><dt>' + k[0] + '</dt><dd>' + k[1] + (k[2] ? ' <small>' + k[2] + '</small>' : '') + '</dd></div>'; }).join('');

    $('ptHeal').innerHTML = H.length ? '<ul class="feats">' + H.map(function (h) {
      return '<li><b>' + esc(h.ch.name) + '</b><span class="muted small">' + h.spells.concat(h.feats).map(esc).join(', ') + '</span></li>';
    }).join('') + '</ul>' : '<p class="muted">Nobody has healing in their plans yet. Healing comes from the Spell Planner\'s spell lists and the Multiclass Planner\'s features (Lay on Hands and the like).</p>';
    var noSpells = list.filter(function (ch) { return isCaster(ch) && !sum(ch, REPOS.magic); });
    if (noSpells.length) $('ptHeal').innerHTML += '<p class="sh-note">No spell list yet for ' + noSpells.map(function (ch) { return '<a href="' + esc(C.url(REPOS.magic, ch.id)) + '">' + esc(ch.name) + '</a>'; }).join(', ') + '.</p>';

    var res = list.map(function (ch) { return { ch: ch, r: arr(field(ch, 'resist')).map(function (x) { return str(x, 30); }).filter(Boolean), i: arr(field(ch, 'immune')).map(function (x) { return str(x, 30); }).filter(Boolean) }; }).filter(function (x) { return x.r.length || x.i.length; });
    $('ptRes').innerHTML = res.length ? '<ul class="feats">' + res.map(function (x) {
      return '<li><b>' + esc(x.ch.name) + '</b><span class="muted small">' + x.r.map(esc).join(', ') + (x.i.length ? (x.r.length ? '; ' : '') + 'immune: ' + x.i.map(esc).join(', ') : '') + '</span></li>';
    }).join('') + '</ul>' : '<p class="muted">Not known yet. None of the tools publish resistances so far; they will show here once one does.</p>';

    var rows = [];
    UTIL.forEach(function (g) {
      var hits = [];
      g[1].forEach(function (sp) {
        var shown = null, who = list.filter(function (ch) { var hit = spells(ch).filter(function (n) { return key(n) === sp; })[0]; if (hit && !shown) shown = hit; return !!hit; });
        if (who.length) hits.push({ sp: shown, who: who });
      });
      rows.push({ g: g[0], hits: hits });
    });
    var anySpells = list.some(function (ch) { return sum(ch, REPOS.magic); });
    $('ptUtil').innerHTML = !anySpells ? '<p class="muted">No spell lists yet. Plan them in the <a href="' + esc(C.url(REPOS.magic)) + '">Spell Planner</a>, and the party\'s utility spells show here.</p>' :
      '<div class="tw"><table class="pt-tbl"><thead><tr><th scope="col">Need</th><th scope="col">Spells and who has them</th></tr></thead><tbody>' + rows.map(function (r) {
        return '<tr><th scope="row">' + esc(r.g) + '</th><td>' + (r.hits.length ? r.hits.map(function (h) {
          return '<span class="pt-sp"><b>' + esc(h.sp) + '</b> ' + h.who.map(function (ch) { return esc(ch.name); }).join(', ') + '</span>';
        }).join('<br>') : '<span class="muted">Nobody</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    drawChart(list);
  }

  function drawChart(list) {
    if (!window.DndPlot) return;
    var labels = list.map(function (ch) { return ch.name.length > 12 ? ch.name.slice(0, 11) + '…' : ch.name; });
    var vals = chartMode === 'hp' ? list.map(function (ch) { var P = sum(ch, REPOS.planner), p = play(ch.id) || {}; return int(P && P.hp, 1, 999) || int(p.max, 1, 999) || 0; }) : DndParty.levels(list);
    var opts = { labels: labels, values: vals, name: chartMode === 'hp' ? 'Max HP' : 'Level', xLabel: 'Party member', yLabel: chartMode === 'hp' ? 'Max HP' : 'Level',
      title: chartMode === 'hp' ? 'Max hit points by party member' : 'Character level by party member' };
    var sig = JSON.stringify(opts);
    if (chart && drawChart.sig === sig) return;
    drawChart.sig = sig;
    if (chart) chart.update(opts); else chart = DndPlot.bars($('ptChart'), opts);
  }

  // ---------- events ----------
  main.addEventListener('change', function (e) { var id = e.target.getAttribute('data-in'); if (id) toggle(id, e.target.checked); });
  main.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.out) toggle(b.dataset.out, false);
    if (b.dataset.m) { chartMode = b.dataset.m; main.querySelectorAll('.pt-chart-tabs button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); drawChart(DndParty.members()); }
    if (b.id === 'ptAdd') addFromPaste();
  });
  $('ptPaste').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addFromPaste(); } });

  function b64d(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  function addFromPaste() {
    var t = $('ptPaste').value.trim(); if (!t) { msg('Paste a character\'s Share link first.'); return; }
    var hm = /[#&]dndchar=([A-Za-z0-9_-]+)/.exec(t);
    if (hm) {
      var id = null; try { id = JSON.parse(b64d(hm[1])).id || null; } catch (e) { msg('That link is damaged or incomplete.'); return; }
      if (id) try { sessionStorage.setItem(PEND, id); } catch (e) { /* private mode */ }
      $('ptPaste').value = '';
      msg('Check the prompt at the top of the page to add the character.');
      location.hash = 'dndchar=' + hm[1];   // character.js picks this up and asks before adding
      setTimeout(takePending, 0);   // already in this browser and unchanged: it is just made active, so add it now
      return;
    }
    var qm = /[?&]char=([^&#\s]+)/.exec(t), cid = qm && decodeURIComponent(qm[1]);
    if (cid && C.get(cid)) { toggle(cid, true); $('ptPaste').value = ''; msg(C.get(cid).name + ' added to the party.'); return; }
    msg(cid ? 'That character isn\'t in this browser. Ask for its Share link instead.' : 'That doesn\'t look like a D&D Toolbox share link.');
  }
  function takePending() {
    var id = null; try { id = sessionStorage.getItem(PEND); } catch (e) { return; }
    if (!id || !C.get(id)) return;
    try { sessionStorage.removeItem(PEND); } catch (e) { /* ignore */ }
    if (readParty().indexOf(id) < 0) { toggle(id, true); msg(C.get(id).name + ' added to the party.'); }
  }

  C.onChange(function () { takePending(); render(); });
  // keep the party list tidy: drop ids of characters deleted from this browser
  var known = readParty().filter(function (id) { return C.get(id); }); if (known.length !== readParty().length) writeParty(known);
  render();
  takePending();
})();

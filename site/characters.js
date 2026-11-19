/* D&D Toolbox hub: the Characters page (characters.html). List, full editor, backup, and import from other
 * sites through importer.js (DndImport). The shared record is written only through DndChar (character.js,
 * STYLE.md 6c); the hub's own per-character data is links.dnd = { imp: { src, sid } } (where an import came from). */
(function () {
  'use strict';
  var C = window.DndChar, I = window.DndImport, $ = function (id) { return document.getElementById(id); };
  if (!C) return;
  var REPO = 'dnd';
  var CLASSES = ['artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
  var CASTERS = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];
  var THIRD = /eldritch[\s-]*knight|arcane[\s-]*trickster/i;
  var AB = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], AB_LONG = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
  var ARRAY = [15, 14, 13, 12, 10, 8], COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }, BUDGET = 27;
  var SRC = { ddb: 'D&D Beyond', foundry: 'Foundry VTT', fc5: 'Fight Club 5', dicecloud: 'DiceCloud' };
  var cap = function (s) { return String(s).replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var sgn = function (n) { return (n >= 0 ? '+' : '−') + Math.abs(n); };
  var mod = function (s) { return Math.floor((s - 10) / 2); };
  var plural = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
  var say = function (el, msg) { el.textContent = msg; if (msg && window.DndUI) DndUI.pop(el); };

  // ================================================================ list
  function tools(ch) {
    var t = [['dnd-multiclass-planner', 'Plan levels']];
    if (ch.classes.some(function (x) { return CASTERS.indexOf(x.cls) >= 0 || THIRD.test(x.subName || x.sub || ''); })) t.push(['dnd-magic', 'Spells']);
    if (C.levelIn(ch, 'druid')) t.push(['dnd-druid-wildshapes', 'Wild Shape']);
    t.push(['dnd-feats', 'Feats'], ['dnd-items', 'Items']);
    return '<a class="btn primary" href="sheet.html?char=' + encodeURIComponent(ch.id) + '">Sheet</a>' +
      t.map(function (x) { return '<a class="btn" href="' + C.url(x[0], ch.id) + '">' + x[1] + '</a>'; }).join('');
  }
  function impLine(ch) {
    var m = ch.imp; if (!m || !m.src) return '';
    var d = m.at ? new Date(m.at) : null;
    return '<span class="cp-from">Imported from ' + esc(SRC[m.src] || m.src) + (d && !isNaN(d) ? ' on ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '') + '</span>';
  }
  function render() {
    var list = C.all(), act = C.active();
    $('charCount').textContent = list.length ? '(' + list.length + ')' : '';
    $('charList').innerHTML = list.length ? list.map(function (ch) {
      var on = act && act.id === ch.id, subs = ch.classes.filter(function (x) { return x.subName; }).map(function (x) { return esc(x.subName); });
      return '<li class="char' + (on ? ' on' : '') + '" data-id="' + esc(ch.id) + '">' +
        '<div class="char-head"><h3>' + esc(ch.name) + '</h3>' + (on ? '<span class="tag">Active</span>' : '') + '</div>' +
        '<p class="char-sum">' + (esc(C.summary(ch)) || 'No classes yet') + (ch.classes.length ? ' &middot; level ' + C.level(ch) : '') + ' &middot; ' + ch.ed + ' rules' +
        (subs.length ? '<br><span class="muted">' + subs.join(', ') + '</span>' : '') + '</p>' +
        '<p class="char-ab" aria-label="Ability scores">' + ch.ab.map(function (n, i) { return '<span><b>' + AB[i] + '</b> ' + n + '</span>'; }).join('') + '</p>' +
        impLine(ch) +
        '<div class="char-tools">' + tools(ch) + '</div>' +
        '<div class="char-acts"><button type="button" class="link" data-edit="' + esc(ch.id) + '">Edit</button>' +
        (on ? '' : '<button type="button" class="link" data-act="' + esc(ch.id) + '">Make active</button>') +
        '<button type="button" class="link" data-share="' + esc(ch.id) + '">Share link</button>' +
        '<button type="button" class="link danger" data-del="' + esc(ch.id) + '">Delete</button></div></li>';
    }).join('') : '<li class="empty">No characters yet. Make one below, import one from another site, or save a build in the Multiclass Planner.</li>';
  }
  $('charList').addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.edit) openEditor(t.dataset.edit);
    if (t.dataset.act) C.setActive(t.dataset.act);
    if (t.dataset.share) { var sc = C.get(t.dataset.share); if (sc) C.copyShare(sc, REPO, t); }
    if (t.dataset.del) {
      var ch = C.get(t.dataset.del);
      if (ch && confirm('Delete "' + ch.name + '" from every D&D Toolbox site in this browser? Each site\'s own lists stay, but lose the link to this character.')) {
        C.remove(ch.id);
        if (ed.id === ch.id) { resetEditor(); say($('edMsg'), 'The character you were editing was deleted.'); }
        say($('charMsg'), 'Deleted ' + ch.name + '.');
      }
    }
  });
  $('newBtn').addEventListener('click', function () { resetEditor(); goTo('edit', $('edName')); });

  // backup: the whole shared list as JSON (same format as before: { v: 1, list })
  $('charExport').addEventListener('click', function () {
    var list = C.all(); if (!list.length) { say($('charMsg'), 'There are no characters to export yet.'); return; }
    var blob = new Blob([JSON.stringify({ v: 1, list: list }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dnd-characters-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    say($('charMsg'), 'Exported ' + plural(list.length, 'character') + '.');
  });
  $('charImportBtn').addEventListener('click', function () { $('charImport').click(); });
  $('charImport').addEventListener('change', function () {
    var f = this.files[0]; this.value = ''; if (!f) return;
    f.text().then(function (txt) {
      var d = JSON.parse(txt), list = d && Array.isArray(d.list) ? d.list : null;
      if (!list) {
        // not a backup: maybe a character export from another site, so hand it to the importer
        var kind = I && I.detect(txt);
        if (kind) { showSource(kind); preview(txt, kind); goTo('import'); return; }
        throw new Error('not a backup');
      }
      var n = 0, upd = 0;
      list.forEach(function (ch) { if (ch && ch.id) { if (C.get(ch.id)) upd++; C.save(ch, ch.by || REPO); n++; } });
      say($('charMsg'), n ? 'Restored ' + plural(n, 'character') + (upd ? ' (' + upd + ' replaced the copy already here)' : '') + '.' : 'No characters found in that file.');
    }).catch(function () { say($('charMsg'), 'That file is not a D&D Toolbox character backup.'); });
  });

  // ================================================================ editor
  var ed = { id: null, mode: 'manual', base: [10, 10, 10, 10, 10, 10], bonus: [0, 0, 0, 0, 0, 0], classes: [] };
  function blankClass() { return { cls: 'fighter', lvl: 1, sub: null, subName: null }; }
  function resetEditor() { fillEditor(null); }
  function openEditor(id) { var ch = C.get(id); if (!ch) return; fillEditor(ch); goTo('edit', $('edName')); }
  function fillEditor(ch) {
    ed.id = ch ? ch.id : null;
    $('editH').textContent = ch ? 'Edit ' + ch.name : 'New character';
    $('edSave').textContent = ch ? 'Save changes' : 'Save character';
    $('edName').value = ch ? ch.name : '';
    $('edEd').value = ch ? ch.ed : '2024';
    ed.classes = ch && ch.classes.length ? ch.classes.map(function (x) { return { cls: x.cls, lvl: x.lvl, sub: x.sub, subName: x.subName }; }) : [blankClass()];
    ed.mode = 'manual'; ed.base = ch ? ch.ab.slice() : [10, 10, 10, 10, 10, 10]; ed.bonus = [0, 0, 0, 0, 0, 0];
    $('edMsg').textContent = ''; $('abNote').textContent = '';
    drawClasses(); setMode('manual', true);
  }
  function drawClasses() {
    var max = Math.max(3, ed.classes.length);
    $('edClasses').innerHTML = ed.classes.map(function (c, i) {
      var known = CLASSES.indexOf(c.cls) >= 0;
      return '<div class="cls-row" data-i="' + i + '">' +
        '<label>Class <select data-f="cls">' + CLASSES.map(function (k) { return '<option value="' + k + '"' + (k === c.cls ? ' selected' : '') + '>' + cap(k) + '</option>'; }).join('') +
        (known ? '' : '<option value="' + esc(c.cls) + '" selected>' + esc(cap(c.cls)) + ' (other)</option>') + '</select></label>' +
        '<label class="f-lvl">Level <input data-f="lvl" type="number" inputmode="numeric" min="1" max="20" value="' + c.lvl + '"></label>' +
        '<label class="f-grow">Subclass <input data-f="subName" maxlength="80" autocomplete="off" placeholder="optional" value="' + esc(c.subName || '') + '"></label>' +
        (ed.classes.length > 1 ? '<button type="button" class="link danger cls-del" data-del="' + i + '" aria-label="Remove ' + esc(cap(c.cls)) + '">Remove</button>' : '') +
        '</div>';
    }).join('');
    $('edAddCls').hidden = ed.classes.length >= max;
    var tot = ed.classes.reduce(function (t, c) { return t + (+c.lvl || 0); }, 0);
    $('edLvl').textContent = '(level ' + tot + (tot > 20 ? ', more than 20' : '') + ')';
    $('edLvl').classList.toggle('warn', tot > 20);
  }
  $('edClasses').addEventListener('input', function (e) {
    var row = e.target.closest('.cls-row'), f = e.target.dataset.f; if (!row || !f) return;
    var c = ed.classes[+row.dataset.i];
    if (f === 'lvl') { c.lvl = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)); var tot = ed.classes.reduce(function (t, x) { return t + x.lvl; }, 0); $('edLvl').textContent = '(level ' + tot + (tot > 20 ? ', more than 20' : '') + ')'; $('edLvl').classList.toggle('warn', tot > 20); }
    else if (f === 'cls') { if (c.cls !== e.target.value) { c.cls = e.target.value; c.sub = null; c.subName = null; row.querySelector('[data-f="subName"]').value = ''; } }
    else if (f === 'subName') { var v = e.target.value.trim() || null; if (v !== c.subName) { c.subName = v; c.sub = null; } }
  });
  $('edClasses').addEventListener('change', function (e) { if (e.target.dataset.f === 'lvl') e.target.value = ed.classes[+e.target.closest('.cls-row').dataset.i].lvl; });
  $('edClasses').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]'); if (!b) return;
    ed.classes.splice(+b.dataset.del, 1); drawClasses();
    var first = $('edClasses').querySelector('select'); if (first) first.focus();
  });
  $('edAddCls').addEventListener('click', function () {
    var used = ed.classes.map(function (c) { return c.cls; }), c = blankClass();
    c.cls = CLASSES.filter(function (k) { return used.indexOf(k) < 0; })[0] || 'fighter';
    ed.classes.push(c); drawClasses();
    var sel = $('edClasses').querySelectorAll('select'); sel[sel.length - 1].focus();
  });

  // ---- ability scores: manual / point buy / standard array; buy and array add a bonus row (species or background)
  function cost(base) { return base.reduce(function (t, n) { return t + (COST[n] == null ? 99 : COST[n]); }, 0); }
  function finalAb() { return ed.base.map(function (n, i) { return Math.max(1, Math.min(30, n + (ed.mode === 'manual' ? 0 : ed.bonus[i]))); }); }
  function setMode(m, quiet) {
    var note = '';
    if (m !== ed.mode || quiet) {
      var cur = quiet ? ed.base.slice() : finalAb();
      if (m === 'manual') { ed.base = cur; ed.bonus = [0, 0, 0, 0, 0, 0]; }
      else if (m === 'buy') {
        if (cur.every(function (n) { return n >= 8 && n <= 15; }) && cost(cur) <= BUDGET) { ed.base = cur; ed.bonus = [0, 0, 0, 0, 0, 0]; }
        else { ed.base = [8, 8, 8, 8, 8, 8]; ed.bonus = [0, 0, 0, 0, 0, 0]; if (!quiet) note = 'Your scores didn\'t fit a 27-point buy, so every score starts at 8. Cancel keeps the saved scores.'; }
      } else if (m === 'array') {
        var sorted = cur.slice().sort(function (a, b) { return b - a; });
        if (JSON.stringify(sorted) === JSON.stringify(ARRAY)) ed.base = cur;
        else { ed.base = ARRAY.slice(); if (!quiet) note = 'Scores set to 15, 14, 13, 12, 10, 8 in order. Pick a value to swap it with the score that has it.'; }
        ed.bonus = [0, 0, 0, 0, 0, 0];
      }
      ed.mode = m;
    }
    Array.prototype.forEach.call($('abMode').children, function (b) { b.setAttribute('aria-checked', String(b.dataset.mode === m)); b.tabIndex = b.dataset.mode === m ? 0 : -1; });
    $('abHelp').textContent = m === 'manual' ? 'Type the final scores, including every bonus.'
      : m === 'buy' ? 'Spend 27 points; each score runs from 8 to 15. Then add your ' + ($('edEd').value === '2014' ? 'species' : 'background') + ' bonuses in the Bonus row.'
      : 'Give each score one of 15, 14, 13, 12, 10 and 8. Then add your ' + ($('edEd').value === '2014' ? 'species' : 'background') + ' bonuses in the Bonus row.';
    $('abNote').textContent = note;
    drawAb();
  }
  function drawAb() {
    var m = ed.mode, fin = finalAb();
    var cell = function (i) {
      var base;
      if (m === 'manual') base = '<input type="number" inputmode="numeric" min="1" max="30" data-ab="' + i + '" value="' + ed.base[i] + '" aria-label="' + AB_LONG[i] + ' score">';
      else if (m === 'buy') base = '<span class="stepper"><button type="button" data-step="-1" data-ab="' + i + '" aria-label="Lower ' + AB_LONG[i] + '"' + (ed.base[i] <= 8 ? ' disabled' : '') + '>&minus;</button>' +
        '<output aria-label="' + AB_LONG[i] + ' base">' + ed.base[i] + '</output>' +
        '<button type="button" data-step="1" data-ab="' + i + '" aria-label="Raise ' + AB_LONG[i] + '"' + (ed.base[i] >= 15 || cost(ed.base) + COST[ed.base[i] + 1] - COST[ed.base[i]] > BUDGET ? ' disabled' : '') + '>+</button></span>';
      else base = '<select data-ab="' + i + '" aria-label="' + AB_LONG[i] + ' base">' + ARRAY.map(function (v) { return '<option' + (v === ed.base[i] ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select>';
      var bonus = m === 'manual' ? '' : '<label class="ab-bonus">Bonus <input type="number" inputmode="numeric" min="0" max="4" data-bonus="' + i + '" value="' + ed.bonus[i] + '" aria-label="' + AB_LONG[i] + ' bonus"></label>';
      return '<div class="ab-cell"><span class="ab-name" title="' + AB_LONG[i] + '">' + AB[i] + '</span>' + base + bonus +
        '<span class="ab-fin">' + (m === 'manual' ? '' : '<b>' + fin[i] + '</b> ') + '<span class="ab-mod">' + sgn(mod(fin[i])) + '</span></span></div>';
    };
    $('abGrid').innerHTML = AB.map(function (x, i) { return cell(i); }).join('') +
      (m === 'buy' ? '<p class="ab-left" role="status">Points left: <b>' + (BUDGET - cost(ed.base)) + '</b> of 27</p>' : '');
  }
  $('abMode').addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
  $('abMode').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var bs = Array.prototype.slice.call($('abMode').children), i = bs.findIndex(function (b) { return b.dataset.mode === ed.mode; });
    var n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; setMode(n.dataset.mode); n.focus(); e.preventDefault();
  });
  $('edEd').addEventListener('change', function () { setMode(ed.mode, true); });
  $('abGrid').addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.bonus != null) { ed.bonus[+t.dataset.bonus] = Math.max(0, Math.min(4, parseInt(t.value, 10) || 0)); refreshFin(); return; }
    if (t.dataset.ab == null || t.tagName !== 'INPUT') return;
    ed.base[+t.dataset.ab] = Math.max(1, Math.min(30, parseInt(t.value, 10) || 10)); refreshFin();
  });
  function refreshFin() {   // update the totals without redrawing the inputs (keeps focus and caret)
    var fin = finalAb();
    Array.prototype.forEach.call($('abGrid').querySelectorAll('.ab-cell'), function (c, i) {
      c.querySelector('.ab-fin').innerHTML = (ed.mode === 'manual' ? '' : '<b>' + fin[i] + '</b> ') + '<span class="ab-mod">' + sgn(mod(fin[i])) + '</span>';
    });
  }
  $('abGrid').addEventListener('change', function (e) {
    var t = e.target;
    if (t.tagName === 'SELECT') {   // standard array: swap with the score that had this value
      var i = +t.dataset.ab, v = +t.value, j = ed.base.indexOf(v);
      if (j >= 0 && j !== i) ed.base[j] = ed.base[i];
      ed.base[i] = v; drawAb(); $('abGrid').querySelector('select[data-ab="' + i + '"]').focus();
    } else if (t.dataset.ab != null) t.value = ed.base[+t.dataset.ab];
    else if (t.dataset.bonus != null) t.value = ed.bonus[+t.dataset.bonus];
  });
  $('abGrid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]'); if (!b || b.disabled) return;
    var i = +b.dataset.ab, step = +b.dataset.step;
    ed.base[i] = Math.max(8, Math.min(15, ed.base[i] + step)); drawAb();
    var again = $('abGrid').querySelector('[data-step="' + step + '"][data-ab="' + i + '"]');
    (again && !again.disabled ? again : $('abGrid').querySelector('[data-step="' + (-step) + '"][data-ab="' + i + '"]')).focus();
  });

  $('editor').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('edName').value.trim();
    if (!name) { say($('edMsg'), 'Give the character a name.'); $('edName').focus(); return; }
    var old = ed.id ? C.get(ed.id) : null;
    if (ed.id && !old) { say($('edMsg'), 'That character was deleted in another tab; saving it as a new one.'); ed.id = null; }
    var classes = ed.classes.map(function (c) {
      var prev = old && old.classes.filter(function (o) { return o.cls === c.cls; })[0];
      var sub = c.sub || (prev && c.subName && C.sameSub(prev, { subName: c.subName }) ? prev.sub : null);
      return { cls: c.cls, lvl: c.lvl, sub: sub, subName: c.subName };
    });
    var ch = C.save({ id: ed.id || undefined, name: name, ed: $('edEd').value, classes: classes, ab: finalAb() }, REPO);
    if (!old) C.setActive(ch.id);
    fillEditor(ch);
    say($('edMsg'), old ? 'Saved.' : 'Added ' + ch.name + ' and made it the active character.');
    flash(ch.id);
  });
  $('edCancel').addEventListener('click', function () { var id = ed.id; resetEditor(); if (id) flash(id); });

  // ================================================================ import
  var pending = null, impKind = 'ddb';
  function showSource(k) {
    impKind = k;
    Array.prototype.forEach.call($('impSrc').children, function (b) { var on = b.dataset.src === k; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    Array.prototype.forEach.call(document.querySelectorAll('.imp-pane'), function (p) { p.hidden = p.dataset.pane !== k; });
    $('impErr').hidden = true;
  }
  $('impSrc').addEventListener('click', function (e) { var b = e.target.closest('[data-src]'); if (b) showSource(b.dataset.src); });
  $('impSrc').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var bs = Array.prototype.slice.call($('impSrc').children), i = bs.findIndex(function (b) { return b.dataset.src === impKind; });
    var n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; showSource(n.dataset.src); n.focus(); e.preventDefault();
  });
  function err(el, msg) { el.hidden = !msg; el.textContent = msg || ''; }

  var SHORT_MSG = 'Short ddb.ac links can\'t be read from here. Open the link in your browser, then paste the dndbeyond.com/characters/... address it takes you to.';
  $('ddbLink').addEventListener('input', function () {
    var id = I.ddbId(this.value), a = $('ddbOpen');
    err($('ddbErr'), I.isShortLink(this.value) ? SHORT_MSG : '');
    if (id) { a.href = I.ddbUrl(id); a.removeAttribute('aria-disabled'); a.textContent = 'the character data for #' + id; }
    else { a.href = 'https://www.dndbeyond.com/characters'; a.setAttribute('aria-disabled', 'true'); a.textContent = 'the character data'; }
  });
  $('ddbLink').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('ddbFetch').click(); } });
  $('ddbFetch').addEventListener('click', function () {
    var v = $('ddbLink').value, id = I.ddbId(v), btn = this;
    if (I.isShortLink(v)) { err($('ddbErr'), SHORT_MSG); return; }
    if (!id) { err($('ddbErr'), 'Paste the character\'s D&D Beyond link (dndbeyond.com/characters/12345678) or just its number.'); $('ddbLink').focus(); return; }
    err($('ddbErr'), ''); btn.disabled = true; btn.textContent = 'Fetching…';
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch(I.ddbUrl(id), { signal: ctl && ctl.signal, credentials: 'omit', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, text: t }; }); })
      .then(function (r) {
        var j = null; try { j = JSON.parse(r.text); } catch (e) { /* not JSON */ }
        if (j && j.success === false || !r.ok) {
          var msg = j && j.message || 'D&D Beyond answered ' + r.status + '.';
          throw { shown: (/not found/i.test(msg) ? 'D&D Beyond has no character #' + id + '.' : r.status === 403 || /private|permission|forbidden|unauthori/i.test(msg) ? 'That character is private. Make it public on D&D Beyond, or use step 3 (it works for private characters while you\'re signed in).' : msg) };
        }
        preview(j, 'ddb');
      })
      .catch(function (e) {
        $('ddbPasteBox').open = true;
        err($('ddbErr'), e && e.shown ? e.shown : e && e.name === 'AbortError' ? 'D&D Beyond took too long to answer. Try again, or use step 3 below.'
          : 'Your browser couldn\'t read D&D Beyond directly (it doesn\'t let other websites load characters). Use step 3 below: open the character data, copy it all and paste it here.');
      })
      .then(function () { clearTimeout(timer); btn.disabled = false; btn.textContent = 'Fetch'; });
  });
  $('ddbParse').addEventListener('click', function () {
    var t = $('ddbJson').value.trim();
    if (!t) { err($('ddbErr'), 'Paste the character data first.'); $('ddbJson').focus(); return; }
    if (I.isShortLink(t)) { err($('ddbErr'), SHORT_MSG); return; }
    if (/^\s*https?:|^\s*\d+\s*$/.test(t) && I.ddbId(t)) { $('ddbLink').value = t; $('ddbJson').value = ''; $('ddbLink').dispatchEvent(new Event('input')); err($('ddbErr'), 'That is a link, not the data. Open "the character data for #' + I.ddbId(t) + '" above, copy the whole page and paste it here.'); return; }
    err($('ddbErr'), ''); preview(t, 'ddb', $('ddbErr'));
  });
  [['foundryFile', 'foundry'], ['fc5File', 'fc5'], ['dcFile', 'dicecloud']].forEach(function (p) {
    $(p[0]).addEventListener('change', function () {
      var f = this.files[0]; this.value = ''; if (!f) return;
      if (f.size > 20e6) { err($('impErr'), 'That file is too large to be a character export.'); return; }
      f.text().then(function (t) { preview(t, p[1]); }, function () { err($('impErr'), 'Couldn\'t read that file.'); });
    });
  });

  function matchFor(imp, sid, kind) {
    var all = C.all(), bySrc = sid ? all.filter(function (c) { var l = c.links && c.links[REPO] && c.links[REPO].imp; return l && l.src === kind && String(l.sid) === String(sid); })[0] : null;
    return bySrc || all.filter(function (c) { return c.name.toLowerCase() === imp.name.toLowerCase(); })[0] || null;
  }
  function preview(input, kind, errEl) {
    var r;
    err($('impErr'), ''); errEl = errEl || $('impErr');
    try { r = I.read(input, kind); }
    catch (e) {
      $('preview').hidden = true; pending = null;
      err(errEl, e instanceof SyntaxError ? (kind === 'ddb' ? 'That isn\'t valid JSON. Copy the whole character data page (select all) and paste it again.' : 'That file isn\'t valid JSON.') : e.message);
      if (kind === 'ddb') $('ddbPasteBox').open = true;
      return;
    }
    if (r.kind !== kind) showSource(r.kind);
    var m = r.imp, match = matchFor(m, r.sid, r.kind);
    pending = { r: r, match: match };
    var list = function (a) { return a.length ? a.map(esc).join(', ') : '<span class="muted">none</span>'; };
    var names = function (a, f) { return a.length ? '<details><summary>' + a.length + '</summary><p class="small">' + a.map(f).join(', ') + '</p></details>' : '0'; };
    var lvl = m.classes.reduce(function (t, c) { return t + c.lvl; }, 0);
    var prep = m.spells.filter(function (s) { return s.p; }).length;
    $('pvBody').innerHTML =
      '<p class="pv-title"><b>' + esc(m.name) + '</b> &middot; ' + esc(m.classes.map(function (c) { return cap(c.cls) + ' ' + c.lvl + (c.subName ? ' (' + c.subName + ')' : ''); }).join(' / ')) + ' &middot; level ' + lvl + ' &middot; ' + m.ed + ' rules</p>' +
      '<p class="muted small">From ' + esc(SRC[r.kind]) + (m.species ? ' &middot; ' + esc(m.species) : '') + (m.background ? ' &middot; ' + esc(m.background) : '') + '</p>' +
      '<div class="pv-ab">' + m.ab.map(function (n, i) { return '<span><b>' + AB[i] + '</b>' + n + '<i>' + sgn(mod(n)) + '</i></span>'; }).join('') + '</div>' +
      '<dl class="pv-grid">' +
      '<div><dt>Max HP</dt><dd>' + (m.hp || '&ndash;') + '</dd></div><div><dt>AC</dt><dd>' + (m.ac || '&ndash;') + '</dd></div>' +
      '<div><dt>Initiative</dt><dd>' + sgn(m.init) + '</dd></div><div><dt>Speed</dt><dd>' + esc(m.speed || '–') + '</dd></div>' +
      '<div><dt>Passive Perception / Investigation / Insight</dt><dd>' + m.passive.prc + ' / ' + m.passive.inv + ' / ' + m.passive.ins + '</dd></div>' +
      '<div><dt>Saving throws</dt><dd>' + list(m.saves.map(function (s) { return s.toUpperCase(); })) + '</dd></div>' +
      '<div class="wide"><dt>Skills</dt><dd>' + list(m.skills.prof.map(cap).concat(m.skills.exp.map(function (s) { return cap(s) + ' (expertise)'; }))) + '</dd></div>' +
      (m.resist.length || m.immune.length ? '<div class="wide"><dt>Resistances / immunities</dt><dd>' + list(m.resist) + ' / ' + list(m.immune) + '</dd></div>' : '') +
      '<div><dt>Feats</dt><dd>' + names(m.feats, esc) + '</dd></div>' +
      '<div><dt>Spells' + (m.spells.length && prep < m.spells.length ? ' (' + prep + ' prepared)' : '') + '</dt><dd>' + names(m.spells, function (s) { return esc(s.n) + (s.p ? '' : ' <span class="muted">(not prepared)</span>'); }) + '</dd></div>' +
      '<div><dt>Items</dt><dd>' + names(m.items, function (it) { return esc(it.n) + (it.qty > 1 ? ' &times;' + it.qty : '') + (it.att ? ' <span class="muted">(attuned)</span>' : ''); }) + '</dd></div>' +
      '</dl>';
    var warn = r.warn.slice();
    if (m.classes.length > 3) warn.push('The character has ' + m.classes.length + ' classes; the editor and planner work best with up to 3.');
    $('pvWarn').innerHTML = warn.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('');
    $('pvMatch').innerHTML = match
      ? '<fieldset><legend>You already have <b>' + esc(match.name) + '</b> (' + esc(C.summary(match) || 'no classes') + ', ' + match.ed + ' rules). Update it, or add this as a new character?</legend>' +
        '<label><input type="radio" name="pvAs" value="update" checked> Update ' + esc(match.name) + ' <span class="muted small">(its tool lists and plans stay)</span></label>' +
        '<label><input type="radio" name="pvAs" value="new"> Add as a new character</label></fieldset>'
      : '';
    setGo();
    $('preview').hidden = false;
    if (window.DndUI) DndUI.enter($('preview'));
    $('preview').scrollIntoView({ behavior: window.DndUI && DndUI.reduced ? 'auto' : 'smooth', block: 'start' });
    $('preview').focus({ preventScroll: true });
  }
  function setGo() {
    var up = pending && pending.match && (document.querySelector('input[name="pvAs"]:checked') || {}).value === 'update';
    $('pvGo').textContent = up ? 'Update ' + pending.match.name : 'Add character';
  }
  $('pvMatch').addEventListener('change', setGo);
  $('pvCancel').addEventListener('click', function () { pending = null; $('preview').hidden = true; $('impSrc').querySelector('[aria-selected="true"]').focus(); });
  $('pvGo').addEventListener('click', function () {
    if (!pending) return;
    var r = pending.r, m = r.imp, up = pending.match && (document.querySelector('input[name="pvAs"]:checked') || {}).value === 'update';
    var old = up ? C.get(pending.match.id) : null;
    var classes = m.classes.map(function (c) {
      var prev = old && old.classes.filter(function (o) { return o.cls === c.cls; })[0];
      return { cls: c.cls, lvl: c.lvl, sub: prev && C.sameSub(prev, { subName: c.subName }) ? prev.sub : null, subName: c.subName };
    });
    var mine = {}, oldMine = old && old.links && old.links[REPO]; if (oldMine && typeof oldMine === 'object') for (var k in oldMine) mine[k] = oldMine[k];
    mine.imp = { src: r.kind, sid: r.sid };
    var links = {}; links[REPO] = mine;
    var ch = C.save({ id: old ? old.id : undefined, name: m.name, ed: m.ed, classes: classes, ab: m.ab, imp: m, links: links }, REPO);
    C.setSheet(ch.id, 'import', { v: 1, ed: m.ed, src: m.src, ac: m.ac, speed: m.speed, init: m.init, passive: m.passive, resist: m.resist, immune: m.immune, skills: m.skills, saves: m.saves, hp: m.hp });
    C.setActive(ch.id);
    pending = null; $('preview').hidden = true; $('ddbJson').value = '';
    say($('charMsg'), (old ? 'Updated ' : 'Imported ') + ch.name + ' from ' + SRC[r.kind] + ' and made it the active character.');
    goTo('list'); flash(ch.id);
  });

  // ================================================================ helpers
  function goTo(id, focusEl) {
    var el = $(id); el.scrollIntoView({ behavior: window.DndUI && DndUI.reduced ? 'auto' : 'smooth', block: 'start' });
    if (focusEl) setTimeout(function () { focusEl.focus({ preventScroll: true }); }, 50);
  }
  function flash(id) {
    var li = $('charList').querySelector('[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (!li) return; li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash');
  }

  C.onChange(function () {
    render();
    if (ed.id && !C.get(ed.id)) { resetEditor(); say($('edMsg'), 'The character you were editing was deleted.'); }
  });
  render(); resetEditor();
  if (/^#(new|edit)$/.test(location.hash)) setTimeout(function () { $('edName').focus(); }, 60);
  else if (location.hash === '#import') showSource('ddb');
})();

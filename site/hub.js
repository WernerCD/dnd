/* D&D Toolbox hub: the shared character list (see character.js and STYLE.md section 6c). */
(function () {
  var C = window.DndChar, $ = function (id) { return document.getElementById(id); };
  if (!C) return;
  var CLASSES = ['artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
  var CASTERS = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  $('ncClass').innerHTML = CLASSES.map(function (c) { return '<option value="' + c + '"' + (c === 'paladin' ? ' selected' : '') + '>' + cap(c) + '</option>'; }).join('');

  function tools(ch) {
    var t = [['dnd-multiclass-planner', 'Plan levels']];
    if (ch.classes.some(function (x) { return CASTERS.indexOf(x.cls) >= 0; })) t.push(['dnd-magic', 'Spells']);
    if (C.levelIn(ch, 'druid')) t.push(['dnd-druid-wildshapes', 'Wild Shape']);
    t.push(['dnd-items', 'Items']);
    return t.map(function (x) { return '<a class="btn" href="' + C.url(x[0], ch.id) + '">' + x[1] + '</a>'; }).join('');
  }
  function render() {
    var list = C.all(), act = C.active();
    $('charList').innerHTML = list.length ? list.map(function (ch) {
      var on = act && act.id === ch.id;
      return '<li class="char' + (on ? ' on' : '') + '">' +
        '<div class="char-head"><h3>' + esc(ch.name) + '</h3>' + (on ? '<span class="tag">Active</span>' : '') + '</div>' +
        '<p class="char-sum">' + (esc(C.summary(ch)) || 'No classes yet') + ' &middot; ' + ch.ed + ' rules' +
        (ch.classes.some(function (x) { return x.subName; }) ? '<br><span class="muted">' + ch.classes.filter(function (x) { return x.subName; }).map(function (x) { return esc(x.subName); }).join(', ') + '</span>' : '') + '</p>' +
        '<div class="char-tools">' + tools(ch) + '</div>' +
        '<div class="char-acts">' + (on ? '' : '<button type="button" class="link" data-act="' + esc(ch.id) + '">Make active</button>') +
        '<button type="button" class="link danger" data-del="' + esc(ch.id) + '">Delete</button></div></li>';
    }).join('') : '<li class="empty">No characters yet. Make one below, or save a build in the Multiclass Planner.</li>';
  }

  $('charList').addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.act) C.setActive(t.dataset.act);
    if (t.dataset.del) {
      var ch = C.get(t.dataset.del);
      if (ch && confirm('Delete "' + ch.name + '" from every D&D Toolbox site in this browser? Each site\'s own lists stay, but lose the link to this character.')) C.remove(ch.id);
    }
  });
  $('newChar').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('ncName').value.trim() || 'New character';
    var sub = $('ncSub').value.trim();
    var ch = C.save({ name: name, ed: $('ncEd').value, classes: [{ cls: $('ncClass').value, lvl: +$('ncLvl').value || 1, sub: null, subName: sub || null }] }, 'dnd');
    C.setActive(ch.id);
    $('newChar').reset(); $('ncClass').value = 'paladin';
  });
  $('charExport').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ v: 1, list: C.all() }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dnd-characters.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('charImportBtn').addEventListener('click', function () { $('charImport').click(); });
  $('charImport').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    f.text().then(function (txt) {
      var d = JSON.parse(txt), n = 0;
      (d && Array.isArray(d.list) ? d.list : []).forEach(function (ch) { if (ch && ch.id) { C.save(ch, ch.by || 'dnd'); n++; } });
      $('charMsg').textContent = n ? 'Imported ' + n + ' character' + (n === 1 ? '' : 's') + '.' : 'No characters found in that file.';
    }).catch(function () { $('charMsg').textContent = 'That file is not a D&D Toolbox character backup.'; });
    this.value = '';
  });

  C.onChange(render);
  render();
})();

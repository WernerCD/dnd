/* D&D Toolbox hub: the Characters card in "Build a character" (see character.js and STYLE.md 6c).
   The full list, editor, backup and import live on characters.html (characters.js). */
(function () {
  var C = window.DndChar, $ = function (id) { return document.getElementById(id); };
  if (!C || !$('newChar')) return;
  var CLASSES = ['artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  $('ncClass').innerHTML = CLASSES.map(function (c) { return '<option value="' + c + '"' + (c === 'paladin' ? ' selected' : '') + '>' + cap(c) + '</option>'; }).join('');

  function render() {
    var list = C.all(), act = C.active();
    $('ccStat').innerHTML = !list.length ? 'No characters yet. Add one here, or import one from D&amp;D Beyond, Foundry or Fight Club 5.'
      : '<b>' + list.length + '</b> saved' + (act ? ' &middot; active: <b>' + esc(act.name) + '</b>' + (act.classes.length ? ' (' + esc(C.short(act)) + ')' : '') : ' &middot; none active');
  }
  $('newChar').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('ncName').value.trim() || 'New character';
    var ch = C.save({ name: name, ed: $('ncEd').value, classes: [{ cls: $('ncClass').value, lvl: Math.max(1, Math.min(20, +$('ncLvl').value || 1)), sub: null, subName: null }] }, 'dnd');
    C.setActive(ch.id);
    $('newChar').reset(); $('ncClass').value = 'paladin';
    $('ccMsg').innerHTML = 'Added ' + esc(ch.name) + '. <a href="characters.html">Add scores or a subclass</a>';
  });

  C.onChange(render);
  render();
})();

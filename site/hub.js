/* D&D Toolbox hub: the Characters strip under "Pick a tool" and the Quick build card in "Build a character"
   (see character.js and STYLE.md 6c). The full list, editor, backup and import live on characters.html. */
(function () {
  var C = window.DndChar, $ = function (id) { return document.getElementById(id); };
  if (!C) return;
  var CLASSES = ['artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function render() {
    var list = C.all(), act = C.active();
    if ($('ccStat')) $('ccStat').textContent = list.length ? list.length + ' saved, shared by every tool and stored in this browser.' : 'Shared by every tool, stored in this browser.';
    if (!$('charStrip')) return;
    $('charStrip').innerHTML = list.length ? list.map(function (ch) {
      var on = act && act.id === ch.id;
      return '<li class="cs-char' + (on ? ' on' : '') + '">' +
        '<div class="cs-top"><b>' + esc(ch.name) + '</b>' + (on ? '<span class="tag">Active</span>' : '') + '</div>' +
        '<p class="cs-sum">' + (ch.classes.length ? esc(C.short(ch)) + ' &middot; level ' + C.level(ch) : 'No classes yet') + ' &middot; ' + ch.ed + '</p>' +
        '<div class="cs-acts"><a href="sheet.html?char=' + encodeURIComponent(ch.id) + '">Sheet</a>' +
        '<button type="button" class="link" data-share="' + esc(ch.id) + '">Share</button>' +
        (on ? '' : '<button type="button" class="link" data-act="' + esc(ch.id) + '">Make active</button>') + '</div></li>';
    }).join('') : '<li class="cs-empty"><p>No characters yet. Start one with <a href="#quick">Quick build</a> below, make a full one on the <a href="characters.html#edit">Characters page</a>, or <a href="characters.html#import">import one</a> from D&amp;D Beyond, Foundry, Fight Club 5 or DiceCloud.</p></li>';
  }
  if ($('charStrip')) $('charStrip').addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.act) C.setActive(t.dataset.act);
    if (t.dataset.share) { var ch = C.get(t.dataset.share); if (ch) C.copyShare(ch, 'dnd', t); }
  });

  if ($('newChar')) {
    $('ncClass').innerHTML = CLASSES.map(function (c) { return '<option value="' + c + '"' + (c === 'paladin' ? ' selected' : '') + '>' + cap(c) + '</option>'; }).join('');
    $('newChar').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('ncName').value.trim() || 'New character';
      var ch = C.save({ name: name, ed: $('ncEd').value, classes: [{ cls: $('ncClass').value, lvl: Math.max(1, Math.min(20, +$('ncLvl').value || 1)), sub: null, subName: null }] }, 'dnd');
      C.setActive(ch.id);
      $('newChar').reset(); $('ncClass').value = 'paladin';
      $('ccMsg').innerHTML = 'Added ' + esc(ch.name) + ' as the active character. <a href="characters.html#edit">Add scores or a subclass</a>';
    });
  }

  C.onChange(render);
  render();
})();

/* Hub search: one box for every tool (STYLE.md 6j). Each tool site publishes site/search.json:
 *   {"v": 1, "items": [{"n": "Bag of Holding", "t": "Wondrous item, uncommon", "k": "Item", "u": "#item=bag-of-holding"}]}
 * n = name, t = short detail line, k = kind label, u = link relative to that site's root.
 * The files load the first time the box is used (and the hub's offline cache keeps them). A site
 * without a search.json is skipped quietly.
 */
(function () {
  var B = 'https://wernercd.github.io/';
  var SOURCES = [
    ['dnd-magic', 'Spell Planner'], ['dnd-items', 'Item Finder'], ['dnd-monsters', 'Monster Lookup'],
    ['dnd-feats', 'Feats & Origins'], ['dnd-rules', 'Rules Reference'], ['dnd-druid-wildshapes', 'Wild Shape'],
    ['dnd-multiclass-planner', 'Multiclass Planner']
  ];
  var input = document.getElementById('hubSearch'), out = document.getElementById('hubResults'), stat = document.getElementById('hubSearchStat');
  if (!input || !out) return;
  var ALL = null, loading = null, sel = -1, shown = [];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fold = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };

  function pages() {   // the tools and hub pages themselves
    var list = [], seen = {};
    ((window.DndNav && DndNav.menu) || []).forEach(function (g) {
      g[1].forEach(function (it) { if (seen[it[1]]) return; seen[it[1]] = 1; list.push({ n: it[0], t: 'Open the ' + it[0] + ' page', k: 'Tool', url: B + it[1], site: 'D&D Toolbox' }); });
    });
    return list;
  }
  function load() {
    if (loading) return loading;
    stat.textContent = 'Loading the search lists...';
    loading = Promise.all(SOURCES.map(function (s) {
      return fetch(B + s[0] + '/search.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        return ((d && d.items) || []).map(function (it) { return { n: it.n, t: it.t, k: it.k, url: B + s[0] + '/' + (it.u || ''), site: s[1] }; });
      }).catch(function () { return []; });
    })).then(function (lists) {
      ALL = pages().concat.apply(pages(), lists).map(function (it) { it.f = fold(it.n); it.g = fold(it.t + ' ' + it.k); return it; });
      var n = lists.filter(function (l) { return l.length; }).length;
      stat.textContent = ALL.length.toLocaleString('en-US') + ' entries from ' + n + ' tool' + (n === 1 ? '' : 's') + '.';
      return ALL;
    });
    return loading;
  }
  function score(it, q, words) {
    if (it.f === q) return 0;
    if (it.f.indexOf(q) === 0) return 1;
    if (it.f.indexOf(' ' + q) >= 0) return 2;
    if (it.f.indexOf(q) >= 0) return 3;
    if (words.every(function (w) { return it.f.indexOf(w) >= 0 || it.g.indexOf(w) >= 0; })) return 4;
    return -1;
  }
  function render() {
    var q = fold(input.value.trim());
    sel = -1;
    if (!q) { out.innerHTML = ''; out.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    if (!ALL) { load().then(render); return; }
    var words = q.split(/\s+/), hits = [];
    ALL.forEach(function (it) { var s = score(it, q, words); if (s >= 0) hits.push([s, it]); });
    hits.sort(function (a, b) { return a[0] - b[0] || a[1].n.length - b[1].n.length || a[1].n.localeCompare(b[1].n); });
    shown = hits.slice(0, 40).map(function (h) { return h[1]; });
    out.innerHTML = shown.length ? shown.map(function (it, i) {
      return '<li role="option" id="hs' + i + '" aria-selected="false"><a href="' + esc(it.url) + '" tabindex="-1"><span class="hs-n">' + esc(it.n) + '</span>' +
        '<span class="hs-t">' + esc([it.k, it.t].filter(Boolean).join(' · ')) + '</span><span class="hs-s">' + esc(it.site) + '</span></a></li>';
    }).join('') : '<li class="hs-none">Nothing matches “' + esc(input.value.trim()) + '”.</li>';
    out.hidden = false; input.setAttribute('aria-expanded', 'true');
    stat.textContent = hits.length ? (hits.length > 40 ? 'Top 40 of ' + hits.length.toLocaleString('en-US') + ' matches.' : hits.length + ' match' + (hits.length === 1 ? '' : 'es') + '.') : 'No matches.';
  }
  function move(d) {
    var items = out.querySelectorAll('li[role="option"]'); if (!items.length) return;
    if (sel >= 0) items[sel].setAttribute('aria-selected', 'false');
    sel = (sel + d + items.length) % items.length;
    items[sel].setAttribute('aria-selected', 'true'); items[sel].scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', 'hs' + sel);
  }
  var t;
  input.addEventListener('focus', function () { load(); }, { once: true });
  input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(render, 90); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { var i = sel >= 0 ? sel : 0; if (shown[i]) { e.preventDefault(); location.href = shown[i].url; } }
    else if (e.key === 'Escape') { input.value = ''; render(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); input.focus(); }
  });
  window.DndHubSearch = { load: load, sources: SOURCES };
})();

/* "Save every tool for offline use": registers each tool site's offline cache from here (offline.js) */
window.addEventListener('load', function () {
  var row = document.getElementById('offlineRow'), btn = document.getElementById('saveAll'), st = document.getElementById('offlineStat');
  if (!row || !window.DndOffline || !DndOffline.supported) return;
  row.hidden = false;
  var paths = ['/dnd/'].concat(window.DndHubSearch.sources.map(function (s) { return '/' + s[0] + '/'; }));
  btn.addEventListener('click', function () {
    btn.disabled = true; st.textContent = 'Saving 0 of ' + paths.length + ' tools...';
    DndOffline.saveAll(paths, function (n, total) { st.textContent = 'Saving ' + n + ' of ' + total + ' tools...'; })
      .then(function () { return window.DndHubSearch.load(); })
      .then(function () { st.textContent = 'Saved. Every tool and the search lists now open without a connection (in this browser).'; btn.textContent = 'Save again'; btn.disabled = false; })
      .catch(function (e) { st.textContent = e.message; btn.disabled = false; });
  });
});

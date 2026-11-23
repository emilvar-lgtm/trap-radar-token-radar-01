// Trap Radar's dashboard. Reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the board, the filters and one protocol's detail view.
// No network, no framework. Hash routes: #detail=<slug> opens a protocol,
// #filter=band:<BAND> filters to one risk band.
(function () {
  var DATA = window.RADAR;
  if (!DATA) { document.getElementById('rows').innerHTML = '<tr><td colspan="8">No radar data found.</td></tr>'; return; }
  var rows = DATA.rows || [];
  var live = DATA.live || [];
  var state = { q: '', band: '', cat: '', chain: '', minTvl: 0, watchOnly: false, hideRed: false, sort: 'value' };
  // The watchlist slugs ride in data.js so the "watchlist only" filter can
  // use the house's own list instead of guessing it from the board.
  var watchSet = {};
  (DATA.watchlist || []).forEach(function (s) { watchSet[s] = true; });

  function $(id) { return document.getElementById(id); }
  function money(n) {
    if (n == null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function pct(n) {
    if (n == null) return '—';
    var cls = n < 0 ? 'neg' : (n > 0 ? 'pos' : '');
    return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(1) + '%</span>';
  }
  function ageFmt(days) {
    if (days == null) return 'unknown';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }
  function bandCls(b) { return b === 'RED FLAG' ? 'b-RED' : 'b-' + b; }
  function riskCell(r) {
    return '<span class="risk ' + bandCls(r.risk_band) + '"><span class="dot"></span>' + r.risk_band +
      ' <span class="sc">' + r.risk_score + '/100</span></span>';
  }
  function filtered() {
    var q = state.q.trim().toLowerCase();
    var out = rows.filter(function (r) {
      if (state.band && r.risk_band !== state.band) return false;
      if (state.cat && (r.category || '') !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (r.tvl_usd < state.minTvl) return false;
      if (state.watchOnly && !watchSet[r.slug]) return false;
      if (state.hideRed && r.risk_band === 'RED FLAG') return false;
      if (q) {
        var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    var key = state.sort;
    out.sort(function (a, b) {
      if (key === 'risk') return b.risk_score - a.risk_score || a.rank - b.rank;
      if (key === 'tvl') return b.tvl_usd - a.tvl_usd || a.rank - b.rank;
      if (key === 'growth') return (b.change_7d || 0) - (a.change_7d || 0) || a.rank - b.rank;
      if (key === 'age') return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days) || a.rank - b.rank;
      return a.rank - b.rank;
    });
    return out;
  }
  function render() {
    var list = filtered();
    var tb = $('rows');
    tb.innerHTML = list.map(function (r) {
      return '<tr data-slug="' + r.slug + '">' +
        '<td>' + r.rank + '</td>' +
        '<td><span class="nm">' + esc(r.name) + '</span><span class="cat">' + esc(r.category || 'Uncategorised') +
          (watchSet[r.slug] ? ' · watchlist' : '') + '</span></td>' +
        '<td>' + riskCell(r) + '</td>' +
        '<td class="num">' + money(r.implied_value_usd) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageFmt(r.age_days) + '</td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td></tr>';
    }).join('');
    $('empty').hidden = list.length > 0;
    $('shown').textContent = list.length + ' of ' + rows.length + ' protocols';
    Array.prototype.forEach.call(tb.querySelectorAll('tr'), function (tr) {
      tr.addEventListener('click', function () { openDetail(tr.getAttribute('data-slug')); });
    });
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function openDetail(slug, viaHash) {
    var r = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) { r = rows[i]; break; }
    if (!r) return;
    if (viaHash) document.body.classList.add('focus-detail');
    var d = $('detail');
    var factors = r.risk_factors.length
      ? '<ul class="factors">' + r.risk_factors.map(function (f) {
          return '<li><b>' + esc(f.signal) + ' +' + f.points + '</b> — ' + esc(f.detail) + '</li>';
        }).join('') + '</ul>'
      : '<p class="factors">No risk signal fired: steady TVL, known age, spread across chains.</p>';
    var steps = r.farm_steps || [];
    d.innerHTML =
      '<button class="close" id="closeDetail">Close ×</button>' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="dsub">' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) +
      ' · listed ' + (r.listed_at || 'date unknown') + ' · records no token</p>' +
      '<div class="kv">' +
      '<div><div class="k">Rank</div><div class="v">#' + r.rank + '</div></div>' +
      '<div><div class="k">Implied value</div><div class="v">' + money(r.implied_value_usd) + '</div></div>' +
      '<div><div class="k">TVL</div><div class="v">' + money(r.tvl_usd) + '</div></div>' +
      '<div><div class="k">Rug risk</div><div class="v ' + bandCls(r.risk_band) + '">' + r.risk_band + ' <small>' + r.risk_score + '/100</small></div></div>' +
      '<div><div class="k">7d change</div><div class="v">' + (r.change_7d == null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</div></div>' +
      '<div><div class="k">Trust multiplier</div><div class="v">' + r.trust_multiplier.toFixed(2) + ' <small>growth ' + r.growth_multiplier.toFixed(2) + ' × maturity ' + r.maturity_multiplier.toFixed(2) + '</small></div></div>' +
      '</div>' +
      '<h3>Why this risk score</h3>' + factors +
      '<h3>Farm plan — with an exit trigger</h3>' +
      '<ol class="steps">' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    d.hidden = false;
    $('closeDetail').addEventListener('click', function () { d.hidden = true; document.body.classList.remove('focus-detail'); location.hash = ''; });
    if (!viaHash) d.scrollIntoView({ behavior: 'auto', block: 'start' });
    if (location.hash !== '#detail=' + slug) history.replaceState(null, '', '#detail=' + slug);
    Array.prototype.forEach.call(document.querySelectorAll('#rows tr'), function (tr) {
      tr.classList.toggle('sel', tr.getAttribute('data-slug') === slug);
    });
  }
  function renderLive() {
    $('liveRows').innerHTML = live.map(function (p) {
      return '<tr><td><span class="nm">' + esc(p.name) + '</span><span class="cat">' + esc(p.category || 'Uncategorised') + '</span></td>' +
        '<td class="num">' + money(p.mcap_usd) + '</td><td class="num">' + money(p.tvl_usd) + '</td>' +
        '<td class="num">' + pct(p.change_7d) + '</td></tr>';
    }).join('');
  }
  function renderMeta() {
    $('asof').textContent = 'Snapshot ' + DATA.as_of + ' · floor $' + (DATA.floor_usd / 1e6) + 'M';
    $('counts').textContent = DATA.board_size + ' ranked · ' + DATA.watchlist_size + ' on watchlist · ' + DATA.live_size + ' already trading';
    var bands = $('bands');
    var order = ['SAFE', 'WATCH', 'RISKY', 'RED FLAG'];
    var colors = { SAFE: '#34d399', WATCH: '#fbbf24', RISKY: '#fb923c', 'RED FLAG': '#f87171' };
    bands.innerHTML = order.map(function (b) {
      var n = (DATA.risk_counts && DATA.risk_counts[b]) || 0;
      return '<button class="band-chip" data-band="' + b + '"><span class="dot" style="background:' + colors[b] + '"></span>' +
        b + ' <b>' + n + '</b></button>';
    }).join('');
    Array.prototype.forEach.call(bands.querySelectorAll('.band-chip'), function (chip) {
      chip.addEventListener('click', function () {
        state.band = state.band === chip.getAttribute('data-band') ? '' : chip.getAttribute('data-band');
        $('band').value = state.band;
        render();
      });
    });
    $('model-line').textContent = 'Model ' + DATA.model_version + ': implied = TVL × ' + DATA.model.base_multiple +
      ' × growth × maturity × trust. Trust = 1 − (risk ÷ 100) × ' + DATA.model.trust_max_discount + '.';
    $('method-text').textContent = 'Implied value = TVL × ' + DATA.model.base_multiple +
      ' × growth multiplier × maturity multiplier × trust multiplier. Growth clamps the 7d change to ' +
      DATA.model.growth_floor + '%…' + DATA.model.growth_cap + '% at weight ' + DATA.model.growth_weight +
      '; maturity runs ' + DATA.model.maturity_floor + '–1.0 over ' + DATA.model.maturity_days +
      ' days (unknown age counts as ' + DATA.model.unknown_age_days + ' days); trust discounts up to ' +
      Math.round(DATA.model.trust_max_discount * 100) + '% for rug risk. The same function scores every protocol; no name is special-cased.';
    var cats = {};
    rows.forEach(function (r) { if (r.category) cats[r.category] = true; });
    var catSel = $('cat');
    Object.keys(cats).sort().forEach(function (c) {
      var o = document.createElement('option'); o.textContent = c; catSel.appendChild(o);
    });
    var chains = {};
    rows.forEach(function (r) { r.chains.forEach(function (c) { chains[c] = true; }); });
    var chSel = $('chain');
    Object.keys(chains).sort().forEach(function (c) {
      var o = document.createElement('option'); o.textContent = c; chSel.appendChild(o);
    });
  }
  function bind() {
    $('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
    $('band').addEventListener('change', function (e) { state.band = e.target.value; render(); });
    $('cat').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
    $('chain').addEventListener('change', function (e) { state.chain = e.target.value; render(); });
    $('minTvl').addEventListener('change', function (e) { state.minTvl = Number(e.target.value); render(); });
    $('watchOnly').addEventListener('change', function (e) { state.watchOnly = e.target.checked; render(); });
    $('hideRed').addEventListener('change', function (e) { state.hideRed = e.target.checked; render(); });
    $('sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
    Array.prototype.forEach.call(document.querySelectorAll('#board thead th[data-k]'), function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-k');
        state.sort = k === 'rank' || k === 'value' ? 'value' : k === 'risk' ? 'risk' : k === 'tvl' ? 'tvl' : k === 'growth' ? 'growth' : k === 'age' ? 'age' : 'value';
        $('sort').value = state.sort;
        render();
      });
    });
  }
  function fromHash() {
    var h = location.hash || '';
    var m = h.match(/#detail=([A-Za-z0-9-]+)/);
    if (m) { openDetail(m[1], true); return; }
    var f = h.match(/#filter=band:(.+)/);
    if (f) {
      var band = decodeURIComponent(f[1]);
      if (['SAFE', 'WATCH', 'RISKY', 'RED FLAG'].indexOf(band) >= 0) {
        state.band = band; $('band').value = band;
        render();
      }
    }
  }
  renderMeta();
  renderLive();
  bind();
  render();
  fromHash();
})();

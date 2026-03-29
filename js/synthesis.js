/* ═══ SYNTHESIS — Tableau de synthèse et filtres ════════════════════════ */
import { S, synFilters } from './state.js';

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Mettre à jour un filtre et reconstruire le tableau ── */
export function setSynFilter(key, val) {
  synFilters[key] = val;

  // Mettre à jour l'état actif de chaque bouton .syn-fb
  document.querySelectorAll('.syn-fb').forEach(btn => {
    const id = btn.id;
    if (!id) return;
    const parts    = id.replace('sf', '').split('-');
    if (parts.length < 2) return;
    const fKey = parts[0].toLowerCase();
    const fVal = parts.slice(1).join('-');
    const keyMap = { arb: 'arb', per: 'per', typ: 'typ', sort: 'sort' };
    const mapped = keyMap[fKey];
    if (mapped) {
      btn.classList.toggle('active', synFilters[mapped] === fVal);
    }
  });

  buildSynTable();
}

/* ── Construire le tableau de synthèse ── */
export function buildSynTable() {
  // Noms réels sur les boutons arbitres (une seule fois)
  const btnA1 = document.getElementById('sfArb-A1');
  const btnA2 = document.getElementById('sfArb-A2');
  if (btnA1 && !btnA1.dataset.labeled) { btnA1.textContent = S.a1; btnA1.dataset.labeled = '1'; }
  if (btnA2 && !btnA2.dataset.labeled) { btnA2.textContent = S.a2; btnA2.dataset.labeled = '1'; }

  // Filtrer les observations
  const obs = S.obs.filter(o => {
    if (synFilters.arb !== 'all') {
      const arbList = Array.isArray(o.arb) ? o.arb : [o.arb];
      if (!arbList.includes(synFilters.arb)) return false;
    }
    if (synFilters.per !== 'all' && o.period !== synFilters.per) return false;
    if (synFilters.typ !== 'all' && o.col    !== synFilters.typ) return false;
    return true;
  });

  const el = document.getElementById('synTable');
  if (!obs.length) {
    el.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-hint);padding:1.5rem;">Aucune observation pour ces filtres</td></tr>';
    document.getElementById('synScore').style.display = 'none';
    return;
  }

  // Stats par catégorie — éclater les multi-catégories
  const catMap = {};
  obs.forEach(o => {
    const indivCats = Array.isArray(o.cats) ? o.cats : [o.cat];
    indivCats.forEach(c => {
      if (!catMap[c]) catMap[c] = { r: 0, g: 0 };
      if (o.col === 'red') catMap[c].r++;
      else                 catMap[c].g++;
    });
  });
  let stats = Object.keys(catMap).map(c => {
    const s = catMap[c];
    const total = s.r + s.g;
    const pct   = total > 0 ? Math.round(s.g / total * 100) : null;
    return { cat: c, r: s.r, g: s.g, total, pct };
  });

  // Tri
  if (synFilters.sort === 'weak') {
    stats.sort((a, b) => {
      if (a.pct === null && b.pct === null) return a.cat.localeCompare(b.cat);
      if (a.pct === null) return 1;
      if (b.pct === null) return -1;
      return a.pct - b.pct;
    });
  } else if (synFilters.sort === 'strong') {
    stats.sort((a, b) => {
      if (a.pct === null && b.pct === null) return a.cat.localeCompare(b.cat);
      if (a.pct === null) return 1;
      if (b.pct === null) return -1;
      return b.pct - a.pct;
    });
  } else {
    stats.sort((a, b) => a.cat.localeCompare(b.cat));
  }

  // Score global
  const totalR   = obs.filter(o => o.col === 'red').length;
  const totalG   = obs.filter(o => o.col === 'green').length;
  const totalAll = totalR + totalG;
  const globalPct = totalAll > 0 ? Math.round(totalG / totalAll * 100) : null;
  const scoreEl  = document.getElementById('synScore');
  if (globalPct !== null) {
    scoreEl.textContent = 'Score global : ' + globalPct + '%';
    scoreEl.className   = globalPct >= 70 ? 'score-good' : globalPct >= 40 ? 'score-mid' : 'score-bad';
    scoreEl.style.display = 'block';
  } else {
    scoreEl.style.display = 'none';
  }

  // Construction HTML du tableau
  const showR   = (synFilters.typ === 'all' || synFilters.typ === 'red');
  const showG   = (synFilters.typ === 'all' || synFilters.typ === 'green');
  const showPct = (synFilters.typ === 'all');

  let html = '<thead><tr>' +
    '<th style="width:18px;text-align:center;">#</th>' +
    '<th class="cat-h">Categorie</th>' +
    (showR   ? '<th style="color:var(--red-text);">Non conf.</th>' : '') +
    (showG   ? '<th style="color:var(--green-text);">Conf.</th>'  : '') +
    (showPct ? '<th>Conformite</th>' : '') +
    '</tr></thead><tbody>';

  stats.forEach((s, i) => {
    const rankColor = (i === 0 && synFilters.sort !== 'alpha')
      ? (synFilters.sort === 'weak'
          ? 'background:var(--red-bg);color:var(--red-text);'
          : 'background:var(--green-bg);color:var(--green-text);')
      : '';

    let barHtml = '';
    if (showPct && s.pct !== null) {
      const barColor = s.pct >= 70 ? 'var(--green-text)' : s.pct >= 40 ? 'var(--amber-text)' : 'var(--red-text)';
      barHtml = '<td>' +
        '<div class="conf-bar-wrap">' +
        '<div class="conf-bar"><div class="conf-bar-fill" style="width:' + s.pct + '%;background:' + barColor + ';"></div></div>' +
        '<span class="conf-pct" style="color:' + barColor + ';">' + s.pct + '%</span>' +
        '</div></td>';
    } else if (showPct) {
      barHtml = '<td style="color:var(--text-hint);font-size:11px;">—</td>';
    }

    html += '<tr>' +
      '<td style="text-align:center;"><span class="rank-badge" style="' + rankColor + '">' + (i + 1) + '</span></td>' +
      '<td class="cat-cell">' + s.cat + '</td>' +
      (showR ? '<td class="' + (s.r > 0 ? 'nr' : '') + '">' + s.r + '</td>' : '') +
      (showG ? '<td class="' + (s.g > 0 ? 'ng' : '') + '">' + s.g + '</td>' : '') +
      barHtml +
      '</tr>';
  });

  html += '</tbody>';
  el.innerHTML = html;
}

/* ═══ OBSERVATIONS — Formulaire de saisie et tableau ════════════════════ */
import { S, CA, CP, CAU } from './state.js';
import { fmt } from './utils.js';
import { log } from './logger.js';

export function buildCats() {
  const w = document.getElementById('CATS');
  w.innerHTML = '';
  const lab = text => {
    const d = document.createElement('div');
    d.className  = 'cg-label';
    d.style.width = '100%';
    d.textContent = text;
    w.appendChild(d);
  };
  lab('Decisions techniques');
  CA.forEach(c => w.appendChild(makeCat(c, false)));
  lab('Positionnement');
  CP.forEach(c => w.appendChild(makeCat(c, false)));
  lab('Autre');
  w.appendChild(makeCat(CAU, true));
}

function makeCat(c, isAutre) {
  const b = document.createElement('button');
  b.className = isAutre ? 'btn-autres' : 'btn-cat';
  b.innerHTML = (isAutre ? '+ Autres' : c) + '<span class="ck">&#10003;</span>';
  b.onclick   = () => window.App.selectCat(c);
  b.id = 'C_' + c.replace(/[\s']/g, '_');
  return b;
}

export function capTime() {
  if (S.fTime === null) {
    S.fTime = S.elapsed;
    S.fPer  = S.period;
    document.getElementById('FV').textContent = fmt(S.fTime);
    document.getElementById('FP').textContent = S.fPer;
    document.getElementById('FB').classList.add('on');
  }
}

export function cancelTime() {
  S.fTime  = null;
  S.fPer   = null;
  S.selArb = [];
  S.selCol = null;
  S.selCat = [];
  document.getElementById('FB').classList.remove('on');
  document.getElementById('BA1').className    = 'btn-arb';
  document.getElementById('BA2').className    = 'btn-arb';
  document.getElementById('BRed').className   = 'btn-col';
  document.getElementById('BGreen').className = 'btn-col';
  document.getElementById('AW').classList.remove('on');
  document.getElementById('AI').value = '';
  document.getElementById('CI').value = '';
  updCats();
}

export function selectArb(a) {
  capTime();
  const idx = S.selArb.indexOf(a);
  if (idx >= 0) {
    S.selArb.splice(idx, 1);
  } else {
    S.selArb.push(a);
  }
  document.getElementById('BA1').className = 'btn-arb' + (S.selArb.includes('A1') ? ' a1sel' : '');
  document.getElementById('BA2').className = 'btn-arb' + (S.selArb.includes('A2') ? ' a2sel' : '');
}

export function selectColor(c) {
  capTime();
  if (S.selCol === c) {
    S.selCol = null;
  } else {
    S.selCol = c;
  }
  document.getElementById('BRed').className   = 'btn-col' + (S.selCol === 'red'   ? ' rsel' : '');
  document.getElementById('BGreen').className = 'btn-col' + (S.selCol === 'green' ? ' gsel' : '');
  if (S.selCat.length) updCats();
}

export function selectCat(c) {
  capTime();
  const aw = document.getElementById('AW');

  if (c === CAU) {
    const idx = S.selCat.indexOf(CAU);
    if (idx >= 0) {
      S.selCat.splice(idx, 1);
      aw.classList.remove('on');
      document.getElementById('AI').value = '';
    } else {
      S.selCat.push(CAU);
      aw.classList.add('on');
      document.getElementById('AI').focus();
    }
  } else {
    const idx = S.selCat.indexOf(c);
    if (idx >= 0) {
      S.selCat.splice(idx, 1);
    } else {
      S.selCat.push(c);
    }
    if (!S.selCat.includes(CAU)) {
      aw.classList.remove('on');
      document.getElementById('AI').value = '';
    }
  }
  updCats();
}

export function updCats() {
  [...CA, ...CP, CAU].forEach(c => {
    const b = document.getElementById('C_' + c.replace(/[\s']/g, '_'));
    if (!b) return;
    const isA  = (c === CAU);
    const base = isA ? 'btn-autres' : 'btn-cat';
    const color = S.selCol === 'red' ? 'cr' : 'cg';
    b.className = S.selCat.includes(c) ? base + ' ' + color : base;
  });
}

export function saveObs() {
  const cmt = document.getElementById('CI').value.trim();

  if (!S.selArb.length) {
    log.warn('OBS', 'save_echec_validation', { raison: 'arbitre_manquant' });
    window.App.showAlert('Selectionnez au moins un arbitre.');
    return;
  }
  if (!S.selCol) {
    log.warn('OBS', 'save_echec_validation', { raison: 'couleur_manquante' });
    window.App.showAlert('Selectionnez une couleur.');
    return;
  }
  if (!S.selCat.length) {
    log.warn('OBS', 'save_echec_validation', { raison: 'categorie_manquante' });
    window.App.showAlert('Selectionnez au moins une categorie.');
    return;
  }

  const cats = S.selCat.map(c => {
    if (c === CAU) {
      const av = document.getElementById('AI').value.trim();
      if (!av) return null;
      return 'Autres : ' + av;
    }
    return c;
  });

  if (cats.includes(null)) {
    log.warn('OBS', 'save_echec_validation', { raison: 'precision_autres_manquante' });
    window.App.showAlert("Precisez l'action.");
    return;
  }

  if (!cmt) {
    log.warn('OBS', 'save_echec_validation', { raison: 'commentaire_manquant' });
    window.App.showAlert('Le commentaire est obligatoire.');
    return;
  }

  const t  = S.fTime !== null ? S.fTime : S.elapsed;
  const p  = S.fPer  || S.period;

  const arbNames = S.selArb.map(a => a === 'A1' ? S.a1 : S.a2);
  const catLabel = cats.join(' + ');
  const arbLabel = arbNames.join(' + ');
  const arbIds   = [...S.selArb];

  S.obs.push({
    time: fmt(t), el: t, period: p,
    arb: arbIds,
    an: arbLabel,
    cat: catLabel,
    cats: [...cats],
    col: S.selCol,
    cmt
  });

  log.info('OBS', 'observation_enregistree', {
    arbitres: arbLabel, categories: catLabel,
    type: S.selCol === 'red' ? 'non_conforme' : 'conforme',
    temps: fmt(t), periode: p,
    totalObservations: S.obs.length
  });

  cancelTime();
  renderTable();
  window.App.autosave();
}

export function oRow(o) {
  const rc = o.col === 'red' ? 'rr' : 'rg';
  const tl = o.col === 'red' ? 'Non conf./manquante' : 'Conforme';
  return '<tr class="' + rc + '">' +
    '<td style="white-space:nowrap;font-variant-numeric:tabular-nums;">' + o.time + '</td>' +
    '<td style="white-space:nowrap;">' + o.period + '</td>' +
    '<td><span class="badge ba">' + o.an + '</span></td>' +
    '<td style="font-weight:700;white-space:nowrap;">' + o.cat + '</td>' +
    '<td><span class="lc">' + tl + '</span></td>' +
    '<td>' + o.cmt + '</td></tr>';
}

export function sorted(by) {
  const o = [...S.obs];
  if      (by === 'cat')      o.sort((a, b) => a.cat.localeCompare(b.cat));
  else if (by === 'arb')      o.sort((a, b) => a.an.localeCompare(b.an));
  else if (by === 'col')      o.sort((a, b) => a.col.localeCompare(b.col));
  else if (by === 'time_asc') o.sort((a, b) => a.el - b.el);
  else                        o.sort((a, b) => b.el - a.el);
  return o;
}

export function renderTable() {
  const o = sorted(document.getElementById('sortSel').value);
  document.getElementById('OTB').innerHTML = o.length
    ? o.map(oRow).join('')
    : '<tr><td colspan="6" class="empty">Aucune observation</td></tr>';
  document.getElementById('OC').textContent = o.length + ' obs.';
}

export function renderEndTable() {
  document.getElementById('EETB').innerHTML =
    sorted(document.getElementById('sortSelE').value).map(oRow).join('');
}

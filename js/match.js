/* ═══ MATCH — Cycle de vie du match (démarrage, fin, retour, accueil) ═══ */
import { S, ans, synFilters, KEY_CURRENT } from './state.js';
import { fmtDate, pad } from './utils.js';
import { log } from './logger.js';

/* ── Démarrer un nouveau match ── */
export function startMatch() {
  S.tA    = document.getElementById('tA').value    || 'Equipe A';
  S.tB    = document.getElementById('tB').value    || 'Equipe B';
  S.a1    = document.getElementById('a1').value    || 'Arbitre 1';
  S.a2    = document.getElementById('a2').value    || 'Arbitre 2';
  S.mDate = document.getElementById('mDate').value || '';
  S.mTime = document.getElementById('mTime').value || '';
  S.mComp = document.getElementById('mComp').value || '';

  log.info('LIFECYCLE', 'match_start', {
    equipeA: S.tA, equipeB: S.tB,
    arbitre1: S.a1, arbitre2: S.a2,
    date: S.mDate, heure: S.mTime, competition: S.mComp
  });

  document.getElementById('sTA').textContent = S.tA;
  document.getElementById('sTB').textContent = S.tB;
  document.getElementById('thA').textContent = S.tA;
  document.getElementById('thB').textContent = S.tB;
  document.getElementById('AN1').textContent = S.a1;
  document.getElementById('AN2').textContent = S.a2;
  document.getElementById('topInfo').innerHTML =
    '<strong>' + S.tA + '</strong> vs <strong>' + S.tB + '</strong> | ' + S.a1 + ' & ' + S.a2;

  const mp = [];
  if (S.mDate) mp.push(fmtDate(S.mDate));
  if (S.mTime) mp.push(S.mTime);
  if (S.mComp) mp.push(S.mComp);
  document.getElementById('topMeta').textContent = mp.join(' · ');

  window.App.buildCats();
  window.App.buildTme();
  window.App.buildQs();
  window.App.renderTable();

  localStorage.removeItem(KEY_CURRENT);
  document.getElementById('resumeBanner').classList.remove('on');
  document.getElementById('SS').style.display = 'none';
  document.getElementById('MS').style.display = 'flex';
}

/* ── Terminer le match ── */
export function endMatch() {
  clearInterval(S.timer);
  S.run = false;

  log.info('LIFECYCLE', 'match_end', {
    equipeA: S.tA, equipeB: S.tB,
    scoreA: S.sA, scoreB: S.sB,
    scoreMiTempsA: S.htA, scoreMiTempsB: S.htB,
    periode: S.period,
    nbObservations: S.obs.length,
    tempsEcoule: S.elapsed
  });

  const mp = [];
  if (S.mDate) mp.push(fmtDate(S.mDate));
  if (S.mTime) mp.push(S.mTime);
  if (S.mComp) mp.push(S.mComp);

  document.getElementById('ET').textContent  = S.tA + ' vs ' + S.tB;
  document.getElementById('EM').textContent  = mp.join(' · ') + (mp.length ? ' — ' : '') + S.a1 + ' & ' + S.a2;
  document.getElementById('ESc').textContent = S.sA + ' : ' + S.sB;

  const htEl = document.getElementById('EHtScore');
  if (S.htA !== null) {
    htEl.textContent  = 'MT  ' + S.htA + ' : ' + S.htB;
    htEl.style.display = 'block';
  } else {
    htEl.style.display = 'none';
  }

  const ctxVal  = document.getElementById('ctxTA').value.trim();
  const eCtxEdit = document.getElementById('ECtxEdit');
  if (eCtxEdit) eCtxEdit.value = ctxVal;

  window.App.buildSynTable();
  window.App.renderEndTable();

  document.getElementById('MS').style.display = 'none';
  document.getElementById('ES').style.display = 'flex';
}

/* ── Retour à l'écran match depuis la synthèse ── */
export function backMatch() {
  log.info('LIFECYCLE', 'back_to_match');
  const eCtxEdit = document.getElementById('ECtxEdit');
  const ctxTA    = document.getElementById('ctxTA');
  if (eCtxEdit && ctxTA) ctxTA.value = eCtxEdit.value;
  document.getElementById('ES').style.display = 'none';
  document.getElementById('MS').style.display = 'flex';
}

/* ── Retour à l'accueil ── */
export function goHome() {
  if (S.run || S.obs.length > 0 || S.sA > 0 || S.sB > 0 || S.htA !== null) {
    if (!confirm("Retourner a l'accueil ? Le suivi en cours sera perdu.")) return;
    log.warn('LIFECYCLE', 'match_abandoned', {
      equipeA: S.tA, equipeB: S.tB,
      scoreA: S.sA, scoreB: S.sB,
      nbObservations: S.obs.length,
      periode: S.period
    });
  } else {
    log.info('LIFECYCLE', 'go_home');
  }

  clearInterval(S.timer);

  Object.assign(S, {
    tA: 'Equipe A', tB: 'Equipe B', a1: 'Arb 1', a2: 'Arb 2',
    mDate: '', mTime: '', mComp: '',
    run: false, elapsed: 0, period: 'MT1', timer: null, tick: null,
    sA: 0, sB: 0, htA: null, htB: null,
    tme: { A: [null, null, null], B: [null, null, null] },
    obs: [],
    selArb: null, selCol: null, selCat: null,
    fTime: null, fPer: null, pauseTme: false
  });
  ans.esprit = null; ans.engage = null; ans.niveau = null;
  Object.assign(synFilters, { arb: 'all', per: 'all', typ: 'all', sort: 'weak' });

  document.getElementById('CD').textContent       = '00:00';
  document.getElementById('BSS').textContent      = 'Demarrer';
  document.getElementById('BSS').className        = 'bc go';
  document.getElementById('PBadge').textContent   = 'MT1';
  document.getElementById('PBadge').className     = 'period-badge p-mt1';
  document.getElementById('sA').textContent       = '0';
  document.getElementById('sB').textContent       = '0';
  document.getElementById('tmeP').classList.remove('on');
  document.getElementById('PB').classList.remove('on');
  document.getElementById('ctxTA').value          = '';

  window.App.cancelTime();

  localStorage.removeItem(KEY_CURRENT);
  document.getElementById('resumeBanner').classList.remove('on');

  const rm = document.getElementById('rMin');
  const rs = document.getElementById('rSec');
  if (rm) rm.value = '';
  if (rs) rs.value = '';

  window.App.buildTme();
  window.App.renderTable();

  document.getElementById('MS').style.display   = 'none';
  document.getElementById('ES').style.display   = 'none';
  document.getElementById('HistS').style.display = 'none';
  document.getElementById('SS').style.display   = 'flex';

  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  document.getElementById('mDate').value = dd + '/' + mm + '/' + yyyy;
  document.getElementById('mTime').value =
    String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  document.getElementById('mComp').value = '';
  document.getElementById('tA').value    = '';
  document.getElementById('tB').value    = '';
  document.getElementById('a1').value    = '';
  document.getElementById('a2').value    = '';
}

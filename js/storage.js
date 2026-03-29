/* ═══ STORAGE — Persistance locale + synchronisation backend ════════════ */
import { S, ans, KEY_CURRENT, KEY_HISTORY } from './state.js';
import { fmtDate } from './utils.js';
import { log } from './logger.js';
import { isLoggedIn, saveMatchRemote, fetchMatches, deleteMatchRemote } from './auth.js';

export function autosave() {
  try {
    const snap = {
      S:       JSON.parse(JSON.stringify(S)),
      ans:     JSON.parse(JSON.stringify(ans)),
      ctx:     document.getElementById('ctxTA') ? document.getElementById('ctxTA').value : '',
      savedAt: Date.now(),
      period:  S.period
    };
    const payload = JSON.stringify(snap);
    localStorage.setItem(KEY_CURRENT, payload);
    log.info('STORAGE', 'autosave_ok', { nbObs: S.obs.length, periode: S.period, tailleOctets: payload.length });
  } catch (e) {
    log.error('STORAGE', 'autosave_erreur', { message: e.message, name: e.name });
  }
}

export function checkResume() {
  try {
    const raw = localStorage.getItem(KEY_CURRENT);
    if (!raw) return;
    const snap = JSON.parse(raw);
    if (!snap?.S) return;
    const ageMs = Date.now() - (snap.savedAt || 0);
    log.info('STORAGE', 'match_interrompu_detecte', {
      equipeA: snap.S.tA, equipeB: snap.S.tB,
      nbObs: (snap.S.obs || []).length,
      periode: snap.S.period,
      ageMinutes: Math.round(ageMs / 60000)
    });
    const d       = new Date(snap.savedAt);
    const dateStr = d.toLocaleDateString('fr-FR') + ' à ' +
                    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const title   = (snap.S.tA || '?') + ' vs ' + (snap.S.tB || '?');
    document.getElementById('resumeTitle').textContent = title;
    document.getElementById('resumeDesc').textContent  =
      'Interrompu le ' + dateStr + ' — ' + (snap.S.obs || []).length + ' observation(s), ' + snap.S.period;
    document.getElementById('resumeBanner').classList.add('on');
  } catch (e) {
    log.error('STORAGE', 'check_resume_erreur', { message: e.message });
  }
}

export function resumeMatch() {
  try {
    const raw = localStorage.getItem(KEY_CURRENT);
    if (!raw) return;
    const snap = JSON.parse(raw);
    log.info('LIFECYCLE', 'match_repris', { equipeA: snap.S.tA, equipeB: snap.S.tB });
    Object.keys(snap.S).forEach(k => { S[k] = snap.S[k]; });
    Object.keys(snap.ans).forEach(k => { ans[k] = snap.ans[k]; });

    // Compatibilité arrière : selArb et selCat étaient des scalaires avant v0.3.0
    if (!Array.isArray(S.selArb)) S.selArb = S.selArb ? [S.selArb] : [];
    if (!Array.isArray(S.selCat)) S.selCat = S.selCat ? [S.selCat] : [];
    // Compatibilité arrière : observations avec arb/cats scalaires
    S.obs.forEach(o => {
      if (!Array.isArray(o.arb)) o.arb = o.arb ? [o.arb] : [];
      if (!o.cats) o.cats = [o.cat];
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
    const pb = document.getElementById('PBadge');
    pb.textContent = S.period;
    if      (S.period === 'MT1') pb.className = 'period-badge p-mt1';
    else if (S.period === 'MT2') pb.className = 'period-badge p-mt2';
    else                          pb.className = 'period-badge p-prol';
    S.run = false;
    document.getElementById('BSS').textContent = 'Reprendre';
    document.getElementById('BSS').className   = 'bc go';
    window.App.updateCD();
    document.getElementById('sA').textContent = S.sA;
    document.getElementById('sB').textContent = S.sB;
    if (snap.ctx) document.getElementById('ctxTA').value = snap.ctx;
    window.App.buildTme();
    window.App.buildQs();
    Object.keys(ans).forEach(id => { if (ans[id]) window.App.setAns(id, ans[id]); });
    window.App.buildCats();
    window.App.renderTable();
    document.getElementById('resumeBanner').classList.remove('on');
    document.getElementById('SS').style.display = 'none';
    document.getElementById('MS').style.display = 'flex';
  } catch (e) {
    log.error('LIFECYCLE', 'resume_match_erreur', { message: e.message });
    window.App.showAlert('Erreur lors de la reprise : ' + e.message);
  }
}

export function discardMatch() {
  if (!confirm('Supprimer le suivi interrompu ?')) return;
  log.warn('LIFECYCLE', 'match_interrompu_supprime');
  localStorage.removeItem(KEY_CURRENT);
  document.getElementById('resumeBanner').classList.remove('on');
}

/* ── Sauvegarder dans l'historique local + backend si connecté ── */
export async function saveToHistory() {
  try {
    const ctx = document.getElementById('ctxTA')?.value || '';
    const gc  = document.getElementById('GC')?.value    || '';
    const entry = {
      id:      Date.now(),
      savedAt: Date.now(),
      S:       JSON.parse(JSON.stringify(S)),
      ans:     JSON.parse(JSON.stringify(ans)),
      ctx, gc
    };

    // Sauvegarde locale
    const history = _loadHistory();
    history.unshift(entry);
    localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    localStorage.removeItem(KEY_CURRENT);
    log.info('STORAGE', 'match_sauvegarde_local', { nbObs: S.obs.length });

    // Sauvegarde distante si connecté
    if (isLoggedIn()) {
      const matchData = {
        arbitre1: S.a1, arbitre2: S.a2,
        equipe_a: S.tA, equipe_b: S.tB,
        date_match: S.mDate, heure_match: S.mTime, competition: S.mComp,
        score_a: S.sA, score_b: S.sB,
        observations: S.obs,
        evaluation: ans,
        contexte: ctx,
        commentaire_global: gc
      };
      const result = await saveMatchRemote(matchData);
      if (result.ok) {
        // Stocker l'ID remote dans l'entrée locale
        history[0].remoteId = result.id;
        localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
        log.info('STORAGE', 'match_sauvegarde_remote_ok', { remoteId: result.id });
      }
    }
  } catch (e) {
    log.error('STORAGE', 'save_history_erreur', { message: e.message });
  }
}

export function openHistory() {
  log.info('LIFECYCLE', 'historique_ouvert');
  renderHistory();
  document.getElementById('SS').style.display    = 'none';
  document.getElementById('HistS').style.display = 'flex';
}

export function closeHistory() {
  log.info('LIFECYCLE', 'historique_ferme');
  document.getElementById('HistS').style.display = 'none';
  document.getElementById('SS').style.display    = 'flex';
}

export async function renderHistory() {
  const list = document.getElementById('histList');
  const countEl = document.getElementById('histCount');

  // Si connecté : charger depuis le serveur
  if (isLoggedIn()) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-hint);">Chargement...</div>';
    const result = await fetchMatches();
    if (result.ok && result.matches.length) {
      countEl.textContent = result.matches.length + ' match(s) sauvegardé(s)';
      list.innerHTML = result.matches.map(m => `
        <div class="hist-card">
          <div class="hist-card-info">
            <div class="hist-card-title">${m.equipe_a} vs ${m.equipe_b}</div>
            <div class="hist-card-meta">${m.arbitre1} & ${m.arbitre2} · ${m.date_match || ''} · ${m.competition || ''}</div>
            <div class="hist-card-score">${m.score_a} : ${m.score_b}</div>
          </div>
          <div class="hist-card-actions">
            <button class="btn-act" onclick="window.App.deleteHistoryRemote('${m.id}')">Supprimer</button>
          </div>
        </div>
      `).join('');
      return;
    } else if (result.ok) {
      countEl.textContent = '0 match(s) sauvegardé(s)';
      list.innerHTML = '<div class="hist-empty">Aucun match sauvegardé.<br>Les matchs apparaissent ici après export PDF.</div>';
      return;
    }
  }

  // Fallback : historique local
  const history = _loadHistory();
  countEl.textContent = history.length + ' match(s) sauvegardé(s)';
  if (!history.length) {
    list.innerHTML = '<div class="hist-empty">Aucun match dans l\'historique.<br>Les matchs apparaissent ici après export PDF.</div>';
    return;
  }
  list.innerHTML = history.map((m, i) => `
    <div class="hist-card">
      <div class="hist-card-info">
        <div class="hist-card-title">${m.S.tA} vs ${m.S.tB}</div>
        <div class="hist-card-meta">${m.S.a1} & ${m.S.a2} · ${m.S.mDate || ''}</div>
        <div class="hist-card-score">${m.S.sA} : ${m.S.sB}</div>
      </div>
      <div class="hist-card-actions">
        <button class="btn-act prim" onclick="window.App.reexportPDF(${i})">PDF</button>
        <button class="btn-act" onclick="window.App.deleteHistory(${m.id})">Supprimer</button>
      </div>
    </div>
  `).join('');
}

export function deleteHistory(id) {
  if (!confirm('Supprimer ce match de l\'historique ?')) return;
  const history = _loadHistory().filter(e => e.id !== id);
  log.warn('STORAGE', 'historique_match_supprime_local', { id });
  localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
  renderHistory();
}

export async function deleteHistoryRemote(id) {
  if (!confirm('Supprimer ce match ?')) return;
  const result = await deleteMatchRemote(id);
  if (result.ok) {
    renderHistory();
  } else {
    window.App.showAlert('Erreur lors de la suppression : ' + result.error);
  }
}

export function reexportPDF(idx) {
  const history = _loadHistory();
  if (!history[idx]) return;
  log.info('PDF', 'reexport_depuis_historique', { index: idx });
  const entry = history[idx];
  const savedS   = JSON.parse(JSON.stringify(S));
  const savedAns = JSON.parse(JSON.stringify(ans));
  const savedCtx = document.getElementById('ctxTA')?.value || '';
  const savedGC  = document.getElementById('GC')?.value    || '';
  Object.keys(entry.S).forEach(k   => { S[k]   = entry.S[k];   });
  Object.keys(entry.ans).forEach(k => { ans[k]  = entry.ans[k]; });

  // Compatibilité arrière
  if (!Array.isArray(S.selArb)) S.selArb = S.selArb ? [S.selArb] : [];
  if (!Array.isArray(S.selCat)) S.selCat = S.selCat ? [S.selCat] : [];
  S.obs.forEach(o => {
    if (!Array.isArray(o.arb)) o.arb = o.arb ? [o.arb] : [];
    if (!o.cats) o.cats = [o.cat];
  });

  if (document.getElementById('ctxTA')) document.getElementById('ctxTA').value = entry.ctx || '';
  if (document.getElementById('GC'))    document.getElementById('GC').value    = entry.gc  || '';
  window.App.exportPDF();
  setTimeout(() => {
    Object.keys(savedS).forEach(k   => { S[k]  = savedS[k];   });
    Object.keys(savedAns).forEach(k => { ans[k] = savedAns[k]; });
    if (document.getElementById('ctxTA')) document.getElementById('ctxTA').value = savedCtx;
    if (document.getElementById('GC'))    document.getElementById('GC').value    = savedGC;
  }, 500);
}

function _loadHistory() {
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    log.error('STORAGE', 'load_history_erreur', { message: e.message });
    return [];
  }
}

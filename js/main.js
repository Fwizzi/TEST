/* ═══ MAIN — Point d'entrée de l'application ════════════════════════════ */
import { applyTheme, toggleTheme, showAlert, closeAlert, buildQs, setAns } from './ui.js';
import { updateCD, toggleChrono, resumeTme, tickC, advPeriod, activerProlong, resetChrono, applyRecal } from './timer.js';
import { chgScore, buildTme, refreshTme, addTme, deleteTme, tmeVal } from './score.js';
import { buildCats, capTime, cancelTime, selectArb, selectColor, selectCat, updCats, saveObs, renderTable, renderEndTable, sorted } from './observations.js';
import { setSynFilter, buildSynTable } from './synthesis.js';
import { exportPDF } from './pdf.js';
import { autosave, checkResume, resumeMatch, discardMatch, saveToHistory, openHistory, closeHistory, renderHistory, deleteHistory, deleteHistoryRemote, reexportPDF } from './storage.js';
import { startMatch, endMatch, backMatch, goHome } from './match.js';
import { pad } from './utils.js';
import { log, exportLogs } from './logger.js';
import { APP_VERSION, APP_YEAR, APP_AUTHOR } from './version.js';
import { isLoggedIn, isAdmin, getEmail, getRole, login, logout,
         saveThemeRemote, changePassword, adminGetUsers, adminCreateUser, adminDeleteUser, adminResetPassword } from './auth.js';

/* ── Registre central ── */
window.App = {
  showAlert, closeAlert, buildQs, setAns, applyTheme, toggleTheme,
  updateCD, toggleChrono, resumeTme, advPeriod, activerProlong, resetChrono, applyRecal,
  chgScore, buildTme, refreshTme, addTme, deleteTme,
  buildCats, capTime, cancelTime, selectArb, selectColor, selectCat, updCats, saveObs, renderTable, renderEndTable,
  setSynFilter, buildSynTable,
  exportPDF,
  autosave, checkResume, resumeMatch, discardMatch, saveToHistory,
  openHistory, closeHistory, renderHistory, deleteHistory, deleteHistoryRemote, reexportPDF,
  startMatch, endMatch, backMatch, goHome,
  exportLogs, isLoggedIn, isAdmin, getEmail, getRole, logout
};

/* ── Exposition window ── */
window.startMatch          = startMatch;
window.endMatch            = endMatch;
window.backMatch           = backMatch;
window.goHome              = goHome;
window.toggleChrono        = toggleChrono;
window.resumeTme           = resumeTme;
window.applyRecal          = applyRecal;
window.activerProlong      = activerProlong;
window.resetChrono         = resetChrono;
window.chgScore            = chgScore;
window.addTme              = (t, i) => window.App.addTme(t, i);
window.deleteTme           = (t, i) => window.App.deleteTme(t, i);
window.selArb              = selectArb;
window.cancelTime          = cancelTime;
window.selColor            = selectColor;
window.selCat              = selectCat;
window.saveObs             = saveObs;
window.setSynFilter        = setSynFilter;
window.exportPDF           = exportPDF;
window.resumeMatch         = resumeMatch;
window.discardMatch        = discardMatch;
window.openHistory         = openHistory;
window.closeHistory        = closeHistory;
window.deleteHistory       = deleteHistory;
window.deleteHistoryRemote = deleteHistoryRemote;
window.reexportPDF         = reexportPDF;
window.toggleTheme         = toggleTheme;
window.closeAlert          = closeAlert;
window.setAns              = setAns;
window.exportLogs          = exportLogs;
window.submitLogin         = submitLogin;
window.doLogout            = doLogout;
window.openAdmin           = openAdmin;
window.closeAdmin          = closeAdmin;
window.adminSubmitUser     = adminSubmitUser;
window.adminDeleteUser     = adminDeleteUserUI;
window.adminResetPassword  = adminResetPasswordUI;
window.changePasswordUI    = changePasswordUI;

/* ════════════════════════════════════════
   ÉCRAN DE CONNEXION
════════════════════════════════════════ */
async function submitLogin() {
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl    = document.getElementById('authError');
  const btn      = document.getElementById('authSubmit');

  if (!email || !password) { errEl.textContent = 'Remplissez tous les champs.'; return; }

  btn.disabled    = true;
  btn.textContent = 'Connexion...';
  errEl.textContent = '';

  try {
    const result = await login(email, password);

    btn.disabled    = false;
    btn.textContent = 'Se connecter';

    if (!result.ok) {
      errEl.textContent = result.error || 'Identifiants incorrects.';
      log.warn('AUTH', 'login_echec', { error: result.error });
      return;
    }

    log.info('AUTH', 'login_ok', { role: result.role });
    _showApp();
  } catch (e) {
    btn.disabled    = false;
    btn.textContent = 'Se connecter';
    errEl.textContent = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
    log.error('AUTH', 'login_exception', { message: e.message });
  }
}

function doLogout() {
  if (!confirm('Se déconnecter ?')) return;
  logout();
  _showLogin();
}

function _showLogin() {
  document.getElementById('AuthS').style.display = 'flex';
  document.getElementById('SS').style.display    = 'none';
  document.getElementById('MS').style.display    = 'none';
  document.getElementById('ES').style.display    = 'none';
  document.getElementById('HistS').style.display = 'none';
  document.getElementById('AdminS').style.display= 'none';
  document.getElementById('authEmail').value    = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authError').textContent = '';
}

function _showApp() {
  document.getElementById('AuthS').style.display = 'none';
  document.getElementById('SS').style.display    = 'flex';
  _updateUserBadge();
  checkResume();
  const now = new Date();
  document.getElementById('mDate').value = pad(now.getDate()) + '/' + pad(now.getMonth()+1) + '/' + now.getFullYear();
  document.getElementById('mTime').value = pad(now.getHours()) + ':' + pad(now.getMinutes());
}

function _updateUserBadge() {
  const badge      = document.getElementById('userBadge');
  const adminBtn   = document.getElementById('btnAdmin');
  badge.textContent = getEmail() || '';
  if (isAdmin()) {
    adminBtn.style.display = 'inline-block';
  } else {
    adminBtn.style.display = 'none';
  }
}

/* ════════════════════════════════════════
   POLITIQUE DE MOT DE PASSE (centralisée)
════════════════════════════════════════ */
const PWD_RULES = [
  { id: 'len',     test: p => p.length >= 8,        label: '8 caractères minimum' },
  { id: 'upper',   test: p => /[A-Z]/.test(p),      label: 'Au moins une majuscule' },
  { id: 'lower',   test: p => /[a-z]/.test(p),      label: 'Au moins une minuscule' },
  { id: 'digit',   test: p => /[0-9]/.test(p),      label: 'Au moins un chiffre' },
  { id: 'special', test: p => /[^A-Za-z0-9]/.test(p), label: 'Au moins un caractère spécial' }
];

function validatePassword(pwd) {
  return PWD_RULES.every(r => r.test(pwd));
}

function buildPwdChecklist(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = PWD_RULES.map(r =>
    '<div id="pwdrule_' + containerId + '_' + r.id + '" style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-hint);transition:color .2s;">' +
    '<span class="pwd-check-icon" style="font-size:14px;">○</span>' +
    '<span>' + r.label + '</span></div>'
  ).join('');
}

function updatePwdChecklist(containerId, pwd) {
  PWD_RULES.forEach(r => {
    const row = document.getElementById('pwdrule_' + containerId + '_' + r.id);
    if (!row) return;
    const ok   = r.test(pwd);
    const icon = row.querySelector('.pwd-check-icon');
    icon.textContent = ok ? '✓' : '○';
    row.style.color  = ok ? 'var(--green-text)' : 'var(--text-hint)';
    icon.style.fontWeight = ok ? '700' : '400';
  });
}

/* ════════════════════════════════════════
   CHANGEMENT DE MOT DE PASSE UTILISATEUR
════════════════════════════════════════ */
async function changePasswordUI() {
  const overlay = document.getElementById('pwdChangeOverlay');
  overlay.style.display = 'flex';
  document.getElementById('pwdCurrent').value  = '';
  document.getElementById('pwdNew').value      = '';
  document.getElementById('pwdConfirm').value  = '';
  document.getElementById('pwdError').textContent   = '';
  document.getElementById('pwdSuccess').textContent = '';
  buildPwdChecklist('pwdRulesChecklist');
  updatePwdChecklist('pwdRulesChecklist', '');
  document.getElementById('pwdCurrent').focus();
}

window.pwdChangeCancel = function() {
  document.getElementById('pwdChangeOverlay').style.display = 'none';
};

window.pwdNewInput = function() {
  updatePwdChecklist('pwdRulesChecklist', document.getElementById('pwdNew').value);
};

window.pwdChangeSubmit = async function() {
  const current = document.getElementById('pwdCurrent').value;
  const newPwd  = document.getElementById('pwdNew').value;
  const confirmPwd = document.getElementById('pwdConfirm').value;
  const errEl   = document.getElementById('pwdError');
  const succEl  = document.getElementById('pwdSuccess');
  const btn     = document.getElementById('pwdSubmitBtn');

  errEl.textContent  = '';
  succEl.textContent = '';

  if (!current || !newPwd || !confirmPwd) { errEl.textContent = 'Remplissez tous les champs.'; return; }
  if (!validatePassword(newPwd))          { errEl.textContent = 'Le mot de passe ne respecte pas tous les critères.'; return; }
  if (newPwd !== confirmPwd)              { errEl.textContent = 'Les deux mots de passe ne correspondent pas.'; return; }
  if (current === newPwd)                 { errEl.textContent = 'Le nouveau mot de passe doit être différent de l\'actuel.'; return; }

  btn.disabled    = true;
  btn.textContent = 'Modification...';

  const result = await changePassword(current, newPwd);

  btn.disabled    = false;
  btn.textContent = 'Modifier';

  if (!result.ok) {
    errEl.textContent = result.error || 'Erreur lors du changement.';
    return;
  }

  succEl.textContent = 'Mot de passe modifié avec succès.';
  setTimeout(() => {
    document.getElementById('pwdChangeOverlay').style.display = 'none';
  }, 1500);
};

/* ════════════════════════════════════════
   ESPACE ADMIN
════════════════════════════════════════ */
async function openAdmin() {
  document.getElementById('SS').style.display    = 'none';
  document.getElementById('AdminS').style.display = 'flex';
  buildPwdChecklist('adminPwdChecklist');
  updatePwdChecklist('adminPwdChecklist', '');
  await _renderAdminUsers();
}

window.adminPwdInput = function() {
  updatePwdChecklist('adminPwdChecklist', document.getElementById('newUserPassword').value);
};

function closeAdmin() {
  document.getElementById('AdminS').style.display = 'none';
  document.getElementById('SS').style.display     = 'flex';
}

async function _renderAdminUsers() {
  const list   = document.getElementById('adminUserList');
  const errEl  = document.getElementById('adminListError');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-hint);">Chargement...</div>';
  errEl.textContent = '';

  const result = await adminGetUsers();
  if (!result.ok) { errEl.textContent = result.error; list.innerHTML = ''; return; }

  const users = result.users;
  document.getElementById('adminUserCount').textContent = users.length + ' utilisateur(s)';

  list.innerHTML = users.map(u => {
    const lastLogin = u.last_login
      ? new Date(u.last_login).toLocaleDateString('fr-FR') + ' ' +
        new Date(u.last_login).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : 'Jamais';
    const isMe = u.email === getEmail();
    return `
      <div class="admin-user-row">
        <div class="admin-user-info">
          <span class="admin-user-email">${u.email}</span>
          <span class="admin-role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}">${u.role}</span>
          <span class="admin-user-meta">Dernière connexion : ${lastLogin}</span>
        </div>
        <div class="admin-user-actions">
          <button class="btn-act" onclick="adminResetPassword('${u.id}')" title="Réinitialiser le mot de passe">Mot de passe</button>
          ${!isMe ? `<button class="btn-act btn-danger" onclick="adminDeleteUser('${u.id}', '${u.email}')">Supprimer</button>` : '<span style="font-size:11px;color:var(--text-hint);">(vous)</span>'}
        </div>
      </div>`;
  }).join('');
}

async function adminSubmitUser() {
  const email    = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value;
  const role     = document.getElementById('newUserRole').value;
  const errEl    = document.getElementById('adminCreateError');
  const btn      = document.getElementById('adminCreateBtn');

  if (!email || !password) { errEl.textContent = 'Remplissez tous les champs.'; return; }
  if (!validatePassword(password)) { errEl.textContent = 'Le mot de passe ne respecte pas la politique de sécurité.'; return; }

  btn.disabled = true;
  btn.textContent = 'Création...';
  errEl.textContent = '';

  const result = await adminCreateUser(email, password, role);
  btn.disabled = false;
  btn.textContent = 'Créer';

  if (!result.ok) { errEl.textContent = result.error; return; }

  document.getElementById('newUserEmail').value    = '';
  document.getElementById('newUserPassword').value = '';
  errEl.textContent = '';
  await _renderAdminUsers();
}

async function adminDeleteUserUI(id, email) {
  if (!confirm('Supprimer le compte de ' + email + ' ?\nSes matchs seront également supprimés.')) return;
  const result = await adminDeleteUser(id);
  if (!result.ok) { window.App.showAlert('Erreur : ' + result.error); return; }
  await _renderAdminUsers();
}

async function adminResetPasswordUI(id) {
  const pwd = prompt('Nouveau mot de passe pour cet utilisateur :');
  if (!pwd) return;
  if (!validatePassword(pwd)) {
    window.App.showAlert('Le mot de passe ne respecte pas la politique de sécurité :\n• 8 caractères minimum\n• 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial');
    return;
  }
  const result = await adminResetPassword(id, pwd);
  if (!result.ok) { window.App.showAlert('Erreur : ' + result.error); return; }
  window.App.showAlert('Mot de passe réinitialisé avec succès.');
}

/* ── Erreurs globales ── */
window.addEventListener('error', e => {
  log.error('GLOBAL', 'js_erreur_non_geree', { message: e.message, source: e.filename, ligne: e.lineno });
});
window.addEventListener('unhandledrejection', e => {
  log.error('GLOBAL', 'promise_rejetee_non_geree', { message: e.reason?.message || String(e.reason) });
});

/* ── Initialisation ── */
window.addEventListener('load', () => {
  log.info('LIFECYCLE', 'app_initialisee', { version: APP_VERSION });

  document.querySelectorAll('.copyright-bar').forEach(el => {
    const btn = el.querySelector('button');
    el.innerHTML =
      '\u00a9 ' + APP_YEAR + ' <strong>' + APP_AUTHOR + '</strong>' +
      ' \u2014 Tous droits r\u00e9serv\u00e9s \u2014 <span style="opacity:.6;font-size:.9em;">v' + APP_VERSION + '</span>';
    if (btn) el.appendChild(btn);
  });
  document.querySelectorAll('.copyright-bar-inline').forEach(el => {
    el.style.cssText = 'font-size:10px;color:#bbb;text-align:center;padding:4px 0;';
    el.innerHTML =
      '\u00a9 ' + APP_YEAR + ' <strong style="color:#999;">' + APP_AUTHOR + '</strong>' +
      ' \u2014 <span style="opacity:.6;">v' + APP_VERSION + '</span>';
  });

  const saved       = localStorage.getItem('arbitres_hb_theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark      = saved === 'dark' || (!saved && prefersDark);
  applyTheme(isDark, false);
  document.documentElement.classList.remove('dark-init');

  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('arbitres_hb_theme')) applyTheme(e.matches, false);
  });

  document.getElementById('rMin').addEventListener('input', function () {
    if (this.value.length >= 2) document.getElementById('rSec').focus();
  });

  // Si déjà connecté → afficher l'app directement
  if (isLoggedIn()) {
    _showApp();
  } else {
    _showLogin();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => log.info('SW', 'service_worker_enregistre'))
    .catch(e  => log.error('SW', 'service_worker_erreur', { message: e.message }));
}

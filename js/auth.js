/* ═══ AUTH — Authentification backend ═══════════════════════════════════ */
import { log } from './logger.js';

const API       = 'https://109.31.202.140/api';
const KEY_TOKEN = 'arbitres_hb_token';
const KEY_EMAIL = 'arbitres_hb_email';
const KEY_ROLE  = 'arbitres_hb_role';

let _token = localStorage.getItem(KEY_TOKEN) || null;
let _email = localStorage.getItem(KEY_EMAIL) || null;
let _role  = localStorage.getItem(KEY_ROLE)  || null;

export function getToken()   { return _token; }
export function getEmail()   { return _email; }
export function getRole()    { return _role; }
export function isLoggedIn() { return !!_token; }
export function isAdmin()    { return _role === 'admin'; }

async function apiCall(path, method, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;
  const res = await fetch(API + path, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export async function login(email, password) {
  try {
    const data = await apiCall('/auth/login', 'POST', { email, password });
    _token = data.token;
    _email = data.email;
    _role  = data.role;
    localStorage.setItem(KEY_TOKEN, _token);
    localStorage.setItem(KEY_EMAIL, _email);
    localStorage.setItem(KEY_ROLE,  _role);
    log.info('AUTH', 'connexion_ok', { email, role: _role });
    return { ok: true, theme: data.theme, role: data.role };
  } catch (e) {
    log.error('AUTH', 'connexion_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

export function logout() {
  _token = null; _email = null; _role = null;
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_EMAIL);
  localStorage.removeItem(KEY_ROLE);
  log.info('AUTH', 'deconnexion');
}

export async function saveMatchRemote(matchData) {
  if (!_token) return { ok: false, error: 'Non connecté' };
  try {
    const data = await apiCall('/matches', 'POST', matchData);
    log.info('AUTH', 'match_sauvegarde_remote', { id: data.id });
    return { ok: true, id: data.id };
  } catch (e) {
    log.error('AUTH', 'match_sauvegarde_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

export async function fetchMatches() {
  if (!_token) return { ok: false, error: 'Non connecté' };
  try {
    const data = await apiCall('/matches', 'GET');
    return { ok: true, matches: data };
  } catch (e) {
    log.error('AUTH', 'fetch_matches_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

export async function deleteMatchRemote(id) {
  if (!_token) return { ok: false, error: 'Non connecté' };
  try {
    await apiCall('/matches/' + id, 'DELETE');
    log.info('AUTH', 'match_supprime_remote', { id });
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'match_supprime_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

export async function saveThemeRemote(theme) {
  if (!_token) return;
  try { await apiCall('/profile', 'PATCH', { theme }); } catch {}
}

/* ── PROFIL — Changer son propre mot de passe ── */
export async function changePassword(currentPassword, newPassword) {
  try {
    await apiCall('/profile/password', 'PATCH', { currentPassword, newPassword });
    log.info('AUTH', 'password_change_ok');
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'password_change_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

/* ── ADMIN — Lister les utilisateurs ── */
export async function adminGetUsers() {
  try {
    const data = await apiCall('/admin/users', 'GET');
    return { ok: true, users: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/* ── ADMIN — Créer un utilisateur ── */
export async function adminCreateUser(email, password, role) {
  try {
    await apiCall('/admin/users', 'POST', { email, password, role });
    log.info('AUTH', 'admin_user_cree', { email, role });
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'admin_user_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

/* ── ADMIN — Supprimer un utilisateur ── */
export async function adminDeleteUser(id) {
  try {
    await apiCall('/admin/users/' + id, 'DELETE');
    log.info('AUTH', 'admin_user_supprime', { id });
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'admin_delete_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

/* ── ADMIN — Réinitialiser le mot de passe ── */
export async function adminResetPassword(id, password) {
  try {
    await apiCall('/admin/users/' + id + '/password', 'PATCH', { password });
    log.info('AUTH', 'admin_password_reset', { id });
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'admin_password_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

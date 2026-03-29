/* ═══ UTILS — Fonctions utilitaires pures ════════════════════════════════ */

export function pad(n) {
  return String(Math.floor(n)).padStart(2, '0');
}

export function fmt(s) {
  return pad(s / 60) + ':' + pad(s % 60);
}

export function fmtDate(d) {
  if (!d) return '';
  // Format déjà lisible jj/mm/aaaa — retourner tel quel
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
  // Format ISO aaaa-mm-jj → jj/mm/aaaa
  const p = d.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d;
}

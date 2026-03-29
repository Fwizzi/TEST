/* ═══ STATE — État partagé et constantes ══════════════════════════════════
   Toutes les données mutables du match vivent ici.
   Les autres modules importent S et ans par référence : les mutations sont
   donc visibles partout sans réimporter.
════════════════════════════════════════════════════════════════════════════ */

/* ── Catégories d'observations ── */
export const CA = [
  'SPP','SPA','J7M','Protocole','PF','MB',
  'Jeu Passif','Marcher','Pied','Reprise de dribble','Zone','Continuite',
  'Communication'
];
export const CP = ["Placement","Deplacement","Zone d'influence"];
export const CAU = 'Autres';

/* ── Durées (secondes) ── */
export const PL  = 30 * 60;   // mi-temps réglementaire
export const PLR =  5 * 60;   // prolongation

/* ── Questions d'évaluation générale ── */
export const QS = [
  { id: 'esprit',  lbl: "Bon etat d'esprit" },
  { id: 'engage',  lbl: 'Engagement physique acceptable' },
  { id: 'niveau',  lbl: 'Niveaux de jeu equilibres' }
];

/* ── Clés localStorage ── */
export const KEY_CURRENT = 'arbitres_hb_current';
export const KEY_HISTORY = 'arbitres_hb_history';

/* ── Réponses aux questions (mutable) ── */
export const ans = { esprit: null, engage: null, niveau: null };

/* ── Filtres tableau de synthèse (mutable) ── */
export const synFilters = { arb: 'all', per: 'all', typ: 'all', sort: 'weak' };

/* ── État principal du match (mutable) ── */
export const S = {
  tA: 'Equipe A', tB: 'Equipe B',
  a1: 'Arb 1',    a2: 'Arb 2',
  mDate: '', mTime: '', mComp: '',

  run:     false,
  elapsed: 0,
  period:  'MT1',
  timer:   null,
  tick:    null,

  sA: 0, sB: 0,
  htA: null, htB: null,   // score à la mi-temps

  tme: { A: [null, null, null], B: [null, null, null] },

  obs: [],

  selArb: [],    // arbitres sélectionnés dans le formulaire (tableau)
  selCol: null,   // couleur sélectionnée
  selCat: [],     // catégories sélectionnées (tableau)
  fTime:  null,   // temps capturé (freeze)
  fPer:   null,   // période capturée

  pauseTme: false
};

/* ═══ PDF — Export PDF avec chargement lazy de jsPDF ════════════════════ */
import { S, ans, QS } from './state.js';
import { fmt, fmtDate } from './utils.js';
import { log, startTimer, endTimer } from './logger.js';

const JSPDF_URL     = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const AUTOTABLE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    log.info('PDF', 'jspdf_chargement_debut');
    const t = startTimer('jspdf_load');
    const s1 = document.createElement('script');
    s1.src = JSPDF_URL;
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = AUTOTABLE_URL;
      s2.onload = () => { endTimer('PDF', 'jspdf_chargement_ok', t); resolve(); };
      s2.onerror = () => { log.error('PDF', 'autotable_chargement_erreur', { url: AUTOTABLE_URL }); reject(new Error('Impossible de charger jspdf-autotable')); };
      document.head.appendChild(s2);
    };
    s1.onerror = () => { log.error('PDF', 'jspdf_chargement_erreur', { url: JSPDF_URL }); reject(new Error('Impossible de charger jsPDF')); };
    document.head.appendChild(s1);
  });
}

export function exportPDF() {
  const btn = document.getElementById('BExp');
  btn.textContent = 'Chargement...';
  btn.disabled    = true;
  log.info('PDF', 'export_debut', { equipeA: S.tA, equipeB: S.tB, scoreA: S.sA, scoreB: S.sB, nbObs: S.obs.length });
  const t = startTimer('pdf_export');
  loadJsPDF()
    .then(() => {
      _generatePDF();
      endTimer('PDF', 'export_ok', t, { nbObs: S.obs.length });
      window.App.saveToHistory();
    })
    .catch(err => { log.error('PDF', 'export_erreur', { message: err.message }); window.App.showAlert('Erreur PDF : ' + err.message); })
    .finally(() => { btn.textContent = 'Exporter PDF'; btn.disabled = false; });
}

function sanitize(str) {
  return (str || '').trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function buildSynData() {
  const obs  = S.obs;
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
  stats.sort((a, b) => {
    if (a.pct === null && b.pct === null) return a.cat.localeCompare(b.cat);
    if (a.pct === null) return 1;
    if (b.pct === null) return -1;
    return a.pct - b.pct;
  });
  return stats;
}

function checkPage(doc, y, needed, M) {
  if (y + needed > 280) { doc.addPage(); return M; }
  return y;
}

function _generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, M = 14;
  let y = M;

  const NV  = [29, 58, 122];
  const RD  = [226, 75, 74];
  const RDB = [255, 235, 235];
  const GR  = [29, 158, 117];
  const GRB = [230, 250, 244];
  const AMB = [200, 120, 10];
  const GY  = [100, 100, 100];
  const BK  = [30, 30, 30];
  const LG  = [245, 245, 245];
  const DG  = [60, 60, 60];

  /* En-tête */
  doc.setFillColor(...NV);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Suivi Arbitres Handball', M, 11);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  const mp = [];
  if (S.mDate) mp.push(fmtDate(S.mDate));
  if (S.mTime) mp.push(S.mTime);
  if (S.mComp) mp.push(S.mComp);
  doc.text(mp.join(' · '), M, 18);
  doc.text(S.a1 + '  &  ' + S.a2, W - M, 18, { align: 'right' });
  y = 34;

  /* Score */
  doc.setFillColor(...LG); doc.rect(M, y, W - 2 * M, 18, 'F');
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NV);
  doc.text(S.tA + '  ' + S.sA + ' : ' + S.sB + '  ' + S.tB, W / 2, y + 12, { align: 'center' });
  if (S.htA !== null) {
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GY);
    doc.text('Mi-temps : ' + S.htA + ' : ' + S.htB, W / 2, y + 17, { align: 'center' });
  }
  y += 24;

  /* Évaluation générale */
  const yesNo = id => ans[id] === 'oui' ? 'Oui' : ans[id] === 'non' ? 'Non' : '-';
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BK);
  doc.text('Evaluation generale', M, y); y += 5;
  QS.forEach(q => {
    const v = yesNo(q.id);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...DG);
    doc.text(q.lbl + ' : ', M + 2, y);
    doc.setFont('helvetica', 'bold');
    if      (v === 'Oui') doc.setTextColor(...GR);
    else if (v === 'Non') doc.setTextColor(...RD);
    else                  doc.setTextColor(...GY);
    doc.text(v, M + 68, y);
    y += 5;
  });
  y += 3;

  /* Contexte du match */
  const ctx = (document.getElementById('ECtxEdit') || document.getElementById('ctxTA'))?.value?.trim();
  if (ctx) {
    y = checkPage(doc, y, 20, M);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BK);
    doc.text('Contexte du match', M, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...DG);
    const lines = doc.splitTextToSize(ctx, W - 2 * M - 4);
    y = checkPage(doc, y, lines.length * 4.5, M);
    doc.text(lines, M + 2, y);
    y += lines.length * 4.5 + 4;
  }

  /* Synthèse par catégorie */
  const synStats = buildSynData();
  if (synStats.length) {
    y = checkPage(doc, y, 16, M);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BK);
    const totalR = S.obs.filter(o => o.col === 'red').length;
    const totalG = S.obs.filter(o => o.col === 'green').length;
    const totalAll = totalR + totalG;
    const globalPct = totalAll > 0 ? Math.round(totalG / totalAll * 100) : null;
    const scoreStr = globalPct !== null ? '  —  Score global : ' + globalPct + '%' : '';
    doc.text('Synthese par categorie' + scoreStr, M, y); y += 3;
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      headStyles: { fillColor: NV, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: BK },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      head: [['#', 'Categorie', 'Non conf.', 'Conf.', 'Conformite']],
      body: synStats.map((s, i) => [i + 1, s.cat, s.r, s.g, s.pct !== null ? s.pct + '%' : '—']),
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 28, halign: 'center' }
      },
      didParseCell(data) {
        if (data.section !== 'body') return;
        const s = synStats[data.row.index];
        if (!s) return;
        if (data.column.index === 2 && s.r > 0) { data.cell.styles.textColor = RD; data.cell.styles.fontStyle = 'bold'; }
        if (data.column.index === 3 && s.g > 0) { data.cell.styles.textColor = GR; data.cell.styles.fontStyle = 'bold'; }
        if (data.column.index === 4 && s.pct !== null) {
          data.cell.styles.fontStyle = 'bold';
          if      (s.pct >= 70) data.cell.styles.textColor = GR;
          else if (s.pct >= 40) data.cell.styles.textColor = AMB;
          else                  data.cell.styles.textColor = RD;
        }
      }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  /* Observations */
  if (S.obs.length) {
    y = checkPage(doc, y, 16, M);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BK);
    doc.text('Observations (' + S.obs.length + ')', M, y); y += 3;
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      headStyles: { fillColor: NV, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: BK },
      head: [['Heure', 'MT', 'Arbitre', 'Categorie', 'Type', 'Commentaire']],
      body: S.obs.map(o => [o.time, o.period, o.an, o.cat, o.col === 'red' ? 'Non conf.' : 'Conforme', o.cmt]),
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 10 },
        2: { cellWidth: 24 },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
        5: { cellWidth: 'auto' }
      },
      didParseCell(data) {
        if (data.section !== 'body') return;
        const isRed = S.obs[data.row.index]?.col === 'red';
        data.cell.styles.fillColor = isRed ? RDB : GRB;
        if (data.column.index === 4) {
          data.cell.styles.textColor = isRed ? RD : GR;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  /* Commentaire global */
  const gc = document.getElementById('GC')?.value?.trim();
  if (gc) {
    y = checkPage(doc, y, 20, M);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BK);
    doc.text('Commentaire global', M, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...DG);
    const lines = doc.splitTextToSize(gc, W - 2 * M - 4);
    doc.text(lines, M + 2, y);
  }

  /* Pied de page */
  const pg = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pg; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GY);
    doc.text('© Vincent Guerlach — Tous droits réservés', M, 293);
    doc.text(i + '/' + pg, W - M, 293, { align: 'right' });
  }

  /* Nom du fichier : Suivi_[A1]_[A2]_[EqA]_[EqB]_[Date] */
  const datePart = sanitize(S.mDate || new Date().toLocaleDateString('fr-FR'));
  const filename = 'Suivi_' + sanitize(S.a1) + '_' + sanitize(S.a2) +
                   '_' + sanitize(S.tA) + '_' + sanitize(S.tB) +
                   '_' + datePart + '.pdf';
  doc.save(filename);
  log.info('PDF', 'fichier_genere', { filename, pages: pg, nbObs: S.obs.length });
}

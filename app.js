
(function(){
  if(!('serviceWorker' in navigator)) return;
  var swLines = [
    "const C='arbitres-hb-v2';",
    "self.addEventListener('install',function(e){",
    "  self.skipWaiting();",
    "  e.waitUntil(caches.open(C).then(function(cache){",
    "    return cache.addAll([",
    "      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',",
    "      'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'",
    "    ]).catch(function(){});",
    "  }));",
    "});",
    "self.addEventListener('activate',function(e){e.waitUntil(clients.claim());});",
    "self.addEventListener('fetch',function(e){",
    "  if(e.request.url.indexOf('cdnjs.cloudflare.com')>=0){",
    "    e.respondWith(caches.open(C).then(function(cache){",
    "      return cache.match(e.request).then(function(hit){",
    "        return hit||fetch(e.request).then(function(r){cache.put(e.request,r.clone());return r;});",
    "      });",
    "    }));",
    "  }",
    "});"
  ];
  var swCode = swLines.join('\n');
  try{
    var blob = new Blob([swCode], {type:'application/javascript'});
    var url = URL.createObjectURL(blob);
    navigator.serviceWorker.register(url)
      .then(function(r){console.log('[SW] OK');})
      .catch(function(e){console.warn('[SW]',e);});
  }catch(e){console.warn('[SW]',e);}
  // Manifest PWA
  try{
    var manifest = {
      name:'Suivi Arbitres Handball',
      short_name:'Arbitres HB',
      start_url:'./',
      display:'standalone',
      background_color:'#f5f5f0',
      theme_color:'#1D3A7A',
      orientation:'landscape'
    };
    var mb = new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'});
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = URL.createObjectURL(mb);
    document.head.appendChild(link);
  }catch(e){}
})();







const CA=['SPP','SPA','J7M','Protocole','PF','MB','Jeu Passif','Marcher','Pied','Reprise de dribble','Zone','Continuite'];
const CP=['Placement','Deplacement','Zone d\'influence'];
const CAU='Autres';
const PL=30*60,PLR=5*60;
const QS=[{id:'esprit',lbl:'Bon etat d\'esprit'},{id:'engage',lbl:'Engagement physique acceptable'},{id:'niveau',lbl:'Niveaux de jeu equilibres'}];
let ans={esprit:null,engage:null,niveau:null};
let S={
  tA:'Equipe A',tB:'Equipe B',a1:'Arb 1',a2:'Arb 2',
  mDate:'',mTime:'',mComp:'',
  run:false,elapsed:0,period:'MT1',timer:null,tick:null,
  sA:0,sB:0,
  htA:null,htB:null,
  tme:{A:[null,null,null],B:[null,null,null]},
  obs:[],
  selArb:null,selCol:null,selCat:null,
  fTime:null,fPer:null,
  pauseTme:false
};

function pad(n){return String(Math.floor(n)).padStart(2,'0');}
function fmt(s){return pad(s/60)+':'+pad(s%60);}
function fmtDate(d){if(!d)return'';const p=d.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d;}

window.addEventListener('load',()=>{
  // Appliquer le theme sauvegarde au demarrage
  var _saved=localStorage.getItem('arbitres_hb_theme');
  var _dark=_saved==='dark'||((!_saved)&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(_dark,false);
  document.documentElement.classList.remove('dark-init');
  checkResume();
  const now=new Date();
  document.getElementById('mDate').value=now.toISOString().slice(0,10);
  document.getElementById('mTime').value=pad(now.getHours())+':'+pad(now.getMinutes());
  // Auto-avance sur le champ secondes apres 2 chiffres minutes
  document.getElementById('rMin').addEventListener('input',function(){
    if(this.value.length>=2) document.getElementById('rSec').focus();
  });
});

function applyRecal(){
  const m=Math.min(parseInt(document.getElementById('rMin').value)||0,30);
  const s=Math.min(parseInt(document.getElementById('rSec').value)||0,59);
  S.elapsed=m*60+s;
  document.getElementById('rMin').value='';
  document.getElementById('rSec').value='';
  updateCD();
  refreshTme();
}

function startMatch(){
  S.tA=document.getElementById('tA').value||'Equipe A';
  S.tB=document.getElementById('tB').value||'Equipe B';
  S.a1=document.getElementById('a1').value||'Arbitre 1';
  S.a2=document.getElementById('a2').value||'Arbitre 2';
  S.mDate=document.getElementById('mDate').value||'';
  S.mTime=document.getElementById('mTime').value||'';
  S.mComp=document.getElementById('mComp').value||'';
  document.getElementById('sTA').textContent=S.tA;document.getElementById('sTB').textContent=S.tB;
  document.getElementById('thA').textContent=S.tA;document.getElementById('thB').textContent=S.tB;
  document.getElementById('AN1').textContent=S.a1;document.getElementById('AN2').textContent=S.a2;
  document.getElementById('topInfo').innerHTML='<strong>'+S.tA+'</strong> vs <strong>'+S.tB+'</strong> | '+S.a1+' & '+S.a2;
  const mp=[];if(S.mDate)mp.push(fmtDate(S.mDate));if(S.mTime)mp.push(S.mTime);if(S.mComp)mp.push(S.mComp);
  document.getElementById('topMeta').textContent=mp.join(' · ');
  buildCats();buildTme();buildQs();renderTable();
  localStorage.removeItem(KEY_CURRENT);document.getElementById('resumeBanner').classList.remove('on');document.getElementById('SS').style.display='none';document.getElementById('MS').style.display='flex';
}

function buildQs(){
  const c=document.getElementById('QC');c.innerHTML='';
  QS.forEach(q=>{
    const d=document.createElement('div');d.className='q-row';
    d.innerHTML='<div class="q-left"><span class="q-lbl">'+q.lbl+'</span><span class="q-st pend" id="qst_'+q.id+'">-</span></div>'
      +'<div class="yn-btns"><button class="btn-yn" id="qy_'+q.id+'" onclick="setAns(\''+q.id+'\',\'oui\')">Oui</button>'
      +'<button class="btn-yn" id="qn_'+q.id+'" onclick="setAns(\''+q.id+'\',\'non\')">Non</button></div>';
    c.appendChild(d);
  });
}

function setAns(id,val){
  ans[id]=val;
  const by=document.getElementById('qy_'+id),bn=document.getElementById('qn_'+id),st=document.getElementById('qst_'+id);
  by.className='btn-yn'+(val==='oui'?' ysel':'');bn.className='btn-yn'+(val==='non'?' nsel':'');
  const ab=val==='oui'?by:bn;ab.classList.remove('fl');void ab.offsetWidth;ab.classList.add('fl');setTimeout(()=>ab.classList.remove('fl'),300);
  st.innerHTML=val==='oui'?'&#10003; Oui':'&#10007; Non';st.className='q-st '+(val==='oui'?'oui':'non');
}

function buildCats(){
  const w=document.getElementById('CATS');w.innerHTML='';
  const lab=(t)=>{const d=document.createElement('div');d.className='cg-label';d.style.width='100%';d.textContent=t;w.appendChild(d);};
  lab('Decisions techniques');CA.forEach(c=>w.appendChild(makeCat(c,false)));
  lab('Positionnement');CP.forEach(c=>w.appendChild(makeCat(c,false)));
  lab('Autre');w.appendChild(makeCat(CAU,true));
}
function makeCat(c,isA){
  const b=document.createElement('button');b.className=isA?'btn-autres':'btn-cat';
  b.innerHTML=(isA?'+ Autres':c)+'<span class="ck">&#10003;</span>';
  b.onclick=()=>selCat(c);b.id='C_'+c.replace(/[\s']/g,'_');return b;
}

// ── TME LIBRE ────────────────────────────────────────────────────────────────
// Aucune regle : chaque case est independante et cliquable librement
function tmeState(team,idx){
  const v=S.tme[team][idx];
  if(v&&v!=='X') return 'filled';
  return 'free';
}


function deleteTme(team, idx){
  var v = S.tme[team][idx];
  if(!v || v==='X') return;
  if(!confirm('Supprimer le temps mort de ' + (team==='A'?S.tA:S.tB) + ' (' + v + ') ?')) return;
  S.tme[team][idx] = null;
  refreshTme();
  autosave();
}

function refreshTme(){
  ['A','B'].forEach(function(team){
    for(var i=0;i<3;i++){
      (function(t,idx){
        var cell=document.getElementById('c'+t+idx);if(!cell)return;
        var v=S.tme[t][idx];
        if(v&&v!=='X'){
          // Cellule remplie : supprimer le onclick addTme, afficher heure + bouton X
          cell.className='tme-cell tme-ok';
          cell.removeAttribute('onclick');
          cell.innerHTML='<span style="font-size:12px;font-weight:700;">'+v+'</span>'
            +'<button class="tme-del-btn" onclick="event.stopPropagation();deleteTme(&apos;'+t+'&apos;,'+idx+')" title="Supprimer ce TME">&#10005;</button>';
        } else {
          var st=tmeState(t,idx);
          if(st==='free'){cell.textContent='+';cell.className='tme-cell';cell.onclick=function(){addTme(t,idx);};}
          else if(st==='red'){cell.textContent='Bloque';cell.className='tme-cell tme-red';}
          else{cell.textContent='-';cell.className='tme-cell tme-gray';}
        }
      })(team,i);
    }
  });
}

function buildTme(){
  const tb=document.getElementById('tmeBody');tb.innerHTML='';
  for(let i=0;i<3;i++){
    const tr=document.createElement('tr');
    tr.innerHTML='<td style="font-size:12px;color:#888;text-align:center;">'+(i+1)+'</td>'
      +'<td><div class="tme-cell" id="cA'+i+'" onclick="addTme(\'A\','+i+')">+</div></td>'
      +'<td><div class="tme-cell" id="cB'+i+'" onclick="addTme(\'B\','+i+')">+</div></td>';
    tb.appendChild(tr);
  }refreshTme();
}

function addTme(team,idx){
  const st=tmeState(team,idx);
  if(st==='filled') return;
  if(st==='red'){showAlert('Impossible : cet equipe a deja pris un TME en 2e MT, les TME sont bloques apres 25:00.');return;}
  if(st==='gray') return;
  if(S.run){clearInterval(S.timer);S.run=false;S.pauseTme=true;document.getElementById('BSS').textContent='Reprendre';document.getElementById('BSS').className='bc go';document.getElementById('tmeP').classList.add('on');}
  S.tme[team][idx]=fmt(S.elapsed);
  refreshTme();autosave();
}



function resumeTme(){document.getElementById('tmeP').classList.remove('on');S.pauseTme=false;S.tick=Date.now();S.timer=setInterval(tickC,200);S.run=true;document.getElementById('BSS').textContent='Pause';document.getElementById('BSS').className='bc stop';}

function toggleChrono(){
  if(S.run){
    clearInterval(S.timer);S.run=false;S.pauseTme=false;
    document.getElementById('tmeP').classList.remove('on');
    document.getElementById('BSS').textContent='Reprendre';
    document.getElementById('BSS').className='bc go';
  } else {
    // Capturer le score de mi-temps au 1er demarrage du chrono MT2
    if(S.period==='MT2' && S.htA===null){
      S.htA=S.sA;
      S.htB=S.sB;
      autosave();
    }
    S.tick=Date.now();S.timer=setInterval(tickC,200);S.run=true;S.pauseTme=false;
    document.getElementById('tmeP').classList.remove('on');
    document.getElementById('BSS').textContent='Pause';
    document.getElementById('BSS').className='bc stop';
  }
}

function tickC(){
  const now=Date.now(),d=(now-S.tick)/1000;S.tick=now;S.elapsed+=d;
  const lim=(S.period==='Prol.1'||S.period==='Prol.2')?PLR:PL;
  if(S.elapsed>=lim){S.elapsed=lim;clearInterval(S.timer);S.run=false;document.getElementById('BSS').textContent='Demarrer';document.getElementById('BSS').className='bc go';advPeriod();}
  if(S.period==='MT2') refreshTme();
  updateCD();
}

function advPeriod(){
  if(S.period==='MT1'){S.period='MT2';S.elapsed=0;document.getElementById('PBadge').textContent='MT2';document.getElementById('PBadge').className='period-badge p-mt2';showAlert('Mi-temps ! Debut de la 2eme periode.');}
  else if(S.period==='MT2'){document.getElementById('PB').classList.add('on');showAlert('Fin du temps reglementaire.');}
  else if(S.period==='Prol.1'){S.period='Prol.2';S.elapsed=0;document.getElementById('PBadge').textContent='Prol.2';showAlert('Prolongation 2 !');}
  else{showAlert('Fin du match !');}
  updateCD();refreshTme();
}

function activerProlong(){S.period='Prol.1';S.elapsed=0;document.getElementById('PBadge').textContent='Prol.1';document.getElementById('PBadge').className='period-badge p-prol';document.getElementById('PB').classList.remove('on');showAlert('Prolongation 1 activee (5 min) !');updateCD();}
function resetChrono(){clearInterval(S.timer);S.run=false;S.elapsed=0;S.pauseTme=false;document.getElementById('tmeP').classList.remove('on');document.getElementById('BSS').textContent='Demarrer';document.getElementById('BSS').className='bc go';updateCD();}
function updateCD(){document.getElementById('CD').textContent=fmt(S.elapsed);}
function chgScore(t,d){if(t==='A')S.sA=Math.max(0,S.sA+d);else S.sB=Math.max(0,S.sB+d);document.getElementById('sA').textContent=S.sA;document.getElementById('sB').textContent=S.sB;autosave();}

function capTime(){
  if(S.fTime===null){S.fTime=S.elapsed;S.fPer=S.period;document.getElementById('FV').textContent=fmt(S.fTime);document.getElementById('FP').textContent=S.fPer;document.getElementById('FB').classList.add('on');}
}
function cancelTime(){
  S.fTime=null;S.fPer=null;S.selArb=null;S.selCol=null;S.selCat=null;
  document.getElementById('FB').classList.remove('on');
  document.getElementById('BA1').className='btn-arb';document.getElementById('BA2').className='btn-arb';
  document.getElementById('BRed').className='btn-col';document.getElementById('BGreen').className='btn-col';
  document.getElementById('AW').classList.remove('on');document.getElementById('AI').value='';
  document.getElementById('CI').value='';updCats();
}
function selArb(a){capTime();S.selArb=a;document.getElementById('BA1').className='btn-arb'+(a==='A1'?' a1sel':'');document.getElementById('BA2').className='btn-arb'+(a==='A2'?' a2sel':'');}
function selColor(c){capTime();S.selCol=c;document.getElementById('BRed').className='btn-col'+(c==='red'?' rsel':'');document.getElementById('BGreen').className='btn-col'+(c==='green'?' gsel':'');if(S.selCat)updCats();}
function selCat(c){capTime();S.selCat=c;const aw=document.getElementById('AW');if(c===CAU){aw.classList.add('on');document.getElementById('AI').focus();}else{aw.classList.remove('on');document.getElementById('AI').value='';}updCats();}
function updCats(){[...CA,...CP,CAU].forEach(c=>{const b=document.getElementById('C_'+c.replace(/[\s']/g,'_'));if(!b)return;const isA=(c===CAU),base=isA?'btn-autres':'btn-cat';b.className=c===S.selCat?base+' '+(S.selCol==='red'?'cr':'cg'):base;});}

function saveObs(){
  const cmt=document.getElementById('CI').value.trim();
  if(!S.selArb){showAlert('Selectionnez un arbitre.');return;}
  if(!S.selCol){showAlert('Selectionnez une couleur.');return;}
  if(!S.selCat){showAlert('Selectionnez une categorie.');return;}
  let cat=S.selCat;
  if(S.selCat===CAU){const av=document.getElementById('AI').value.trim();if(!av){showAlert('Precisez l\'action.');return;}cat='Autres : '+av;}
  if(!cmt){showAlert('Le commentaire est obligatoire.');return;}
  const t=S.fTime!==null?S.fTime:S.elapsed,p=S.fPer||S.period;
  const an=S.selArb==='A1'?S.a1:S.a2;
  S.obs.push({time:fmt(t),el:t,period:p,arb:S.selArb,an,cat,col:S.selCol,cmt});
  cancelTime();renderTable();autosave();
}

// ── TABLEAU : derniere action en haut par defaut ──────────────────────────────
function sorted(by){
  const o=[...S.obs];
  if(by==='cat') o.sort((a,b)=>a.cat.localeCompare(b.cat));
  else if(by==='arb') o.sort((a,b)=>a.arb.localeCompare(b.arb));
  else if(by==='col') o.sort((a,b)=>a.col.localeCompare(b.col));
  else if(by==='time_asc') o.sort((a,b)=>a.el-b.el);
  else o.sort((a,b)=>b.el-a.el); // time_desc = defaut
  return o;
}

function oRow(o){
  const rc=o.col==='red'?'rr':'rg',tl=o.col==='red'?'Non conf./manquante':'Conforme';
  return'<tr class="'+rc+'"><td style="white-space:nowrap;font-variant-numeric:tabular-nums;">'+o.time+'</td>'
    +'<td style="white-space:nowrap;">'+o.period+'</td>'
    +'<td><span class="badge ba">'+o.an+'</span></td>'
    +'<td style="font-weight:700;white-space:nowrap;">'+o.cat+'</td>'
    +'<td><span class="lc">'+tl+'</span></td>'
    +'<td>'+o.cmt+'</td></tr>';
}

function renderTable(){
  const o=sorted(document.getElementById('sortSel').value);
  document.getElementById('OTB').innerHTML=o.length?o.map(oRow).join(''):'<tr><td colspan="6" class="empty">Aucune observation</td></tr>';
  document.getElementById('OC').textContent=o.length+' obs.';
}
function renderEndTable(){
  document.getElementById('EETB').innerHTML=sorted(document.getElementById('sortSelE').value).map(oRow).join('');
}

// ── TABLEAU SYNTHESE UNIFIE ──────────────────────────────────────────────────
// ── Etat des filtres synthese ─────────────────────────────────────────────
var synFilters = {arb:'all', per:'all', typ:'all', sort:'weak'};

function setSynFilter(key, val){
  synFilters[key] = val;
  // Mettre a jour les boutons actifs
  var groups = {arb:['all','A1','A2'], per:['all','MT1','MT2'], typ:['all','red','green'], sort:['weak','strong','alpha']};
  groups[key].forEach(function(v){
    var btn = document.getElementById('sfArb-'+v) ||
              document.getElementById('sf'+key.charAt(0).toUpperCase()+key.slice(1)+'-'+v) ||
              document.getElementById('sf'+capitalize(key)+'-'+v);
    // Chercher par ID generique
  });
  // Approche simple : parcourir tous les .syn-fb
  document.querySelectorAll('.syn-fb').forEach(function(btn){
    var id = btn.id;
    if(!id) return;
    var parts = id.replace('sf','').split('-');
    if(parts.length < 2) return;
    var fKey = parts[0].toLowerCase();
    var fVal = parts.slice(1).join('-');
    var keyMap = {arb:'arb', per:'per', typ:'typ', sort:'sort'};
    var mappedKey = null;
    if(fKey==='arb') mappedKey='arb';
    else if(fKey==='per') mappedKey='per';
    else if(fKey==='typ') mappedKey='typ';
    else if(fKey==='sort') mappedKey='sort';
    if(mappedKey && synFilters[mappedKey]===fVal) btn.classList.add('active');
    else if(mappedKey) btn.classList.remove('active');
  });
  buildSynTable();
}

function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

function buildSynTable(){
  // Mettre a jour les labels des boutons arbitres avec les vrais noms
  var btnA1 = document.getElementById('sfArb-A1');
  var btnA2 = document.getElementById('sfArb-A2');
  if(btnA1 && !btnA1.dataset.labeled){ btnA1.textContent = S.a1; btnA1.dataset.labeled='1'; }
  if(btnA2 && !btnA2.dataset.labeled){ btnA2.textContent = S.a2; btnA2.dataset.labeled='1'; }

  // Filtrer les observations selon les filtres actifs
  var obs = S.obs.filter(function(o){
    if(synFilters.arb !== 'all' && o.arb !== synFilters.arb) return false;
    if(synFilters.per !== 'all' && o.period !== synFilters.per) return false;
    if(synFilters.typ !== 'all' && o.col !== synFilters.typ) return false;
    return true;
  });

  var el = document.getElementById('synTable');
  if(!obs.length){
    el.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-hint);padding:1.5rem;">Aucune observation pour ces filtres</td></tr>';
    document.getElementById('synScore').style.display = 'none';
    return;
  }

  // Calculer les stats par categorie
  var cats = [...new Set(obs.map(function(o){return o.cat;}))];
  var stats = cats.map(function(c){
    var catObs = obs.filter(function(o){return o.cat===c;});
    var r = catObs.filter(function(o){return o.col==='red';}).length;
    var g = catObs.filter(function(o){return o.col==='green';}).length;
    var total = r + g;
    var pct = total > 0 ? Math.round(g / total * 100) : null;
    return {cat:c, r:r, g:g, total:total, pct:pct};
  });

  // Trier selon le filtre actif
  if(synFilters.sort === 'weak'){
    // Points faibles = plus fort taux de non-conformité (pct bas)
    stats.sort(function(a,b){
      if(a.pct===null && b.pct===null) return a.cat.localeCompare(b.cat);
      if(a.pct===null) return 1;
      if(b.pct===null) return -1;
      return a.pct - b.pct;
    });
  } else if(synFilters.sort === 'strong'){
    // Points forts = plus fort taux de conformité (pct haut)
    stats.sort(function(a,b){
      if(a.pct===null && b.pct===null) return a.cat.localeCompare(b.cat);
      if(a.pct===null) return 1;
      if(b.pct===null) return -1;
      return b.pct - a.pct;
    });
  } else {
    stats.sort(function(a,b){ return a.cat.localeCompare(b.cat); });
  }

  // Score global du binome
  var totalR = obs.filter(function(o){return o.col==='red';}).length;
  var totalG = obs.filter(function(o){return o.col==='green';}).length;
  var totalAll = totalR + totalG;
  var globalPct = totalAll > 0 ? Math.round(totalG / totalAll * 100) : null;
  var scoreEl = document.getElementById('synScore');
  if(globalPct !== null){
    scoreEl.textContent = 'Score global : ' + globalPct + '%';
    scoreEl.className = globalPct >= 70 ? 'score-good' : globalPct >= 40 ? 'score-mid' : 'score-bad';
    scoreEl.style.display = 'block';
  } else {
    scoreEl.style.display = 'none';
  }

  // Construire le tableau
  // En-tête selon le filtre type
  var showR = (synFilters.typ === 'all' || synFilters.typ === 'red');
  var showG = (synFilters.typ === 'all' || synFilters.typ === 'green');
  var showPct = (synFilters.typ === 'all'); // taux seulement si on voit les deux

  var html = '<thead><tr>'
    + '<th style="width:18px;text-align:center;">#</th>'
    + '<th class="cat-h">Categorie</th>'
    + (showR ? '<th style="color:var(--red-text);">Non conf.</th>' : '')
    + (showG ? '<th style="color:var(--green-text);">Conf.</th>' : '')
    + (showPct ? '<th>Conformite</th>' : '')
    + '</tr></thead><tbody>';

  stats.forEach(function(s, i){
    var rankColor = i === 0 && synFilters.sort !== 'alpha'
      ? (synFilters.sort === 'weak' ? 'background:var(--red-bg);color:var(--red-text);' : 'background:var(--green-bg);color:var(--green-text);')
      : '';

    var barHtml = '';
    if(showPct && s.pct !== null){
      var barColor = s.pct >= 70 ? 'var(--green-text)' : s.pct >= 40 ? 'var(--amber-text)' : 'var(--red-text)';
      barHtml = '<td>'
        + '<div class="conf-bar-wrap">'
        + '<div class="conf-bar"><div class="conf-bar-fill" style="width:'+s.pct+'%;background:'+barColor+';"></div></div>'
        + '<span class="conf-pct" style="color:'+barColor+';">'+s.pct+'%</span>'
        + '</div></td>';
    } else if(showPct) {
      barHtml = '<td style="color:var(--text-hint);font-size:11px;">—</td>';
    }

    html += '<tr>'
      + '<td style="text-align:center;"><span class="rank-badge" style="'+rankColor+'">'+(i+1)+'</span></td>'
      + '<td class="cat-cell">'+s.cat+'</td>'
      + (showR ? '<td class="'+(s.r>0?'nr':'')+'">'+s.r+'</td>' : '')
      + (showG ? '<td class="'+(s.g>0?'ng':'')+'">'+s.g+'</td>' : '')
      + barHtml
      + '</tr>';
  });
  html += '</tbody>';
  el.innerHTML = html;
}

function tmeVal(t,i){const v=S.tme[t][i];return(v&&v!=='X')?v:'-';}

function endMatch(){
  clearInterval(S.timer);S.run=false;
  const mp=[];if(S.mDate)mp.push(fmtDate(S.mDate));if(S.mTime)mp.push(S.mTime);if(S.mComp)mp.push(S.mComp);
  document.getElementById('ET').textContent=S.tA+' vs '+S.tB;
  document.getElementById('EM').textContent=mp.join(' · ')+(mp.length?' — ':'')+S.a1+' & '+S.a2;
  document.getElementById('ESc').textContent=S.sA+' : '+S.sB;
  var htEl=document.getElementById('EHtScore');
  if(S.htA!==null){
    htEl.textContent='MT  '+S.htA+' : '+S.htB;
    htEl.style.display='block';
  } else {
    htEl.style.display='none';
  }

  // Synchroniser le contexte vers l'ecran de fin (textarea editable)
  const ctxVal=document.getElementById('ctxTA').value.trim();
  const eCtxEdit=document.getElementById('ECtxEdit');
  if(eCtxEdit) eCtxEdit.value=ctxVal;
  buildSynTable();
  renderEndTable();
  document.getElementById('MS').style.display='none';document.getElementById('ES').style.display='flex';
}
function backMatch(){
  // Repercuter les modifications du contexte vers l'ecran match
  var eCtxEdit=document.getElementById('ECtxEdit');
  var ctxTA=document.getElementById('ctxTA');
  if(eCtxEdit && ctxTA) ctxTA.value=eCtxEdit.value;
  document.getElementById('ES').style.display='none';
  document.getElementById('MS').style.display='flex';
}

// ── EXPORT PDF ────────────────────────────────────────────────────────────────
function exportPDF(){
  const btn=document.getElementById('BExp');btn.textContent='Generation...';btn.disabled=true;
  setTimeout(()=>{
    try{
      const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
      const W=210,M=14;let y=M;
      const NV=[29,58,122],RD=[226,75,74],GR=[29,158,117],GY=[100,100,100],BK=[30,30,30],LG=[245,245,245],DG=[60,60,60];
      doc.setFillColor(...NV);doc.rect(0,0,W,26,'F');
      doc.setTextColor(255,255,255);doc.setFontSize(14);doc.setFont('helvetica','bold');doc.text('Rapport de suivi arbitres - Handball',M,8);
      doc.setFontSize(9);doc.setFont('helvetica','normal');
      const mp=[];if(S.mDate)mp.push(fmtDate(S.mDate));if(S.mTime)mp.push(S.mTime);if(S.mComp)mp.push(S.mComp);
      if(mp.length)doc.text(mp.join(' | '),W-M,8,{align:'right'});
      doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text(S.tA+' vs '+S.tB,M,16);
      doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('A1: '+S.a1+' | A2: '+S.a2,W-M,16,{align:'right'});
      doc.setFontSize(7);doc.text('(c) Vincent Guerlach - Tous droits reserves',M,23);
      y=32;
      // Score (pleine largeur) + score MT
      var boxH = S.htA!==null ? 30 : 24;
      doc.setFillColor(...LG);doc.roundedRect(M,y,W-M*2,boxH,2,2,'F');
      doc.setTextColor(...GY);doc.setFontSize(8);doc.setFont('helvetica','normal');
      doc.text('SCORE FINAL',W/2,y+5,{align:'center'});
      if(S.htA!==null){
        doc.setFontSize(9);doc.setFont('helvetica','normal');
        doc.setTextColor(150,150,150);
        doc.text('MT  '+S.htA+' : '+S.htB,W/2,y+12,{align:'center'});
        doc.setTextColor(...BK);doc.setFontSize(22);doc.setFont('helvetica','bold');
        doc.text(S.sA+' : '+S.sB,W/2,y+23,{align:'center'});
      } else {
        doc.setTextColor(...BK);doc.setFontSize(22);doc.setFont('helvetica','bold');
        doc.text(S.sA+' : '+S.sB,W/2,y+17,{align:'center'});
      }
      y+=boxH+6;
      // Contexte du match (toujours affiche)
      const ctx=(document.getElementById('ECtxEdit')?document.getElementById('ECtxEdit').value.trim():document.getElementById('ctxTA').value.trim())||'Non renseigne';
      doc.setFillColor(...DG);doc.rect(M,y,W-M*2,6,'F');
      doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont('helvetica','bold');
      doc.text('CONTEXTE DU MATCH',M+2,y+4);y+=8;
      doc.setTextColor(...BK);doc.setFontSize(9);doc.setFont('helvetica','normal');
      const cl=doc.splitTextToSize(ctx,W-M*2-4);
      doc.text(cl,M+2,y);y+=cl.length*4.5+6;
      // Evaluation
      doc.setFillColor(...DG);doc.rect(M,y,W-M*2,6,'F');doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('EVALUATION GENERALE DU MATCH',M+2,y+4);y+=8;
      QS.forEach(q=>{const a=ans[q.id],al=a==='oui'?'OUI':a==='non'?'NON':'Non repondu';doc.setTextColor(...BK);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text(q.lbl,M+2,y+3);if(a==='oui')doc.setTextColor(...GR);else if(a==='non')doc.setTextColor(...RD);else doc.setTextColor(...GY);doc.setFont('helvetica','bold');doc.text(al,W-M-2,y+3,{align:'right'});doc.setDrawColor(220,220,220);doc.line(M,y+5,W-M,y+5);y+=7;});y+=4;
      // Synthese unifiee
      const allCats=[...new Set(S.obs.map(o=>o.cat))].sort();
      if(allCats.length){
        doc.setFillColor(...DG);doc.rect(M,y,W-M*2,6,'F');doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('SYNTHESE PAR CATEGORIE',M+2,y+4);y+=8;
        const obs1=S.obs.filter(o=>o.arb==='A1'),obs2=S.obs.filter(o=>o.arb==='A2');
        const rows=allCats.map(c=>{const r1=obs1.filter(o=>o.cat===c&&o.col==='red').length,g1=obs1.filter(o=>o.cat===c&&o.col==='green').length,r2=obs2.filter(o=>o.cat===c&&o.col==='red').length,g2=obs2.filter(o=>o.cat===c&&o.col==='green').length;return[c,String(r1),String(g1),String(r2),String(g2)];});
        doc.autoTable({startY:y,head:[[{content:'Categorie'},{content:S.a1,colSpan:2},{content:S.a2,colSpan:2}],[' ','Non conf.','Conf.','Non conf.','Conf.']],body:rows,margin:{left:M,right:M},styles:{fontSize:8,cellPadding:2,halign:'center'},headStyles:{fillColor:NV,textColor:[255,255,255],fontStyle:'bold',fontSize:8},columnStyles:{0:{halign:'left',cellWidth:60},1:{cellWidth:26,textColor:[162,45,45],fontStyle:'bold'},2:{cellWidth:26,textColor:[39,120,50],fontStyle:'bold'},3:{cellWidth:26,textColor:[162,45,45],fontStyle:'bold'},4:{cellWidth:26,textColor:[39,120,50],fontStyle:'bold'}},theme:'striped',alternateRowStyles:{fillColor:[250,250,250]}});
        y=doc.lastAutoTable.finalY+6;
      }
      // Observations — triees chronologiquement dans le PDF (plus ancien en haut)
      if(S.obs.length){
        if(y>220){doc.addPage();y=M;}
        doc.setFillColor(...DG);doc.rect(M,y,W-M*2,6,'F');doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('DETAIL DES OBSERVATIONS ('+S.obs.length+')',M+2,y+4);y+=8;
        const obsRows=[...S.obs].sort((a,b)=>a.el-b.el).map(o=>[o.time,o.period,o.an,o.cat,o.col==='red'?'Non conf.':'Conforme',o.cmt]);
        doc.autoTable({startY:y,head:[['Heure','MT','Arbitre','Categorie','Type','Commentaire']],body:obsRows,margin:{left:M,right:M},styles:{fontSize:7.5,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:DG,textColor:[255,255,255],fontStyle:'bold',fontSize:7.5},columnStyles:{0:{cellWidth:16,halign:'center'},1:{cellWidth:12,halign:'center'},2:{cellWidth:22},3:{cellWidth:28},4:{cellWidth:20,halign:'center'},5:{cellWidth:'auto'}},didParseCell:(d)=>{if(d.section==='body'){const c=obsRows[d.row.index]?.[4];if(c==='Non conf.'){d.cell.styles.fillColor=[252,235,235];d.cell.styles.textColor=[121,31,31];}else{d.cell.styles.fillColor=[234,243,222];d.cell.styles.textColor=[39,80,10];}}},theme:'plain'});
        y=doc.lastAutoTable.finalY+8;
      }
      const gc=document.getElementById('GC').value.trim();
      if(gc){if(y>250){doc.addPage();y=M;}doc.setFillColor(...DG);doc.rect(M,y,W-M*2,6,'F');doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('COMMENTAIRE GLOBAL',M+2,y+4);y+=8;doc.setTextColor(...BK);doc.setFontSize(9);doc.setFont('helvetica','normal');const gl=doc.splitTextToSize(gc,W-M*2-4);doc.text(gl,M+2,y);}
      const pc=doc.internal.getNumberOfPages();
      for(let i=1;i<=pc;i++){doc.setPage(i);doc.setFontSize(7);doc.setTextColor(...GY);doc.text('(c) Vincent Guerlach - Tous droits reserves  |  '+S.tA+' vs '+S.tB+(S.mDate?' - '+fmtDate(S.mDate):''),M,295);doc.text('Page '+i+'/'+pc,W-M,295,{align:'right'});}
      const fn='Rapport_'+S.tA.replace(/\s/g,'_')+'_vs_'+S.tB.replace(/\s/g,'_')+(S.mDate?'_'+S.mDate:'')+'.pdf';
      saveToHistory();doc.save(fn);
    }catch(e){showAlert('Erreur PDF : '+e.message);console.error(e);}
    btn.textContent='Exporter PDF';btn.disabled=false;
  },100);
}

function goHome(){
  if(S.run||S.obs.length>0||S.sA>0||S.sB>0||S.htA!==null){
    if(!confirm('Retourner a l\'accueil ? Le suivi en cours sera perdu.')) return;
  }
  // Arreter le chrono
  clearInterval(S.timer);

  // Reinitialiser TOUT l'etat du match
  S.tA='Equipe A';S.tB='Equipe B';S.a1='Arb 1';S.a2='Arb 2';
  S.mDate='';S.mTime='';S.mComp='';
  S.run=false;S.elapsed=0;S.period='MT1';S.timer=null;S.tick=null;
  S.sA=0;S.sB=0;
  S.htA=null;S.htB=null;
  S.tme={A:[null,null,null],B:[null,null,null]};
  S.obs=[];
  S.selArb=null;S.selCol=null;S.selCat=null;
  S.fTime=null;S.fPer=null;
  S.pauseTme=false;
  ans.esprit=null;ans.engage=null;ans.niveau=null;

  // Reinitialiser l'affichage visuel de la feuille 2
  document.getElementById('CD').textContent='00:00';
  document.getElementById('BSS').textContent='Demarrer';
  document.getElementById('BSS').className='bc go';
  document.getElementById('PBadge').textContent='MT1';
  document.getElementById('PBadge').className='period-badge p-mt1';
  document.getElementById('sA').textContent='0';
  document.getElementById('sB').textContent='0';
  document.getElementById('tmeP').classList.remove('on');
  document.getElementById('PB').classList.remove('on');
  document.getElementById('ctxTA').value='';

  // Reinitialiser le formulaire d'observation
  cancelTime();

  // Reinitialiser les filtres synthese
  synFilters={arb:'all',per:'all',typ:'all',sort:'weak'};

  // Purger la sauvegarde locale
  localStorage.removeItem(KEY_CURRENT);
  document.getElementById('resumeBanner').classList.remove('on');

  // Remettre les roues de recalage a zero
  var rm=document.getElementById('rMin');var rs=document.getElementById('rSec');
  if(rm)rm.value='';if(rs)rs.value='';

  // Reconstruire le TME et le tableau vierges
  buildTme();
  renderTable();

  // Masquer les ecrans match et fin, afficher l'accueil
  document.getElementById('MS').style.display='none';
  document.getElementById('ES').style.display='none';
  document.getElementById('SS').style.display='flex';

  // Mettre a jour date/heure avec l'heure actuelle
  var now=new Date();
  document.getElementById('mDate').value=now.toISOString().slice(0,10);
  document.getElementById('mTime').value=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  document.getElementById('mComp').value='';
  document.getElementById('tA').value='';
  document.getElementById('tB').value='';
  document.getElementById('a1').value='';
  document.getElementById('a2').value='';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTANCE & HISTORIQUE
// ═══════════════════════════════════════════════════════════════════════════════
const KEY_CURRENT = 'arbitres_hb_current';
const KEY_HISTORY = 'arbitres_hb_history';

// ── Sauvegarde automatique ────────────────────────────────────────────────────
function autosave(){
  try{
    const snapshot = {
      S: JSON.parse(JSON.stringify(S)),
      ans: JSON.parse(JSON.stringify(ans)),
      ctx: document.getElementById('ctxTA') ? document.getElementById('ctxTA').value : '',
      savedAt: Date.now(),
      period: S.period
    };
    localStorage.setItem(KEY_CURRENT, JSON.stringify(snapshot));
  }catch(e){ console.warn('[autosave]', e); }
}

// ── Vérifier au démarrage si un match en cours existe ─────────────────────────
function checkResume(){
  try{
    const raw = localStorage.getItem(KEY_CURRENT);
    if(!raw) return;
    const snap = JSON.parse(raw);
    if(!snap || !snap.S) return;
    const s = snap.S;
    // Afficher la bannière de reprise
    const d = new Date(snap.savedAt);
    const dateStr = d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
    const title = (s.tA||'?') + ' vs ' + (s.tB||'?');
    document.getElementById('resumeTitle').textContent = title;
    document.getElementById('resumeDesc').textContent = 'Interrompu le ' + dateStr + ' — ' + (s.obs||[]).length + ' observation(s), ' + s.period;
    document.getElementById('resumeBanner').classList.add('on');
  }catch(e){ console.warn('[checkResume]', e); }
}

// ── Reprendre le match interrompu ─────────────────────────────────────────────
function resumeMatch(){
  try{
    const raw = localStorage.getItem(KEY_CURRENT);
    if(!raw) return;
    const snap = JSON.parse(raw);
    const saved = snap.S;

    // Restaurer l'état
    Object.keys(saved).forEach(k => { S[k] = saved[k]; });
    Object.keys(snap.ans).forEach(k => { ans[k] = snap.ans[k]; });

    // Restaurer l'interface
    document.getElementById('sTA').textContent = S.tA;
    document.getElementById('sTB').textContent = S.tB;
    document.getElementById('thA').textContent = S.tA;
    document.getElementById('thB').textContent = S.tB;
    document.getElementById('AN1').textContent = S.a1;
    document.getElementById('AN2').textContent = S.a2;
    document.getElementById('topInfo').innerHTML = '<strong>'+S.tA+'</strong> vs <strong>'+S.tB+'</strong> | '+S.a1+' & '+S.a2;
    const mp=[];
    if(S.mDate)mp.push(fmtDate(S.mDate));
    if(S.mTime)mp.push(S.mTime);
    if(S.mComp)mp.push(S.mComp);
    document.getElementById('topMeta').textContent = mp.join(' · ');

    // Restaurer le badge période
    const pb = document.getElementById('PBadge');
    pb.textContent = S.period;
    if(S.period==='MT1') pb.className='period-badge p-mt1';
    else if(S.period==='MT2') pb.className='period-badge p-mt2';
    else pb.className='period-badge p-prol';

    // Chrono en pause à la valeur sauvegardée
    S.run = false;
    document.getElementById('BSS').textContent = 'Reprendre';
    document.getElementById('BSS').className = 'bc go';
    updateCD();

    // Score
    document.getElementById('sA').textContent = S.sA;
    document.getElementById('sB').textContent = S.sB;

    // Contexte
    if(snap.ctx) document.getElementById('ctxTA').value = snap.ctx;

    // TME
    buildTme();

    // Questions
    buildQs();
    Object.keys(ans).forEach(id => {
      if(ans[id]) setAns(id, ans[id]);
    });

    // Tableau observations
    buildCats();
    renderTable();

    document.getElementById('resumeBanner').classList.remove('on');
    document.getElementById('SS').style.display = 'none';
    document.getElementById('MS').style.display = 'flex';
  }catch(e){
    showAlert('Erreur lors de la reprise : ' + e.message);
    console.error(e);
  }
}

// ── Supprimer le match interrompu ─────────────────────────────────────────────
function discardMatch(){
  if(!confirm('Supprimer le suivi interrompu ?')) return;
  localStorage.removeItem(KEY_CURRENT);
  document.getElementById('resumeBanner').classList.remove('on');
}

// ── Sauvegarder dans l'historique à la fin du match ───────────────────────────
function saveToHistory(){
  try{
    const ctx = document.getElementById('ctxTA') ? document.getElementById('ctxTA').value : '';
    const gc = document.getElementById('GC') ? document.getElementById('GC').value : '';
    const entry = {
      id: Date.now(),
      savedAt: Date.now(),
      S: JSON.parse(JSON.stringify(S)),
      ans: JSON.parse(JSON.stringify(ans)),
      ctx: ctx,
      gc: gc
    };
    const raw = localStorage.getItem(KEY_HISTORY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(entry); // plus récent en premier
    localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    localStorage.removeItem(KEY_CURRENT); // purger le match en cours
    console.log('[history] Match sauvegardé, total:', history.length);
  }catch(e){ console.warn('[saveToHistory]', e); }
}

// ── Ouvrir l'écran historique ─────────────────────────────────────────────────
function openHistory(){
  renderHistory();
  document.getElementById('SS').style.display = 'none';
  document.getElementById('HistS').style.display = 'flex';
}

function closeHistory(){
  document.getElementById('HistS').style.display = 'none';
  document.getElementById('SS').style.display = 'flex';
}

// ── Afficher la liste des matchs ──────────────────────────────────────────────
function renderHistory(){
  const raw = localStorage.getItem(KEY_HISTORY);
  const history = raw ? JSON.parse(raw) : [];
  const list = document.getElementById('histList');
  document.getElementById('histCount').textContent = history.length + ' match(s) sauvegardé(s)';

  if(!history.length){
    list.innerHTML = '<div class="hist-empty">Aucun match dans l\'historique.<br>Les matchs apparaissent ici apres export PDF.</div>';
    return;
  }

}

// ── Supprimer un match de l'historique ────────────────────────────────────────
function deleteHistory(id){
  if(!confirm('Supprimer ce match de l\'historique ?')) return;
  const raw = localStorage.getItem(KEY_HISTORY);
  let history = raw ? JSON.parse(raw) : [];
  history = history.filter(e => e.id !== id);
  localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
  renderHistory();
}

// ── Réexporter le PDF d'un match historique ───────────────────────────────────
function reexportPDF(idx){
  const raw = localStorage.getItem(KEY_HISTORY);
  const history = raw ? JSON.parse(raw) : [];
  if(!history[idx]) return;
  const entry = history[idx];
  // Sauvegarder l'état actuel
  const savedS = JSON.parse(JSON.stringify(S));
  const savedAns = JSON.parse(JSON.stringify(ans));
  const savedCtx = document.getElementById('ctxTA') ? document.getElementById('ctxTA').value : '';
  const savedGC = document.getElementById('GC') ? document.getElementById('GC').value : '';
  // Charger l'entrée historique
  Object.keys(entry.S).forEach(k => { S[k] = entry.S[k]; });
  Object.keys(entry.ans).forEach(k => { ans[k] = entry.ans[k]; });
  if(document.getElementById('ctxTA')) document.getElementById('ctxTA').value = entry.ctx || '';
  if(document.getElementById('GC')) document.getElementById('GC').value = entry.gc || '';
  // Générer le PDF
  exportPDF();
  // Restaurer l'état actuel après un court délai
  setTimeout(()=>{
    Object.keys(savedS).forEach(k => { S[k] = savedS[k]; });
    Object.keys(savedAns).forEach(k => { ans[k] = savedAns[k]; });
    if(document.getElementById('ctxTA')) document.getElementById('ctxTA').value = savedCtx;
    if(document.getElementById('GC')) document.getElementById('GC').value = savedGC;
  }, 500);
}

function showAlert(m){document.getElementById('AM').textContent=m;document.getElementById('AO').classList.add('on');}
function closeAlert(){document.getElementById('AO').classList.remove('on');}


// ═══════════════════════════════════════════════════════════════════════════
// GESTION DU THEME CLAIR / SOMBRE
// ═══════════════════════════════════════════════════════════════════════════
(function initTheme(){
  // 1. Lire la preference sauvegardee
  var saved = localStorage.getItem('arbitres_hb_theme');

  // 2. Si aucune preference, utiliser le reglage systeme iPad
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark = saved === 'dark' || (saved === null && prefersDark);

  applyTheme(isDark, false);

  // 3. Ecouter les changements de theme systeme iPad (en temps reel)
  if(window.matchMedia){
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e){
      // Seulement si l utilisateur n a pas de preference manuelle sauvegardee
      if(!localStorage.getItem('arbitres_hb_theme')){
        applyTheme(e.matches, false);
      }
    });
  }
})();

function applyTheme(dark, save){
  if(dark){
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
  // Mettre a jour le label et l icone
  var lbl = document.getElementById('themeLabel');
  var ico = document.getElementById('themeIcon');
  if(lbl) lbl.textContent = dark ? 'CLAIR' : 'SOMBRE';
  if(ico){
    ico.style.background = dark
      ? 'transparent'
      : 'rgba(255,255,255,0.15)';
  }
  // Sauvegarder si changement manuel
  if(save !== false){
    localStorage.setItem('arbitres_hb_theme', dark ? 'dark' : 'light');
  }
  // Mettre a jour meta theme-color pour iOS
  var meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = dark ? '#1a0808' : '#1D3A7A';
}

function toggleTheme(){
  var isDark = document.body.classList.contains('dark');
  applyTheme(!isDark, true);
}


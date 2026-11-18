/* =========================================================
   마음의 빙산 2.0 · Phase 1 (v7)
   기록 → 발견 → 축적 → 반복되는 상황·감정·욕구 패턴 발견
   · 기존 기록·화면·기능은 그대로 두고 그 위에 얹는 비파괴 확장입니다.
   ========================================================= */
'use strict';

/* ---------- 공통 유틸 (기존 정의를 그대로 쓰되 필요한 것만 보강) ---------- */
function esc2(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pctOf(a,b){ return b? Math.round(a/b*100) : 0; }
function nowISO(){ return new Date().toISOString(); }
function idOf(r){ return r? r.id : null; }

/* ---------- 감정 (기존 키 그대로 — 저장된 기록과 호환) ---------- */
var EMOTIONS=['기쁨','설렘','편안함','슬픔','서운함','속상함','불안함','화남','외로움','답답함','지침','혼란스러움'];
var EMOTION_EN={'기쁨':'joy','설렘':'anticipation','편안함':'ease','슬픔':'sadness','서운함':'hurt','속상함':'upset','불안함':'anxiety','화남':'anger','외로움':'loneliness','답답함':'stifled','지침':'exhaustion','혼란스러움':'confusion'};
function emotionLabel(k){ return isEN()? (EMOTION_EN[k]||k) : k; }

/* ---------- 욕구 (추천 8개 + 직접 입력 + 아직 모르겠어요) ---------- */
var NEED_KEYS=['인정','존중','이해','안정감','관심','자유','혼자만의 시간','공정함'];
var NEED_DICT={
  '인정':{en:'Recognition',line:{ko:'해온 것과 존재를 알아봐 주길 바라는 마음',en:'a wish for what I do and who I am to be noticed'},legacy:'인정받고 싶었어요'},
  '존중':{en:'Respect',line:{ko:'내 판단과 경계를 존중받고 싶은 마음',en:'a wish for my judgement and boundaries to be respected'},legacy:'존중받고 싶었어요'},
  '이해':{en:'Being understood',line:{ko:'내 이야기와 맥락을 알아봐 주길 바라는 마음',en:'a wish for my story and its context to be understood'},legacy:'이해받고 싶었어요'},
  '안정감':{en:'Feeling safe',line:{ko:'괜찮다는 확신과 예측 가능성을 원하는 마음',en:'a wish for reassurance and predictability'},legacy:'안심하고 싶었어요'},
  '관심':{en:'Attention',line:{ko:'곁에 있고 챙겨주길 바라는 마음',en:'a wish to be noticed and cared for'},legacy:'함께하고 싶었어요'},
  '자유':{en:'Freedom',line:{ko:'스스로 정하고 움직이고 싶은 마음',en:'a wish to decide and move on my own terms'},legacy:'내 마음을 표현하고 싶었어요'},
  '혼자만의 시간':{en:'Time alone',line:{ko:'아무에게도 설명하지 않아도 되는 시간을 원하는 마음',en:'a wish for time when I explain myself to no one'},legacy:'혼자만의 시간이 필요했어요'},
  '공정함':{en:'Fairness',line:{ko:'같은 기준으로 다뤄지길 바라는 마음',en:'a wish to be treated by the same measure as others'},legacy:'공정함'},
  '도움':{en:'Support',line:{ko:'혼자 다 하지 않아도 된다는 걸 확인하고 싶은 마음',en:'a wish to be reminded I don’t have to carry it alone'},legacy:'도움이 필요했어요'},
  '표현':{en:'Expression',line:{ko:'느낀 그대로를 숨기지 않고 꺼내고 싶은 마음',en:'a wish to say what I feel without hiding it'},legacy:'내 마음을 표현하고 싶었어요'},
  '아직 잘 모르겠어요':{en:'Not sure yet',line:{ko:'지금은 이름 붙이지 못한 바람',en:'a wish I cannot name yet'},legacy:'아직 잘 모르겠어요'}
};
var NEED_MIGRATE={
  '인정받고 싶었어요':'인정','존중받고 싶었어요':'존중','이해받고 싶었어요':'이해','안심하고 싶었어요':'안정감',
  '함께하고 싶었어요':'관심','혼자만의 시간이 필요했어요':'혼자만의 시간','도움이 필요했어요':'도움','내 마음을 표현하고 싶었어요':'표현',
  '공정함':'공정함','자유':'자유','관심':'관심','안정감':'안정감','이해':'이해','존중':'존중','인정':'인정'
};
function needLabel(k){ var d=NEED_DICT[k]; if(!d) return String(k||''); return isEN()? d.en : k; }
function needLine(k){ var d=NEED_DICT[k]; return d? (d.line[LANG]||d.line.ko) : ''; }
function migrateNeed(k){ k=String(k||'').trim(); return NEED_MIGRATE[k]||k; }
function legacyNeedOf(k){ var d=NEED_DICT[k]; return d? d.legacy : k; }
function isUnsureNeed(k){ return k==='아직 잘 모르겠어요'; }

/* ---------- 반응 (몸 · 마음) ---------- */
var REACTIONS=[
  {k:'몸이 굳었다',t:'body',en:'my body went stiff'},
  {k:'가슴이 답답했다',t:'body',en:'my chest felt tight'},
  {k:'얼굴이 뜨거워졌다',t:'body',en:'my face got hot'},
  {k:'눈물이 났다',t:'body',en:'tears came'},
  {k:'잠이 오지 않았다',t:'body',en:'I could not sleep'},
  {k:'속이 울렁였다',t:'body',en:'my stomach turned'},
  {k:'말을 못 하고 삼켰다',t:'mind',en:'I swallowed the words'},
  {k:'웃으며 넘겼다',t:'mind',en:'I smiled it away'},
  {k:'자리를 피했다',t:'mind',en:'I stepped away'},
  {k:'혼자 계속 생각했다',t:'mind',en:'I kept going over it alone'},
  {k:'아무것도 못 했다',t:'mind',en:'I could not do anything'},
  {k:'다른 일로 바빴다',t:'mind',en:'I buried myself in other things'},
  {k:'누군가에게 털어놨다',t:'mind',en:'I told someone'}
];
function reactionLabel(k){ var r=REACTIONS.filter(function(x){return x.k===k})[0]; if(!r) return String(k||''); return isEN()? r.en : r.k; }

/* ---------- 상황 분류 ---------- */
var SIT_CATS=[
  {k:'일·업무',en:'Work',re:/회의|업무|일이|출근|퇴근|회사|상사|팀장|동료|야근|프로젝트|보고|발표|거래처|알바|장사/},
  {k:'관계',en:'Relationships',re:/친구|연인|남친|여친|썸|약속|모임|사람|만나|연락/},
  {k:'가족',en:'Family',re:/엄마|아빠|부모|가족|동생|형|누나|언니|오빠|집안|명절/},
  {k:'공부·시험',en:'Study',re:/공부|시험|과제|수험|학원|강의|자격증|독서|인강/},
  {k:'몸·건강',en:'Body & health',re:/잠|수면|몸이|아프|병원|운동|피곤|컨디션/},
  {k:'돈·생활',en:'Money & daily life',re:/돈|월급|결제|청구|생활비|카드|집세|관리비/},
  {k:'혼자 있는 시간',en:'Time alone',re:/혼자|새벽|밤에|아침에|산책|방에|누워/},
  {k:'기타',en:'Other',re:null}
];
function sitCatLabel(k){ var c=SIT_CATS.filter(function(x){return x.k===k})[0]; if(!c) return String(k||''); return isEN()? c.en : c.k; }
function inferSitCat(text){
  var t=String(text||''),i;
  for(i=0;i<SIT_CATS.length;i++){ if(SIT_CATS[i].re&&SIT_CATS[i].re.test(t)) return SIT_CATS[i].k; }
  return '';
}

/* =========================================================
   기록 접근자 — 예전 기록(문자열 situation, feeling/need/other/action)과
   새 기록(emotions/reactions/thoughts/needs/selfExpression/analysis)을 함께 읽는다.
   ========================================================= */
function sitTextOf(r){ return situationString(r); }
function situationString(r){
  if(!r) return '';
  if(r.situation&&typeof r.situation==='object') return String(r.situation.description||'');
  return String(r.situation||'');
}
function sitCatOf(r){
  if(!r) return '';
  var c=String(r.situationCategory||((r.situation&&typeof r.situation==='object'&&r.situation.category)||''));
  return c||inferSitCat(situationString(r));
}
function emotionsOf(r){
  if(!r) return [];
  var a=(r.emotions&&r.emotions.length? r.emotions : (r.feeling||[]));
  return uniq((a||[]).map(String)).filter(function(f){ return EMOTIONS.indexOf(f)>=0; });
}
function needsOf(r){
  if(!r) return [];
  var a=(r.needs&&r.needs.length? r.needs : (r.need||[]).map(migrateNeed));
  return uniq((a||[]).map(migrateNeed));
}
function reactionsOf(r){ return uniq(((r&&r.reactions)||[]).map(String)); }
function thoughtsOf(r){ return String(r&&r.thoughts!=null? r.thoughts : ((r&&r.other)||'')); }
function sentenceOf(r){ return String(r&&r.selfExpression!=null? r.selfExpression : ((r&&r.action)||'')); }
function analysisOf(r){ return (r&&r.analysis&&typeof r.analysis==='object')? r.analysis : {confirmed:null,userFeedback:''}; }
function recordRejected(r){ return analysisOf(r).userFeedback==='rejected'; }

/* =========================================================
   비파괴 정규화 — 모르는 필드도 그대로 보존하고, 빠진 필드만 기본값으로 채운다.
   ========================================================= */
function normalizeRecord(r){
  var o=(r&&typeof r==='object')? r : {};
  var rec={}, k;
  for(k in o){ if(Object.prototype.hasOwnProperty.call(o,k)) rec[k]=o[k]; }
  rec.id=(typeof o.id==='number'&&isFinite(o.id))? o.id:(Number(o.id)||Date.now()+Math.floor(Math.random()*999));
  rec.date=(o.date&&!isNaN(new Date(o.date).getTime()))? o.date:(rec.date||nowISO());
  rec.situation=situationString(o);
  rec.situationCategory=sitCatOf(o);
  var emo=emotionsOf(o);
  rec.emotions=emo; rec.feeling=emo.slice();
  var ns=needsOf(o);
  rec.needs=ns; rec.need=ns.map(legacyNeedOf);
  rec.reactions=reactionsOf(o);
  rec.thoughts=thoughtsOf(o); rec.other=rec.thoughts;
  rec.selfExpression=sentenceOf(o); rec.action=rec.selfExpression;
  var a=analysisOf(o);
  rec.analysis={confirmed:(a.confirmed===true||a.userFeedback==='confirmed')?true:((a.confirmed===false||a.userFeedback==='rejected')?false:null),
    userFeedback:String(a.userFeedback||''), at:String(a.at||'')};
  if(!rec.ai&&o.ai&&typeof o.ai==='object') rec.ai=o.ai;
  return rec;
}

/* ---------- 화면 전환 ---------- */
function show2(id){
  var i;
  currentView=id;
  var views=document.querySelectorAll('.view');
  for(i=0;i<views.length;i++) views[i].classList.remove('active');
  var el=document.getElementById(id); if(el) el.classList.add('active');
  var btns=document.querySelectorAll('.navbtn');
  var navId=(id==='layer'||id==='deep')?'map':id;
  for(i=0;i<btns.length;i++) btns[i].classList.toggle('active',btns[i].dataset.view===navId);
  if(id==='records') renderRecords();
  if(id==='home'){ renderHomeTop(); renderRecent(); }
  if(id==='report') renderReport();
  if(id==='map') renderMap();
  if(id==='layer') renderLayer();
  if(id==='quick') renderQuick();
  if(id==='tap') renderTap();
  if(id==='deep') renderDeep();
  if(id==='detail'){ if(detailId!=null) openDetail(detailId); }
  if(id==='discovery'){ if(detailId!=null) renderDiscovery(detailId); }
  if(id==='settings') renderSettings();
  if(id==='type') renderType();
  window.scrollTo({top:0,behavior:'smooth'});
}
function show(id){ show2(id); }
function refreshView(){ show2(currentView); }
function syncLangUI2(){
  try{ document.documentElement.lang=LANG; document.body.className=LANG; }catch(e){}
  var a=document.getElementById('langKo'), b=document.getElementById('langEn');
  if(a) a.className=(LANG==='ko')?'on':'';
  if(b) b.className=(LANG==='en')?'on':'';
  var q=document.getElementById('quickNote'); if(q) q.placeholder=tr('지금 가장 걸리는 생각 한 줄','One line about what is on your mind');
  var t1=document.getElementById('iceTxtSit'); if(t1) t1.textContent=tr('상황','Situation');
  var t2=document.getElementById('iceTxtFeel'); if(t2) t2.textContent=tr('♡ 감정','♡ Feeling');
  var t3=document.getElementById('iceTxtNeed'); if(t3) t3.textContent=tr('✧ 욕구','✧ Need');
  var g=document.getElementById('gearBtn'); if(g) g.setAttribute('aria-label',tr('설정','Settings'));
}
function setLang(l){
  var next=String(l||'').toLowerCase()==='en'?'en':'ko';
  if(next!==LANG){ LANG=next; try{ localStorage.setItem(LS_LANG,LANG); }catch(e){} }
  syncLangUI2();
  refreshView();
  toast(isEN()?'Switched to English':'한국어로 바뀌었어요');
}

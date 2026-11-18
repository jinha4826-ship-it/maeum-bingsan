/* =========================================================
   화면 ① 홈 · ④ 빙하 지도 · 층/패턴 근거 · ⑤ 리포트
   ========================================================= */
var layerKind='', layerFocus='', layerPatternId='';
var patternScope='all';   /* '7' | 'all' — 섞지 않는다 */

function scopeToggle(){
  return '<div class="seg"><button class="'+(patternScope==='7'?'on':'')+'" onclick="setScope(\'7\')">'+tr('최근 7일','Last 7 days')+'</button><button class="'+(patternScope==='all'?'on':'')+'" onclick="setScope(\'all\')">'+tr('전체','All')+'</button></div>';
}
function setScope(s){ patternScope=(s==='7')?'7':'all'; if(currentView==='report') renderReport(); else if(currentView==='map') renderMap(); else refreshView(); }
function scopeLine(a){
  if(!a.list.length) return tr('이 기간에는 기록이 없어요','No entries in this period');
  var first=new Date(a.list[a.list.length-1].date), last=new Date(a.list[0].date);
  return (a.scope==='7'? tr('최근 7일','last 7 days') : tr('전체 기록','all entries'))+' · '+esc(dshort(first))+' ~ '+esc(dshort(last));
}
function feedbackRow(p){
  return '<div class="pat-fb">'
    +'<button class="'+(p.status==='confirmed'?'on':'')+'" onclick="feedbackPattern(\''+esc(p.id)+'\',\'confirmed\')">'+tr('맞아요','Fits')+'</button>'
    +'<button class="'+(p.status==='partial'?'on':'')+'" onclick="feedbackPattern(\''+esc(p.id)+'\',\'partial\')">'+tr('일부 달라요','Partly')+'</button>'
    +'<button class="'+(p.status==='rejected'?'on':'')+'" onclick="feedbackPattern(\''+esc(p.id)+'\',\'rejected\')">'+tr('내 마음과 달라요','Not like me')+'</button>'
    +'</div>';
}
function feedbackPattern(id,status){
  var p=patternById(id);
  setPatternFeedback(id,status,p);
  toast(status==='rejected'? tr('이 단서는 다시 띄우지 않을게요','I will not show this clue again') : (status==='confirmed'? tr('확인한 패턴으로 표시했어요','Marked as confirmed') : tr('‘일부 달라요’로 표시했어요','Marked as partly different')));
}
function patternCard(p,opts){
  opts=opts||{};
  var statusBadge = p.status==='confirmed'? ' · '+tr('확인함','confirmed') : (p.status==='partial'? ' · '+tr('일부 다름','partly') : '');
  return '<div class="pat-card">'
    +'<div class="pat-h"><span class="pat-badge">'+esc(confidenceLabel(p.level))+statusBadge+'</span>'
    +(p.type==='cross'?'<span class="pat-type">'+tr('상황을 가로지르는 반복','across situations')+'</span>':'')
    +(p.type==='connection'?'<span class="pat-type">'+tr('연결 패턴','connection')+'</span>':'')
    +'</div>'
    +'<p class="pat-say">'+p.sentence+'</p>'
    +'<p class="quiet" style="margin:4px 0 0">'+esc(evidenceLine(p))+'</p>'
    +(opts.hideFb?'':feedbackRow(p))
    +'<button class="btn secondary small" style="margin-top:8px" onclick="openPattern(\''+esc(p.id)+'\')">'+tr('근거 기록 보기','See the entries')+'</button>'
    +pinBtnPattern(p)
    +'</div>';
}
function insightCard(icon,title,body,ids){
  return '<div class="pat-card insight"><div class="pat-h"><span class="pat-badge">'+esc(title)+'</span></div><p class="pat-say">'+body+'</p>'
    +(ids&&ids.length?'<button class="btn secondary small" style="margin-top:8px" onclick="openIds(\''+ids.join(',')+'\')">'+tr('근거 기록 보기','See the entries')+'</button>':'')
    +'</div>';
}

/* ---------- 홈 ---------- */
function renderHomeTop(){
  var a=analyzePatterns('all');
  var el=document.getElementById('foundHome');
  if(el){
    var main=a.active[0]||null;
    if(main){
      el.innerHTML='<div class="card clue"><div class="clue-h">✨ '+tr('최근 발견한 마음 (단서)','Recently found (a clue)')+' <span class="clue-badge">'+esc(confidenceLabel(main.level))+'</span></div>'
        +'<p class="clue-say">'+main.sentence+'</p>'
        +'<p class="quiet" style="margin-top:6px">'+esc(evidenceLine(main))+'</p>'
        +'<button class="btn secondary small" style="margin-top:10px" onclick="openPattern(\''+esc(main.id)+'\')">'+tr('관련 기록 살펴보기','Look at the related entries')+'</button></div>';
    }else if(a.n>0){
      el.innerHTML='<div class="card"><div class="card-title">🌱 '+tr('관찰을 시작했어요','Observation has begun')+' <span class="clue-badge">'+esc(confidenceLabel('record'))+'</span></div>'
        +'<p style="margin:0;font-size:13px;line-height:1.78;color:#5d5266">'+tr('첫 기록을 남겼어요. 한두 건으로는 반복이라고 부르지 않아요.','Your first entry is in. One or two entries are not called a repeat here.')+'</p>'
        +'<p class="quiet" style="margin-top:7px">'+esc(a.note)+'</p>'
        +'<button class="btn" style="margin-top:10px" onclick="startNew()">'+tr('☁️ 한 번 더 기록하기','☁️ Record once more')+'</button></div>';
    }else{
      el.innerHTML='<div class="card"><div class="card-title">🌱 '+tr('첫 기록에서 시작돼요','It starts with one entry')+'</div>'
        +'<p style="margin:0;font-size:13px;line-height:1.78;color:#5d5266">'+tr('오늘 있었던 일 하나에 감정 이름만 붙여도 충분해요. 세 번쯤 쌓이고 서로 다른 날에 나타나면 그때 처음으로 단서를 조심스럽게 보여드릴게요.','Naming one feeling for one thing that happened is enough. After about three entries on different days, the first clue appears — carefully.')+'</p>'
        +'<button class="btn" style="margin-top:10px" onclick="startNew()">'+tr('☁️ 첫 마음 기록하기','☁️ Write the first entry')+'</button></div>';
    }
  }
  var ch=document.getElementById('chalHome');
  if(ch) ch.innerHTML=chalHTML();
}
function chalHTML(){
  var hasDay={}, i;
  for(i=0;i<records.length;i++){ var k=dayKey(new Date(records[i].date)); hasDay[k]=(hasDay[k]||0)+1; }
  var now=new Date(), days=[], done=0;
  for(i=6;i>=0;i--){
    var dt=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);
    var key=dayKey(dt);
    days.push({key:key,count:hasDay[key]||0,done:!!hasDay[key],today:i===0,w:dt.getDay()});
    if(hasDay[key]) done++;
  }
  var streak=0, cur=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  if(!hasDay[dayKey(cur)]) cur=new Date(cur.getFullYear(),cur.getMonth(),cur.getDate()-1);
  var guard=0;
  while(hasDay[dayKey(cur)]&&guard<400){ streak++; guard++; cur=new Date(cur.getFullYear(),cur.getMonth(),cur.getDate()-1); }
  var wd=isEN()?['S','M','T','W','T','F','S']:['일','월','화','수','목','금','토'];
  var dots=days.map(function(x,i){
    return '<div class="d'+(x.done?' on':'')+(x.today?' today':'')+'" title="'+esc(x.key)+'"><i>'+(x.done?'✓':(i+1))+'</i><span>'+wd[x.w]+'</span></div>';
  }).join('');
  var sub;
  if(done===7) sub=tr('<b>7일 완주!</b> 이번 주 마음이 일곱 조각 쌓였어요.','<b>Seven days complete!</b> Seven pieces of this week are gathered.');
  else if(streak>1) sub=tr('<b>'+streak+'일 연속</b> 기록 중이에요. 오늘 한 번이면 '+streak+'일째가 돼요.','<b>'+streak+' days in a row.</b> One entry today keeps it going.');
  else if(done) sub=tr('오늘 기록했어요. 내일 한 번 더 이어가면 연속 2일!','You logged today. Once more tomorrow makes two in a row!');
  else if(records.length) sub=tr('오늘 감정 하나만 남겨도 오늘의 스탬프가 찍혀요.','One feeling today stamps today.');
  else sub=tr('첫 기록 하나로 탐험이 시작돼요.','Your first entry starts the trek.');
  return '<div class="chal" role="button" tabindex="0" onclick="show(\'map\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();show(\'map\');}">'
    +'<div class="chal-top"><b>🧊 '+tr('7일 마음 탐험','7-day mind trek')+'</b>'+(done===7?'<span class="chal-badge">🏅 '+tr('완주','complete')+'</span>':'')+'<span class="cb">'+done+' / 7</span></div>'
    +'<div class="chal-dots">'+dots+'</div><div class="chal-sub">'+sub+'</div></div>';
}

/* ---------- 빙하 지도 ---------- */
function topItems(kind,list){
  var c={};
  list.forEach(function(r){
    if(kind==='situation'){ var s=sitCatOf(r); if(s) c[s]=(c[s]||0)+1; }
    if(kind==='emotion'){ uniq(emotionsOf(r)).forEach(function(e){ c[e]=(c[e]||0)+1; }); }
    if(kind==='need'){ needsOf(r).filter(function(x){return !isUnsureNeed(x)}).forEach(function(n){ c[n]=(c[n]||0)+1; }); }
  });
  return Object.keys(c).map(function(k){ return {key:k,count:c[k]}; }).sort(function(a,b){ return b.count-a.count; });
}
function renderMap(){
  var el=document.getElementById('mapContent'); if(!el) return;
  var a=analyzePatterns(patternScope);
  var tops={situation:topItems('situation',a.list),emotion:topItems('emotion',a.list),need:topItems('need',a.list)};
  function chips(kind){
    var arr=tops[kind].slice(0,3);
    if(!arr.length) return '<span class="quiet">'+tr('아직 없어요','nothing yet')+'</span>';
    return arr.map(function(x){ return '<span class="tag '+(kind==='need'?'depth':(kind==='situation'?'surface':''))+'">'+esc(itemLabel(kind,x.key))+' <b style="opacity:.6;font-weight:800">'+x.count+'</b></span>'; }).join('');
  }
  var html='';
  html+=scopeToggle();
  html+='<div class="card"><div class="card-title">'+tr('지금 지도 상태','Where the map is now')+' <span class="clue-badge" style="margin-left:auto">'+esc(a.levelLabel)+'</span></div>';
  html+='<div class="bignum">'+a.n+'<span>'+tr('개 기록','entries')+'</span></div>';
  html+='<p class="quiet" style="margin:6px 0 0">'+esc(scopeLine(a))+'</p>';
  html+='<p class="quiet" style="margin:6px 0 0">'+esc(a.note)+'</p>';
  html+='<div class="unlock" style="margin-top:12px"><div class="track"><i style="width:'+Math.min(100,Math.round(a.n/7*100))+'%"></i><u style="left:42.8%"></u></div><div class="marks"><span>0</span><span>'+tr('3 · 단서','3 · clue')+'</span><span>'+tr('7 · 패턴','7 · pattern')+'</span><span>'+tr('14 · 비교','14 · compare')+'</span></div></div></div>';
  html+='<div class="card"><div class="card-title">🗺 '+tr('내 빙하 지도','My glacier map')+'</div>';
  html+='<p class="prompt">'+tr('층을 누르면 그 기록을 바로 볼 수 있어요.','Tap a layer to see the entries behind it.')+'</p>';
  html+='<button class="layer-band surface" onclick="openLayer(\'situation\')"><span class="lb-k">'+tr('수면 위','Above')+'</span><span class="lb-t"><b>'+tr('반복되는 상황','Repeating situations')+'</b><span class="lb-chips">'+chips('situation')+'</span></span><span class="lb-a">›</span></button>';
  html+='<button class="layer-band mid" onclick="openLayer(\'emotion\')"><span class="lb-k">'+tr('중간층','Middle')+'</span><span class="lb-t"><b>'+tr('반복되는 감정과 생각','Repeating feelings and thoughts')+'</b><span class="lb-chips">'+chips('emotion')+'</span></span><span class="lb-a">›</span></button>';
  html+='<button class="layer-band deep" onclick="openLayer(\'need\')"><span class="lb-k">'+tr('심해','Deep')+'</span><span class="lb-t"><b>'+tr('반복되는 욕구','Repeating wishes')+'</b><span class="lb-chips">'+chips('need')+'</span></span><span class="lb-a">›</span></button>';
  html+='<p class="quiet" style="margin-top:11px">'+tr('진단이 아니에요. 기록을 고치면 지도도 다시 그려져요.','Not a diagnosis. The map redraws when entries change.')+'</p></div>';
  var cards=[];
  a.active.slice(0,4).forEach(function(p){ cards.push(patternCard(p)); });
  a.crosses.slice(0,2).forEach(function(p){ if(cards.length<6) cards.push(patternCard(p)); });
  a.mismatches.forEach(function(m){ cards.push(insightCard('❓',tr('바라는 것과 반응','wish and reaction'),m.sentence,m.evidenceIds)); });
  a.blindSpots.forEach(function(b){ cards.push(insightCard('🫧',tr('아직 비어 있는 자리','a space not yet named'),b.sentence,null)); });
  if(cards.length){
    html+='<div class="card"><div class="card-title">✨ '+tr('관찰된 단서와 연결','Clues and links')+'</div>'+cards.join('')+'</div>';
  }else{
    html+='<div class="card"><div class="empty">'+tr('아직 지도에 그릴 단서가 없어요 🧊<br>서로 다른 날에 기록이 세 개쯤 모이면 첫 단서를 보여드릴게요.','No clues to draw yet 🧊<br>Around three entries on different days and the first clue appears.')+'</div><button class="btn" style="margin-top:6px" onclick="startNew()">'+tr('☁️ 기록 남기기','☁️ Write an entry')+'</button></div>';
  }
  html+='<div class="row"><button class="btn" onclick="startNew()">'+tr('☁️ 오늘 마음 기록하기','☁️ Log today’s feeling')+'</button><button class="btn secondary" onclick="show(\'report\')">'+tr('리포트 보기','See report')+'</button></div>';
  el.innerHTML=html;
}

/* ---------- 층 / 패턴 근거 ---------- */
function openLayer(kind){ layerKind=kind; layerFocus=''; layerPatternId=''; renderLayer(); show('layer'); }
function openEvidence(kind,key){ layerKind=(kind==='link'||kind==='cross')?'emotion':kind; layerFocus=key||''; layerPatternId=''; renderLayer(); show('layer'); }
function openPattern(id){ layerPatternId=id; layerKind=''; layerFocus=''; renderLayer(); show('layer'); }
function openIds(csv){ layerPatternId=''; layerKind='ids'; layerFocus=csv; renderLayer(); show('layer'); }
function layerInfo(kind){
  if(kind==='situation') return {icon:'🌊',title:tr('수면 위 · 반복되는 상황','Above the surface · repeating situations'),desc:tr('겉으로 드러난 장면들이에요. 같은 종류의 일이 자주 돌아온다면, 그 상황이 나에게 무엇을 건드리는지 살펴볼 수 있어요.','These are the scenes that showed on the outside. If the same kind of thing keeps coming back, it is worth looking at what it touches in you.')};
  if(kind==='emotion') return {icon:'💧',title:tr('중간층 · 반복되는 감정과 생각','Middle · repeating feelings and thoughts'),desc:tr('그 상황에서 올라온 감정과, 머리에 남은 생각들이에요. 같은 감정이 서로 다른 날 여러 번 보이면 그 감정이 알려주는 것이 있을 수 있어요.','The feelings that came up and the thoughts that stayed. When a feeling appears on several different days, it may be pointing at something.')};
  return {icon:'🌑',title:tr('심해 · 반복되는 욕구','Deep · repeating wishes'),desc:tr('감정 아래에서 자주 바라던 것들이에요. 욕구는 좋고 나쁨이 없고, 알아차리는 것만으로도 조금 덜 막막해져요.','The wishes that kept appearing under the feelings. No wish is good or bad; noticing one can make things a little less stuck.')};
}
function renderLayer(){
  var el=document.getElementById('layerContent'); if(!el) return;
  var html='<button class="btn ghost" onclick="show(\'map\')">'+tr('← 빙하 지도','← Glacier map')+'</button>';
  if(layerPatternId){
    var p=patternById(layerPatternId);
    if(!p){ el.innerHTML=html+'<div class="card"><div class="empty">'+tr('이 단서를 찾지 못했어요.','That clue could not be found.')+'</div></div>'; return; }
    html+='<div class="hero"><div class="eyebrow">EVIDENCE ✧</div><h2>'+tr('이 단서가 나온 기록','The entries behind this clue')+'</h2><p>'+esc(evidenceLine(p))+'</p></div>';
    html+='<div class="card">'+patternCard(p,{hideFb:false})+'</div>';
    html+='<div class="card"><div class="card-title">'+tr('근거 기록 '+p.count+'건','Entries behind it · '+p.count)+'</div>'+recordRows(evidenceOfPattern(p),p)+'</div>';
    el.innerHTML=html; bindRecordRows(); return;
  }
  if(layerKind==='ids'){
    var ids=String(layerFocus||'').split(',').filter(Boolean).map(Number);
    var arr=ids.map(function(id){ return records.filter(function(x){return x.id===id})[0]; }).filter(Boolean);
    html+='<div class="hero"><div class="eyebrow">EVIDENCE ✧</div><h2>'+tr('근거 기록','The entries behind it')+'</h2><p>'+tr('아래 기록들에서 같은 요소가 함께 나타났어요.','The same element appears together in these entries.')+'</p></div>';
    html+='<div class="card">'+recordRows(arr)+'</div>';
    el.innerHTML=html; bindRecordRows(); return;
  }
  var info=layerInfo(layerKind||'emotion');
  var a=analyzePatterns(patternScope);
  var list=a.list;
  var tops=topItems(layerKind||'emotion',list);
  html+='<div class="hero"><div class="eyebrow">LAYER ✧</div><h2>'+esc(info.title)+'</h2><p>'+esc(info.desc)+'</p></div>';
  html+=scopeToggle();
  if(!tops.length){
    html+='<div class="card"><div class="empty">'+tr('이 층에 아직 기록이 없어요.','No entries in this layer yet.')+'</div><button class="btn" style="margin-top:6px" onclick="startNew()">'+tr('☁️ 기록 남기기','☁️ Write an entry')+'</button></div>';
    el.innerHTML=html; return;
  }
  var focusKey=layerFocus||tops[0].key;
  var pats=a.patterns.filter(function(p){
    if(p.type!==layerKind) return false;
    if(layerKind==='situation') return p.key===focusKey;
    if(layerKind==='emotion') return p.key===focusKey;
    return p.key===focusKey;
  });
  var pat=pats[0]||null;
  var hiddenPat=pats.filter(function(p){return p.hidden;})[0]||null;
  if(pat&&pat.hidden){ pat=null; }
  html+='<div class="card"><div class="card-title">'+esc(tr('이 층의 항목','Items in this layer'))+'</div><div class="chips">'
    +tops.slice(0,8).map(function(x){ return '<button class="chip '+(x.key===focusKey?'selected':'')+'" onclick="layerFocus=\''+esc(x.key)+'\';renderLayer()">'+esc(itemLabel(layerKind,x.key))+' <b style="opacity:.55">'+x.count+'</b></button>'; }).join('')+'</div>';
  if(pat) html+='<div style="margin-top:12px">'+patternCard(pat,{hideFb:false})+'</div>';
  else if(hiddenPat) html+='<p class="quiet" style="margin-top:12px">'+tr('이 항목의 단서는 ‘내 마음과 달라요’로 숨겨 두었어요. 기록이 더 쌓여 내용이 달라지면 다시 보여드릴게요.','You hid this clue as “not like me”. It will come back if new entries change what it says.')+'</p>';
  else html+='<p class="quiet" style="margin-top:12px">'+tr('이 항목은 아직 ‘개별 기록’ 단계예요. 서로 다른 날에 세 번 이상 겹치면 반복 단서로 보여드릴게요.','This item is still at the “single entry” stage. When it repeats three or more times on different days, it appears as a clue.')+'</p>';
  var ev=pat? evidenceOfPattern(pat) : records.filter(function(r){
    if(layerKind==='situation') return sitCatOf(r)===focusKey;
    if(layerKind==='emotion') return emotionsOf(r).indexOf(focusKey)>=0;
    return needsOf(r).indexOf(focusKey)>=0;
  });
  html+='<p class="quiet" style="margin-top:10px">'+tr('근거 기록 '+ev.length+'건','entries: '+ev.length)+'</p>';
  html+=recordRows(ev,pat);
  html+='</div>';
  el.innerHTML=html; bindRecordRows();
}
function recordRows(arr,pat){
  if(!arr||!arr.length) return '<div class="empty">'+tr('아직 관련 기록이 없어요.','No related entries yet.')+'</div>';
  var h='<div style="margin-top:10px">';
  arr.slice(0,40).forEach(function(r){
    var emo=emotionsOf(r).map(emotionLabel).join(' · ');
    var nd=needsOf(r).filter(function(x){return !isUnsureNeed(x)}).map(needLabel).join(' · ');
    var sit=situationDisplay(r);
    h+='<div class="entry" role="button" tabindex="0" data-open="'+r.id+'"><div class="entry-top"><span>'+esc(dstr(r.date))+'</span><span>'+tr('열어보기 ›','Open ›')+'</span></div>'
      +'<h3>'+(emo? esc(emo) : esc(tr('감정을 적지 않은 날','a day without a named feeling')))+'</h3>'
      +'<p>'+esc(cut(sit||nd||tr('나의 마음','my mind'),90))+'</p>'
      +((nd||reactionsOf(r).length)?'<div class="entry-sub">'+(nd?'💧 '+esc(nd):'')+(reactionsOf(r).length? (nd?' · ':'')+'🫧 '+esc(reactionsOf(r).slice(0,2).map(reactionLabel).join(' · ')):'')+'</div>':'')
      +'</div>';
  });
  return h+'</div>';
}
function bindRecordRows(){
  var els=document.querySelectorAll('[data-open]'),i;
  for(i=0;i<els.length;i++){
    (function(el){
      var go=function(){ openDetail(Number(el.getAttribute('data-open'))); };
      el.addEventListener('click',go);
      el.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } });
    })(els[i]);
  }
}

/* ---------- 화면 ⑤ 리포트 (v8 · 월간 4섹션 · 4단 구분) ---------- */
var TIER_PINS={};
function reportTools(){
  return '<div class="report-tools">'
    +'<button class="btn small" onclick="printReport()">📄 '+tr('상담·보관용 리포트 PDF 저장/인쇄','Save or print a PDF for counselling')+'</button>'
    +'<button class="btn secondary small" onclick="show(\'archive\')">📚 '+tr('변화 기록 보관소','Change archive')+'</button></div>';
}
function secHead(num,title,sub){
  return '<div class="sec-head"><span class="sec-num">'+num+'</span><div class="sec-tt"><b>'+esc(title)+'</b>'+(sub?'<span class="sec-sub">'+esc(sub)+'</span>':'')+'</div></div>';
}
function tierHTML(o){
  o=o||{};
  var st=o.id? stateOfId(o.id) : null;
  var status=st? String(st.status||'') : '';
  var h='<div class="tiers">';
  h+='<div class="tier fact"><span class="tk">'+tr('① 관찰된 사실','① What the entries show')+'</span><div class="tv">'+(o.fact||'—')+'</div></div>';
  h+='<div class="tier pat"><span class="tk">'+tr('② 반복 패턴','② Repeating pattern')+'</span><div class="tv">'+(o.pattern||'—')+'</div></div>';
  h+='<div class="tier inf"><span class="tk">'+tr('③ 추론 가능성','③ A possible inference')+'</span><div class="tv">'+(o.inference||'—')+'</div></div>';
  h+='<div class="tier cf"><span class="tk">'+tr('④ 확인이 필요해요','④ Needs your confirmation')+'</span><div class="tv">';
  if(o.confirmable&&o.id){
    h+='<div class="tier-fb">'
      +'<button class="'+(status==='confirmed'?'on':'')+'" onclick="tierConfirm(\''+esc(o.id)+'\',\'confirmed\')">'+tr('맞아요','Fits')+'</button>'
      +'<button class="'+(status==='partial'?'on':'')+'" onclick="tierConfirm(\''+esc(o.id)+'\',\'partial\')">'+tr('수정','Partly')+'</button>'
      +'<button class="'+(status==='rejected'?'on':'')+'" onclick="tierConfirm(\''+esc(o.id)+'\',\'rejected\')">'+tr('제외','Leave out')+'</button>'
      +'</div><p class="tier-note">'
      +(status==='confirmed'? tr('확인했어요. 이 발견은 보관소와 PDF의 ‘확인한 발견’에 들어가요.','Confirmed — it goes into the archive and the PDF as a confirmed finding.')
        : status==='partial'? tr('‘수정’으로 표시했어요. 내 문장으로 고쳐 보관소에 저장할 수 있어요.','Marked as partly. You can keep your own wording in the archive.')
        : status==='rejected'? tr('제외했어요. 이 단서는 다시 띄우지 않고 PDF에도 넣지 않아요.','Left out — it will not be shown again or printed.')
        : tr('맞는지 알려주면 확인한 발견으로 보관소와 PDF에 담아요.','Tell me whether it fits and it becomes a confirmed finding.')
      )+'</p>';
  }else{
    h+='<p class="tier-note">'+(o.needNote||tr('이 단서는 아직 확인을 요청할 만큼 쌓이지 않았어요.','This clue has not gathered enough to ask you to confirm it.'))+'</p>';
  }
  if(o.pinKey) h+='<button class="btn ghost small pin-btn'+(isPinned('manual',o.pinKey)?' on':'')+'" onclick="pinTier(\''+esc(o.pinKey)+'\')">'+(isPinned('manual',o.pinKey)? '📌 '+tr('보관소에 저장됨 · 빼기','Kept · remove') : '📌 '+tr('변화 보관소에 저장','Save to the change archive'))+'</button>';
  h+='</div></div></div>';
  return h;
}
function tierConfirm(id,status){
  var p=patternById(id);
  if(p){ setPatternFeedback(id,status,p); }
  else { setStateId(id,status); renderPatternUi(); }
  toast(status==='rejected'? tr('이 단서는 다시 띄우지 않을게요','I will not show this clue again')
    : status==='confirmed'? tr('확인한 발견으로 표시했어요','Marked as a confirmed finding')
    : tr('‘수정’으로 표시했어요','Marked as partly'));
}
function pinTier(key){
  var o=TIER_PINS[key]; if(!o) return;
  var pid=pinKey('manual',key);
  if(pinFind(pid)){
    removePin(pid);
    toast(tr('보관소에서 뺐어요','Removed from the archive'));
    renderPatternUi(); return;
  }
  /* EN 화면에서도 한국어가 남지 않도록 두 언어 문장을 함께 담아둔다 */
  var en=null;
  if(!isEN()){
    var prev=LANG; LANG='en';
    try{ var a=analyzePatterns('all'); section01HTML(a); section02HTML(a); section03HTML(a); section04HTML(); }catch(e){}
    LANG=prev;
    var eo=TIER_PINS[key];
    if(eo) en={title:eo.title,sentence:eo.sentence,evidence:eo.evidence};
  }
  var d=pinManualData(key,o.title,o.sentence,o.evidence);
  if(en){ d.titleEn=en.title; d.sentenceEn=en.sentence; d.evidenceEn=en.evidence; }
  addPin(d);
  toast(tr('변화 보관소에 저장했어요','Saved to the change archive'));
  renderPatternUi();
}

/* 01 · 반복되는 감정 */
function section01HTML(a){
  var n=a.n, list=a.list;
  var emo=topItems('emotion',list).slice(0,3);
  var bars=emo.map(function(x){
    return '<div class="bar-row"><div class="bar-top"><span>'+esc(emotionLabel(x.key))+'</span><b>'+pctOf(x.count,n)+'% · '+tr(x.count+'건',''+x.count+'×')+'</b></div><div class="bar"><i style="width:'+Math.max(6,pctOf(x.count,n))+'%"></i></div></div>';
  }).join('');
  var top=emo[0]||null;
  var rawPat=top? (a.patterns.filter(function(p){ return p.type==='emotion'&&p.key===top.key; })[0]||null) : null;
  var pat=(rawPat&&!rawPat.hidden)? rawPat : null;
  var nb=top? needsBehindEmotion(list,top.key) : null;
  var fact, patternTxt, inferTxt, label=top? emotionLabel(top.key):'';
  if(top){
    fact=tr('이 기간 기록 '+n+'건 중 '+top.count+'건('+pctOf(top.count,n)+'%)에 ‘'+label+'’'+josa(label,'이','가')+' 적혔어요.'+(pat?' 서로 다른 '+pat.distinctDays+'일의 기록이에요.':''),
            'Out of '+n+' entries, “'+label+'” appears in '+top.count+' ('+pctOf(top.count,n)+'%)'+(pat?' on '+pat.distinctDays+' different days':'')+'.');
    patternTxt=(rawPat&&rawPat.hidden)
      ? tr('이 단서는 ‘제외’로 표시되어 있어요. 아래 ④에서 다시 포함할 수 있어요.','This clue is marked as left out; you can include it again in ④ below.')
      : ((pat&&pat.level!=='record')
        ? '<span class="lv">'+esc(confidenceLabel(pat.level))+'</span> '+pat.sentence
        : tr('아직 ‘반복’이라고 부를 만큼 쌓이지 않았어요. 같은 감정이 서로 다른 날 3건 이상 모이면 반복 단서로 보여드려요.','Not enough to call it a repeat yet. Three or more entries on different days and it becomes a clue.'));
    inferTxt=(nb&&nb.top&&nb.top.count>=2)
      ? tr('‘'+label+'’'+josa(label,'이','가')+' 적힌 '+nb.total+'건 중 '+nb.top.count+'건에 ‘'+needLabel(nb.top.key)+'’의 바람이 함께 있었어요. 이 감정이 올라올 때 그 바람도 같이 올라오는 것일 수 있어요. 다만 기록에 적힌 것만으로 만든 짐작이에요.','In '+nb.top.count+' of the '+nb.total+' entries with “'+label+'”, a wish for “'+needLabel(nb.top.key)+'” was written too. The two may rise together — a guess made only from what was written.')
      : tr('지금 기록만으로는 이 감정 아래의 바람을 짐작하지 않았어요. 다음 기록에서 감정과 욕구를 함께 적으면 연결이 보여요.','No inference about the wish underneath is made yet. Writing a feeling and a wish together will show the link.');
  }else{
    fact=tr('이 기간에는 아직 감정을 적은 기록이 없어요.','No feelings were written in this period yet.');
    patternTxt=tr('셀 것이 없으면 문장도 만들지 않아요.','Nothing to count, so nothing is claimed.');
    inferTxt=tr('추론도 만들지 않았어요. 감정을 하나만 골라도 이 자리가 채워져요.','No inference either. Picking one feeling fills this space.');
  }
  if(top){
    TIER_PINS['r01']={title:tr('반복되는 감정 · ','Repeating feeling · ')+label,
      sentence:tr('이 기간 기록 '+n+'건 중 '+top.count+'건에 ‘'+label+'’'+josa(label,'이','가')+' 적혔어요.','Out of '+n+' entries, “'+label+'” appears in '+top.count+'.'),
      evidence:(pat? plainText(evidenceLine(pat)) : '')};
  }
  return '<div class="card rep-sec">'+secHead('01',tr('반복되는 감정','Feelings that repeat'),tr('이 기간에 자주 올라온 감정','The feelings that came up most in this period'))
    +(bars? '<div class="bars">'+bars+'</div>' : '')
    +'<p class="quiet" style="margin:2px 0 9px">'+tr('비율은 이 기간 기록 '+n+'건을 분모로 계산했어요. 한 기록에서 감정을 여러 개 고를 수 있어서 합계가 100%를 넘을 수 있어요.','Each share uses the '+n+' entries in this period as the denominator. Several feelings can be picked in one entry, so the total can pass 100%.')+'</p>'
    +tierHTML({id:rawPat?rawPat.id:'', fact:fact, pattern:patternTxt, inference:inferTxt, confirmable:!!rawPat, pinKey:top?'r01':''})
    +'</div>';
}

/* 02 · 서로 다른 상황의 연결 */
function section02HTML(a){
  var crosses=a.crosses.slice(0,2);
  var conns=a.connections.filter(function(p){ return !crosses.some(function(c){ return c.id===p.id; }); }).slice(0,2);
  var h='<div class="card rep-sec">'+secHead('02',tr('서로 다른 상황의 연결','Links across different situations'),tr('장면은 달라도 같은 마음이 반복되는지','Whether the same feeling returns in different scenes'));
  if(crosses.length){
    crosses.forEach(function(p,i){
      var sits=(p.situations||[]).map(sitCatLabel).join(' · ');
      var fact=tr('상황이 ‘'+sits+'’처럼 서로 달랐던 기록 '+p.count+'건에서 ‘'+emotionLabel(p.emotion)+'’'+josa(emotionLabel(p.emotion),'과','와')+' ‘'+needLabel(p.need)+'’의 바람이 같은 기록에 함께 적혔어요. 서로 다른 '+p.distinctDays+'일이에요.',
                  'In '+p.count+' entries whose situation differed ('+sits+'), “'+emotionLabel(p.emotion)+'” and a wish for “'+needLabel(p.need)+'” were written together — on '+p.distinctDays+' different days.');
      var infer=tr('상황 자체보다 그 아래 ‘'+needLabel(p.need)+'’의 바람이 반복해서 올라오는 것일 수 있어요. 기록이 말해주는 것은 ‘다른 장면에서도 같은 감정이 올라왔다’까지예요.','What repeats may be the wish for “'+needLabel(p.need)+'” rather than the situation itself. The entries only say that the same feeling rose in different scenes.');
      var key='r02_'+i;
      TIER_PINS[key]={title:tr('상황을 가로지르는 반복','A repeat across situations'),sentence:plainText(p.sentence),evidence:plainText(evidenceLine(p))};
      h+=tierHTML({id:p.id,fact:fact,pattern:p.sentence,inference:infer,confirmable:true,pinKey:key});
    });
  }else{
    var g=a.list.length;
    h+=tierHTML({id:'section|02',confirmable:false,
      fact:tr('서로 다른 상황에서 같은 감정·욕구 조합이 반복된 기록은 아직 없어요. 이 기간 기록은 '+g+'건이에요.','No combination of feeling and wish has yet repeated across different situations. This period holds '+g+' entries.'),
      pattern:tr('이 단서는 기록 3건 이상 · 서로 다른 3일 이상 · 서로 다른 상황 2가지 이상이 모일 때 만들어져요.','This clue appears with three or more entries, on three or more different days, across at least two different situations.'),
      inference:tr('모자란 상태에서 추론을 만들지 않았어요.','No inference is made while the evidence is thin.'),
      needNote:tr('필요한 기록이 쌓이면 이 자리에 보여드릴게요.','It will appear here once enough entries gather.')});
  }
  if(conns.length){
    h+='<div class="sub-h">'+tr('같은 상황 안에서의 연결','Links inside one situation')+'</div>';
    conns.forEach(function(p){
      h+='<div class="mini"><div class="k">'+esc(confidenceLabel(p.level))+' · '+esc(evidenceLine(p))+'</div>'+p.sentence
        +'<button class="btn secondary small" style="margin-top:8px" onclick="openPattern(\''+esc(p.id)+'\')">'+tr('근거 기록','Entries')+'</button>'
        +'<button class="btn ghost small" style="margin-top:8px" onclick="togglePinPatternBtn(\''+esc(p.id)+'\')">'+(isPinned('pattern',p.id)?'📌 '+tr('저장됨','Kept'):'📌 '+tr('보관소에 저장','Keep'))+'</button></div>';
    });
  }
  h+='</div>';
  return h;
}

/* 03 · 욕구와 반응의 차이 */
function section03HTML(a){
  var mis=a.mismatches;
  var gs=gapStats(a.list);
  var h='<div class="card rep-sec">'+secHead('03',tr('욕구와 반응의 차이','The gap between wish and reaction'),tr('바라는 것과 실제로 나온 반응','What was wished for and what actually came out'));
  var mRej=mis.length? stateOfId(mis[0].id) : null;
  if(mis.length&&mRej&&mRej.status==='rejected'){
    var m0=mis[0];
    h+=tierHTML({id:m0.id,confirmable:true,
      fact:tr('이 단서는 ‘제외’로 표시되어 있어요. 기록 자체는 그대로 남아 있어요.','This clue is marked as left out; the entries themselves stay.'),
      pattern:tr('다시 포함하면 이 자리에 단서가 보여요.','Include it again and the clue returns here.'),
      inference:'—',needNote:''});
  }else if(mis.length){
    var m=mis[0];
    var fact=tr('연결을 바라는 욕구(인정·이해·관심·존중·표현·함께함)와 억제하는 반응(참기·회피)이 같은 기록에 함께 적힌 건 '+m.count+'건, 서로 다른 '+m.distinctDays+'일이에요.',
                'Connection wishes (recognition, being understood, attention, respect, expression, togetherness) and suppressing reactions (holding it in, stepping away) appear together in '+m.count+' entries over '+m.distinctDays+' different days.');
    var patternTxt=tr('그 기록들에서 가장 자주 나온 조합은 ‘'+needLabel(m.need)+'’의 바람과 ‘'+reactionLabel(m.reaction)+'’ 반응이에요.',
                      'The most frequent pairing there is a wish for “'+needLabel(m.need)+'” with the reaction “'+reactionLabel(m.reaction)+'”.');
    var infer=tr('바라는 것과 표현 방식이 조금 다르게 움직이고 있진 않은지 스스로 물어볼 수 있어요. 단정하지 않고 질문으로만 남겨둘게요.','It may be worth asking yourself whether the wish and the way it comes out are moving in different directions. Kept as a question, not a conclusion.');
    TIER_PINS['r03']={title:tr('욕구와 반응의 차이','Wish and reaction'),sentence:plainText(m.sentence),evidence:tr('근거 기록 '+m.count+'건 · 서로 다른 '+m.distinctDays+'일','')};
    h+=tierHTML({id:m.id,fact:fact,pattern:patternTxt+' '+plainText(m.sentence),inference:infer,confirmable:true,pinKey:'r03'});
  }else{
    var fact2=gs.count
      ? tr('연결 욕구와 억제 반응이 함께 적힌 기록은 '+gs.count+'건(서로 다른 '+gs.days+'일)이에요.','Connection wish and suppressing reaction appear together in '+gs.count+' entries ('+gs.days+' days).')
      : tr('연결을 바라는 욕구와 억제 반응이 함께 적힌 기록이 아직 없어요.','No entry yet holds both a connection wish and a suppressing reaction.');
    h+=tierHTML({id:'section|03',confirmable:false,fact:fact2,
      pattern:tr('이 단서는 그런 기록이 3건 이상 · 서로 다른 3일 이상일 때 나타나요.','This clue appears with three or more such entries on three or more different days.'),
      inference:tr('아직 질문을 만들지 않았어요.','No question is made yet.'),
      needNote:tr('지금은 '+(gs.count>=3? '날짜가 모자라요. 서로 다른 3일이 필요해요.' : '한두 건 더 쌓이면 보여드릴 수 있어요.'),'')});
  }
  h+='</div>';
  return h;
}

/* 04 · 지난달과 달라진 점 */
function section04HTML(){
  var cmp=periodComparison();
  var h='<div class="card rep-sec">'+secHead('04',tr('지난달과 달라진 점','What changed from last month'),tr('최근 30일 vs 그 이전 30일','The last 30 days against the 30 before'));
  if(!cmp.ok){
    h+=tierHTML({id:'compare|none',confirmable:false,fact:cmp.note,
      pattern:tr('비교할 두 시기가 없으면 ‘달라졌다’고 말하지 않아요.','Without two periods there is nothing to call changed.'),
      inference:tr('추론을 만들지 않았어요.','No inference is made.'),
      needNote:tr('기록이 2건 이상 모이면 이 자리에서 비교를 시작해요.','With two or more entries the comparison starts here.')});
    h+='</div>'; return h;
  }
  var rows=cmp.topDiffs.slice(0,3).map(function(x){
    var cls=x.dp>0?'up':(x.dp<0?'down':'');
    var sign=(x.dp>0?'+':'')+x.dp+'%p';
    return '<div class="delta-row"><span class="dk">'+esc(tr({emotion:'감정',need:'욕구',situation:'상황'}[x.kind]||'항목',
      {emotion:'feeling',need:'wish',situation:'situation'}[x.kind]||'item'))+'</span><span class="dl2">'+esc(x.label)+'</span>'
      +'<span class="dv">'+x.ap+'% → '+x.bp+'%</span><span class="dd '+cls+'">'+sign+'</span></div>';
  }).join('');
  var fact=periodFactSentence(cmp);
  var patternTxt;
  if(cmp.topDiffs.length&&Math.abs(cmp.topDiffs[0].dp)>=10){
    patternTxt=tr('가장 크게 움직인 것은 '+deltaSentence(cmp.topDiffs[0])+'예요.','The biggest shift is '+deltaSentence(cmp.topDiffs[0])+'.');
  }else{
    patternTxt=tr('두 시기의 감정·욕구 구성이 비슷해요 — 같은 방식이 이어지고 있다는 뜻이에요.','The mix of feelings and wishes is much the same in both periods — the same way is continuing.');
  }
  var infer;
  if(cmp.newcomers.length){
    var nc=cmp.newcomers[0];
    infer=tr('최근에 새로 나타난 ‘'+nc.label+'’('+nc.bCount+'건)은 그동안과 다른 신호일 수 있어요. 기간이 짧아 우연일 수도 있으니 다음 기록에서 한 번 더 살펴볼게요.','“'+nc.label+'” ('+nc.bCount+' entries) is new in the recent period and may be a different signal. With a short period it may be chance, so it is worth watching.');
  }else if(cmp.mode==='half'){
    infer=tr('30일 창을 채우지 못해 절반끼리 비교했어요. 달라진 것처럼 보여도 시기가 짧아 우연일 수 있어요.','The periods were split in half instead of 30-day windows, so a difference may still be chance.');
  }else{
    infer=tr('이 비교는 기간의 비중 차이를 보는 것이지 원인을 말하는 게 아니에요.','This compares proportions between periods — it does not say why.');
  }
  TIER_PINS['r04']={title:tr('지난달과 달라진 점','What changed from last month'),sentence:plainText(fact+' '+patternTxt),evidence:tr(cmp.labelBefore+' '+cmp.before.n+'건 · '+cmp.labelNow+' '+cmp.now.n+'건',cmp.labelBefore+' '+cmp.before.n+' · '+cmp.labelNow+' '+cmp.now.n)};
  h+='<div class="delta-list">'+rows+'</div>'
    +'<p class="quiet" style="margin:0 0 9px">'+tr('기간 비교는 ‘전체’ 기록으로 계산해요.','The period comparison uses all entries.')+'</p>'
    +tierHTML({id:'compare|'+cmp.mode,fact:fact,pattern:patternTxt,inference:infer,confirmable:true,pinKey:'r04'});
  h+='</div>';
  return h;
}

function renderReport(){
  var el=document.getElementById('reportContent'); if(!el) return;
  var a=analyzePatterns(patternScope);
  var n=a.n;
  var html='';
  html+=scopeToggle();
  html+='<div class="range">'+scopeLine(a)+'</div>';
  html+=reportTools();
  if(!n){
    html+='<div class="card"><div class="empty">'+tr('이 기간에는 기록이 없어요 🌷<br>기록이 있어야 리포트가 만들어져요.','No entries in this period 🌷<br>A report needs entries.')+'</div><button class="btn" style="margin-top:6px" onclick="startNew()">'+tr('☁️ 기록 남기기','☁️ Write an entry')+'</button></div>';
    html+=backupCardHTML();
    el.innerHTML=html; return;
  }
  html+='<div class="card rep-head"><div class="card-title">✿ '+tr('월간 마음 패턴 리포트','Monthly mind pattern report')+' <span class="clue-badge" style="margin-left:auto">'+esc(a.levelLabel)+'</span></div>'
    +'<p class="prompt" style="margin-bottom:6px">'+tr('① 사실 ② 패턴 ③ 추론 ④ 확인, 네 칸으로 봐요.','Four parts: ① fact ② pattern ③ inference ④ confirmation.')+'</p>'
    +'<p class="quiet" style="margin:0">'+tr('분석한 기록 '+n+'건 · 서로 다른 '+distinctDaysOf(a.list).length+'일',''+n+' entries · '+distinctDaysOf(a.list).length+' different days')+'</p></div>';

  html+=section01HTML(a);

  var sitPats=a.active.filter(function(p){return p.type==='situation';}).slice(0,3);
  html+='<div class="card"><div class="card-title">🗺 '+tr('반복되는 상황','Repeating situations')+'</div>';
  if(sitPats.length) html+=sitPats.map(function(p){ return '<div class="mini"><div class="k">'+esc(confidenceLabel(p.level))+' · '+esc(evidenceLine(p))+'</div>'+p.sentence+'<button class="btn secondary small" style="margin-top:8px" onclick="openPattern(\''+esc(p.id)+'\')">'+tr('근거 기록','Entries')+'</button></div>'; }).join('');
  else if(a.observations.filter(function(p){return p.type==='situation';}).length){
    var o=a.observations.filter(function(p){return p.type==='situation';})[0];
    html+='<p style="margin:0;font-size:13px;line-height:1.78;color:#5d5266">'+tr('아직 반복이라고 부를 수 있는 상황은 없어요. 가장 자주 적힌 상황은 ‘'+esc(o.label)+'’ 1건이에요.','No situation can be called repeating yet. The most frequent is “'+esc(o.label)+'”, a single entry.')+'</p>';
  }else html+='<p class="quiet" style="margin:0">'+tr('이 기간에는 상황을 적은 기록이 없어요.','No situations were written in this period.')+'</p>';
  html+='</div>';
  var needPats=a.active.filter(function(p){return p.type==='need';}).slice(0,3);
  html+='<div class="card"><div class="card-title">💧 '+tr('자주 표현된 욕구','Wishes that kept appearing')+'</div>';
  if(needPats.length) html+=needPats.map(function(p){ return '<div class="mini"><div class="k">'+esc(confidenceLabel(p.level))+' · '+esc(evidenceLine(p))+'</div>'+p.sentence+'<button class="btn secondary small" style="margin-top:8px" onclick="openPattern(\''+esc(p.id)+'\')">'+tr('근거 기록','Entries')+'</button></div>'; }).join('');
  else html+='<p class="quiet" style="margin:0">'+tr('욕구를 적은 기록이 아직 적어요. 다음 기록에서 감정 아래의 바람을 한두 개 골라보면 여기에 쌓여요.','Not many entries name a wish yet. Picking one or two under the feeling will gather here.')+'</p>';
  html+='</div>';

  html+=section02HTML(a);
  html+=section03HTML(a);
  html+=section04HTML();

  if(patternScope==='all'){
    html+='<details class="legacy-ref"><summary>🕰 '+tr('이전 참고 보기 · 방어기제 변화','Earlier reference · defence shift')+'</summary>'+changeFlowHTML()+'</details>';
  }else{
    html+='<div class="card"><div class="card-title">🌊 '+tr('나의 변화 흐름','How I am shifting')+' <span class="bubble" style="margin-left:auto">'+tr('전체에서 볼 수 있어요','in All')+'</span></div><p class="quiet" style="margin:0">'+tr('변화 흐름은 기간을 나눠 비교하기 때문에 ‘전체’ 보기에서 보여드려요.','The change flow compares periods, so it appears in the “All” view.')+'</p><button class="btn secondary small" style="margin-top:9px" onclick="setScope(\'all\')">'+tr('전체 보기로','Switch to All')+'</button></div>';
  }
  var emo=topItems('emotion',a.list).slice(0,3);
  var topEmo=emo[0]?emo[0].key:'';
  var topNeed=needPats[0]?needPats[0].key:'';
  var q;
  if(isEN()){
    q = topEmo? ('Next month, when “'+emotionLabel(topEmo)+'” comes up, could you pause and ask what wish sits under it'+(topNeed?' — maybe “'+needLabel(topNeed)+'”':'')+'?')
              : 'Next month, could you write one sentence about what you wanted, even on an ordinary day?';
  }else{
    q = topEmo? ('다음 달에 ‘'+emotionLabel(topEmo)+'’'+josa(emotionLabel(topEmo),'이','가')+' 올라오면, 그 아래에 어떤 바람이 있는지 한 번만 물어봐 줄래요?'+(topNeed?' 그게 ‘'+needLabel(topNeed)+'’일 수도 있어요.':''))
              : '다음 달에는 평범한 날에도 ‘내가 원했던 것’을 한 문장으로 남겨볼까요?';
  }
  html+='<div class="card"><div class="card-title">✦ '+tr('다음 달 질문','A question for next month')+'</div><div class="qbox">'+esc(q)+'</div><p class="quiet" style="margin-top:9px">'+tr('답을 정해두지 않아도 돼요. 기록하다 보면 자연스럽게 답이 보여요.','You don’t have to answer it now. It tends to answer itself as you write.')+'</p></div>';

  var pins=pinList();
  html+='<div class="card"><div class="card-title">📚 '+tr('나의 변화 기록 보관소','My change archive')+' <span class="clue-badge" style="margin-left:auto">'+tr(pins.length+'개 저장',pins.length+' kept')+'</span></div>'
    +'<p class="prompt">'+tr('30일 전의 나와 지금의 나를 견주고, 내가 의미 있다고 느낀 발견을 모아둘 수 있어요. 리포트나 오늘의 발견에서 ‘📌 변화 보관소에 저장’을 누르면 여기 쌓여요.','Compare the me of 30 days ago with now, and keep the findings you found meaningful. Tap “📌 Save to the change archive” on a report clue or today’s discovery and it gathers here.')+'</p>'
    +'<button class="btn secondary small" onclick="show(\'archive\')">'+tr('보관소 열기','Open the archive')+'</button></div>';

  html+='<p class="quiet" style="padding:0 4px">'+tr('기록을 세어 정리한 리포트예요. 진단이 아니에요.','A report that counts your entries — not a diagnosis.')+'</p>';
  html+=backupCardHTML();
  el.innerHTML=html;
}

function backupCardHTML(){
  return '<div class="card"><div class="card-title">📦 '+tr('기록 백업','Backup')+'</div><p class="prompt">'+tr('기록은 이 기기 브라우저에만 저장돼요. JSON으로 내려받아 두면 기기를 바꾸거나 브라우저 데이터를 지워도 다시 불러올 수 있어요. 예전 버전에서 내보낸 파일도 그대로 불러와요.','Entries live only in this browser. A JSON copy brings them back after changing devices or clearing data, and files exported by earlier versions still import.')+'</p><div class="row"><button class="btn secondary small" onclick="exportData()">'+tr('내보내기','Export')+'</button><button class="btn secondary small" onclick="triggerImport()">'+tr('가져오기','Import')+'</button></div></div>';
}

/* ---------- 기록 목록 · 상세 ---------- */
function cardHTML(r){
  var emo=emotionsOf(r).map(emotionLabel).join(' · ');
  var nd=needsOf(r).filter(function(x){return !isUnsureNeed(x)}).map(needLabel).join(' · ');
  var sit=situationDisplay(r);
  var rej=recordRejected(r)? ' · '+tr('분석 제외','excluded') : '';
  return '<div class="entry" role="button" tabindex="0" data-open="'+r.id+'"><div class="entry-top"><span>'+esc(dstr(r.date))+rej+'</span><span>'+tr('열어보기 ›','Open ›')+'</span></div>'
    +'<h3>'+esc(emo||sit||tr('오늘의 마음 기록','Today’s entry'))+'</h3>'
    +'<p>'+esc(cut(sit||nd||tr('나의 마음','my mind'),90))+'</p></div>';
}
function openDetail(id){
  var r=records.filter(function(x){return x.id===id})[0]; if(!r) return;
  detailId=id;
  var rows=[
    [tr('상황','Situation'),situationDisplay(r),tr('아직 적지 않았어요.','Not written yet.')],
    [tr('감정','Feelings'),emotionsOf(r).map(emotionLabel).join(' · '),tr('아직 고르지 않았어요.','Nothing picked yet.')],
    [tr('몸과 마음의 반응','Body and mind'),reactionsOf(r).map(reactionLabel).join(' · '),tr('아직 적지 않았어요.','Not written yet.')],
    [tr('떠오른 생각','Thought'),thoughtsOf(r),tr('아직 적지 않았어요.','Not written yet.')],
    [tr('내가 원했던 것 (욕구)','What I wanted'),needsOf(r).filter(function(x){return !isUnsureNeed(x)}).map(needLabel).join(' · '),tr('아직 잘 모르겠어요.','Not sure yet.')],
    [tr('한 문장','One sentence'),sentenceOf(r),tr('아직 적지 않았어요.','Not written yet.')]
  ];
  var fb=analysisOf(r).userFeedback;
  document.getElementById('detailContent').innerHTML='<div class="hero"><div class="eyebrow">'+esc(dstr(r.date))+'</div><h2>'+tr('오늘의 마음 기록 ♡','Today’s entry ♡')+'</h2></div>'
    +'<div class="card">'+rows.map(function(pair){
      return '<div class="detail-label">'+pair[0]+'</div><div class="detail-text">'+esc(pair[1]||pair[2]||tr('아직 적지 않았어요.','Not written yet.'))+'</div>';
    }).join('')
    +(fb?'<div class="detail-label">'+tr('해석 피드백','Reading feedback')+'</div><div class="detail-text">'+esc(fb==='rejected'?tr('내 마음과 달라요 · 패턴 분석에서 제외','Not like me · excluded from patterns'):(fb==='partial'?tr('일부 달라요','partly different'):tr('맞아요','fits')))+'</div>':'')
    +'</div>'
    +'<button class="btn" onclick="openDeep('+r.id+')">'+tr('🧊 이 기록의 심층 리포트','🧊 The deep report for this entry')+'</button>'
    +'<div class="row" style="margin-top:9px"><button class="btn secondary small" onclick="detailId='+r.id+';show(\'discovery\')">'+tr('오늘의 발견 보기','See today’s discovery')+'</button><button class="btn secondary small" onclick="startEdit('+r.id+')">'+tr('수정','Edit')+'</button><button class="btn secondary small" onclick="deleteRecord('+r.id+')">'+tr('삭제','Delete')+'</button></div>';
  show('detail');
}

/* ---------- AI 분석 카드 상단 (오늘 + 과거 연결 + 질문) ---------- */
function patternTopHTML(r){
  var emo=emotionsOf(r).map(emotionLabel).join(' · ')||tr('감정 없음','no feeling');
  var sit=situationDisplay(r)||tr('상황 없음','no situation');
  var nd=needsOf(r).filter(function(x){return !isUnsureNeed(x)}).map(needLabel).join(' · ')||tr('아직 모름','not sure yet');
  var a=analyzePatterns('all');
  var mine=null;
  a.active.forEach(function(p){
    if(mine) return;
    if(p.type!=='connection'&&p.type!=='emotion'&&p.type!=='cross'&&p.type!=='need') return;
    if(p.evidenceIds.indexOf(r.id)<0) return;
    if(p.evidenceIds.filter(function(id){return id!==r.id}).length>=2) mine=p;
  });
  var h='<div class="prio"><div class="prio-h">'+tr('오늘의 감정 · 상황 · 욕구','Today · feeling, situation, wish')+'</div>'
    +'<div class="chips"><span class="ai-chip"><b>'+tr('감정','Feeling')+'</b> '+esc(cut(emo,30))+'</span><span class="ai-chip"><b>'+tr('상황','Situation')+'</b> '+esc(cut(sit,30))+'</span><span class="ai-chip"><b>'+tr('욕구','Wish')+'</b> '+esc(cut(nd,30))+'</span></div>';
  h+='<div class="prio-h" style="margin-top:12px">'+tr('과거 기록과 이어보기','Connecting with earlier entries')+'</div>';
  if(mine){
    h+='<p style="margin:0;font-size:13px;line-height:1.78;color:#5d5266">'+mine.sentence+'</p>'
      +'<p class="quiet" style="margin:4px 0 0">'+esc(evidenceLine(mine))+'</p>'
      +'<button class="btn secondary small" style="margin-top:8px" onclick="openPattern(\''+esc(mine.id)+'\')">'+tr('근거 기록 '+mine.count+'건 보기','See the '+mine.count+' entries')+'</button>';
  }else{
    h+='<p class="quiet" style="margin:0">'+tr('아직 이 기록과 이어지는 과거 단서가 없어요. 서로 다른 날에 비슷한 조합이 세 번 이상 쌓이면 여기에 보여드려요.','No earlier clue connects to this entry yet. When a similar combination appears three or more times on different days, it shows here.')+'</p>';
  }
  h+='<div class="prio-h" style="margin-top:12px">'+tr('나에게 던지는 질문','A question to hold')+'</div>'
    +'<div class="qbox" style="font-size:13.5px">'+esc(r.ai&&r.ai.question? r.ai.question : questionOf(r))+'</div>'
    +'<p class="quiet" style="margin-top:7px">'+tr('해결책을 정하는 곳이 아니라, 한 번 더 들여다보는 자리예요.','This is not where a solution is decided — it is a place to look once more.')+'</p></div>';
  return h;
}
function aiHTML(r){ return patternTopHTML(r)+aiHTMLBase(r); }

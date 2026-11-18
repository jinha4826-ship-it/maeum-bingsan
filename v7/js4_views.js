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
  html+='<p class="prompt">'+tr('층을 누르면 그 층을 만든 기록을 바로 볼 수 있어요. 수면 위에서 심해로 갈수록, 겉으로 드러나지 않았던 마음이에요.','Tap a layer to see the entries behind it. The deeper the layer, the less it was visible on the outside.')+'</p>';
  html+='<button class="layer-band surface" onclick="openLayer(\'situation\')"><span class="lb-k">'+tr('수면 위','Above')+'</span><span class="lb-t"><b>'+tr('반복되는 상황','Repeating situations')+'</b><span class="lb-chips">'+chips('situation')+'</span></span><span class="lb-a">›</span></button>';
  html+='<button class="layer-band mid" onclick="openLayer(\'emotion\')"><span class="lb-k">'+tr('중간층','Middle')+'</span><span class="lb-t"><b>'+tr('반복되는 감정과 생각','Repeating feelings and thoughts')+'</b><span class="lb-chips">'+chips('emotion')+'</span></span><span class="lb-a">›</span></button>';
  html+='<button class="layer-band deep" onclick="openLayer(\'need\')"><span class="lb-k">'+tr('심해','Deep')+'</span><span class="lb-t"><b>'+tr('반복되는 욕구','Repeating wishes')+'</b><span class="lb-chips">'+chips('need')+'</span></span><span class="lb-a">›</span></button>';
  html+='<p class="quiet" style="margin-top:11px">'+tr('이 지도는 기록을 세어 그린 그림이에요. 진단이나 성격 평가가 아니고, 기록을 고치거나 지우면 지도도 바로 다시 그려져요.','This map counts your entries and draws them. It is not a diagnosis or a personality assessment, and it redraws as soon as entries change.')+'</p></div>';
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
    var sit=situationString(r);
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

/* ---------- 화면 ⑤ 리포트 ---------- */
function renderReport(){
  var el=document.getElementById('reportContent'); if(!el) return;
  var a=analyzePatterns(patternScope);
  var n=a.n;
  var html='';
  html+=scopeToggle();
  html+='<div class="range">'+scopeLine(a)+'</div>';
  if(!n){
    html+='<div class="card"><div class="empty">'+tr('이 기간에는 기록이 없어요 🌷<br>리포트는 기록이 있어야 만들어져요. 없는 패턴은 지어내지 않아요.','No entries in this period 🌷<br>A report needs entries. Patterns are never invented.')+'</div><button class="btn" style="margin-top:6px" onclick="startNew()">'+tr('☁️ 기록 남기기','☁️ Write an entry')+'</button></div>';
    html+=backupCardHTML();
    el.innerHTML=html; return;
  }
  /* 감정 TOP 3 — 분모는 이 기간 전체 기록 수 */
  var emo=topItems('emotion',a.list).slice(0,3);
  var emoRows=emo.map(function(x){
    return '<div class="bar-row"><div class="bar-top"><span>'+esc(emotionLabel(x.key))+'</span><b>'+pctOf(x.count,n)+'% · '+tr(x.count+'건',''+x.count+'×')+'</b></div><div class="bar"><i style="width:'+Math.max(6,pctOf(x.count,n))+'%"></i></div></div>';
  }).join('');
  html+='<div class="card"><div class="card-title">🌊 '+tr('감정 TOP 3','Top 3 feelings')+'</div>'
    +(emo.length? emoRows : '<div class="empty" style="padding:14px 6px">'+tr('이 기간에는 아직 감정 기록이 없어요.','No feelings recorded in this period yet.')+'</div>')
    +'<p class="quiet" style="margin-top:8px">'+tr('비율은 이 기간 기록 '+n+'건을 분모로 계산했어요. 한 기록에서 감정을 여러 개 고를 수 있어서 합계가 100%를 넘을 수 있어요.','Each share uses the '+n+' entries in this period as the denominator. Several feelings can be picked in one entry, so the total can pass 100%.')+'</p></div>';
  /* 반복 상황 */
  var sitPats=a.active.filter(function(p){return p.type==='situation';}).slice(0,3);
  html+='<div class="card"><div class="card-title">🗺 '+tr('반복되는 상황','Repeating situations')+'</div>';
  if(sitPats.length) html+=sitPats.map(function(p){ return '<div class="mini"><div class="k">'+esc(confidenceLabel(p.level))+' · '+esc(evidenceLine(p))+'</div>'+p.sentence+'<button class="btn secondary small" style="margin-top:8px" onclick="openPattern(\''+esc(p.id)+'\')">'+tr('근거 기록','Entries')+'</button></div>'; }).join('');
  else if(a.observations.filter(function(p){return p.type==='situation';}).length){
    var o=a.observations.filter(function(p){return p.type==='situation';})[0];
    html+='<p style="margin:0;font-size:13px;line-height:1.78;color:#5d5266">'+tr('아직 반복이라고 부를 수 있는 상황은 없어요. 가장 자주 적힌 상황은 ‘'+esc(o.label)+'’ 1건이에요.','No situation can be called repeating yet. The most frequent is “'+esc(o.label)+'”, a single entry.')+'</p>';
  }else html+='<p class="quiet" style="margin:0">'+tr('이 기간에는 상황을 적은 기록이 없어요.','No situations were written in this period.')+'</p>';
  html+='</div>';
  /* 자주 표현된 욕구 */
  var needPats=a.active.filter(function(p){return p.type==='need';}).slice(0,3);
  html+='<div class="card"><div class="card-title">💧 '+tr('자주 표현된 욕구','Wishes that kept appearing')+'</div>';
  if(needPats.length) html+=needPats.map(function(p){ return '<div class="mini"><div class="k">'+esc(confidenceLabel(p.level))+' · '+esc(evidenceLine(p))+'</div>'+p.sentence+'<button class="btn secondary small" style="margin-top:8px" onclick="openPattern(\''+esc(p.id)+'\')">'+tr('근거 기록','Entries')+'</button></div>'; }).join('');
  else html+='<p class="quiet" style="margin:0">'+tr('욕구를 적은 기록이 아직 적어요. 다음 기록에서 감정 아래의 바람을 한두 개 골라보면 여기에 쌓여요.','Not many entries name a wish yet. Picking one or two under the feeling will gather here.')+'</p>';
  html+='</div>';
  /* 연결 패턴 · 인사이트 */
  var links=a.connections.slice(0,2);
  var cross=a.crosses.filter(function(p){ return !links.some(function(q){return q.id===p.id}); }).slice(0,1);
  var insightCards=[];
  links.forEach(function(p){ insightCards.push(patternCard(p)); });
  cross.forEach(function(p){ insightCards.push(patternCard(p)); });
  a.mismatches.forEach(function(m){ insightCards.push(insightCard('❓',tr('바라는 것과 반응','wish and reaction'),m.sentence,m.evidenceIds)); });
  a.blindSpots.forEach(function(b){ insightCards.push(insightCard('🫧',tr('아직 비어 있는 자리','a space not yet named'),b.sentence,null)); });
  if(insightCards.length){
    html+='<div class="card"><div class="card-title">✧ '+tr('연결해서 본 단서','Links between entries')+'</div><p class="prompt">'+tr('한 기록 안의 사실만으로 만든 관찰이에요. 진단이 아니고, 맞지 않으면 알려주세요.','These are observations built only from what is in the entries. Not a diagnosis — tell me if they do not fit.')+'</p>'+insightCards.join('')+'</div>';
  }
  /* 변화 흐름 — 전체 범위에서만 */
  if(patternScope==='all'){
    html+=changeFlowHTML();
  }else{
    html+='<div class="card"><div class="card-title">🌊 '+tr('나의 변화 흐름','How I am shifting')+' <span class="bubble" style="margin-left:auto">'+tr('전체에서 볼 수 있어요','in All')+'</span></div><p class="quiet" style="margin:0">'+tr('변화 흐름은 기간을 나눠 비교하기 때문에 ‘전체’ 보기에서 보여드려요.','The change flow compares periods, so it appears in the “All” view.')+'</p><button class="btn secondary small" style="margin-top:9px" onclick="setScope(\'all\')">'+tr('전체 보기로','Switch to All')+'</button></div>';
  }
  /* 다음 달 질문 */
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
  html+='<p class="quiet" style="padding:0 4px">'+tr('이 리포트는 기록을 세고 정리한 것이에요. 진단이나 심리 평가가 아니고, 기록이 바뀌면 숫자도 바로 바뀌어요.','This report counts and arranges your entries. It is not a diagnosis or an assessment, and the numbers change as soon as entries do.')+'</p>';
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
  var sit=situationString(r);
  var rej=recordRejected(r)? ' · '+tr('분석 제외','excluded') : '';
  return '<div class="entry" role="button" tabindex="0" data-open="'+r.id+'"><div class="entry-top"><span>'+esc(dstr(r.date))+rej+'</span><span>'+tr('열어보기 ›','Open ›')+'</span></div>'
    +'<h3>'+esc(emo||sit||tr('오늘의 마음 기록','Today’s entry'))+'</h3>'
    +'<p>'+esc(cut(sit||nd||tr('나의 마음','my mind'),90))+'</p></div>';
}
function openDetail(id){
  var r=records.filter(function(x){return x.id===id})[0]; if(!r) return;
  detailId=id;
  var rows=[
    [tr('상황','Situation'),situationString(r)||(sitCatOf(r)?sitCatLabel(sitCatOf(r)):''),tr('아직 적지 않았어요.','Not written yet.')],
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
  var sit=situationString(r)||(sitCatOf(r)?sitCatLabel(sitCatOf(r)):'')||tr('상황 없음','no situation');
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

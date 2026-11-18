/* =========================================================
   화면 ② 기록 — 상황 / 감정 / 몸과 마음의 반응 (핵심 3영역)
   + 선택: 그때 떠오른 생각 · 내가 원했던 것(욕구) · 한 문장
   3영역만 적어도 정상 저장되고, 모든 단계는 건너뛸 수 있다.
   ========================================================= */
function emptyDraft(){
  return {situation:{category:'',description:''},emotions:[],reactions:[],thoughts:'',needs:[],needUnsure:false,selfExpression:''};
}
function draftFromRecord(r){
  return {
    situation:{category:sitCatOf(r),description:situationString(r)},
    emotions:emotionsOf(r).slice(),
    reactions:reactionsOf(r).slice(),
    thoughts:thoughtsOf(r),
    needs:needsOf(r).filter(function(n){return !isUnsureNeed(n)}),
    needUnsure:needsOf(r).indexOf('아직 잘 모르겠어요')>=0,
    selfExpression:sentenceOf(r)
  };
}
function stepsMeta(){
  return [
    {key:'situation',ko:'상황',en:'Situation'},
    {key:'emotion',ko:'감정',en:'Feeling'},
    {key:'reaction',ko:'반응',en:'Reaction'},
    {key:'thought',ko:'생각',en:'Thought'},
    {key:'need',ko:'욕구',en:'Need'},
    {key:'finish',ko:'한 문장',en:'One line'}
  ];
}
function startNew(){
  editingId=null; idx=0; draft=emptyDraft();
  renderStep(); show('write');
}
function startEdit(id){
  var r=records.filter(function(x){return x.id===id})[0]; if(!r) return;
  editingId=id; idx=0; draft=draftFromRecord(r);
  renderStep(); show('write');
}
function renderStepsBar(){
  var meta=stepsMeta(), h='', i;
  for(i=0;i<meta.length;i++){
    h+='<div class="step '+(i===idx?'on':'')+(i<idx?' done':'')+'"><b>'+(i===idx?'●':'✓')+'</b>'+esc(isEN()?meta[i].en:meta[i].ko)+'</div>';
  }
  var el=document.getElementById('steps'); if(el) el.innerHTML=h;
}
function chipHTML(key,label,selected){
  return '<button type="button" class="chip '+(selected?'selected':'')+'" data-pick="'+esc(key)+'">'+esc(label)+'</button>';
}
function renderStep(){
  var d=draft, body='', title='', hint='';
  if(idx===0){
    title=tr('무슨 일이 있었나요?','What happened?');
    hint=tr('가까운 상황을 고르고, 기억나는 만큼만 적어 주세요. 건너뛰어도 괜찮아요.','Pick the closest situation and write as much as you remember. Skipping is fine.');
    body='<div class="chips" style="margin-bottom:10px">'+SIT_CATS.map(function(c){ return chipHTML(c.k,isEN()?c.en:c.k,d.situation.category===c.k); }).join('')+'</div>';
    body+='<textarea class="field" id="sitDesc" maxlength="1000" placeholder="'+esc(tr('예) 팀장님이 회의에서 내 아이디어를 자기 것처럼 말했다. 그 자리에서 아무 말도 못 했다.','e.g. In the meeting my manager said my idea as if it were his. I just smiled and said nothing.'))+'">'+esc(d.situation.description||'')+'</textarea>';
  }else if(idx===1){
    title=tr('어떤 감정이 올라왔나요?','What did you feel?');
    hint=tr('여러 개 골라도 좋아요. 이름을 붙이는 것만으로도 마음이 조금 선명해져요.','More than one is fine. Naming it can make it a little clearer.');
    body='<div class="chips">'+EMOTIONS.map(function(f){ return chipHTML(f,emotionLabel(f),d.emotions.indexOf(f)>=0); }).join('')+'</div>';
    body+='<button type="button" class="btn ghost small" style="margin-top:12px" onclick="pickUnsureEmotion()">'+tr('아직 잘 모르겠어요','Not sure yet')+'</button>';
  }else if(idx===2){
    title=tr('그때 몸과 마음은 어땠나요?','How did your body and mind react?');
    hint=tr('몸이 먼저 반응한 것도, 마음이 한 행동도 모두 단서가 돼요.','How your body reacted and what you did are both clues.');
    body='<div class="tap-group"><div class="tap-h"><b>몸</b>'+tr('몸의 반응','Body')+'</div><div class="chips">'
      +REACTIONS.filter(function(x){return x.t==='body'}).map(function(x){ return chipHTML(x.k,reactionLabel(x.k),d.reactions.indexOf(x.k)>=0); }).join('')+'</div></div>';
    body+='<div class="tap-group"><div class="tap-h"><b>마음</b>'+tr('마음과 행동','Mind · action')+'</div><div class="chips">'
      +REACTIONS.filter(function(x){return x.t==='mind'}).map(function(x){ return chipHTML(x.k,reactionLabel(x.k),d.reactions.indexOf(x.k)>=0); }).join('')+'</div></div>';
  }else if(idx===3){
    title=tr('그때 어떤 생각이 맴돌았나요?','What thought stayed with you?');
    hint=tr('선택이에요. 스스로에게 했던 말을 그대로 적어보세요.','Optional. The words you said to yourself, exactly as they came.');
    body='<textarea class="field" id="thoughtText" maxlength="1000" placeholder="'+esc(tr('예) 또 참았다. 나는 왜 말을 못 하지.','e.g. I held it in again. Why can’t I speak up.'))+'">'+esc(d.thoughts||'')+'</textarea>';
  }else if(idx===4){
    title=tr('그 아래에서 바라던 것은 무엇이었을까요?','What were you wishing for underneath?');
    hint=tr('선택이에요. 정답이 아니라 가까운 것을 골라보는 거예요.','Optional. Not an answer — just the closest thing.');
    body='<div class="chips">'+NEED_KEYS.map(function(n){ return chipHTML(n,needLabel(n),d.needs.indexOf(n)>=0); }).join('')+'</div>';
    var custom=d.needs.filter(function(n){return NEED_KEYS.indexOf(n)<0});
    if(custom.length) body+='<div class="chips" style="margin-top:9px">'+custom.map(function(n){ return chipHTML(n,n,d.needs.indexOf(n)>=0); }).join('')+'</div>';
    body+='<div class="row" style="margin-top:11px"><input class="input" id="needCustom" type="text" maxlength="30" placeholder="'+esc(tr('직접 적기','Write your own'))+'"><button class="btn secondary small" style="flex:0 0 auto;width:auto;padding:12px 14px" onclick="addCustomNeed()">'+tr('추가','Add')+'</button></div>';
    body+='<button type="button" class="btn ghost small" style="margin-top:12px" onclick="pickUnsureNeed()">'+tr('아직 잘 모르겠어요','Not sure yet')+'</button>';
    body+='<p class="quiet" style="margin-top:9px">'+tr('‘잘 모르겠어요’도 괜찮은 답이에요. 다음 기록에서 다시 보이면 그때 이름을 붙여도 돼요.','“Not sure yet” is a real answer. If it shows up again, you can name it then.')+'</p>';
  }else{
    title=tr('오늘의 마음을 한 문장으로','Today’s feeling in one sentence');
    hint=tr('앱이 적어둔 것을 모아 문장을 만들었어요. 그대로 두어도 되고, 직접 고쳐도 돼요.','The app gathered what you wrote into a sentence. Keep it, or rewrite it.');
    var guess=d.selfExpression||interpretOf(d);
    body='<textarea class="field" id="sentenceText" maxlength="240" placeholder="'+esc(tr('오늘의 마음을 한 문장으로 적어보세요','One sentence about today’s feeling'))+'">'+esc(guess)+'</textarea>';
    body+='<button type="button" class="btn secondary small" style="margin-top:9px" onclick="askSentenceAI()">'+tr('✦ AI 도움 받아 다듬기','✦ Tidy it with AI')+'</button>';
    body+='<p class="quiet" style="margin-top:9px">'+tr('위 문장은 기록에서 만든 <b>가능한 해석</b>이에요. 정답이 아니라 출발점이에요.','The sentence above is a <b>possible reading</b> built from your entry — a starting point, not an answer.')+'</p>';
  }
  var el=document.getElementById('stepCard');
  if(el) el.innerHTML='<div class="card-title">'+esc(title)+'</div><p class="prompt">'+esc(hint)+'</p>'+body
    +'<div style="text-align:right;color:#aaa;font-size:11px;margin-top:9px">'+(idx+1)+' / 6</div>'+(editingId?'<div class="quiet" style="margin-top:6px">'+tr('수정 중인 기록이에요','Editing an existing entry')+'</div>':'');
  renderStepsBar();
  bindPicks();
}
function bindPicks(){
  var els=document.querySelectorAll('[data-pick]'),i;
  for(i=0;i<els.length;i++){
    (function(el){
      el.addEventListener('click',function(){
        collectCurrent();
        var k=el.getAttribute('data-pick');
        if(idx===0){ draft.situation.category=(draft.situation.category===k?'':k); }
        else if(idx===1){ draft.emotions=draft.emotions.indexOf(k)>=0? draft.emotions.filter(function(x){return x!==k}) : draft.emotions.concat([k]); }
        else if(idx===2){ draft.reactions=draft.reactions.indexOf(k)>=0? draft.reactions.filter(function(x){return x!==k}) : draft.reactions.concat([k]); }
        else if(idx===4){ draft.needs=draft.needs.indexOf(k)>=0? draft.needs.filter(function(x){return x!==k}) : draft.needs.concat([k]); draft.needUnsure=false; }
        renderStep();
      });
    })(els[i]);
  }
}
function pickUnsureEmotion(){ collectCurrent(); draft.emotions=[]; toast(tr('감정은 넘어가도 괜찮아요','It is okay to skip the feeling')); nextStep(); }
function pickUnsureNeed(){ collectCurrent(); draft.needs=[]; draft.needUnsure=true; renderStep(); toast(tr('‘아직 모르겠어요’로 표시했어요','Marked as “not sure yet”')); }
function addCustomNeed(){
  var el=document.getElementById('needCustom'); if(!el) return;
  collectCurrent();
  var v=String(el.value||'').replace(/\s+/g,' ').trim(); if(!v) return;
  if(draft.needs.indexOf(v)<0) draft.needs=draft.needs.concat([v]);
  draft.needUnsure=false; el.value=''; renderStep();
}
function collectCurrent(){
  if(idx===0){ var a=document.getElementById('sitDesc'); if(a) draft.situation.description=a.value; }
  if(idx===3){ var b=document.getElementById('thoughtText'); if(b) draft.thoughts=b.value; }
  if(idx===5){ var c=document.getElementById('sentenceText'); if(c) draft.selfExpression=c.value; }
}
function nextStep(){
  collectCurrent();
  if(idx<5){ idx++; renderStep(); window.scrollTo({top:0,behavior:'smooth'}); }
  else saveRecord();
}
function prevStep(){
  collectCurrent();
  if(idx>0){ idx--; renderStep(); window.scrollTo({top:0,behavior:'smooth'}); } else show('home');
}
function skipStep(){
  collectCurrent();
  if(idx<5){ idx++; renderStep(); window.scrollTo({top:0,behavior:'smooth'}); }
  else saveRecord();
}
function saveEarly(){ collectCurrent(); saveRecord(); }

/* ---------- 저장 ---------- */
function draftHasAnything(d){
  return !!(String(d.situation.description||'').trim()||d.situation.category||d.emotions.length||d.reactions.length||String(d.thoughts||'').trim()||d.needs.length||String(d.selfExpression||'').trim()||d.needUnsure);
}
function draftToRecord(d,base){
  var emo=uniq(d.emotions||[]);
  var ns=uniq(d.needs||[]);
  if(d.needUnsure&&!ns.length) ns=['아직 잘 모르겠어요'];
  var desc=String(d.situation.description||'');
  var rec=base||{};
  rec.id=base? base.id : Date.now();
  rec.date=base? base.date : nowISO();
  rec.situation=desc;
  rec.situationCategory=d.situation.category||inferSitCat(desc);
  rec.emotions=emo; rec.reactions=uniq(d.reactions||[]);
  rec.thoughts=String(d.thoughts||'');
  rec.needs=ns;
  rec.selfExpression=String(d.selfExpression||'');
  rec.reflection=String(rec.reflection||'');
  rec.analysis={confirmed:null,userFeedback:'',at:''};
  rec.schema=3;
  if(!base) rec.source='step';
  return normalizeRecord(rec);
}
function saveRecord(){
  var d=draft;
  if(!draftHasAnything(d)){
    alert(tr('마음에 관한 내용을 하나 이상 적어주세요.','Please write at least one thing about how you feel.')); return;
  }
  var rec;
  if(editingId){
    var old=records.filter(function(x){return x.id===editingId})[0]||null;
    rec=draftToRecord(d,old||null);
    if(old){ for(var i=0;i<records.length;i++){ if(records[i].id===editingId){ records[i]=rec; break; } } }
    else records.unshift(rec);
    if(!rec.selfExpression) rec.selfExpression=interpretOf(draftFromRecord(rec));
    rec.analysis={confirmed:null,userFeedback:'',at:nowISO()};
  }else{
    rec=draftToRecord(d,null);
    if(!rec.selfExpression) rec.selfExpression=interpretOf(draftFromRecord(rec));
    records.unshift(rec);
  }
  records.sort(function(a,b){return new Date(b.date)-new Date(a.date)});
  persist();
  if(cloudPushOne) cloudPushOne(rec);
  editingId=null; detailId=rec.id;
  aiState={loading:false,error:'',model:''};
  renderDiscovery(rec.id);
  show('discovery');
  if(settings.aiAuto&&askAIFor) setTimeout(function(){ askAIFor(rec.id); },320);
}

/* =========================================================
   해석 문장 · 질문 (규칙 기반 '가능한 해석' — 사용자가 고칠 수 있다)
   ========================================================= */
function interpretOf(d){
  var emo=(d.emotions||[])[0]||'';
  var need=(d.needs||[]).filter(function(n){return !isUnsureNeed(n)})[0]||'';
  var cat=d.situation? d.situation.category:'';
  var sit=sitCatLabel(cat);
  var reaction=(d.reactions||[])[0]||'';
  if(isEN()){
    var s='';
    if(emo&&need) s='Today, '+(cat? 'around '+sit.toLowerCase()+', ':'')+'“'+emotionLabel(emo)+'” came up, and underneath there may have been a wish for “'+needLabel(need)+'”.';
    else if(emo) s='Today “'+emotionLabel(emo)+'” came up'+(cat? ' around '+sit.toLowerCase():'')+', and the wish underneath has not found its name yet.';
    else if(need) s='Today there may have been a wish for “'+needLabel(need)+'”, even without a clear feeling name.';
    else s='Today I wrote down what happened and left the feeling open for now.';
    if(reaction) s+=' My body and mind answered with “'+reactionLabel(reaction)+'”.';
    return s;
  }
  var k='';
  if(emo&&need) k='오늘은 '+(cat? '‘'+sit+'’ 상황에서 ':'')+'‘'+emotionLabel(emo)+'’'+josa(emotionLabel(emo),'이','가')+' 올라왔고, 그 아래에는 ‘'+needLabel(need)+'’의 바람이 있었던 것 같아요.';
  else if(emo) k='오늘은 '+(cat? '‘'+sit+'’ 상황에서 ':'')+'‘'+emotionLabel(emo)+'’'+josa(emotionLabel(emo),'이','가')+' 올라왔어요. 그 아래 바람은 아직 이름을 찾지 못했어요.';
  else if(need) k='오늘은 뚜렷한 감정 이름 대신 ‘'+needLabel(need)+'’의 바람이 있었던 것 같아요.';
  else k='오늘은 있었던 일을 적어두고, 감정은 잠시 열어두었어요.';
  if(reaction) k+=' 몸과 마음은 ‘'+reactionLabel(reaction)+'’으로 반응했어요.';
  return k;
}
function questionOf(r){
  var emo=emotionsOf(r)[0]||'';
  var need=needsOf(r).filter(function(n){return !isUnsureNeed(n)})[0]||'';
  if(emo&&FEEL[emo]&&FEEL[emo].question){
    var q=(isEN()&&FEEL_EN[emo]&&FEEL_EN[emo].question)? FEEL_EN[emo].question : FEEL[emo].question;
    return q;
  }
  if(isEN()){
    if(need) return 'If that wish for “'+needLabel(need)+'” were met a little, what would be different tomorrow?';
    return 'If something similar happens again, what would you like to notice a little earlier?';
  }
  if(need) return '그 ‘'+needLabel(need)+'’의 바람이 조금이라도 채워진다면, 내일 무엇이 달라질까요?';
  return '비슷한 일이 다시 생긴다면, 그때는 무엇을 조금 더 일찍 알아차리고 싶나요?';
}
function possibleReadingNote(){
  return tr('아래 내용은 기록에서 만든 <b>가능한 해석</b>이에요. 사실과 다를 수 있고, 정답이 아니에요. 고치거나 분석에서 빼둘 수 있어요.','What follows is a <b>possible reading</b> built from your entry. It may not be right — not an answer. You can rewrite it or leave it out of the analysis.');
}

/* ---------- 화면 ③ 오늘의 마음 발견 ---------- */
function renderDiscovery(id){
  var el=document.getElementById('discoveryContent'); if(!el) return;
  var r=records.filter(function(x){return x.id===id})[0];
  if(!r){ el.innerHTML='<div class="empty">'+tr('기록을 찾을 수 없어요.','That entry could not be found.')+'</div>'; return; }
  var fb=analysisOf(r).userFeedback;
  var emo=emotionsOf(r).length? emotionsOf(r).map(function(f){return '<span class="tag">'+esc(emotionLabel(f))+'</span>'}).join('') : '<span class="quiet">'+tr('오늘은 감정을 고르지 않았어요','No feeling picked today')+'</span>';
  var ns=needsOf(r).filter(function(n){return !isUnsureNeed(n)});
  var needs=ns.length? ns.map(function(n){return '<span class="tag depth">'+esc(needLabel(n))+'</span>'}).join('') : '<span class="quiet">'+tr('아직 잘 모르겠어요','Not sure yet')+'</span>';
  var sit=situationString(r);
  var clue=mainClueFor(r);
  var html='';
  html+='<div class="hero"><div class="eyebrow">TODAY’S DISCOVERY ✧</div><h2>'+tr('오늘의 마음 발견','Today’s discovery')+'</h2><p>'+esc(dstr(r.date))+'</p></div>';
  html+='<div class="card">';
  html+='<div class="card-title">'+tr('오늘의 감정','Feelings today')+'</div><div class="chips">'+emo+'</div>';
  html+='<div class="detail-label">'+tr('내가 원했던 것 (욕구)','What I wanted')+'</div><div class="chips">'+needs+'</div>';
  if(sit) html+='<div class="detail-label">'+tr('적어둔 상황','What I wrote')+'</div><div class="detail-text">'+esc(cut(sit,240))+'</div>';
  if(reactionsOf(r).length) html+='<div class="detail-label">'+tr('몸과 마음의 반응','Body and mind')+'</div><div class="detail-text">'+esc(reactionsOf(r).map(reactionLabel).join(' · '))+'</div>';
  html+='</div>';
  html+='<div class="card"><div class="card-title">'+tr('오늘의 마음 한 문장','Today’s feeling in one sentence')+'</div>';
  html+='<div class="read-note">'+possibleReadingNote()+'</div>';
  html+='<textarea class="field" id="discSentence" maxlength="240">'+esc(sentenceOf(r))+'</textarea>';
  html+='<div class="row" style="margin-top:9px"><button class="btn small" onclick="saveSentence('+r.id+')">'+tr('이 문장으로 저장','Keep this sentence')+'</button><button class="btn secondary small" onclick="askAIFor('+r.id+')">'+(aiState.loading?'…':tr('✦ AI에게 더 묻기','✦ Ask AI'))+'</button></div>';
  if(r.ai&&r.ai.comment){
    html+='<div class="ai-box" style="margin-top:11px"><div class="ai-h">AI · '+tr('가능한 해석','possible reading')+'</div><div class="ai-text">'+esc(r.ai.comment)+'</div>'+(r.ai.question?'<div class="ai-q">'+esc(r.ai.question)+'</div>':'')+'</div>';
  }
  html+='</div>';
  html+='<div class="card"><div class="card-title">'+tr('나에게 남기는 질문','A question to keep')+'</div><div class="qbox">'+esc(r.ai&&r.ai.question? r.ai.question : questionOf(r))+'</div><p class="quiet" style="margin-top:9px">'+tr('답을 지금 하지 않아도 괜찮아요. 다음 기록에서 이어질 수 있어요.','You don’t have to answer now. It can carry into your next entry.')+'</p></div>';
  if(clue){
    html+='<div class="card clue"><div class="clue-h">✨ '+tr('최근 발견한 마음','Recently found')+' <span class="clue-badge">'+esc(clue.badge)+'</span></div><p class="clue-say">'+clue.sentence+'</p><p class="quiet" style="margin-top:6px">'+esc(clue.evidenceLine||'')+'</p><button class="btn secondary small" style="margin-top:10px" onclick="openPattern(\''+esc(clue.id)+'\')">'+tr('관련 기록 살펴보기','Look at the related entries')+'</button></div>';
  }
  html+='<div class="card"><div class="card-title">'+tr('이 해석이 맞나요?','Does this reading fit?')+'</div><p class="prompt">'+tr('틀렸다고 느끼면 분석에서 빼둘 수 있어요. 기록 자체는 그대로 남아요.','If it feels wrong, you can leave it out of the analysis. The entry itself stays.')+'</p>';
  html+='<div class="row"><button class="btn secondary small" onclick="startEdit('+r.id+')">'+tr('✎ 직접 수정','✎ Edit')+'</button><button class="btn ghost small" onclick="setAnalysisFeedback('+r.id+',\''+(fb==='rejected'?'':'rejected')+'\')">'+(fb==='rejected'? tr('↺ 분석에 다시 포함','↺ Include again') : tr('✕ 틀렸어요 (분석 제외)','✕ Not right (leave out)'))+'</button></div>';
  if(fb) html+='<p class="okline">'+(fb==='rejected'? tr('이 기록은 패턴 분석에서 제외되어 있어요.','This entry is excluded from pattern analysis.') : (fb==='partial'? tr('‘일부 달라요’로 표시했어요.','Marked as “partly different”.') : tr('‘맞아요’로 표시했어요.','Marked as “fits”.')))+'</p>';
  html+='<button class="btn secondary small" style="margin-top:9px" onclick="openDeep('+r.id+')">'+tr('🧊 이 기록의 심층 리포트 (방어기제 · AI)','🧊 Deep report for this entry')+'</button>';
  html+='</div>';
  html+='<div class="row"><button class="btn" onclick="show(\'home\')">'+tr('홈으로','Home')+'</button><button class="btn secondary" onclick="show(\'report\')">'+tr('리포트 보기','Report')+'</button></div>';
  el.innerHTML=html;
}
function saveSentence(id){
  var r=records.filter(function(x){return x.id===id})[0]; if(!r) return;
  var el=document.getElementById('discSentence'); if(!el) return;
  var v=String(el.value||'').replace(/\s+/g,' ').trim();
  r.selfExpression=v; r.action=v;
  persist(); if(cloudPushOne) cloudPushOne(r);
  toast(tr('내 문장으로 저장했어요','Saved as your own sentence'));
  renderDiscovery(id);
}
function setAnalysisFeedback(id,fb){
  var r=records.filter(function(x){return x.id===id})[0]; if(!r) return;
  r.analysis={confirmed:fb==='confirmed'?true:(fb==='rejected'?false:null),userFeedback:fb||'',at:nowISO()};
  persist(); if(cloudPushOne) cloudPushOne(r);
  toast(fb==='rejected'? tr('이 기록은 분석에서 빼두었어요','Left out of the analysis') : tr('다시 분석에 포함했어요','Included in the analysis again'));
  renderDiscovery(id);
}
function toggleExclude(id,exclude){ setAnalysisFeedback(id, exclude?'rejected':''); }

/* ---------- 30초 퀵 기록 ---------- */
var quickFeels=[], QUICK_MAX=3;
function startQuick(){ quickFeels=[]; renderQuick(); show('quick'); }
function renderQuick(){
  var box=document.getElementById('quickChips'); if(!box) return;
  box.innerHTML=EMOTIONS.map(function(f){ return '<button type="button" class="chip '+(quickFeels.indexOf(f)>=0?'selected':'')+'" data-qf="'+esc(f)+'">'+esc(emotionLabel(f))+'</button>'; }).join('');
  var els=box.querySelectorAll('[data-qf]'),i;
  for(i=0;i<els.length;i++){ (function(el){ el.addEventListener('click',function(){ toggleQuickFeeling(el.getAttribute('data-qf')); }); })(els[i]); }
  var cnt=document.getElementById('quickCount'); if(cnt) cnt.textContent=quickFeels.length+' / '+QUICK_MAX;
  var btn=document.getElementById('quickSave');
  if(btn){ btn.disabled=!quickFeels.length; btn.textContent=quickFeels.length? tr('저장하고 발견 보기','Save and see the discovery') : tr('감정을 하나 골라 주세요','Pick one feeling'); }
}
function toggleQuickFeeling(f){
  if(quickFeels.indexOf(f)>=0) quickFeels=quickFeels.filter(function(x){return x!==f});
  else if(quickFeels.length<QUICK_MAX) quickFeels=quickFeels.concat([f]);
  else toast(tr('감정은 '+QUICK_MAX+'개까지 고를 수 있어요','Up to '+QUICK_MAX+' feelings'));
  renderQuick();
}
function saveQuick(){
  if(!quickFeels.length){ toast(tr('감정을 하나 골라 주세요','Pick one feeling')); return; }
  var noteEl=document.getElementById('quickNote');
  var note=noteEl? String(noteEl.value||'').trim() : '';
  var rec=normalizeRecord({id:Date.now(),date:nowISO(),situation:note,situationCategory:inferSitCat(note),
    emotions:quickFeels.slice(),reactions:[],thoughts:note,needs:[],selfExpression:'',
    analysis:{confirmed:null,userFeedback:'',at:''},source:'quick',schema:3});
  if(!rec.selfExpression) rec.selfExpression=interpretOf(draftFromRecord(rec));
  records.unshift(rec); records.sort(function(a,b){return new Date(b.date)-new Date(a.date)});
  persist(); if(cloudPushOne) cloudPushOne(rec);
  quickFeels=[]; if(noteEl) noteEl.value='';
  detailId=rec.id; renderDiscovery(rec.id); show('discovery');
}

/* ---------- 3초 원탭 (기존 칩 그대로) ---------- */
var TAP_SIT=[
  {k:'직장·업무',en:'work',cat:'일·업무'},
  {k:'사람과의 일',en:'a problem with someone',cat:'관계'},
  {k:'가족',en:'family',cat:'가족'},
  {k:'연인·친구',en:'my partner or a friend',cat:'관계'},
  {k:'연락·관계',en:'messages and contact',cat:'관계'},
  {k:'돈·일정',en:'money and plans',cat:'돈·생활'},
  {k:'내 자신',en:'myself',cat:'기타'},
  {k:'잠·몸',en:'sleep and my body',cat:'몸·건강'},
  {k:'그냥 하루',en:'just the day',cat:'기타'}
];
var TAP_REACT=[
  {k:'가슴이 답답해요',en:'my chest feels tight'},
  {k:'자꾸 생각나요',en:'I keep thinking about it'},
  {k:'화가 치밀어요',en:'anger rising'},
  {k:'눈물이 날 것 같아요',en:'close to tears'},
  {k:'아무것도 못 하겠어요',en:"I can't get anything done"},
  {k:'멍해져요',en:'I feel numb'},
  {k:'잠이 안 와요',en:"I can't sleep"},
  {k:'괜찮은 척했어요',en:'I pretended to be fine'},
  {k:'몸이 무거워요',en:'my body feels heavy'}
];
var tapSit=null, tapFeels=[], tapReacts=[];
function tapLabel(o){ return isEN()? (o.en||o.k) : o.k; }
function startTap(){ tapSit=null; tapFeels=[]; tapReacts=[]; renderTap(); show('tap'); }
function tapReady(){ return tapFeels.length>0 && ((tapSit?1:0)+tapFeels.length+tapReacts.length)>=2; }
function renderTap(){
  var box=document.getElementById('tapBody'); if(!box) return;
  var h='';
  h+='<div class="tap-group"><div class="tap-h"><b>1</b>'+tr('어떤 일이었나요?','What was it about?')+'<em>'+tr('선택','optional')+'</em></div><div class="tap-chips">'
    +TAP_SIT.map(function(o){ return '<button type="button" class="chip '+(tapSit===o.k?'selected':'')+'" data-ts="'+esc(o.k)+'">'+esc(tapLabel(o))+'</button>'; }).join('')+'</div></div>';
  h+='<div class="tap-group"><div class="tap-h"><b>2</b>'+tr('지금 감정은?','How do you feel now?')+'<em>'+tr('1개 이상','at least one')+'</em></div><div class="tap-chips">'
    +EMOTIONS.map(function(f){ return '<button type="button" class="chip '+(tapFeels.indexOf(f)>=0?'selected':'')+'" data-tf="'+esc(f)+'">'+esc(emotionLabel(f))+'</button>'; }).join('')+'</div></div>';
  h+='<div class="tap-group"><div class="tap-h"><b>3</b>'+tr('몸과 마음의 반응','Body and mind')+'<em>'+tr('선택','optional')+'</em></div><div class="tap-chips">'
    +TAP_REACT.map(function(o){ return '<button type="button" class="chip '+(tapReacts.indexOf(o.k)>=0?'selected':'')+'" data-tr="'+esc(o.k)+'">'+esc(tapLabel(o))+'</button>'; }).join('')+'</div></div>';
  h+='<div class="tap-preview">'+(tapReady()
      ? '<b>'+tr('이렇게 저장돼요','This is what saves')+'</b><br>'+esc([tapSit,tapFeels.map(emotionLabel).join(' · '),tapReacts.join(' · ')].filter(Boolean).join(' · '))
      : tr('칩을 두 개만 눌러도 저장할 수 있어요.','Two taps are enough to save.'))+'</div>';
  h+='<div class="tap-count">'+tr('저장하면 오늘의 마음 발견 화면이 열려요','Saving opens today’s discovery screen')+'</div>';
  h+='<button class="btn quick" onclick="saveTap()" '+(tapReady()?'':'disabled')+'>'+tr('저장하고 발견 보기','Save and see the discovery')+'</button>';
  box.innerHTML=h;
  var a=box.querySelectorAll('[data-ts]'),b=box.querySelectorAll('[data-tf]'),c=box.querySelectorAll('[data-tr]'),i;
  for(i=0;i<a.length;i++){ (function(el){ el.addEventListener('click',function(){ tapSit=(tapSit===el.getAttribute('data-ts')?null:el.getAttribute('data-ts')); renderTap(); }); })(a[i]); }
  for(i=0;i<b.length;i++){ (function(el){ el.addEventListener('click',function(){ var k=el.getAttribute('data-tf'); tapFeels=tapFeels.indexOf(k)>=0? tapFeels.filter(function(x){return x!==k}) : tapFeels.concat([k]); renderTap(); }); })(b[i]); }
  for(i=0;i<c.length;i++){ (function(el){ el.addEventListener('click',function(){ var k=el.getAttribute('data-tr'); tapReacts=tapReacts.indexOf(k)>=0? tapReacts.filter(function(x){return x!==k}) : tapReacts.concat([k]); renderTap(); }); })(c[i]); }
}
function saveTap(){
  if(!tapReady()){ toast(tr('감정을 하나 골라 주세요','Pick one feeling')); return; }
  var cat=''; TAP_SIT.forEach(function(o){ if(o.k===tapSit) cat=o.cat; });
  var rec=normalizeRecord({id:Date.now(),date:nowISO(),situation:tapSit||'',situationCategory:cat,
    emotions:tapFeels.slice(),reactions:tapReacts.slice(),thoughts:'',needs:[],selfExpression:'',
    analysis:{confirmed:null,userFeedback:'',at:''},source:'tap',schema:3});
  rec.selfExpression=interpretOf(draftFromRecord(rec));
  records.unshift(rec); records.sort(function(a,b){return new Date(b.date)-new Date(a.date)});
  persist(); if(cloudPushOne) cloudPushOne(rec);
  tapSit=null; tapFeels=[]; tapReacts=[];
  detailId=rec.id; renderDiscovery(rec.id); show('discovery');
}

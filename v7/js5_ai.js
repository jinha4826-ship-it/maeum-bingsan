/* =========================================================
   AI — 자기 탐구 안내자 (기존 Worker 계약 유지 + 2.0 필드)
   · 요청할 때만 전송, 서버 저장 없음. 실패해도 기록·조회는 정상.
   ========================================================= */
function aiPayloadFor(r){
  return {
    situation: situationString(r),
    feelings: emotionsOf(r).map(emotionLabel).join(', '),
    needs: needsOf(r).filter(function(x){return !isUnsureNeed(x)}).map(needLabel).join(', '),
    perspective: thoughtsOf(r),
    action: sentenceOf(r),
    reactions: reactionsOf(r).map(reactionLabel).join(', '),
    lang: LANG,
    history: (typeof aiHistoryOf==='function')? aiHistoryOf(r) : []
  };
}
function postWorker(body,ms){
  var url=AI_WORKER;
  var opt={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  var f=(typeof fetchTimeout==='function')? fetchTimeout(url,opt,ms||11000) : fetch(url,opt);
  return f.then(function(res){
    if(!res||!res.ok) throw new Error('http_'+(res?res.status:'0'));
    return res.json();
  });
}
function askAIFor(id){
  var r=records.filter(function(x){return x.id===id})[0]; if(!r) return;
  aiState.loading=true; aiState.error='';
  if(currentView==='discovery') renderDiscovery(id);
  else if(currentView==='deep'&&deepId===id) refreshAI();
  postWorker(aiPayloadFor(r),13000).then(function(d){
    if(!d||(!d.comment&&!d.question)) throw new Error('empty');
    r.ai={comment:String(d.comment||''),question:String(d.question||''),connection:String(d.connection||''),sentence:'',lang:String(d.lang||LANG),at:nowISO(),model:String(d.model||'server')};
    aiState.loading=false;
    persist(); if(cloudPushOne) cloudPushOne(r);
    if(currentView==='discovery'&&detailId===id) renderDiscovery(id);
    else if(currentView==='deep') refreshAI();
    toast(tr('AI 해석을 받았어요','AI reading received'));
  }).catch(function(e){
    aiState.loading=false;
    r.ai={comment:localGuideComment(r),question:questionOf(r),connection:'',sentence:'',lang:LANG,at:nowISO(),model:'local'};
    aiState.loading=false; aiState.localText={comment:r.ai.comment,question:r.ai.question,connection:''};
    persist();
    if(currentView==='discovery'&&detailId===id) renderDiscovery(id);
    else if(currentView==='deep') refreshAI();
    toast(tr('AI 서버에 닿지 않아 기기 안 해석으로 보여드려요','AI server unreachable — showing the on-device reading'));
  });
}
function localGuideComment(r){
  var emo=emotionsOf(r)[0]||'';
  var need=needsOf(r).filter(function(x){return !isUnsureNeed(x)})[0]||'';
  var rea=reactionsOf(r)[0]||'';
  if(isEN()){
    var s='Today you wrote about '+(emo? '“'+emotionLabel(emo)+'”':'what happened');
    if(need) s+=', and underneath there may have been a wish for “'+needLabel(need)+'”';
    s+='. ';
    if(rea) s+='Your body and mind answered with “'+reactionLabel(rea)+'”. ';
    s+='This is only one possible reading of your entry — you know the day better than this app does.';
    return s;
  }
  var k='오늘 적어주신 기록에서 '+(emo? '‘'+emotionLabel(emo)+'’이 보였어요':'있었던 일이 보였어요');
  if(need) k+=', 그 아래에는 ‘'+needLabel(need)+'’의 바람이 있었던 것 같아요';
  k+='. ';
  if(rea) k+='몸과 마음은 ‘'+reactionLabel(rea)+'’으로 반응했고요. ';
  k+='이건 기록에서 읽어본 가능한 해석 중 하나예요. 그날을 가장 잘 아는 건 앱이 아니라 나예요.';
  return k;
}
function askSentenceAI(){
  var btn=document.getElementById('aiSentenceBtn');
  var ta=document.getElementById('sentenceText');
  if(btn){ btn.disabled=true; btn.textContent=tr('AI가 문장을 다듬는 중…','AI is tidying the sentence…'); }
  var d=draft||emptyDraft();
  collectCurrent();
  d=draft||emptyDraft();
  postWorker({
    mode:'sentence',
    situation:String(d.situation.description||''),
    feelings:(d.emotions||[]).map(emotionLabel).join(', '),
    needs:(d.needs||[]).filter(function(x){return !isUnsureNeed(x)}).map(needLabel).join(', '),
    reactions:(d.reactions||[]).map(reactionLabel).join(', '),
    lang:LANG
  },12000).then(function(res){
    var s=res&&(res.sentence||res.comment);
    if(!s) throw new Error('empty');
    if(ta) ta.value=String(s).replace(/\s+/g,' ').trim();
    toast(tr('AI가 다듬은 문장이에요 · 직접 고쳐도 돼요','AI’s version — edit it however you like'));
  }).catch(function(){
    if(ta&&!ta.value.trim()) ta.value=interpretOf(d);
    toast(tr('AI에 닿지 않아 기기에서 만든 문장을 넣었어요','AI unreachable — used the sentence made on this device'));
  }).then(function(){
    if(btn){ btn.disabled=false; btn.textContent=tr('✦ AI 도움 받아 다듬기','✦ Tidy it with AI'); }
  });
}

/* ---------- 초기화 ---------- */
(function(){
  try{ loadAll(); }catch(e){}
  try{ syncLangUI2(); }catch(e){}
  try{ renderHomeTop(); renderRecent(); }catch(e){}
  try{ var el=document.getElementById('layerInfo'); if(el) el.setAttribute('data-ready','1'); }catch(e){}
})();

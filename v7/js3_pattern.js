/* =========================================================
   규칙 기반 패턴 분석 엔진 (analyzePatterns)
   패턴 유형: situation / emotion / need / connection(situation_emotion_need)

   신뢰도 규칙
   · 관련 기록 1개                       → 개별 기록 (반복 패턴이라 부르지 않음)
   · 같은 항목 2개 (서로 다른 2일 이상)   → 반복 가능성 관찰
   · 같은 항목 3개 이상 & 서로 다른 날 3일 이상 → 반복 단서
     → 하루에 몰아 쓴 3건(recordCount 3, distinctDays 1)은 절대 단서가 아니다.
   · 한 기록에 같은 감정이 중복 입력돼도 1회만, 복수 감정은 각각 1회씩 센다.
   · 최근 7일과 전체는 각각 따로 계산한다(섞지 않는다).
   ========================================================= */
var LS_PAT='maeum-pattern-state';
function patternStateStore(){
  try{ var o=JSON.parse(localStorage.getItem(LS_PAT)||'{}'); return (o&&typeof o==='object')?o:{}; }catch(e){ return {}; }
}
function savePatternState(o){ try{ localStorage.setItem(LS_PAT,JSON.stringify(o)); }catch(e){} }
function patternStateOf(id){
  var s=patternStateStore()[id];
  return (s&&typeof s==='object'&&s.status)? s : null;
}
function setPatternFeedback(id,status,pat){
  var store=patternStateStore();
  store[id]={status:status,snapshot:pat?{count:pat.count,distinctDays:pat.distinctDays,evidence:pat.evidenceIds.slice()}:{},at:nowISO()};
  savePatternState(store);
  renderPatternUi();
}
function renderPatternUi(){
  if(currentView==='map') renderMap(); else if(currentView==='report') renderReport(); else if(currentView==='layer') renderLayer(); else if(currentView==='home'){ renderHomeTop(); }
  else if(currentView==='discovery'&&detailId!=null) renderDiscovery(detailId);
}

/* 최근 7일 / 전체 — 각자 자기 기간만 센다 */
function scopeRecords(scope){
  var list=records.filter(function(r){ return !recordRejected(r); });
  if(scope==='7'){
    var from=Date.now()-7*86400000;
    list=list.filter(function(r){ var t=new Date(r.date).getTime(); return t>=from; });
  }
  return list;
}
/* 단계 구분 — 1~2건 관찰 / 3~6건 초기 단서 / 7건+ 패턴 탐색 / 14건+ 기간 비교 */
function patternLevel(n){ if(n>=14) return 4; if(n>=7) return 3; if(n>=3) return 2; if(n>=1) return 1; return 0; }
function levelTitle(lv){ return isEN()? ['No entries yet','Observation','Early clues','Looking for patterns','Comparing periods'][lv] : ['아직 기록 없음','관찰 단계','초기 단서','패턴 탐색','기간별 비교'][lv]; }
function levelNote(n){
  var lv=patternLevel(n);
  if(lv===0) return isEN()? 'Patterns are not made up here. Record once and the first observation begins.' : '없는 패턴은 만들지 않아요. 한 번 기록하면 첫 관찰이 시작돼요.';
  if(lv===1) return isEN()? n+' entr'+(n===1?'y':'ies')+' so far — too early to call anything a repeat.' : '지금 '+n+'건이라 아직 ‘반복’이라고 부를 수 없어요. 한두 번만 더 쌓이면 단서가 보이기 시작해요.';
  if(lv===2) return isEN()? 'Clues observed in your recent '+n+' entries · this is not a definitive personality analysis.' : '최근 기록 '+n+'건에서 관찰된 단서 · 확정적인 성격 분석이 아닙니다';
  if(lv===3) return isEN()? 'In '+n+' entries situations, feelings and wishes begin to link up.' : '기록 '+n+'건에서 상황·감정·욕구의 연결이 보이기 시작했어요.';
  return isEN()? n+' entries — enough to compare one period with another.' : '기록 '+n+'건 — 기간을 나눠 비교해 볼 수 있는 양이에요.';
}
function itemLabel(kind,key){
  if(kind==='emotion') return emotionLabel(key);
  if(kind==='situation') return sitCatLabel(key);
  if(kind==='need') return needLabel(key);
  if(kind==='reaction') return reactionLabel(key);
  if(kind==='cross'||kind==='connection') return String(key);
  return String(key||'');
}
function distinctDaysOf(list){
  return uniq(list.map(function(r){ return dayKey(new Date(r.date)); }));
}
function confidenceOf(count,days){
  if(count>=3&&days>=3) return 'clue';
  if(count>=2&&days>=2) return 'repeat_possible';
  return 'record';
}
function confidenceLabel(lv){
  return isEN()? ({record:'single entry',repeat_possible:'possible repetition',clue:'repeating clue'}[lv]||lv)
               : ({record:'개별 기록',repeat_possible:'반복 가능성 관찰',clue:'반복 단서'}[lv]||lv);
}
function patternSentence(type,key,count,days,n,extra){
  var lab=itemLabel(type,key);
  if(isEN()){
    if(type==='situation') return 'In '+count+' of '+n+' entries the situation was '+lab.toLowerCase()+' — on '+days+' different days.';
    if(type==='emotion') return '“'+lab+'” came up in '+count+' of '+n+' entries, on '+days+' different days.';
    if(type==='need') return 'A wish for “'+lab+'” was written in '+count+' of '+n+' entries, on '+days+' different days.';
    if(type==='connection') return 'In '+count+' entries the situation was '+extra.situation.toLowerCase()+', the feeling “'+extra.emotion+'” and a wish for “'+extra.need+'” were written together — on '+days+' different days.';
    return '';
  }
  if(type==='situation') return '최근 기록 '+n+'건 중 '+count+'건이 ‘'+lab+'’ 상황이었어요. 서로 다른 '+days+'일에 걸쳐 있었어요.';
  if(type==='emotion') return '최근 기록 '+n+'건 중 '+count+'건에서 ‘'+lab+'’'+josa(lab,'이','가')+' 올라왔어요. 서로 다른 '+days+'일의 기록이에요.';
  if(type==='need') return '최근 기록 '+n+'건 중 '+count+'건에 ‘'+lab+'’의 바람이 적혀 있었어요. 서로 다른 '+days+'일이에요.';
  if(type==='connection') return '‘'+extra.situation+'’ 상황에서 ‘'+extra.emotion+'’이 올라오고 ‘'+extra.need+'’의 바람이 함께 적힌 기록이 '+count+'건이에요. 서로 다른 '+days+'일의 기록에서 같은 조합이 보였어요.';
  return '';
}
function makePattern(type,key,list,extra,n){
  var ev=list;
  var days=distinctDaysOf(ev);
  var lv=confidenceOf(ev.length,days.length);
  return {
    id:type+'|'+key,
    type:type, key:key,
    keys:extra||null,
    count:ev.length,
    distinctDays:days.length,
    days:days,
    evidenceIds:ev.map(function(r){ return r.id; }),
    level:lv,
    label:itemLabel(type,key),
    sentence:patternSentence(type,key,ev.length,days.length,n||ev.length,extra||{})
  };
}
function analyzePatterns(scope){
  scope=(scope==='7')?'7':'all';
  var list=scopeRecords(scope);
  var n=list.length;
  var all=[];

  /* 상황 패턴 — 한 기록에 한 상황이므로 기록 수 = 항목 수 */
  var sitBy={};
  list.forEach(function(r){ var c=sitCatOf(r); if(!c) return; (sitBy[c]=sitBy[c]||[]).push(r); });
  Object.keys(sitBy).forEach(function(k){ all.push(makePattern('situation',k,sitBy[k],null,n)); });

  /* 감정 패턴 — 한 기록 안의 중복은 1회, 여러 감정은 각각 1회 */
  var emoBy={};
  list.forEach(function(r){ uniq(emotionsOf(r)).forEach(function(f){ (emoBy[f]=emoBy[f]||[]).push(r); }); });
  Object.keys(emoBy).forEach(function(k){ all.push(makePattern('emotion',k,emoBy[k],null,n)); });

  /* 욕구 패턴 — 욕구가 없는 기록은 집계에서 자연히 빠진다 */
  var needBy={};
  list.forEach(function(r){ needsOf(r).filter(function(x){return !isUnsureNeed(x)}).forEach(function(nd){ (needBy[nd]=needBy[nd]||[]).push(r); }); });
  Object.keys(needBy).forEach(function(k){ all.push(makePattern('need',k,needBy[k],null,n)); });

  /* 연결 패턴 — 상황·감정·욕구가 '같은 기록'에 실제로 함께 있는 경우만 */
  var triBy={};
  list.forEach(function(r){
    var sit=sitCatOf(r); if(!sit) return;
    var es=uniq(emotionsOf(r)); var ns=needsOf(r).filter(function(x){return !isUnsureNeed(x)});
    if(!es.length||!ns.length) return;
    es.forEach(function(e){ ns.forEach(function(nd){
      var k=sit+'||'+e+'||'+nd;
      (triBy[k]=triBy[k]||[]).push(r);
    }); });
  });
  Object.keys(triBy).forEach(function(k){
    var parts=k.split('||');
    var ev=triBy[k];
    /* 같은 기록이 중복으로 들어가지 않도록 id 기준 1회만 */
    var seen={}, uniqEv=[];
    ev.forEach(function(r){ if(!seen[r.id]){ seen[r.id]=1; uniqEv.push(r); } });
    var days=distinctDaysOf(uniqEv);
    var lv=confidenceOf(uniqEv.length,days.length);
    var p=makePattern('connection',k,uniqEv,{situation:sitCatLabel(parts[0]),emotion:emotionLabel(parts[1]),need:needLabel(parts[2]),situationKey:parts[0],emotionKey:parts[1],needKey:parts[2]},n);
    p.label=sitCatLabel(parts[0])+' · '+emotionLabel(parts[1])+' · '+needLabel(parts[2]);
    p.level=lv;
    p.sentence=patternSentence('connection',k,uniqEv.length,days.length,n,p.keys);
    /* 검증: 세 요소가 정말 같은 기록에 있는지 다시 확인 */
    p.verified=p.evidenceIds.every(function(id){
      var r=records.filter(function(x){return x.id===id})[0]; if(!r) return false;
      return sitCatOf(r)===parts[0] && emotionsOf(r).indexOf(parts[1])>=0 && needsOf(r).indexOf(parts[2])>=0;
    });
    all.push(p);
  });

  /* 인사이트 1 · 서로 다른 상황을 가로지르는 반복 (crossSituationPatterns) */
  crossSituationPatterns(list).forEach(function(p){ all.push(p); });

  /* 상태(후보/확인/거부) 붙이기 */
  all.forEach(function(p){
    var st=patternStateOf(p.id);
    var visible=true, status='candidate';
    if(st){
      if(st.status==='rejected'){
        var snap=st.snapshot||{};
        var changed=(p.count>=(snap.count||0)+2)||(p.distinctDays>=(snap.distinctDays||0)+2);
        visible=changed; status=changed?'candidate':'rejected';
      }else status=st.status;
    }
    p.status=status; p.hidden=!visible; p.state=st;
  });

  var active=all.filter(function(p){ return !p.hidden && p.level!=='record'; })
    .sort(function(a,b){
      var rank={clue:0,repeat_possible:1,record:2};
      if(rank[a.level]!==rank[b.level]) return rank[a.level]-rank[b.level];
      if(b.distinctDays!==a.distinctDays) return b.distinctDays-a.distinctDays;
      return b.count-a.count;
    });
  var observations=all.filter(function(p){ return !p.hidden && p.level==='record'; })
    .sort(function(a,b){ return b.count-a.count; });
  return {
    scope:scope, n:n, list:list,
    lv:patternLevel(n), levelLabel:levelTitle(patternLevel(n)),
    note:levelNote(n),
    patterns:all, active:active, observations:observations,
    connections:active.filter(function(p){return p.type==='connection'&&p.verified;}),
    crosses:active.filter(function(p){return p.type==='cross';}),
    mismatches:mismatchInsights(list),
    blindSpots:blindSpots(list),
    top:{situation:byType(active,'situation')[0]||null,emotion:byType(active,'emotion')[0]||null,need:byType(active,'need')[0]||null}
  };
}

/* =========================================================
   인사이트 1 · crossSituationPatterns
   같은 상황이 아니라 '서로 다른 상황'에서 같은 감정→욕구가 반복될 때
   (distinctSituations >= 2, distinctDays >= 3, 기록 3건 이상)
   ========================================================= */
function crossSituationPatterns(list){
  var out=[];
  var byPair={};
  list.forEach(function(r){
    var sit=sitCatOf(r); if(!sit) return;
    var es=uniq(emotionsOf(r));
    var ns=needsOf(r).filter(function(x){return !isUnsureNeed(x)});
    es.forEach(function(e){
      if(ns.length) ns.forEach(function(nd){ var k=e+'||'+nd; (byPair[k]=byPair[k]||[]).push(r); });
      else { var k2=e+'||'; (byPair[k2]=byPair[k2]||[]).push(r); }
    });
    if(!es.length) ns.forEach(function(nd){ var k3='||'+nd; (byPair[k3]=byPair[k3]||[]).push(r); });
  });
  Object.keys(byPair).forEach(function(k){
    var parts=k.split('||'), e=parts[0], nd=parts[1];
    var ev=byPair[k], seen={}, uniqEv=[];
    ev.forEach(function(r){ if(!seen[r.id]){ seen[r.id]=1; uniqEv.push(r); } });
    var sits=uniq(uniqEv.map(sitCatOf).filter(Boolean));
    var days=distinctDaysOf(uniqEv);
    if(uniqEv.length<3||days.length<3||sits.length<2) return;
    var label=(e?emotionLabel(e):'')+(e&&nd?' → ':'')+(nd?needLabel(nd):'');
    var sentence;
    if(isEN()){
      var sl=sits.map(sitCatLabel).join(', ');
      sentence='The situations were different — '+sl+' — but '+(e?'“'+emotionLabel(e)+'” ':'')+(nd?'and a wish for “'+needLabel(nd)+'” ':'')+'kept coming back together ('+uniqEv.length+' entries over '+days.length+' days).';
    }else{
      var slk=sits.map(sitCatLabel).join(' · ');
      sentence='상황은 ‘'+slk+'’처럼 서로 달랐지만, '+(e?'‘'+emotionLabel(e)+'’'+(nd?'과 ':''):'')+(nd?'‘'+needLabel(nd)+'’의 바람이 ':'')+'함께 '+uniqEv.length+'건에서 반복됐어요 (서로 다른 '+days.length+'일).';
    }
    out.push({id:'cross|'+k,type:'cross',key:k,emotion:e,need:nd,count:uniqEv.length,distinctDays:days.length,
      distinctSituations:sits.length,situations:sits,evidenceIds:uniqEv.map(idOf),level:'clue',label:label,sentence:sentence});
  });
  return out;
}

/* =========================================================
   인사이트 2 · mismatchInsights
   욕구는 연결·표현 쪽인데 같은 기록의 반응이 억제·회피 쪽일 때 — 단정 대신 질문으로
   ========================================================= */
var CONNECT_NEEDS=['인정','이해','관심','존중','표현','함께함'];
var SUPPRESS_REACTS=['괜찮은 척했어요','아무것도 못 했다','말을 못 하고 삼켰다','자리를 피했다','웃으며 넘겼다','다른 일로 바빴다','멍해져요','괜찮은 척'];    
function mismatchInsights(list){
  var ev=list.filter(function(r){
    var ns=needsOf(r);
    var rs=reactionsOf(r);
    var hasNeed=ns.some(function(x){ return CONNECT_NEEDS.indexOf(x)>=0; });
    var hasSup=rs.some(function(x){ return SUPPRESS_REACTS.indexOf(x)>=0; });
    return hasNeed&&hasSup;
  });
  if(!ev.length) return [];
  var days=distinctDaysOf(ev);
  if(ev.length<3||days.length<3) return [];
  var needC={}, reaC={};
  ev.forEach(function(r){
    needsOf(r).filter(function(x){return CONNECT_NEEDS.indexOf(x)>=0}).forEach(function(x){ needC[x]=(needC[x]||0)+1; });
    reactionsOf(r).filter(function(x){return SUPPRESS_REACTS.indexOf(x)>=0}).forEach(function(x){ reaC[x]=(reaC[x]||0)+1; });
  });
  var needTop=Object.keys(needC).sort(function(a,b){return needC[b]-needC[a]})[0]||'';
  var reaTop=Object.keys(reaC).sort(function(a,b){return reaC[b]-reaC[a]})[0]||'';
  var q=isEN()
    ? 'In '+ev.length+' entries (over '+days.length+' days) the wish was for “'+needLabel(needTop)+'”, while the reaction written down was “'+reactionLabel(reaTop)+'”. Might what you wish for and how it comes out be moving in different directions?'
    : '원하는 마음은 ‘'+needLabel(needTop)+'’인데, 실제 반응은 ‘'+reactionLabel(reaTop)+'’으로 이어진 기록이 '+ev.length+'건(서로 다른 '+days.length+'일) 있어요. 바라는 것과 표현 방식이 조금 다르게 움직이고 있진 않나요?';
  return [{id:'mismatch|'+needTop+'|'+reaTop,type:'mismatch',need:needTop,reaction:reaTop,count:ev.length,distinctDays:days.length,evidenceIds:ev.map(idOf),sentence:q}];
}

/* =========================================================
   인사이트 3 · blindSpots
   기록이 충분히 쌓였을 때(7건 이상·서로 다른 3일 이상) 한 번도 고르지 않은 영역 1개만 부드럽게
   ========================================================= */
function blindSpots(list){
  if(list.length<7) return [];
  if(distinctDaysOf(list).length<3) return [];
  var usedEmo=uniq([].concat.apply([],list.map(function(r){return emotionsOf(r)})));
  var usedNeed=uniq([].concat.apply([],list.map(function(r){return needsOf(r).filter(function(x){return !isUnsureNeed(x)})})));
  var unEmo=EMOTIONS.filter(function(e){ return usedEmo.indexOf(e)<0; });
  var unNeed=NEED_KEYS.filter(function(n){ return usedNeed.indexOf(n)<0; });
  if(unEmo.length){
    var e=unEmo[0];
    return [{id:'blind|emotion|'+e,type:'blind',kind:'emotion',key:e,
      sentence:isEN()
        ? '“'+emotionLabel(e)+'” has not been picked in any entry so far. It may simply not be part of your days — or it may be one that is hard to name. Was there a moment like that recently?'
        : '지금까지 ‘'+emotionLabel(e)+'’은 한 번도 고르지 않았어요. 그 감정이 없어서일 수도 있고, 잘 올라오지 않는 것일 수도 있어요. 요즘 그런 마음이 스쳤던 순간이 있었는지 한 번 떠올려 볼까요?'}];
  }
  if(unNeed.length){
    var n=unNeed[0];
    return [{id:'blind|need|'+n,type:'blind',kind:'need',key:n,
      sentence:isEN()
        ? 'The wish for “'+needLabel(n)+'” has not appeared yet. No need has to appear — but if it did, where might it show up in your days?'
        : '‘'+needLabel(n)+'’의 바람은 아직 한 번도 나오지 않았어요. 꼭 있어야 하는 건 아니지만, 있다면 요즘 어디쯤에서 보일까요?'}];
  }
  return [];
}
function byType(active,type){ return active.filter(function(p){return p.type===type;}); }
function patternById(id){
  var list=[analyzePatterns('all').patterns,analyzePatterns('7').patterns],i,j;
  for(i=0;i<list.length;i++){ for(j=0;j<list[i].length;j++){ if(list[i][j].id===id) return list[i][j]; } }
  return null;
}
function evidenceOfPattern(p){
  if(!p) return [];
  var ids=p.evidenceIds||[];
  return ids.map(function(id){ return records.filter(function(x){return x.id===id})[0]; }).filter(Boolean);
}
function evidenceLine(p){
  if(!p) return '';
  return tr('근거 기록 '+p.count+'건 · 서로 다른 '+p.distinctDays+'일','based on '+p.count+' entries over '+p.distinctDays+' days');
}
/* 한 기록에서 발견되는 단서 — 자기 자신을 뺀 근거가 2건 이상일 때만 */
function mainClueFor(r){
  var a=analyzePatterns('all');
  var mine=null;
  a.active.forEach(function(p){
    if(mine) return;
    if(p.evidenceIds.indexOf(r.id)<0) return;
    var others=p.evidenceIds.filter(function(id){return id!==r.id;});
    if(others.length>=2&&p.level!=='record'){ p.evidenceLine=evidenceLine(p); mine=p; }
  });
  return mine;
}

/* =========================================================
   v8 · 나의 변화 기록 보관소 + 상담·보관용 PDF(인쇄)
   ========================================================= */
function pinDateStr(at){
  var d=new Date(at||0); if(isNaN(d.getTime())) return '';
  return d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate();
}
function pinBtnPattern(p){
  var on=isPinned('pattern',p.id);
  return '<button class="btn ghost small pin-btn'+(on?' on':'')+'" onclick="togglePinPatternBtn(\''+esc(p.id)+'\')">'
    +(on? '📌 '+tr('보관소에 저장됨 · 빼기','Kept in the archive · remove') : '📌 '+tr('변화 보관소에 저장','Save to the change archive'))+'</button>';
}
function togglePinPatternBtn(id){
  var p=patternById(id);
  if(!p){ toast(tr('이 단서를 찾지 못했어요','That clue could not be found')); return; }
  var r=togglePinPattern(p);
  toast(r==='added'? tr('변화 보관소에 저장했어요','Saved to the change archive') : tr('보관소에서 뺐어요','Removed from the archive'));
  renderPatternUi();
}
function pinBtnRecord(id){
  var on=isPinned('record',id);
  return '<button class="btn ghost small pin-btn'+(on?' on':'')+'" onclick="togglePinRecordBtn('+Number(id)+')">'
    +(on? '📌 '+tr('보관소에 저장됨 · 빼기','Kept in the archive · remove') : '📌 '+tr('변화 보관소에 저장','Save to the change archive'))+'</button>';
}
function togglePinRecordBtn(id){
  var r=records.filter(function(x){ return x.id===id; })[0];
  if(!r) return;
  var res=togglePinRecord(r);
  toast(res==='added'? tr('변화 보관소에 저장했어요','Saved to the change archive') : tr('보관소에서 뺐어요','Removed from the archive'));
  if(currentView==='archive') renderArchive(); else if(currentView==='discovery'&&detailId!=null) renderDiscovery(detailId);
  else refreshView();
}
function removePinBtn(pid){
  removePin(pid);
  toast(tr('보관소에서 뺐어요','Removed from the archive'));
  renderArchive();
}

/* ---------- 보관소 화면 ---------- */
function renderArchive(){
  var el=document.getElementById('archiveContent'); if(!el) return;
  var cmp=periodComparison();
  var shift=archiveShift(cmp);
  var pins=pinList();
  var h='<button class="btn ghost" onclick="show(\'report\')">'+tr('← 월간 리포트','← Monthly report')+'</button>';
  h+='<div class="hero"><div class="eyebrow">CHANGE ARCHIVE ✧</div><h2>'+tr('나의 변화 기록<br>보관소','My change<br>archive')+'</h2><p>'+tr('30일 전의 나와 지금의 나를 견주고, 내가 의미 있다고 느낀 발견을 모아두는 곳이에요.','Where the me of 30 days ago and the me now are set side by side, and the findings I chose to keep are gathered.')+'</p></div>';
  h+=archiveCompareHTML(cmp);
  h+=archiveShiftHTML(shift);
  h+=archivePinsHTML(pins);
  h+='<div class="card"><div class="card-title">📦 '+tr('보관소와 백업','Archive and backup')+'</div><p class="prompt">'+tr('핀으로 저장한 발견은 이 기기에 함께 저장돼요. ‘내보내기’를 받으면 핀 목록도 같이 들어가고, ‘가져오기’에서 기록과 함께 복원돼요.','Pinned findings stay on this device. A JSON export carries them, and an import restores them with the entries.')+'</p><div class="row"><button class="btn secondary small" onclick="exportData()">'+tr('내보내기','Export')+'</button><button class="btn secondary small" onclick="triggerImport()">'+tr('가져오기','Import')+'</button><button class="btn small" onclick="printReport()">📄 '+tr('리포트 PDF','Report PDF')+'</button></div></div>';
  el.innerHTML=h;
}
function archiveCompareHTML(cmp){
  var h='<div class="card"><div class="card-title">🕰 '+tr('30일 전의 나와 지금의 나','Me 30 days ago and me now')+'</div>';
  if(!cmp||cmp.mode==='none'){
    h+='<div class="empty">'+tr('비교할 기록이 아직 부족해요.<br>서로 다른 때의 기록이 2건 모이면 30일 전과 지금을 견줘 보여드려요.','Not enough entries to compare yet.<br>With two entries from different times, then and now can be set side by side.')+'</div>'
      +'<button class="btn" style="margin-top:6px" onclick="startNew()">'+tr('☁️ 기록 남기기','☁️ Write an entry')+'</button></div>';
    return h;
  }
  h+='<p class="prompt" style="margin-bottom:8px">'+tr('앞 칸은 그 전, 뒷 칸은 지금이에요. 비율은 각 시기의 기록 수를 분모로 계산해요.','The first column is the earlier period, the second is now. Shares use each period’s entry count.')+'</p>';
  h+='<div class="cmp2"><div class="cmp2-h"><span class="c1">'+tr('항목','Item')+'</span><span>'+esc(cmp.labelBefore)+'</span><span>'+esc(cmp.labelNow)+'</span><span>'+tr('변화','Δ')+'</span></div>';
  cmp.topDiffs.slice(0,5).forEach(function(x){
    var cls=x.dp>0?'up':(x.dp<0?'down':'');
    h+='<div class="cmp2-r"><span class="c1">'+esc(x.label)+'</span><span>'+x.aCount+tr('건','')+' · '+x.ap+'%</span><span>'+x.bCount+tr('건','')+' · '+x.bp+'%</span><span class="dd '+cls+'">'+(x.dp>0?'+':'')+x.dp+'%p</span></div>';
  });
  h+='</div>';
  h+='<p style="margin:11px 0 0;font-size:13px;line-height:1.78;color:#514661">'+esc(periodFactSentence(cmp))+'</p>';
  if(cmp.newcomers.length){
    h+='<p class="quiet" style="margin-top:7px">'+tr('최근에 새로 나타난 것: ','New recently: ')+cmp.newcomers.slice(0,3).map(function(x){ return esc(x.label)+' ('+x.bCount+tr('건','')+')'; }).join(' · ')+'</p>';
  }
  h+='<p class="quiet" style="margin-top:7px">'+tr('① 기록에서 센 비율 차이만 보여드려요. 원인은 추론하지 않아요.','Only the difference in counted shares is shown; no cause is inferred.')+'</p>';
  h+='</div>';
  return h;
}
function archiveShiftHTML(shift){
  var h='<div class="card"><div class="card-title">🌱 '+tr('과거의 고민과 최근의 변화','Old worries and recent change')+'</div>';
  if(!shift||!shift.ok){
    h+='<p class="quiet" style="margin:0">'+tr('두 시기를 나눌 만큼 기록이 쌓이면 여기에 보여드려요.','Once entries fill two periods, this space fills in.')+'</p></div>';
    return h;
  }
  h+='<div class="sub-h">'+tr('과거에 자주 등장했던 고민 (상황·감정)','Worries that used to appear often (situation · feeling)')+'</div>';
  if(shift.oldConcerns.length){
    h+='<div class="chips">'+shift.oldConcerns.map(function(x){
      return '<span class="tag">'+esc(x.label)+' <b style="opacity:.55">'+x.aCount+'→'+x.bCount+'</b></span>';
    }).join('')+'</div>';
  }else{
    h+='<p class="quiet" style="margin:0">'+tr('두 번 이상 나왔던 고민이 최근에 줄어든 경우는 아직 없어요.','No worry that appeared twice or more has clearly dropped recently.')+'</p>';
  }
  h+='<div class="sub-h">'+tr('최근 새롭게 나타난 반응·변화','What has newly appeared recently')+'</div>';
  if(shift.newSignals.length){
    h+='<div class="chips">'+shift.newSignals.map(function(x){
      return '<span class="tag depth">'+esc(x.label)+' <b style="opacity:.55">'+x.bCount+tr('건','')+'</b></span>';
    }).join('')+'</div>';
  }else{
    h+='<p class="quiet" style="margin:0">'+tr('그동안 없던 반응이 새로 두 번 이상 나온 경우는 아직 없어요.','Nothing unseen before has appeared twice or more yet.')+'</p>';
  }
  h+='<p class="quiet" style="margin-top:9px">'+tr('두 번 이상 반복된 것만 넣었어요. 한 번 나온 것은 변화라고 부르지 않아요.','Only what appeared twice or more is listed; a single appearance is not called a change.')+'</p>';
  h+='</div>';
  return h;
}
function pinView(p){
  var o={title:p.title||'',sentence:p.sentence||'',evidence:p.evidence||'',kind:p.kind,refId:p.refId,pid:p.pid,at:p.at};
  if(isEN()){
    if(p.titleEn) o.title=p.titleEn;
    if(p.sentenceEn) o.sentence=p.sentenceEn;
    if(p.evidenceEn) o.evidence=p.evidenceEn;
    if(p.kind==='pattern'){
      var pat=patternById(p.refId);
      if(pat){ o.sentence=pat.sentence; o.evidence=evidenceLine(pat); }
    }
  }
  return o;
}
function archivePinsHTML(pinsRaw){
  var pins=pinsRaw.map(pinView);
  var h='<div class="card"><div class="card-title">📌 '+tr('내가 직접 고른 발견','Findings I chose to keep')+' <span class="clue-badge" style="margin-left:auto">'+tr(pins.length+'개',pins.length+' kept')+'</span></div>';
  if(!pins.length){
    h+='<div class="empty">'+tr('아직 저장한 발견이 없어요.<br>리포트의 단서나 ‘오늘의 마음 발견’에서 <b>📌 변화 보관소에 저장</b>을 누르면 여기에 모여요.','Nothing kept yet.<br>Tap <b>📌 Save to the change archive</b> on a report clue or in today’s discovery and it gathers here.')+'</div></div>';
    return h;
  }
  pins.forEach(function(p){
    h+='<div class="pin-item"><div class="pin-h"><span class="pin-t">'+esc(p.title||'')+'</span><span class="pin-d">'+esc(pinDateStr(p.at))+'</span></div>'
      +'<p class="pat-say">'+esc(p.sentence||'')+'</p>'
      +(p.evidence?'<p class="quiet" style="margin:4px 0 0">'+esc(p.evidence)+'</p>':'')
      +'<div class="row" style="margin-top:8px">'
      +(p.kind==='pattern'?'<button class="btn secondary small" onclick="openPattern(\''+esc(p.refId)+'\')">'+tr('근거 기록','Entries')+'</button>':'')
      +(p.kind==='record'?'<button class="btn secondary small" onclick="openDetail('+Number(p.refId)+')">'+tr('그 날의 기록','That day')+'</button>':'')
      +'<button class="btn ghost small" onclick="removePinBtn(\''+esc(p.pid)+'\')">'+tr('빼기','Remove')+'</button></div></div>';
  });
  h+='<p class="quiet" style="margin-top:8px">'+tr('저장한 문장은 그때의 기록을 그대로 담아둔 거예요. 기록이 바뀌어도 보관소의 문장은 그대로 남아요.','A kept sentence holds the entry as it was then; it stays even if the entries change.')+'</p>';
  h+='</div>';
  return h;
}

/* ---------- 상담·보관용 PDF (인쇄) ---------- */
function printStatusOf(id){
  var st=id? stateOfId(id):null;
  var s=st? String(st.status||'') : '';
  return s==='confirmed'? tr('사용자가 ‘맞아요’로 확인함','confirmed by the user')
    : s==='partial'? tr('사용자가 ‘수정’으로 표시함','marked as partly by the user')
    : s==='rejected'? tr('사용자가 ‘제외’로 표시함','left out by the user')
    : tr('아직 확인하지 않음','not yet confirmed');
}
function printBlock(label,body){
  return '<p class="pr-line"><b>'+label+'</b> '+(body||'—')+'</p>';
}
function buildPrintReport(){
  var el=document.getElementById('printReport'); if(!el) return '';
  var a=analyzePatterns('all');
  var n=a.n;
  var cmp=periodComparison();
  var pins=pinList();
  var d=new Date();
  var sorted=cleanRecordList();
  var h='<div class="pr">';
  h+='<div class="pr-head"><div class="pr-brand">'+tr('마음의 빙산 · Mind’s Iceberg','Mind’s Iceberg')+'</div>'
    +'<h1>'+tr('월간 마음 패턴 리포트','Monthly mind pattern report')+'</h1>'
    +'<div class="pr-meta">'+tr('기간','Period')+' '+esc(n? dstr(sorted[sorted.length-1].date)+' – '+dstr(sorted[0].date) : '—')
    +' · '+tr('기록','entries')+' '+n+' · '+tr('서로 다른 날','days')+' '+distinctDaysOf(a.list).length
    +' · '+tr('작성','created')+' '+d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate()+'</div>'
    +'<p class="pr-disc">'+tr('이 리포트는 기록을 세어 정리한 것이며 진단이나 심리 평가가 아닙니다. ①은 기록에서 센 사실, ②는 반복 단서, ③은 기록만으로 만든 짐작, ④는 사용자가 확인한 내용입니다.','This report counts and arranges entries and is not a diagnosis or an assessment. ① is what the entries show, ② a repeating clue, ③ a guess made from the entries, ④ what the user confirmed.')+'</p></div>';

  /* 01 */
  h+='<section class="pr-sec"><h2>01 '+tr('반복되는 감정','Feelings that repeat')+'</h2>';
  var emo=topItems('emotion',a.list).slice(0,4);
  if(emo.length){
    h+='<table class="pr-tbl"><tr><th>'+tr('감정','Feeling')+'</th><th>'+tr('기록','Entries')+'</th><th>'+tr('비율','Share')+'</th></tr>';
    emo.forEach(function(x){ h+='<tr><td>'+esc(emotionLabel(x.key))+'</td><td>'+x.count+'</td><td>'+pctOf(x.count,n)+'%</td></tr>'; });
    h+='</table>';
    h+='<p class="pr-note">'+tr('비율의 분모는 기간 기록 '+n+'건이에요. 한 기록에서 감정을 여러 개 고를 수 있어 합계가 100%를 넘을 수 있어요.','Shares use the '+n+' entries as the denominator; several feelings can be picked in one entry, so the total may pass 100%.')+'</p>';
    var top=emo[0];
    var pat=a.patterns.filter(function(p){ return p.type==='emotion'&&p.key===top.key; })[0]||null;
    if(pat&&pat.hidden) pat=null;
    var nb=needsBehindEmotion(a.list,top.key);
    h+=printBlock(tr('① 사실','① Fact'), esc(tr('기록 '+n+'건 중 '+top.count+'건('+pctOf(top.count,n)+'%)에 ‘'+emotionLabel(top.key)+'’이 적혔어요.','“'+emotionLabel(top.key)+'” appears in '+top.count+' of '+n+' entries ('+pctOf(top.count,n)+'%).')));
    h+=printBlock(tr('② 반복 패턴','② Pattern'), esc((pat&&pat.level!=='record')? plainText(pat.sentence) : tr('아직 반복이라고 부를 만큼 쌓이지 않았어요.','Not enough to call it a repeat yet.')));
    h+=printBlock(tr('③ 추론','③ Inference'), (nb&&nb.top&&nb.top.count>=2)? esc(tr('‘'+emotionLabel(top.key)+'’이 적힌 '+nb.total+'건 중 '+nb.top.count+'건에 ‘'+needLabel(nb.top.key)+'’의 바람이 함께 있었어요. 짐작이며 틀릴 수 있어요.','In '+nb.top.count+' of '+nb.total+' entries with that feeling, a wish for “'+needLabel(nb.top.key)+'” was written too. A guess; it may be wrong.')) : esc(tr('추론을 만들지 않았어요.','No inference was made.')));
    h+=printBlock(tr('④ 확인','④ Confirmation'), esc(printStatusOf(pat?pat.id:'')));
  }else{
    h+='<p class="pr-line">'+esc(tr('이 기간에 감정을 적은 기록이 없어요.','No feelings were written in this period.'))+'</p>';
  }
  h+='</section>';

  /* 02 */
  h+='<section class="pr-sec"><h2>02 '+tr('서로 다른 상황의 연결','Links across different situations')+'</h2>';
  var crosses=a.crosses.slice(0,2);
  if(crosses.length){
    crosses.forEach(function(p){
      var sits=(p.situations||[]).map(sitCatLabel).join(' · ');
      h+=printBlock(tr('① 사실','① Fact'), esc(tr('상황이 서로 달랐던 '+p.count+'건에서 ‘'+emotionLabel(p.emotion)+'’과 ‘'+needLabel(p.need)+'’의 바람이 함께 적혔어요 ('+sits+', 서로 다른 '+p.distinctDays+'일).','In '+p.count+' entries with different situations ('+sits+'), “'+emotionLabel(p.emotion)+'” and a wish for “'+needLabel(p.need)+'” appeared together, over '+p.distinctDays+' days.')));
      h+=printBlock(tr('② 반복 패턴','② Pattern'), esc(plainText(p.sentence)));
      h+=printBlock(tr('③ 추론','③ Inference'), esc(tr('상황이 아니라 그 아래 ‘'+needLabel(p.need)+'’의 바람이 반복해서 올라오는 것일 수 있어요.','What repeats may be the wish for “'+needLabel(p.need)+'” rather than the situation.')));
      h+=printBlock(tr('④ 확인','④ Confirmation'), esc(printStatusOf(p.id)));
    });
  }else{
    h+='<p class="pr-line">'+esc(tr('서로 다른 상황에서 같은 감정·욕구 조합이 반복된 기록은 아직 없어요. 단서를 만들 조건(3건 이상·서로 다른 3일 이상·상황 2가지 이상)이 모이지 않아 이 칸은 비워 두었어요.','No combination has yet repeated across different situations; the conditions for a clue (3+ entries, 3+ days, 2+ situations) were not met, so this section stays empty.'))+'</p>';
  }
  h+='</section>';

  /* 03 */
  h+='<section class="pr-sec"><h2>03 '+tr('욕구와 반응의 차이','The gap between wish and reaction')+'</h2>';
  var mis=a.mismatches;
  var gs=gapStats(a.list);
  if(mis.length){
    var m=mis[0];
    h+=printBlock(tr('① 사실','① Fact'), esc(tr('연결 욕구와 억제 반응이 같은 기록에 적힌 건 '+m.count+'건(서로 다른 '+m.distinctDays+'일)이에요. 가장 잦은 조합은 ‘'+needLabel(m.need)+'’ + ‘'+reactionLabel(m.reaction)+'’.','Connection wish and suppressing reaction appear together in '+m.count+' entries over '+m.distinctDays+' days; the most frequent pairing is “'+needLabel(m.need)+'” with “'+reactionLabel(m.reaction)+'”.')));
    h+=printBlock(tr('② 반복 패턴','② Pattern'), esc(tr('바라는 마음과 실제로 나온 반응이 반복해서 다른 방향으로 이어져요.','The wish and the actual reaction repeatedly point different ways.')));
    h+=printBlock(tr('③ 추론','③ Inference'), esc(plainText(m.sentence)));
    h+=printBlock(tr('④ 확인','④ Confirmation'), esc(printStatusOf(m.id)));
  }else{
    h+='<p class="pr-line">'+esc(tr('연결 욕구와 억제 반응이 함께 적힌 기록은 '+gs.count+'건(서로 다른 '+gs.days+'일)이에요. 3건·3일이 모이면 이 칸에 단서를 적어요.','Connection wish with a suppressing reaction appears in '+gs.count+' entries ('+gs.days+' days). With 3 entries on 3 days a clue is written here.'))+'</p>';
  }
  h+='</section>';

  /* 04 */
  h+='<section class="pr-sec"><h2>04 '+tr('지난달과 달라진 점','What changed from last month')+'</h2>';
  if(cmp.ok){
    h+='<table class="pr-tbl"><tr><th>'+tr('항목','Item')+'</th><th>'+esc(cmp.labelBefore)+'</th><th>'+esc(cmp.labelNow)+'</th><th>Δ</th></tr>';
    cmp.topDiffs.slice(0,4).forEach(function(x){
      h+='<tr><td>'+esc(x.label)+'</td><td>'+x.aCount+' · '+x.ap+'%</td><td>'+x.bCount+' · '+x.bp+'%</td><td>'+(x.dp>0?'+':'')+x.dp+'%p</td></tr>';
    });
    h+='</table>';
    h+=printBlock(tr('① 사실','① Fact'), esc(periodFactSentence(cmp)));
    h+=printBlock(tr('② 반복 패턴','② Pattern'), esc((cmp.topDiffs[0]&&Math.abs(cmp.topDiffs[0].dp)>=10)? tr('가장 크게 움직인 것은 '+deltaSentence(cmp.topDiffs[0])+'예요.','The biggest shift is '+deltaSentence(cmp.topDiffs[0])+'.') : tr('두 시기의 구성이 비슷해요.','The mix is much the same in both periods.')));
    h+=printBlock(tr('③ 추론','③ Inference'), esc(cmp.newcomers.length? tr('최근에 새로 나타난 ‘'+cmp.newcomers[0].label+'’은 다른 신호일 수 있어요. 기간이 짧아 우연일 수도 있어요.','“'+cmp.newcomers[0].label+'” is new recently and may be a different signal; with a short period it may be chance.') : tr('원인은 추론하지 않았어요.','No cause is inferred.')));
    h+=printBlock(tr('④ 확인','④ Confirmation'), esc(printStatusOf('compare|'+cmp.mode)));
  }else{
    h+='<p class="pr-line">'+esc(cmp.note)+'</p>';
  }
  h+='</section>';

  /* 확인한 발견 + 근거 요약 */
  var confirmed=a.patterns.filter(function(p){ var st=stateOfId(p.id); return st&&st.status==='confirmed'; });
  h+='<section class="pr-sec"><h2>'+tr('사용자가 확인한 발견','Findings the user confirmed')+'</h2>';
  if(!pins.length&&!confirmed.length){
    h+='<p class="pr-line">'+esc(tr('아직 확인하거나 보관소에 저장한 발견이 없어요.','Nothing has been confirmed or kept yet.'))+'</p>';
  }else{
    if(confirmed.length) confirmed.forEach(function(p){
      h+='<p class="pr-line">· '+esc(itemLabel(p.type,p.key))+' — '+esc(plainText(p.sentence))+'</p>';
    });
    pins.map(pinView).forEach(function(p){
      h+='<p class="pr-line">📌 '+esc(p.title||'')+' — '+esc(p.sentence||'')+(p.evidence?' <span class="pr-dim">('+esc(p.evidence)+')</span>':'')+'</p>';
    });
  }
  h+='</section>';

  /* 근거 기록 요약 */
  h+='<section class="pr-sec"><h2>'+tr('근거 기록 요약','What the report is based on')+'</h2>';
  var sits=topItems('situation',a.list).slice(0,3).map(function(x){ return sitCatLabel(x.key)+' '+x.count; }).join(' · ');
  var nds=topItems('need',a.list).slice(0,3).map(function(x){ return needLabel(x.key)+' '+x.count; }).join(' · ');
  h+='<p class="pr-line">'+esc(tr('기록 ','Entries '))+n+' · '+esc(tr('서로 다른 날 ','different days '))+distinctDaysOf(a.list).length+' · '+esc(tr('감정 ','feelings '))+(emo.length? emo.map(function(x){return emotionLabel(x.key)+' '+x.count;}).join(' · '):'—')+'</p>';
  h+='<p class="pr-line">'+esc(tr('상황 ','Situations '))+(sits||'—')+' · '+esc(tr('욕구 ','Wishes '))+(nds||'—')+'</p>';
  var recent=a.list.slice(0,5);
  if(recent.length){
    h+='<p class="pr-note">'+tr('최근 기록','Recent entries')+'</p>';
    recent.forEach(function(r){
      var line=dstr(r.date)+' · '+(emotionsOf(r).map(emotionLabel).join(' · ')||tr('감정 없음','no feeling'))
        +(needsOf(r).filter(function(x){return !isUnsureNeed(x)}).length? ' · '+needsOf(r).filter(function(x){return !isUnsureNeed(x)}).map(needLabel).join(' · '):'');
      h+='<p class="pr-line pr-dim">'+esc(line)+'</p>';
    });
  }
  h+='</section>';
  h+='<div class="pr-foot">'+tr('마음의 빙산 · 상담이나 진료에 참고용으로 쓰려면 이 리포트를 그대로 가져가세요. 기록 원문은 앱의 ‘기록 백업’에서 내려받을 수 있어요.','Mind’s Iceberg · Take this report as it is if it helps a conversation with a counsellor. The original entries can be exported from the app’s backup.')+'</div>';
  h+='</div>';
  el.innerHTML=h;
  return h;
}
function printReport(){
  buildPrintReport();
  try{ window.print(); }catch(e){}
}

/* ---------- 백업: 핀 목록 포함 ---------- */
function exportData(){
  var payload={app:'maeum-bingsan',version:3,exportedAt:new Date().toISOString(),count:records.length,records:records,archive:pinList()};
  var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  var d=new Date();
  var name='maeum-bingsan-backup-'+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'.json';
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1500);
  toast(tr('기록 '+records.length+'개와 보관소 '+pinList().length+'개를 내보냈어요',records.length+' entries and '+pinList().length+' kept findings exported'));
}
function readImport(file){
  var reader=new FileReader();
  reader.onload=function(){
    var parsed=null, arr=null, pins=null;
    try{ parsed=JSON.parse(String(reader.result||'')); }catch(err){
      alert(tr('JSON 파일을 읽지 못했어요. 마음의 빙산에서 내보낸 파일인지 확인해 주세요.','Could not read that JSON file. Please check that it was exported from Mind’s Iceberg.')); return;
    }
    if(Array.isArray(parsed)) arr=parsed;
    else if(parsed&&Array.isArray(parsed.records)) arr=parsed.records;
    if(parsed&&!Array.isArray(parsed)&&Array.isArray(parsed.archive)) pins=parsed.archive;
    var addedPins=pins? mergePins(pins) : 0;
    if(!arr||!arr.length){
      if(addedPins){ toast(tr('보관소 발견 '+addedPins+'개를 가져왔어요','Imported '+addedPins+' kept findings')); refreshView(); return; }
      alert(tr('기록 목록을 찾지 못했어요.','No entry list was found in the file.')); return;
    }
    arr=arr.filter(function(r){ return r&&typeof r==='object'; }).map(normalizeRecord);
    if(!arr.length){ alert(tr('가져올 기록이 없어요.','There are no entries to import.')); return; }
    if(addedPins) toast(tr('보관소 발견 '+addedPins+'개도 함께 가져왔어요','Also imported '+addedPins+' kept findings'));
    showImportModal(arr);
  };
  reader.onerror=function(){ alert(tr('파일을 읽지 못했어요.','Could not read the file.')); };
  reader.readAsText(file);
}

/* =========================================================
   v8 · 캘린더(.ics) 반복 리마인더 — 웹 푸시가 닿지 않는 시간대 보완
   VEVENT + RRULE:FREQ=DAILY 로 iOS/안드로이드 캘린더에 매일 알림을 건다.
   ========================================================= */
function icsPad(n){ return (n<10?'0':'')+n; }
function icsStampUTC(d){
  return d.getUTCFullYear()+icsPad(d.getUTCMonth()+1)+icsPad(d.getUTCDate())+'T'+icsPad(d.getUTCHours())+icsPad(d.getUTCMinutes())+'00Z';
}
function icsStampLocal(d){
  return d.getFullYear()+icsPad(d.getMonth()+1)+icsPad(d.getDate())+'T'+icsPad(d.getHours())+icsPad(d.getMinutes())+'00';
}
function icsEsc(s){
  return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
}
/* 순수 함수 — 테스트에서 문자열만 검사한다 */
function buildReminderICS(opts){
  opts=opts||{};
  var hour=(opts.hour==null)?21:Number(opts.hour);
  var now=opts.now? new Date(opts.now) : new Date();
  var start=new Date(now.getFullYear(),now.getMonth(),now.getDate(),hour,0,0);
  if(start.getTime()<=now.getTime()) start=new Date(start.getTime()+86400000);
  var summary=isEN()? 'Mind’s Iceberg · one line about today'
                    : '마음의 빙산 · 오늘의 마음 한 줄';
  var desc=isEN()? 'One feeling and one line is enough. Open the app and tap once.'
                 : '감정 하나, 한 줄이면 충분해요. 앱을 열고 한 번만 눌러 주세요.';
  var lines=[
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Maeum Bingsan//Daily Reminder v8//KO','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'BEGIN:VTIMEZONE','TZID:Asia/Seoul',
    'BEGIN:STANDARD','DTSTART:19700101T000000','TZOFFSETFROM:+0900','TZOFFSETTO:+0900','TZNAME:KST','END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    'UID:maeum-bingsan-daily-'+icsStampUTC(now)+'@local',
    'DTSTAMP:'+icsStampUTC(now),
    'DTSTART;TZID=Asia/Seoul:'+icsStampLocal(start),
    'DTEND;TZID=Asia/Seoul:'+icsStampLocal(new Date(start.getTime()+15*60000)),
    'RRULE:FREQ=DAILY',
    'SUMMARY:'+icsEsc(summary),
    'DESCRIPTION:'+icsEsc(desc),
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(summary),'END:VALARM',
    'END:VEVENT','END:VCALENDAR',''
  ];
  return lines.join('\r\n');
}
function downloadReminderICS(){
  var txt=buildReminderICS({hour:21});
  var blob=new Blob([txt],{type:'text/calendar;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='maeum-bingsan-reminder-9pm.ics';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1500);
  toast(tr('캘린더에 추가할 .ics 파일을 만들었어요','Made the .ics file for your calendar'));
}

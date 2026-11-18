#!/usr/bin/env python3
"""docs/index.html (v7 · 2.0 Phase 1) 조립 스크립트.

기존 v6 앱(docs/index.html)의 CSS와 스크립트를 그대로 가져와 바탕으로 쓰고,
새 화면(2.0)과 새 엔진을 뒤에 덧붙여 덮어쓴다. 기존 화면·기능·기록은 그대로 보존된다.
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parents[1]
v7 = root / 'v7'
src_path = v7 / 'index_v6.html'
out_path = root / 'docs' / 'index.html'

old = src_path.read_text(encoding='utf-8')
lines = old.split('\n')

# --- 기존 파일에서 조각 추출 (1-indexed line numbers from the v6 file) ---
head_start = 1                        # <!doctype html>
head_end = 14                         # <style>
css = '\n'.join(lines[14:232])        # lines 15..232 (CSS rules)
script_block = '\n'.join(lines[268:3245])   # lines 269..3245 (<script> ... </script>)

assert lines[13].startswith('<style>'), lines[13][:40]
assert lines[268].startswith('<script>'), lines[268][:40]
assert script_block.rstrip().endswith('</script>'), script_block[-40:]

# --- 기존 스크립트 패치 (최소 침습) ---
patches = [
    # AI 카드: 기존 구현을 이름만 바꿔 보존하고, 새 상단 블록을 앞에 붙인다
    ('function aiHTML(r){', 'function aiHTMLBase(r){'),
    # 클라우드 동기화가 새 필드까지 통째로 받아오도록
    ('cur.situation=rec.situation; cur.feeling=rec.feeling; cur.need=rec.need;\n        cur.other=rec.other; cur.action=rec.action; cur.ai=rec.ai;',
     'Object.assign(cur,rec);'),
]
for a, b in patches:
    if a not in script_block:
        print('PATCH MISSING:', a[:60], file=sys.stderr)
        sys.exit(1)
    script_block = script_block.replace(a, b)

# --- v8: 1.0 방어기제·해결 방안을 심층 리포트 맨 아래 접힌 '이전 참고 보기'로 내린다 ---
def _p8(text, a, b):
    if a not in text:
        print('V8 PATCH MISSING:', a[:90], file=sys.stderr)
        sys.exit(1)
    return text.replace(a, b)

script_block = _p8(script_block,
  "  /* 한눈에 보기 · 방어기제 → AI 솔루션 */\n  html+='<div class=\"card\" style=\"background:linear-gradient(140deg,#f8f3fb,#eef4f2);border-color:#e4d9ef\">';",
  "  /* v8: 1.0 방어기제 블록은 맨 아래 접힌 ‘이전 참고 보기’로 내린다 */\n  var legacyHTML='';\n  legacyHTML+='<div class=\"card\" style=\"background:linear-gradient(140deg,#f8f3fb,#eef4f2);border-color:#e4d9ef\">';")
script_block = _p8(script_block,
  "  html+='<div class=\"card-title\">'+tr('한눈에 보기 · 방어기제 → AI 솔루션','At a glance · defence → AI solution')+'</div>';",
  "  legacyHTML+='<div class=\"card-title\">'+tr('한눈에 보기 · 방어기제 → AI 솔루션','At a glance · defence → AI solution')+'</div>';")
script_block = _p8(script_block,
  "  html+='<div class=\"ai-flow\">",
  "  legacyHTML+='<div class=\"ai-flow\">")
script_block = _p8(script_block,
  "  html+='<p class=\"prompt\" style=\"margin:0 0 9px\">'+esc(defNow.main.core)+'</p>';",
  "  legacyHTML+='<p class=\"prompt\" style=\"margin:0 0 9px\">'+esc(defNow.main.core)+'</p>';")
script_block = _p8(script_block,
  "  html+='<div id=\"aiSummary\">'+aiSummaryHTML(r)+'</div></div>';",
  "  legacyHTML+='<div id=\"aiSummary\">'+aiSummaryHTML(r)+'</div></div>';")

# 1) 가면 감정과 무의식 방어기제 카드
script_block = _p8(script_block,
  "  html+='<div class=\"card\"><div class=\"sec\"><div class=\"sec-h\">'+nextSec()+tr('가면 감정과 무의식 방어기제','The mask and the unconscious defence')+'</div>'+defReportHTML(r,d)+'</div></div>';",
  "  legacyHTML+='<div class=\"card\"><div class=\"sec\"><div class=\"sec-h\">'+tr('가면 감정과 무의식 방어기제','The mask and the unconscious defence')+'</div>'+defReportHTML(r,d)+'</div></div>';")

# 2) AI 심리 솔루션 카드
script_block = _p8(script_block,
  "  html+='<div class=\"card\"><div class=\"sec\"><div class=\"sec-h\">'+nextSec()+tr('✦ AI 심리 솔루션','✦ AI psychology solution')+'</div><div id=\"aiArea\">'+aiHTML(r)+'</div></div></div>';",
  "  legacyHTML+='<div class=\"card\"><div class=\"sec\"><div class=\"sec-h\">'+tr('✦ AI에게 한 겹 더 묻기','✦ Ask AI for one more layer')+'</div><div id=\"aiArea\">'+aiHTML(r)+'</div></div></div>';")

# 3) 해결 방안 3가지 블록 전체
start = script_block.index("  /* 해결 방안 3 */")
end = script_block.index("  /* 다독임 */")
seg = script_block[start:end]
seg = seg.replace("html+=", "legacyHTML+=").replace("nextSec()+", "")
script_block = script_block[:start] + seg + script_block[end:]

# 4) 접힌 토글을 면책 문구 앞(맨 아래)에 놓는다
script_block = _p8(script_block,
  "  html+='<p class=\"quiet\" style=\"padding:0 4px\">'+tr('이 리포트는 비폭력대화(NVC)와 인지행동치료(CBT)의 관점을 참고한 자기 성찰용 해석이에요.",
  "  if(legacyHTML) html+='<details class=\"legacy-ref\"><summary>🕰 '+tr('이전 참고 보기 · 방어기제 분석과 해결 방안','Earlier reference · defence read and steps')+'</summary>'+legacyHTML+'</details>';\n  html+='<p class=\"quiet\" style=\"padding:0 4px\">'+tr('이 리포트는 비폭력대화(NVC)와 인지행동치료(CBT)의 관점을 참고한 자기 성찰용 해석이에요.")

# 5) 심층 리포트 첫 문단도 1줄로
script_block = _p8(script_block,
  "<p>'+tr('표면에 보인 감정과 그 아래의 욕구·믿음을 비폭력대화(NVC)와 인지행동치료(CBT)의 관점으로 이어봤어요. 진단이 아니라, 나를 이해하기 위한 해석이에요.'",
  "<p>'+tr('감정 아래의 욕구와 믿음을 NVC·CBT로 이어봤어요. 진단이 아니에요.'")

# 6) 설정 · 리마인더에 .ics 버튼
script_block = _p8(script_block,
  "  html+='<div class=\"row\" style=\"margin-top:10px\"><button class=\"btn secondary small\" onclick=\"askNotifPermission()\">'+tr('브라우저 알림 허용','Allow browser notifications')+'</button><button class=\"btn secondary small\" onclick=\"testNotif()\">'+tr('알림 테스트','Test notification')+'</button></div>';",
  "  html+='<div class=\"row\" style=\"margin-top:10px\"><button class=\"btn secondary small\" onclick=\"askNotifPermission()\">'+tr('브라우저 알림 허용','Allow browser notifications')+'</button><button class=\"btn secondary small\" onclick=\"testNotif()\">'+tr('알림 테스트','Test notification')+'</button></div>';\n  html+='<div class=\"row\" style=\"margin-top:8px\"><button class=\"btn small\" onclick=\"downloadReminderICS()\">📅 '+tr('매일 밤 9시 캘린더 알림 추가(.ics)','📅 Add a 9 PM daily calendar reminder (.ics)')+'</button></div>';\n  html+='<p class=\"quiet\" style=\"margin-top:8px\">'+tr('앱을 닫아도 울리는 알림은 위 .ics를 캘린더에 추가하면 돼요(매일 반복).','For a reminder that rings with the app closed, add the .ics above to your calendar — it repeats daily.')+'</p>';")

head = '''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#fbf7f3"><title>마음의 빙산</title>
<meta name="description" content="오늘의 마음을 기록하고, 반복되는 상황·감정·욕구의 단서를 발견하는 자기 탐구 앱.">
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="icon-512.png">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="application-name" content="마음의 빙산">
<meta name="apple-mobile-web-app-title" content="마음의 빙산">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<script>window.__maeumErrors=[];window.addEventListener('error',function(e){try{window.__maeumErrors.push(String(e.message||e))}catch(x){}});window.addEventListener('unhandledrejection',function(e){try{window.__maeumErrors.push('rejection:'+String(e.reason))}catch(x){}});</script>
<style>
'''

body = (v7 / 'body.html').read_text(encoding='utf-8')
base_css = css
extra_css = (v7 / 'extra.css').read_text(encoding='utf-8')

new_js = '\n\n'.join((v7 / f).read_text(encoding='utf-8') for f in
                     ['js1_core.js', 'js2_flow.js', 'js3_pattern.js', 'js4_views.js', 'js6_archive.js', 'js5_ai.js'])

html = (head + base_css + '\n' + extra_css + '\n</style></head><body class="ko"><main class="app">\n'
        + body
        + '\n' + script_block
        + '\n<script>\n/* ====== v8 · 마음의 빙산 2.0 (월간 4섹션 · 보관소 · PDF) ====== */\n'
        + new_js
        + '\n</script>\n</body></html>\n')

out_path.write_text(html, encoding='utf-8')
print('written', out_path, len(html), 'bytes')

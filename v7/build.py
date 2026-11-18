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
                     ['js1_core.js', 'js2_flow.js', 'js3_pattern.js', 'js4_views.js', 'js5_ai.js'])

html = (head + base_css + '\n' + extra_css + '\n</style></head><body class="ko"><main class="app">\n'
        + body
        + '\n' + script_block
        + '\n<script>\n/* ====== v7 · 마음의 빙산 2.0 Phase 1 ====== */\n'
        + new_js
        + '\n</script>\n</body></html>\n')

out_path.write_text(html, encoding='utf-8')
print('written', out_path, len(html), 'bytes')

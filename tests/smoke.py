import threading, http.server, socketserver, functools, json, sys, time
from playwright.sync_api import sync_playwright

ROOT='docs'
Handler=functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
srv=socketserver.TCPServer(('127.0.0.1',8901),Handler); srv.allow_reuse_address=True
threading.Thread(target=srv.serve_forever,daemon=True).start()

errors=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':390,'height':844})
    pg.on('console', lambda m: errors.append('console:'+m.type+':'+m.text) if m.type=='error' else None)
    pg.on('pageerror', lambda e: errors.append('pageerror:'+str(e)))
    pg.goto('http://127.0.0.1:8901/index.html', wait_until='networkidle')
    pg.wait_for_timeout(500)
    print('title:', pg.title())
    print('home visible:', pg.is_visible('#home'))
    print('foundHome text:', pg.inner_text('#foundHome')[:120].replace('\n',' | '))
    # make a record through the 6-step flow
    pg.click("button:has-text('오늘 마음 기록하기')")
    pg.wait_for_timeout(300)
    print('write view:', pg.is_visible('#write'))
    pg.fill('#sitDesc','팀장님이 회의에서 내 의견을 무시했다')
    pg.click("[data-pick='일·업무']")
    pg.click("button:has-text('다음')")
    pg.wait_for_timeout(200)
    pg.click("[data-pick='서운함']")
    pg.click("[data-pick='화남']")
    pg.click("button:has-text('다음')")
    pg.wait_for_timeout(200)
    print('react chips:', pg.locator("[data-pick]").count())
    pg.click("[data-pick='가슴이 답답했다']")
    pg.click("button:has-text('다음')")
    pg.wait_for_timeout(200)
    pg.fill('#thoughtText','또 참았다')
    pg.click("button:has-text('다음')")
    pg.wait_for_timeout(200)
    pg.click("[data-pick='이해']")
    pg.click("button:has-text('다음')")
    pg.wait_for_timeout(300)
    print('sentence:', pg.input_value('#sentenceText')[:80])
    pg.click("button:has-text('다음')")
    pg.wait_for_timeout(500)
    print('discovery visible:', pg.is_visible('#discovery'))
    print('disc text:', pg.inner_text('#discoveryContent')[:300].replace('\n',' | '))
    # map
    pg.click(".navbtn[data-view='map']")
    pg.wait_for_timeout(300)
    print('map:', pg.inner_text('#mapContent')[:200].replace('\n',' | '))
    # report
    pg.click(".navbtn[data-view='report']")
    pg.wait_for_timeout(300)
    print('report:', pg.inner_text('#reportContent')[:300].replace('\n',' | '))
    pg.screenshot(path='tests/smoke.png', full_page=True)
    b.close()
srv.shutdown()
print('ERRORS:', json.dumps(errors, ensure_ascii=False, indent=1))

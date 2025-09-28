from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':390,'height':844})
    page.goto('file:///I:/04_develop/parfait-sardine-run/parfait-sardine-run/index.html')
    page.wait_for_timeout(1000)
    page.evaluate("const how=document.getElementById('howOverlay'); if(how) how.style.display='none';")
    page.evaluate("document.getElementById('start').click();")
    page.wait_for_selector('#preGameOverlay', state='visible', timeout=5000)
    rect = page.evaluate("""
    (() => {
      const btn = document.getElementById('preGameStart');
      const r = btn.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height};
    })()
    """)
    print('rect', rect)
    for offset in [5, 20, 45]:
        x = rect['x'] + rect['width']/2
        y = rect['y'] + offset
        page.mouse.click(x, y)
        page.wait_for_timeout(200)
        visible = page.evaluate("(() => getComputedStyle(document.getElementById('preGameOverlay')).display)()")
        print('After click offset', offset, 'overlay display', visible)
        if visible == 'none':
            print('Overlay closed, re-opening')
            page.evaluate("document.getElementById('start').click();")
            page.wait_for_selector('#preGameOverlay', state='visible', timeout=5000)
            rect = page.evaluate("(() => {const btn = document.getElementById('preGameStart'); const r = btn.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};})()")
    browser.close()

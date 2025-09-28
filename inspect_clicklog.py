from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':390,'height':844})
    page.on('console', lambda msg: print('CONSOLE:', msg.type, msg.text))
    page.goto('file:///I:/04_develop/parfait-sardine-run/parfait-sardine-run/index.html')
    page.wait_for_timeout(1000)
    page.evaluate("const how=document.getElementById('howOverlay'); if(how) how.style.display='none';")
    page.evaluate("document.querySelector('.preGameActions').addEventListener('click', e => console.log('clicked actions', e.target.id));")
    page.evaluate("document.getElementById('start').click();")
    page.wait_for_selector('#preGameOverlay', state='visible', timeout=5000)
    rect = page.evaluate("(() => { const btn = document.getElementById('preGameStart'); const r = btn.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()")
    for offset in [0,5,10]:
        page.mouse.click(rect['x'] + 5, rect['y'] + offset)
        page.wait_for_timeout(200)
    browser.close()

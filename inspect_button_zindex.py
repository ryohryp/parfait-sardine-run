from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':390,'height':844})
    page.goto('file:///I:/04_develop/parfait-sardine-run/parfait-sardine-run/index.html')
    page.wait_for_timeout(1000)
    page.evaluate("const how=document.getElementById('howOverlay'); if(how) how.style.display='none';")
    page.evaluate("document.getElementById('start').click();")
    page.wait_for_selector('#preGameOverlay', state='visible', timeout=5000)
    page.evaluate("document.getElementById('preGameStart').style.position='relative'; document.getElementById('preGameStart').style.zIndex='1';")
    rect = page.evaluate("(() => { const btn = document.getElementById('preGameStart'); const r = btn.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()")
    for offset in [0,5]:
        result = page.evaluate('''(data) => {
          const {x, y, width, offset} = data;
          const pointLeft = document.elementFromPoint(x + 5, y + offset);
          const serialize = (el) => el ? {tag: el.tagName, id: el.id, classes: el.className} : null;
          return serialize(pointLeft);
        }''', {'x':rect['x'], 'y':rect['y'], 'width':rect['width'], 'offset':offset})
        print(offset, result)
    browser.close()

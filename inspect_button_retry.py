from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':390,'height':844})
    page.goto('file:///I:/04_develop/parfait-sardine-run/parfait-sardine-run/index.html')
    page.wait_for_timeout(1000)
    page.evaluate("const how=document.getElementById('howOverlay'); if(how) how.style.display='none';")
    page.evaluate("window.requestStart('retry');")
    page.wait_for_selector('#preGameOverlay', state='visible', timeout=5000)
    rect = page.evaluate("""
    (() => {
      const btn = document.getElementById('preGameStart');
      const r = btn.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height};
    })()
    """)
    print('Button rect (retry direct):', rect)
    for offset in [0,5,10,15,20,25,30,35,40,45,50]:
        elem = page.evaluate("""
        ({x,y,offset,width}) => {
          const pointY = y + offset;
          const pointX = x + 0.5 * width;
          const el = document.elementFromPoint(pointX, pointY);
          if (!el) return {offset, tag:null};
          return {offset, tag:el.tagName, id:el.id, classes:el.className};
        }
        """, {'x':rect['x'], 'y':rect['y'], 'offset':offset, 'width':rect['width']})
        print(elem)
    browser.close()

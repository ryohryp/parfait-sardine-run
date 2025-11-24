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
    print('Button rect:', rect)
    samples = []
    for offset in [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]:
        y = rect['y'] + offset
        x = rect['x'] + rect['width']/2
        elem = page.evaluate("""
        ([x,y]) => {
          const el = document.elementFromPoint(x,y);
          if (!el) return null;
          return {tag: el.tagName, id: el.id, classes: el.className};
        }
        """, [x, y])
        samples.append((offset, elem))
    for offset, elem in samples:
        print(f'offset {offset}:', elem)
    browser.close()

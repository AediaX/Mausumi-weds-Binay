import base64, sys, io
from playwright.sync_api import sync_playwright
from PIL import Image
out = sys.argv[1]; names = sys.argv[2].split(","); size = int(sys.argv[3])
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--allow-file-access-from-files"])
    pg = b.new_page(); msgs=[]
    pg.on("console", lambda m: msgs.append(m.text)); pg.on("pageerror", lambda e: msgs.append("ERR "+str(e)))
    pg.goto("file:///home/claude/site/mausumi-weds-binay/tools/bake.html")
    for n in names:
        url = pg.evaluate(f"bake('{n}', {size})")
        im = Image.open(io.BytesIO(base64.b64decode(url.split(",")[1]))).convert("RGBA")
        im.save(f"{out}/{n}.png"); print(n, im.size, im.getbbox())
    print(msgs[:5]); b.close()

"""Build preview/fortified-landing-preview.html, a self-contained static preview
of the full landing page, from the Shopify sections and assets.

Run: python3 preview/build.py
"""
import html, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
S = ROOT / 'shopify'
IMAGES = {
    'energy': 'https://cdn.shopify.com/s/files/1/1000/1973/2784/files/260401-FOR-ENG-30-WTM-2026_1-Front_6bc5f01a-9136-4e66-89a5-64266588d385.webp?v=1791496978&width=600',
    'everyday': 'https://cdn.shopify.com/s/files/1/1000/1973/2784/files/260401-FOR-EDY-30-ORG-2026_1-Front_d4d55d4a-fd92-4d2a-a06e-d6d64ebbe0e5.webp?v=1791497033&width=600',
}


def render(liquid):
    """Tiny Liquid stand-in covering only what the landing sections use."""
    schema = json.loads(re.search(r'\{% schema %\}(.*?)\{% endschema %\}', liquid, re.S).group(1))
    defaults = {s['id']: s.get('default', '') for s in schema['settings'] if 'id' in s}
    out = re.sub(r'\{% schema %\}.*?\{% endschema %\}', '', liquid, flags=re.S)
    out = re.sub(r'\{%-? comment -?%\}.*?\{%-? endcomment -?%\}', '', out, flags=re.S)
    out = re.sub(r'\{%-? liquid.*?-?%\}', '', out, flags=re.S)
    out = re.sub(r"\{\{ '[^']+' \| asset_url \| stylesheet_tag \}\}", '', out)

    def img(m):
        key = m.group(1)
        return '<img src="%s" alt="Fortified %s 30 Day Supply Pack" width="600" height="600" fetchpriority="high">' % (IMAGES[key], key.title())
    out = re.sub(r'\{%- if (\w+)\.featured_image -%\}.*?\{%- endif -%\}', img, out, flags=re.S)
    out = re.sub(r'\{\{ section\.settings\.(\w+) \}\}', lambda m: html.escape(str(defaults[m.group(1)])), out)
    left = re.findall(r'\{\{.*?\}\}|\{%.*?%\}', out)
    assert not left, 'Unhandled Liquid: %r' % left
    return out.strip()


index = (ROOT / 'preview' / 'index.html').read_text()
start = index.index('<div class="fb" data-fb id="build">')
end = index.index('<script src="../shopify/assets/fortified-bundle.js">')
bundle = index[start:end].strip()

css = (S / 'assets' / 'fortified-bundle.css').read_text() + (S / 'assets' / 'fortified-landing.css').read_text()
js = (S / 'assets' / 'fortified-bundle.js').read_text()

page = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fortified Subscribe and Save</title>
<meta name="description" content="Build your own Fortified electrolyte bundle. Save 10% on every order, free shipping on 2+ packs.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;800;900&display=swap" rel="stylesheet">
<style>
body { margin: 0; background: #fff; font-family: "Figtree", system-ui, sans-serif; }
.pv-note { background: #fff4d6; color: #5a4300; font-size: 12px; text-align: center; padding: 6px 16px; }
.pv-announce { background: #12a39a; color: #fff; text-align: center; font-weight: 800; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; padding: 10px 16px; }
.pv-header { position: sticky; top: 0; z-index: 40; background: #fff; border-bottom: 1px solid #e3e6e9; }
.pv-header div { max-width: 1180px; margin: 0 auto; padding: 0 16px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
.pv-logo { font-weight: 900; font-size: 24px; letter-spacing: .14em; color: #0e1a24; text-decoration: none; }
.pv-header a.pv-cta { background: #0e1a24; color: #fff; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; padding: 11px 18px; border-radius: 6px; }
.pv-footer { background: #0e1a24; color: #c9d1d8; font-size: 14px; padding: 40px 16px 120px; }
.pv-footer div { max-width: 1180px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 16px 32px; justify-content: space-between; }
.pv-footer a { color: #fff; }
.pv-footer nav { display: flex; flex-wrap: wrap; gap: 8px 20px; }
@@css@@
</style>
</head>
<body>
<div class="pv-note">Preview. Subscription prices simulated at $59.00 less 10%. On Shopify, prices come from Loop and checkout is live.</div>
<div class="pv-announce">Save 10% on every order + free shipping on 2+ packs</div>
<header class="pv-header"><div><a class="pv-logo" href="#">FORTIFIED</a><a class="pv-cta" href="#build">Build Your Bundle</a></div></header>
<main>
@@hero@@
@@bundle@@
@@info@@
</main>
<footer class="pv-footer"><div>
  <p>&copy; 2026 Fortified Brands LLC. No Mumbo Jumbo.</p>
  <nav>
    <a href="https://livefortified.com/policies/refund-policy">Refund Policy</a>
    <a href="https://livefortified.com/policies/shipping-policy">Shipping Policy</a>
    <a href="https://livefortified.com/policies/subscription-policy">Subscription Policy</a>
    <a href="mailto:hello@livefortified.com">hello@livefortified.com</a>
  </nav>
</div></footer>
<script>
@@js@@</script>
</body>
</html>
"""
parts = {
    'hero': render((S / 'sections' / 'fortified-landing-hero.liquid').read_text()),
    'bundle': bundle,
    'info': render((S / 'sections' / 'fortified-landing-info.liquid').read_text()),
    'css': css,
    'js': js,
}
for key, value in parts.items():
    page = page.replace('@@%s@@' % key, value)
(ROOT / 'preview' / 'fortified-landing-preview.html').write_text(page)
print('wrote preview/fortified-landing-preview.html', len(page), 'bytes')

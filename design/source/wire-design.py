#!/usr/bin/env python3
"""
wire-design.py: connect a raw Tuition+ design export to the engine.

Usage:  python3 scripts/wire-design.py design/source/index.html design/wired/index.html

What it does (and nothing else):
  1. Inserts engine-adapter.js as a <script> right before the UI script.
  2. Replaces the prototype costs() function with a call to window.TPEngine.estimate().
  3. Makes the rate, the sample note and the exchange-rate replay come from the engine.
Fails loudly if any expected pattern is missing, so a design change that moves
the seam is caught instead of silently wired wrong.
"""
import re, sys, pathlib

src, dst = sys.argv[1], sys.argv[2]
here = pathlib.Path(__file__).resolve().parent
adapter = (here.parent / 'design' / 'wired' / 'engine-adapter.js')
if not adapter.exists():
    adapter = here / 'engine-adapter.js'
html = pathlib.Path(src).read_text(encoding='utf-8')
adapter_js = adapter.read_text(encoding='utf-8')

if 'window.TPEngine' in html:
    sys.exit('Already wired: ' + src)

COSTS = re.compile(r"function costs\(T,Y\)\{const rentM=.*?return \{c,tot,o:\{.*?\},exM,exO\}\}", re.S)
REPLACEMENTS = [
    (re.compile(r"const RATE=\{INR:[0-9.]+\};[^\n]*"),
     "const RATE=window.TPEngine.rates(); // all rates come from the engine adapter"),
    (COSTS,
     "// ENGINE SEAM: every number comes from window.TPEngine (engine-adapter.js)\n"
     "function costs(T,Y){return window.TPEngine.estimate({tuitionPerYearUsd:T,years:Y,from:$('from').value.trim(),"
     "currency:curCode(),school:$('school').value.trim(),overrides:{...OV},extras:EX.slice()})}"),
    (re.compile(re.escape("Housing and living use Boston prices as a sample`+")),
     "${K.meta&&K.meta.sampleNote?K.meta.sampleNote:''}`+"),
    (re.compile(re.escape("if(CUR==='INR'&&window.fanCalc&&window.FXV){")),
     "if(CUR==='INR'&&K.fx){"),
    (re.compile(re.escape("const F=window.fanCalc(window.FXV,K.o);")),
     "const F=K.fx;"),
]
out = html
for pat, rep in REPLACEMENTS:
    out, n = pat.subn(lambda m: rep, out)
    if n != 1:
        sys.exit(f'Seam pattern matched {n} times (expected 1): {pat.pattern[:70]}')

# insert the adapter before the script that now calls TPEngine.estimate
i = out.index('window.TPEngine.estimate(')
s = out.rfind('<script', 0, i)
out = out[:s] + '<script>\n' + adapter_js + '</script>\n' + out[s:]
pathlib.Path(dst).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(dst).write_text(out, encoding='utf-8')
print(f'Wired {src} -> {dst}')

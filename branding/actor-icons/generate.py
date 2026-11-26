# Generates the Actor icon SVGs (run from branding/actor-icons). PNGs are rendered from these at 512x512.
import os
N="#0B2E4F"; Y="#F6B40E"; G="#1F6F5C"; S="#5DADE2"; W="#FFFFFF"
HEAD=f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5DADE2"/><stop offset="1" stop-color="#A9D6F5"/></linearGradient>
    <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F6F5C"/><stop offset="1" stop-color="#134B3E"/></linearGradient>
    <clipPath id="c"><rect width="512" height="512" rx="112"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="512" height="512" fill="url(#sky)"/>
    <path d="M0 436 C 140 418, 300 430, 512 410 L512 512 L0 512 Z" fill="url(#land)"/>
'''
TAIL="  </g>\n</svg>\n"
icons={}
icons["google-trends-scraper"]=f'''
    <line x1="300" y1="300" x2="408" y2="408" stroke="{N}" stroke-width="50" stroke-linecap="round"/>
    <circle cx="216" cy="212" r="130" fill="{W}" stroke="{N}" stroke-width="30"/>
    <polyline points="132,262 180,212 226,238 300,148" fill="none" stroke="{G}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="268,140 314,128 308,176" fill="{G}" stroke="{G}" stroke-width="10" stroke-linejoin="round"/>
'''
icons["website-popularity-rank"]=f'''
    <rect x="80" y="306" width="120" height="140" rx="10" fill="{W}" stroke="{N}" stroke-width="16"/>
    <rect x="312" y="346" width="120" height="100" rx="10" fill="{W}" stroke="{N}" stroke-width="16"/>
    <rect x="196" y="242" width="120" height="204" rx="10" fill="{Y}" stroke="{N}" stroke-width="16"/>
    <path d="M238 292 L268 274 L268 400" fill="none" stroke="{N}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="256" cy="134" r="78" fill="{W}" stroke="{N}" stroke-width="16"/>
    <ellipse cx="256" cy="134" rx="34" ry="78" fill="none" stroke="{N}" stroke-width="12"/>
    <line x1="178" y1="134" x2="334" y2="134" stroke="{N}" stroke-width="12"/>
    <path d="M190 94 Q256 112 322 94 M190 174 Q256 156 322 174" fill="none" stroke="{N}" stroke-width="10"/>
'''
icons["company-jobs-scraper"]=f'''
    <rect x="196" y="96" width="120" height="90" rx="28" fill="none" stroke="{N}" stroke-width="26"/>
    <rect x="80" y="166" width="352" height="236" rx="38" fill="{W}" stroke="{N}" stroke-width="26"/>
    <path d="M93 256 Q256 300 419 256" fill="none" stroke="{N}" stroke-width="18"/>
    <rect x="228" y="250" width="56" height="46" rx="10" fill="{Y}" stroke="{N}" stroke-width="14"/>
    <circle cx="392" cy="384" r="62" fill="{G}" stroke="{W}" stroke-width="12"/>
    <polyline points="362,386 384,408 422,364" fill="none" stroke="{W}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
'''
icons["keyword-suggestions-scraper"]=f'''
    <rect x="62" y="206" width="388" height="208" rx="30" fill="{W}" stroke="{N}" stroke-width="18"/>
    <rect x="84" y="228" width="344" height="56" rx="14" fill="#FCE3A0"/>
    <circle cx="116" cy="256" r="11" fill="none" stroke="{N}" stroke-width="6"/><rect x="142" y="248" width="220" height="18" rx="9" fill="{N}"/>
    <circle cx="116" cy="316" r="11" fill="none" stroke="{S}" stroke-width="6"/><rect x="142" y="308" width="260" height="18" rx="9" fill="{S}"/>
    <circle cx="116" cy="372" r="11" fill="none" stroke="{S}" stroke-width="6"/><rect x="142" y="364" width="180" height="18" rx="9" fill="{S}"/>
    <rect x="62" y="88" width="388" height="96" rx="48" fill="{W}" stroke="{N}" stroke-width="20"/>
    <circle cx="124" cy="132" r="22" fill="none" stroke="{N}" stroke-width="10"/>
    <line x1="140" y1="148" x2="158" y2="166" stroke="{N}" stroke-width="11" stroke-linecap="round"/>
    <rect x="182" y="124" width="140" height="18" rx="9" fill="{N}"/>
    <line x1="340" y1="110" x2="340" y2="156" stroke="{Y}" stroke-width="8" stroke-linecap="round"/>
'''
def layer(y,fill): return f'    <polygon points="256,{y-74} 412,{y} 256,{y+74} 100,{y}" fill="{fill}" stroke="{N}" stroke-width="18" stroke-linejoin="round"/>\n'
icons["website-tech-stack-detector"]=layer(330,G)+layer(250,Y)+layer(166,W)+f'''
    <polyline points="222,140 190,166 222,192" fill="none" stroke="{N}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="290,140 322,166 290,192" fill="none" stroke="{N}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="268" y1="132" x2="244" y2="200" stroke="{N}" stroke-width="15" stroke-linecap="round"/>
'''
icons["app-store-scraper"]=f'''
    <rect x="132" y="62" width="224" height="380" rx="44" fill="{W}" stroke="{N}" stroke-width="22"/>
    <rect x="212" y="88" width="64" height="12" rx="6" fill="{N}"/>
    <rect x="166" y="128" width="70" height="70" rx="18" fill="{S}"/>
    <rect x="252" y="128" width="70" height="70" rx="18" fill="{Y}"/>
    <rect x="166" y="214" width="70" height="70" rx="18" fill="{G}"/>
    <rect x="252" y="214" width="70" height="70" rx="18" fill="{N}"/>
    <rect x="166" y="300" width="70" height="70" rx="18" fill="{Y}"/>
    <circle cx="372" cy="360" r="78" fill="{N}" stroke="{W}" stroke-width="12"/>
    <polygon points="372,306 386,342 424,344 394,368 405,405 372,384 339,405 350,368 320,344 358,342" fill="{Y}" stroke="{Y}" stroke-width="6" stroke-linejoin="round"/>
'''
for k,v in icons.items():
    open(f"{k}.svg","w").write(HEAD+v+TAIL)

# Added 2026-11-25
icons2 = {}
icons2["seo-on-page-audit"] = f'''
    <rect x="58" y="78" width="360" height="300" rx="28" fill="{W}" stroke="{N}" stroke-width="20"/>
    <line x1="68" y1="140" x2="408" y2="140" stroke="{N}" stroke-width="16"/>
    <circle cx="104" cy="110" r="10" fill="{Y}"/><circle cx="136" cy="110" r="10" fill="{S}"/><circle cx="168" cy="110" r="10" fill="{G}"/>
    <polyline points="92,186 108,202 132,174" fill="none" stroke="{G}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="152" y="180" width="180" height="16" rx="8" fill="{N}"/>
    <polyline points="92,240 108,256 132,228" fill="none" stroke="{G}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="152" y="234" width="130" height="16" rx="8" fill="{S}"/>
    <path d="M94 286 L126 314 M126 286 L94 314" stroke="#D9534F" stroke-width="12" stroke-linecap="round"/>
    <rect x="152" y="292" width="100" height="16" rx="8" fill="{S}"/>
    <line x1="392" y1="372" x2="446" y2="426" stroke="{N}" stroke-width="36" stroke-linecap="round"/>
    <circle cx="350" cy="330" r="70" fill="{W}" stroke="{N}" stroke-width="22"/>
    <circle cx="350" cy="330" r="34" fill="{Y}"/>
'''
icons2["rss-feed-reader"] = f'''
    <rect x="150" y="70" width="290" height="250" rx="30" fill="{W}" stroke="{N}" stroke-width="16" opacity="0.65"/>
    <rect x="112" y="110" width="290" height="250" rx="30" fill="{W}" stroke="{N}" stroke-width="16"/>
    <rect x="284" y="150" width="96" height="16" rx="8" fill="{N}"/>
    <rect x="284" y="186" width="74" height="14" rx="7" fill="{S}"/>
    <rect x="284" y="216" width="88" height="14" rx="7" fill="{S}"/>
    <rect x="66" y="196" width="200" height="200" rx="40" fill="{Y}" stroke="{N}" stroke-width="18"/>
    <circle cx="116" cy="346" r="20" fill="{N}"/>
    <path d="M100 288 A62 62 0 0 1 174 362" fill="none" stroke="{N}" stroke-width="24" stroke-linecap="round"/>
    <path d="M100 236 A114 114 0 0 1 226 362" fill="none" stroke="{N}" stroke-width="24" stroke-linecap="round"/>
'''
for k, v in icons2.items():
    open(f"{k}.svg", "w").write(HEAD + v + TAIL)

# Added 2026-11-26
def photo(x, y, w, h, sw):
    sx, sy, r = x + w * 0.70, y + h * 0.30, h * 0.12
    m = f"{x+sw/2},{y+h-sw/2} {x+w*0.38},{y+h*0.45} {x+w*0.58},{y+h*0.68} {x+w*0.72},{y+h*0.55} {x+w-sw/2},{y+h-sw/2}"
    return (f'    <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{w*0.1:.0f}" fill="{W}" stroke="{N}" stroke-width="{sw}"/>\n'
            f'    <circle cx="{sx:.0f}" cy="{sy:.0f}" r="{r:.0f}" fill="{Y}"/>\n'
            f'    <polygon points="{m}" fill="{G}" stroke="{N}" stroke-width="{sw*0.6:.0f}" stroke-linejoin="round"/>\n')
icons3 = {}
icons3["pdf-text-extractor"] = f'''
    <path d="M110 64 H290 L370 144 V400 Q370 420 350 420 H130 Q110 420 110 400 Z" fill="{W}" stroke="{N}" stroke-width="20" stroke-linejoin="round"/>
    <path d="M290 64 V124 Q290 144 310 144 H370" fill="#D6EAF8" stroke="{N}" stroke-width="20" stroke-linejoin="round"/>
    <rect x="88" y="168" width="168" height="76" rx="14" fill="{N}"/>
    <text x="172" y="226" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="58" fill="{W}">PDF</text>
    <rect x="150" y="276" width="170" height="16" rx="8" fill="{S}"/>
    <rect x="150" y="312" width="130" height="16" rx="8" fill="{S}"/>
    <rect x="150" y="348" width="150" height="16" rx="8" fill="{S}"/>
    <circle cx="372" cy="356" r="78" fill="{Y}" stroke="{N}" stroke-width="16"/>
    <path d="M334 322 H410 M372 322 V398" fill="none" stroke="{N}" stroke-width="22" stroke-linecap="round"/>
'''
icons3["image-converter"] = photo(60, 70, 190, 150, 16) + photo(196, 196, 256, 206, 20) + f'''
    <path d="M300 92 Q392 96 400 166" fill="none" stroke="{Y}" stroke-width="22" stroke-linecap="round"/>
    <polygon points="372,156 428,156 400,198" fill="{Y}" stroke="{Y}" stroke-width="8" stroke-linejoin="round"/>
'''
for k, v in icons3.items():
    open(f"{k}.svg", "w").write(HEAD + v + TAIL)

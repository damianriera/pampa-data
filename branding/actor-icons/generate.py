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

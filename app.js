/* =====================================================================
   MAUSUMI WEDS BINAY – 3D DIGITAL WEDDING INVITATION   (Part 1 of 3)
   Part 1: config, envelope, scratch-off, boom, card opening, page flip.
   Everything runs offline. No APIs, no CDN, no tracking.

   HOW TO EDIT (no coding needed):
   - Change names, dates, phone numbers and wording in CONFIG below.
   - Change colours in CONFIG.colors (hex codes).
   - Send each guest their own link:  index.html?guest=Rahul   (or your site URL + ?guest=Rahul)
   ===================================================================== */

const CONFIG = {
  title: "Mausumi Weds Binay",
  names: { bride: "Mausumi", weds: "Weds", groom: "Binay" },

  // Greeting on the cover. {name} is replaced by the guest name from the link.
  greeting: {
    withName: "Dear {name} & Family, you are cordially invited.",
    withoutName: "Dear Family & Friends, you are cordially invited.",
  },
  envelopeLabelFallback: "Family & Friends",   // written on the envelope when there is no ?guest=

  bride: {
    full: "Ayushmati Mausumi (Baby)",
    line: "only daughter of Mrs. Puspalata Bhuyan & Mr. Sanat Kumar Bhuyan, Belpal, Badsahi, Mayurbhanj",
  },
  groom: {
    full: "Ayushman Binay (Manty)",
    line: "elder son of Mrs. Manjulata Behera & Mr. Trilochan Parida, Sansimilia, Kaptipada, Mayurbhanj",
  },

  events: [
    { id: "mehendi",   name: "Mehendi & Sangeet",                 date: "Saturday, 12 December 2026", time: "5:30 PM",
      startIST: "2026-12-12T17:30:00+05:30" },
    { id: "marriage",  name: "Mangalakruta, Marriage & Panigrahan", date: "Sunday, 13 December 2026",   time: "At night",
      startIST: "2026-12-13T20:00:00+05:30" /* only used for calendar files in Part 3; adjust if the muhurta differs */ },
    { id: "reception", name: "Reception & Dinner",                date: "Sunday, 13 December 2026",   time: "7:00 PM onwards",
      startIST: "2026-12-13T19:00:00+05:30" },
  ],

  venue: {
    name: "At Our Residence",
    address: "Belpal, Badshahi, Mayurbhanj, Odisha, India",
    mapsLink: "https://maps.app.goo.gl/qpUbxFLWQP4v9W4m9",
  },

  rsvp: {
    hosts: "Mrs. Puspalata Bhuyan & Mr. Sanat Kumar Bhuyan",
    phones: ["6371122623", "7854998757"],
    whatsappTo: "917854998757",            // used in Part 3 (wa.me link)
  },

  invocation: [
    "मंगलं भगवान विष्णुः । मंगलं गरुडध्वजः । मंगलं पुण्डरीकाक्षः मंगलाय तनो हरिः ॥",
    "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभः । निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥",
  ],
  ganesha: "Sri Sri Ganeshaya Namah",

  invitation:
    "With the divine blessings of the Almighty and the blessings of our elders, we joyfully invite you and your family to the sacred union of our beloved daughter Mausumi with Binay. Your gracious presence and heartfelt blessings will make this auspicious celebration of love, tradition and togetherness complete.",
  lines: {
    vivah: "Shubh Vivah",
    together: "Together with their families",
    sacred: "A Sacred Union",
    celebrations: "Join us as we celebrate love, tradition and togetherness",
    venue: "Where two hearts and two families become one",
    rsvp: "With folded hands, we request the honour of your presence and blessings.",
  },

  compliments: ["Kanha", "Mani", "Kanhu", "Bivu", "Pari", "Barsha", "Rublu", "Amresh", "Family, Friends & Relatives"],
  closing: { text: "Awaiting You...", by: "Mrs. Puspalata Bhuyan & Mr. Sanat Kumar Bhuyan" },

  colors: {
    ivory: "#FAF6F0", pink: "#F7CAD0", pink2: "#F4B6C2", rose: "#C94F6D",
    gold: "#C9A24B", ink: "#4A2B33", wax: "#A82E4E",
  },

  sound: { file: "audio/shehnai-dhol.mp3" },   // small bundled file, plays only after the guest taps
  scratch: { threshold: 0.55 },               // the seal cracks when this share of the foil is scratched
};

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     0. Small helpers
  ------------------------------------------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.round(w); c.height = Math.round(h); return c; };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const S = reduceMotion ? 0.35 : 1;                       // time scale for animations
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4 ||
    (window.matchMedia("(pointer: coarse)").matches && Math.min(innerWidth, innerHeight) < 520);

  // Apply the colours from CONFIG to the page
  Object.entries(CONFIG.colors).forEach(([k, v]) => document.documentElement.style.setProperty("--" + k, v));
  document.title = CONFIG.title + " | Wedding Invitation";

  // Guest name from ?guest=Name (sanitised: letters, numbers, spaces, . ' -  and max 40 characters)
  function sanitizeName(raw) {
    if (!raw) return "";
    let s = String(raw);
    try { s = s.replace(/[^\p{L}\p{M}\p{N} .'’\-]/gu, ""); } catch (e) { s = s.replace(/[^A-Za-z0-9 .'\-]/g, ""); }
    return s.replace(/\s+/g, " ").trim().slice(0, 40);
  }
  const guest = sanitizeName(new URLSearchParams(location.search).get("guest"));

  /* DOM */
  const stage = $("#stage"), glCanvas = $("#gl"), env2d = $("#env2d");
  const foilEl = $("#foil"), scratch = $("#scratch"), hud = $("#hud"), flash = $("#flash");
  const ringFg = $("#ringFg"), pctEl = $("#pct"), ringBox = $(".ring");
  const bookWrap = $("#bookWrap"), bookEl = $("#book"), dotsEl = $("#dots");
  const skipBtn = $("#skipBtn"), soundBtn = $("#soundBtn"), live = $("#live");
  const prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn");

  let state = "loading";       // loading > intro > scratch > boom > book
  const timelines = [];
  const track = (t) => { timelines.push(t); return t; };

  /* ------------------------------------------------------------------
     1. Sound: background music + sound effects (WebAudio, made locally) + shehnai/dhol file
        Browsers only allow sound and full screen after a tap, so the opening screen asks for one tap.
  ------------------------------------------------------------------ */
  const audio = new Audio(CONFIG.sound.file);
  audio.preload = "auto"; audio.volume = 0.9;
  let soundOn = true;
  try { soundOn = localStorage.getItem("wedSound") !== "0"; } catch (e) { /* storage may be blocked */ }
  let AC = null, master = null, bus = null, musicBus = null, musicOn = false, lastScr = 0;
  const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25];
  function initAudio() {
    try {
      if (!AC) {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain(); master.gain.value = soundOn ? 1 : 0;
        const comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
        bus = AC.createGain(); bus.connect(master);
        const len = AC.sampleRate * 2.2, ir = AC.createBuffer(2, len, AC.sampleRate);     // soft hall reverb
        for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 2.6); }
        const rev = AC.createConvolver(); rev.buffer = ir; const rg = AC.createGain(); rg.gain.value = 0.32; bus.connect(rev); rev.connect(rg); rg.connect(master);
        musicBus = AC.createGain(); musicBus.gain.value = 0.55; musicBus.connect(bus);
      }
      if (AC.state === "suspended") AC.resume();
    } catch (e) { AC = null; }
  }
  const NOW = () => AC.currentTime;
  const ok = () => AC && AC.state === "running" && soundOn;
  function envl(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(f, t, d, type, v, dest, f2) {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    envl(g, t, 0.008, d, v); o.connect(g); g.connect(dest || bus); o.start(t); o.stop(t + d + 0.05);
  }
  function noiseBurst(t, d, type, f0, f1, v) {
    const n = Math.floor(AC.sampleRate * d), b = AC.createBuffer(1, n, AC.sampleRate), x = b.getChannelData(0);
    for (let k = 0; k < n; k++) x[k] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = b;
    const f = AC.createBiquadFilter(); f.type = type; f.Q.value = 1.2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + d);
    const g = AC.createGain(); envl(g, t, d * 0.25, d * 0.75, v); src.connect(f); f.connect(g); g.connect(bus); src.start(t);
  }
  const bell = (f, v, d, t) => { t = t || NOW(); tone(f, t, d, "sine", v); tone(f * 2.76, t, d * 0.4, "sine", v * 0.35); tone(f * 4.1, t, d * 0.2, "sine", v * 0.15); };
  const SFX = {
    scratch() { if (!ok()) return; const n = performance.now(); if (n - lastScr < 55) return; lastScr = n; noiseBurst(NOW(), 0.07, "highpass", 2500, 5000, 0.05); },
    thud() { if (!ok()) return; tone(110, NOW(), 0.35, "sine", 0.5, null, 42); noiseBurst(NOW(), 0.12, "lowpass", 900, 200, 0.25); },
    seal() { if (ok()) [880, 1318.5, 1760].forEach((f, k) => bell(f, 0.05, 1.2, NOW() + k * 0.07)); },
    crack() { if (!ok()) return; const t = NOW(); noiseBurst(t, 0.28, "lowpass", 3000, 300, 0.7); tone(200, t, 0.3, "sine", 0.6, null, 40); [1046.5, 1318.5, 1568, 2093].forEach((f, k) => bell(f, 0.06, 1.6, t + 0.05 + k * 0.09)); },
    whoosh() { if (ok()) noiseBurst(NOW(), 0.9, "bandpass", 300, 3200, 0.22); },
    page() { if (!ok()) return; noiseBurst(NOW(), 0.28, "bandpass", 900, 2600, 0.12); bell(PENTA[(Math.random() * PENTA.length) | 0] * 2, 0.04, 1.1, NOW() + 0.12); },
    sparkle() { if (!ok()) return; const t = NOW(); for (let k = 0; k < 3; k++) bell(PENTA[(Math.random() * 6) | 0] * 4, 0.035, 0.9, t + k * 0.06); },
  };
  function startMusic() {          // soft tanpura-style drone + a gentle pentatonic melody that loops
    if (!AC || musicOn) return; musicOn = true; const t = NOW();
    [65.41, 98, 130.81, 196].forEach((f, k) => {
      const o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
      o.type = "sawtooth"; o.frequency.value = f; o.detune.value = k % 2 ? 5 : -5; lp.type = "lowpass"; lp.frequency.value = 520;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.028, t + 5); o.connect(lp); lp.connect(g); g.connect(musicBus); o.start();
    });
    const phrase = [0, 2, 4, 2, 3, 4, 5, 4, 2, 3, 1, 0, 2, 4, 5, 4]; let step = 0;
    setInterval(() => {
      if (!ok()) return; const f = PENTA[phrase[step % phrase.length]], tt = NOW();
      tone(f, tt, 1.3, "triangle", 0.07, musicBus); tone(f * 2, tt, 0.5, "sine", 0.025, musicBus);
      if (step % 4 === 0) tone(f / 2, tt, 2, "sine", 0.06, musicBus); step++;
    }, 620);
  }
  function paintSoundBtn() {
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    soundBtn.setAttribute("aria-label", soundOn ? "Mute sound" : "Unmute sound");
  }
  paintSoundBtn();
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem("wedSound", soundOn ? "1" : "0"); } catch (e) { /* ignore */ }
    paintSoundBtn(); audio.muted = !soundOn;
    if (soundOn) { initAudio(); startMusic(); }
    if (master) master.gain.setTargetAtTime(soundOn ? 1 : 0, NOW(), 0.05);
  });
  function playSound() {           // shehnai + dhol on the "boom"; the background music dips while it plays
    audio.muted = !soundOn; audio.currentTime = 0; audio.play().catch(() => {});
    if (musicBus) { musicBus.gain.setTargetAtTime(0.18, NOW(), 0.2); setTimeout(() => musicBus && musicBus.gain.setTargetAtTime(0.55, NOW(), 1.5), 9000); }
  }
  document.addEventListener("visibilitychange", () => { if (!AC) return; if (document.hidden) AC.suspend(); else if (soundOn) AC.resume(); });
  const buzz = (p) => { try { if (navigator.vibrate && !reduceMotion) navigator.vibrate(p); } catch (e) { /* ignore */ } };

  // Full screen (the browser only allows it after a tap, so it is triggered by the opening button)
  const fsBtn = $("#fsBtn");
  const fsOn = () => document.fullscreenElement || document.webkitFullscreenElement;
  function enterFS() {
    const el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!f) return;
    try { const r = f.call(el, { navigationUI: "hide" }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ }
  }
  function exitFS() { const f = document.exitFullscreen || document.webkitExitFullscreen; if (f) try { f.call(document); } catch (e) { /* ignore */ } }
  if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) fsBtn.hidden = true;
  fsBtn.addEventListener("click", () => (fsOn() ? exitFS() : enterFS()));

  /* ------------------------------------------------------------------
     2. Card pages (HTML). Part 2 will extend these with more decoration.
  ------------------------------------------------------------------ */

  // Delicate line-art frame: double rule, Odia kalka (paisley) corners, lotus, temple-border row.
  function frameSVG(full) {
    const kalka = "M2 2 C18 0 30 12 26 26 C23 34 12 36 8 28 C5 22 11 18 15 20 C11 14 6 10 2 2Z";
    const corners = [[17, 17, 1, 1], [283, 17, -1, 1], [17, 403, 1, -1], [283, 403, -1, -1]]
      .map(([x, y, sx, sy]) => `<path d="${kalka}" transform="translate(${x} ${y}) scale(${sx} ${sy})"/>`).join("");
    const petal = "M0 0 C-7 -10 -7 -18 0 -26 C7 -18 7 -10 0 0Z";
    const lotus = full === true
      ? [-72, -36, 0, 36, 72].map((a) => `<path d="${petal}" transform="translate(150 52) rotate(${a})"/>`).join("") +
        `<path d="M132 54 Q150 62 168 54"/>`
      : `<path d="M138 30 Q150 22 162 30"/>`;
    let temple = "";
    if (full) { for (let i = 0; i < 15; i++) { const x = 60 + i * 12; temple += `M${x} 394 l6 -9 l6 9 `; } temple = `<path d="${temple}"/>`; }
    return `<svg class="frame draw" viewBox="0 0 300 420" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g fill="none" stroke="url(#gFoilV)" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="282" height="402" rx="2" stroke-width="1.1"/>
        <rect x="14" y="14" width="272" height="392" rx="1" stroke-width=".4"/>
        ${corners}${lotus}${temple}
      </g></svg>`;
  }

  const ICONS = {
    mehendi: `<svg class="ico draw" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6 C20 4 27 12 24 21 C22 27 14 28 11 23 C9 19 13 16 16 17 C13 13 10 11 10 6Z"/><circle cx="19" cy="14" r="1"/><circle cx="17" cy="21" r=".8"/></g></svg>`,
    marriage: `<svg class="ico draw" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="12.500" cy="18" r="6.500"/><circle cx="19.500" cy="18" r="6.500"/><path d="M16 8 L14.500 5.500 L16 4 L17.500 5.500Z"/></g></svg>`,
    reception: `<svg class="ico draw" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20 Q16 31 27 20Z"/><path d="M16 5 C21 11 21 15 16 18 C11 15 11 11 16 5Z"/></g></svg>`,
  };

  const mapIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21 C7 15 5 12 5 9 A7 7 0 0 1 19 9 C19 12 17 15 12 21Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="9" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
  const phoneIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.500 3.500 L9.500 3.500 L11 7.500 L9 9 C10 11 12.500 13.500 15 15 L16.500 13 L20.500 14.500 L20.500 17.500 C20.500 19 19 20.500 17.500 20.500 C10.500 20 4 13.500 3.500 6.500 C3.500 5 5 3.500 6.500 3.500Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

  const venueArt = `<svg class="venue-art draw" viewBox="0 0 240 120" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 108 H220"/>
      <path d="M70 108 V62 H170 V108"/>
      <path d="M62 62 L120 30 L178 62Z"/>
      <path d="M120 30 V18 M115 18 H125 M120 14 V10"/>
      <path d="M108 108 V82 A12 12 0 0 1 132 82 V108"/>
      <path d="M82 76 H96 V90 H82Z M144 76 H158 V90 H144Z"/>
      <path d="M62 62 Q92 76 120 62 Q148 76 178 62"/>
      <path d="M72 70 l3 6 l3 -6 M92 74 l3 6 l3 -6 M112 70 l3 6 l3 -6 M132 70 l3 6 l3 -6 M152 74 l3 6 l3 -6"/>
      <path d="M36 108 V84 M36 84 C26 80 26 68 36 62 C46 68 46 80 36 84Z"/>
      <path d="M204 108 V84 M204 84 C194 80 194 68 204 62 C214 68 214 80 204 84Z"/>
    </g></svg>`;

  // Photographic 3D rose bouquets in all four corners of every printed page (one shared, cached image)
  function roseCorners() {
    return ["tl", "tr", "bl", "br"].map((c, k) =>
      `<img class="bq ${c}" style="--d:${(k * -1.3).toFixed(1)}s" src="img/bouquet.webp" alt="" aria-hidden="true" decoding="async" draggable="false">`).join("");
  }
  const divider = `<svg class="orn draw" viewBox="0 0 300 24" aria-hidden="true"><g fill="none" stroke="url(#gFoil)" stroke-width="1.1" stroke-linecap="round"><path d="M10 12 H112 M188 12 H290"/><path d="M150 2 C142 8 142 16 150 22 C158 16 158 8 150 2Z"/><path d="M150 22 C136 21 126 16 124 8 M150 22 C164 21 174 16 176 8"/><circle cx="118" cy="12" r="2"/><circle cx="182" cy="12" r="2"/></g></svg>`;

  function buildPages() {
    const ev = CONFIG.events, names = CONFIG.names, L = CONFIG.lines;
    const p = [];

    p.push({ title: "Cover", html: `
      ${frameSVG("cover")}
      <div class="inner">
        <div class="cover-gan"><img src="img/ganesha.webp" alt="Lord Ganesha" decoding="async"></div>
        <p class="cover-shloka" lang="hi">॥ श्री गणेशाय नमः ॥</p>
        <p class="greet" data-greet></p>
        <p class="n-name foil-text">${esc(names.bride)}</p>
        <p class="n-weds">${esc(names.weds)}</p>
        <p class="n-name foil-text">${esc(names.groom)}</p>
        ${divider}
        <p class="cover-date">12 &amp; 13 December 2026</p>
        <p class="cover-place">Belpal, Mayurbhanj, Odisha</p>
      </div>` });

    p.push({ title: "Invocation", html: `
      ${frameSVG(true)}
      <div class="inner">
        <p class="ganesha">${esc(CONFIG.ganesha)}</p>
        ${divider}
        <div class="shloka" lang="hi">${CONFIG.invocation.map((l) => `<p>${esc(l)}</p>`).join("")}</div>
        ${divider}
        <p class="bless-line">${esc(L.together)}</p>
      </div>` });

    p.push({ title: "The invitation", html: `
      ${frameSVG(false)}
      <div class="inner">
        <h2 class="h-sub">${esc(L.sacred)}</h2>
        <p class="wording">${esc(CONFIG.invitation)}</p>
        ${divider}
        <div class="families">
          <div><h3>${esc(CONFIG.bride.full)}</h3><p>${esc(CONFIG.bride.line)}</p></div>
          <div><h3>${esc(CONFIG.groom.full)}</h3><p>${esc(CONFIG.groom.line)}</p></div>
        </div>
      </div>` });

    p.push({ title: "The celebrations", html: `
      ${frameSVG(false)}
      <div class="inner">
        <h2 class="h-page">The Celebrations</h2>
        <p class="page-sub">${esc(L.celebrations)}</p>
        <ol class="timeline">
          ${ev.map((e) => `<li>${ICONS[e.id] || ""}<div><h3>${esc(e.name)}</h3><p>${esc(e.date)}</p><p class="when">${esc(e.time)}</p></div></li>`).join("")}
        </ol>
      </div>` });

    p.push({ title: "Venue", html: `
      ${frameSVG(false)}
      <div class="inner">
        <h2 class="h-page">Venue</h2>
        ${venueArt}
        <p class="venue-name">${esc(CONFIG.venue.name)}</p>
        <p class="venue-addr">${esc(CONFIG.venue.address)}</p>
        <a class="btn btn-solid" href="${esc(CONFIG.venue.mapsLink)}" target="_blank" rel="noopener">${mapIcon}<span>Open in Google Maps</span></a>
      </div>` });

    p.push({ title: "RSVP and blessings", html: `
      ${frameSVG(false)}
      <div class="inner">
        <h2 class="h-page">RSVP</h2>
        <p class="bless-line" style="margin:-1cqw 0 3cqw">${esc(L.rsvp)}</p>
        <p class="rsvp-names">${esc(CONFIG.rsvp.hosts)}</p>
        <div class="call-row">
          ${CONFIG.rsvp.phones.map((n) => `<a class="btn" href="tel:+91${esc(n)}">${phoneIcon}<span>Call ${esc(n)}</span></a>`).join("")}
        </div>
        <p class="compl-t">With Best Compliments From</p>
        <p class="compl">${CONFIG.compliments.map(esc).join(", ")}</p>
        <p class="closing foil-text">${esc(CONFIG.closing.text)}</p>
        <p class="closing-by">${esc(CONFIG.closing.by)}</p>
      </div>` });
    return p;
  }

  /* ------------------------------------------------------------------
     2b. Light 2D effects: tumbling rose petals (baked 3D images) + golden shimmer
  ------------------------------------------------------------------ */
  const petalImgs = ["petalA", "petalB", "petalC"].map((n) => { const i = new Image(); i.decoding = "async"; i.src = `img/${n}.webp`; return i; });
  function makeFX(canvas, o) {
    const ctx = canvas.getContext("2d"), NP = o.petals, NS = o.sparks, size = o.size || 1;
    let W = 0, H = 0, dpr = 1, raf = 0, run = false, last = 0;
    const P = [], SP = [];
    const mkP = (initial) => ({ x: rand(0, W), y: initial ? rand(-H * 0.1, H) : rand(-60, -10), z: rand(0.5, 1.15), vy: rand(16, 36), sw: rand(14, 40), ph: rand(0, 6.28), fr: rand(0.4, 1.1), r: rand(0, 6.28), vr: rand(-0.9, 0.9), fp: rand(0, 6.28), fs: rand(0.9, 2.4), img: petalImgs[(Math.random() * 3) | 0] });
    const mkS = () => ({ x: rand(0, W), y: rand(0, H), s: rand(4, 11), ph: rand(0, 6.28), sp: rand(0.7, 1.9) });
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (!P.length) { for (let i = 0; i < NP; i++) P.push(mkP(true)); for (let i = 0; i < NS; i++) SP.push(mkS()); }
    }
    function star(x, y, r, a) {
      ctx.globalAlpha = a; ctx.fillStyle = "#D9B04E"; ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r * 0.45, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r * 0.45, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - r * 0.8, y); ctx.quadraticCurveTo(x, y, x, y - r * 0.28); ctx.quadraticCurveTo(x, y, x + r * 0.8, y); ctx.quadraticCurveTo(x, y, x, y + r * 0.28); ctx.quadraticCurveTo(x, y, x - r * 0.8, y); ctx.fill();
      ctx.globalAlpha = a * 0.9; ctx.fillStyle = "#FFF6D6"; ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, 6.2832); ctx.fill();
    }
    function frame(t) {
      if (!run) return; raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t; const T0 = t / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      for (const q of SP) { const a = Math.pow(Math.max(0, Math.sin(T0 * q.sp + q.ph)), 3); if (a > 0.02) star(q.x, q.y, q.s * (0.6 + a * 0.7), a * 0.95); else if (Math.sin(T0 * q.sp + q.ph) < -0.98) { q.x = rand(0, W); q.y = rand(0, H); } }
      for (let i = 0; i < P.length; i++) {
        const q = P[i]; q.y += q.vy * q.z * dt; q.x += Math.sin(T0 * q.fr + q.ph) * q.sw * dt; q.r += q.vr * dt; q.fp += q.fs * dt;
        if (q.y > H + 40) { P[i] = mkP(false); continue; }
        const img = q.img; if (!img.complete || !img.naturalWidth) continue;
        const h = 40 * q.z * size * (W < 520 ? 0.85 : 1.2), w = h * (img.naturalWidth / img.naturalHeight), flip = 0.3 + 0.7 * Math.abs(Math.cos(q.fp));
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.scale(flip, 1); ctx.globalAlpha = 0.55 + 0.4 * (q.z / 1.15) * (0.7 + 0.3 * flip);
        ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    const onVis = () => { if (document.hidden) { run = false; cancelAnimationFrame(raf); } else if (o._on) { run = true; last = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", () => { if (o._on) resize(); });
    return {
      start() { if (o._on || reduceMotion && o.skipReduced) return; o._on = true; resize(); canvas.style.display = ""; run = true; last = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { o._on = false; run = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); },
    };
  }
  const fxN = reduceMotion ? 0.4 : 1;
  let bookFx = null;

  /* ------------------------------------------------------------------
     3. Book: render pages, flip by swipe / tap / keys / dots
  ------------------------------------------------------------------ */
  let pageDefs = [], pages = [], index = 0;

  function renderBook() {
    pageDefs = buildPages();
    bookEl.innerHTML = "";
    pages = pageDefs.map((d, i) => {
      const el = document.createElement("section");
      el.className = "page";
      el.style.zIndex = String(pageDefs.length - i);
      el.setAttribute("aria-label", `Page ${i + 1} of ${pageDefs.length}: ${d.title}`);
      el.innerHTML = d.html;
      el.insertAdjacentHTML("beforeend", roseCorners());
      bookEl.appendChild(el);
      return el;
    });
    // guest greeting (set with textContent so a name can never inject HTML)
    const g = $("[data-greet]", pages[0]);
    g.textContent = guest ? CONFIG.greeting.withName.replace("{name}", guest) : CONFIG.greeting.withoutName;

    dotsEl.innerHTML = "";
    pageDefs.forEach((d, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "dot";
      b.setAttribute("aria-label", `Go to page ${i + 1}: ${d.title}`);
      b.addEventListener("click", () => goTo(i));
      dotsEl.appendChild(b);
    });
    prepareDraw(bookEl);
    goTo(0, true);
  }

  // SVG line-art "draws itself" (stroke-dashoffset animation)
  const DRAW_SEL = ".draw path, .draw rect, .draw circle";
  function prepareDraw(root) {
    root.querySelectorAll(DRAW_SEL).forEach((el) => {
      let L = 0; try { L = el.getTotalLength(); } catch (e) { /* ignore */ }
      if (!L) return;
      el.style.strokeDasharray = L;
      el.style.strokeDashoffset = reduceMotion ? 0 : L;
    });
  }
  function drawIn(page) {
    if (!page || page.dataset.drawn) return;
    page.dataset.drawn = "1";
    const els = [...page.querySelectorAll(DRAW_SEL)].filter((e) => e.style.strokeDasharray);
    if (!els.length || reduceMotion) { els.forEach((e) => (e.style.strokeDashoffset = 0)); return; }
    gsap.to(els, { strokeDashoffset: 0, duration: 1.8, ease: "power1.inOut", stagger: 0.035, delay: 0.3 });
  }

  function goTo(n, instant) {
    n = clamp(n, 0, pages.length - 1);
    if (n === index && !instant) return;
    const forward = n > index;
    index = n;
    pages.forEach((p, i) => {
      p.classList.toggle("is-turned", i < index);
      p.classList.remove("is-fresh");
      p.inert = i !== index;
      p.setAttribute("aria-hidden", String(i !== index));
    });
    const cur = pages[index];
    if (forward && !instant) { void cur.offsetWidth; cur.classList.add("is-fresh"); }
    [...dotsEl.children].forEach((d, i) => d.setAttribute("aria-current", String(i === index)));
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === pages.length - 1;
    live.textContent = `Page ${index + 1} of ${pages.length}: ${pageDefs[index].title}`;
    if (state === "book" || instant) drawIn(cur);
    else drawIn(cur);
    if (!instant) { buzz(8); SFX.page(); }
  }
  prevBtn.addEventListener("click", () => goTo(index - 1));
  nextBtn.addEventListener("click", () => goTo(index + 1));

  // swipe / tap
  (function gestures() {
    let sx = 0, sy = 0, st = 0, active = false;
    bookEl.addEventListener("pointerdown", (e) => { active = true; sx = e.clientX; sy = e.clientY; st = performance.now(); });
    bookEl.addEventListener("pointerup", (e) => {
      if (!active) return; active = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) { goTo(index + (dx < 0 ? 1 : -1)); return; }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && performance.now() - st < 450) {
        if (e.target.closest("a,button")) return;
        const r = bookEl.getBoundingClientRect();
        goTo(index + (e.clientX - r.left > r.width * 0.42 ? 1 : -1));
      }
    });
    bookEl.addEventListener("pointercancel", () => { active = false; });
    window.addEventListener("keydown", (e) => {
      if (state !== "book") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { goTo(index + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { goTo(index - 1); }
    });
  })();

  // tap sparkles and a soft 3D tilt of the card
  const fxLayer = document.createElement("div"); fxLayer.className = "fx"; stage.appendChild(fxLayer);
  const sparkCols = ["#C9A24B", "#F4B6C2", "#C94F6D", "#E8CB7A", "#FAF6F0"];
  function sparkBurst(x, y, n, reach) {
    if (reduceMotion) return;
    for (let k = 0; k < n; k++) {
      const d = document.createElement("i"); d.className = "spark";
      d.style.left = x + "px"; d.style.top = y + "px"; d.style.background = sparkCols[k % sparkCols.length]; fxLayer.appendChild(d);
      const a = Math.random() * 6.28, r = rand(reach * 0.4, reach);
      gsap.fromTo(d, { scale: 1, opacity: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r + 18, scale: 0, opacity: 0, rotation: rand(-200, 200), duration: rand(0.6, 1.1), ease: "power2.out", onComplete: () => d.remove() });
    }
  }
  const trail = (x, y) => sparkBurst(x, y, 2, 34);
  window.addEventListener("pointerdown", (e) => {
    if (state === "book" && !e.target.closest("button,a")) { sparkBurst(e.clientX, e.clientY, 10, 90); SFX.sparkle(); }
  }, true);
  const tiltBook = (tx, ty) => {
    if (state !== "book" || reduceMotion) return;
    gsap.to(bookWrap, { rotationY: tx * 5, rotationX: -ty * 4, transformPerspective: 1400, duration: 0.9, ease: "power2.out", overwrite: "auto" });
  };

  function showBook(fast) {
    state = "book";
    bookWrap.classList.add("on");
    gsap.fromTo(bookWrap, { opacity: 0 }, { opacity: 1, duration: fast ? 0.4 : 0.7 * S, ease: "power2.out" });
    drawIn(pages[index]);
    if (!bookFx) { const cv = document.createElement("canvas"); cv.className = "fx-book"; cv.setAttribute("aria-hidden", "true"); stage.appendChild(cv); bookFx = makeFX(cv, { petals: Math.round((lowPower ? 4 : 7) * fxN) + 1, sparks: Math.round((lowPower ? 5 : 9) * fxN), size: 0.85 }); }
    bookFx.start();
    skipBtn.hidden = true;
    stage.dataset.state = "book";
    setTimeout(() => { try { bookEl.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 600);
  }

  /* ------------------------------------------------------------------
     4. Fonts (wait so canvas text uses the right typefaces)
  ------------------------------------------------------------------ */
  async function fontsReady() {
    const specs = ['600 64px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"', '400 64px "Great Vibes"',
      '500 40px "Playfair Display"', '400 20px "Lora"', '400 20px "Noto Serif Devanagari"'];
    try {
      await Promise.race([
        Promise.all(specs.map((s) => document.fonts.load(s, "MB Mausumi Weds Binay मंगलं"))),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch (e) { /* fall back to system fonts */ }
  }

  /* ------------------------------------------------------------------
     5. Procedural textures (paper grain, foil, wax seal)
  ------------------------------------------------------------------ */
  function grainCanvas(size, amp) {
    const c = mkCanvas(size, size), g = c.getContext("2d");
    const im = g.createImageData(size, size);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * amp * 2;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return c;
  }
  const GRAIN = grainCanvas(256, 38);

  // cotton-paper base: colour gradient + soft grain + fibres
  function paper(c, top, bottom) {
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, c.height);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    g.save();
    g.globalCompositeOperation = "soft-light"; g.globalAlpha = 0.5;
    g.fillStyle = g.createPattern(GRAIN, "repeat"); g.fillRect(0, 0, c.width, c.height);
    g.restore();
    g.save(); g.globalAlpha = 0.05; g.strokeStyle = "#8a5b66"; g.lineWidth = 0.8;
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * c.width, y = Math.random() * c.height, a = Math.random() * 6.28, l = rand(6, 24);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.restore();
  }

  function goldLine(g, w) {
    g.strokeStyle = CONFIG.colors.gold; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round";
  }

  // Envelope front (pocket) texture: V folds, gold hairlines, guest label
  function frontCanvas(W, H) {
    const c = mkCanvas(W, H), g = c.getContext("2d");
    paper(c, "#FBF6F1", "#F6C9D0");
    const cx = W / 2, vy = H * 0.54;
    const tri = (pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); };
    tri([[0, 0], [cx, vy], [0, H]], "rgba(120,60,75,.07)");
    tri([[W, 0], [cx, vy], [W, H]], "rgba(255,255,255,.12)");
    tri([[0, H], [cx, vy], [W, H]], "rgba(255,255,255,.10)");
    goldLine(g, 2.2);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(cx, vy); g.lineTo(W, 0);
    g.moveTo(0, H); g.lineTo(cx, vy); g.lineTo(W, H); g.stroke();
    g.globalAlpha = 0.55; goldLine(g, 1.2); g.strokeRect(14, 14, W - 28, H - 28); g.globalAlpha = 1;
    // shadow along folds
    const sh = g.createLinearGradient(0, vy - 16, 0, vy + 40);
    sh.addColorStop(0, "rgba(90,40,55,.0)"); sh.addColorStop(1, "rgba(90,40,55,.0)");
    // guest label in the bottom triangle
    const label = guest ? guest + " & Family" : CONFIG.envelopeLabelFallback;
    g.fillStyle = "#6a3a45"; g.textAlign = "center"; g.textBaseline = "middle";
    let fs = H * 0.085; g.font = `${fs}px "Great Vibes", cursive`;
    const maxW = W * 0.34;
    while (g.measureText(label).width > maxW && fs > 18) { fs -= 2; g.font = `${fs}px "Great Vibes", cursive`; }
    g.fillText(label, cx, H * 0.84);
    return c;
  }

  function flapOuterCanvas(w, h) {
    const c = mkCanvas(w, h), g = c.getContext("2d");
    paper(c, "#F4B6C2", "#F7CAD0");
    goldLine(g, 3);
    g.beginPath(); g.moveTo(22, 20); g.lineTo(w - 22, 20); g.lineTo(w / 2, h - 34); g.closePath(); g.stroke();
    g.globalAlpha = 0.5; goldLine(g, 1.2);
    g.beginPath(); g.moveTo(54, 40); g.lineTo(w - 54, 40); g.lineTo(w / 2, h - 80); g.closePath(); g.stroke();
    return c;
  }

  // inside of the flap and back of the envelope: deep rose lining with tiny gold diamonds
  function liningCanvas(w, h) {
    const c = mkCanvas(w, h), g = c.getContext("2d");
    paper(c, "#CF5A78", "#B94362");
    g.globalAlpha = 0.5; g.fillStyle = CONFIG.colors.gold;
    const step = 44;
    for (let y = 0; y < h + step; y += step) for (let x = 0; x < w + step; x += step) {
      const ox = ((y / step) % 2) * (step / 2);
      g.beginPath(); g.moveTo(x + ox, y - 5); g.lineTo(x + ox + 4, y); g.lineTo(x + ox, y + 5); g.lineTo(x + ox - 4, y); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
    return c;
  }

  function cardCanvas(w, h) {
    const c = mkCanvas(w, h), g = c.getContext("2d");
    paper(c, "#FFFDF9", "#F8EBE6");
    goldLine(g, 3); g.strokeRect(w * 0.04, h * 0.03, w * 0.92, h * 0.94);
    g.globalAlpha = 0.5; goldLine(g, 1); g.strokeRect(w * 0.055, h * 0.042, w * 0.89, h * 0.916); g.globalAlpha = 1;
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, "#a8832f"); gr.addColorStop(0.35, "#ecd48e"); gr.addColorStop(0.6, "#c9a24b"); gr.addColorStop(1, "#a8832f");
    g.fillStyle = gr; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `600 ${w * 0.16}px "Cormorant Garamond", serif`;
    g.fillText(CONFIG.names.bride, w / 2, h * 0.36);
    g.fillText(CONFIG.names.groom, w / 2, h * 0.6);
    g.fillStyle = CONFIG.colors.rose; g.font = `${w * 0.125}px "Great Vibes", cursive`;
    g.fillText(CONFIG.names.weds, w / 2, h * 0.48);
    g.fillStyle = CONFIG.colors.ink; g.font = `italic 500 ${w * 0.05}px "Cormorant Garamond", serif`;
    g.fillText("12 & 13 December 2026", w / 2, h * 0.72);
    return c;
  }

  // wax seal face: "M ♥ B" (bump = true makes the height map used for embossing)
  function sealCanvas(bump) {
    const s = 512, c = mkCanvas(s, s), g = c.getContext("2d");
    if (bump) { g.fillStyle = "#000"; g.fillRect(0, 0, s, s); }
    else {
      const rg = g.createRadialGradient(230, 210, 30, 256, 256, 290);
      rg.addColorStop(0, "#C23C60"); rg.addColorStop(1, CONFIG.colors.wax);
      g.fillStyle = rg; g.fillRect(0, 0, s, s);
    }
    const ink = bump ? "#fff" : "#EBCF80";
    g.strokeStyle = ink; g.fillStyle = ink;
    g.lineWidth = 7; g.beginPath(); g.arc(256, 256, 206, 0, 6.2832); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(256, 256, 190, 0, 6.2832); g.stroke();
    g.textAlign = "center"; g.textBaseline = "middle"; g.font = '600 172px "Cormorant Garamond", serif';
    g.fillText("M", 128, 262); g.fillText("B", 384, 262);
    const hx = 256, hy = 300;
    g.beginPath(); g.moveTo(hx, hy); g.bezierCurveTo(hx - 62, hy - 46, hx - 40, hy - 96, hx, hy - 64);
    g.bezierCurveTo(hx + 40, hy - 96, hx + 62, hy - 46, hx, hy); g.fill();
    return c;
  }

  /* ------------------------------------------------------------------
     6. The 3D scene
  ------------------------------------------------------------------ */
  let three = null;   // null = 2D fallback

  function build3D() {
    if (!window.THREE) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) { return null; }
    if (!renderer.getContext()) return null;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));     // capped at 2
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;                    // ACES tone mapping
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;                      // soft shadows
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const tex = (canvas, srgb = true) => {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = maxAniso; return t;
    };

    // --- soft studio light + procedural environment for sheen / clearcoat reflections
    (function lights() {
      const pm = new THREE.PMREMGenerator(renderer);
      const es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0xf2e3dc, side: THREE.BackSide })));
      const box = (col, x, y, z, sx, sy) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
      };
      box(new THREE.Color(9, 8.6, 8), 4, 6, 6, 6, 4);
      box(new THREE.Color(3.5, 2.2, 2.6), -6, 1, 3, 4, 6);
      box(new THREE.Color(2, 1.8, 1.8), 0, -5, 4, 10, 3);
      scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose();

      const key = new THREE.DirectionalLight(0xfff1e6, 2.6);
      key.position.set(2.5, 4.2, 6); key.castShadow = true;
      key.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
      const sc = key.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 18;
      key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 5;
      scene.add(key);
      scene.add(new THREE.HemisphereLight(0xfff6f0, 0xf3c3cd, 1.1));
      const rim = new THREE.PointLight(0xf4b6c2, 18, 14, 2); rim.position.set(-3.5, 2, -1.5); scene.add(rim);
    })();

    // shadow catcher behind the envelope (the page background stays transparent)
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.17 }));
    wall.position.z = -0.7; wall.receiveShadow = true; scene.add(wall);

    /* ---------- Envelope ---------- */
    const W = 3.6, H = 3.2, FH = 0.58 * H;
    const group = new THREE.Group(); scene.add(group);
    const grainTex = tex(GRAIN, false); grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping; grainTex.repeat.set(3, 3);
    const paperMat = (map, extra) => new THREE.MeshStandardMaterial(Object.assign({ map, roughness: 0.9, metalness: 0, bumpMap: grainTex, bumpScale: 0.5, envMapIntensity: 0.5 }, extra || {}));

    const lining = tex(liningCanvas(1024, 910));
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), paperMat(lining));
    back.position.z = -0.03; back.receiveShadow = true; group.add(back);

    const fShape = new THREE.Shape();
    fShape.moveTo(-W / 2, -H / 2); fShape.lineTo(W / 2, -H / 2); fShape.lineTo(W / 2, H / 2);
    fShape.lineTo(0, -0.04 * H); fShape.lineTo(-W / 2, H / 2); fShape.closePath();
    const fGeo = new THREE.ShapeGeometry(fShape);
    { const p = fGeo.attributes.position, uv = fGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + W / 2) / W, (p.getY(i) + H / 2) / H); }
    const front = new THREE.Mesh(fGeo, paperMat(tex(frontCanvas(1024, 910))));
    front.position.z = 0.02; front.castShadow = true; front.receiveShadow = true; group.add(front);

    // flap: a triangle hinged on the top edge, pink outside, rose lining inside
    const flap = new THREE.Group(); flap.position.set(0, H / 2, 0); group.add(flap);
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute("position", new THREE.Float32BufferAttribute([-W / 2, 0, 0, W / 2, 0, 0, 0, -FH, 0], 3));
    tGeo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
    tGeo.setIndex([0, 2, 1]); tGeo.computeVertexNormals();
    const flapOut = new THREE.Mesh(tGeo, paperMat(tex(flapOuterCanvas(1024, 528))));
    const flapIn = new THREE.Mesh(tGeo, paperMat(tex(liningCanvas(1024, 528)), { side: THREE.BackSide }));
    [flapOut, flapIn].forEach((m) => { m.position.z = 0.035; m.castShadow = true; m.receiveShadow = true; flap.add(m); });

    /* ---------- Wax seal (two halves so it can crack) ---------- */
    const R = 0.42;
    const sealPivot = new THREE.Group(); sealPivot.position.set(0, -FH + 0.4, 0.07); flap.add(sealPivot);
    const radius = (a) => R * (1 + 0.035 * Math.sin(5 * a + 0.6) + 0.025 * Math.sin(9 * a + 1.3));
    const arc = (a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [radius(a) * Math.cos(a), radius(a) * Math.sin(a)]; });
    const top = [0, radius(Math.PI / 2)], bot = [0, -radius(Math.PI / 2)];
    const crack = []; for (let k = 1; k <= 6; k++) crack.push([(k % 2 ? 0.05 : -0.05), top[1] + (bot[1] - top[1]) * (k / 7)]);
    const mkShape = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
    const rightPts = arc(-Math.PI / 2, Math.PI / 2, 28).concat(crack);                         // bottom > top (right side) > crack top > bottom
    const leftPts = arc(Math.PI / 2, (3 * Math.PI) / 2, 28).concat(crack.slice().reverse());   // top > bottom (left side) > crack bottom > top
    const wax = { roughness: 0.34, clearcoat: 0.85, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color("#ff8fa8"), envMapIntensity: 1.1 };
    const sealMap = tex(sealCanvas(false)), sealBump = tex(sealCanvas(true), false);
    [sealMap, sealBump].forEach((t) => { t.repeat.set(1 / (2 * R), 1 / (2 * R)); t.offset.set(0.5, 0.5); });
    const capMat = new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, map: sealMap, bumpMap: sealBump, bumpScale: 2.2 }, wax));
    const sideMat = new THREE.MeshPhysicalMaterial(Object.assign({ color: new THREE.Color(CONFIG.colors.wax) }, wax));
    const ext = { depth: 0.06, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.014, bevelSegments: 3, curveSegments: 10 };
    const mkHalf = (pts) => { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(mkShape(pts), ext), [capMat, sideMat]); m.castShadow = true; m.receiveShadow = true; return m; };
    const sealR = mkHalf(rightPts), sealL = mkHalf(leftPts);
    sealPivot.add(sealR, sealL);

    /* ---------- The card inside the envelope ---------- */
    const CW = 2.1, CH = 2.94;
    const cardMat = new THREE.MeshStandardMaterial({ map: tex(cardCanvas(750, 1050)), roughness: 0.85, bumpMap: grainTex, bumpScale: 0.4, transparent: true });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), cardMat);
    card.castShadow = true; group.add(card);

    /* ---------- Camera fitting ---------- */
    let camDist = 12;
    const tanHalf = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const vis = (z) => { const h = 2 * (camDist - (z || 0)) * tanHalf(); return { h, w: h * camera.aspect }; };

    /* ---------- Petals (rose-petal explosion, then gentle drift) ---------- */
    function petalGeometry() {
      if (window.RoseKit) { const g = RoseKit.loosePetalGeometry("blush", 3); g.scale(0.3, 0.3, 0.3); g.translate(0, -0.15, 0); return g; }
      return petalGeometryFlat();
    }
    function petalGeometryFlat() {
      const g = new THREE.PlaneGeometry(0.3, 0.4, 6, 8), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i); const y = p.getY(i), v = (y + 0.2) / 0.4;
        x *= Math.pow(Math.sin(Math.PI * Math.pow(v, 0.75)), 0.6) * 0.95 + 0.08 * (1 - v);
        const z = x * x * 2.4 + 0.07 * Math.pow(v, 3) - 0.025 * (1 - v);
        p.setXYZ(i, x, y, z);
      }
      g.computeVertexNormals(); return g;
    }
    const petals = (function () {
      const N = lowPower ? 90 : 150, AMBIENT = lowPower ? 20 : 34;
      const mat = window.RoseKit ? RoseKit.material("rose", { env: 0.55 }) : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color("#ffd7df"), side: THREE.DoubleSide, envMapIntensity: 0.55 });
      const mesh = new THREE.InstancedMesh(petalGeometry(), mat, N);
      mesh.frustumCulled = false; scene.add(mesh);
      const pal = (window.RoseKit ? ["#ffffff", "#ffe6ec", "#ffd3de", "#fff4ec", "#ffc7d5", "#ffffff", "#ffe0e8"] : ["#F7CAD0", "#F4B6C2", "#EE9BB0", "#E58AA0", "#C94F6D", "#FAF6F0", "#F7CAD0"]).map((c) => new THREE.Color(c));
      const P = Array.from({ length: N }, (_, i) => {
        mesh.setColorAt(i, pal[(Math.random() * pal.length) | 0]);
        return { p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)), w: new THREE.Vector3(rand(-2, 2), rand(-2, 2), rand(-2, 2)), s: 0.6, ph: Math.random() * 6.28, mode: 0, amb: i < AMBIENT };
      });
      mesh.instanceColor.needsUpdate = true;
      const m = new THREE.Object3D(); let time = 0, ambientOn = false;
      const respawn = (q, anywhere) => {
        const v = vis(0);
        q.p.set(rand(-0.55, 0.55) * v.w, anywhere ? rand(-0.5, 0.5) * v.h : v.h / 2 + 0.4, rand(-3, 1));
        q.v.set(rand(-0.15, 0.15), rand(-0.7, -0.3), 0); q.s = rand(0.4, 0.8); q.mode = 2;
      };
      return {
        burst(origin) {
          P.forEach((q) => {
            q.p.copy(origin).add(new THREE.Vector3(rand(-0.15, 0.15), rand(-0.15, 0.15), rand(0, 0.2)));
            q.v.set(rand(-7, 7), rand(1.5, 8), rand(1, 5)); q.s = rand(0.55, 1.05); q.mode = 1;
          }); ambientOn = true;
        },
        ambient(on, instant) { ambientOn = on; if (on && instant) P.forEach((q) => { if (q.amb) respawn(q, true); }); },
        update(dt) {
          time += dt; const bottom = vis(0).h / 2 + 1;
          for (let i = 0; i < N; i++) {
            const q = P[i];
            if (q.mode === 0) { m.scale.setScalar(0); m.updateMatrix(); mesh.setMatrixAt(i, m.matrix); continue; }
            const fall = q.mode === 1 ? -0.95 : -0.5, k = 1 - Math.exp(-dt * (q.mode === 1 ? 0.9 : 1.5)), kx = 1 - Math.exp(-dt * 1.4);
            q.v.y += (fall - q.v.y) * k; q.v.x -= q.v.x * kx; q.v.z -= q.v.z * kx;
            q.p.addScaledVector(q.v, dt); q.p.x += Math.sin(time * 1.7 + q.ph) * 0.35 * dt;
            q.r.x += q.w.x * dt * 0.6; q.r.y += q.w.y * dt * 0.6; q.r.z += q.w.z * dt * 0.6;
            if (q.p.y < -bottom) { if (ambientOn && q.amb) respawn(q, false); else q.mode = 0; }
            m.position.copy(q.p);
            m.rotation.set(q.r.x + Math.sin(time * 3 + q.ph) * 0.5, q.r.y, q.r.z + Math.cos(time * 2.4 + q.ph) * 0.4);
            m.scale.setScalar(q.s); m.updateMatrix(); mesh.setMatrixAt(i, m.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
        },
      };
    })();

    /* ---------- 3D roses: layered petal geometry (decor on the envelope + falling roses) ---------- */
    function roseGeometry() {
      if (window.RoseKit) return RoseKit.roseGeometry({ scheme: "blush", seed: 21, open: 0.9, layers: 5, nu: 9, nv: 8 });
      return roseGeometryFlat();
    }
    function roseGeometryFlat() {
      const parts = [], rings = [[3, 0.15, 0.1, 0.04], [5, 0.2, 0.38, 0.09], [7, 0.26, 0.62, 0.15], [9, 0.32, 0.88, 0.21], [11, 0.38, 1.12, 0.26]];
      rings.forEach(([n, sz, tilt, r0], ri) => {
        for (let k = 0; k < n; k++) {
          const g = new THREE.PlaneGeometry(1, 1, 4, 5); g.translate(0, 0.5, 0);
          const p = g.attributes.position, shade = [];
          for (let q = 0; q < p.count; q++) {
            const x = p.getX(q), y = p.getY(q), xx = x * (0.55 + 0.55 * Math.sin(Math.PI * (0.12 + 0.8 * y)));
            p.setXYZ(q, xx, y, xx * xx * 1.5 + 0.05 * y * y * (ri + 1)); shade.push(0.55 + 0.45 * y * (0.7 + ri * 0.08));
          }
          g.scale(sz, sz * 1.15, sz); g.rotateY(Math.PI); g.rotateX(tilt); g.translate(0, 0, r0); g.rotateY((k * Math.PI * 2) / n + ri * 0.7); g.computeVertexNormals();
          parts.push({ g, shade });
        }
      });
      const pos = [], nor = [], col = [], idx = []; let off = 0;
      parts.forEach(({ g, shade }) => {
        const p = g.attributes.position, nn = g.attributes.normal;
        for (let q = 0; q < p.count; q++) { pos.push(p.getX(q), p.getY(q), p.getZ(q)); nor.push(nn.getX(q), nn.getY(q), nn.getZ(q)); col.push(shade[q], shade[q], shade[q]); }
        for (let q = 0; q < g.index.count; q++) idx.push(g.index.getX(q) + off); off += p.count;
      });
      const m = new THREE.BufferGeometry();
      m.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); m.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); m.setIndex(idx);
      return m;
    }
    const roseGeo = roseGeometry();
    const roseMat = (hex) => window.RoseKit ? (() => { const m = RoseKit.material("rose", { env: 0.7 }); m.color.set(hex); return m; })() : new THREE.MeshPhysicalMaterial({ color: hex, vertexColors: true, roughness: 0.45, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffd0da"), side: THREE.DoubleSide, envMapIntensity: 0.7 });
    const leafGeo = window.RoseKit ? (() => { const g = RoseKit.leafGeometry(5); g.scale(0.55, 0.55, 0.55); return g; })() : (function () {
      const g = new THREE.PlaneGeometry(0.2, 0.55, 2, 6), p = g.attributes.position; g.translate(0, 0.275, 0);
      for (let q = 0; q < p.count; q++) { const y = p.getY(q) / 0.55, x = p.getX(q) * Math.sin(Math.PI * Math.min(1, y * 0.95 + 0.05)) * 1.3; p.setXYZ(q, x, p.getY(q), Math.abs(x) * 0.7 + y * y * 0.05); }
      g.computeVertexNormals(); return g;
    })();
    const leafMat = window.RoseKit ? RoseKit.material("leaf") : new THREE.MeshStandardMaterial({ color: 0x3d7a4b, roughness: 0.55, side: THREE.DoubleSide });
    function roseCluster(parent, x, y, z, sc, dir) {
      [-1, 1].forEach((sg) => { const l = new THREE.Mesh(leafGeo, leafMat); l.position.set(x, y, z - 0.02); l.rotation.z = sg * 1.15 + (dir < 0 ? 0.4 : -0.4); l.scale.setScalar(sc * 1.7); l.castShadow = true; parent.add(l); });
      [[0, 0, 0xFFFFFF, 1], [0.27 * dir, 0.14, 0xFFE6EC, 0.68], [-0.05 * dir, 0.3, 0xF9CFDA, 0.55]].forEach(([dx, dy, hex, k]) => {
        const r = new THREE.Mesh(roseGeo, roseMat(hex)); r.position.set(x + dx * sc * 2, y + dy * sc * 2, z + 0.02 * k); r.rotation.x = Math.PI / 2 - 0.25; r.scale.setScalar(sc * k); r.castShadow = true; parent.add(r);
      });
    }
    roseCluster(group, -W / 2 + 0.3, -H / 2 + 0.3, 0.08, 0.5, 1);
    roseCluster(group, W / 2 - 0.3, -H / 2 + 0.3, 0.08, 0.5, -1);
    roseCluster(flap, -W / 2 + 0.32, -0.3, 0.09, 0.48, 1);
    roseCluster(flap, W / 2 - 0.32, -0.3, 0.09, 0.48, -1);

    const roses = (function () {
      const N = lowPower ? 8 : 14;
      const mesh = new THREE.InstancedMesh(roseGeo, roseMat(0xffffff), N); mesh.frustumCulled = false; scene.add(mesh);
      const pal = ["#ffffff", "#ffe3ea", "#ffd0dc", "#fff3ea", "#ffc4d2", "#ffffff"].map((c) => new THREE.Color(c));
      const P = Array.from({ length: N }, (_, i) => { mesh.setColorAt(i, pal[i % pal.length]); return { p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)), w: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)), s: 0.5, ph: Math.random() * 6.28, mode: 0 }; });
      mesh.instanceColor.needsUpdate = true;
      const m = new THREE.Object3D(); let time = 0, amb = false;
      const respawn = (q, any) => { const v = vis(0); q.p.set(rand(-0.55, 0.55) * v.w, any ? rand(-0.5, 0.5) * v.h : v.h / 2 + 0.6, rand(-2.5, 1.5)); q.v.set(rand(-0.1, 0.1), rand(-0.55, -0.25), 0); q.s = rand(0.4, 0.7); q.mode = 2; };
      return {
        burst(o) { P.forEach((q) => { q.p.copy(o); q.v.set(rand(-6, 6), rand(2, 8), rand(1, 5)); q.s = rand(0.45, 0.75); q.mode = 1; }); amb = true; },
        ambient(on, instant) { amb = on; if (on && instant) P.forEach((q) => respawn(q, true)); },
        update(dt) {
          time += dt; const bottom = vis(0).h / 2 + 1;
          for (let i = 0; i < N; i++) {
            const q = P[i];
            if (q.mode === 0) { m.scale.setScalar(0); m.updateMatrix(); mesh.setMatrixAt(i, m.matrix); continue; }
            const k = 1 - Math.exp(-dt * (q.mode === 1 ? 0.9 : 1.5)), kx = 1 - Math.exp(-dt * 1.4);
            q.v.y += ((q.mode === 1 ? -0.8 : -0.4) - q.v.y) * k; q.v.x -= q.v.x * kx; q.v.z -= q.v.z * kx;
            q.p.addScaledVector(q.v, dt); q.p.x += Math.sin(time * 1.2 + q.ph) * 0.25 * dt;
            q.r.x += q.w.x * dt * 0.5; q.r.y += q.w.y * dt * 0.5; q.r.z += q.w.z * dt * 0.5;
            if (q.p.y < -bottom) { if (amb) respawn(q, false); else q.mode = 0; }
            m.position.copy(q.p); m.rotation.set(q.r.x, q.r.y, q.r.z); m.scale.setScalar(q.s); m.updateMatrix(); mesh.setMatrixAt(i, m.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
        },
      };
    })();

    /* ---------- Confetti cannons (instanced) ---------- */
    const confetti = (function () {
      const N = reduceMotion ? 70 : lowPower ? 150 : 260;
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.06), mat, N);
      mesh.frustumCulled = false; scene.add(mesh);
      const pal = ["#C9A24B", "#E6CF8A", "#F4B6C2", "#C94F6D", "#FAF6F0", "#F7CAD0"].map((c) => new THREE.Color(c));
      const P = Array.from({ length: N }, (_, i) => {
        mesh.setColorAt(i, pal[(Math.random() * pal.length) | 0]);
        return { p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), delay: 0, mode: 0 };
      });
      mesh.instanceColor.needsUpdate = true;
      const m = new THREE.Object3D();
      return {
        fire() {
          const v = vis(1);
          P.forEach((q, i) => {
            const side = i % 2 ? 1 : -1, a = THREE.MathUtils.degToRad(rand(55, 80)), sp = rand(7, 13) * (v.h / 4.6);
            q.p.set(side * v.w * 0.47, -v.h * 0.47, 1); q.p.x += rand(-0.1, 0.1);
            q.v.set(-side * Math.cos(a) * sp * 0.7, Math.sin(a) * sp * 1.1, rand(-1.5, 2.5));
            q.w.set(rand(-9, 9), rand(-9, 9), rand(-9, 9)); q.r.set(rand(0, 6), rand(0, 6), rand(0, 6));
            q.delay = rand(0, 0.35); q.mode = 1;
          });
        },
        update(dt) {
          const bottom = vis(1).h / 2 + 1;
          for (let i = 0; i < N; i++) {
            const q = P[i];
            if (q.mode === 0 || q.delay > 0) { if (q.delay > 0) q.delay -= dt; m.scale.setScalar(0); m.updateMatrix(); mesh.setMatrixAt(i, m.matrix); continue; }
            q.v.y -= 9 * dt; const d = Math.exp(-0.9 * dt); q.v.multiplyScalar(d); if (q.v.y < -2.3) q.v.y = -2.3;
            q.p.addScaledVector(q.v, dt); q.r.addScaledVector(q.w, dt);
            if (q.p.y < -bottom) q.mode = 0;
            m.position.copy(q.p); m.rotation.set(q.r.x, q.r.y, q.r.z); m.scale.setScalar(1); m.updateMatrix(); mesh.setMatrixAt(i, m.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
        },
      };
    })();

    /* ---------- Gold sparkle fireworks (GPU: positions are computed in the vertex shader) ---------- */
    const sparks = (function () {
      const bursts = reduceMotion ? 3 : 7, per = lowPower ? 60 : 90, n = bursts * per;
      const geo = new THREE.BufferGeometry();
      const A = { c: new Float32Array(n * 3), d: new Float32Array(n * 3), dl: new Float32Array(n), col: new Float32Array(n * 3), sz: new Float32Array(n) };
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geo.setAttribute("aCenter", new THREE.BufferAttribute(A.c, 3));
      geo.setAttribute("aDir", new THREE.BufferAttribute(A.d, 3));
      geo.setAttribute("aDelay", new THREE.BufferAttribute(A.dl, 1));
      geo.setAttribute("aColor", new THREE.BufferAttribute(A.col, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(A.sz, 1));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uFire: { value: 1e9 }, uScale: { value: 600 } },
        vertexShader: `
          attribute vec3 aCenter; attribute vec3 aDir; attribute float aDelay; attribute vec3 aColor; attribute float aSize;
          uniform float uTime; uniform float uFire; uniform float uScale;
          varying vec3 vC; varying float vA;
          void main(){
            float t = uTime - uFire - aDelay; float life = 1.8;
            float on = step(0.0, t) * step(t, life); float tt = max(t, 0.0);
            float travel = (1.0 - exp(-tt * 2.6)) / 2.6;
            vec3 p = aCenter + aDir * travel; p.y -= 0.35 * tt * tt;
            float tw = 0.6 + 0.4 * sin(tt * 30.0 + aDelay * 50.0 + dot(aDir, vec3(7.0)));
            vA = on * (1.0 - tt / life) * tw; vC = aColor;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = aSize * uScale / (-mv.z) * on;
          }`,
        fragmentShader: `
          varying vec3 vC; varying float vA;
          void main(){
            vec2 c = gl_PointCoord - 0.5; float d = length(c);
            float glow = pow(smoothstep(0.5, 0.0, d), 1.6);
            float star = max(0.0, 1.0 - abs(c.x) * 14.0) * max(0.0, 1.0 - abs(c.y) * 2.2) + max(0.0, 1.0 - abs(c.y) * 14.0) * max(0.0, 1.0 - abs(c.x) * 2.2);
            gl_FragColor = vec4(vC, (glow + star * 0.5) * vA);
          }`,
      });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
      const pal = [[1, 0.82, 0.38], [1, 0.93, 0.7], [1, 0.72, 0.78], [0.93, 0.45, 0.6], [1, 1, 0.95]];
      return {
        mat,
        fire(now) {
          const v = vis(1.5);
          for (let b = 0; b < bursts; b++) {
            const cx = rand(-0.38, 0.38) * v.w, cy = rand(-0.05, 0.4) * v.h, cz = 1.5 + rand(-0.5, 0.5);
            const delay = b * 0.22 + rand(0, 0.1), col = pal[b % pal.length], reach = v.h * rand(0.18, 0.27);
            for (let j = 0; j < per; j++) {
              const i = b * per + j;
              let x = rand(-1, 1), y = rand(-1, 1), z = rand(-1, 1); const l = Math.hypot(x, y, z) || 1;
              const sp = reach * rand(0.45, 1);
              A.c.set([cx, cy, cz], i * 3); A.d.set([(x / l) * sp, (y / l) * sp, (z / l) * sp], i * 3);
              A.dl[i] = delay + rand(0, 0.05); A.col.set(col, i * 3); A.sz[i] = rand(0.05, 0.12);
            }
          }
          ["aCenter", "aDir", "aDelay", "aColor", "aSize"].forEach((k) => (geo.attributes[k].needsUpdate = true));
          mat.uniforms.uFire.value = now;
        },
      };
    })();

    /* ---------- Resize / fit ---------- */
    function fit() {
      const w = innerWidth, h = innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const t = tanHalf();
      camDist = Math.max(2.45 / t, 2.3 / (t * camera.aspect));
      camera.updateProjectionMatrix();
      sparks.mat.uniforms.uScale.value = renderer.domElement.height / (2 * t);
    }

    return { renderer, scene, camera, group, flap, sealPivot, sealL: sealL, sealR: sealR, card, cardMat, CW, CH, W, H, petals, roses, confetti, sparks, fit, vis, getDist: () => camDist };
  }

  /* ------------------------------------------------------------------
     7. Main render loop, camera shake and parallax
  ------------------------------------------------------------------ */
  const shake = { amp: 0 };
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  let elapsed = 0, lastT = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!three || document.hidden) { lastT = now; return; }
    const dt = Math.min((now - lastT) / 1000, 0.05); lastT = now; elapsed += dt;
    three.petals.update(dt); three.roses.update(dt); three.confetti.update(dt);
    three.sparks.mat.uniforms.uTime.value = elapsed;
    par.x += (par.tx - par.x) * 0.06; par.y += (par.ty - par.y) * 0.06;
    const d = three.getDist(), sh = reduceMotion ? 0 : shake.amp;
    three.camera.position.set(par.x * 0.35 + (Math.random() - 0.5) * sh * 0.25, par.y * 0.2 + (Math.random() - 0.5) * sh * 0.25, d);
    three.camera.lookAt(0, 0, 0);
    three.renderer.render(three.scene, three.camera);
  }

  // pointer and device-tilt parallax (only once the card is revealed)
  window.addEventListener("pointermove", (e) => {
    if (state !== "book" && state !== "boom") return;
    par.tx = (e.clientX / innerWidth - 0.5) * 2; par.ty = -(e.clientY / innerHeight - 0.5) * 2; tiltBook(par.tx, par.ty);
  });
  window.addEventListener("deviceorientation", (e) => {
    if ((state !== "book" && state !== "boom") || e.gamma == null) return;
    par.tx = clamp(e.gamma / 30, -1, 1); par.ty = clamp(((e.beta || 45) - 45) / 30, -1, 1); tiltBook(par.tx, par.ty);
  });
  function askMotionPermission() {      // iOS needs a tap before tilt data is available
    try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") DeviceOrientationEvent.requestPermission().catch(() => {}); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------
     8. Scene 2: scratch-off foil
  ------------------------------------------------------------------ */
  let foilReady = false, brush = 24, lastProbe = 0, probePending = false;
  const probe = mkCanvas(48, 48), pg = probe.getContext("2d", { willReadFrequently: true });
  const RING_LEN = 163.36;

  function envelopeRect() {
    if (!three) { const r = env2d.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }
    three.camera.position.set(0, 0, three.getDist()); three.camera.lookAt(0, 0, 0); three.camera.updateMatrixWorld(true);
    three.group.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const pt = (x, y) => { v.set(x, y, 0.03); three.group.localToWorld(v); v.project(three.camera); return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight }; };
    const a = pt(-three.W / 2, three.H / 2), b = pt(three.W / 2, -three.H / 2);
    return { left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y };
  }
  function placeFoil() {
    const r = envelopeRect(), inset = 0.035;
    foilEl.style.left = r.left + r.width * inset + "px"; foilEl.style.top = r.top + r.height * inset + "px";
    foilEl.style.width = r.width * (1 - inset * 2) + "px"; foilEl.style.height = r.height * (1 - inset * 2) + "px";
  }

  function paintFoil() {
    const r = foilEl.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    scratch.width = Math.max(200, Math.round(r.width * dpr)); scratch.height = Math.max(160, Math.round(r.height * dpr));
    const w = scratch.width, h = scratch.height, g = scratch.getContext("2d");
    brush = Math.max(20, w * 0.055);
    const gr = g.createLinearGradient(0, 0, w, h);
    [[0, "#B88F34"], [0.2, "#F1DC9A"], [0.44, "#C9A24B"], [0.62, "#F7E9B8"], [0.82, "#B88A2E"], [1, "#E2C374"]].forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.save();
    for (let i = 0; i < 280; i++) {                      // brushed-metal streaks
      g.globalAlpha = 0.05 + Math.random() * 0.09; g.strokeStyle = Math.random() < 0.5 ? "#fff6d6" : "#7b5a18";
      g.lineWidth = Math.random() * 1.6 + 0.3; const y = Math.random() * h;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (Math.random() - 0.5) * 30 * dpr); g.stroke();
    }
    g.restore();
    const im = g.getImageData(0, 0, w, h), d = im.data;  // fine sparkle noise
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8; }
    g.putImageData(im, 0, 0);
    // embossed border and lattice
    g.lineWidth = 2 * dpr;
    g.strokeStyle = "rgba(255,246,214,.8)"; g.strokeRect(w * 0.03, h * 0.04, w * 0.94, h * 0.92);
    g.strokeStyle = "rgba(110,78,20,.5)"; g.strokeRect(w * 0.03 + 2 * dpr, h * 0.04 + 2 * dpr, w * 0.94, h * 0.92);
    g.globalAlpha = 0.16; g.strokeStyle = "#7b5a18"; g.lineWidth = dpr;
    const st = 38 * dpr;
    for (let x = -h; x < w + h; x += st) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke(); g.beginPath(); g.moveTo(x + h, 0); g.lineTo(x, h); g.stroke(); }
    g.globalAlpha = 1;
    // embossed golden lotus mandala (no wording; the ripple invites the touch)
    const mc = { x: w / 2, y: h * 0.44 }, R = Math.min(w * 0.3, h * 0.36);
    const lotus = (dx, dy, col, lw) => {
      g.save(); g.translate(dx, dy); g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "round";
      const ring = (n, r0, r1, wd) => { for (let i = 0; i < n; i++) { g.save(); g.translate(mc.x, mc.y); g.rotate((i * Math.PI * 2) / n); g.beginPath(); g.moveTo(0, -r0);
        g.bezierCurveTo(wd, -(r0 + r1) / 2, wd, -(r0 + (r1 - r0) * 0.75), 0, -r1); g.bezierCurveTo(-wd, -(r0 + (r1 - r0) * 0.75), -wd, -(r0 + r1) / 2, 0, -r0); g.stroke(); g.restore(); } };
      ring(16, R * 0.55, R, R * 0.16); ring(12, R * 0.32, R * 0.66, R * 0.11); ring(8, R * 0.1, R * 0.36, R * 0.07);
      g.beginPath(); g.arc(mc.x, mc.y, R * 1.08, 0, 6.2832); g.stroke(); g.beginPath(); g.arc(mc.x, mc.y, R * 1.16, 0, 6.2832); g.stroke();
      g.beginPath(); g.arc(mc.x, mc.y, R * 0.07, 0, 6.2832); g.stroke(); g.restore();
    };
    lotus(dpr, dpr, "rgba(255,248,222,.85)", 1.7 * dpr); lotus(-dpr, -dpr, "rgba(95,66,14,.7)", 1.5 * dpr); lotus(0, 0, "#B08A32", 1.2 * dpr);
    g.textAlign = "center"; g.textBaseline = "middle";
    const fs = Math.min(w * 0.07, h * 0.12); g.font = `italic 500 ${fs}px "Cormorant Garamond", serif`;
    const nm = guest ? `${guest} & Family` : "Family & Friends", ty = h * 0.86;
    g.fillStyle = "rgba(255,248,222,.9)"; g.fillText(nm, w / 2 + dpr, ty + dpr);
    g.fillStyle = "rgba(95,66,14,.8)"; g.fillText(nm, w / 2 - dpr, ty - dpr);
    g.fillStyle = "#9A7625"; g.fillText(nm, w / 2, ty);
    foilReady = true;
  }

  function erasedShare() {
    pg.clearRect(0, 0, 48, 48); pg.drawImage(scratch, 0, 0, 48, 48);
    const d = pg.getImageData(0, 0, 48, 48).data; let a = 0;
    for (let i = 3; i < d.length; i += 4) a += d[i];
    return 1 - a / (48 * 48 * 255);
  }
  function setProgress(share) {
    const p = clamp(share / CONFIG.scratch.threshold, 0, 1);
    ringFg.style.strokeDashoffset = String(RING_LEN * (1 - p));
    const pct = Math.round(p * 100); pctEl.textContent = pct + "%"; ringBox.setAttribute("aria-valuenow", String(pct));
    return p;
  }
  function scheduleProbe() {
    if (probePending) return; probePending = true;
    requestAnimationFrame(() => {
      probePending = false; const now = performance.now();
      if (now - lastProbe < 90 || state !== "scratch") return; lastProbe = now;
      if (setProgress(erasedShare()) >= 1) boom();
    });
  }
  (function scratchInput() {
    let down = false, last = null, lastBuzz = 0;
    const pt = (e) => { const r = scratch.getBoundingClientRect(); return { x: ((e.clientX - r.left) * scratch.width) / r.width, y: ((e.clientY - r.top) * scratch.height) / r.height }; };
    const stroke = (a, b) => {
      const g = scratch.getContext("2d");
      g.globalCompositeOperation = "destination-out"; g.lineCap = "round"; g.lineJoin = "round";
      g.lineWidth = brush * (0.9 + Math.random() * 0.3);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x + 0.01, b.y); g.stroke();
      g.globalCompositeOperation = "source-over";
    };
    scratch.addEventListener("pointerdown", (e) => {
      if (state !== "scratch" || !foilReady) return;
      down = true; foilEl.classList.add("touched"); try { scratch.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      last = pt(e); stroke(last, last); askMotionPermission(); scheduleProbe(); e.preventDefault();
    });
    scratch.addEventListener("pointermove", (e) => {
      if (!down || state !== "scratch") return;
      const p = pt(e); stroke(last, p); last = p; scheduleProbe();
      const now = performance.now(); if (now - lastBuzz > 70) { lastBuzz = now; buzz(6); } SFX.scratch(); trail(e.clientX, e.clientY);
    });
    const up = () => { down = false; scheduleProbe(); };
    scratch.addEventListener("pointerup", up); scratch.addEventListener("pointercancel", up);
    scratch.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && state === "scratch") { e.preventDefault(); askMotionPermission(); boom(); } });
  })();

  /* ------------------------------------------------------------------
     9. Scenes 1, 3 and 4: intro, boom, envelope opening, card flight
  ------------------------------------------------------------------ */
  function startIntro() {
    state = "intro"; stage.dataset.state = "intro";
    if (three) {
      const g = three.group;
      g.position.y = 5.5; g.rotation.set(0.25, -0.5, 0.1); three.sealPivot.scale.setScalar(0.001);
      track(gsap.timeline({ onComplete: enterScratch }))
        .to(g.position, { y: 0, duration: 1.4 * S, ease: "power3.out" }, 0)
        .to(g.rotation, { x: 0, y: 0, z: 0, duration: 1.6 * S, ease: "power2.out" }, 0)
        .to(three.sealPivot.scale, { x: 1, y: 1, z: 1, duration: 0.9 * S, ease: "elastic.out(1,.55)" }, 1.0 * S)
        .add(() => SFX.thud(), 1.1 * S).add(() => SFX.seal(), 1.15 * S);
    } else {
      env2d.hidden = false;
      track(gsap.timeline({ onComplete: enterScratch })).fromTo(env2d, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1 * S, ease: "power2.out" });
    }
  }
  function enterScratch() {
    if (state !== "intro") return;
    state = "scratch"; stage.dataset.state = "scratch";
    foilEl.hidden = false; placeFoil(); paintFoil();
    hud.hidden = false; setProgress(0);
    track(gsap.timeline())
      .fromTo(foilEl, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.8 * S, ease: "power2.out" }, 0)
      .fromTo(hud, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 * S }, 0.3);
  }

  function crackSeal() {
    const { sealL, sealR, sealPivot, scene } = three;
    scene.attach(sealL); scene.attach(sealR);
    const tl = track(gsap.timeline({ onComplete: () => { sealL.visible = false; sealR.visible = false; } }));
    tl.to(sealL.position, { x: "-=0.35", y: "-=0.25", z: "+=0.6", duration: 0.6 * S, ease: "power2.out" }, 0)
      .to(sealR.position, { x: "+=0.35", y: "-=0.25", z: "+=0.6", duration: 0.6 * S, ease: "power2.out" }, 0)
      .to(sealL.rotation, { z: 0.8, y: -0.6, duration: 0.8 * S }, 0)
      .to(sealR.rotation, { z: -0.8, y: 0.6, duration: 0.8 * S }, 0)
      .to([sealL.position, sealR.position], { y: "-=6", duration: 1.1 * S, ease: "power2.in" }, 0.55 * S);
    return sealPivot;
  }

  function boom() {
    if (state !== "scratch") return;
    state = "boom"; stage.dataset.state = "boom";
    try { scratch.blur(); } catch (e) { /* ignore */ }
    playSound(); SFX.crack(); buzz([60, 40, 120]);
    const tl = track(gsap.timeline());
    tl.to(foilEl, { opacity: 0, duration: 0.45 * S, ease: "power1.in" }, 0)
      .to(hud, { opacity: 0, duration: 0.3 * S }, 0)
      .to(flash, { opacity: 0.85, duration: 0.08 }, 0).to(flash, { opacity: 0, duration: 0.7 * S }, 0.08)
      .add(() => { foilEl.hidden = true; hud.hidden = true; }, 0.5 * S);

    if (three) {
      tl.add(() => {
        const o = new THREE.Vector3(); three.sealPivot.getWorldPosition(o);
        crackSeal(); three.confetti.fire(); three.petals.burst(o); three.roses.burst(o); three.sparks.fire(elapsed);
      }, 0.05)
        .to(shake, { amp: 1, duration: 0.05 }, 0.05).to(shake, { amp: 0, duration: 0.9 * S, ease: "power2.out" }, 0.1)
        .to(three.flap.rotation, { x: -Math.PI * 1.04, duration: 1.2 * S, ease: "power2.inOut" }, 0.9 * S)
        .to(three.group.position, { y: -0.75, duration: 1.2 * S, ease: "power2.inOut" }, 1.9 * S)
        .to(three.card.position, { y: 1.3, duration: 1.2 * S, ease: "power2.inOut" }, 2.0 * S)
        .add(flyCard, 3.4 * S)
        .add(() => SFX.whoosh(), 0.9 * S).add(() => SFX.whoosh(), 3.4 * S);
    } else {
      tl.to("#sealCircle", { scale: 1.4, opacity: 0, transformOrigin: "50% 50%", duration: 0.5 * S }, 0.05)
        .to(env2d, { scale: 1.06, opacity: 0, duration: 0.8 * S }, 0.7 * S)
        .add(() => showBook(false), 1.1 * S);
    }
  }

  function flyCard() {
    const T = three;
    T.scene.attach(T.card);                                // keep its world position, leave the envelope
    const r = bookEl.getBoundingClientRect(), tz = 3.0, v = T.vis(tz);
    const tx = ((r.left + r.width / 2) / innerWidth - 0.5) * v.w, ty = -((r.top + r.height / 2) / innerHeight - 0.5) * v.h;
    const sc = ((r.height / innerHeight) * v.h) / T.CH;
    const tl = track(gsap.timeline());
    tl.to(T.card.position, { x: tx, y: ty, z: tz, duration: 1.1 * S, ease: "power3.inOut" }, 0)
      .to(T.card.scale, { x: sc, y: sc, z: sc, duration: 1.1 * S, ease: "power3.inOut" }, 0)
      .to(T.group.position, { y: -5, duration: 1.0 * S, ease: "power2.in" }, 0)
      .add(() => { showBook(false); T.petals.ambient(true); T.roses.ambient(true); }, 0.75 * S)
      .to(T.cardMat, { opacity: 0, duration: 0.5 * S, ease: "power1.in" }, 0.95 * S)
      .add(() => { T.card.visible = false; }, 1.5 * S);
  }

  function skipIntro() {
    if (state === "book") return;
    timelines.forEach((t) => t.kill()); gsap.killTweensOf([shake, flash, foilEl, hud, env2d, bookWrap]);
    shake.amp = 0; flash.style.opacity = 0; foilEl.hidden = true; hud.hidden = true; env2d.hidden = true;
    if (three) { three.group.visible = false; three.card.visible = false; three.sealL.visible = false; three.sealR.visible = false; three.petals.ambient(true, true); three.roses.ambient(true, true); }
    audio.pause();
    showBook(true);
  }
  skipBtn.addEventListener("click", skipIntro);

  /* ------------------------------------------------------------------
     10. Start
  ------------------------------------------------------------------ */
  async function init() {
    renderBook();
    await fontsReady();
    three = build3D();
    if (three) {
      three.fit(); requestAnimationFrame(frame);
      glCanvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); skipIntro(); });
    } else { glCanvas.style.display = "none"; }
    openGate();
  }

  // Opening page: floating petals, golden shimmer and soft parallax. One tap anywhere unlocks sound, music and full screen.
  function openGate() {
    const gate = $("#gate"), btn = $("#gateBtn");
    if (guest) { const gg = $("#gateGuest"); gg.textContent = "Dear " + guest + " & Family"; gg.hidden = false; }
    btn.disabled = false; btn.classList.remove("is-loading");
    const gfx = makeFX($("#gateFx"), { petals: Math.round((lowPower ? 8 : 15) * fxN), sparks: Math.round((lowPower ? 9 : 18) * fxN), size: 1 });
    gfx.start();
    if (!reduceMotion) {            // pointer / tilt parallax for the roses, arch and text
      let tx = 0, ty = 0, cx = 0, cy = 0, pr = 0;
      const tick = () => { cx += (tx - cx) * 0.09; cy += (ty - cy) * 0.09; gate.style.setProperty("--px", cx.toFixed(3)); gate.style.setProperty("--py", cy.toFixed(3));
        pr = Math.abs(tx - cx) > 0.003 || Math.abs(ty - cy) > 0.003 ? requestAnimationFrame(tick) : 0; };
      const kick = () => { if (!pr) pr = requestAnimationFrame(tick); };
      gate.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; kick(); }, { passive: true });
      window.addEventListener("deviceorientation", (e) => { if (!gate.hidden && e.gamma != null) { tx = clamp(e.gamma / 28, -1, 1); ty = clamp((e.beta - 50) / 28, -1, 1); kick(); } }, { passive: true });
    }
    let opened = false;
    const go = () => {
      if (opened) return; opened = true;
      initAudio(); startMusic(); enterFS(); askMotionPermission(); SFX.sparkle();
      gsap.to(gate, { opacity: 0, duration: 0.8, delay: 0.25, onComplete: () => { gate.hidden = true; gfx.stop(); } });
      setTimeout(() => { if (three) three.fit(); startIntro(); }, 500);
    };
    gate.addEventListener("click", go);
  }

  let rz = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (three) three.fit(); if (state === "scratch") placeFoil(); }, 80);
  });

  if (window.gsap && document.readyState !== "loading") init(); else document.addEventListener("DOMContentLoaded", init);

  // offline support (full PWA polish arrives in Part 3)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
  }
})();

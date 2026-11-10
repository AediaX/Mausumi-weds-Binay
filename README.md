# Mausumi Weds Binay – 3D wedding invitation (Part 1 of 3)

Part 1 contains: closed 3D envelope with gold wax seal, scratch-off gold foil with progress ring,
the "boom" (confetti cannons, 3D rose-petal burst, GPU gold sparkles, camera shake, shehnai and dhol),
envelope opening, card slide-out and a five-page card you can swipe, tap, or flip with arrow keys.
Part 2 adds roses, buds, mogra garlands, orbit and tilt, animated icons. Part 3 adds the countdown, Odia/Hindi,
chat helper, blessing wall, RSVP on WhatsApp, calendar files and the full PWA polish.

## Run it on your computer
Everything is inside this folder and works offline. Two ways:
1. Quick look: double-click `index.html`. (Sound, 3D and the card all work. The offline cache needs option 2.)
2. Recommended: open a terminal in this folder and run `python3 -m http.server 8080`, then visit
   http://localhost:8080 . This also lets the offline cache (service worker) install.

Test a personalised link:  http://localhost:8080/?guest=Rahul

## Change names, dates, phone numbers, colours
Open `app.js`. Everything is in the `CONFIG` block at the top, with comments. Save and refresh.

## Host it
Upload the whole folder to any static host (GoDaddy/cPanel public_html, Netlify drop, GitHub Pages, a school server)
or copy it onto a pen drive and open `index.html`. Use HTTPS when hosting so the offline cache and Share button work.
After editing any file, change `CACHE_VERSION` in `service-worker.js` so phones fetch the new version.

## Sending guest links
`https://your-site/?guest=Name`  gives "Dear Name & Family, you are cordially invited."
Names are cleaned automatically (only letters, numbers, spaces, . ' and -).

## Notes
- Sound plays only after the guest touches the screen. The speaker button (top right) mutes it. The sound is synthesised
  locally (no copyrighted audio). Replace `audio/shehnai-dhol.mp3` with your own file of the same name if you like.
- "Skip intro" jumps straight to the card. Reduced-motion settings shorten the animation and calm the effects.
- If a phone has no WebGL, a flat envelope is shown instead and the card works the same.
- Three.js r160 and GSAP 3.12.5 (MIT licences) and the fonts (SIL Open Font Licence) are included in /libs and /fonts.
- Link previews: add a 1200x630 `og-image.jpg` and uncomment the image line in `index.html`.

## v2 changes
- Opening screen: one tap unlocks sound, starts background music and enters full screen (browsers do not allow any of these without a tap).
- iPhone Safari cannot do web full screen: use Share > Add to Home Screen for a true full-screen app (manifest is set to fullscreen).
- Sound effects (scratch, seal crack, whoosh, page turn, sparkle) and music are synthesised in the browser. Toggle with the speaker button.
- 3D roses on the envelope and falling roses; rose corners on every card page; tap anywhere on the card for sparkles.
- "Amresh" added to Best Compliments (CONFIG.compliments in app.js).

## v3 changes (luxury 3D Hindu invitation)
- New opening page: Lord Ganesha (img/ganesha.webp) at the top centre inside a golden halo, gold-foil arch, toran, shimmering names, sealed M & B monogram, drifting rose petals and golden sparkles, soft parallax. No instruction text anywhere.
- Realistic 3D roses: every petal is its own curved mesh (roses.js). Photographic bouquet / petal images in /img were baked from that generator (tools/bake.py, needs Playwright) and are used on the opening page and in the corners of every card page. The envelope roses and falling petals use the same generator live in Three.js.
- Card pages restyled as printed invitation pages (ivory paper, gold foil frame, baby-pink wash) with traditional wording. The invitation is now six pages (Invocation and The Invitation are separate).
- Location link replaced with https://maps.app.goo.gl/qpUbxFLWQP4v9W4m9 (CONFIG.venue.mapsLink in app.js).
- Scratch foil shows an embossed lotus mandala with a gentle ripple instead of words.
- Colours unchanged: Off-white, Baby Pink, Gold. All names, dates, phone numbers, compliments, RSVP, sound, calendar-free PWA and skip button are preserved.

# Swarm Pepe #1043 — "King of the Swarm" (15 s video)

Output: `artifacts/video.mp4` (video/mp4, delivered separately, not committed).

## Specs (verified with ffprobe)

| Property   | Value |
|------------|-------|
| Duration   | 15.000 s |
| Dimensions | 1280×720, 25 fps |
| Video      | H.264 (libx264, CRF 20), yuv420p, `+faststart` (moov at front) |
| Audio      | AAC-LC, 48 kHz stereo, 160 kb/s; peak −2.4 dBFS, mean −17.8 dB |
| Size       | ~3.5 MB |

## Storyboard

1. **0–3 s — The swarm.** 100+ green Swarm Pepes bob across the screen under the title
   "SWARM PEPE #1043". A crowned gold pepe hidden in the crowd starts pulsing, then flies
   out of the crowd as the others fade.
2. **3–9 s — Trait odds.** The gold pepe on the left; on the right the traits appear one by one
   (Skin Gold 1%, Eyes Plain 38%, Mouth Open 15%, Hat Crown 3%, Accessory Mole 8%) with weight bars.
   Rare traits are shown in gold, and each trait is ringed on the pepe. A "combined odds" counter
   climbs 1 in 100 → 263 → 1,754 → 58,480 → **1 in 730,994** (0.0001368%). Footer:
   "Gold + Crown alone: 0.03% ≈ 1.5 in the whole set".
3. **9–11.8 s — Scale.** "1 in 731,000". A 100×50 grid of 5,000 dots (one per pepe in a full
   mint) with the caption "A full 5,000 mint is expected to produce ~0.007 of this combo". Dot #1043
   lights up gold while the rest dim.
4. **11.8–15 s — Coronation.** Rotating god rays, and the gold pepe scales in while its crown drops
   into place. Sparkles appear, a row of green pepes bows, and the title reads **KING OF THE SWARM**.
   Tagline: "Swarm Pepe #1043 · Gold · Plain · Open · Crown · Mole · 1 in 731k". The video fades
   to black.

## Audio

The audio is synthesized with ffmpeg `aevalsrc`, so no third-party audio is used. It has a low
pulsing pad under scenes 1–3, a boom on the title, and an ascending chime on each trait reveal
(the rare traits get a doubled chime). A pitch riser plays under the "1 in 731,000" scene,
followed by a C-major fanfare and arpeggio for the coronation, with a 0.6 s fade-out.

## How it was made / reproduce

`scripts/render-pepe.mjs` (Node, no dependencies) draws every frame as ASS vector drawings plus
text. It writes `build/pepe.ass` and an ffmpeg filter script at `build/fc.txt`. ffmpeg's `geq`
filter paints a radial background, libass (`ass` filter) renders the drawings, and `aevalsrc`
makes the audio:

```
node scripts/render-pepe.mjs
ffmpeg -/filter_complex build/fc.txt -map "[v]" -map "[a]" -c:v libx264 -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart -t 15 artifacts/video.mp4
```

The text needs the FreeSans Bold font (GNU FreeFont) to be available through fontconfig.

## Limitations

- The pepe is an original vector illustration of the listed traits. It is **not** the actual
  OpenSea artwork for token #1043, which I did not fetch or reproduce. Its look (colors, crown
  style, mole placement) is an interpretation of the trait names.
- All rarity figures come from the task brief (the trait weights, and a 5,000 supply assumed to be
  a full mint). They were not checked against on-chain or OpenSea data. The odds treat the traits
  as independent: 1%×38%×15%×3%×8% = 0.0001368% ≈ 1 in 730,994, shown rounded as "1 in 731,000 / 731k".
- The dot grid is illustrative. Dot #1043 sits at row 10, column 43 of a 100×50 grid. It does not
  reflect real mint order.
- The audio is simple synthesized tones, not produced music.
- I checked the visuals by looking at sampled frames (1.8, 2.6, 5.5, 8.6, 10.8 and 13.8 s), not by
  watching the whole video in real time.

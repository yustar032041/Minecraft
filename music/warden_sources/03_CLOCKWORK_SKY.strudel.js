/*
OVERDRIVE SUITE — III: CLOCKWORK SKY
Music Block validated draft: 6e5da86e-e2f8-4e10-8465-326699b12dc5
Tempo: 188 BPM | meter: 3/4 quarter-note beats per bar | target loop: about 5 minutes
8-bar Music Block theme expanded into a longer Strudel arrangement with changing textures,
register shifts, reverse phrases, breakdowns and alternate drum colours.

Open https://strudel.cc/ , paste this entire file into the editor and press Ctrl+Enter.
Press Ctrl+. to stop playback.
This is Strudel REPL JavaScript (it is not a standalone Node.js audio file).
*/

setcpm(188 / (3 * 8)); // one Strudel cycle = the validated 8-bar theme

// 03 — CLOCKWORK SKY: fast 6/8 orchestral chase
const violin = note("d5 f5 a5 d6 c6 a5 bb4 d5 f5 bb5 a5 f5 a4 c5 f5 a5 g5 f5 g4 c5 e5 g5 e5 c5 g4 bb4 d5 g5 f5 d5 f4 a4 d5 f5 a5 d6 e5 g5 a5 c#6 a5 g5 f5 e5 d5 a4 d5 d5").sound("triangle").lpf(4800).attack(0.035).decay(0.25).sustain(0.48).release(0.3).room(0.3);
const horn = note("a3@6 f3@6 a3@6 g3@6 d4@6 a3@6 e3@6 f3@6").sound("sawtooth").lpf(1850).attack(0.12).decay(0.28).sustain(0.58).release(0.5).room(0.28);
const cello = note("d2 a2 d3 a2 f2 a2 bb2 f3 bb3 f3 d3 f3 f2 c3 f3 c3 a2 c3 c2 g2 c3 g2 e3 g2 g2 d3 g3 d3 bb2 d3 d2 a2 d3 a2 f2 a2 a2 e3 a3 e3 c#3 e3 d2 a2 d3 a2 f2 d2").sound("triangle").lpf(850).attack(0.04).decay(0.18).sustain(0.4).release(0.15);
const timpani = note("d2@6 bb2@6 f2@6 c3@6 g2@6 d2@6 a2@6 d2@6").sound("sine").lpf(220).attack(0.008).decay(0.65).sustain(0.02).release(0.4);
const orchestralHits = sound("cr ~ ~ ~ bd ~, ~ ~ ~ ~ ~ ~").bank("RolandTR707");
const full = stack(violin, horn, cello, timpani, orchestralHits);
const stringsOnly = stack(violin, cello, horn);
const chase = stack(violin.rev(), cello, timpani, orchestralHits);
const peak = stack(violin.transpose(12), horn, cello, timpani, orchestralHits);
const lowBridge = stack(horn, cello, timpani);
const sections = [stringsOnly, full, chase, full, lowBridge, peak, chase, full];
cat(...Array.from({length:39}, (_, i) => sections[i % sections.length]));

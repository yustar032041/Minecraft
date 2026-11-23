/*
OVERDRIVE SUITE — II: NEON SWITCHBOARD
Music Block validated draft: 261a9a2d-aaad-4c25-8fda-504b04806f6b
Tempo: 112 BPM | meter: 4/4 quarter-note beats per bar | target loop: about 5 minutes
8-bar Music Block theme expanded into a longer Strudel arrangement with changing textures,
register shifts, reverse phrases, breakdowns and alternate drum colours.

Open https://strudel.cc/ , paste this entire file into the editor and press Ctrl+Enter.
Press Ctrl+. to stop playback.
This is Strudel REPL JavaScript (it is not a standalone Node.js audio file).
*/

setcpm(112 / (4 * 8)); // one Strudel cycle = the validated 8-bar theme

// 02 — NEON SWITCHBOARD: bright syncopated brass funk
const sax = note("f4 ab4 c5 ~ eb5 c5 ~ ab4 c5 eb5 ~ f5 ab5 f5 eb5 ~ bb4 d5 f5 ~ ab5 f5 d5 ~ f5 d5 bb4 ~ d5 f5 ab5 ~ db5 f5 ab5 ~ ab5 f5 db5 ~ c5 e5 g5 ~ ab5 g5 e5 ~ f5 ab5 c5 ~ ab5 f5 eb5 ~ g5 e5 c5 ~ bb4 g4 e4 ~").sound("square").lpf(1550).attack(0.018).decay(0.18).sustain(0.35).release(0.12).room(0.12);
const ep = stack(
  note("ab4@2 ~@2 ab4@2 ~@2 ab4@2 ~@2 ab4@2 ~@2 d4@2 ~@2 d4@2 ~@2 d4@2 ~@2 d4@2 ~@2 f4@2 ~@2 f4@2 ~@2 e4@2 ~@2 e4@2 ~@2 ab4@2 ~@2 ab4@2 ~@2 e4@2 ~@2 e4@2 ~@2").sound("triangle").lpf(2200).decay(0.13).sustain(0.08).release(0.09),
  note("c5@2 ~@2 c5@2 ~@2 c5@2 ~@2 c5@2 ~@2 f4@2 ~@2 f4@2 ~@2 f4@2 ~@2 f4@2 ~@2 ab4@2 ~@2 ab4@2 ~@2 g4@2 ~@2 g4@2 ~@2 c5@2 ~@2 c5@2 ~@2 g4@2 ~@2 g4@2 ~@2").sound("triangle").lpf(2200).decay(0.13).sustain(0.08).release(0.09),
  note("eb5@2 ~@2 eb5@2 ~@2 eb5@2 ~@2 eb5@2 ~@2 ab4@2 ~@2 ab4@2 ~@2 ab4@2 ~@2 ab4@2 ~@2 c5@2 ~@2 c5@2 ~@2 bb4@2 ~@2 bb4@2 ~@2 eb5@2 ~@2 eb5@2 ~@2 bb4@2 ~@2 bb4@2 ~@2").sound("triangle").lpf(2200).decay(0.13).sustain(0.08).release(0.09),
  note("eb3@8 eb3@8 d3@8 d3@8 f3@8 e3@8 eb3@8 e3@8").sound("sine").attack(0.12).sustain(0.7).release(0.35),
  note("ab3@8 ab3@8 ab3@8 ab3@8 c4@8 bb3@8 ab3@8 bb3@8").sound("sine").attack(0.12).sustain(0.7).release(0.35)
);
const bass = note("f2@2 c3@2 f3@2 c3@2 f2@2 c3@2 f3@2 c3@2 bb1@2 f2@2 bb2@2 f2@2 bb1@2 f2@2 bb2@2 f2@2 db2@2 ab2@2 db3@2 ab2@2 c2@2 g2@2 c3@2 g2@2 f2@2 c3@2 f3@2 c3@2 c2@2 g2@2 c3@2 g2@2").sound("sawtooth").lpf(330).decay(0.17).sustain(0.28);
const drums = sound("bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh sd,hh ht mt bd,hh mt lt cr,bd").bank("RolandTR808");
const drumsDry = sound("bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh sd,hh ht mt bd,hh mt lt cr,bd").bank("RolandTR707");
const full = stack(sax, ep, bass, drums);
const hornBreak = stack(sax.transpose(-12), bass, drumsDry);
const keysBreak = stack(ep, bass, drumsDry);
const highHook = stack(sax.transpose(12), ep, bass, drums);
const reverseHook = stack(sax.rev(), ep, bass, drumsDry);
const sections = [keysBreak, full, hornBreak, full, reverseHook, keysBreak, highHook, full];
cat(...Array.from({length:18}, (_, i) => sections[i % sections.length]));

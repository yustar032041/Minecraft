/*
OVERDRIVE SUITE — I: IGNITION PARADE
Music Block validated draft: 99130cfe-0aff-406a-a0a7-d61f6b9eb7a0
Tempo: 164 BPM | meter: 4/4 quarter-note beats per bar | target loop: about 5 minutes
8-bar Music Block theme expanded into a longer Strudel arrangement with changing textures,
register shifts, reverse phrases, breakdowns and alternate drum colours.

Open https://strudel.cc/ , paste this entire file into the editor and press Ctrl+Enter.
Press Ctrl+. to stop playback.
This is Strudel REPL JavaScript (it is not a standalone Node.js audio file).
*/

setcpm(164 / (4 * 8)); // one Strudel cycle = the validated 8-bar theme

// 01 — IGNITION PARADE: brass-powered electro rock
const lead = note("d5 f5 a5 ~ f5 d5 ~ a4 f5 bb5 d5 ~ f5 d5 bb4 ~ a4 c5 f5 ~ a5 f5 c5 ~ g5 e5 c5 ~ e5 g5 c5 ~ d5 f5 a5 ~ f5 a5 f5 d5 f5 d5 bb4 ~ d5 f5 bb5 f5 a4 c5 f5 ~ a5 c6 a5 f5 g5 e5 c5 ~ e5 d5 c5 ~").sound("sawtooth").lpf(2800).attack(0.008).decay(0.16).sustain(0.42).release(0.12).room(0.16);
const pad = stack(
  note("d4@8 bb3@8 f3@8 c4@8 d4@8 bb3@8 f3@8 c4@8").sound("triangle").attack(0.2).sustain(0.6).release(0.7),
  note("f4@8 d4@8 a3@8 e4@8 f4@8 d4@8 a3@8 e4@8").sound("triangle").attack(0.2).sustain(0.6).release(0.7),
  note("a4@8 f4@8 c4@8 g4@8 a4@8 f4@8 c4@8 g4@8").sound("triangle").attack(0.2).sustain(0.6).release(0.7)
);
const bass = note("d2@2 a2@2 d3@2 a2@2 bb1@2 f2@2 bb2@2 f2@2 f2@2 c3@2 f3@2 c3@2 c2@2 g2@2 c3@2 g2@2 d2@2 a2@2 d3@2 a2@2 bb1@2 f2@2 bb2@2 f2@2 f2@2 c3@2 f3@2 c3@2 c2@2 g2@2 c3@2 g2@2").sound("sawtooth").lpf(260).decay(0.2).sustain(0.25);
const drums = sound("bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh ht mt bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh sd,hh ht mt lt mt lt cr,bd").bank("RolandTR909");
const drumsAlt = sound("bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh ht mt bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh hh bd,hh hh sd,hh oh bd,hh sd,hh ht mt lt mt lt cr,bd").bank("RolandTR808");
const opening = stack(pad, bass);
const full = stack(lead, pad, bass, drums);
const riffLow = stack(lead.transpose(-12), bass, drumsAlt);
const riffHigh = stack(lead.transpose(12), pad, bass, drums);
const reverse = stack(lead.rev(), pad, bass, drumsAlt);
const breakdown = stack(pad, bass, drumsAlt);
const sections = [opening, full, riffLow, full, breakdown, reverse, riffHigh, full];
cat(...Array.from({length:26}, (_, i) => sections[i % sections.length]));

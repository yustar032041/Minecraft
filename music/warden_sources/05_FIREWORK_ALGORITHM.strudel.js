/*
OVERDRIVE SUITE — V: FIREWORK ALGORITHM
Music Block validated draft: 242b864c-a942-4e82-a0c6-6c14709c91c8
Tempo: 180 BPM | meter: 3.5/4 quarter-note beats per bar | target loop: about 5 minutes
8-bar Music Block theme expanded into a longer Strudel arrangement with changing textures,
register shifts, reverse phrases, breakdowns and alternate drum colours.

Open https://strudel.cc/ , paste this entire file into the editor and press Ctrl+Enter.
Press Ctrl+. to stop playback.
This is Strudel REPL JavaScript (it is not a standalone Node.js audio file).
*/

setcpm(180 / (3.5 * 8)); // one Strudel cycle = the validated 8-bar theme

// 05 — FIREWORK ALGORITHM: 7/8 neon carnival sprint
const piccolo = note("g5 b5 e6 g6 f#6 e6 b5 g5 c6 e6 g6 e6 d6 ~ b5 d6 g6 a6 g6 d6 b5 a5 d6 f#6 a6 f#6 e6 ~ a5 c6 e6 a6 g6 e6 c6 g5 c6 e6 g6 e6 d6 ~ f#5 b5 d#6 f#6 a6 f#6 d#6 g5 b5 e6 g6 f#6 e6 ~").sound("sine").lpf(5200).attack(0.006).decay(0.18).sustain(0.18).release(0.12).room(0.18);
const marimba = note("e4 g4 b4 ~ d5 b4 g4 c4 g4 c5 e5 ~ g4 e4 g4 b4 d5 ~ g5 d5 b4 d4 a4 d5 f#5 a4 ~ f#4 a3 e4 a4 ~ c5 e5 c5 c4 g4 c5 e5 ~ g4 c5 b3 f#4 b4 d#5 a4 f#4 ~ e4 b4 e5 ~ g5 b4 e5").sound("piano").lpf(4200).decay(0.16).sustain(0.06).release(0.12);
const strings = note("e4@6 ~ c4@6 ~ g3@6 ~ d4@6 ~ a3@6 ~ c4@6 ~ b3@6 ~ e4@6 ~").sound("triangle").lpf(2200).attack(0.22).sustain(0.6).release(0.5).room(0.32);
const bass = note("e2@3 b2@3 d3 c2@3 g2@3 b2 g1@3 d2@3 f#2 d2@3 a2@3 c3 a1@3 e2@3 g2 c2@3 g2@3 b2 b1@3 f#2@3 a2 e2@3 b2@3 d3").sound("sawtooth").lpf(300).decay(0.2).sustain(0.3);
const drums = sound("bd,hh hh sd,hh hh bd,hh oh sd,hh bd,hh hh sd,hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh cr bd,hh hh sd,hh hh bd,hh ht mt bd,hh hh sd,hh hh bd,hh oh sd,hh bd,hh hh sd,hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh ht lt bd,hh sd,hh ht mt lt cr bd").bank("RolandTR909");
const drumsAlt = sound("bd,hh hh sd,hh hh bd,hh oh sd,hh bd,hh hh sd,hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh hh cr bd,hh hh sd,hh hh bd,hh ht mt bd,hh hh sd,hh hh bd,hh oh sd,hh bd,hh hh sd,hh bd,hh hh sd,hh oh bd,hh hh sd,hh hh bd,hh ht lt bd,hh sd,hh ht mt lt cr bd").bank("RolandTR808");
const full = stack(piccolo, marimba, strings, bass, drums);
const marimbaBreak = stack(marimba, strings, bass, drumsAlt);
const highFlight = stack(piccolo.transpose(12), marimba, strings, bass, drums);
const lowAnswer = stack(piccolo.transpose(-12), marimba, bass, drumsAlt);
const reversedFlight = stack(piccolo.rev(), marimba, strings, bass, drumsAlt);
const bridge = stack(strings, bass, drumsAlt);
const sections = [marimbaBreak, full, lowAnswer, full, bridge, reversedFlight, highFlight, full];
cat(...Array.from({length:32}, (_, i) => sections[i % sections.length]));

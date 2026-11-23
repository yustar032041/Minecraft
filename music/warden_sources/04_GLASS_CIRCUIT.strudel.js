/*
OVERDRIVE SUITE — IV: GLASS CIRCUIT
Music Block validated draft: 4f46738a-4d0e-43ba-916a-ffc69f561cf6
Tempo: 145 BPM | meter: 5/4 quarter-note beats per bar | target loop: about 5 minutes
8-bar Music Block theme expanded into a longer Strudel arrangement with changing textures,
register shifts, reverse phrases, breakdowns and alternate drum colours.

Open https://strudel.cc/ , paste this entire file into the editor and press Ctrl+Enter.
Press Ctrl+. to stop playback.
This is Strudel REPL JavaScript (it is not a standalone Node.js audio file).
*/

setcpm(145 / (5 * 8)); // one Strudel cycle = the validated 8-bar theme

// 04 — GLASS CIRCUIT: odd-meter electric jazz
const vibes = note("e5 g5 b5 ~ d6 b5 g5 ~ e5 g5 e5 g5 a5 ~ g5 e5 c5 e5 ~ a4 a4 d5 f#5 ~ a5 f#5 e5 d5 ~ c5 b4 d5 f#5 ~ g5 f#5 d5 b4 ~ g4 g4 c5 e5 ~ b5 g5 e5 d5 ~ c5 a4 c5 e5 ~ g5 e5 c5 a4 ~ e5 f#4 b4 d#5 ~ a5 f#5 d#5 b4 ~ a4 e5 g5 b5 ~ d6 b5 g5 e5 ~ e5").sound("sine").lpf(5200).attack(0.004).decay(0.22).sustain(0.05).release(0.15).room(0.35).swing(40);
const mutedTrumpet = note("b4 ~ d5 ~ e5 ~ d5 ~ b4 ~ c5 ~ e5 ~ g5 ~ e5 ~ c5 ~ a4 ~ c5 ~ d5 ~ f#5 ~ e5 ~ b4 ~ d5 ~ f#5 ~ d5 ~ b4 ~ g4 ~ b4 ~ e5 ~ g5 ~ e5 ~ c5 ~ e5 ~ g5 ~ e5 ~ c5 ~ a4 ~ d#5 ~ f#5 ~ a5 ~ f#5 ~ b4 ~ d5 ~ e5 ~ d5 ~ b4 ~").sound("triangle").lpf(1700).attack(0.018).decay(0.16).sustain(0.26).release(0.12).room(0.18).swing(40);
const bass = note("e2@2 b2@2 d3@2 b2@2 g2@2 a1@2 e2@2 g2@2 e2@2 c3@2 d2@2 a2@2 c3@2 a2@2 f#2@2 g1@2 d2@2 f#2@2 d2@2 b2@2 c2@2 g2@2 b2@2 g2@2 e2@2 a1@2 e2@2 g2@2 e2@2 c3@2 b1@2 f#2@2 a2@2 f#2@2 d#2@2 e2@2 b2@2 d3@2 b2@2 g2@2").sound("triangle").lpf(420).attack(0.01).decay(0.24).sustain(0.28).swing(40);
const ride = sound("rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd").bank("RolandTR707").swing(40);
const rideAlt = sound("rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd rd,bd rd rd,rim rd rd,bd rd rd,rim rd rd,bd rd").bank("RolandTR909").swing(40);
const full = stack(vibes, mutedTrumpet, bass, ride);
const pianoBreak = stack(vibes, bass, rideAlt);
const hornAnswer = stack(vibes.rev(), mutedTrumpet, bass, ride);
const lowBridge = stack(mutedTrumpet.transpose(-12), bass, rideAlt);
const highGlass = stack(vibes.transpose(12), mutedTrumpet, bass, ride);
const sections = [pianoBreak, full, hornAnswer, full, lowBridge, pianoBreak, highGlass, full];
cat(...Array.from({length:18}, (_, i) => sections[i % sections.length]));

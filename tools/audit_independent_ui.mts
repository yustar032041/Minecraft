// Independent software MODEL comparison, not a Bedrock/Switch rendering test.
// Run with go-test-bds/viewer pinned to the commit in the investigation note:
// <viewer>/node_modules/.bin/tsx tools/audit_independent_ui.mts <viewer> <pack-root> <vanilla-terrain-json> <vanilla-flipbook-json>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const [viewer, packRoot, terrainPath, flipPath] = process.argv.slice(2);
if (!viewer || !packRoot || !terrainPath || !flipPath) throw Error('missing viewer, pack root, terrain or flipbook path');
const expectedRevision = 'f24466b7c4965ce6e6b49d4aff06275aefd6c9f2';
const revision = execFileSync('git', ['-C', viewer, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
assert.equal(revision, expectedRevision, 'unexpected independent viewer revision');
const worktreeStatus = execFileSync('git', ['-C', viewer, 'status', '--porcelain', '--untracked-files=no'], {encoding: 'utf8'}).trim();
assert.equal(worktreeStatus, '', 'modified viewer code cannot be treated as pinned');
for (const [file, hash] of [[terrainPath, '623b5a67fa1c1f50972db86607492b629c0b3ce9d7f886e1f569a4d820d91e95'],
                            [flipPath, 'bc6e227e696002bcc39ce40bde6c4133a3687d08f732b89b054cd047c4fb54d2']]) {
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), hash, `unexpected vanilla file: ${file}`);
}
const { parseExpr, evalExpr } = await import(pathToFileURL(path.resolve(viewer, 'src/ui/jsonui/expr.ts')).href);
const { mergeTerrainLayers, mergeFlipbookLayers } = await import(pathToFileURL(path.resolve(viewer, 'src/terrain/merge.ts')).href);
const read = (name: string) => fs.readFileSync(path.join(packRoot, name), 'utf8');
const ui = JSON.parse(read('ResourcePack/ui/hud_screen.json'));
const data = read('BehaviorPack/scripts/data.js');
const tokensMatch = data.match(/export const hudTokens=(\{[^\n\r;]+\});/);
assert.ok(tokensMatch, 'missing hudTokens');
const hudTokens = JSON.parse(tokensMatch[1]!);
const source = read('BehaviorPack/scripts/main.js');
const start = source.indexOf('const bar=n=>'), end = source.indexOf('let cooldownSweep=', start);
assert.ok(start >= 0 && end > start);
const parsed = new Map<string, any>();
function evaluate(expression: string, message: string) {
  if (!parsed.has(expression)) parsed.set(expression, parseExpr(expression));
  return evalExpr(parsed.get(expression), { binding: () => undefined, variable: (name: string) => name === 'hakkai_msg' ? message : undefined });
}
function render(options: Record<string, any>) {
  const cfg = { hud_pos: 0, hud_size: 0, hud_color: 0, hide_hud: 0, ...options };
  const s = { s: cfg.stamina, m: cfg.mana, cd: new Map(), until: cfg.until ?? 0, action: cfg.action };
  const context: any = { hudTokens, Math, num: (_: unknown, key: string) => cfg[key] ?? 0,
    gear: new Map(), selected: () => undefined, isTraceWeapon: () => false,
    mobSystem: undefined, combatResonance: undefined, combatGuard: undefined,
    customShield: { cooldown: () => 0 }, combatCharge: undefined, combatUltimate: undefined,
    combatParry: undefined, combatRoll: undefined, airDash: undefined };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return context.hudLine({ isOnGround: true }, s, cfg.tick);
}
const frames = Object.fromEntries(ui.hakkai_overlay.controls.map((entry: any) => Object.entries(entry)[0])) as Record<string, any>;
let count = 0;
for (const pos of [0, 1]) for (const size of [0, 1]) for (const color of [0, 1])
for (const stamina of [0, 35, 36, 100]) for (const mana of [0, 33, 34, 66, 67, 100]) for (const tick of [0, 10, 20, 30]) {
  const msg = render({hud_pos: pos, hud_size: size, hud_color: color, stamina, mana, tick});
  assert.equal(evaluate(ui.hud_actionbar_text.visible, msg), false);
  assert.equal(evaluate(ui.hakkai_overlay.visible, msg), true);
  const active = Object.entries(frames).filter(([, f]) => evaluate(f.visible, msg));
  assert.deepEqual(active.map(([n]) => n), [`hakkai_frame_${pos}${size}`]);
  const controls: Record<string, any> = Object.fromEntries(active[0]![1].controls.map((entry: any) => Object.entries(entry)[0]));
  const text = evaluate(controls.hakkai_readout.text, msg);
  assert.match(text, /スタミナ/); assert.match(text, /魔力/);
  const pulse = Math.floor(tick / 10) % (stamina <= 35 ? 2 : 4) === 0;
  assert.equal(evaluate(controls.heart_pulse.visible, msg), pulse);
  assert.equal(evaluate(controls.heart_idle.visible, msg), !pulse);
  const drops = ['drop_low', 'drop_mid', 'drop_full'].filter(key => evaluate(controls[key].visible, msg));
  assert.deepEqual(drops, [mana <= 33 ? 'drop_low' : mana <= 66 ? 'drop_mid' : 'drop_full']);
  count++;
}
for (const msg of ['通常の警告', render({hud_pos: 2, stamina: 70, mana: 90, tick: 10})]) {
  assert.equal(evaluate(ui.hud_actionbar_text.visible, msg), true);
  assert.equal(evaluate(ui.hakkai_overlay.visible, msg), false);
}
// Use the same plausible reset-only message to contrast v7.1.64 with the
// unpublished source. Presence of the marker decides routing in this model.
const resetMessage = '§a警告§r§r§r§r通常のメッセージ';
const resetCollision = resetMessage.includes(hudTokens.base);
assert.equal(evaluate(ui.hud_actionbar_text.visible, resetMessage), !resetCollision);
assert.equal(evaluate(ui.hakkai_overlay.visible, resetMessage), resetCollision);
// This third-party implementation models substring subtraction as removing all
// occurrences, unlike our older test's first-only assumption. Neither model
// establishes Switch behaviour; the synthetic case exposes that test boundary.
assert.equal(evaluate("($hakkai_msg - 'abc')", 'abcXabc'), 'X');
const parseLoose = (file: string, start: string) => { const s = fs.readFileSync(file, 'utf8'); return JSON.parse(s.slice(s.indexOf(start))); };
const vanillaTerrain = parseLoose(terrainPath, '{');
const addonTerrain = JSON.parse(read('ResourcePack/textures/terrain_texture.json'));
const vanillaFlips = parseLoose(flipPath, '[');
const base = mergeTerrainLayers([vanillaTerrain]);
const merged = mergeTerrainLayers([vanillaTerrain, addonTerrain]);
const flips = mergeFlipbookLayers([vanillaFlips]);
const allFlipTiles = [...new Set(flips.map((f: any) => f.atlasTile))] as string[];
assert.ok(allFlipTiles.length > 10);
for (const tile of allFlipTiles) assert.deepEqual(merged[tile], base[tile], `animated tile changed: ${tile}`);
assert.ok(allFlipTiles.some(tile => /lava/i.test(tile)) && allFlipTiles.some(tile => /fire/i.test(tile)));
// Mutation check: a fake override of a real animated tile must not compare equal.
const injectedTile = allFlipTiles.find(tile => /lava/i.test(tile))!;
const injected = mergeTerrainLayers([vanillaTerrain, { texture_data: { [injectedTile]: { textures: 'textures/fake/injected' } } }]);
assert.notDeepEqual(injected[injectedTile], base[injectedTile]);
console.log(JSON.stringify({hud_states: count, vanilla_flipbook_tiles: allFlipTiles.length, parsed_expressions: parsed.size,
  reset_only_message_misclassified_as_hud: resetCollision,
  note: 'Third-party model only; no native Bedrock, client download, GPU or Switch rendering performed.'}, null, 2));

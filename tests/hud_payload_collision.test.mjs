// HUD payload marker collision regression. Models § formatting and substring
// detection; does not prove Bedrock/Switch parsing, packet transfer or rendering.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { hudTokens } from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';

const source = fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js', 'utf8');
function setup(options = {}) {
  const cfg = { hud_pos: 0, hud_size: 0, hud_color: 0, hide_hud: 0, ...options };
  const context = { hudTokens, Math, num: (_p, key) => cfg[key] ?? 0,
    gear: new Map(), selected: () => undefined, isTraceWeapon: () => false,
    mobSystem: undefined, combatResonance: undefined, combatGuard: undefined,
    customShield: { cooldown: () => 0 }, combatCharge: undefined, combatUltimate: undefined,
    combatParry: undefined, combatRoll: undefined, airDash: undefined };
  vm.createContext(context);
  const start = source.indexOf('const bar=n=>'), end = source.indexOf('let cooldownSweep=', start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
  return context;
}

// Record visible characters and their modeled color/style, not the raw codes.
// Only well-formed codes used by these fixtures are included in this model.
function visibleFormatting(text) {
  let color = 'default', styles = new Set();
  const visible = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '§' && i + 1 < text.length) {
      const code = text[++i];
      if (code === 'r') { color = 'default'; styles = new Set(); }
      else if ('0123456789abcdef'.includes(code)) color = code;
      else if ('klo'.includes(code)) styles.add(code);
      continue;
    }
    visible.push([text[i], color, [...styles].sort().join('')]);
  }
  return visible;
}

test('all control markers have the formatting properties normalization relies on', () => {
  assert.match(hudTokens.base, /^(?:§[0-9a-f]|§r)+§r$/);
  for (const [key, token] of Object.entries(hudTokens)) {
    if (key !== 'base') assert.match(token, /^§r§([0-9a-f])§r§\1$/, key);
  }
});

test('duplicate formatting in action text cannot forge a HUD state or be eaten as a marker', () => {
  const ctx = setup();
  const action = `§l警告${hudTokens.pulse}危険${hudTokens.right}右${hudTokens.base}戻る`;
  const s = {s: 100, m: 100, cd: new Map(), until: 20, action};
  const result = ctx.hudLine({isOnGround: true}, s, 10); // heartbeat is idle
  const extra = result.split('\n').slice(2).join('\n');
  assert.deepEqual(visibleFormatting(extra), visibleFormatting(action));
  for (const token of Object.values(hudTokens)) assert.equal(extra.includes(token), false, token);
  assert.equal(result.includes(hudTokens.pulse), false, 'payload must not falsely enable heartbeat');
  assert.equal(result.includes(hudTokens.right), false, 'payload must not falsely shift HUD position');
});

test('ordinary Japanese/color text remains byte-for-byte unchanged', () => {
  const ctx = setup();
  for (const text of ['§a風の欠片を受け取った', '§c危険§r\n§b魔力', '§a警告§r§r§r§r通常のメッセージ']) {
    const result = ctx.hudLine({isOnGround: true}, {s: 100, m: 100, cd: new Map(), until: 20, action: text}, 10);
    assert.equal(result.split('\n').slice(2).join('\n'), text);
  }
});

test('plain and hidden HUD text cannot accidentally select the custom overlay', () => {
  const action = `§l警告${hudTokens.pulse}危険${hudTokens.base}戻る`;
  const s = {s: 100, m: 100, cd: new Map(), until: 20, action};
  const hidden=setup({hide_hud: 1}).hudLine({isOnGround: true}, s, 10);
  const result=setup({hud_pos: 2}).hudLine({isOnGround: true}, s, 10);
  const plain=result.split('\n').slice(1).join('\n');
  for(const text of [hidden,plain]){
    assert.equal(text.includes(hudTokens.base),false);
    assert.deepEqual(visibleFormatting(text),visibleFormatting(action));
    assert.ok(text.includes(hudTokens.pulse),'ordinary state codes stay byte-identical');
  }
  s.action='§a通常のお知らせ';
  assert.equal(setup({hide_hud:1}).hudLine({isOnGround:true},s,10),s.action);
  assert.ok(setup({hud_pos:2}).hudLine({isOnGround:true},s,10).endsWith('\n'+s.action));
});

test('normalization terminates and preserves modeled formatting when marker sequences touch', () => {
  const ctx = setup();
  assert.equal(typeof ctx.normalizeHudPayload, 'function');
  const tokens = Object.values(hudTokens);
  for (const a of tokens) for (const b of tokens) {
    const text = `§l始${a}${b}中${a}${a}終§r`;
    const normal = ctx.normalizeHudPayload(text);
    assert.deepEqual(visibleFormatting(normal), visibleFormatting(text));
    for (const token of tokens) assert.equal(normal.includes(token), false);
    assert.equal(ctx.normalizeHudPayload(normal), normal);
  }
});

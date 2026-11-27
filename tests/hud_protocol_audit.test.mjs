// Static protocol model, not a Bedrock JSON UI interpreter or rendering test.
// It assumes string subtraction removes the first matching substring, and
// assumes $actionbar_text preserves the exact string sent by setActionBar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { hudTokens } from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';

const source = fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js', 'utf8');
const ui = JSON.parse(fs.readFileSync('Hakkai_v7.1.0/ResourcePack/ui/hud_screen.json', 'utf8'));

// Grammar deliberately accepts only operators used by the current expressions.
function evaluate(expression, message) {
  const tokens = expression.match(/\$hakkai_msg|'[^']*'|\bnot\b|\band\b|[()=+\-]/g) ?? [];
  assert.equal(tokens.join(''), expression.replace(/\s+/g, ''), expression);
  let pos = 0;
  function atom() {
    const token = tokens[pos++];
    if (token === '(') { const x = and(); assert.equal(tokens[pos++], ')'); return x; }
    if (token === 'not') return !atom();
    if (token === '$hakkai_msg') return message;
    assert.ok(token?.startsWith("'"), token);
    return token.slice(1, -1);
  }
  function arithmetic() {
    let left = atom();
    while (tokens[pos] === '-' || tokens[pos] === '+') {
      const op = tokens[pos++], right = atom();
      assert.equal(typeof left, 'string'); assert.equal(typeof right, 'string');
      left = op === '-' ? left.replace(right, '') : left + right;
    }
    return left;
  }
  function equality() {
    let left = arithmetic();
    if (tokens[pos] === '=') { pos++; left = left === arithmetic(); }
    return left;
  }
  function and() {
    let left = equality();
    while (tokens[pos] === 'and') { pos++; const right = equality(); left = Boolean(left && right); }
    return left;
  }
  const result = and();
  assert.equal(pos, tokens.length, expression);
  return result;
}

function renderLine(options) {
  const cfg = { hud_pos: 0, hud_size: 0, hud_color: 0, hide_hud: 0, ...options };
  const s = { s: cfg.stamina, m: cfg.mana, cd: new Map(), until: cfg.until ?? 0, action: cfg.action };
  const ctx = {
    hudTokens, Math, num: (_p, key) => cfg[key] ?? 0,
    gear: new Map(), selected: () => undefined, isTraceWeapon: () => false,
    mobSystem: undefined, combatResonance: undefined, combatGuard: undefined,
    customShield: { cooldown: () => 0 }, combatCharge: undefined,
    combatUltimate: undefined, combatParry: undefined, combatRoll: undefined,
    airDash: undefined,
  };
  vm.createContext(ctx);
  const from = source.indexOf("const bar=n=>"), end = source.indexOf('let cooldownSweep=', from);
  assert.ok(from >= 0 && end > from);
  vm.runInContext(source.slice(from, end), ctx);
  return ctx.hudLine({ isOnGround: true }, s, cfg.tick);
}

const frames = Object.fromEntries(ui.hakkai_overlay.controls.map(entry => Object.entries(entry)[0]));
function elements(frame) { return Object.fromEntries(frame.controls.map(entry => Object.entries(entry)[0])); }

test('factory wiring is a partial override and uses only addon image paths', () => {
  assert.deepEqual(Object.keys(ui).sort(), ['hakkai_overlay', 'hud_actionbar_text', 'namespace', 'root_panel']);
  assert.equal(ui.namespace, 'hud');
  assert.deepEqual(Object.keys(ui.hud_actionbar_text).sort(), ['$hakkai_msg', 'visible']);
  const factory = ui.root_panel.modifications[0].value[0].hakkai_overlay_area.factory;
  assert.equal(factory.name, 'hud_actionbar_text_factory');
  assert.equal(factory.control_ids.hud_actionbar_text, 'hud_actionbar_text@hud.hakkai_overlay');
  for (const frame of Object.values(frames)) {
    const c = elements(frame);
    for (const key of ['heart_idle', 'heart_pulse']) assert.equal(c[key].texture, 'textures/ui/hakkai_heart');
    for (const key of ['drop_full', 'drop_mid', 'drop_low']) assert.equal(c[key].texture, 'textures/ui/hakkai_drop');
  }
});

test('real hudLine tokens route to one matching frame and leave Japanese readout intact under the model', () => {
  let checked = 0;
  for (const pos of [0, 1]) for (const size of [0, 1]) for (const color of [0, 1])
  for (const stamina of [0, 35, 36, 100]) for (const mana of [0, 33, 34, 66, 67, 100]) for (const tick of [0, 10, 20, 30]) {
    const message = renderLine({hud_pos: pos, hud_size: size, hud_color: color, stamina, mana, tick});
    assert.equal(evaluate(ui.hud_actionbar_text.visible, message), false);
    assert.equal(evaluate(ui.hakkai_overlay.visible, message), true);
    const selected = Object.entries(frames).filter(([, f]) => evaluate(f.visible, message));
    assert.deepEqual(selected.map(([name]) => name), [`hakkai_frame_${pos}${size}`]);
    const controls = elements(selected[0][1]);
    const text = evaluate(controls.hakkai_readout.text, message);
    const expected = message.slice(Object.values(hudTokens).filter(t => message.includes(t)).reduce((n, t) => n + t.length, 0)) + '§r';
    assert.equal(text, expected);
    assert.match(text, /スタミナ/); assert.match(text, /魔力/);
    const pulse = Math.floor(tick / 10) % (stamina <= 35 ? 2 : 4) === 0;
    assert.equal(evaluate(controls.heart_pulse.visible, message), pulse);
    assert.equal(evaluate(controls.heart_idle.visible, message), !pulse);
    const drops = ['drop_low', 'drop_mid', 'drop_full'].filter(name => evaluate(controls[name].visible, message));
    assert.deepEqual(drops, [mana <= 33 ? 'drop_low' : mana <= 66 ? 'drop_mid' : 'drop_full']);
    checked++;
  }
  assert.equal(checked, 768);
});

test('embedded short reset sequences remain in addon action text under the model', () => {
  const action = '§a警告§r§r§r§r通常のメッセージ';
  const message = renderLine({hud_pos: 0, stamina: 70, mana: 90, tick: 10, until: 20, action});
  const frame = Object.values(frames).find(f => evaluate(f.visible, message));
  assert.ok(frame);
  assert.ok(evaluate(elements(frame).hakkai_readout.text, message).includes(action));
});

test('ordinary actionbar messages and mode 2 do not select the overlay under the model', () => {
  for (const message of ['テスト', '§c通常の警告§r', '§a警告§r§r§r§r通常のメッセージ', renderLine({hud_pos: 2, stamina: 70, mana: 90, tick: 10})]) {
    assert.equal(evaluate(ui.hud_actionbar_text.visible, message), true);
    assert.equal(evaluate(ui.hakkai_overlay.visible, message), false);
  }
  assert.equal(renderLine({hide_hud: 1, stamina: 70, mana: 90, tick: 10}), undefined);
});

// Verify the narrowly scoped mitigation for a possible actionbar collision.
// These checks do not simulate Bedrock's UI parsing or rendering.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hudTokens } from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';

const ui = JSON.parse(fs.readFileSync('Hakkai_v7.1.0/ResourcePack/ui/hud_screen.json', 'utf8'));

test('distinctive base marker no longer mistakes four reset codes for an addon HUD message', () => {
  const oldMarker = '§r§r§r§r';
  const newMarker = hudTokens.base;
  assert.notEqual(newMarker, oldMarker);
  assert.match(newMarker, /^(?:§[0-9a-fr])+$/);
  assert.ok(newMarker.endsWith('§r'), 'reset formatting before subsequent text');
  assert.ok(ui.hud_actionbar_text.visible.includes(`'${newMarker}'`));
  assert.ok(ui.hakkai_overlay.visible.includes(`'${newMarker}'`));
  const foreignMessage = `§a警告${oldMarker}通常のメッセージ`;
  assert.equal(foreignMessage.includes(newMarker), false);
  for (const [key, value] of Object.entries(hudTokens)) {
    if (key !== 'base') assert.equal(newMarker.includes(value), false, `marker overlaps state token ${key}`);
  }
});

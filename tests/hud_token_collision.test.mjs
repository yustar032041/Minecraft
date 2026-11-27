// Document an existing routing ambiguity; this models text subtraction, not
// the Bedrock client, and does not establish the cause of any reported bug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hudTokens } from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';

const ui = JSON.parse(fs.readFileSync('Hakkai_v7.1.0/ResourcePack/ui/hud_screen.json', 'utf8'));

test('base marker is ordinary formatting and can occur in an unrelated message', () => {
  assert.equal(hudTokens.base, '§r§r§r§r');
  assert.ok(ui.hud_actionbar_text.visible.includes(`'${hudTokens.base}'`));
  assert.ok(ui.hakkai_overlay.visible.includes(`'${hudTokens.base}'`));
  const foreignMessage = `§a警告${hudTokens.base}通常のメッセージ`;
  const isRecognizedAsHakkai = foreignMessage !== foreignMessage.replace(hudTokens.base, '');
  assert.equal(isRecognizedAsHakkai, true, 'the substring-only marker is not exclusive to this addon');
});

// Guard the player-facing instructions against contradicting the actual tome
// and selected-totem behavior. This is not an in-game UI test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const text=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
test('guide, index and selected-totem menu describe the current magic costs',()=>{
 assert.match(text,/訪問や解放なしで選べます/);
 assert.match(text,/月魔法ではトーテムは消費せず、再使用まで6秒/);
 assert.match(text,/魔力15で月のまどろみを発動し、トーテムは消費せず6秒/);
 assert.match(text,/致命傷からの復活を試み、その時はトーテムを消費/);
 assert.doesNotMatch(text,/確認後に消費して月のまどろみ/);
});

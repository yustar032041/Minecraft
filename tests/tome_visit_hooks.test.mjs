// Legacy visit records no longer gate or notify for the tome. They must not
// change world progression hooks or prevent magic when properties fail.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
test('the actual tome path does not query or update visit history',()=>{
 const start=source.indexOf('const TOME_SPELLS='),end=source.indexOf('function shore(p){',start);const code=source.slice(start,end);
 assert.ok(start>=0&&end>start);assert.doesNotMatch(code,/tomeHasAttribute|hasTomeRealm|visited\(|recordTomeRealm/);
 assert.ok(source.includes("if(id===ns+'element_tome'){tomeCrouchTick"));
 assert.doesNotMatch(source,/recordTomeRealm\(|hasPendingTomeVisits\(/);
 assert.ok(source.includes('TOME_SELECTIONS.delete(playerId)'));
});

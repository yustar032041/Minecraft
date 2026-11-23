// Load the complete entrypoint with early-execution restrictions and a fake API.
// Simulated only: a successful import does not prove Bedrock accepts the pack.
import assert from 'node:assert/strict';
import {emit,hasListener,intervals,system} from './stubs/startup_server.mjs';
const logs=[];const oldError=console.error;console.error=(...v)=>logs.push(v.join(' '));
try {
 await import('../Hakkai_v7.1.0/BehaviorPack/scripts/main.js');
 for(const e of ['system.before.startup','world.after.worldLoad','world.after.playerSpawn','world.after.itemStartUse','world.after.itemReleaseUse','world.before.entityHurt'])assert.ok(hasListener(e),e);
 const items=[],blocks=[];
 emit('system.before.startup',{itemComponentRegistry:{registerCustomComponent:(...x)=>items.push(x)},blockComponentRegistry:{registerCustomComponent:(...x)=>blocks.push(x)}});
 assert.ok(items.some(x=>x[0]==='hakkai:use'&&typeof x[1].onUse==='function'));
 assert.ok(blocks.length>0);emit('world.after.worldLoad',{});
 for(const timer of intervals){system.currentTick+=timer.n;timer.fn();}
 assert.deepEqual(logs,[],`startup errors: ${logs.join('\n')}`);
} finally {console.error=oldError;}
console.log('Full entrypoint imports, registers and initializes with simulated early-execution restrictions (not Bedrock)');

import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('// Fast input sampling is isolated'),b=src.indexOf('// v5.2.0:',a);assert.ok(a>=0&&b>a);
let callback;const ticks=[],events=[],p={id:'p',dimension:{id:'hakkai:warden_arena'},getGameMode:()=> 'survival'},q={id:'q',dimension:{id:'minecraft:overworld'},getGameMode:()=> 'survival'};
const system={currentTick:0,runInterval:(fn,n)=>{assert.equal(n,1);callback=fn;}},ctx={GameMode:{Spectator:'spectator'},system,ns:'hakkai:',world:{getAllPlayers:()=>[p,q]},state:()=>({}),combatRoll:undefined,airDash:undefined,airStrike:undefined,combatParry:{tick:p=>events.push('input:'+p.id),flush:()=>events.push('flush')},gear:new Map(),selected:()=>undefined,wardenArena:undefined,wardenBoss:{musicActive:()=>false,tick:(p,t)=>{ticks.push([p.id,t]);events.push('boss:'+p.id)}},report:()=>assert.fail()};
vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);for(let t=0;t<=50;t++){system.currentTick=t;callback();}
assert.deepEqual(events.slice(0,5),['input:p','input:q','boss:p','boss:q','flush'],'all players sample before boss resolution');
assert.equal(ticks.length,102);assert.ok(ticks.every(([id,t],i)=>id===(i%2?'q':'p')&&t===Math.floor(i/2)));
console.log('Real fast loop: boss ticks and music cleanup run every tick (mocked)');

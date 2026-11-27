import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const code=main.slice(main.indexOf('// Wildlife gets an independent'),main.indexOf('// Terrain queue pump:'));
const calls=[],players=[],errors=[];let callback;
const ctx={system:{currentTick:200,runInterval:(fn,t)=>{assert.equal(t,20);callback=fn;}},world:{getAllPlayers:()=>players},GameMode:{Spectator:'spectator'},ns:'hakkai:',
 currentPlace:p=>{if(p.badSite)throw Error('site');return {id:1};},biomeAt:()=>({id:'plains'}),wildlifeTick:(...v)=>calls.push(v),report:(...x)=>errors.push(x)};
vm.runInNewContext(code,ctx);
function player(id,dimension='hakkai:realm_0',mode='survival') {return {id,isValid:true,getGameMode:()=>mode,dimension:{id:dimension,getEntities:()=>[]}};}
players.push(player('survival'),player('creative','hakkai:realm_0','creative'),player('spectator','hakkai:realm_0','spectator'),player('idle','hakkai:warden_arena'),player('boss','hakkai:warden_arena'),player('broken','hakkai:warden_arena'),player('last'));
players[4].dimension.getEntities=()=>[{}];players[5].dimension.getEntities=()=>{throw Error('boss query')};players[6].badSite=true;
callback();assert.deepEqual(calls.map(c=>c[0].id),['survival','creative','idle','last']);assert.equal(calls[3][2],undefined);assert.equal(errors.length,1);
console.log('Wildlife scans run independently, isolate player errors, and exclude spectator and occupied/unknown arena (mocked)');
// Every other scan is skipped only outside add-on realms.
calls.length=0;players.push(player('vanilla','minecraft:overworld'));
callback();assert.equal(calls.some(c=>c[0].id==='vanilla'),false);assert.ok(calls.some(c=>c[0].id==='survival'));
calls.length=0;callback();assert.ok(calls.some(c=>c[0].id==='vanilla'));

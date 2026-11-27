import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnWildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_spawn.js';

function fixture(){
 const spawned=[], players=[];
 const d={isChunkLoaded:()=>true,getPlayers(q){return q?players.filter(p=>Math.hypot(p.location.x-q.location.x,p.location.y-q.location.y,p.location.z-q.location.z)<=q.maxDistance):players;},spawnEntity:(id,at)=>spawned.push({id,at})};
 const player={dimension:d,location:{x:100.5,y:80,z:100.5}};
 return {spawned,players,d,player,args:{player,type:'hakkai:wild',tick:0,safe:()=>true,wideRealmSearch:true}};
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
test('realm first choices rotate across all rings over successive 20-tick scans',()=>{
 const f=fixture();const seen=[];
 for(let tick=0;tick<100;tick+=20){f.args.tick=tick;assert.equal(spawnWildlife(f.args),true);seen.push(distance(f.player.location,f.spawned.at(-1).at));}
 assert.ok(seen[0]>=9&&seen[0]<=11);assert.ok(seen[1]>=15&&seen[1]<=17);assert.ok(seen[2]>=21&&seen[2]<=23);assert.ok(seen[3]>=27&&seen[3]<=29);assert.ok(seen[4]>=33&&seen[4]<=35);
});
test('unloaded outer ring is skipped without forcing a chunk and falls back to loaded area',()=>{
 const f=fixture();f.args.tick=80;let sawUnloaded=false;
 f.d.isChunkLoaded=at=>{if(distance(f.player.location,at)>32){sawUnloaded=true;return false;}return true;};
 assert.equal(spawnWildlife(f.args),true);assert.ok(sawUnloaded);assert.ok(distance(f.player.location,f.spawned[0].at)<=32);
});
test('all players remain protected and full candidate neighborhoods are skipped on wider rings',()=>{
 const f=fixture();const angle=4*2.39996;
 f.players.push({location:{x:Math.floor(f.player.location.x+Math.cos(angle)*34)+.5,y:80,z:Math.floor(f.player.location.z+Math.sin(angle)*34)+.5}});let checks=0;
 f.args.tick=80;f.args.capacity=()=>{checks++;return checks>1;};
 assert.equal(spawnWildlife(f.args),true);const at=f.spawned[0].at;
 assert.ok(Math.hypot(at.x-f.players[0].location.x,at.y-f.players[0].location.y,at.z-f.players[0].location.z)>6);
 assert.equal(checks,2);
});
test('legacy search remains unchanged outside add-on dimensions',()=>{
 const f=fixture();f.args.wideRealmSearch=false;
 for(let tick=0;tick<100;tick+=20){f.args.tick=tick;assert.equal(spawnWildlife(f.args),true);assert.ok(distance(f.player.location,f.spawned.at(-1).at)<=9);}
});
test('same radius does not repeatedly spawn at a single fixed direction',()=>{
 const f=fixture();const positions=new Set();
 for(let scan=0;scan<50;scan+=5){f.args.tick=scan*20;assert.equal(spawnWildlife(f.args),true);const {x,z}=f.spawned.at(-1).at;positions.add(`${x},${z}`);}
 assert.ok(positions.size>=8,`only ${positions.size} unique directions`);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnWildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_spawn.js';
function fixture(){
 const counts={snapshot:0,filtered:0,avoid:0,spawn:0};let all=[];
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getPlayers(query){
  if(!query){counts.snapshot++;return all;}
  counts.filtered++;return all.filter(p=>p.location&&Math.hypot(p.location.x-query.location.x,p.location.y-query.location.y,p.location.z-query.location.z)<=query.maxDistance);
 },spawnEntity(){counts.spawn++;}};
 const player={dimension:d,location:{x:0,y:90,z:0}};
 const args={player,type:'hakkai:foe_0_0',tick:0,safe:()=>true,avoid:()=>{counts.avoid++;return true;}};
 return {d,player,args,counts,setPlayers(v){all=v;}};
}
test('up to 396 safe candidates require only one snapshot, not 396 player queries',()=>{
 const f=fixture();assert.equal(spawnWildlife(f.args),false);
 assert.equal(f.counts.snapshot,1);assert.equal(f.counts.filtered,0);assert.equal(f.counts.avoid,396);assert.equal(f.counts.spawn,0);
});
test('successful candidate uses one snapshot and a fresh filtered player check',()=>{
 const f=fixture();f.args.avoid=()=>false;assert.equal(spawnWildlife(f.args),true);
 assert.equal(f.counts.snapshot,1);assert.equal(f.counts.filtered,1);assert.equal(f.counts.spawn,1);
});
test('boundary at exactly six blocks is still protected',()=>{
 const f=fixture();f.setPlayers([{location:{x:14.5,y:90,z:.5}}]);
 f.args.safe=(_d,pos)=>pos.x===8.5&&pos.y===90&&pos.z===.5;
 assert.equal(spawnWildlife(f.args),false);assert.equal(f.counts.avoid,0);assert.equal(f.counts.spawn,0);
});
test('arrival after snapshot is rejected again at the selected position',()=>{
 const f=fixture();f.args.avoid=()=>false;f.d.getPlayers=query=>{
  if(!query){f.counts.snapshot++;return [];}
  f.counts.filtered++;return [{location:{...query.location}}];
 };
 assert.equal(spawnWildlife(f.args),false);assert.equal(f.counts.snapshot,1);assert.equal(f.counts.filtered,24);assert.equal(f.counts.spawn,0);
});
test('unknown snapshot location falls back to the original filtered queries',()=>{
 const f=fixture();f.args.avoid=()=>false;f.d.getPlayers=query=>{
  if(!query){f.counts.snapshot++;return [{}];}
  f.counts.filtered++;return [];
 };
 assert.equal(spawnWildlife(f.args),true);assert.equal(f.counts.snapshot,1);assert.equal(f.counts.filtered,2);assert.equal(f.counts.spawn,1);
});
test('failed fresh query stops safely without hundreds of retries',()=>{
 const f=fixture();f.args.avoid=()=>false;f.d.getPlayers=query=>{if(!query)return [];f.counts.filtered++;throw Error('not ready');};
 assert.equal(spawnWildlife(f.args),false);assert.equal(f.counts.filtered,1);assert.equal(f.counts.spawn,0);
});

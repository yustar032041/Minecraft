import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {AMBIENCE_TAG,LEGACY_TAG,ambientParticle,realmTheme,timePhase,updateRealmAmbience} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ambience.js';
const root='Hakkai_v7.1.0/ResourcePack';
function setup(initial=[['other:cool','other_pack']]){
 const entries=initial.map(x=>[...x]),calls=[],particles=[];
 const fog={failRemove:false,failPush:false,failTags:false,
  remove(tag){calls.push(['remove',tag]);if(this.failRemove)throw Error('invalid');const old=entries.length;for(let i=entries.length-1;i>=0;i--)if(entries[i][1]===tag)entries.splice(i,1);return old!==entries.length;},
  push(id,tag){calls.push(['push',id,tag]);if(this.failPush)throw Error('full');entries.push([id,tag]);return entries.length-1;},
  getTags(){if(this.failTags)throw Error('invalid');return entries.map(x=>x[1]);}
 };
 const player={fogSettings:fog,location:{x:1,y:80,z:2},getViewDirection(){return {x:0,y:0,z:1}},spawnParticle(...args){particles.push(args)}};
 return {player,entries,calls,particles,fog};
}
const update=(x,s,opts={})=>updateRealmAmbience(x.player,s,{theme:0,phase:'day',tick:0,...opts});
test('phase boundaries and correct dimension and trail theme',()=>{
 for(const [t,p] of [[0,'morning'],[2999,'morning'],[3000,'day'],[11999,'day'],[12000,'evening'],[12999,'evening'],[13000,'night'],[22999,'night'],[23000,'morning'],[-1,'morning'],[24000,'morning']])assert.equal(timePhase(t),p);
 assert.equal(timePhase(NaN),undefined);
 assert.equal(realmTheme('hakkai:realm_0',{theme:5}),5);
 assert.equal(realmTheme('hakkai:realm_3',{theme:99}),3);
 assert.equal(realmTheme('hakkai:realm_8',{theme:2}),2);
 assert.equal(realmTheme('hakkai:realm_9',{theme:7}),7);
 assert.equal(realmTheme('hakkai:realm_8'),undefined);
 for(const id of ['minecraft:overworld','hakkai:warden_arena','hakkai:realm_8','hakkai:realm_01'])assert.equal(realmTheme(id),undefined);
});
test('all realm time fog definitions and particle selections exist',()=>{
 for(let r=0;r<8;r++){
  const colors=[];
  for(const phase of ['morning','day','evening','night']){
   const id=`hakkai:realm_ambient_${r}_${phase}`;
   const data=JSON.parse(readFileSync(`${root}/fogs/realm_ambient_${r}_${phase}.json`))['minecraft:fog_settings'];
   assert.equal(data.description.identifier,id);colors.push(data.distance.air.fog_color);
  }
  assert.equal(new Set(colors).size,4);
  for(const id of [undefined,...Array.from({length:12},(_,i)=>`hakkai:seed_${r}_${String(i).padStart(2,'0')}`),...Array.from({length:4},(_,i)=>`hakkai:seed_extra_${r}_${i}`),`hakkai:seed_new_${r}_0`]){
   const particle=ambientParticle(r,id);assert.ok(existsSync(`${root}/particles/${particle.replace('hakkai:','')}.json`),`${r} ${id} ${particle}`);
  }
 }
 assert.equal(ambientParticle(0,'hakkai:seed_0_02'), 'hakkai:forest_spores');
 assert.equal(ambientParticle(5,'hakkai:seed_0_02'), 'hakkai:cave_glimmers');
 assert.equal(ambientParticle(0,undefined,{style:'dune'}), 'hakkai:dune_spiral');
});
test('migration, switching, unrelated stack preservation, and quiet cleanup',()=>{
 const x=setup([['other:cool','other_pack'],['old:fog',LEGACY_TAG],['stale:fog',AMBIENCE_TAG]]),s={};
 update(x,s);assert.deepEqual(x.entries,[['other:cool','other_pack'],['hakkai:realm_ambient_0_day',AMBIENCE_TAG]]);
 const count=x.calls.length;update(x,s,{tick:40});assert.equal(x.calls.length,count);
 update(x,s,{theme:1,phase:'night',tick:80});assert.deepEqual(x.entries,[['other:cool','other_pack'],['hakkai:realm_ambient_1_night',AMBIENCE_TAG]]);
 update(x,s,{quiet:true,tick:120});assert.deepEqual(x.entries,[['other:cool','other_pack']]);
 assert.equal(x.calls.some(c=>c[0]==='remove'&&!c[1]),false);
});
test('reconnect and external removal repair and leaving dimension',()=>{
 const x=setup(),a={};update(x,a);x.entries.splice(1,1);update(x,a,{tick:40});assert.equal(x.entries.length,2);
 const b={};update(x,b,{theme:3,tick:80});assert.deepEqual(x.entries,[['other:cool','other_pack'],['hakkai:realm_ambient_3_day',AMBIENCE_TAG]]);
 update(x,b,{theme:undefined,tick:120});assert.deepEqual(x.entries,[['other:cool','other_pack']]);
});
test('failures retry, no false applied state, no unrelated removal',()=>{
 const x=setup([['other:cool','other_pack'],['old:fog',LEGACY_TAG]]),s={};
 x.fog.failRemove=true;update(x,s);assert.equal(s.ambienceInitialized,undefined);
 x.fog.failRemove=false;x.fog.failPush=true;update(x,s,{tick:40});assert.equal(s.ambienceApplied,undefined);assert.deepEqual(x.entries,[['other:cool','other_pack']]);
 x.fog.failPush=false;update(x,s,{tick:80});assert.equal(s.ambienceApplied,'hakkai:realm_ambient_0_day');
 x.fog.failTags=true;update(x,s,{quiet:true,tick:120});assert.equal(s.ambienceApplied,undefined);
 x.fog.failTags=false;update(x,s,{quiet:true,tick:160});assert.deepEqual(x.entries,[['other:cool','other_pack']]);
});
test('one player-local emitter at most per 120 ticks, swimming and quiet skipped',()=>{
 const x=setup(),s={};update(x,s);update(x,s,{tick:40});update(x,s,{tick:80});assert.equal(x.particles.length,1);
 update(x,s,{tick:120,quiet:true});assert.equal(x.particles.length,1);
 x.player.isSwimming=true;update(x,s,{tick:120});assert.equal(x.particles.length,1);
 x.player.isSwimming=false;update(x,s,{tick:240});assert.equal(x.particles.length,2);
 assert.deepEqual(x.particles[0][1],{x:1,y:81.1,z:4.5});
});
test('two players keep independent fog and particles when one disables ambience',()=>{
 const a=setup(),b=setup(),sa={},sb={};
 update(a,sa,{theme:2,phase:'morning'});update(b,sb,{theme:5,phase:'night'});
 update(a,sa,{quiet:true,tick:120});update(b,sb,{theme:5,phase:'night',tick:120});
 assert.deepEqual(a.entries,[['other:cool','other_pack']]);
 assert.deepEqual(b.entries,[['other:cool','other_pack'],['hakkai:realm_ambient_5_night',AMBIENCE_TAG]]);
 assert.equal(a.particles.length,1);assert.equal(b.particles.length,2);
});
test('main loop calls ambience before spectator and arena exits, without fog commands',()=>{
 const main=readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const loop=main.slice(main.indexOf('let cooldownSweep=0;'));
 assert.ok(loop.indexOf('updateRealmAmbience(p,s,')<loop.indexOf('if(p.getGameMode()===GameMode.Spectator)'));
 assert.ok(loop.indexOf('updateRealmAmbience(p,s,')<loop.indexOf("if(p.dimension.id===ns+'warden_arena')"));
 assert.ok(!main.includes('fog @s '));
 assert.match(main,/if\(fogMode<0&&num\(p,'quiet_climate'\)\)return;/);
});

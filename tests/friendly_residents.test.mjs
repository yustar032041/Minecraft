import assert from 'node:assert/strict';import fs from 'node:fs';
import {FRIENDLY_RESIDENTS,foundFriendlyResident,friendlySupportTick,friendlyTrade} from '../Hakkai_v7.1.0/BehaviorPack/scripts/friendly_residents.js';
import {villagerJob} from '../Hakkai_v7.1.0/BehaviorPack/scripts/villager_jobs.js';
import {CULTURE_SITES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_culture.js';
assert.equal(FRIENDLY_RESIDENTS.length,32);
for(let r=0;r<8;r++){
 const roles=FRIENDLY_RESIDENTS.filter(e=>e.realm===r);assert.deepEqual(roles.map(e=>e.role),['guide','healer','artisan','guard']);
 const props=new Map([[`built_${61+r}`,1]]),entities=[],world={gameRules:{doMobSpawning:true}};
 let blocked=false;const dimension={id:`hakkai:realm_${r}`,getPlayers:()=>blocked?[{}]:[],getEntities:()=>[],spawnEntity:(id,at)=>{const data=new Map(),e={id,typeId:id,at,dimension,isValid:true,getDynamicProperty:k=>data.get(k),setDynamicProperty:(k,v)=>data.set(k,v)};entities.push(e);return e;}};
 const options={site:CULTURE_SITES[r],world,dimension,num:(_,k)=>props.get(k)??0,property:(_,k,v)=>props.set(k,v),findFloor:(_d,l)=>l,report:()=>{}};
 blocked=true;assert.equal(foundFriendlyResident(options),false);blocked=false;
 world.gameRules.doMobSpawning=false;assert.equal(foundFriendlyResident(options),false);world.gameRules.doMobSpawning=true;
 for(let i=0;i<4;i++)assert.equal(foundFriendlyResident(options),true);assert.equal(foundFriendlyResident(options),false);
 assert.deepEqual(entities.map(e=>e.id),Array(4).fill('minecraft:villager_v2'));
 assert.deepEqual(entities.map(e=>villagerJob(e,world)),['guide','healer','artisan','guard']);entities.pop();assert.equal(foundFriendlyResident(options),false,'no dead resident replacement');
 assert.ok(!props.has(`culture_residents_${61+r}_v1`),'prior villager marker untouched');
 props.delete(`friendly_residents_${61+r}_v1`);dimension.spawnEntity=()=>{throw Error('spawn uncertain')};
 assert.equal(foundFriendlyResident(options),false);assert.equal(props.get(`friendly_residents_${61+r}_v1`),1,'fail closed after reservation');
}
{
 const effects=new Map(),given=[];let hp=10,nearby=[];
 const player={location:{x:1,y:88,z:1},dimension:{getEntities:query=>{assert.equal(query.maxDistance,6);assert.deepEqual(query.families,['villager']);return nearby;}},getEffect:id=>effects.get(id),getComponent:()=>({currentValue:hp,effectiveMax:20}),addEffect:(id,duration,options)=>{given.push({id,duration,options});effects.set(id,{});}};
 const state={};nearby=[{isValid:true,role:'guide'},{isValid:true,role:'healer'}];
 friendlySupportTick(player,state,0,e=>e.role);assert.deepEqual(given.map(e=>[e.id,e.duration]),[['speed',120],['regeneration',100]]);
 effects.clear();friendlySupportTick(player,state,40,e=>e.role);assert.equal(given.length,2,'cooldowns');
 friendlySupportTick(player,state,600,e=>e.role);assert.equal(given.length,3,'guide cooldown expires');
 effects.set('regeneration',{});friendlySupportTick(player,state,1200,e=>e.role);assert.equal(given.length,3,'do not replace existing effect');
 effects.clear();hp=20;friendlySupportTick(player,state,1240,e=>e.role);assert.equal(given.length,4,'full health does not get healing');
 hp=10;friendlySupportTick(player,state,1280,e=>e.role);assert.equal(given.length,5,'injured player gets healing');
}
class Item{constructor(id,amount=1,max=64){this.typeId=id;this.amount=amount;this.maxAmount=max;}clone(){return new Item(this.typeId,this.amount,this.maxAmount);}isStackableWith(other){return this.typeId===other.typeId;}}
function inventory(items,failAt){return {items,size:items.length,getItem(i){return this.items[i]?.clone();},setItem(i,v){if(this.failAt===i){this.failAt=-1;throw Error('failure');}this.items[i]=v?.clone();},failAt};}
const snap=c=>c.items.map(x=>x&&[x.typeId,x.amount]);
{
 const c=inventory([new Item('minecraft:emerald',3),new Item('minecraft:bread',60),undefined]);
 assert.equal(friendlyTrade(c,new Item('minecraft:bread',8)),true);assert.deepEqual(snap(c),[['minecraft:emerald',2],['minecraft:bread',64],['minecraft:bread',4]]);
 const full=inventory([new Item('minecraft:emerald',2),new Item('minecraft:bread',64)]),before=snap(full);
 assert.equal(friendlyTrade(full,new Item('minecraft:bread',2)),false);assert.deepEqual(snap(full),before);
 const last=inventory([new Item('minecraft:emerald')]);assert.equal(friendlyTrade(last,new Item('minecraft:bread',2)),true);assert.deepEqual(snap(last),[['minecraft:bread',2]]);
 const fail=inventory([new Item('minecraft:emerald',2),undefined],1),saved=snap(fail);assert.equal(friendlyTrade(fail,new Item('minecraft:bread',2)),false);assert.deepEqual(snap(fail),saved,'rollback');
 const missing=inventory([new Item('minecraft:diamond')]);assert.equal(friendlyTrade(missing,new Item('minecraft:bread')),false);
}
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
assert.match(main,/foundFriendlyResident\(\{site,world,dimension:p\.dimension/);assert.match(main,/friendlySupportTick\(p,s,t,e=>villagerJob\(e,world\)\)/);assert.match(main,/friendlyTrade\(space\(p\)/);
assert.match(main,/const near=\(\)=>p\.isValid&&target\.isValid&&p\.dimension\.id===target\.dimension\.id&&dist\(p\.location,target\.location\)<6/);
console.log('Vanilla villagers: independent one-time spawning, safe support cooldowns and planned trades (mocked)');

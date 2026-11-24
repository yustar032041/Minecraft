import assert from 'node:assert/strict';import fs from 'node:fs';
import {places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {isNaturalSite,siteBounds,inSite,siteIntersects,blendSiteHeight,FRONTIER_SITES,SKY_FRONTIER_SITES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/natural_sites.js';
import {setupFrontierWorlds} from '../Hakkai_v7.1.0/BehaviorPack/scripts/frontier_worlds.js';
const natural=places.filter(isNaturalSite);assert.equal(natural.length,42);assert.equal(natural.filter(s=>s.kind==='frontier').length,8);assert.equal(natural.filter(s=>s.kind==='island').length+natural.filter(s=>s.id>=9&&s.id<=20).length,32);
const names=new Set(natural.map(s=>s.id));assert.equal(names.size,42);
for(const s of natural){
 assert.ok(fs.existsSync(`Hakkai_v7.1.0/BehaviorPack/structures/hakkai/site_${s.id}.mcstructure`));
 const b=siteBounds(s);assert.ok(inSite(s,b.x0,b.z0));assert.ok(!inSite(s,b.x0-1,b.z0));assert.ok(siteIntersects(s,b.x0-1,b.z0,b.x0,b.z0));assert.equal(siteIntersects(s,b.x0-16,b.z0-16,b.x0-1,b.z0-1),false);
 assert.equal(blendSiteHeight(120,b.x1+1,s.z,[s]),87);assert.equal(blendSiteHeight(120,b.x1+32,s.z,[s]),120);
 assert.equal(blendSiteHeight(-1,b.x1+1,s.z,[s]),87);assert.equal(blendSiteHeight(-1,b.x1+32,s.z,[s]),-1);
 for(let d=1;d<32;d++)assert.ok(Math.abs(blendSiteHeight(110,b.x1+d,s.z,[s])-blendSiteHeight(110,b.x1+d+1,s.z,[s]))<=2);
}
for(let r=0;r<8;r++){
 const ids=natural.filter(s=>s.dim===r);assert.ok(ids.some(s=>s.kind==='frontier'));assert.ok(ids.some(s=>s.kind==='island'||s.id<=20));
 for(const a of ids)for(const b of ids)if(a.id<b.id){const box=siteBounds(a),other=siteBounds(b);assert.ok(!siteIntersects(a,other.x0,other.z0,other.x1,other.z1),`${a.id}/${b.id} overlap`);}
}
const props=new Map();const f=setupFrontierWorlds({ns:'hakkai:',world:{},num:(_w,k)=>props.get(k)??0,property:()=>{throw Error('legacy builder must not write')},report:()=>{}});
f.tick({dimension:{id:'hakkai:realm_0'},location:{x:300,z:0}},20);
for(let r=0;r<8;r++)for(let i=3;i<6;i++)assert.deepEqual(f.siteCoords(r,i),(r===6?SKY_FRONTIER_SITES:FRONTIER_SITES)[i-3]);
assert.equal(f.isGenerated(0,{x:310,z:25}),false);props.set('seed_land_0_19_1_v1',1);assert.equal(f.isGenerated(0,{x:310,z:25}),true);props.clear();props.set('frontier_land_0_v1',1);assert.equal(f.isGenerated(0,{x:310,z:25}),true);
console.log('40 preserved site structures, bounded blending, all realms and legacy discovery records (static/mocked)');

import assert from 'node:assert/strict';
import {EXTRA_BIOMES,extraBiomeAt} from '../Hakkai_v7.1.0/BehaviorPack/scripts/extra_biomes.js';
import {biomes,families,wildlife,attrs} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {seedFunctions} from './seed_terrain_helpers.mjs';
import fs from 'node:fs';
const previousBiomeCount=183,previousFamilyCount=123;
assert.equal(Object.keys(biomes)[previousBiomeCount-1],'hakkai:seed_7_11');assert.equal(Object.keys(families)[previousFamilyCount-1],'seed_realm_7_11');
assert.equal(Object.keys(biomes).length,previousBiomeCount+40);assert.equal(Object.keys(families).length,previousFamilyCount+40);
const ids=new Set(),names=new Set(),types=new Set(wildlife.map(p=>p.id)),{noise}=seedFunctions('731');
for(let r=0;r<8;r++){
 const counts=[0,0,0,0];
 for(let x=-1800;x<=1800;x+=24)for(let z=-1800;z<=1800;z+=24){
  const p=extraBiomeAt(r,x,z,noise);assert.deepEqual(p,extraBiomeAt(r,x,z,noise));if(p){counts[p.index]++;assert.ok(p.weight>=0&&p.weight<=1);}
 }
 for(let i=0;i<4;i++){
  const p=EXTRA_BIOMES[r][i];assert.ok(counts[i]>30,`${p.name} must appear for a representative seed`);
  assert.equal(biomes[p.id],p.key);assert.equal(families[p.key],p);assert.equal(p.realm,r);assert.ok(types.has(p.species));assert.ok(types.has(p.rareSpecies));assert.ok(attrs[p.ore]);assert.equal(p.mode,'land');
  for(const id of [p.top,p.accent])if(id.startsWith('hakkai:'))assert.ok(fs.existsSync(`Hakkai_v7.1.0/BehaviorPack/blocks/${id.slice(7)}.json`),id);
  ids.add(p.id);names.add(p.name);
 }
}
assert.equal(ids.size,32);assert.equal(names.size,32);assert.equal(extraBiomeAt(-1,0,0,noise),undefined);
console.log('32 distinct seed-biome identities, append-only records, habitats and real seed distribution OK (simulated)');

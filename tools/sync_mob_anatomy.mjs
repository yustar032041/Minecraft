// Classify existing hostile client models without changing textures/geometry.
import fs from 'node:fs';
import {mobContent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
const rp='Hakkai_v7.1.0/ResourcePack',out='Hakkai_v7.1.0/BehaviorPack/scripts/mob_visual_anatomy.js';
const geometry=new Map();
for(const file of fs.readdirSync(`${rp}/models/entity`).filter(f=>f.endsWith('.json')).sort()){
 const obj=JSON.parse(fs.readFileSync(`${rp}/models/entity/${file}`,'utf8'));
 for(const model of obj['minecraft:geometry']??[]){
  const id=model.description.identifier;if(geometry.has(id))throw Error(`Duplicate geometry ${id}`);
  geometry.set(id,new Set(model.bones.map(b=>b.name)));
 }
}
const data={},counts={};
for(const [id,profile] of [...mobContent].sort(([a],[b])=>a.localeCompare(b,'en'))){
 if(profile.temper!=='hostile')continue;
 const client=JSON.parse(fs.readFileSync(`${rp}/entity/${profile.id}.entity.json`,'utf8'))['minecraft:client_entity'].description;
 const bones=geometry.get(client.geometry.default);
 // Bespoke foe and hostile wildlife rigs prefix each joint per individual.
 const match=/^foe_0_(\d+)$/.exec(profile.id),forest=/^foe_1_([0-9]|1[01])$/.exec(profile.id),desert=/^foe_2_([0-9]|1[01])$/.exec(profile.id),ice=/^foe_3_([0-9]|1[01])$/.exec(profile.id),storm=/^foe_4_([0-9]|1[01])$/.exec(profile.id),underground=/^foe_5_([0-9]|1[01])$/.exec(profile.id),sky=/^foe_6_([0-9]|1[01])$/.exec(profile.id),clockwork=/^foe_7_([0-9]|1[01])$/.exec(profile.id),wild=/^wild_([0-7])_2$/.exec(profile.id);const prefix=match?`f0_${match[1]}_`:forest?`f1_${forest[1]}_`:desert?`f2_${desert[1]}_`:ice?`f3_${ice[1]}_`:storm?`f4_${storm[1]}_`:underground?`f5_${underground[1]}_`:sky?`f6_${sky[1]}_`:clockwork?`f7_${clockwork[1]}_`:wild?`w${wild[1]}_2_`:'';
 const has=(...names)=>names.every(n=>bones?.has(prefix+n));
 if(!has('body','head'))throw Error(`Unknown body geometry: ${id}`);
 const type=has('wing_l','wing_r')?'wings':has('arm_l','arm_r')?'arms':has(...Array.from({length:8},(_,i)=>`leg_${i}`))?'arachnid':has('leg_0','leg_1','leg_2','leg_3')?'quadruped':undefined;
 if(!type)throw Error(`Unknown limb geometry: ${id}`);
 data[profile.id]=type;counts[type]=(counts[type]??0)+1;
}
const text='// Generated from hostile client geometry by tools/sync_mob_anatomy.mjs.\n// Cosmetic lookup only; no model, texture, AI or damage is modified.\nexport const MOB_VISUAL_ANATOMY=Object.freeze('+JSON.stringify(data,null,2)+');\n';
if(process.argv.includes('--check')){
 if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==text){console.error('Mob anatomy mapping is stale');process.exit(1);}
}else fs.writeFileSync(out,text);
console.log(`Hostile model anatomy ${Object.keys(data).length}: ${JSON.stringify(counts)}`);

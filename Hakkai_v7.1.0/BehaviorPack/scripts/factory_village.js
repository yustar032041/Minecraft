import { residentSpot } from './resident_spawn.js';
import { FACTORY_ROLE_LABELS, factoryResidentRole } from './realm_culture.js';
// One-time founding, only while the village bell is active. Each slot is
// reserved before spawning so a restart cannot recreate already dead residents.
export const FACTORY_VILLAGE_ID=59, FACTORY_RESIDENTS=24;
export function foundFactoryResident({town,world,num,property,findFloor,report}){
 if(!town.factoryVillage||!world.gameRules.doMobSpawning)return false;
 const key=town.repeatSiteKey?`factory_village_founding_${town.repeatSiteKey}_v1`:'factory_village_founding_v1',i=num(world,key);
 if(!Number.isInteger(i)||i<0||i>=FACTORY_RESIDENTS)return false;
 const angle=i*Math.PI*2/24,r=7+(i%3)*2;
 try{const at=residentSpot(town.d,{x:town.l.x+Math.cos(angle)*r,y:town.l.y,z:town.l.z+Math.sin(angle)*r},findFloor);
 if(!at)return false;
 // Fail closed on errors: never re-create a resident after uncertain spawning.
 property(world,key,i+1);
 const e=town.d.spawnEntity('minecraft:villager_v2',at,{initialPersistence:true});e.nameTag=`風車村の住人 ${i+1}`;const role=factoryResidentRole(e);e.nameTag+=`｜${FACTORY_ROLE_LABELS[role]}`;return true;}
 catch(err){report('工場村の住人生成',err);return false;}
}

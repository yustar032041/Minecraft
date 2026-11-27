import {combatEffectAllowed,isCombatTarget} from './combat_resonance.js';
// Finisher effects are intentionally short and never pin major bosses. They
// apply only after an accepted third hit, including confirmed native melee;
// an attack that was blocked or failed must never produce an effect.
const EFFECTS={剣:['weakness',35],斧:['weakness',50],弓:['slowness',30],杖:['weakness',40],ハンマー:['slowness',50],槍:['slowness',35],盾:['slowness',30],扇:['weakness',45]};
const BOSS=/^(?:hakkai:(?:time_warden|eclipse_colossus|fushi_chief|(?:king_)?guardian_[0-7])|minecraft:(?:wither|ender_dragon|warden))$/;
export function linkFinisher(p,target,g,style,landed){
 if(!landed||!style?.linked||style.stage!==3||!EFFECTS[g?.kind]||BOSS.test(target?.typeId??''))return false;
 try{
  if(!combatEffectAllowed(p,target)||!isCombatTarget(target,p))return false;
  const [id,duration]=EFFECTS[g.kind],old=target.getEffect(id);
  if(old&&(old.amplifier>0||old.amplifier===0&&old.duration>=duration))return false;
  target.addEffect(id,duration,{amplifier:0,showParticles:false});return true;
 }catch{return false;}
}

import {EntityDamageCause} from '@minecraft/server';
import {patrolCast} from './mob_attack_visuals.js';

// Target choice, line of sight and cooldown remain with the village system.
// A rejected/failed hit must not leave a free debuff, and cosmetic failures
// cannot undo a hit. This magic has no player-facing warning or projectile.
export function patrolMagicHit(mage,foe){
 if(!mage?.isValid||!foe?.isValid||mage.typeId!=='hakkai:village_mage')return false;
 let impact;try{const {x,y,z}=foe.location;if([x,y,z].every(Number.isFinite))impact={x,y:y+.7,z};}catch{}
 let accepted=false;
 try{accepted=Boolean(foe.applyDamage(3,{cause:EntityDamageCause.magic,damagingEntity:mage}));}catch{}
 if(!accepted)return false;
 try{foe.addEffect('slowness',55,{amplifier:1,showParticles:false});}catch{}
 patrolCast(mage);
 if(impact)try{mage.dimension.spawnParticle('hakkai:climate_5',impact);}catch{}
 return true;
}

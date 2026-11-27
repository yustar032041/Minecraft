import {GameMode} from '@minecraft/server';
// Presentation only: never changes damage, targeting, stamina, velocity or input.
// Animation availability/rendering must still be verified in a Bedrock client.
const KINDS=Object.freeze({'剣':'sword','斧':'axe','弓':'bow','杖':'staff','ハンマー':'hammer','槍':'spear','盾':'shield','扇':'fan'});
const PHASES=new Set(['attack_a','attack_b','charged','ultimate']);
export function weaponMotionId(g,phase,variant=0,direction='neutral'){
 const kind=KINDS[g?.kind];if(!kind)return undefined;
 const individual=/^(?:gear_\d{3}|ult_sword|ult_axe|warden_blade_[0-7])$/.test(g?.id??'');
 if(phase==='attack')phase=individual&&['forward','back','left','right'].includes(direction)?direction:variant%2?'attack_b':'attack_a';
 if(!PHASES.has(phase)&&!['forward','back','left','right'].includes(phase))return undefined;
 return individual?`animation.hakkai.unique_weapon_${g.id}_${phase}`:`animation.hakkai.weapon_${kind}_${phase}`;
}
// Cosmetic support for vanilla combat items: their native attacks and arrows
// remain unchanged; this does not invent new vanilla skills or ultimates.
export function vanillaWeaponKind(id){
 if(typeof id!=='string')return undefined;
 if(/^minecraft:(?:wooden|stone|iron|golden|diamond|netherite)_sword$/.test(id))return '剣';
 if(/^minecraft:(?:wooden|stone|iron|golden|diamond|netherite)_axe$/.test(id))return '斧';
 return ({'minecraft:bow':'弓','minecraft:crossbow':'弓','minecraft:trident':'槍','minecraft:mace':'ハンマー','minecraft:shield':'盾'})[id];
}
export function playVanillaWeaponMotion(p,id,phase='attack'){
 const kind=vanillaWeaponKind(id);return kind?playWeaponMotion(p,{kind},phase):false;
}
export function vanillaSwingMotion(e,selected,state){
 try{
  const p=e?.player,id=e?.heldItemStack?.typeId;
  if(e?.swingSource!=='Attack'||!p?.isValid||p.typeId!=='minecraft:player'||p.getGameMode()===GameMode.Spectator||!vanillaWeaponKind(id)||selected(p)?.typeId!==id)return false;
  const s=state(p);if(s.busy||s.menu)return false;
  return playVanillaWeaponMotion(p,id);
 }catch{return false;}
}
export function playWeaponMotion(p,g,phase,variant=0,direction='neutral'){
 const id=weaponMotionId(g,phase,variant,direction);if(!id)return false;
 try{p.playAnimation(id,{blendOutTime:.1,stopExpression:'query.any_animation_finished'});return true;}catch{return false;}
}

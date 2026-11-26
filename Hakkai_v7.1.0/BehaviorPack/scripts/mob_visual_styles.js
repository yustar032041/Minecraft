import {MOB_VISUAL_ANATOMY} from './mob_visual_anatomy.js';
// Presentation only: no attack behavior, timing or damage is determined here.
export function creatureVisualStyle(profile){
 if(profile?.temper!=='hostile')return undefined;
 if(profile.talent==='leap'||profile.talent==='charge')return 'lunge';
 if(profile.talent==='armor'||profile.talent==='thorns')return 'brace';
 return 'cast';
}
export function creatureVisualAnimation(profile,phase){
 const style=creatureVisualStyle(profile),anatomy=MOB_VISUAL_ANATOMY[profile?.id];
 // Individual grassland foes and the rebuilt wildlife rigs use matching tracks.
 if(style&&(/^foe_0_(?:[0-9]|1[01])$/.test(profile?.id??'')||/^foe_1_(?:[0-9]|1[01])$/.test(profile?.id??'')||/^foe_2_(?:[0-9]|1[01])$/.test(profile?.id??'')||/^foe_3_(?:[0-9]|1[01])$/.test(profile?.id??'')||/^foe_4_(?:[0-9]|1[01])$/.test(profile?.id??'')||/^foe_5_(?:[0-9]|1[01])$/.test(profile?.id??'')||/^foe_6_(?:[0-9]|1[01])$/.test(profile?.id??'')||/^foe_7_(?:[0-9]|1[01])$/.test(profile?.id??'')||/^wild_[0-7]_2$/.test(profile?.id??'')))return `animation.hakkai.${profile.id}_${phase}`;
 if(style&&anatomy)return `animation.hakkai.creature_${style}_${anatomy}_${phase}`;
 return style?`animation.hakkai.creature_${style}_${phase}`:`animation.hakkai.creature_${phase}`;
}

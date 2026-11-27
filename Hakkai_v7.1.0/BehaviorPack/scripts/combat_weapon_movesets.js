import {catalogFamily,catalogFamilyMove} from './combat_weapon_families.js';
// Hand-authored experimental melee movesets for the eight boss-derived swords
// and two endgame weapons. These are gameplay patterns, not hash-based visual
// variants. Other weapons intentionally use the existing class fallback.
//
// One pulse = one delayed hit test. Multiple pulses may still be rejected by
// Bedrock's hurt immunity; a pulse is never a promise of guaranteed damage.
const moves={
 warden_blade_0:{name:'風裂',stages:[
  {name:'風駆け',shape:'thrust',reach:4.2,windup:3,move:.46},
  {name:'横風',shape:'cleave',reach:3.8,angle:-.35,move:.38},
  {name:'疾風連旋',shape:'spin',reach:3.7,pulses:[0,6],power:-2,move:.48,animation:'warden_0'}]},
 warden_blade_1:{name:'霧縫い',stages:[
  {name:'霞返し',shape:'cleave',reach:3.5,angle:-.42,move:.35},
  {name:'霧渡り',shape:'cleave',reach:3.5,angle:.42,move:.42},
  {name:'幻惑の交差',shape:'cross',reach:3.8,pulses:[0,7],effect:'weakness',move:.42,animation:'warden_1'}]},
 warden_blade_2:{name:'砂葬',stages:[
  {name:'砂断ち',shape:'cleave',reach:3.2,windup:5,power:2,move:.25},
  {name:'砂払い',shape:'cleave',reach:3.4,windup:5,power:2,move:.25},
  {name:'砂葬の衝撃',shape:'spin',reach:3.5,windup:7,recovery:21,power:6,effect:'slowness',push:1.05,move:.24,animation:'warden_2'}]},
 warden_blade_3:{name:'氷鏡',stages:[
  {name:'氷突き',shape:'thrust',reach:4.5,move:.30},
  {name:'鏡返し',shape:'cleave',reach:3.5,move:.28},
  {name:'凍縛の連突',shape:'thrust',reach:4.8,pulses:[0,7],effect:'slowness',move:.30,animation:'warden_3'}]},
 warden_blade_4:{name:'雷迅',stages:[
  {name:'雷踏み',shape:'thrust',reach:4,windup:3,recovery:10,move:.50},
  {name:'返し閃',shape:'cleave',reach:3.6,windup:3,recovery:10,move:.44},
  {name:'閃撃二連',shape:'thrust',reach:4.4,windup:3,recovery:17,pulses:[0,7],power:-1,move:.50,animation:'warden_4'}]},
 warden_blade_5:{name:'深影',stages:[
  {name:'影刺し',shape:'thrust',reach:3.8,backBonus:5,move:.32},
  {name:'影払い',shape:'cleave',reach:3.7,backBonus:5,move:.36},
  {name:'背影の裂断',shape:'cross',reach:3.9,pulses:[0,7],backBonus:8,effect:'weakness',move:.38,animation:'warden_5'}]},
 warden_blade_6:{name:'雲翼',stages:[
  {name:'翼駆け',shape:'thrust',reach:4,hop:.28,move:.42},
  {name:'雲払い',shape:'cleave',reach:4,hop:.23,move:.38},
  {name:'雲翼の輪',shape:'ring',inner:1.25,reach:4.4,hop:.30,power:2,move:.44,animation:'warden_6'}]},
 warden_blade_7:{name:'時環',stages:[
  {name:'刻み斬り',shape:'cleave',reach:3.6,windup:5,move:.27},
  {name:'時返し',shape:'thrust',reach:4,windup:5,move:.27},
  {name:'時環・残響',shape:'ring',inner:1,reach:4.3,pulses:[0,9],windup:5,recovery:21,effect:'slowness',move:.28,animation:'warden_7'}]},
 ult_sword:{name:'終刻の剣',stages:[
  {name:'終刻の踏み',shape:'thrust',reach:4.3,move:.42},
  {name:'終刻の交差',shape:'cross',reach:4,pulses:[0,6],move:.34},
  {name:'終刻の大旋風',shape:'spin',reach:4.2,pulses:[0,8],recovery:21,power:3,move:.38,animation:'ult_sword'}]},
 ult_axe:{name:'終刻の斧',stages:[
  {name:'終刻の叩き',shape:'cleave',reach:3.5,power:3,move:.28},
  {name:'終刻の払い',shape:'cleave',reach:3.8,power:2,move:.30},
  {name:'終刻の断環',shape:'ring',inner:.8,reach:4.5,windup:8,recovery:24,power:7,push:1.2,move:.25,animation:'ult_axe'}]}
};
export function authoredMoveset(g){return moves[g?.id]??catalogFamily(g);}
export function authoredMove(g,stage){
 const set=moves[g?.id];return set&&Number.isInteger(stage)&&stage>=1&&stage<=3?set.stages[stage-1]:catalogFamilyMove(g,stage);
}
export const AUTHORED_WEAPONS=Object.freeze(Object.keys(moves));

import {catalogUltimateFamily} from './combat_ultimate_families.js';
// Ten individual endgame ultimates plus 40 catalog-family patterns.
// Tiers share family choreography, not 105 hand-animated techniques.
// Ranges are horizontal and additionally bounded by the ordinary 3D range.
const ULTIMATES=Object.freeze({
 warden_blade_0:{name:'極式・風裂疾走',shape:'fan',range:9,cone:.72,bonus:'far',effect:'weakness',push:.8},
 warden_blade_1:{name:'極式・幻霧交叉',shape:'cross',range:7.5,cone:.68,angle:.50,effect:'weakness',push:.55},
 warden_blade_2:{name:'極式・砂葬震界',shape:'ring',range:5.5,inner:.25,effect:'slowness',push:1.7},
 warden_blade_3:{name:'極式・氷鏡穿光',shape:'fan',range:10,cone:.94,bonus:'far',effect:'slowness',push:.4},
 warden_blade_4:{name:'極式・雷迅一閃',shape:'fan',range:8.5,cone:.90,bonus:'far',effect:'weakness',push:.5},
 warden_blade_5:{name:'極式・深影暗殺',shape:'fan',range:6.5,cone:.45,bonus:'behind',effect:'weakness',push:.4},
 warden_blade_6:{name:'極式・雲翼天輪',shape:'ring',range:7,inner:1.25,effect:'weakness',push:1.0},
 warden_blade_7:{name:'極式・時環封域',shape:'ring',range:6.5,inner:1,effect:'slowness',push:.5},
 ult_sword:{name:'極式・終刻斬界',shape:'fan',range:8,cone:0,bonus:'far',effect:'weakness',push:1.0},
 ult_axe:{name:'極式・終刻断環',shape:'ring',range:6.5,inner:.8,effect:'slowness',push:1.8}
});
export const AUTHORED_ULTIMATE_IDS=Object.freeze(Object.keys(ULTIMATES));
export function authoredUltimate(g){return ULTIMATES[g?.id]??catalogUltimateFamily(g);}
export function individualUltimate(g){return ULTIMATES[g?.id];}
export function ultimateContains(spec,origin,view,pos){
 const dx=pos.x-origin.x,dy=pos.y-origin.y,dz=pos.z-origin.z,r=Math.hypot(dx,dz),v=Math.hypot(view.x,view.z);
 if(!Number.isFinite(r)||!Number.isFinite(dy)||!Number.isFinite(v)||v<.01||r<(spec.inner??.25)||r>spec.range||Math.hypot(r,dy)>spec.range||Math.abs(dy)>3)return false;
 if(spec.shape==='ring')return true;
 const dot=(dx*view.x+dz*view.z)/(r*v);
 if(spec.shape==='cross'){
  const side=(dz*view.x-dx*view.z)/(r*v),c=Math.cos(spec.angle),s=Math.sin(spec.angle);
  return Math.max(dot*c+side*s,dot*c-side*s)>=spec.cone;
 }
 return dot>=spec.cone;
}
export function authoredUltimateBonus(spec,origin,target){
 try{
  const dx=target.location.x-origin.x,dz=target.location.z-origin.z,r=Math.hypot(dx,dz);
  if(spec.bonus==='far'&&r>=5)return 4;
  if(spec.bonus==='behind'&&r>.01){const v=target.getViewDirection(),n=Math.hypot(v.x,v.z);if(Number.isFinite(n)&&n>.01&&(v.x*(-dx)+v.z*(-dz))/(n*r)<-.3)return 6;}
 }catch{}
 return 0;
}
export function showAuthoredUltimate(p,spec,view,particle){
 // The outline traces the same angular/inner/outer boundaries as targeting.
 const center=p.location,n=Math.hypot(view.x,view.z);if(!Number.isFinite(n)||n<.01)return;
 const direction=Math.atan2(view.z,view.x),half=spec.shape==='ring'?Math.PI:Math.acos(spec.cone)+(spec.shape==='cross'?spec.angle:0);
 for(let i=0;i<40;i++){
  const angle=direction-half+2*half*i/39,r=(i%4===0&&(spec.inner??0)>.25)?spec.inner:spec.range*.92;
  try{p.dimension.spawnParticle(i%5===0?'hakkai:wind_burst':particle,{x:center.x+Math.cos(angle)*r,y:center.y+.8,z:center.z+Math.sin(angle)*r});}catch{}
 }
}

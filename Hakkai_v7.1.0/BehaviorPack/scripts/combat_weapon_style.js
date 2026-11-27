// Input interpretation is intentionally bounded and fail-safe: missing gamepad
// input APIs fall back to the old neutral attack. All timings are server ticks.
export function weaponDirection(p){
 try{
  const v=p.inputInfo?.getMovementVector();
  if(!Number.isFinite(v?.x)||!Number.isFinite(v?.y))return 'neutral';
  if(Math.max(Math.abs(v.x),Math.abs(v.y))<.45)return 'neutral';
  if(Math.abs(v.x)>Math.abs(v.y))return v.x<0?'left':'right';
  return v.y>0?'forward':'back';
 }catch{return 'neutral';}
}
export function styleIdentity(p,g){return `${p.dimension.id}|${p.selectedSlotIndex}|${g.id}`;}
export function resolveSwingStyle(previous,p,g,t){
 const direction=weaponDirection(p),identity=styleIdentity(p,g);
 const delta=previous?.identity===identity?t-previous.tick:Infinity;
 // 6–12 ticks: deliberate second tap, not a duplicate event. Neutral input
 // always preserves the established damage/shape and consumes no resources.
 // A finisher ends the chain: the next swing starts a new sequence instead
 // of allowing an unlimited stream of third-stage hits.
 const linked=direction!=='neutral'&&previous?.stage!==3&&delta>=6&&delta<=12;
 return {identity,tick:t,direction,linked,stage:linked?(previous?.stage??1)+1:1};
}
// Linked traces use technique values, not the native weapon attack component.
// Neutral traces remain unchanged; this only affects the secondary hit after
// the normal direct-hit/ally/wall checks. Stage is bounded against bad input.
export function linkedTechnique(g,style){
 const base={'剣':8,'斧':10,'弓':7,'杖':6,'ハンマー':10,'槍':8,'盾':5,'扇':6}[g.kind]??6;
 const rank=Number.isFinite(g.rank)?Math.max(1,Math.min(3,Math.floor(g.rank))):1;
 const stage=Number.isFinite(style?.stage)?Math.max(2,Math.min(3,Math.floor(style.stage))):2;
 return base+rank*4+stage*2;
}
// Rotate the attack fan toward the movement side. Forward/back retain the
// player's aim. This affects the scripted sweep, never the native melee hit.
export function styleFacing(f,direction){
 const angle=direction==='left'?-.35:direction==='right'?.35:0;
 const c=Math.cos(angle),s=Math.sin(angle);return {x:f.x*c-f.z*s,z:f.z*c+f.x*s};
}
export function styleGeometry(direction,range,cone){
 if(direction==='forward')return {range:range+.35,cone:Math.min(.95,cone+.04)};
 if(direction==='back')return {range:Math.max(1,range-.25),cone:Math.min(.95,cone+.08)};
 if(direction==='left'||direction==='right')return {range,cone:Math.max(.1,cone-.1)};
 return {range,cone};
}

// Guardian-specific expanding attacks. Shapes are relative to the aim captured
// during the body windup; the attack begins at the guardian's actual position.
// The same angular predicate is used for rendering and collision.
const NAMES=[
 ['風鹿の角払い','風裂きの二条','草原の旋風'],
 ['苔獣の胞子輪','霧森の噛みつき','森守の四方根'],
 ['石守の重撃','砂廊の岩脈','石柱の十字'],
 ['氷獣の双氷','鏡湖の氷柱','氷鏡の扇'],
 ['雷獣の雷針','断崖の双雷','雷走りの十字'],
 ['影守の影爪','地下の闇撃','暗庭の影輪'],
 ['雲獣の翼閃','浮島の風扇','雲海の横風'],
 ['時守の刻印','終駅の秒針','時を裂く双閃']
];
const SHAPES=[
 ['wedge','double','circle'],['circle','wedge','cross'],['wedge','line','cross'],
 ['double','diagonal','wide'],['line','double','cross'],['side','wedge','circle'],
 ['double','wide','side'],['cross','line','diagonal']
];
// Effects are modest secondary traits, applied only if damage is accepted.
const EFFECTS=['slow_falling','poison','mining_fatigue','slowness','weakness','blindness','slow_falling','slowness'];
export const GUARDIAN_REALM_ATTACKS=Object.freeze(SHAPES.map((row,realm)=>Object.freeze(row.map((shape,index)=>Object.freeze({
 name:NAMES[realm][index],shape,effect:EFFECTS[realm]
})))));
// The king's temporary shadows are a separate set, not aliases of the
// normal guardians' attack sequences. Their rewards/lifetime stay isolated.
const KING_SHAPES=[
 ['side','wedge','line'],['diagonal','circle','double'],['cross','wide','line'],['wide','double','side'],
 ['double','line','diagonal'],['circle','side','wedge'],['wide','side','cross'],['diagonal','cross','line']
];
const KING_NAMES=[
 ['影鹿の横風','影角の風扇','風影の一閃'],['霧影の斜根','苔影の輪','森影の双条'],
 ['砂影の十字','石影の砂扇','岩影の一線'],['氷影の扇','鏡影の双氷','氷影の横波'],
 ['雷影の双針','崖影の雷線','雷影の四閃'],['庭影の輪','闇影の横爪','影守の闇扇'],
 ['雲影の翼扇','空影の横風','雲影の十字'],['時影の四閃','駅影の十字','刻影の一線']
];
export const KING_GUARDIAN_REALM_ATTACKS=Object.freeze(KING_SHAPES.map((row,realm)=>Object.freeze(row.map((shape,index)=>Object.freeze({
 name:KING_NAMES[realm][index],shape,effect:EFFECTS[realm]
})))));
const COS_WEDGE=Math.cos(Math.PI/4),COS_WIDE=Math.cos(Math.PI*3/8),COS_LANE=Math.cos(Math.PI/12);
export function guardianDirection(dx,dz){const n=Math.hypot(dx,dz);return n>.001?{x:dx/n,z:dz/n}:{x:0,z:1};}
// Includes the source point so close targets can be struck in any stance.
export function guardianShapeContains(shape,forward,side){
 const n=Math.hypot(forward,side);if(n<.001)return true;
 const f=forward/n,s=side/n;
 switch(shape){
  case 'circle':return true;
  case 'wedge':return f>=COS_WEDGE;
  case 'wide':return f>=COS_WIDE;
  case 'line':return f>=COS_LANE;
  case 'double':return f>=0&&(f+Math.abs(s))*Math.SQRT1_2>=COS_LANE;
  case 'cross':return Math.max(Math.abs(f),Math.abs(s))>=COS_LANE;
  case 'diagonal':return (Math.abs(f)+Math.abs(s))*Math.SQRT1_2>=COS_LANE;
  case 'side':return Math.abs(s)>=COS_LANE;
  default:return false;
 }
}
// Returns a distance actually visible along the exact particle ray. Unknown
// terrain, missing APIs, malformed hits, and unloaded chunks fail closed.
export function guardianClearDistance(d,origin,dx,dz,distance,height=.8){
 try{
  if(!d||!Number.isFinite(distance)||distance<0||!Number.isFinite(height))return 0;
  const from={x:origin.x,y:origin.y+height,z:origin.z};
  const steps=Math.max(1,Math.ceil(distance));
  for(let i=0;i<=steps;i++)if(!d.isChunkLoaded({x:from.x+dx*distance*i/steps,y:from.y,z:from.z+dz*distance*i/steps}))return 0;
  if(!d.getBlock(from)?.isAir)return 0;
  if(distance<.001)return distance;
  const hit=d.getBlockFromRay(from,{x:dx,y:0,z:dz},{maxDistance:distance,includeLiquidBlocks:false,includePassableBlocks:false});
  if(!hit)return distance;
  const p=hit.block?.location,f=hit.faceLocation;
  if(!p||!f||![p.x,p.y,p.z,f.x,f.y,f.z].every(Number.isFinite))return 0;
  return Math.max(0,Math.min(distance,Math.hypot(p.x+f.x-from.x,p.y+f.y-from.y,p.z+f.z-from.z)));
 }catch{return 0;}
}

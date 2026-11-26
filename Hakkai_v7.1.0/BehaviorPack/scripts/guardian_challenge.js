// Display only: the actual summon rechecks all conditions after the form is
// closed, including safe ground, so this preview never authorizes a spawn.
export function guardianChallengeHint({site,location,peaceful,remaining=0,nearby,name}){
 if(!site||site.id===0||!location)return '§e現在地：風見台以外の界や離島へ移動してください。';
 const title=`${site.name}｜${name??'守護獣'}`;
 if(peaceful)return `§e${title}：ピースフルでは挑戦できません。`;
 if(remaining>0)return `§e${title}：再挑戦まで約${Math.ceil(remaining/20)}秒。`;
 if(nearby===undefined)return `§e${title}：周囲を確認できません。挑戦時に再確認します。`;
 if(nearby)return `§e${title}：同じ守護獣が近くにいます。`;
 const distance=Math.hypot(location.x-site.x,location.z-site.z);
 if(!Number.isFinite(distance))return `§e${title}：位置を確認できません。`;
 if(distance>25)return `§e${title}：中心から約${Math.ceil(distance)}ブロック。25ブロック以内へ。`;
 return `§a${title}：中心から約${Math.ceil(distance)}ブロック。挑戦時に足場を確認します。`;
}

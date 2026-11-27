// A straight up/down camera can have no usable horizontal view vector.
// Player yaw still supplies a horizontal heading in that case.
export function horizontalView(player){
 const v=player.getViewDirection(),n=Math.hypot(v.x,v.z);
 if(Number.isFinite(n)&&n>=.01)return {x:v.x/n,z:v.z/n};
 const yaw=player.getRotation?.().y;
 if(!Number.isFinite(yaw))return undefined;
 const r=yaw*Math.PI/180;
 return {x:-Math.sin(r),z:Math.cos(r)};
}

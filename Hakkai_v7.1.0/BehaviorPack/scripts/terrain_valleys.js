// Long, continuous dry drainage corridors, expressed entirely in world
// coordinates. Existing generated chunks are deliberately never revisited.
// These are landforms, not simulated rivers or guarantees of safe travel.
const CONFIG={
 0:{depth:7,width:35,top:'minecraft:gravel'},
 1:{depth:6,width:32,top:'minecraft:mud'},
 2:{depth:9,width:33,top:'minecraft:red_sandstone'},
 3:{depth:7,width:34,top:'minecraft:packed_ice'},
 4:{depth:10,width:29,top:'minecraft:gravel'},
 7:{depth:6,width:32,top:'hakkai:clockstone'}
};
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
export function valleyProfile(realm,x,z,noise){
 const c=CONFIG[realm];if(!c||!Number.isFinite(x)||!Number.isFinite(z))return {depth:0};
 const northSouth=realm%2===1,along=northSouth?z:x,across=northSouth?x:z;
 // The seeded offset and bend are independent of chunk order and boundaries.
 const shift=noise(0,0,500,realm,1501)*90;
 const bend=29*noise(along,0,180,realm,1511)+15*noise(along,0,75,realm,1517);
 const a=across-shift-bend,dist=Math.abs(a-Math.round(a/384)*384);
 if(dist>=c.width)return {depth:0};
 const weight=1-smooth(dist/c.width);
 return {depth:c.depth*weight,top:dist<c.width*.34?c.top:undefined};
}

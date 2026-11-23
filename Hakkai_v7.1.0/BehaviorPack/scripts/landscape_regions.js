// Large seeded landscape features. Each feature fades to zero at its edge,
// including across chunk boundaries; this module never places blocks.
// A bounded cache avoids recalculating the same region descriptors per column.
const CELL=240;
const SHAPES=[
 ['hill','ridge','terrace','valley','crater','hill','double_peak','rolling','saddle','ring'],
 ['hill','basin','ridge','terrace','valley','hill','double_peak','rolling','saddle','ring'],
 ['mesa','canyon','mesa','basin','ridge','crater','double_peak','dunes','saddle','ring'],
 ['glacier','basin','peak','ridge','glacier','valley','double_peak','rolling','saddle','ring'],
 ['peak','canyon','ridge','crater','peak','mesa','double_peak','dunes','saddle','ring'],
 ['basin','ridge','hill','crater','valley','terrace','double_peak','rolling','saddle','ring'],
 ['peak','hill','ridge','basin','terrace','peak','double_peak','rolling','saddle','ring'],
 ['terrace','crater','ridge','basin','mesa','hill','double_peak','rolling','saddle','ring']
];
const AMPLITUDE=[26,24,32,31,38,20,20,27];
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=t=>{const v=clamp(t);return v*v*(3-2*v);};

export function createLandscapeField(hash,noise){
 const cache=new Map();
 function feature(realm,gx,gz){
  const key=`${realm}:${gx}:${gz}`;let item=cache.get(key);if(item)return item;
  const h=(salt)=>hash(gx,gz,realm,salt);
  const angle=h(1021)*Math.PI*2,mode=SHAPES[realm][Math.min(SHAPES[realm].length-1,Math.floor(h(1019)*SHAPES[realm].length))];
  item={x:(gx+.18+h(1009)*.64)*CELL,z:(gz+.18+h(1013)*.64)*CELL,
   radius:78+h(1017)*51,angle,cos:Math.cos(angle),sin:Math.sin(angle),
   amplitude:AMPLITUDE[realm]*(.76+h(1027)*.52),mode};
  if(cache.size>=2048)cache.clear();
  cache.set(key,item);return item;
 }
 function sample(realm,x,z){
  if(!Number.isInteger(realm)||realm<0||realm>7)return 0;
  // Bend outlines without moving their reference cell or adding chunk seams.
  const wx=x+noise(x,z,96,realm,1031)*12,wz=z+noise(x,z,96,realm,1033)*12;
  const gx=Math.floor(x/CELL),gz=Math.floor(z/CELL);let total=0;
  for(let ix=gx-1;ix<=gx+1;ix++)for(let iz=gz-1;iz<=gz+1;iz++){
   const f=feature(realm,ix,iz),dx=wx-f.x,dz=wz-f.z;
   // Features with an elongated axis can reach 1.55 radii.
   if(Math.abs(dx)>f.radius*1.6||Math.abs(dz)>f.radius*1.6)continue;
   const u=(dx*f.cos+dz*f.sin)/f.radius,v=(-dx*f.sin+dz*f.cos)/f.radius;
   const elongated=f.mode==='valley'||f.mode==='canyon'||f.mode==='ridge'||f.mode==='dunes';
   const d=Math.hypot(u/(elongated?1.5:1),v/(elongated?.55:1));
   if(d>=1)continue;
   const broad=1-smooth(d),core=1-smooth((d-.42)/.42),amp=f.amplitude;
   switch(f.mode){
    case 'peak':total+=amp*Math.pow(1-d,1.45);break;
    case 'double_peak':{
     const a=Math.hypot(u-.32,v),b=Math.hypot(u+.32,v);
     total+=amp*broad*(.35+.7*Math.max(0,1-Math.min(a,b)));break;
    }
    case 'saddle':total+=amp*broad*(.25+.65*Math.min(1,Math.abs(u)*2));break;
    case 'rolling':total+=amp*broad*(.48+.35*Math.cos(u*7)*Math.cos(v*5));break;
    case 'dunes':total+=amp*broad*(.45+.4*Math.cos(u*9+v*3));break;
    case 'ring':{
     const rim=smooth((d-.26)/.20)*(1-smooth((d-.60)/.35));
     total+=amp*(.8*rim-.35*(1-smooth(d/.35)));break;
    }
    case 'hill':total+=amp*.78*broad;break;
    case 'ridge':total+=amp*.9*broad;break;
    case 'glacier':total+=amp*(.52*broad+.43*core);break;
    case 'mesa':total+=amp*(.25*broad+.75*core);break;
    case 'terrace':{
     // Two rounded shelves instead of per-block quantisation, so slopes can
     // still be climbed around their edges and no discontinuity is introduced.
     const inner=1-smooth((d-.19)/.32);
     total+=amp*(.32*broad+.38*core+.30*inner);break;
    }
    case 'valley':total-=amp*.65*broad;break;
    case 'canyon':total-=amp*.92*broad;break;
    case 'basin':total-=amp*.75*core;break;
    case 'crater':{
     const rim=smooth((d-.45)/.18)*(1-smooth((d-.70)/.24));
     const bowl=1-smooth((d-.08)/.55);
     total+=amp*(.48*rim-.66*bowl);break;
    }
   }
  }
  return clamp(total,-38,46);
 }
 return {sample,feature};
}

import {valleyProfile} from './terrain_valleys.js';
// Bounded water-filled stream sections. Every plan stays 1+ blocks inside the
// chunk and has an uncarved solid rim on all four sides. Sections deliberately
// do not claim to form a continuous river across unloaded/protected chunks.
export function streamPlan(realm,cx,cz,hash,height,noise){
 if(![0,1,2,3,4,7].includes(realm))return undefined;
 const x0=cx*16,z0=cz*16,northSouth=realm%2===1;
 const mids=[];for(let cross=5;cross<=10;cross++){
  const x=x0+(northSouth?cross:8),z=z0+(northSouth?8:cross);
  mids.push({cross,depth:valleyProfile(realm,x,z,noise).depth});
 }
 mids.sort((a,b)=>b.depth-a.depth);if(mids[0].depth<4)return undefined;
 const center=mids[0].cross,cells=[],cellSet=new Set();
 for(let along=2;along<=13;along++){
  const bend=Math.round(Math.sin((along+hash(cx,cz,realm,1711)*3)/4));
  for(let offset=-1;offset<=1;offset++){
   const cross=center+bend+offset,x=x0+(northSouth?cross:along),z=z0+(northSouth?along:cross);
   if(x<x0+2||x>x0+13||z<z0+2||z>z0+13)return undefined;
   cells.push({x,z});cellSet.add(`${x},${z}`);
  }
 }
 const rimSet=new Set();for(const q of cells)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const x=q.x+dx,z=q.z+dz,k=`${x},${z}`;if(!cellSet.has(k))rimSet.add(k);
 }
 const rim=[...rimSet].map(k=>{const [x,z]=k.split(',').map(Number);return {x,z}});
 const levels=rim.map(q=>height(realm,q.x,q.z));if(levels.some(x=>!Number.isFinite(x)))return undefined;
 const level=Math.min(...levels),floor=level-2;if(floor<46||level>143)return undefined;
 for(const q of cells){const y=height(realm,q.x,q.z);if(!Number.isFinite(y)||y<floor||y>level+3)return undefined;}
 return {x:x0+8,z:z0+8,level,floor,cells,rim,frozen:realm===3,stream:true};
}

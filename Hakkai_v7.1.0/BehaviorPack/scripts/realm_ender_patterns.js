// Legacy polygon geometry retained for regression tests; current travelers use moving shots.
// Fixed, visible warning footprints for the eight realm travelers. Coordinates
// are in blocks on the horizontal plane: side, forward from the traveler toward
// its warned target. Polygons include their boundary and all contain the aim.
// This module does not deal damage, create entities, or load chunks.
const polygon=(...points)=>Object.freeze(points.map(p=>Object.freeze(p)));
const ellipse=(side,forward,count=24)=>polygon(...Array.from({length:count},(_,i)=>{
 const a=2*Math.PI*i/count;return [side*Math.cos(a),forward*Math.sin(a)];
}));
export const ENDER_FOOTPRINTS=Object.freeze([
 Object.freeze({name:'横に広い風',vertices:ellipse(3,1.8)}),
 Object.freeze({name:'霧のひし形',vertices:polygon([0,3],[-3,0],[0,-3],[3,0])}),
 Object.freeze({name:'砂の四角',vertices:polygon([-2.5,-2.5],[2.5,-2.5],[2.5,2.5],[-2.5,2.5])}),
 Object.freeze({name:'氷の円',vertices:ellipse(3.5,3.5)}),
 Object.freeze({name:'雷の十字',vertices:polygon([-1,-3],[1,-3],[1,-1],[3,-1],[3,1],[1,1],[1,3],[-1,3],[-1,1],[-3,1],[-3,-1],[-1,-1])}),
 Object.freeze({name:'闇の三角',vertices:polygon([0,3.4],[-3,-2.2],[3,-2.2])}),
 Object.freeze({name:'前後に長い空',vertices:ellipse(1.8,3.5)}),
 Object.freeze({name:'時の八角形',vertices:polygon([-1.2,-3],[1.2,-3],[3,-1.2],[3,1.2],[1.2,3],[-1.2,3],[-3,1.2],[-3,-1.2])})
]);

// Construct the polygon once at warning time. Later attacker/target turns or
// motion cannot rotate it after it has been shown. A degenerate heading falls
// back to north; all candidates still have exactly the same footprint.
export function makeEnderFootprint(realm,aim,from){
 const spec=ENDER_FOOTPRINTS[realm];
 if(!spec||![aim?.x,aim?.y,aim?.z,from?.x,from?.z].every(Number.isFinite))return undefined;
 let dx=aim.x-from.x,dz=aim.z-from.z,len=Math.hypot(dx,dz);
 if(len<.001){dx=0;dz=1;len=1;}
 const fx=dx/len,fz=dz/len,rx=-fz,rz=fx;
 return {aim:{...aim},name:spec.name,vertices:spec.vertices.map(([side,forward])=>({
  x:aim.x+rx*side+fx*forward,z:aim.z+rz*side+fz*forward
 }))};
}

// Samples every corner and subdivides every edge. The same vertices are used
// by the hit test, so a long edge cannot silently exceed its visible border.
export function enderWarningMarkers(footprint){
 const result=[],vs=footprint.vertices;
 for(let i=0;i<vs.length;i++){
  const a=vs[i],b=vs[(i+1)%vs.length];
  const parts=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.6));
  for(let j=0;j<parts;j++){
   const t=j/parts;result.push({x:a.x+(b.x-a.x)*t,y:footprint.aim.y+.15,z:a.z+(b.z-a.z)*t});
  }
 }
 return result;
}

export function insideEnderFootprint(point,footprint){
 if(!footprint||![point?.x,point?.y,point?.z].every(Number.isFinite)||Math.abs(point.y-footprint.aim.y)>3)return false;
 const vs=footprint.vertices;let inside=false;
 for(let i=0,j=vs.length-1;i<vs.length;j=i++){
  const a=vs[j],b=vs[i],vx=b.x-a.x,vz=b.z-a.z,px=point.x-a.x,pz=point.z-a.z;
  // Include points exactly on an edge, without extending the edge past a corner.
  const cross=vx*pz-vz*px,dot=px*vx+pz*vz,len2=vx*vx+vz*vz;
  if(Math.abs(cross)<=1e-8&&dot>=-1e-8&&dot<=len2+1e-8)return true;
  if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }
 return inside;
}

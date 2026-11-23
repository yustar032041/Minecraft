import assert from 'node:assert/strict';
import fs from 'node:fs';
import { caveInterval, solidIntervals, treeCandidates, scenicPlan, realmRelief, skyRoute, pondPlan, moonGroveAt, bambooCandidates } from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_features.js';
const hash=(x,z,r,salt=0)=>{
 let h=(2166136261^Math.imul(x,0x9e3779b1)^Math.imul(z,0x85ebca6b)^Math.imul(r+1,0xc2b2ae35)^salt)>>>0;
 h=Math.imul(h^(h>>>16),0x7feb352d)>>>0;h=Math.imul(h^(h>>>15),0x846ca68b)>>>0;
 return ((h^(h>>>16))>>>0)/4294967295;
};
for(let r=0;r<8;r++){
 let caves=0,entrances=0,scenes=0,trees=0;const offsets=new Set(),sceneShapes=new Set();
 for(let x=-192;x<192;x+=2)for(let z=-192;z<192;z+=2){
  const top=96,bottom=72,gap=caveInterval(r,x,z,top,bottom);
  assert.deepEqual(gap,caveInterval(r,x,z,top,bottom));
  if(gap){
   caves++;if(gap.upper===top)entrances++;
   assert.ok(gap.lower>bottom&&gap.lower<=gap.upper&&gap.upper<=top);
   const intervals=solidIntervals(bottom,top-2,gap);
   for(const [a,b] of intervals)assert.ok(b<gap.lower||a>gap.upper);
  }
 }
 assert.ok(r===6?caves===0:caves>100,`realm ${r} caves=${caves}`);
 if(r!==6)assert.ok(entrances>0,`realm ${r} needs surface entrances`);
 for(let cx=-8;cx<8;cx++)for(let cz=-8;cz<8;cz++){
  const candidates=treeCandidates(r,cx,cz,hash);trees+=candidates.length;
  assert.deepEqual(candidates,treeCandidates(r,cx,cz,hash));
  for(const tree of candidates){
   const dx=tree.x-cx*16,dz=tree.z-cz*16;assert.ok(dx>=3&&dx<=12&&dz>=3&&dz<=12);
   offsets.add(`${dx},${dz}`);assert.ok(tree.height>=4&&tree.height<=7);
  }
  const plan=scenicPlan(r,cx,cz,90,hash);
  if(plan.length){scenes++;sceneShapes.add(`${plan.length},${Math.max(...plan.map(p=>p.y))},${plan.filter(p=>p.cache).length}`);}
  assert.deepEqual(plan,scenicPlan(r,cx,cz,90,hash));
  for(const at of plan){
   assert.ok(at.x>=cx*16&&at.x<cx*16+16&&at.z>=cz*16&&at.z<cz*16+16&&at.y>90&&at.y<=99);
   if(at.type.startsWith('hakkai:'))assert.ok(fs.existsSync(`Hakkai_v7.1.0/BehaviorPack/blocks/${at.type.slice(7)}.json`),at.type);
  }
 }
 assert.ok(sceneShapes.size>=5,`realm ${r} landmark variety`);
 assert.ok(scenes>20&&scenes<100,`realm ${r} scenes=${scenes}`);
 if([0,1,3,6].includes(r)){assert.ok(trees>10);assert.ok(offsets.size>10);}else assert.equal(trees,0);
}
assert.deepEqual(solidIntervals(4,10,{lower:6,upper:8}),[[4,5],[9,10]]);
assert.deepEqual(solidIntervals(4,10,{lower:2,upper:12}),[]);
assert.deepEqual(solidIntervals(4,10,{lower:20,upper:30}),[[4,10]]);
assert.deepEqual(solidIntervals(5,4,undefined),[]);
assert.equal(caveInterval(6,0,0,100,92),undefined);


const smoothNoise=(x,z,scale,r,salt)=>Math.sin((x+salt)/scale)*Math.cos((z-r*4)/scale);
for(let r=0;r<8;r++)for(let x=-300;x<300;x+=3)for(let z=-300;z<300;z+=11){
 const v=realmRelief(r,x,z,smoothNoise);
 assert.ok(Number.isFinite(v));
 assert.ok(Math.abs(v-realmRelief(r,x+1,z,smoothNoise))<3,'landform has a sudden one-block jump');
}

// Passage floors can climb out, but do not turn adjacent passage columns into
// a two-block wall when the overlying surface is level.
for(let r=0;r<8;r++)if(r!==6)for(let x=-320;x<320;x+=2)for(let z=-320;z<320;z+=2){
 const a=caveInterval(r,x,z,96,72,hash),b=caveInterval(r,x+1,z,96,72,hash);
 if(a&&b)assert.ok(Math.abs(a.lower-b.lower)<=1,`steep tunnel floor in realm ${r}`);
}
console.log('Terrain plans: deterministic caves, entrances, smooth relief, contained landmarks, irregular trees, and ore-safe intervals OK');

// Sky path follows global coordinates, with gentle slopes and no chunk reset.
for(let x=-500;x<500;x++){
 const route=skyRoute(x,0,smoothNoise),next=skyRoute(x+1,0,smoothNoise);
 assert.ok(Math.abs(route.height-next.height)<=1);
 assert.ok(route.distance>=0&&Number.isFinite(route.distance));
}
const pondHash=(x,z,r,salt)=>salt===941?0:.5;
for(const r of [0,1,2,3,5]){
 const pond=pondPlan(r,-5,7,pondHash,()=>90);assert.ok(pond);
 assert.ok(pond.cells.length>=25&&pond.rim.length>0);
 const cells=new Set(pond.cells.map(p=>`${p.x},${p.z}`));
 for(const cell of pond.cells){
  assert.ok(Math.floor(cell.x/16)===-5&&Math.floor(cell.z/16)===7);
  for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]])
   assert.ok(cells.has(`${cell.x+dx},${cell.z+dz}`)||pond.rim.some(p=>p.x===cell.x+dx&&p.z===cell.z+dz));
 }
 assert.equal(pond.frozen,r===3);
}
assert.equal(pondPlan(6,0,0,pondHash,()=>90),undefined);
assert.equal(pondPlan(0,0,0,pondHash,(r,x,z)=>x===7&&z===7?90:30),undefined);

// Chambers enlarge passage intersections but added columns keep a roof and
// a solid floor. They remain connected to the original tunnel bands.
function oldPassage(r,x,z){
 const phase=hash(0,0,r,619)*Math.PI*2;
 const xwarp=x+Math.sin(z/75+r*.7+phase)*30,zwarp=z+Math.sin(x/90-r*.8-phase)*27;
 const first=Math.abs(Math.sin(xwarp/61+r*.81+phase)+.30*Math.sin(zwarp/92));
 const second=Math.abs(Math.sin(zwarp/74-r*.68-phase)+.25*Math.sin(xwarp/82));
 const width=r===5?.18:.095;return first<=width||second<=width;
}
for(const r of [0,1,2,3,4,5,7]){
 let extras=0,connected=0;
 for(let x=-300;x<=300;x++)for(let z=-300;z<=300;z++){
  const cave=caveInterval(r,x,z,96,72,hash);
  if(!cave||oldPassage(r,x,z))continue;
  extras++;assert.ok(cave.lower>74&&cave.upper<96,'new room cells have a floor and roof');
  // Samples near the former tunnel edge should join its floors without a
  // step too high to walk; different surface heights still need real testing.
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(oldPassage(r,x+dx,z+dz)){
   const next=caveInterval(r,x+dx,z+dz,96,72,hash);assert.ok(next);
   assert.ok(Math.abs(cave.lower-next.lower)<=1);connected++;
  }
 }
 assert.ok(extras>100&&connected>10,`realm ${r} has connected chambers`);
}
console.log('Cave junction chambers: expanded, connected, roofed and ore-safe plans OK');

// Grove density follows a continuous field; bamboo candidates stay inside
// their chunk and only occur on the same grove mask as the grass substrate.
{
 let groves=0,empty=0,stems=0;
 const isGrove=(x,z)=>moonGroveAt(x,z,smoothNoise);
 for(let cx=-30;cx<30;cx++)for(let cz=-30;cz<30;cz++){
  const plan=bambooCandidates(cx,cz,hash,isGrove);
  assert.deepEqual(plan,bambooCandidates(cx,cz,hash,isGrove));
  if(plan.length)groves++;else empty++;stems+=plan.length;
  const seen=new Set();
  for(const p of plan){
   assert.equal(Math.floor(p.x/16),cx);assert.equal(Math.floor(p.z/16),cz);
   assert.ok(p.height>=4&&p.height<=7&&isGrove(p.x,p.z));
   const id=`${p.x},${p.z}`;assert.ok(!seen.has(id));seen.add(id);
  }
 }
 assert.ok(groves>100&&empty>100&&stems>1000);
}
console.log('Moon grove: continuous field, deterministic chunk-safe bamboo candidates OK');

// Force each new design and rotation: deterministic, bounded, cache-bearing
// buildings with substantial differences, without relying on the random seed.
for(let realm=0;realm<8;realm++)for(let rotation=0;rotation<4;rotation++){
 const shapes=[];
 for(let variant=6;variant<10;variant++){
  const h=(x,z,r,salt)=>salt===701?0:salt===733?(variant+.1)/10:salt===739?(rotation+.1)/4:.5;
  const plan=scenicPlan(realm,-3,4,90,h);
  assert.ok(plan.length>=60,`building ${variant}`);
  assert.equal(plan.filter(p=>p.cache).length,1);
  assert.equal(new Set(plan.map(p=>`${p.x},${p.y},${p.z}`)).size,plan.length);
  assert.ok(plan.every(p=>p.x>=-48&&p.x< -32&&p.z>=64&&p.z<80&&p.y>=91&&p.y<=99));
  shapes.push(JSON.stringify(plan));
 }
 assert.equal(new Set(shapes).size,4);
}

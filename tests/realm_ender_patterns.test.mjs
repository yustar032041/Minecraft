// Warning geometry tests exercise the production functions, not Bedrock rendering.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ENDER_FOOTPRINTS,makeEnderFootprint,enderWarningMarkers,insideEnderFootprint} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender_patterns.js';

const aim={x:10,y:80,z:-3},from={x:10,y:80,z:-8};
function f(realm){return makeEnderFootprint(realm,aim,from);}
test('all eight warned attacks have distinct actual hit footprints',()=>{
 assert.equal(ENDER_FOOTPRINTS.length,8);
 assert.equal(new Set(ENDER_FOOTPRINTS.map(x=>x.name)).size,8);
 const signatures=[];
 for(let realm=0;realm<8;realm++){
  const footprint=f(realm);assert.ok(insideEnderFootprint(aim,footprint));
  let signature='';
  for(let x=-4;x<=4;x+=.25)for(let z=-4;z<=4;z+=.25){
   signature+=insideEnderFootprint({x:aim.x+x,y:aim.y,z:aim.z+z},footprint)?'1':'0';
  }
  signatures.push(signature);
 }
 assert.equal(new Set(signatures).size,8,'different areas, not merely different colors or names');
});

test('every warning edge, including concave corners, is the actual damage boundary',()=>{
 for(let realm=0;realm<8;realm++){
  const footprint=f(realm),vertices=footprint.vertices,markers=enderWarningMarkers(footprint);
  assert.ok(markers.length>=24&&markers.length<=64);
  for(let i=0;i<vertices.length;i++){
   const a=vertices[i],b=vertices[(i+1)%vertices.length];
   const marker=markers.find(p=>Math.hypot(p.x-a.x,p.z-a.z)<1e-9);
   assert.ok(marker,`${realm} corner ${i}`);assert.equal(marker.y,aim.y+.15);
   const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),step=.001;
   const mid={x:mx,y:aim.y,z:mz};assert.ok(insideEnderFootprint(mid,footprint));
   const left=insideEnderFootprint({x:mx-dz/len*step,y:aim.y,z:mz+dx/len*step},footprint);
   const right=insideEnderFootprint({x:mx+dz/len*step,y:aim.y,z:mz-dx/len*step},footprint);
   assert.notEqual(left,right,`${realm} edge ${i} must have one safe side`);
  }
  for(let i=0;i<markers.length;i++){
   const a=markers[i],b=markers[(i+1)%markers.length];
   assert.ok(insideEnderFootprint(a,footprint));
   assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<=.60000001,'outline has no oversized gaps');
  }
  assert.equal(insideEnderFootprint({...aim,y:aim.y+3},footprint),true);
  assert.equal(insideEnderFootprint({...aim,y:aim.y-3},footprint),true);
  assert.equal(insideEnderFootprint({...aim,y:aim.y+3.001},footprint),false);
  assert.equal(insideEnderFootprint({...aim,y:aim.y-3.001},footprint),false);
 }
});

test('footprint snapshots its origin and heading; invalid geometry fails closed',()=>{
 const target={...aim},mob={...from},footprint=makeEnderFootprint(4,target,mob);
 const before=enderWarningMarkers(footprint);target.x+=40;mob.z+=40;
 assert.deepEqual(enderWarningMarkers(footprint),before);
 assert.ok(insideEnderFootprint(aim,footprint));
 assert.equal(makeEnderFootprint(8,aim,from),undefined);
 assert.equal(makeEnderFootprint(0,{...aim,x:NaN},from),undefined);
 assert.equal(insideEnderFootprint({...aim,x:NaN},footprint),false);
 assert.ok(insideEnderFootprint(aim,makeEnderFootprint(0,aim,aim)));
});

import assert from 'node:assert/strict';
import {syncKineticVisual,cleanKineticVisuals} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_visual.js';
const entities=[],props=new Map();let currentType='hakkai:shaft',loaded=true;
const d={isChunkLoaded:()=>loaded,getBlock:()=>({typeId:currentType}),getEntities:()=>entities.filter(e=>!e.removed),spawnEntity:(type,location)=>{
 const e={type,location,removed:false,remove(){this.removed=true;},setRotation(r){this.rotation=r;},getProperty(k){return props.get(k);},setProperty(k,v){props.set(k,v);}};entities.push(e);return e;
}};
const b={typeId:'hakkai:shaft',x:0,y:80,z:0,dimension:d};
syncKineticVisual(b,{status:'running',rpm:32});assert.equal(entities.length,1);assert.equal(props.get('hakkai:rpm'),32);assert.equal(props.get('hakkai:kind'),0);
syncKineticVisual(b,{status:'overload',rpm:0});assert.equal(entities.length,1);assert.equal(props.get('hakkai:rpm'),0);
d.spawnEntity('hakkai:kinetic_visual',{x:.5,y:80.01,z:.5});syncKineticVisual(b,{status:'running',rpm:-8});assert.equal(entities.filter(x=>!x.removed).length,1);
currentType='minecraft:air';loaded=false;cleanKineticVisuals(d);assert.equal(entities[0].removed,false);loaded=true;cleanKineticVisuals(d);assert.equal(entities[0].removed,true);
console.log('Visual overlay create, reuse, synchronization, duplicate and stale cleanup OK (simulated)');

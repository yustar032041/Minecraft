// Extract one metadata-preserving item from a barrel through up to 64 duct
// blocks to the nearest non-full reachable barrel. Pipes have no inventory.
const DIRS=[[1,0,0],[-1,0,0],[0,0,-1],[0,0,1],[0,1,0],[0,-1,0]];
const EXTRACTORS={item_extractor:[1,0,0],item_extractor_west:[-1,0,0],item_extractor_north:[0,0,-1],item_extractor_south:[0,0,1],item_extractor_up:[0,1,0],item_extractor_down:[0,-1,0]};
const at=(p,v,n=1)=>({x:p.x+v[0]*n,y:p.y+v[1]*n,z:p.z+v[2]*n}),key=p=>`${p.x},${p.y},${p.z}`;
function get(d,p){if(!d.isChunkLoaded(p))throw Error('unloaded');const b=d.getBlock(p);if(!b)throw Error('unavailable');return b;}
function fits(c,item){for(let i=0;i<c.size;i++){const v=c.getItem(i);if(!v||v.isStackableWith(item)&&v.amount<v.maxAmount)return true;}return false;}
export function itemDuctStep(block,{factoryTransaction,report=()=>{},maxDucts=64}){
 const v=EXTRACTORS[block.typeId.slice(7)];if(!v)return false;const d=block.dimension,p={x:block.x,y:block.y,z:block.z};
 try{
  const fromPos=at(p,v,-1),source=get(d,fromPos);if(source.typeId!=='minecraft:barrel')return false;
  const input=source.getComponent('minecraft:inventory')?.container;if(!input)return false;
  let item;for(let i=0;i<input.size;i++){const x=input.getItem(i);if(x){item=x;break;}}if(!item)return false;
  const product=item.clone();product.amount=1;
  const queue=[at(p,v)],seen=new Set(),targets=[];let ducts=0;
  for(let i=0;i<queue.length;i++){
   const q=queue[i],k=key(q);if(seen.has(k))continue;seen.add(k);const b=get(d,q);
   if(b.typeId==='minecraft:barrel'&&k!==key(fromPos)){
    const out=b.getComponent('minecraft:inventory')?.container;if(out&&out!==input&&fits(out,product))targets.push(out);continue;
   }
   if(b.typeId!=='hakkai:item_duct')continue;if(++ducts>maxDucts)return false;
   for(const delta of DIRS){const next=at(q,delta);if(key(next)!==key(p)&&!seen.has(key(next)))queue.push(next);}
  }
  if(!targets.length)return false;
  return factoryTransaction({input,output:targets[0],costs:[{id:item.typeId,count:1}],product,report});
 }catch(err){report('搬送経路未読込または無効',err);return false;}
}

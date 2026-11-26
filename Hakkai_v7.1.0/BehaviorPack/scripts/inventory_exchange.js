// Plan multi-input, multi-output transactions in one container before writing.
// Failed inventory/property writes are rolled back on a best-effort basis; a
// native failure, unload, or server crash can still interrupt recovery.
export function inventoryTransaction({container,costs,products,changes=[],commitExternal,rollbackExternal,report=()=>{}}){
 if(!container||!Array.isArray(costs)||!Array.isArray(products)||!Array.isArray(changes)||(!costs.length&&!products.length&&!changes.length&&!commitExternal))return 'error';
 const clone=item=>item?.clone();let original,next;const changed=new Set();
 try{
  original=Array.from({length:container.size},(_,i)=>clone(container.getItem(i)));
  next=original.map(clone);
  const transformed=new Set();
  for(const {slot,transform} of changes){
   if(!Number.isInteger(slot)||slot<0||slot>=next.length||transformed.has(slot)||typeof transform!=='function'||!next[slot])return 'error';
   // The transform may mutate the supplied clone in place. Capture primitive
   // identity/count before calling it instead of comparing two aliases.
   const before=next[slot],typeId=before.typeId,amount=before.amount,after=transform(before);
   if(!after||after.typeId!==typeId||after.amount!==amount)return 'error';
   next[slot]=after;changed.add(slot);transformed.add(slot);
  }
  for(const {id,count} of costs){
   if(typeof id!=='string'||!Number.isInteger(count)||count<1)return 'error';
   let left=count;
   for(let i=0;i<next.length&&left;i++){
    const item=next[i];if(item?.typeId!==id)continue;
    const used=Math.min(left,item.amount);left-=used;changed.add(i);
    if(used===item.amount)next[i]=undefined;else item.amount-=used;
   }
   if(left)return 'missing';
  }
  for(const product of products){
   if(!product||!Number.isInteger(product.amount)||product.amount<1)return 'error';
   let left=product.amount;
   for(let i=0;i<next.length&&left;i++){
    const item=next[i];if(!item||!item.isStackableWith(product))continue;
    const amount=Math.min(left,item.maxAmount-item.amount);if(amount>0){item.amount+=amount;left-=amount;changed.add(i);}
   }
   for(let i=0;i<next.length&&left;i++){
    if(next[i])continue;
    const item=clone(product),amount=Math.min(left,item.maxAmount);if(!(amount>0))return 'error';
    item.amount=amount;next[i]=item;left-=amount;changed.add(i);
   }
   if(left)return 'full';
  }
 }catch(err){report('交換の事前確認',err);return 'error';}
 const writes=[];let externalAttempted=false;
 try{
  for(const i of changed){writes.push(i);container.setItem(i,next[i]);}
  if(commitExternal){externalAttempted=true;commitExternal();}
  return 'ok';
 }catch(err){
  let incomplete=false;
  if(externalAttempted&&rollbackExternal)try{rollbackExternal();}catch(restoreErr){incomplete=true;report('交換記録の復旧失敗',restoreErr);}
  for(const i of writes.reverse())try{container.setItem(i,original[i]);}catch(restoreErr){incomplete=true;report('交換の持ち物復旧失敗',restoreErr);}
  report(incomplete?'交換に失敗（復旧要確認）':'交換に失敗（復旧を試行）',err);return 'error';
 }
}
export function inventoryExchange(container,input,count,product,report=()=>{}){
 return inventoryTransaction({container,costs:[{id:input,count}],products:[product],report});
}

// Transactional trial reward with explicit progress-property snapshots. The
// caller must revalidate gameplay conditions immediately before calling this.
export function progressReward(player,costs,products,updates,{space,ItemStack,ns,report=()=>{}}){
 try{
  const entries=Object.entries(updates),previous=entries.map(([key])=>[key,player.getDynamicProperty(ns+key)]);
  return inventoryTransaction({container:space(player),costs:costs.map(([id,count])=>({id,count})),products:products.map(([id,count])=>new ItemStack(id,count)),report,
   commitExternal:()=>{for(const [key,value] of entries)player.setDynamicProperty(ns+key,value);},
   rollbackExternal:()=>{let failure;for(const [key,value] of previous)try{player.setDynamicProperty(ns+key,value);}catch(err){failure=err;}if(failure)throw failure;}
  });
 }catch(err){report('試練の事前確認',err);return 'error';}
}

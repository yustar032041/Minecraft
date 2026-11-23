// A synchronous, best-effort inventory transaction for machine processing.
// It plans every change before writing, preserves untouched item metadata and
// restores original slots when a write or an external block change fails.
// Rollback itself can fail if a container/chunk becomes invalid; callers must
// report that case rather than claim the transaction is atomic in Bedrock.
export function factoryTransaction({input,output,costs,product,commitExternal,rollbackExternal,report=()=>{}}){
 if(!input||!output||input===output||!product||!Number.isInteger(product.amount)||product.amount<1)return false;
 const clone=item=>item?.clone();
 let originalIn,originalOut,nextIn,nextOut;
 const changedIn=new Set(),changedOut=new Set();
 try{
  originalIn=Array.from({length:input.size},(_,i)=>clone(input.getItem(i)));
  originalOut=Array.from({length:output.size},(_,i)=>clone(output.getItem(i)));
  nextIn=originalIn.map(clone);nextOut=originalOut.map(clone);
  for(const {id,count} of costs){
   if(typeof id!=='string'||!Number.isInteger(count)||count<1)return false;
   let left=count;
   for(let i=0;i<nextIn.length&&left;i++){
    const item=nextIn[i];if(item?.typeId!==id)continue;
    const n=Math.min(left,item.amount);left-=n;changedIn.add(i);
    if(n===item.amount)nextIn[i]=undefined;else item.amount-=n;
   }
   if(left)return false;
  }
  let left=product.amount;
  // Fill matching stacks before empty slots, without dropping item metadata.
  for(let i=0;i<nextOut.length;i++){
   const item=nextOut[i];if(!item||!item.isStackableWith(product))continue;
   const n=Math.min(left,item.maxAmount-item.amount);if(n>0){item.amount+=n;left-=n;changedOut.add(i);}
   if(!left)break;
  }
  for(let i=0;i<nextOut.length&&left;i++){
   if(nextOut[i])continue;
   const item=clone(product),n=Math.min(left,item.maxAmount);item.amount=n;nextOut[i]=item;left-=n;changedOut.add(i);
  }
  if(left)return false;
 }catch(err){report('機械の事前確認',err);return false;}
 // Write changed slots only. Push the index BEFORE each write because a native
 // call may throw after changing the slot.
 const writes=[];let externalAttempted=false;
 try{
  for(const [container,original,next,changed] of [[input,originalIn,nextIn,changedIn],[output,originalOut,nextOut,changedOut]]){
   for(const i of changed){
    writes.push({container,index:i,old:original[i]});container.setItem(i,next[i]);
   }
  }
  if(commitExternal){externalAttempted=true;commitExternal();}
  return true;
 }catch(err){
  let incomplete=false;
  if(externalAttempted&&rollbackExternal)try{rollbackExternal();}catch(rollbackErr){incomplete=true;report('機械のブロック復旧失敗',rollbackErr);}
  for(const write of writes.reverse())try{write.container.setItem(write.index,write.old);}catch(rollbackErr){incomplete=true;report('機械の持ち物復旧失敗',rollbackErr);}
  report(incomplete?'機械の処理失敗（復旧要確認）':'機械の処理失敗（復旧を試行）',err);
  return false;
 }
}

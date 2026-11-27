// A synchronous, best-effort inventory transaction for machine processing.
// Item state is rechecked where comparable, and a failed transaction restores
// only slots that still have our written state. Unknown output/block rollback
// blocks input restoration to avoid duplication, at the cost of possible loss.
// This is not atomic: unstackable data, replacement containers, crashes and
// changes during native calls may still be ambiguous.
// true/false are definite; undefined means the API cannot compare the items.
function sameStack(a,b){
 if(!a||!b)return !a&&!b;
 if(a.typeId!==b.typeId||a.amount!==b.amount)return false;
 try{
  if(typeof a.isStackableWith!=='function')return undefined;
  if(a.isStackableWith(b))return true;
  // Bedrock reports false for non-stackable items even against a clone.
  if(a.maxAmount===1||b.maxAmount===1)return undefined;
  return false;
 }catch{return undefined;}
}
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
 // Recheck only slots involved in this transaction; unrelated slots may be
 // edited freely. Unstackable or uncomparable items preserve normal operation,
 // but cannot receive the same metadata-race guarantee as stackable items.
 const expectedIn=originalIn.slice(),expectedOut=originalOut.slice(),writes=[];
 const verify=()=>{
  for(const i of changedIn)if(sameStack(input.getItem(i),expectedIn[i])===false)throw Error('機械の入力が変化');
  for(const i of changedOut)if(sameStack(output.getItem(i),expectedOut[i])===false)throw Error('機械の出力が変化');
 };
 let externalAttempted=false;
 try{
  verify();
  for(const [container,original,next,changed,expected] of [[input,originalIn,nextIn,changedIn,expectedIn],[output,originalOut,nextOut,changedOut,expectedOut]]){
   for(const i of changed){
    verify();
    // Record the intended state first: a native write may throw after mutation.
    writes.push({container,index:i,old:original[i],next:next[i]});
    container.setItem(i,next[i]);expected[i]=next[i];verify();
   }
  }
  if(commitExternal){externalAttempted=true;commitExternal();verify();}
  return true;
 }catch(err){
  let incomplete=false,outputUncertain=false,externalUncertain=false;
  if(externalAttempted&&rollbackExternal)try{rollbackExternal();}catch(rollbackErr){externalUncertain=true;incomplete=true;report('機械のブロック復旧失敗',rollbackErr);}
  for(const write of writes.reverse())try{
   if(write.container===input&&(outputUncertain||externalUncertain))throw Error('出力またはブロックの状態が不明なため材料は戻しません');
   const now=write.container.getItem(write.index);
   if(sameStack(now,write.old)===true)continue;
   if(sameStack(now,write.next)!==true)throw Error('品物の変更または比較不能');
   write.container.setItem(write.index,write.old);
   if(sameStack(write.container.getItem(write.index),write.old)!==true)throw Error('持ち物の復旧結果を確認できません');
  }catch(rollbackErr){if(write.container===output)outputUncertain=true;incomplete=true;report('機械の持ち物復旧失敗',rollbackErr);}
  report(incomplete?'機械の処理失敗（復旧要確認）':'機械の処理失敗（復旧を試行）',err);
  return false;
 }
}

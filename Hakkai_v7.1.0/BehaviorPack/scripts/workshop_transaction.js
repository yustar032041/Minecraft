// Guarded, synchronous one-recipe village workshop transaction. Unlike the
// general factory path, this refuses items whose exact stack is uncomparable.
const same=(a,b)=>!a||!b?!a&&!b:a.typeId===b.typeId&&a.amount===b.amount&&a.isStackableWith(b);
export function workshopTransaction({input,output,cost,need,product,validate,inputPresent,outputPresent,commit,verifyCommit=()=>{},rollback,report=()=>{}}){
 if(!input||!output||input===output||!Number.isInteger(need)||need<1||!product||!Number.isInteger(product.amount)||product.amount<1)return false;
 const clone=x=>x?.clone();let originalIn,originalOut,nextIn,nextOut;const changedIn=[],changedOut=[];
 try{
  if(!validate())throw Error('工房の状態を確認できません');
  originalIn=Array.from({length:input.size},(_,i)=>clone(input.getItem(i)));originalOut=Array.from({length:output.size},(_,i)=>clone(output.getItem(i)));
  nextIn=originalIn.map(clone);nextOut=originalOut.map(clone);let left=need;
  for(let i=0;i<nextIn.length&&left;i++){
   const v=nextIn[i];if(v?.typeId!==cost||!same(v,originalIn[i]))continue;
   const n=Math.min(left,v.amount);left-=n;changedIn.push(i);if(n===v.amount)nextIn[i]=undefined;else v.amount-=n;
  }
  if(left)return false;
  left=product.amount;
  for(let i=0;i<nextOut.length&&left;i++){
   const v=nextOut[i];if(!v||!v.isStackableWith(product)||!same(v,originalOut[i]))continue;
   const n=Math.min(left,v.maxAmount-v.amount);if(n>0){v.amount+=n;left-=n;changedOut.push(i);}
  }
  for(let i=0;i<nextOut.length&&left;i++){
   if(nextOut[i])continue;const n=Math.min(left,product.maxAmount);if(!(n>0))throw Error('完成品の容量を確認できません');
   const v=clone(product);v.amount=n;nextOut[i]=v;left-=n;changedOut.push(i);
  }
  if(left)return false;
 }catch(err){report('共同工房の事前確認',err);return false;}
 const expectedIn=originalIn.map(clone),expectedOut=originalOut.map(clone),writes=[];let externalAttempted=false;
 const verify=()=>{
  if(!validate()||!inputPresent()||!outputPresent())throw Error('工房の樽・登録・住人が変化');
  for(const i of changedIn)if(!same(input.getItem(i),expectedIn[i]))throw Error('工房の入力が変化');
  for(const i of changedOut)if(!same(output.getItem(i),expectedOut[i]))throw Error('工房の出力が変化');
 };
 try{
  verify();
  for(const [container,indices,expected,next,present] of [[input,changedIn,expectedIn,nextIn,inputPresent],[output,changedOut,expectedOut,nextOut,outputPresent]]){
   for(const i of indices){
    verify();writes.push({container,index:i,old:expected[i],next:next[i],present});container.setItem(i,next[i]);expected[i]=clone(next[i]);verify();
   }
  }
  externalAttempted=true;commit();verify();verifyCommit();return true;
 }catch(err){
  let incomplete=false,outputUncertain=false,recordUncertain=false;
  if(externalAttempted&&rollback)try{rollback();}catch(e){recordUncertain=true;incomplete=true;report('共同工房の記録復旧失敗',e);}
  for(const w of writes.reverse())try{
   if(w.container===input&&(outputUncertain||recordUncertain))throw Error('出力または記録が不明なため材料は戻しません');
   if(!w.present())throw Error('樽を確認できません');
   const now=w.container.getItem(w.index);if(same(now,w.old))continue;
   if(!same(now,w.next))throw Error('別の品へ変化');
   w.container.setItem(w.index,w.old);if(!same(w.container.getItem(w.index),w.old))throw Error('復旧結果を確認できません');
  }catch(e){if(w.container===output)outputUncertain=true;incomplete=true;report('共同工房の持ち物復旧失敗',e);}
  report(incomplete?'共同工房失敗（復旧要確認）':'共同工房失敗（復旧を試行）',err);return false;
 }
}

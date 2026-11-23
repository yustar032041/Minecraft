import {LINE_RECIPES,RECYCLE_DROPS} from './factory_line_recipes.js';
// Deterministic recipe priority; surplus ingredients stay in the input barrel.
export function findLineRecipe(kind,input,total){
 for(const recipe of LINE_RECIPES[kind]??[]){
  if(recipe.costs.every(c=>total(input,c.id)>=c.count))return recipe;
 }
}
export function recycleProduct(id){return RECYCLE_DROPS[id];}
// Filter barrel holds one or more sample items. Samples are not consumed.
// The first input stack routes as a whole item by ID; metadata is cloned.
export function filteredDestination(input,filter,accept,reject){
 if(!input||!filter||!accept||!reject)return undefined;
 try{
 let samples=new Set();
 for(let i=0;i<filter.size;i++){const s=filter.getItem(i);if(s)samples.add(s.typeId);}
 if(!samples.size)return undefined;
 for(let i=0;i<input.size;i++){
  const item=input.getItem(i);if(!item)continue;
  const product=item.clone();product.amount=1;
  return {output:samples.has(item.typeId)?accept:reject,product,id:item.typeId};
 }
 }catch{return undefined;}
}

import {inventoryTransaction} from './inventory_exchange.js';
// Synchronous exchange + shared village ledger + optional player records.
// Conditions and the current ledger are rechecked by the caller after forms.
// Restoring both stores is best effort when a native write fails or unloads.
export function villageTransaction({player,town,next,playerUpdates={},costs,products,space,ItemStack,ns,townRecord,townSave,report=()=>{}}){
 try{
  const before=townRecord(town),updates=Object.entries(playerUpdates),previous=updates.map(([key])=>[key,player.getDynamicProperty(ns+key)]);
  return inventoryTransaction({container:space(player),costs:costs.map(([id,count])=>({id,count})),products:products.map(([id,count])=>new ItemStack(id,count)),report,
   commitExternal:()=>{townSave(town,next);for(const [key,v] of updates)player.setDynamicProperty(ns+key,v);},
   rollbackExternal:()=>{
    let failure;try{townSave(town,before);}catch(err){failure=err;}
    for(const [key,v] of previous)try{player.setDynamicProperty(ns+key,v);}catch(err){failure=err;}
    if(failure)throw failure;
   }
  });
 }catch(err){report('村の取引の事前確認',err);return 'error';}
}

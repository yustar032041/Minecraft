// Shared definitions for the miner and its in-game action guide. Mining
// changes a world block; it is not an inventory crafting recipe or vanilla
// loot-table mining. Preserve the existing output and pass-through rules.
export const MINER_DEPTH=6;
const VANILLA_METALS=Object.freeze(['iron','gold','copper']);
export function miningPassable(id){
 return id==='minecraft:air'||typeof id==='string'&&/^minecraft:(stone|deepslate|tuff|granite|andesite|diorite|netherrack)$/.test(id);
}
export function miningResult(id,ns='hakkai:'){
 if(typeof id!=='string')return undefined;
 const special=/^hakkai:ore_(\d+)$/.exec(id),normal=/^minecraft:(?:deepslate_)?(iron|copper|gold)_ore$/.exec(id);
 return special?`${ns}crystal_${special[1]}`:normal?`minecraft:raw_${normal[1]}`:undefined;
}
// List the pack's defined attributes and the six vanilla blocks, not every
// possible numeric ID accepted by the legacy pattern. The source/result pair
// itself still comes from miningResult, exactly like the runtime.
export function miningGuideTargets(attributeCount){
 if(!Number.isInteger(attributeCount)||attributeCount<0||attributeCount>256)throw Error('invalid mining attribute count');
 const ids=[...Array.from({length:attributeCount},(_,i)=>`hakkai:ore_${i}`),...VANILLA_METALS.flatMap(m=>[`minecraft:${m}_ore`,`minecraft:deepslate_${m}_ore`])];
 return ids.map(block=>({block,out:miningResult(block)}));
}

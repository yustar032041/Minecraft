// Full cubes whose collision shape is known, not a general isSolid substitute.
// Unknown blocks (slabs, stairs, modded geometry) must use collision rays.
const vanilla=new Set(`stone granite polished_granite diorite polished_diorite andesite polished_andesite grass_block dirt coarse_dirt rooted_dirt podzol mycelium moss_block mud packed_mud sand red_sand sandstone red_sandstone gravel clay stone_bricks mossy_stone_bricks cracked_stone_bricks chiseled_stone_bricks cobblestone mossy_cobblestone deepslate cobbled_deepslate polished_deepslate deepslate_bricks deepslate_tiles tuff polished_tuff tuff_bricks dripstone_block calcite basalt smooth_basalt blackstone polished_blackstone polished_blackstone_bricks netherrack snow_block ice packed_ice blue_ice terracotta quartz_block smooth_quartz prismarine prismarine_bricks dark_prismarine sea_lantern brick_block bricks obsidian crying_obsidian bedrock glass concrete white_concrete`.split(' '));
for(const color of 'white orange magenta light_blue yellow lime pink gray light_gray cyan purple blue brown green red black'.split(' '))for(const kind of ['concrete','terracotta','glazed_terracotta','wool','stained_glass'])vanilla.add(`${color}_${kind}`);
for(const wood of 'oak spruce birch jungle acacia dark_oak mangrove cherry pale_oak bamboo crimson warped'.split(' '))for(const kind of ['planks','log','wood','stem','hyphae'])vanilla.add(`${wood}_${kind}`);
for(const ore of 'coal iron copper gold redstone lapis diamond emerald'.split(' '))for(const prefix of ['','deepslate_'])vanilla.add(`${prefix}${ore}_ore`);
const custom=new Set('wind_soil mist_loam sun_silt rime_soil storm_grit deep_loam cloud_loam epoch_soil red_dune_stone windworn_sandstone frost_stone aether_stone mirror_ice thunderstone copper_slate glow_moss moonstone cloudstone clockstone brasswork abyssal_stone warden_arena_stone warden_arena_light'.split(' '));
export function knownFullCube(block){
 if(!block||block.isAir!==false||block.isLiquid!==false||block.isWaterlogged!==false||typeof block.typeId!=='string')return false;
 const id=block.typeId;
 return id.startsWith('minecraft:')?vanilla.has(id.slice(10)):id.startsWith('hakkai:')&&(custom.has(id.slice(7))||/^hakkai:ore_(?:[0-9]|1[0-9])$/.test(id));
}

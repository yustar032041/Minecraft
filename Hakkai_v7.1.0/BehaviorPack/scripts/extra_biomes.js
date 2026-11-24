// Script-level landscape profiles, not engine-native biome definitions.
// Appended to the existing survey catalog to preserve all old record indices.
const DATA=[
 [['風花の草原','minecraft:grass_block','minecraft:azure_bluet'],['白石の風丘','hakkai:wind_soil','minecraft:calcite'],['青露の野','minecraft:moss_block','minecraft:cornflower'],['黄金風の平野','minecraft:coarse_dirt','minecraft:dandelion']],
 [['露苔の樹海','hakkai:mist_loam','minecraft:fern'],['深根の森','minecraft:rooted_dirt','minecraft:birch_log'],['胞子の庭','minecraft:mycelium','minecraft:brown_mushroom'],['翡翠苔の丘','minecraft:moss_block','hakkai:glow_moss']],
 [['白砂の岬','hakkai:sun_silt','minecraft:sandstone'],['朱砂のうねり','minecraft:red_sand','hakkai:red_dune_stone'],['硝砂の平地','minecraft:sandstone','minecraft:calcite'],['乾晶の礫原','minecraft:terracotta','hakkai:sky_crystal']],
 [['薄氷の野','hakkai:rime_soil','minecraft:packed_ice'],['雪冠の丘','minecraft:snow_block','minecraft:spruce_log'],['蒼氷の高地','minecraft:packed_ice','minecraft:blue_ice'],['霜晶の庭','hakkai:frost_stone','hakkai:frost_crystal']],
 [['雷礫の高原','hakkai:storm_grit','minecraft:andesite'],['銅灰の原','minecraft:tuff','hakkai:copper_slate'],['雷晶の野','minecraft:deepslate','hakkai:storm_crystal'],['風岩の稜','minecraft:andesite','minecraft:calcite']],
 [['燐苔の地下野','hakkai:deep_loam','hakkai:glow_moss'],['紫晶の暗庭','minecraft:deepslate','minecraft:amethyst_block'],['菌糸の地下園','minecraft:mycelium','minecraft:red_mushroom'],['黒石の水脈','hakkai:abyssal_stone','hakkai:moonstone']],
 [['白雲の浮き野','hakkai:cloud_loam','minecraft:calcite'],['光晶の浮礁','hakkai:cloudstone','hakkai:sky_crystal'],['天花の草島','minecraft:grass_block','minecraft:oxeye_daisy'],['風白の高島','minecraft:quartz_block','hakkai:aether_stone']],
 [['月影の刻原','hakkai:epoch_soil','hakkai:timeglass'],['錆風の丘','minecraft:oxidized_copper','hakkai:clockstone'],['時晶の野','hakkai:clockstone','hakkai:timeglass'],['真鍮砂の原','minecraft:gravel','hakkai:brasswork']]
];
export const EXTRA_BIOMES=DATA.map((row,r)=>row.map(([name,top,accent],i)=>({
 id:`hakkai:seed_extra_${r}_${i}`,key:`seed_extra_realm_${r}_${i}`,
 name,top,accent,ore:([0,10,12,11,4,6,8,7][r]+i*2)%20,
 species:`wild_${r}_${i%3}`,rareSpecies:`foe_${r}_${8+i}`,rareChance:.23+i*.025,mode:'land',realm:r,terrainStyle:12+i,
 lore:'新しいシード地形帯。地表と景観が界ごとに変わる。'
})));
// Smooth world-coordinate patches; classification is deterministic regardless
// of chunk load order. Heights fade in/out, while surface materials vary.
export function extraBiomeAt(r,x,z,noise){
 if(!EXTRA_BIOMES[r])return undefined;
 const mask=noise(x+311,z-199,260,r,1601);
 if(mask<=.12)return undefined;
 const selector=noise(x-73,z+47,185,r,1607);
 const i=selector<-.28?0:selector<0?1:selector<.28?2:3;
 const t=Math.max(0,Math.min(1,(mask-.12)/.25)),weight=t*t*(3-2*t);
 return {profile:EXTRA_BIOMES[r][i],weight,index:i};
}

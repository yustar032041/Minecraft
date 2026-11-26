// The arena uses the clockstone-textured arena block. Old clockstone and stone are known full
// block for deliberately repaired floors. This is not a general solid-block
// test: unfamiliar, partial, liquid, waterlogged or unavailable floors stop
// movement/rescue until inspected. Bedrock collision still needs testing.
const FLOOR_TYPES=new Set(['hakkai:warden_arena_stone','hakkai:clockstone','minecraft:stone']);
export function validWardenArenaFloor(b){
 return !!b&&FLOOR_TYPES.has(b.typeId)&&b.isAir===false&&b.isLiquid===false&&b.isWaterlogged===false;
}

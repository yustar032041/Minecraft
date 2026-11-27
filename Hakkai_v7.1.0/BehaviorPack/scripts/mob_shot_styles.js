// Two-strand casts are selected per creature, not by palette alone. Each
// strand independently follows its drawn/raycast path and is blocked by the
// first obstacle; one cast can damage the intended target at most once.
export const TWIN_CREATURES=Object.freeze([
 'wild_3_2','wild_5_2',
 'foe_1_0','foe_1_1','foe_3_0','foe_3_1','foe_5_1','foe_6_1',
 'foe_0_5','foe_0_6','foe_1_5','foe_1_6','foe_2_5','foe_2_6',
 'foe_3_4','foe_3_5','foe_3_6','foe_4_5','foe_4_6',
 'foe_5_5','foe_5_6','foe_6_5','foe_6_6','foe_7_5','foe_7_6',
 'foe_1_9','foe_1_11','foe_4_9','foe_5_11','foe_6_11'
]);
const twins=new Set(TWIN_CREATURES);
export const hasTwinShot=profile=>twins.has(profile?.id);
// Different attack materials have different travel cadence. Individual path,
// strand configuration and existing secondary effects remain separate.
export const SHOT_SPEED=Object.freeze({thorns:.95,web:.68,spore:.58,frost:.74,shock:1.05,time:.62,gust:.95,mark:.82,leech:.85,traveler:.75});

// Defensive creature details. Reach is based on each creature's collision
// width plus a player-sized margin, not the old universal 2.25-block punch.
// The short secondary stance is separate from the existing armor/ward buff.
export const GUARD_STYLES=Object.freeze({
 wild_2_2:{reach:.84,trait:'fire_resistance'},
 foe_2_0:{reach:.81,trait:'speed'},
 foe_5_0:{reach:.72,trait:'regeneration'},
 foe_0_3:{reach:.77,trait:'regeneration'},
 foe_1_3:{reach:.77,trait:'regeneration'},
 foe_2_3:{reach:.78,trait:'fire_resistance'},
 foe_3_3:{reach:.77,trait:'speed'},
 foe_4_3:{reach:.78,trait:'speed'},
 foe_5_3:{reach:.78,trait:'regeneration'},
 foe_6_3:{reach:.77,trait:'slow_falling'},
 foe_7_3:{reach:.77,trait:'speed'},
 foe_0_11:{reach:.72,trait:'slow_falling'},
 foe_1_8:{reach:.81,trait:'speed'},
 foe_2_8:{reach:.8,trait:'fire_resistance'},
 foe_3_9:{reach:.74,trait:'slow_falling'},
 foe_4_10:{reach:.83,trait:'strength'},
 foe_6_10:{reach:.86,trait:'slow_falling'},
 foe_7_8:{reach:.79,trait:'speed'}
});

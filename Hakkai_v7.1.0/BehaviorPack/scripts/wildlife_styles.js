// Species-specific peaceful movement and same-realm support. Side choices
// are tried only after the same conservative floor and air checks.
export const WILDLIFE_STYLES=Object.freeze({
 wild_0_0:{escape:0,speed:.55,lift:.14,effect:'jump_boost'},
 wild_1_0:{escape:1,speed:.64,lift:.22,effect:'slow_falling'},
 wild_2_0:{escape:-1,speed:.67,lift:.24,effect:'jump_boost'},
 wild_3_0:{escape:1,speed:.65,lift:.13,effect:'speed'},
 wild_4_0:{escape:-1,speed:.72,lift:.21,effect:'slow_falling'},
 wild_5_0:{escape:0,speed:.60,lift:.29,effect:'jump_boost'},
 wild_6_0:{escape:1,speed:.62,lift:.23,effect:'slow_falling'},
 wild_7_0:{escape:-1,speed:.72,lift:.19,effect:'speed'},
 wild_0_1:{support:'jump_boost'},wild_1_1:{support:'regeneration'},
 wild_2_1:{support:'strength'},wild_3_1:{support:'slow_falling'},
 wild_4_1:{support:'jump_boost'},wild_5_1:{support:'regeneration'},
 wild_6_1:{support:'slow_falling'},wild_7_1:{support:'speed'}
});

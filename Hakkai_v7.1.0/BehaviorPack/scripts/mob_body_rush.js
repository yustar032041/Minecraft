// Creature-specific body movement. Horizontal speed, lift, contact envelope
// and active duration are explicit per ID; native physics still moves bodies.
// No values here are used to bypass terrain checks or create a remote hit.
export const BODY_RUSH=Object.freeze({
 wild_1_2:Object.freeze({speed:.84,lift:.38,reach:.82,ticks:13}), // night fox leap
 wild_4_2:Object.freeze({speed:.72,lift:.04,reach:.92,ticks:12}), // charged stone
 foe_0_0:Object.freeze({speed:.95,lift:.33,reach:.78,ticks:13}), // leaping deer
 foe_2_1:Object.freeze({speed:.86,lift:.12,reach:.78,ticks:11}), // sand hare
 foe_4_0:Object.freeze({speed:.74,lift:.04,reach:.94,ticks:13}), // heavy thunder
 foe_0_2:Object.freeze({speed:.82,lift:.06,reach:.97,ticks:12}), // wind boulder
 foe_1_2:Object.freeze({speed:.69,lift:.03,reach:.92,ticks:14}), // bridge guard
 foe_2_2:Object.freeze({speed:.79,lift:.04,reach:.88,ticks:12}), // sand horn
 foe_3_2:Object.freeze({speed:.76,lift:.03,reach:.91,ticks:13}), // ice brute
 foe_4_2:Object.freeze({speed:.88,lift:.04,reach:.94,ticks:11}), // thunder ram
 foe_5_2:Object.freeze({speed:.67,lift:.03,reach:.93,ticks:14}), // crystal brute
 foe_6_2:Object.freeze({speed:.96,lift:.09,reach:.92,ticks:12}), // wind charge
 foe_7_2:Object.freeze({speed:.81,lift:.04,reach:.93,ticks:12}), // gear brute
 foe_2_11:Object.freeze({speed:.73,lift:.05,reach:.91,ticks:13}) // rock breaker
});
export function bodyRushImpulse(profile,from,to){
 const design=BODY_RUSH[profile?.id];if(!design||!from||!to)return undefined;
 const dx=to.x-from.x,dz=to.z-from.z,n=Math.hypot(dx,dz);
 if(!Number.isFinite(n)||n<.01)return undefined;
 return {x:dx/n*design.speed,y:design.lift,z:dz/n*design.speed};
}

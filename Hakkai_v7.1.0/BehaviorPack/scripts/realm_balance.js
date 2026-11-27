// Progression of scripted attacks. The travel map unlocks realms by visiting
// the preceding one; guardian defeats are not required to visit later realms.
// Keep special shadow guardians and the king outside this ordinary-mob curve.
export const REALM_MOB_MULTIPLIERS=Object.freeze([1,1.1,1.2,1.3,1.4,1.5,1.6,1.7]);
// The last three waves still grow, but with a gentler slope: their native
// contact hits and longer fights already add pressure on top of wave damage.
export const REALM_GUARDIAN_MULTIPLIERS=Object.freeze([1.2,1.32,1.44,1.56,1.68,1.74,1.84,1.94]);
// Some late-realm variants previously had tiny base attacks. A modest floor
// prevents the realm curve from reversing, while stronger attacks retain their
// own damage. Does not affect native hits, non-hostiles, guardians or bosses.
export const REALM_MOB_MIN_DAMAGE=Object.freeze([0,0,0,0,0,7,9,11]);
export function scaledMobDamage(amount,realm){
 if(!Number.isFinite(amount)||amount<=0||!Number.isInteger(realm)||realm<0||realm>=8)return amount;
 return Math.max(REALM_MOB_MIN_DAMAGE[realm],scaledRealmDamage(amount,realm));
}
export function scaledRealmDamage(amount,realm,multipliers=REALM_MOB_MULTIPLIERS){
 if(!Number.isFinite(amount)||amount<=0||!Number.isInteger(realm)||realm<0||realm>=8)return amount;
 return Math.round(amount*multipliers[realm]*100)/100;
}

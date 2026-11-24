export class BlockVolume {
 constructor(from,to){this.from=from;this.to=to;}
}
export class BlockPermutation {
 static resolve(type,states){return {type,states};}
}
export const EntityDamageCause={entityAttack:'entityAttack',projectile:'projectile',magic:'magic',fall:'fall',entityExplosion:'entityExplosion',sonicBoom:'sonicBoom',ramAttack:'ramAttack',maceSmash:'maceSmash'};
export const GameMode={Creative:'creative',Spectator:'spectator',Survival:'survival',Adventure:'adventure'};
export const EquipmentSlot={Mainhand:'Mainhand',Offhand:'Offhand',Head:'Head',Chest:'Chest',Legs:'Legs',Feet:'Feet'};
export const Difficulty={Peaceful:'peaceful',Normal:'normal'};
export class ItemStack {constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;}}

export const InputPermissionCategory={LateralMovement:4,MoveForward:9};
// Tests may configure this when exercising villager job integration.
export const world={getDynamicProperty:()=>undefined};

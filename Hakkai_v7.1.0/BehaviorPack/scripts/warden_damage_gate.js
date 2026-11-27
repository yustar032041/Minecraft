// Shared between late-form traditional, special-mode and independent blades.
// Only accepted hits start a window; each boss/player pair has its own budget.
export function createWardenDamageGate(){
 const bosses=new Map();
 return {
  allows(boss,player,phase,t){return phase<3||t>=(bosses.get(boss.id)?.get(player.id)??0);},
  record(boss,player,phase,t){if(phase<3)return;let m=bosses.get(boss.id);if(!m){m=new Map();bosses.set(boss.id,m);}m.set(player.id,t+8);},
  clear(id){bosses.delete(id);}
 };
}

import {WARDEN_DIMENSION} from './warden_arena.js';

// Match exactly the structure built by ensureArena: the shell and four lights.
// Player-built blocks in the interior and ordinary clockstone elsewhere remain
// breakable. Protect locations regardless of type or combat phase.
export function isWardenStructure(dimension,location){
 if(dimension?.id!==WARDEN_DIMENSION||!location||
    ![location.x,location.y,location.z].every(Number.isInteger))return false;
 const {x,y,z}=location;
 if(Math.abs(x)>16||Math.abs(z)>16)return false;
 if(y===79||y===96)return true;
 if(y<80||y>95)return false;
 if(Math.abs(x)===16||Math.abs(z)===16)return true;
 return y===95&&Math.abs(x)===12&&Math.abs(z)===12;
}
export function protectWardenBreak(event){
 if(isWardenStructure(event.block?.dimension,event.block?.location))event.cancel=true;
}
export function protectWardenExplosion(event){
 if(event.dimension?.id!==WARDEN_DIMENSION)return;
 try{
  const blocks=event.getImpactedBlocks();
  const kept=blocks.filter(block=>!isWardenStructure(event.dimension,block.location));
  if(kept.length!==blocks.length)event.setImpactedBlocks(kept);
 }catch{
  // If the impacted list cannot be safely inspected or changed, prevent the
  // explosion instead of letting it silently destroy the arena structure.
  event.cancel=true;
 }
}

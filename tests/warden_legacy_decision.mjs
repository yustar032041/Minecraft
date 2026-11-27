// Deterministic test-only selector: exercise every legacy attack engine and
// warning/parry invariant without asserting the live AI's selection order.
export function legacyWardenDecision(){
 let index=0,group='';
 return {
  target:(_brain,_situation,targets,slot)=>targets[slot%targets.length],
  attack:(_brain,patterns)=>{const key=patterns[0]?.attack;if(key!==group){group=key;index=0;}return patterns[index++%patterns.length];}
 };
}

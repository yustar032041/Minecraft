// Each creature's material can be refined into two shards belonging to its
// home realm. The same rule is used by the guide and generated recipes.
export function recycledAttribute(creature, home) {
 const match=/^(?:wild|foe)_(\d+)_(\d+)$/.exec(creature?.id ?? '');
 if(!match || Number(match[1])!==creature.realm) return undefined;
 const attributes=home[creature.realm];
 if(!Array.isArray(attributes)||attributes.length===0)return undefined;
 return attributes[Number(match[2])%attributes.length];
}

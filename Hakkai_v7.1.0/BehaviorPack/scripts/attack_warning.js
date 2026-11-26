// These existing single-target talents manifest instantly within the marked
// area. They have no projectile or block-ray test, so walls do not stop them.
const INSTANT_MARKED=new Set(['thorns','web','spore','frost','shock','time','gust','mark']);
export function isInstantMarkedTalent(talent){return INSTANT_MARKED.has(talent);}
// The burst group is multi-target but also manifests instantly at the mark.
export function isInstantAreaTalent(talent){return talent==='burst'||isInstantMarkedTalent(talent);}

// 判定は予告時点で固定した円を使う。別の高さに逃げた場合も命中しない。
export function insideWarning(location, aim, radius, vertical = 3) {
 return Math.hypot(location.x - aim.x, location.z - aim.z) <= radius &&
        Math.abs(location.y - aim.y) <= vertical;
}

// Dimension.getPlayers uses 3-D distance. Enclose the whole horizontal
// circle and vertical interval before filtering with insideWarning.
export function warningSearchRadius(radius, vertical = 3) {
 return Math.hypot(radius, vertical) + 0.001;
}

// Large king circles need more than sixteen widely spaced points. Keep a
// hard ceiling for particle cost; these remain dotted, not solid boundaries.
// Smaller enemy/guardian warnings keep their existing fixed marker count.
export function kingWarningMarkerCount(radius) {
 if(!Number.isFinite(radius)||radius<=0)return 16;
 return Math.min(48,Math.max(16,Math.ceil(Math.PI*radius/4)*4));
}

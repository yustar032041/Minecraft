// Ordinary single-target ranged talents use a fixed-direction moving shot.
const MOVING_PROJECTILES=new Set(['thorns','web','spore','frost','shock','time','gust','mark','leech']);
export function isMovingProjectileTalent(talent){return MOVING_PROJECTILES.has(talent);}

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

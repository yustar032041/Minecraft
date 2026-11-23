// 判定は予告時点で固定した円を使う。別の高さに逃げた場合も命中しない。
export function insideWarning(location, aim, radius, vertical = 3) {
 return Math.hypot(location.x - aim.x, location.z - aim.z) <= radius &&
        Math.abs(location.y - aim.y) <= vertical;
}

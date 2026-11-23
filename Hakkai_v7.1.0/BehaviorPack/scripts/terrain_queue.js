// プレイヤー全員を基準にする。別の界や遠方のプレイヤーは、
// 他プレイヤーの生成待ちを消したり優先度を下げたりしない。
export function nearestQueuedDistance(task, players, radius) {
 let best = Infinity;
 for (const player of players) {
  if (player.realm !== task.realm) continue;
  const dx = task.cx - player.cx, dz = task.cz - player.cz;
  if (Math.max(Math.abs(dx), Math.abs(dz)) > radius) continue;
  best = Math.min(best, dx * dx + dz * dz);
 }
 return best;
}

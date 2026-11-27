// 未遭遇種を先に選ぶ。実際の出現成功時だけ呼び出し元で記録する。
// スポーン位置・上限・ゲームルールの判定は呼び出し元で行う。
export function pickRealmWildlife(entries, realm, isObserved, peaceful, random = Math.random) {
 const pool = entries.filter(m => m.dim === realm && (!peaceful || m.temper !== 'hostile'));
 if (!pool.length) return undefined;
 const unseen = pool.filter(m => !isObserved(m));
 const choices = unseen.length ? unseen : pool;
 return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

// The time preference chooses a temperament first, then unseen species in
// that group. Both groups remain possible at any hour; biome favourites are
// weighted, never exclusive. Selection state is committed only on spawn.
export function pickTimedRealmWildlife(entries, realm, isObserved, peaceful, night, favourites = [], random = Math.random) {
 const pool = entries.filter(m => m.dim === realm && (!peaceful || m.temper !== 'hostile'));
 if (!pool.length) return undefined;
 const hostile = pool.filter(m => m.temper === 'hostile');
 const other = pool.filter(m => m.temper !== 'hostile');
 const preferHostile = random() < (night ? .72 : .28);
 const group = (preferHostile ? hostile : other).length ? (preferHostile ? hostile : other) : (preferHostile ? other : hostile);
 const unseen = group.filter(m => !isObserved(m));
 const choices = unseen.length ? unseen : group;
 const weighted = choices.flatMap(m => favourites.includes(m.id) ? [m, m] : [m]);
 return weighted[Math.min(weighted.length - 1, Math.floor(random() * weighted.length))];
}

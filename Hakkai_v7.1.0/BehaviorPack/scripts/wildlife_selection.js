// 未遭遇種を先に選ぶ。実際の出現成功時だけ呼び出し元で記録する。
// スポーン位置・上限・ゲームルールの判定は呼び出し元で行う。
export function pickRealmWildlife(entries, realm, isObserved, peaceful, random = Math.random) {
 const pool = entries.filter(m => m.dim === realm && (!peaceful || m.temper !== 'hostile'));
 if (!pool.length) return undefined;
 const unseen = pool.filter(m => !isObserved(m));
 const choices = unseen.length ? unseen : pool;
 return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

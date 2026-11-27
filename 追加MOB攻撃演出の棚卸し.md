# 追加MOBの攻撃経路・演出の静的棚卸し

生成：`node --experimental-default-type=module tools/audit_mob_combat.mjs`（`--check`で再照合）。JSON、プロフィール、既知のスクリプト分類とクライアントの**別名の存在**を列挙したものです。攻撃可能・発生条件・警告と実ダメージの一致、アニメーションが動くこと、ビジュアル品質や端末・マルチ負荷を証明しません。別名なしも演出なしとは限らず、属性の動的参照・別アニメ・パーティクルや内部挙動は個別確認が必要です。バニラMOB・乗り物2種・描画専用1種・管理者の非生物8剣は除外。8剣は専用検査を参照。

対象 151 種。定義内に近接AI 130 種、遠隔AI 1 種（条件付きコンポーネントを含み、両方あり得る）。120種プロフィールの内訳：敵対 104、中立 8、受動 8。

- 敵対104種の固有技に構えと系統別の粒子を追加。敵96種の補助関節または胴・頭の仮動作と八界王3系統の専用動作も追加し、見回り2種の近接命中に粒子を追加。近接、波動、移動弾はそれぞれ別の命中検査を使う。実機の見え方は未確認。
- 八界王の大きな予告輪は半径ごと16〜48点にし、途中で生成に失敗した攻撃は中止。点線の見え方や粒子負荷は実機未確認。
- 敵対104プロフィールは足元予告を使わない。32種は近接／防御、7種は個体別の移動する波、残り65種は遮蔽物で止まる移動弾。通常／特殊守護獣は界ごとの扇・双閃・直線・十字などの移動波。界渡り8種は界別ワープと軌道の異なる移動弾。FUSHIチーフは足場を検査した体当たり、月光の弾、自身中心の霧を使用。八界王本体の既存技には旧予告が残る。通常近接は被接触位置に小粒子、八界王の通常近接はエンジン近接を外し、予告輪と2秒の構えを持つスクリプト攻撃に変更。ほかの接触後演出は事前予告ではなく、すべて実機未確認。
- 120種のうち敵対種の固有技はスクリプトの構え・発動。敵対104種の攻撃・構えは突進・防御・放出の3系統と体の形4系統を組み合わせた動作を試作（補助関節を含む動作）、近接は接触後の演出。中立／受動の支援・逃走は攻撃を追加しない。エンジン近接の**事前予告**にはなっていない。
- 見回りの見張り・魔法使いは近接接触後、魔法使いは構えの後に遮断可能な移動弾を使う。弓兵は遠隔AIの`swing`と`variable.attack_time`で発射に連動する動作と、発射元が確認できるバニラ矢の衝突後粒子を試作。いずれも描画・同期・予告は実機未検証。
- 通常守護獣8種と八界王の特別守護獣8種の3技には防御・突進・放出の構えと、界ごと・通常／特殊ごとに異なる形で広がる移動波を使用。界渡りには界別の発動粒子も試作。空の守護獣は翼、残りは4本脚を動かす。界渡り8種の歩行・構え・反撃も各個体の骨に移植。FUSHIチーフ、八界王、時空の管理者の技は別実装。各種・各技・表示・命中範囲・妨害や遮蔽物・複数人などの条件は模擬検査済みで、実機では未確認。
- 参照：Microsoft公式 [遠隔攻撃AIの swing](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitygoals/minecraftbehavior_ranged_attack?view=minecraft-bedrock-stable) は射撃時の振り動作、[Molang解説](https://learn.microsoft.com/en-us/minecraft/creator/documents/molang/practical-molang?view=minecraft-bedrock-stable) は variable.attack_time を使った攻撃アニメを説明。バージョン・実描画は実機確認が必要。
- MOB高画質化の対象判断や画像そのものを個別確認した証明ではない。承認済みのテクスチャは維持し、FUSHI関連も作業対象。管理者の攻撃動作は別の検査も参照。

| ID | 名称 | エンジンAIの定義 | 既知のスクリプト経路 | クライアント別名（存在のみ） |
|---|---|---|---|---|
| hakkai:eclipse_colossus | 終焉の八界王 | 定義なし | 八界王の固有技（mob_system） | creature_windup、creature_strike、eclipse_cleave_windup、eclipse_cleave_strike、eclipse_cast_windup、eclipse_cast_strike、eclipse_wave_windup、eclipse_wave_strike、eclipse_cleave_contact |
| hakkai:ender_0 | 風渡りのエンダーマン | 定義なし | 界渡りの固有技（realm_ender） | creature_windup、creature_strike |
| hakkai:ender_1 | 霧渡りのエンダーマン | 定義なし | 界渡りの固有技（realm_ender） | creature_windup、creature_strike |
| hakkai:ender_2 | 砂渡りのエンダーマン | 定義なし | 界渡りの固有技（realm_ender） | creature_windup、creature_strike |
| hakkai:ender_3 | 氷渡りのエンダーマン | 定義なし | 界渡りの固有技（realm_ender） | creature_windup、creature_strike |
| hakkai:ender_4 | 雷渡りのエンダーマン | 定義なし | 界渡りの固有技（realm_ender） | creature_windup、creature_strike |
| hakkai:ender_5 | 闇渡りのエンダーマン | 定義なし | 界渡りの固有技（realm_ender） | creature_windup、creature_strike |
| hakkai:ender_6 | 空渡りのエンダーマン | 定義なし | 界渡りの固有技（realm_ender） | creature_windup、creature_strike |
| hakkai:ender_7 | 時渡りのエンダーマン | 定義なし | 界渡りの固有技（realm_ender） | creature_windup、creature_strike |
| hakkai:foe_0_0 | 風切りの鹿鬼 | 近接 | 敵対：固有技 leap・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_1 | 棘冠の茨兵 | 近接 | 敵対：固有技 thorns・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_10 | 旋刃の茨獣 | 近接 | 敵対：固有技 burst・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_11 | 風花の薄翼 | 近接 | 敵対：固有技 ward・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_2 | 渡風の岩駆け | 近接 | 敵対：固有技 charge・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_3 | 棘冠の土喰い | 近接 | 敵対：固有技 armor・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_4 | 烏霧の影走り | 近接 | 敵対：固有技 leech・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_5 | 花粉を撒く森番 | 近接 | 敵対：固有技 spore・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_6 | 露霜の巣縛り | 近接 | 敵対：固有技 frost・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_7 | 刻を噛む野兎 | 近接 | 敵対：固有技 time・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_8 | 風喰みの角将 | 近接 | 敵対：固有技 leech・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_0_9 | 星明かりの道標鳥 | 近接 | 敵対：固有技 mark・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_0 | 霧渡りの影狐 | 近接 | 敵対：固有技 web・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_1 | 胞子の森守 | 近接 | 敵対：固有技 spore・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_10 | 迷い森の影狩り | 近接 | 敵対：固有技 leech・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_11 | 青苔の縫い蜘蛛 | 近接 | 敵対：固有技 web・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_2 | 夜霧の橋守 | 近接 | 敵対：固有技 charge・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_3 | 苔鎧の殻王 | 近接 | 敵対：固有技 armor・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_4 | 藍影の尾狩り | 近接 | 敵対：固有技 leech・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_5 | 燐胞子の羽守 | 近接 | 敵対：固有技 spore・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_6 | 白霧の糸主 | 近接 | 敵対：固有技 web・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_7 | 忘時の木兎 | 近接 | 敵対：固有技 time・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_8 | 霧喰らいの仮面兵 | 近接 | 敵対：固有技 ward・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_1_9 | 沼灯の胞子鳥 | 近接 | 敵対：固有技 spore・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_0 | 砂潜りの甲虫 | 近接 | 敵対：固有技 armor・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_1 | 赤砂の追撃兎 | 近接 | 敵対：固有技 charge・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_10 | 焦熱の砂羽 | 近接 | 敵対：固有技 burst・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_11 | 砕岩の砂鬼 | 近接 | 敵対：固有技 charge・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_2 | 砂礫の突角兵 | 近接 | 敵対：固有技 charge・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_3 | 赤層の砕甲虫 | 近接 | 敵対：固有技 armor・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_4 | 陽炎の足抜け | 近接 | 敵対：固有技 mark・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_5 | 灼風の胞子鳥 | 近接 | 敵対：固有技 spore・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_6 | 赤砂の地縛蜘蛛 | 近接 | 敵対：固有技 web・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_7 | 砂時計の穴兎 | 近接 | 敵対：固有技 time・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_8 | 砂喰いの層甲王 | 近接 | 敵対：固有技 ward・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_2_9 | 蜃気楼の追跡者 | 近接 | 敵対：固有技 mark・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_0 | 氷晶の大梟 | 近接 | 敵対：固有技 frost・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_1 | 鏡湖の氷羽鳥 | 近接 | 敵対：固有技 frost・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_10 | 雪崩れの爪獣 | 近接 | 敵対：固有技 burst・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_11 | 結晶核の甲虫 | 近接 | 敵対：固有技 leech・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_2 | 氷牢の突撃鬼 | 近接 | 敵対：固有技 charge・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_3 | 薄氷を砕く甲虫 | 近接 | 敵対：固有技 armor・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_4 | 鏡面を渡る狐影 | 近接 | 敵対：固有技 frost・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_5 | 霜柱を運ぶ羽根 | 近接 | 敵対：固有技 frost・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_6 | 凍湖の巣縛り | 近接 | 敵対：固有技 frost・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_7 | 雪間を止める兎 | 近接 | 敵対：固有技 time・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_8 | 氷牢の白角 | 近接 | 敵対：固有技 mark・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_3_9 | 鏡面の霜鳥 | 近接 | 敵対：固有技 ward・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_0 | 雷刻の岩巨兵 | 近接 | 敵対：固有技 charge・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_1 | 銅羽の放電鳥 | 近接 | 敵対：固有技 shock・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_10 | 磁鉄の城壁兵 | 近接 | 敵対：固有技 ward・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_11 | 雷針の滑空獣 | 近接 | 敵対：固有技 shock・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_2 | 雷鳴の岩砕き | 近接 | 敵対：固有技 charge・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_3 | 磁鉄をまとう甲兵 | 近接 | 敵対：固有技 armor・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_4 | 稲妻の影狩り | 近接 | 敵対：固有技 shock・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_5 | 銅羽の電導鳥 | 近接 | 敵対：固有技 shock・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_6 | 雷糸を張る蜘蛛 | 近接 | 敵対：固有技 shock・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_7 | 時雨の走り兎 | 近接 | 敵対：固有技 time・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_8 | 雷鳴の鋼角 | 近接 | 敵対：固有技 burst・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_4_9 | 稲妻の放電羽 | 近接 | 敵対：固有技 shock・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_0 | 紫晶の坑道虫 | 近接 | 敵対：固有技 armor・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_1 | 闇庭の胞子蜘蛛 | 近接 | 敵対：固有技 spore・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_10 | 深穴の響き鬼 | 近接 | 敵対：固有技 burst・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_11 | 鉱脈の胞子羽 | 近接 | 敵対：固有技 spore・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_2 | 晶脈を割る岩鬼 | 近接 | 敵対：固有技 charge・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_3 | 紫晶の殻王 | 近接 | 敵対：固有技 armor・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_4 | 暗晶の尾狩り | 近接 | 敵対：固有技 leech・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_5 | 燐光胞子の羽守 | 近接 | 敵対：固有技 spore・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_6 | 底無し穴の蜘蛛 | 近接 | 敵対：固有技 web・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_7 | 晶時を止める兎 | 近接 | 敵対：固有技 time・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_8 | 晶喰いの坑道王 | 近接 | 敵対：固有技 leech・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_5_9 | 紫光の眼蜘蛛 | 近接 | 敵対：固有技 mark・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_0 | 雲裂きの滑空獣 | 近接 | 敵対：固有技 gust・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_1 | 浮島の風輪鳥 | 近接 | 敵対：固有技 gust・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_10 | 浮石の守り兵 | 近接 | 敵対：固有技 ward・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_11 | 竜巻の小型獣 | 近接 | 敵対：固有技 gust・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_2 | 雲棚を越す突風鬼 | 近接 | 敵対：固有技 charge・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_3 | 浮石の殻守 | 近接 | 敵対：固有技 armor・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_4 | 風輪の影狩り | 近接 | 敵対：固有技 gust・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_5 | 雲間の胞子鳥 | 近接 | 敵対：固有技 spore・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_6 | 空糸の巣主 | 近接 | 敵対：固有技 web・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_7 | 逆風を走る兎 | 近接 | 敵対：固有技 time・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_8 | 雲裂きの翼侯 | 近接 | 敵対：固有技 burst・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_6_9 | 風輪の狩り手 | 近接 | 敵対：固有技 mark・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_0 | 刻秒の鋼犬 | 近接 | 敵対：固有技 time・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_1 | 終着駅の無音兵 | 近接 | 敵対：固有技 time・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_10 | 秒針の鋼獣 | 近接 | 敵対：固有技 leech・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_11 | 逆行の霧羽鳥 | 近接 | 敵対：固有技 burst・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_2 | 歯車を砕く鋼鬼 | 近接 | 敵対：固有技 charge・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_3 | 秒針を背負う殻兵 | 近接 | 敵対：固有技 armor・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_4 | 逆時の影狐 | 近接 | 敵対：固有技 time・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_5 | 終駅の胞子羽 | 近接 | 敵対：固有技 spore・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_6 | 時縫いの糸蜘蛛 | 近接 | 敵対：固有技 time・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_7 | 停止線の野兎 | 近接 | 敵対：固有技 time・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_8 | 停時の無貌兵 | 近接 | 敵対：固有技 ward・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:foe_7_9 | 砂時計の狩り兎 | 近接 | 敵対：固有技 mark・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:fushi | FUSHI | 定義なし | 個別攻撃コードを未確認 | 該当別名なし |
| hakkai:fushi_chief | FUSHIのチーフ | 定義なし | チーフの固有技・突進／月光の弾（fushi_system／fushi_chief_charge／fushi_moon_projectile） | creature_windup、creature_strike、chief_impact_windup、chief_impact_strike、chief_moon_windup、chief_moon_strike、chief_mist_windup、chief_mist_strike |
| hakkai:guardian_0 | 草原の風鹿 | 近接 | 守護獣の固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:guardian_1 | 霧森の苔獣 | 近接 | 守護獣の固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:guardian_2 | 砂廊の石守 | 近接 | 守護獣の固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:guardian_3 | 鏡湖の氷獣 | 近接 | 守護獣の固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:guardian_4 | 断崖の雷獣 | 近接 | 守護獣の固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:guardian_5 | 地下庭園の影守 | 近接 | 守護獣の固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:guardian_6 | 浮島の雲獣 | 近接 | 守護獣の固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:guardian_7 | 終着駅の時守 | 近接 | 守護獣の固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:king_guardian_0 | 八界王の影・草原の風鹿 | 近接 | 八界王の特別守護獣・固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:king_guardian_1 | 八界王の影・霧森の苔獣 | 近接 | 八界王の特別守護獣・固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:king_guardian_2 | 八界王の影・砂廊の石守 | 近接 | 八界王の特別守護獣・固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:king_guardian_3 | 八界王の影・鏡湖の氷獣 | 近接 | 八界王の特別守護獣・固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:king_guardian_4 | 八界王の影・断崖の雷獣 | 近接 | 八界王の特別守護獣・固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:king_guardian_5 | 八界王の影・地下庭園の影守 | 近接 | 八界王の特別守護獣・固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:king_guardian_6 | 八界王の影・浮島の雲獣 | 近接 | 八界王の特別守護獣・固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:king_guardian_7 | 八界王の影・終着駅の時守 | 近接 | 八界王の特別守護獣・固有技（guardian_boss） | creature_windup、creature_strike、guardian_brace_windup、guardian_brace_strike、guardian_lunge_windup、guardian_lunge_strike、guardian_cast_windup、guardian_cast_strike、native_contact |
| hakkai:time_warden | 時空の管理者 | 定義なし | 管理者の固有技（warden_boss 他） | warning、slash、sky_cast、slam、thunder_cast、moon_cast |
| hakkai:village_archer | 風記の弓兵 | 遠隔 | バニラ矢・衝突後演出（mob_attack_visuals） | patrol_shot |
| hakkai:village_mage | 風記の魔法使い | 近接 | 見回り魔法（main） | patrol_strike、patrol_cast |
| hakkai:village_watch | 風記の見張り | 近接 | 接触後演出（mob_attack_visuals） | patrol_strike |
| hakkai:wild_0_0 | 花角のシカ | 定義なし | 受動：逃走行動 shy・型0（mob_system） | creature_windup、creature_strike |
| hakkai:wild_0_1 | 風鳴きキツネ | 近接 | 中立：支援行動 defend・型0（mob_system） | creature_windup、creature_strike、native_contact |
| hakkai:wild_0_2 | 草原の茨獣 | 近接 | 敵対：固有技 thorns・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:wild_1_0 | 霧羽の小鳥 | 定義なし | 受動：逃走行動 shy・型2（mob_system） | creature_windup、creature_strike |
| hakkai:wild_1_1 | 苔甲のヤマネ | 近接 | 中立：支援行動 defend・型2（mob_system） | creature_windup、creature_strike、native_contact |
| hakkai:wild_1_2 | 夜霧の駆け獣 | 近接 | 敵対：固有技 leap・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:wild_2_0 | 砂縞の野ウサギ | 定義なし | 受動：逃走行動 shy・型1（mob_system） | creature_windup、creature_strike |
| hakkai:wild_2_1 | 砂殻の甲虫 | 近接 | 中立：支援行動 defend・型1（mob_system） | creature_windup、creature_strike、native_contact |
| hakkai:wild_2_2 | 赤砂の石像 | 近接 | 敵対：固有技 armor・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:wild_3_0 | 霜耳のユキギツネ | 定義なし | 受動：逃走行動 shy・型0（mob_system） | creature_windup、creature_strike |
| hakkai:wild_3_1 | 氷紋のシカ | 近接 | 中立：支援行動 defend・型0（mob_system） | creature_windup、creature_strike、native_contact |
| hakkai:wild_3_2 | 凍爪のオオカミ | 近接 | 敵対：固有技 frost・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:wild_4_0 | 銅羽のオオトリ | 定義なし | 受動：逃走行動 shy・型2（mob_system） | creature_windup、creature_strike |
| hakkai:wild_4_1 | 稜線のヤギ | 近接 | 中立：支援行動 defend・型2（mob_system） | creature_windup、creature_strike、native_contact |
| hakkai:wild_4_2 | 帯電の岩兵 | 近接 | 敵対：固有技 charge・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:wild_5_0 | 灯茸のカエル | 定義なし | 受動：逃走行動 shy・型1（mob_system） | creature_windup、creature_strike |
| hakkai:wild_5_1 | 紫晶の甲虫 | 近接 | 中立：支援行動 defend・型1（mob_system） | creature_windup、creature_strike、native_contact |
| hakkai:wild_5_2 | 地底の影蜘蛛 | 近接 | 敵対：固有技 web・型1（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:wild_6_0 | 雲羽のトリ | 定義なし | 受動：逃走行動 shy・型0（mob_system） | creature_windup、creature_strike |
| hakkai:wild_6_1 | 風角の小ヤギ | 近接 | 中立：支援行動 defend・型0（mob_system） | creature_windup、creature_strike、native_contact |
| hakkai:wild_6_2 | 雲喰いの獣 | 近接 | 敵対：固有技 gust・型0（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |
| hakkai:wild_7_0 | 夕針のノウサギ | 定義なし | 受動：逃走行動 shy・型2（mob_system） | creature_windup、creature_strike |
| hakkai:wild_7_1 | 銅尾のキツネ | 近接 | 中立：支援行動 defend・型2（mob_system） | creature_windup、creature_strike、native_contact |
| hakkai:wild_7_2 | 裂時の歯車兵 | 近接 | 敵対：固有技 time・型2（mob_system） | creature_windup、creature_strike、talent_windup、talent_strike、native_contact |

// Deliberately designed families for catalog melee. I / II / III are
// progression tiers of the same named family, not 59 bespoke animations.
// The II and III finisher changes are explicit for each family.
const families={
 '剣:16':{name:'夢星',stages:[
  {name:'夢渡り',shape:'thrust',reach:4.0,move:.40},{name:'星返し',shape:'cleave',reach:3.8,angle:.3},
  {name:'夢星の交差',shape:'cross',reach:3.8,pulses:[0,6],power:-2}],tier2:{effect:'weakness'},tier3:{effect:'weakness',backBonus:4}},
 '剣:12':{name:'砂夢',stages:[
  {name:'砂潜り',shape:'cleave',reach:3.5,windup:5,move:.25},{name:'砂突き',shape:'thrust',reach:4,move:.30},
  {name:'砂夢の断ち',shape:'cleave',reach:4,windup:6,power:4}],tier2:{effect:'slowness'},tier3:{effect:'slowness',push:.8}},
 '剣:8':{name:'星雷',stages:[
  {name:'星突き',shape:'thrust',reach:4.4,windup:3},{name:'閃き返し',shape:'cleave',reach:3.7,angle:-.35},
  {name:'星雷連閃',shape:'thrust',reach:4.5,pulses:[0,7],power:-2}],tier2:{reach:4.8},tier3:{reach:4.8,backBonus:4}},
 '剣:4':{name:'雷砂',stages:[
  {name:'雷駆け',shape:'thrust',reach:4,windup:3,move:.46},{name:'砂払い',shape:'cleave',reach:3.7,angle:.35},
  {name:'雷砂の回転',shape:'spin',reach:3.6,power:1}],tier2:{push:.7},tier3:{push:.7,effect:'slowness'}},
 '剣:0':{name:'風風',stages:[
  {name:'風踏み',shape:'thrust',reach:4.2,windup:3,move:.44},{name:'風返し',shape:'cleave',reach:3.8,angle:-.3},
  {name:'風の旋回',shape:'spin',reach:3.8,move:.43}],tier2:{pulses:[0,7],power:-2},tier3:{pulses:[0,7],power:0}},
 '斧:1':{name:'水土',stages:[
  {name:'水砕き',shape:'cleave',reach:3.4,power:2},{name:'土返し',shape:'cleave',reach:3.5,angle:.35},
  {name:'水土の震撃',shape:'spin',reach:3.4,windup:7,power:4}],tier2:{push:1},tier3:{push:1,effect:'slowness'}},
 '斧:17':{name:'音雪',stages:[
  {name:'音断ち',shape:'cleave',reach:3.6},{name:'雪返し',shape:'cross',reach:3.5,pulses:[0,6],power:-3},
  {name:'音雪の余響',shape:'ring',inner:.8,reach:4.1,pulses:[0,8],power:-2}],tier2:{effect:'slowness'},tier3:{effect:'slowness',push:.7}},
 '斧:13':{name:'森湖',stages:[
  {name:'森割り',shape:'cleave',reach:3.3,windup:6,power:3},{name:'湖払い',shape:'cleave',reach:3.7,angle:-.3},
  {name:'森湖の大薙ぎ',shape:'cleave',reach:4.1,windup:7,power:5}],tier2:{effect:'weakness'},tier3:{effect:'weakness',push:1}},
 '斧:9':{name:'虹時',stages:[
  {name:'虹の斬り',shape:'cleave',reach:3.5},{name:'時返し',shape:'thrust',reach:4},
  {name:'虹時の断環',shape:'ring',inner:1,reach:4.3,windup:7}],tier2:{pulses:[0,8],power:-3},tier3:{pulses:[0,8],power:-1}},
 '斧:5':{name:'光空',stages:[
  {name:'光踏み',shape:'thrust',reach:3.8,move:.40,hop:.25},{name:'空払い',shape:'cleave',reach:4,move:.38},
  {name:'光空の落輪',shape:'ring',inner:.75,reach:4,windup:6,hop:.28}],tier2:{push:.8},tier3:{push:1.1}},
 'ハンマー:16':{name:'夢星',stages:[
  {name:'夢落とし',shape:'cleave',reach:3.4,windup:7,power:3},{name:'星払い',shape:'cleave',reach:3.8},
  {name:'夢星の震輪',shape:'ring',inner:.8,reach:4,windup:8,power:5}],tier2:{effect:'weakness'},tier3:{effect:'weakness',push:1}},
 'ハンマー:12':{name:'砂夢',stages:[
  {name:'砂砕き',shape:'cleave',reach:3.3,windup:7,power:4},{name:'夢払い',shape:'cleave',reach:3.5,angle:-.3},
  {name:'砂夢の大震',shape:'spin',reach:3.8,windup:9,power:7,push:1}],tier2:{effect:'slowness'},tier3:{effect:'slowness',push:1.3}},
 'ハンマー:8':{name:'星雷',stages:[
  {name:'星打ち',shape:'cleave',reach:3.7},{name:'雷返し',shape:'thrust',reach:4.3},
  {name:'星雷の直撃',shape:'thrust',reach:4.6,windup:7,power:6}],tier2:{push:1},tier3:{push:1,backBonus:4}},
 'ハンマー:4':{name:'雷砂',stages:[
  {name:'雷叩き',shape:'cleave',reach:3.5,windup:6},{name:'砂返し',shape:'cleave',reach:3.6,angle:.35},
  {name:'雷砂の連震',shape:'spin',reach:3.7,windup:7,pulses:[0,8],power:-2}],tier2:{push:.8},tier3:{push:.8,effect:'slowness'}},
 'ハンマー:0':{name:'風風',stages:[
  {name:'風打ち',shape:'cleave',reach:3.7,move:.34},{name:'風突き',shape:'thrust',reach:4.2,move:.36},
  {name:'風回し',shape:'spin',reach:4,windup:7,move:.38}],tier2:{push:1},tier3:{push:1.2}},
 '扇:7':{name:'時水',stages:[
  {name:'時風',shape:'cleave',reach:4.5},{name:'水返し',shape:'cleave',reach:4.6,angle:.35},
  {name:'時水の余波',shape:'ring',inner:1.2,reach:4.8,pulses:[0,8],power:-3}],tier2:{effect:'slowness'},tier3:{effect:'slowness',reach:5.1}},
 '扇:3':{name:'土虹',stages:[
  {name:'土の風',shape:'cleave',reach:4.2},{name:'虹返し',shape:'cross',reach:4.3,pulses:[0,6],power:-3},
  {name:'土虹の押風',shape:'cleave',reach:4.6,push:1}],tier2:{effect:'weakness'},tier3:{effect:'weakness',push:1.2}},
 '扇:19':{name:'湖音',stages:[
  {name:'湖の風',shape:'cleave',reach:4.5,angle:-.3},{name:'音返し',shape:'cleave',reach:4.5,angle:.3},
  {name:'湖音の交差',shape:'cross',reach:4.8,pulses:[0,7],power:-2}],tier2:{effect:'weakness'},tier3:{effect:'weakness',backBonus:4}},
 '扇:15':{name:'空光',stages:[
  {name:'空駆け',shape:'thrust',reach:4.8,move:.42,hop:.25},{name:'光払い',shape:'cleave',reach:4.6},
  {name:'空光の旋舞',shape:'spin',reach:4.5,move:.42,hop:.28}],tier2:{push:.7},tier3:{push:1}},
 '扇:11':{name:'雪森',stages:[
  {name:'雪の風',shape:'thrust',reach:5},{name:'森返し',shape:'cleave',reach:4.5},
  {name:'雪森の凍風',shape:'cleave',reach:5,effect:'slowness'}],tier2:{inner:.75,reach:5.3},tier3:{inner:.75,reach:5.3,push:.7}},
 '槍:5':{name:'光空',stages:[
  {name:'光突き',shape:'thrust',reach:5.5,move:.40},{name:'空渡り',shape:'cleave',reach:4.7,move:.37},
  {name:'光空の穿撃',shape:'thrust',reach:6.2,windup:5,power:3}],tier2:{reach:6.5},tier3:{reach:6.5,backBonus:4}},
 '槍:1':{name:'水土',stages:[
  {name:'水刺し',shape:'thrust',reach:5.2},{name:'土払い',shape:'cleave',reach:4.5,push:.6},
  {name:'水土の押波',shape:'cleave',reach:5,windup:6,push:1}],tier2:{effect:'slowness'},tier3:{effect:'slowness',push:1.2}},
 '槍:17':{name:'音雪',stages:[
  {name:'雪刺し',shape:'thrust',reach:5.4},{name:'音返し',shape:'thrust',reach:5.2,pulses:[0,7],power:-3},
  {name:'音雪の連突',shape:'thrust',reach:5.5,pulses:[0,8],power:-2}],tier2:{effect:'slowness'},tier3:{effect:'slowness',reach:5.9}},
 '槍:13':{name:'森湖',stages:[
  {name:'森刺し',shape:'thrust',reach:5.1},{name:'湖の薙ぎ',shape:'cleave',reach:4.7},
  {name:'森湖の守輪',shape:'ring',inner:1.4,reach:4.8,windup:6}],tier2:{effect:'weakness'},tier3:{effect:'weakness',push:.8}},
 '槍:9':{name:'虹時',stages:[
  {name:'虹突き',shape:'thrust',reach:5.4},{name:'時戻し',shape:'cleave',reach:4.5,angle:.35},
  {name:'虹時の交差',shape:'cross',reach:5,pulses:[0,8],power:-2}],tier2:{effect:'slowness'},tier3:{effect:'slowness',backBonus:4}}
};
export const FAMILY_CODES=Object.freeze({'剣':'sword','斧':'axe','槍':'spear','ハンマー':'hammer','扇':'fan'});
export function catalogFamily(g){
 if(!/^gear_\d{3}$/.test(g?.id??'')||!Number.isInteger(g.a)||!Number.isInteger(g.rank)||g.rank<1||g.rank>3)return;
 return families[`${g.kind}:${g.a}`];
}
export function catalogFamilyMove(g,stage){
 const family=catalogFamily(g);if(!family||!Number.isInteger(stage)||stage<1||stage>3)return;
 const m=family.stages[stage-1],tier=stage===3&&g.rank>=2?(g.rank===3?family.tier3:family.tier2):{};
 return {...m,...tier,familyAnimation:`family_${FAMILY_CODES[g.kind]}_${g.a}_${stage}_${g.rank}`};
}
export const CATALOG_FAMILY_COUNT=Object.keys(families).length;

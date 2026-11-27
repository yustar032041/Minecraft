// Named ultimate patterns for the 40 catalog families. I/II/III share a
// family identity; higher tiers widen reach modestly. These are not 95 unique
// hand-animated attacks. The ten endgame weapons are specified separately.
const patterns={
 '剣:16':['夢星の交差','cross',7.2,.65,.45],
 '剣:12':['砂夢の断界','fan',6.5,.15],
 '剣:8':['星雷の穿光','fan',8.5,.90],
 '剣:4':['雷砂の旋界','ring',6.0,0,.5],
 '剣:0':['風風の疾斬','fan',8,.68],
 '斧:1':['水土の震界','ring',5.5,0,.25],
 '斧:17':['音雪の残環','ring',6.0,0,1],
 '斧:13':['森湖の大薙ぎ','fan',7,0],
 '斧:9':['虹時の断環','ring',6.5,0,1.1],
 '斧:5':['光空の裂風','fan',7.5,.45],
 '槍:5':['光空の長穿','fan',12,.94],
 '槍:1':['水土の押波','fan',8,.55],
 '槍:17':['音雪の氷穿','fan',11,.90],
 '槍:13':['森湖の連薙ぎ','cross',9,.65,.38],
 '槍:9':['虹時の交叉','cross',10,.72,.4],
 'ハンマー:16':['夢星の震環','ring',6,0,.8],
 'ハンマー:12':['砂夢の大震','ring',5.5,0,.25],
 'ハンマー:8':['星雷の直撃','fan',7,.85],
 'ハンマー:4':['雷砂の震界','ring',6.5,0,.5],
 'ハンマー:0':['風風の大旋','ring',7,0,.8],
 '扇:7':['時水の余波','ring',7,0,1],
 '扇:3':['土虹の押風','fan',8,.20],
 '扇:19':['湖音の交差','cross',8,.68,.45],
 '扇:15':['空光の旋舞','ring',7.5,0,.5],
 '扇:11':['雪森の凍風','fan',9,.40],
 '弓:2':['火闇の穿矢','fan',14,.94],
 '弓:18':['港海の潮矢','fan',13,.78],
 '弓:14':['海火の双矢','cross',12,.93,.25],
 '弓:10':['霧霧の散矢','fan',11,.68],
 '弓:6':['闇港の影矢','fan',12,.90],
 '杖:3':['土虹の震波','fan',12,.48],
 '杖:19':['湖音の交波','cross',13,.70,.35],
 '杖:15':['空光の環風','ring',8,0,1.2],
 '杖:11':['雪森の凍流','fan',14,.90],
 '杖:7':['時水の封環','ring',8.5,0,1],
 '盾:6':['闇港の反震','fan',5,.25],
 '盾:2':['火闇の衝盾','fan',6,.60],
 '盾:18':['港海の護環','ring',5,0,.25],
 '盾:14':['海火の押波','fan',6,.20],
 '盾:10':['霧霧の返盾','cross',5.5,.68,.4]
};
export const ULTIMATE_FAMILY_COUNT=Object.keys(patterns).length;
export function catalogUltimateFamily(g){
 if(!/^gear_\d{3}$/.test(g?.id??'')||!Number.isInteger(g.a)||!Number.isInteger(g.rank)||g.rank<1||g.rank>3)return;
 const p=patterns[`${g.kind}:${g.a}`];if(!p)return;
 const [name,shape,base,cone,extra]=p;
 const spec={name:`極式・${name}`,shape,range:base+(g.rank-1)*.2,cone};
 if(shape==='ring')spec.inner=extra;
 if(shape==='cross')spec.angle=extra;
 return spec;
}

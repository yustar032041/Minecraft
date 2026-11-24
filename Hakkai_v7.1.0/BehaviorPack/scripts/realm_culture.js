// These are fictional oral histories within 8界風記, not real-world history.
// IDs are append-only: saved site and story records depend on them.
export const CULTURE_SITES=[
 {name:'風分けの共同風車',style:'meadow',story:'【風を分け合う約束】\n昔、大風が草原の畑を倒した年、村人たちは一軒ごとの風車をやめ、皆の力で共同の風車を建てた。粉は収穫の少ない家と旅人にも分ける。風の向きを記す石は、道に迷った人が帰る方角を知るためのもの。風を独り占めしないことが、この草原の約束になった。'},
 {name:'根脈の文庫',style:'forest',story:'【木の根に守られた手紙】\n霧が道を隠す森では、返事がすぐ届くとは限らない。人々は巨木の根元に文庫をつくり、渡せなかった手紙を季節ごとに読み継いだ。書架の灯りは旅人に急がず休む場所を知らせる。手紙を持ち去るのでなく、次の読み手へ返すことが森の礼儀。'},
 {name:'砂紋の隊商迷宮',style:'desert',story:'【水を分ける石の迷路】\n砂嵐が街道を埋めたあと、隊商は風を避けられる壁を曲がりくねらせ、水と食料を置く休み場を残した。道を知る者は最後の一人を待ち、井戸に残す水の量を石に刻む。迷路は敵を閉じ込めるためではなく、旅人が生きて次へ向かうための道だった。'},
 {name:'鏡湖の氷宮',style:'ice',story:'【湖に映る灯り】\n長い冬、湖岸の人々は薄氷を避けるため、灯りの位置と水面の変化を記録した。春を待つあいだ、凍った鏡に仲間の灯りを映して、離れた家にも無事を知らせたという。氷宮はその記録と休息の場。鏡は未来を予言しないが、帰る人を迎える光を映し続ける。'},
 {name:'雷炉の鍛冶場',style:'cliff',story:'【雷鳴を待つ炉】\n雷が近づくと、鍛冶師は作業を止めて道具と旅人を屋根の下へ招いた。嵐が過ぎた後に炉を灯し直し、壊れた橋の金具から先に直す。それが断崖の鍛冶場に伝わる順番。銅の柱は強さの象徴ではなく、危険を知らせる目印だった。'},
 {name:'灯苔の地下庭',style:'cave',story:'【ひとつ残す灯】\n暗い地下を歩く人々は、苔の灯りをすべて採らず、必ずひとつ残すと決めた。残した光は次の旅人と菌の庭のため。水のある場所、休める場所、地上へ戻る道を仲間同士で書き継ぎ、光の少ない世界にも帰り道をつくった。'},
 {name:'雲渡りの観測庭',style:'sky',story:'【橋を架ける前に】\n島と島の風はいつも同じ向きではない。空の渡り手は、橋を架ける前に風を読み、向こう岸で待つ人と合図を交わした。観測庭には風向きを記した柱が並ぶ。遠い島を見ることと、無事に帰る道を残すことを同じくらい大切にした。'},
 {name:'時結びの待合駅',style:'time',story:'【止まった時計の約束】\n終着駅の時計が止まった日、人々は時刻だけで出発を決めるのをやめた。遅れた人を待ち、名前のない旅人にも席を空ける。発車の合図は、全員が帰り道を知ってから。針の止まった時計は、約束を急がせないために今も駅に残されている。'}
].map((site,dim)=>({...site,id:61+dim,dim,landmark:'culture',kind:'culture',biome:'plains',description:'この界に伝わる暮らしと歴史を訪ねる。',x:1400,z:1400,size:65}));

// Existing numbered founding villagers remain identifiable after upgrading.
export function factoryResidentRole(entity){
 const name=entity?.nameTag??'';
 const match=/^風車村の住人 (\d+)(?:｜.*)?$/.exec(name);
 if(!match)return undefined;
 const n=Number(match[1]);if(n<1||n>24)return undefined;
 return ['crusher','saw','grower','keeper'][(n-1)%4];
}
export const FACTORY_ROLE_LABELS={crusher:'粉砕係',saw:'製材係',grower:'畑守',keeper:'灯守'};
// A genuine nearby founding resident and a successful factory transaction
// are required. The bonus is abstract village goods, not a physical item.
export function factoryResidentBonus(town,block,time){
 if(!town?.factoryVillage||time>=7100)return 0;
 const role=block.typeId==='hakkai:crusher'?'crusher':block.typeId==='hakkai:saw'?'saw':undefined;
 if(!role)return 0;
 try{
  return block.dimension.getEntities({type:'minecraft:villager_v2',location:{x:block.x+.5,y:block.y+.5,z:block.z+.5},maxDistance:6,closest:16}).some(e=>
   e.isValid&&factoryResidentRole(e)===role&&!e.getComponent('minecraft:is_baby'))?1:0;
 }catch{return 0;}
}

// Two actual villagers per heritage site, created once when visited. They use
// ordinary Bedrock villager AI; names/dialogue are a light cultural layer.
export const CULTURE_PEOPLE=[
 [{name:'風粉のマキ',role:'粉分け係',line:'「風車の粉は、旅人と畑の小さな家にも分けるの。風はみんなのものだから。」'}, {name:'道標のレン',role:'道標守',line:'「道に迷っても帰れるように、風向きと道標を毎朝確かめるんだ。」'}],
 [{name:'手紙のシオ',role:'文庫守',line:'「すぐに届かない手紙は、ここで次の季節まで預かるの。」'}, {name:'苔灯のナギ',role:'灯守',line:'「霧の日は急がないで。書架の灯りが見えたら、ここで休んでね。」'}],
 [{name:'水守のサラ',role:'隊商の水守',line:'「最後の水を飲み干さず、次の旅人へ少し残すのが隊商の約束よ。」'}, {name:'砂路のハク',role:'道案内',line:'「砂は足跡を消すけれど、壁の印は旅の歩幅を覚えているよ。」'}],
 [{name:'氷灯のユキ',role:'湖の灯守',line:'「氷の下には水があるの。薄いところには気をつけて、灯りを目印に帰ってね。」'}, {name:'鏡記のトワ',role:'湖の記録係',line:'「湖に映る灯りを数えると、遠くの家も無事だとわかるんだ。」'}],
 [{name:'炉守のライ',role:'鍛冶師',line:'「嵐の間は仕事を止める。炉を再び灯したら、橋の金具から直すんだ。」'}, {name:'銅標のヒバ',role:'見張り',line:'「銅の柱は力比べのためじゃないよ。雷の近さを皆に知らせる目印さ。」'}],
 [{name:'苔守のルカ',role:'庭守',line:'「苔の灯りはひとつ残してね。次の旅人にも、庭にも必要だから。」'}, {name:'水脈のシズ',role:'道記し',line:'「水のそばの休み場と、地上へ戻る道を記録しているの。」'}],
 [{name:'風読みのソラ',role:'観測係',line:'「向こう岸の合図を見てから渡ろう。風は毎日同じ向きじゃないから。」'}, {name:'雲橋のフウ',role:'橋守',line:'「橋は渡るためだけじゃなく、みんなが帰るためにも架けるんだ。」'}],
 [{name:'待合のハル',role:'駅の世話役',line:'「針が止まっても、遅れた人を待つ約束は止まらないよ。」'}, {name:'時結びのミナ',role:'旅人の案内役',line:'「知らない旅人にも席を空けておくの。出発の前に、帰り道を確かめてね。」'}]
];
export function cultureResidentIdentity(entity){
 const m=/^風記の語り手｜([0-7])｜([01])｜/.exec(entity?.nameTag??'');
 if(!m)return undefined;return {realm:Number(m[1]),index:Number(m[2])};
}
export function foundCultureResident({site,world,dimension,num,property,findFloor,report}){
 if(site?.kind!=='culture'||!world.gameRules.doMobSpawning||!num(world,`built_${site.id}`)||dimension.id!==`hakkai:realm_${site.dim}`)return false;
 const key=`culture_residents_${site.id}_v1`,i=num(world,key);
 if(!Number.isInteger(i)||i<0||i>=2)return false;
 try{
  const at=findFloor(dimension,{x:site.x+(i?5:-5)+.5,y:88,z:site.z+4.5},4);
  if(!at||dimension.getPlayers({location:at,maxDistance:2,closest:1}).length||dimension.getEntities({location:at,maxDistance:1.5,closest:1}).length)return false;
  // Reserve first: an interrupted/uncertain spawn is never silently duplicated.
  property(world,key,i+1);
  const person=CULTURE_PEOPLE[site.dim][i],e=dimension.spawnEntity('minecraft:villager_v2',at,{initialPersistence:true});
  e.nameTag=`風記の語り手｜${site.dim}｜${i}｜${person.name}`;
  return true;
 }catch(err){report('文化の語り手',err);return false;}
}

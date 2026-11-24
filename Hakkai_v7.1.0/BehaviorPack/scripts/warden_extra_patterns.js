// Twenty additional patterns per form. These are deliberately varied recipes
// over the existing seven moving-front engines, not 100 new projectile types.
const WORDS=[
 ['刻針','時砂','逆刻','時計盤'],['蒼翼','天空','風羽','天弓'],
 ['岩芯','地脈','巨石','震央'],['雷雲','閃電','稲妻','雷柱'],['月影','終刻','星界','虚空']
];
const RECIPES=[
 {motion:'wave',shape:'circle',radius:4.5},
 {motion:'wave',shape:'circle',radius:8,reverse:true},
 {motion:'twinwave',shape:'twin',radius:2.5,offset:3},
 {motion:'twinwave',shape:'twin',radius:3.5,offset:4.5,reverse:true},
 {motion:'bolt',shape:'line',radius:6,width:.6},
 {motion:'bolt',shape:'line',radius:9,width:1.2,reverse:true},
 {motion:'bolt',shape:'line',radius:6.5,width:.8,axis:'x'},
 {motion:'bolt',shape:'line',radius:8,width:1.1,axis:'x',reverse:true},
 {motion:'barrage',shape:'lanes',radius:6,width:.55,offset:3.5},
 {motion:'barrage',shape:'lanes',radius:9,width:.85,offset:2,reverse:true},
 {motion:'barrage',shape:'lanes',radius:7,width:.65,offset:3,axis:'x'},
 {motion:'barrage',shape:'lanes',radius:8,width:.8,offset:2.5,axis:'x',reverse:true},
 {motion:'cross',shape:'cross',radius:5,width:.55},
 {motion:'cross',shape:'cross',radius:8,width:1,reverse:true},
 {motion:'sweep',shape:'circle',radius:5,width:.5},
 {motion:'sweep',shape:'circle',radius:8,width:.8,reverse:true},
 {motion:'zones',shape:'zones',radius:1.2,offset:3},
 {motion:'zones',shape:'zones',radius:2,offset:4,reverse:true},
 {motion:'cross',shape:'cross',radius:7,width:1.15},
 {motion:'wave',shape:'circle',radius:9}
];
const SUFFIX=['小環','大収束','双輪','逆双輪','短線','長逆線','横短線','横逆線','疎三条','密逆三条','横三条','横逆三条','細十字','大逆十字','小旋刃','大逆旋刃','小三陣','逆三陣','広十字','大拡散'];
const EFFECTS=['slowness','slow_falling','slowness','weakness','blindness'];
export const WARDEN_EXTRA_PATTERNS=WORDS.map((words,phase)=>RECIPES.map((recipe,i)=>({
 ...recipe,attack:`${words[i%words.length]}・${SUFFIX[i]}`,damage:7+phase*2+i%3,effect:EFFECTS[phase]
})));

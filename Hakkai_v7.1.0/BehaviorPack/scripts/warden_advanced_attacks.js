// Twelve more named patterns per phase. They share a small set of rigorously
// tested moving-front primitives; names are patterns, not 60 unique engines.
const NAMES=[
 ['逆行する時の輪','逆時の斬路','横薙ぎの時刃','逆流する三刻弾','横走りの三刻弾','時の十字拡散','時の十字収束','時計回りの刻刃','逆時計回りの刻刃','時刻の三連爆','逆時刻の三連爆','双刻の拡散輪'],
 ['天空の吸い込み輪','空を戻る光弾','横切る空の光','逆流の双翼弾幕','横断する三翼弾','天空十字の拡散','天空十字の収束','空の右旋刃','空の左旋刃','雲間の三連光','逆順の三連光','双翼の拡散輪'],
 ['地脈の収束波','戻る岩脈','横走りの地脈','逆流する地の三条','地を横切る三条','震央の十字拡散','震央の十字収束','大地の右旋衝','大地の左旋衝','岩脈の三連震','逆順の三連震','双岩の震動輪'],
 ['雷輪の収束','逆走する雷光','横薙ぎの雷光','逆走する三条雷','横切る三条雷','十字雷の拡散','十字雷の収束','右旋する雷刃','左旋する雷刃','雷雲の三連閃','逆順の三連閃','双雷の拡散輪'],
 ['終刻の収束輪','逆行する終刻弾','月光の横断弾','逆行する終刻三弾','横断する終刻三弾','終刻十字の拡散','終刻十字の収束','右旋する月刃','左旋する月刃','月影の三連光','逆順の月影三連光','双月の拡散輪']
];
const TEMPLATES=[
 {motion:'wave',shape:'circle',radius:6,reverse:true},
 {motion:'bolt',shape:'line',radius:7,width:.9,reverse:true},
 {motion:'bolt',shape:'line',radius:7,width:.9,axis:'x'},
 {motion:'barrage',shape:'lanes',radius:7,width:.7,offset:2.5,reverse:true},
 {motion:'barrage',shape:'lanes',radius:7,width:.7,offset:2.5,axis:'x'},
 {motion:'cross',shape:'cross',radius:6,width:.8},
 {motion:'cross',shape:'cross',radius:6,width:.8,reverse:true},
 {motion:'sweep',shape:'circle',radius:6,width:.65},
 {motion:'sweep',shape:'circle',radius:6,width:.65,reverse:true},
 {motion:'zones',shape:'zones',radius:1.5,offset:4},
 {motion:'zones',shape:'zones',radius:1.5,offset:4,reverse:true},
 {motion:'twinwave',shape:'twin',radius:3,offset:4}
];
const EFFECTS=['slowness','slow_falling','slowness','weakness','blindness'];
export const WARDEN_ADVANCED=NAMES.map((names,phase)=>names.map((attack,index)=>{
 const base=TEMPLATES[index],radius=base.shape==='zones'||base.shape==='twin'?base.radius:base.radius+phase*.25;
 return {...base,radius,attack,damage:7+phase*2+(index%3),effect:EFFECTS[phase]};
}));

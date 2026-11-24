// Stable spell order: 8 base attributes, 5 combinations, 5 special spells.
// Indices deliberately match learned_spells and the existing magic catalogue.
export function tomeSpells(attrs,pairs){
 return [...attrs.slice(0,8).map((label,a)=>({label,a,b:-1})),...pairs,
  {label:'光の矢（魔力5）',a:5,b:-1,special:'light'},
  {label:'絆の灯（魔力20・2人以上）',a:0,b:1,special:'bond'},
  {label:'風の輪（魔力8）',a:0,b:-1,special:'wind'},
  {label:'水の縛り（魔力10）',a:1,b:-1,special:'water'},
  {label:'炎の環（魔力12）',a:2,b:-1,special:'fire'}];
}
export function tomeUnlocked(spell,hasAttribute){return !!spell&&hasAttribute(spell.a)&&(spell.b<0||hasAttribute(spell.b));}
export function tomeCurrent(list,index,hasAttribute){
 if(Number.isInteger(index)&&index>=0&&index<list.length&&tomeUnlocked(list[index],hasAttribute))return index;
 return list.findIndex(spell=>tomeUnlocked(spell,hasAttribute));
}
export function tomeNext(list,index,hasAttribute){
 if(!list.length)return -1;
 const current=tomeCurrent(list,index,hasAttribute);if(current<0)return -1;
 for(let n=1;n<=list.length;n++){const i=(current+n)%list.length;if(tomeUnlocked(list[i],hasAttribute))return i;}
 return -1;
}
// Track crouch edges globally, not only while holding the tome: equipping it
// while already crouched must not spuriously advance the selection.
export function tomeCrouchTick(p,s,held,advance){
 const sneaking=!!p?.isSneaking,was=s.tomeSneaking;
 s.tomeSneaking=sneaking;
 if(was===false&&sneaking&&held==='hakkai:element_tome'&&!s.busy&&!s.menu)advance();
}

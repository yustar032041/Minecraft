#!/usr/bin/env python3
"""Hand-curated alignment of selected attacks with redesigned creature forms.

Only the listed profile/guide fields change. This deliberately does not alter
signature ids, loot, XP, spawn, models, damage code, AI components or hitboxes.
"""
import argparse,json,re
from pathlib import Path
BP=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/scripts'
# id: (expected original talent, new talent, action label, accurate primary
# action description, short guide role, short guide description).
OVERRIDES={
 'foe_1_6':('frost','web','白霧の糸縛り','予告地点の相手に糸を絡め、短く動きを鈍らせる。','糸縛り','予告地点に糸を絡め、相手を鈍らせる。'),
 'foe_2_6':('frost','web','赤砂の地縛糸','予告地点の相手を鈍らせ、攻撃力も弱める。','地縛糸','予告地点の相手を鈍らせ、弱体化させる。'),
 'foe_3_5':('spore','frost','霜柱の冷気','霜柱の冷気で予告地点の相手の移動と採掘を鈍らせる。','冷気','予告地点へ冷気を放ち、移動と採掘を鈍らせる。'),
 'foe_4_5':('spore','shock','銅羽の放電','予告地点の相手を放電で攻撃し、弱体化させる。','放電','放電で予告地点の相手を弱体化させる。'),
 'foe_4_6':('frost','shock','雷糸の放電','雷糸の放電で予告地点の相手を攻撃し、弱体化させる。','雷糸','予告地点へ放電し、相手を弱体化させる。'),
 'foe_5_6':('frost','web','深穴の影糸','予告地点の相手を影糸で鈍らせ、攻撃力も弱める。','影糸','影糸で予告地点の相手を鈍らせ、弱体化させる。'),
 'foe_6_6':('frost','web','空糸の風縛り','予告地点の相手に空糸を絡め、移動を鈍らせる。','空糸','予告地点へ空糸を絡め、相手を鈍らせる。'),
 'foe_7_6':('frost','time','時縫いの糸','予告地点の相手に時縫いの糸を刻み、鈍足と弱体化を与える。','時縫い','予告地点の相手を鈍らせ、弱体化させる。'),
 'foe_2_11':('leech','charge','砕岩の踏み込み','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はない。','踏み込み','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_4_11':('leech','shock','雷針の放電','予告地点の相手を雷針で攻撃し、弱体化させる。','雷針','予告地点に放電し、相手を弱体化させる。'),
 'foe_6_11':('leech','gust','小さな竜巻','予告地点の相手を風圧で攻撃し、吹き飛ばす。','風圧','予告地点の相手を風圧で押し返す。'),
 # The old generic fox slot used web in every realm. Reuse a small
 # single-target warned talent appropriate to the individual name/rig.
 'foe_0_4':('web','leech','烏霧の吸命','予告後、近くの相手への一撃で体力を吸い、短く加速する。少し離れて命中すると踏み込む。','影の吸命','近距離への一撃で体力を吸い、時に小さく踏み込む。'),
 'foe_1_4':('web','leech','藍影の吸命','予告後、近くの相手への一撃で体力を吸い、短く加速する。少し離れて命中すると踏み込む。','影の吸命','近距離への一撃で体力を吸い、時に小さく踏み込む。'),
 'foe_2_4':('web','mark','陽炎の狩標','予告地点の相手を攻撃し、追跡粒子と弱体化を与える。','陽炎の狩標','予告地点の相手に追跡粒子と弱体化を与える。'),
 'foe_3_4':('web','frost','鏡面の冷気','予告地点の相手の移動と採掘を冷気で鈍らせる。','鏡面の冷気','予告地点の相手の移動と採掘を鈍らせる。'),
 'foe_4_4':('web','shock','稲妻の放電','予告地点の相手を放電で攻撃し、弱体化させる。','稲妻の放電','予告地点の相手を放電で弱体化させる。'),
 'foe_5_4':('web','leech','暗晶の吸命','予告後、近くの相手への一撃で体力を吸い、短く加速する。少し離れて命中すると踏み込む。','暗晶の吸命','近距離への一撃で体力を吸い、時に小さく踏み込む。'),
 'foe_6_4':('web','gust','風輪の圧風','予告地点の相手を風圧で攻撃し、吹き飛ばす。','風輪の圧風','予告地点の相手を風圧で押し返す。'),
 'foe_7_4':('web','time','逆時の刻み','予告地点の相手を攻撃し、鈍足と弱体化を与える。','逆時の刻み','予告地点の相手を鈍らせ、弱体化させる。'),
 'foe_1_11':('burst','web','青苔の縫い糸','予告地点の相手に糸を絡め、鈍足と弱体化を与える。','青苔の縫い糸','予告地点の相手を糸で鈍らせ、弱体化させる。'),
 # Existing abilities retained; the legacy text promised extra hits,
 # automatic retaliation, splash damage or scaling the controller does not do.
 'foe_0_0':('leap','leap','穿空跳躍','構えた後、直線を遮られなければ離れた相手へ跳ぶ。攻撃時に近距離なら一撃を放つが、移動中や着地時の攻撃はない。','急襲','構えの後に跳び、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_0_1':('thorns','thorns','晶棘返し','予告地点の近くの相手を棘で攻撃し、動きを鈍らせる。','棘攻撃','棘の一撃で近くの相手の動きを鈍らせる。'),
 'foe_1_2':('charge','charge','轟角突進','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はない。','突進','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_4_0':('charge','charge','雷刻の踏み込み','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はない。','重突進','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_4_2':('charge','charge','岩砕きの踏み込み','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はない。','突進','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_2_2':('charge','charge','地割れの一撃','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はなく、地形も変わらない。','突進','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_5_2':('charge','charge','地割れの一撃','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はなく、地形も変わらない。','突進','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_4_1':('shock','shock','雷針放電','予告地点の相手を放電で攻撃し、弱体化させる。','放電','予告地点の相手を放電で弱体化させる。'),
 'foe_0_3':('armor','armor','鉄鱗の構え','攻撃を受けると短く硬化し、技では自身を強化して近くの相手を叩く。','装甲','攻撃を受けると短い耐性を得る。'),
 'foe_3_3':('armor','armor','鉄鱗の構え','攻撃を受けると短く硬化し、技では自身を強化して近くの相手を叩く。','装甲','攻撃を受けると短い耐性を得る。'),
 'foe_6_3':('armor','armor','鉄鱗の構え','攻撃を受けると短く硬化し、技では自身を強化して近くの相手を叩く。','装甲','攻撃を受けると短い耐性を得る。'),
 'foe_1_1':('spore','spore','胞子雲','予告地点の相手を攻撃し、毒を与える。','胞子','予告地点の相手に毒を与える。'),
 'foe_1_5':('spore','spore','胞子雲','予告地点の相手を攻撃し、毒を与える。','胞子','予告地点の相手に毒を与える。'),
 'foe_1_9':('spore','spore','腐芽の吐息','予告地点の相手を攻撃し、毒を与える。','胞子','予告地点の相手に毒を与える。'),
 'foe_2_5':('spore','spore','腐芽の吐息','予告地点の相手を攻撃し、毒を与える。','胞子','予告地点の相手に毒を与える。'),
 'foe_5_1':('spore','spore','胞子雲','予告地点の相手を攻撃し、毒を与える。','胞子','予告地点の相手に毒を与える。'),
 'foe_5_5':('spore','spore','腐芽の吐息','予告地点の相手を攻撃し、毒を与える。','胞子','予告地点の相手に毒を与える。'),
 'foe_5_11':('spore','spore','胞子雲','予告地点の相手を攻撃し、毒を与える。','胞子','予告地点の相手に毒を与える。'),
 'foe_7_5':('spore','spore','胞子雲','予告地点の相手を攻撃し、毒を与える。','胞子','予告地点の相手に毒を与える。'),
 # Same underlying mechanics; correct misleading inherited labels/descriptions.
 'foe_0_2':('charge','charge','岩駆けの踏み込み','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はない。','突進','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_0_5':('spore','spore','花粉の幻惑','予告地点の相手を攻撃し、毒と吐き気を与える。','花粉','花粉で予告地点の相手に毒と吐き気を与える。'),
 'foe_2_1':('charge','charge','赤砂の追撃','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はない。','追撃','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_3_2':('charge','charge','氷牢の突撃','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はない。','突撃','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_4_9':('shock','shock','放電羽の一撃','予告地点の相手を放電で攻撃し、弱体化させる。','放電','予告地点の相手を放電で弱体化させる。'),
 'foe_6_2':('charge','charge','雲棚の突進','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はない。','突進','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_7_2':('charge','charge','鋼鬼の踏み込み','構えた後、直線を遮られなければ踏み込む。攻撃時に近距離なら一撃を放つが、移動中の接触攻撃はない。','踏み込み','構えの後に踏み込み、攻撃時に遮られない近距離の相手へ一撃。'),
 'foe_7_9':('mark','mark','砂時計の狩標','予告地点の相手を攻撃し、追跡粒子と弱体化を与える。','標的印','予告地点の相手に追跡粒子と弱体化を与える。'),
}


# Also correct descriptions whose inherited templates implied immobility,
# splash from the caster, or a non-existent extra shock. Talents stay intact.
def unchanged(ids,talent,label,detail,role,lore):
 for id in ids:
  if id in OVERRIDES:raise ValueError('duplicate curated entry '+id)
  OVERRIDES[id]=(talent,talent,label,detail,role,lore)
unchanged(('foe_2_9','foe_5_9'),'mark','狩標刻印',
 '予告地点の相手を攻撃し、追跡粒子と弱体化を与える。','標的印','予告地点の相手に追跡粒子と弱体化を与える。')
unchanged(('foe_0_9','foe_3_8','foe_6_9'),'mark','追跡紋',
 '予告地点の相手を攻撃し、追跡粒子と弱体化を与える。','追跡紋','予告地点の相手に追跡粒子と弱体化を与える。')
unchanged(('foe_0_7','foe_3_7','foe_6_7'),'time','残響停止',
 '予告地点の相手を攻撃し、鈍足と弱体化を与える。','時縛り','予告地点の相手を鈍らせ、弱体化させる。')
unchanged(('foe_1_7','foe_4_7','foe_7_0','foe_7_1','foe_7_7'),'time','時縛り',
 '予告地点の相手を攻撃し、鈍足と弱体化を与える。','時縛り','予告地点の相手を鈍らせ、弱体化させる。')
unchanged(('foe_2_7','foe_5_7'),'time','逆秒針',
 '予告地点の相手を攻撃し、鈍足・弱体化・盲目を与える。','時縛り','予告地点の相手を鈍らせ、弱体化と盲目を与える。')
unchanged(('foe_0_6','foe_3_6'),'frost','氷弧の息吹',
 '予告地点の相手を攻撃し、移動と採掘を鈍らせる。','冷気','予告地点の相手の移動と採掘を鈍らせる。')
unchanged(('foe_6_5',),'spore','雲間の胞子',
 '予告地点の相手を攻撃し、毒と吐き気を与える。','胞子','予告地点の相手に毒と吐き気を与える。')
unchanged(('foe_0_10','foe_3_10'),'burst','地鳴り波',
 '構えの後、自身の周囲に衝波を放ち、範囲内の複数の相手を押し返す。','衝波','自身の周囲の相手を衝波で押し返す。')
unchanged(('foe_2_10','foe_5_10'),'burst','晶核爆ぜ',
 '構えの後、自身の周囲に衝波を放ち、範囲内の複数の相手を押し返す。','衝波','自身の周囲の相手を衝波で押し返す。')
unchanged(('foe_4_8','foe_7_11'),'burst','断層衝撃',
 '構えの後、自身の周囲に衝波を放ち、範囲内の複数の相手を押し返す。','衝波','自身の周囲の相手を衝波で押し返す。')

unchanged(('foe_6_8',),'burst','羽嵐の衝波',
 '翼を広げた後、自身の周囲に風の衝波を放ち、複数の相手を押し返す。','衝波','自身の周囲の相手を風の衝波で押し返す。')

# These remain separate defensive and close-contact effects. They never
# promise the old invisible five-block punch or a same-species-only buff.
GUARD_PROFILES={
 'foe_2_0':('armor','岩殻脈動','装甲'), 'foe_5_0':('armor','岩殻脈動','晶甲'),
 'foe_0_3':('armor','鉄鱗の構え','装甲'), 'foe_1_3':('armor','岩殻脈動','装甲型'),
 'foe_2_3':('armor','装甲共鳴','装甲型'), 'foe_3_3':('armor','鉄鱗の構え','装甲'),
 'foe_4_3':('armor','岩殻脈動','装甲型'), 'foe_5_3':('armor','装甲共鳴','装甲型'),
 'foe_6_3':('armor','鉄鱗の構え','装甲'), 'foe_7_3':('armor','岩殻脈動','装甲型'),
 'foe_0_11':('ward','相互硬化','群れ護り'), 'foe_1_8':('ward','守護共振','群れ護り'),
 'foe_2_8':('ward','群守り結界','群れ護り'), 'foe_3_9':('ward','相互硬化','群れ護り'),
 'foe_4_10':('ward','守護共振','群れ護り'), 'foe_6_10':('ward','相互硬化','群れ護り'),
 'foe_7_8':('ward','守護共振','群れ護り'),
}
for id,(talent,label,role) in GUARD_PROFILES.items():
 old=OVERRIDES.get(id)
 if old and (old[0]!=talent or old[1]!=talent or old[2]!=label):raise ValueError('unexpected guard override '+id)
 if talent=='armor':
  detail='プレイヤーに攻撃されると短く硬化。構えの後は自身を強化し、遮られない近距離の相手に一撃。'
  lore='被弾時と構えの後に自身を強化。打撃は遮られない近距離だけ。'
 else:
  detail='構えの後、自身と近くの同界生物を強化し、遮られない近距離の相手に一撃。'
  lore='構えの後に自身と近くの同界生物を守る。打撃は遮られない近距離だけ。'
 OVERRIDES[id]=(talent,talent,label,detail,role,lore)

DRAIN_PROFILES={
 'foe_0_4':('烏霧の吸命','影の吸命'), 'foe_1_4':('藍影の吸命','影の吸命'),
 'foe_5_4':('暗晶の吸命','暗晶の吸命'), 'foe_0_8':('血晶啜り','吸命'),
 'foe_1_10':('魂脈奪取','吸命'), 'foe_3_11':('血晶啜り','吸命'),
 'foe_5_8':('生命吸収','吸命'), 'foe_7_10':('魂脈奪取','吸命'),
}
for id,(label,role) in DRAIN_PROFILES.items():
 old=OVERRIDES.get(id)
 if old and (old[1]!='leech' or old[2]!=label):raise ValueError('unexpected drain override '+id)
 detail='予告後、遮られない相手へ瞬間的に吸命し、命中時に自身を回復・加速する。'
 if id in ('foe_0_4','foe_1_4','foe_5_4'):detail+='少し離れて命中すると小さく踏み込む。'
 if id=='foe_7_10':detail+='少し離れている場合は発動時に踏み込む。'
 lore='予告後に遮られない相手へ吸命。命中時に自身を回復・加速する。'
 OVERRIDES[id]=(old[0] if old else 'leech','leech',label,detail,role,lore)

def replace_profile(raw,id,values):
 pattern=r'(\["hakkai:'+re.escape(id)+r'", )(\{[^\r\n]*\})(\])'
 m=re.search(pattern,raw)
 if not m:raise ValueError('missing profile '+id)
 obj=json.loads(m.group(2));old,new,label,detail,role,lore=values
 if obj['id']!=id or obj['talent'] not in (old,new):raise ValueError('unexpected profile '+id)
 previous=obj['actionKey'];obj['talent']=new;obj['actionKey']=label;obj['actionName']=obj['name']+'・'+label;obj['actionDetail']=detail
 obj['lore']=obj['lore'].replace('固有技「'+previous+'」','固有技「'+label+'」')
 return raw[:m.start(2)]+json.dumps(obj,ensure_ascii=False)+raw[m.end(2):]

def replace_wildlife(raw,id,values):
 pattern=r'\{"id":"'+re.escape(id)+r'"[^{}]*\}'
 matches=list(re.finditer(pattern,raw))
 if len(matches)!=1:raise ValueError(f'{id}: expected exactly one wildlife record, got {len(matches)}')
 m=matches[0];obj=json.loads(m.group());old,new,label,detail,role,lore=values
 if obj['talent'] not in (old,new):raise ValueError('unexpected wildlife talent '+id)
 obj['talent']=new;obj['role']=role;obj['lore']=lore
 return raw[:m.start()]+json.dumps(obj,ensure_ascii=False,separators=(',',':'))+raw[m.end():]

PROJECTILE_EFFECTS={
 'thorns':'鈍足', 'web':'鈍足', 'spore':'毒', 'frost':'鈍足と採掘低下',
 'shock':'弱体化', 'time':'鈍足と弱体化', 'gust':'吹き飛ばし',
 'mark':'追跡粒子と弱体化', 'leech':'自身の回復と加速',
}
def projectile_detail(talent,variant,twin=False):
 effect=PROJECTILE_EFFECTS[talent]
 if talent=='web' and variant==2:effect+='と弱体化'
 if talent=='spore' and variant==1:effect+='と吐き気'
 if talent=='time' and variant==2:effect+='と盲目'
 if talent=='gust' and variant==2:effect+='と落下速度低下'
 shot='二筋の弾' if twin else '弾'
 return '構えの後、個体に応じた軌道で'+shot+'を放つ。接触した相手に'+effect+'。弾は壁や他の生物で止まる。' if talent!='leech' else '構えの後、個体に応じた軌道で吸命弾を放つ。命中時に自身を回復・加速。弾は壁や他の生物で止まる。'

def sync_projectile_profiles(profile,data):
 pattern=r'(\["hakkai:(foe_[0-7]_[0-9]+)", )(\{[^\r\n]*\})(\])'
 style=(BP/'mob_shot_styles.js').read_text(encoding='utf8')
 match=re.search(r'TWIN_CREATURES=Object\.freeze\(\[(.*?)\]\)',style,re.S)
 if not match:raise ValueError('missing twin-shot list')
 twins=re.findall(r"'((?:foe|wild)_[0-7]_[0-9]+)'",match.group(1))
 if len(twins)!=30 or len(set(twins))!=30:raise ValueError('unexpected twin-shot list')
 twins=set(twins)
 records=[]
 def rewrite(m):
  obj=json.loads(m.group(3))
  if obj['temper']=='hostile' and obj['talent'] in PROJECTILE_EFFECTS:
   obj['actionDetail']=projectile_detail(obj['talent'],obj['variant'],obj['id'] in twins);records.append(obj)
  return m.group(1)+json.dumps(obj,ensure_ascii=False)+m.group(4)
 profile=re.sub(pattern,rewrite,profile)
 for obj in records:
  pattern=r'\{"id":"'+re.escape(obj['id'])+r'"[^{}]*\}'
  def wildlife(m):
   row=json.loads(m.group());row['lore']=projectile_detail(obj['talent'],obj['variant'],obj['id'] in twins);return json.dumps(row,ensure_ascii=False,separators=(',',':'))
  data,count=re.subn(pattern,wildlife,data)
  if count!=1:raise ValueError('missing projectile wildlife '+obj['id'])
 if len(records)!=60:raise ValueError(f'expected 60 projectile foes, got {len(records)}')
 if not (twins-{'wild_3_2','wild_5_2'})<={obj['id'] for obj in records}:raise ValueError('twin-shot profile missing')
 return profile,data

BURST_DETAILS={
 'foe_0_10':'構えの後、自身から前後左右へ刃の波を広げ、当たった相手を押し返す。壁で止まる。',
 'foe_2_10':'構えの後、自身から前方に広い扇形の砂の波を広げ、当たった相手を押し返す。壁で止まる。',
 'foe_3_10':'構えの後、自身から前方へ雪崩のような扇形の波を広げ、当たった相手を押し返す。壁で止まる。',
 'foe_4_8':'構えの後、自身から前方へ細い雷の波を放ち、当たった相手を押し返す。壁で止まる。',
 'foe_5_10':'構えの後、自身から全方向へ響きの波を広げ、当たった相手を押し返す。壁で止まる。',
 'foe_6_8':'翼を広げた後、自身の左右へ風の波を広げ、当たった相手を押し返す。壁で止まる。',
 'foe_7_11':'構えの後、自身から斜め四方向へ時の波を広げ、当たった相手を押し返す。壁で止まる。',
}
def sync_burst_profiles(profile,data):
 for id,detail in BURST_DETAILS.items():
  pat=r'(\["hakkai:'+re.escape(id)+r'", )(\{[^\r\n]*\})(\])'
  def record(m):
   row=json.loads(m.group(2))
   if row['talent']!='burst':raise ValueError('unexpected burst talent '+id)
   row['actionDetail']=detail;return m.group(1)+json.dumps(row,ensure_ascii=False)+m.group(3)
  profile,count=re.subn(pat,record,profile)
  if count!=1:raise ValueError('missing burst profile '+id)
  pat=r'\{"id":"'+re.escape(id)+r'"[^{}]*\}'
  def wildlife(m):
   row=json.loads(m.group());row['lore']=detail;return json.dumps(row,ensure_ascii=False,separators=(',',':'))
  data,count=re.subn(pat,wildlife,data)
  if count!=1:raise ValueError('missing burst guide '+id)
 return profile,data

RUSH_DETAILS={
 'foe_0_0':'構えの後、狙った相手へ跳び、体が接触する距離で一撃を放つ。壁があれば中止する。',
 'foe_2_1':'構えの後、小さく跳ねながら追撃し、体が接触する距離で一撃を放つ。壁があれば中止する。',
 'foe_4_0':'構えの後、重く踏み込み、体が接触する距離で一撃を放つ。壁があれば中止する。',
 'foe_0_2':'構えの後、岩の体で踏み込み、接触する距離で一撃を放つ。壁があれば中止する。',
 'foe_1_2':'構えの後、角を向けて踏み込み、接触する距離で一撃を放つ。壁があれば中止する。',
 'foe_2_2':'構えの後、角を向けて踏み込み、接触する距離で一撃を放つ。地形は変わらず、壁があれば中止する。',
 'foe_3_2':'構えの後、氷の体で踏み込み、接触する距離で一撃を放つ。壁があれば中止する。',
 'foe_4_2':'構えの後、素早く踏み込み、体が接触する距離で一撃を放つ。壁があれば中止する。',
 'foe_5_2':'構えの後、晶の体で踏み込み、接触する距離で一撃を放つ。地形は変わらず、壁があれば中止する。',
 'foe_6_2':'構えの後、風のように踏み込み、体が接触する距離で一撃を放つ。壁があれば中止する。',
 'foe_7_2':'構えの後、鋼の体で踏み込み、接触する距離で一撃を放つ。壁があれば中止する。',
 'foe_2_11':'構えの後、重く踏み込み、体が接触する距離で一撃を放つ。壁があれば中止する。',
}
def sync_rush_profiles(profile,data):
 for id,detail in RUSH_DETAILS.items():
  pat=r'(\["hakkai:'+re.escape(id)+r'", )(\{[^\r\n]*\})(\])'
  def record(m):
   row=json.loads(m.group(2))
   if row['talent'] not in ('charge','leap'):raise ValueError('unexpected rush talent '+id)
   row['actionDetail']=detail;return m.group(1)+json.dumps(row,ensure_ascii=False)+m.group(3)
  profile,count=re.subn(pat,record,profile)
  if count!=1:raise ValueError('missing rush profile '+id)
  pat=r'\{"id":"'+re.escape(id)+r'"[^{}]*\}'
  def wildlife(m):
   row=json.loads(m.group());row['lore']=detail;return json.dumps(row,ensure_ascii=False,separators=(',',':'))
  data,count=re.subn(pat,wildlife,data)
  if count!=1:raise ValueError('missing rush guide '+id)
 return profile,data

GUARD_TRAITS={
 'foe_2_0':'速度上昇','foe_5_0':'再生','foe_0_3':'再生','foe_1_3':'再生',
 'foe_2_3':'耐火','foe_3_3':'速度上昇','foe_4_3':'速度上昇','foe_5_3':'再生',
 'foe_6_3':'落下速度低下','foe_7_3':'速度上昇','foe_0_11':'落下速度低下',
 'foe_1_8':'速度上昇','foe_2_8':'耐火','foe_3_9':'落下速度低下',
 'foe_4_10':'攻撃力上昇','foe_6_10':'落下速度低下','foe_7_8':'速度上昇',
}
def sync_guard_profiles(profile,data):
 for id,trait in GUARD_TRAITS.items():
  pat=r'(\["hakkai:'+re.escape(id)+r'", )(\{[^\r\n]*\})(\])'
  detail=None
  def record(m):
   nonlocal detail
   row=json.loads(m.group(2));talent=row['talent']
   if talent not in ('ward','armor'):raise ValueError('unexpected guard talent '+id)
   detail=('構えの後、自身に耐性と攻撃力上昇を与え、さらに短い'+trait+'を得る。' if talent=='armor' else '構えの後、自身と近くの同界生物に耐性を与え、自身は短い'+trait+'を得る。')+'打撃は壁に遮られない接触距離だけ。'
   row['actionDetail']=detail;return m.group(1)+json.dumps(row,ensure_ascii=False)+m.group(3)
  profile,count=re.subn(pat,record,profile)
  if count!=1:raise ValueError('missing guard profile '+id)
  pat=r'\{"id":"'+re.escape(id)+r'"[^{}]*\}'
  def wildlife(m):
   row=json.loads(m.group());row['lore']=detail;return json.dumps(row,ensure_ascii=False,separators=(',',':'))
  data,count=re.subn(pat,wildlife,data)
  if count!=1:raise ValueError('missing guard guide '+id)
 return profile,data

def outputs():
 paths=[BP/'mob_content.js',BP/'data.js']; originals=[p.read_bytes().decode('utf8') for p in paths];profile,data=originals
 for id,values in OVERRIDES.items():
  profile=replace_profile(profile,id,values);data=replace_wildlife(data,id,values)
 profile,data=sync_projectile_profiles(profile,data)
 profile,data=sync_burst_profiles(profile,data)
 profile,data=sync_rush_profiles(profile,data)
 profile,data=sync_guard_profiles(profile,data)
 return dict(zip(paths,(profile.encode('utf8'),data.encode('utf8'))))

def main():
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
 for path,data in outputs().items():
  if a.write:path.write_bytes(data)
  elif path.read_bytes()!=data:raise SystemExit('thematic profiles stale: '+str(path))
 print(f'{len(OVERRIDES)} thematic creature profiles and guide descriptions '+('written' if a.write else 'verified')+' (gameplay changes, not engine tested)')
if __name__=='__main__':main()

#!/usr/bin/env python3
"""Align 24 wildlife guide entries with existing runtime behavior.
Changes presentation text only: not talent, variant, IDs, AI, drops or effects.
"""
import argparse,json,re
from pathlib import Path
FILE=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js'
PATTERN=re.compile(r'(\["hakkai:(wild_[0-7]_[012])", )(\{[^\r\n]*\})(\])')
# The per-ID descriptions follow the current body or moving-shot paths.
# They do not promise splash, reflected damage, or damage on a later landing.
HOSTILE={
 'wild_0_2':('thorns','棘の一撃','構えの後、狙った方向へ棘の弾を放ち、命中した相手を鈍らせる。壁や他の生物で止まる。'),
 'wild_1_2':('leap','夜霧の跳躍','構えた後、狙った相手へ跳び、体が接触する距離で一撃を放つ。壁があれば中止する。'),
 'wild_2_2':('armor','石像の構え','攻撃されると短く硬化。構えの後は耐性・攻撃力上昇・短い耐火を得て、遮られない接触距離の相手に一撃。'),
 'wild_3_2':('frost','霜縛り','構えの後、弧を描く二筋の冷気の弾を放ち、命中した相手の移動と採掘を鈍らせる。壁や他の生物で止まる。'),
 'wild_4_2':('charge','岩兵の踏み込み','構えた後、狙った相手へ重く踏み込み、体が接触する距離で一撃を放つ。壁があれば中止する。'),
 'wild_5_2':('web','影蜘蛛の糸','構えの後、蛇行する二筋の糸の弾を放ち、命中した相手を鈍らせる。壁や他の生物で止まる。'),
 'wild_6_2':('gust','逆巻き風','構えの後、左に弧を描く風の弾を放ち、命中した相手を吹き飛ばす。壁や他の生物で止まる。'),
 'wild_7_2':('time','逆秒針','構えの後、浮き上がりながら蛇行する時の弾を放ち、命中した相手に鈍足・弱体化・盲目を与える。壁や他の生物で止まる。'),
}
SHY_LABELS=('跳躍','緩やかな落下','跳躍','速度上昇','緩やかな落下','跳躍','緩やかな落下','速度上昇')
SHY_TEXTS=('短い跳躍力上昇を自身に付ける。','短い落下速度低下を自身に付ける。','短い跳躍力上昇を自身に付ける。','短い速度上昇を自身に付ける。','短い落下速度低下を自身に付ける。','短い跳躍力上昇を自身に付ける。','短い落下速度低下を自身に付ける。','短い速度上昇を自身に付ける。')
NEUTRAL_LABELS=('跳躍','回復','攻撃力','緩やかな落下','跳躍','回復','緩やかな落下','速度')
NEUTRAL_TEXTS=('近くの同界生物に短い跳躍力上昇を付ける。','近くの同界生物に短い再生を付ける。','近くの同界生物に短い攻撃力上昇を付ける。','近くの同界生物に短い落下速度低下を付ける。','近くの同界生物に短い跳躍力上昇を付ける。','近くの同界生物に短い再生を付ける。','近くの同界生物に短い落下速度低下を付ける。','近くの同界生物に短い速度上昇を付ける。')
def desired():
 raw=FILE.read_bytes().decode('utf8');found=[]
 def replace(m):
  obj=json.loads(m.group(3));id=m.group(2);found.append(id)
  if obj.get('id')!=id:raise ValueError(id)
  prev=obj['actionKey'];mode=obj.get('temper');idx=obj['realm']
  if mode=='passive':
   if obj['talent']!='shy':raise ValueError(id)
   label='逃げ足';detail='プレイヤーが近づくと、近くの床と空きを確認して離れる方向へ動き、短く加速する。安全な候補がなければ動かない。'
   obj['signatureName']='身かわしの'+SHY_LABELS[idx]+'・'+obj['realmName']+'式'
   obj['signatureDetail']='逃げる時、'+SHY_TEXTS[idx]
  elif mode=='neutral':
   if obj['talent']!='defend':raise ValueError(id)
   label='仲間守り';detail='プレイヤーが近くにいる時、近くの同界生物に短い耐性を与える。攻撃を受けると短く加速する。'
   obj['signatureName']='仲間支援の'+NEUTRAL_LABELS[idx]+'・'+obj['realmName']+'式'
   obj['signatureDetail']='支援時、'+NEUTRAL_TEXTS[idx]
  elif mode=='hostile':
   talent,label,detail=HOSTILE[id]
   if obj['talent']!=talent:raise ValueError(id)
  else:raise ValueError(id)
  obj['actionKey']=label;obj['actionName']=obj['name']+'・'+label;obj['actionDetail']=detail
  obj['lore']=obj['lore'].replace('固有技「'+prev+'」','固有技「'+label+'」')
  return m.group(1)+json.dumps(obj,ensure_ascii=False)+m.group(4)
 out=PATTERN.sub(replace,raw)
 if len(found)!=24 or len(set(found))!=24:raise ValueError('expected 24 unique wild profiles')
 return out.encode('utf8')
def main():
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args();data=desired()
 if a.write:FILE.write_bytes(data)
 elif FILE.read_bytes()!=data:raise SystemExit('wildlife behavior descriptions stale')
 print('24 wildlife action descriptions and 16 non-hostile signature descriptions '+('written' if a.write else 'verified')+'; descriptions synchronized')
if __name__=='__main__':main()

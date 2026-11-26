#!/usr/bin/env python3
"""Synchronize hostile signature descriptions with the existing switch.
No signature ids, effects, abilities, or neutral/passive guides are changed.
"""
import argparse,json,re
from pathlib import Path
FILE=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js'
# signatureEcho in mob_system.js; applied to the primary target only after an
# accepted hit at range < 12, not a second attack and not a persistent hazard.
EFFECTS=(
 '相手の周囲に短く追跡粒子を表示する。',
 '相手の攻撃力を短く下げる。',
 '相手の移動を短く鈍らせる。',
 '相手に短い毒を与える。',
 '相手の視界を短く暗くする。',
 '相手を少し押し、落下を緩やかにする。',
 '相手を押し返す。',
 '自身に短い耐性を付ける。',
 '自身の移動速度を短く上げる。',
 '自身の体力を少し回復する。',
 '相手の攻撃力を短く下げる。',
 '相手の採掘速度を短く下げる。',
 '相手の移動を短く鈍らせる。',
 '相手の周囲に短く追跡粒子を表示し、攻撃力を下げる。',
 '自身を少し回復し、短い耐性を付ける。',
)
PREFIX='固有技が近距離で命中した場合、'
PATTERN=re.compile(r'(\["hakkai:[^"]+", )(\{[^\r\n]*\})(\])')
def desired():
 raw=FILE.read_bytes().decode('utf8');count=0
 def transform(m):
  nonlocal count
  obj=json.loads(m.group(2))
  if obj.get('temper')!='hostile':return m.group(0)
  count+=1;description=PREFIX+EFFECTS[obj['signatureId']%15]
  # Replace only a JSON string token, preserving the file's other formatting.
  token='"signatureDetail": '+json.dumps(obj['signatureDetail'],ensure_ascii=False)
  if m.group(2).count(token)!=1:raise ValueError('signature field '+obj['id'])
  return m.group(1)+m.group(2).replace(token,'"signatureDetail": '+json.dumps(description,ensure_ascii=False),1)+m.group(3)
 out=PATTERN.sub(transform,raw)
 if count!=104:raise ValueError(f'expected 104 hostile profiles, got {count}')
 return out.encode('utf8')
def main():
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args();data=desired()
 if a.write:FILE.write_bytes(data)
 elif FILE.read_bytes()!=data:raise SystemExit('hostile signature descriptions out of date')
 print('104 hostile signature descriptions '+('written' if a.write else 'verified')+'; descriptions synchronized')
if __name__=='__main__':main()

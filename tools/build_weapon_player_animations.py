#!/usr/bin/env python3
"""Build weapon-class player poses; model-only, not a Bedrock rendering test."""
import argparse,hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'Hakkai_v7.1.0/ResourcePack/animations/weapon_player.animation.json'
UNIQUE_OUT=ROOT/'Hakkai_v7.1.0/ResourcePack/animations/weapon_individual.animation.json'
KIND_IDS={'剣':'sword','斧':'axe','弓':'bow','杖':'staff','ハンマー':'hammer','槍':'spear','盾':'shield','扇':'fan'}
# right arm, left arm, torso, right leg, left leg; windup then impact.
# Separate stances intentionally reflect each weapon's handling, not damage.
POSES={
 'sword':([[-58,8,32],[-18,0,-16],[0,-16,0],[8,0,0],[-8,0,0]],[[-102,-20,-34],[-32,0,-18],[5,19,0],[-8,0,0],[8,0,0]]),
 'axe':([[-145,12,18],[-48,0,-30],[-10,-10,0],[10,0,0],[-10,0,0]],[[-40,-10,-14],[-40,0,-22],[18,8,0],[-9,0,0],[9,0,0]]),
 'bow':([[-76,22,5],[-84,-24,-5],[0,-12,0],[4,0,0],[-4,0,0]],[[-98,4,-8],[-88,-4,-7],[0,7,0],[-3,0,0],[3,0,0]]),
 'staff':([[-48,-10,24],[-35,0,-26],[0,-12,0],[4,0,0],[-4,0,0]],[[-120,-8,-5],[-58,0,-42],[7,10,0],[-5,0,0],[5,0,0]]),
 'hammer':([[-150,12,12],[-118,-18,-20],[-12,-12,0],[12,0,0],[-12,0,0]],[[-38,-12,-8],[-35,10,10],[22,8,0],[-12,0,0],[12,0,0]]),
 'spear':([[-72,18,12],[-32,-14,-30],[0,-18,0],[12,0,0],[-12,0,0]],[[-128,-5,-5],[-55,0,-15],[8,13,0],[-10,0,0],[10,0,0]]),
 'shield':([[-28,0,18],[-45,12,-40],[0,-14,0],[10,0,0],[-10,0,0]],[[-48,-5,12],[-105,-10,-20],[13,12,0],[-10,0,0],[10,0,0]]),
 'fan':([[-50,5,48],[-30,0,-42],[0,-20,0],[6,0,0],[-6,0,0]],[[-105,-18,-48],[-48,0,-28],[3,22,0],[-6,0,0],[6,0,0]])}
BONES=('rightarm','leftarm','body','rightleg','leftleg')
def scale(v,k):return [round(max(-170,min(170,x*k)),2) for x in v]
def flip(v):return [v[0],-v[1],-v[2]]
def generate():
 animations={}
 for kind,(wind,hit) in POSES.items():
  for phase in ('attack_a','attack_b','charged','ultimate'):
   duration={'attack_a':.34,'attack_b':.36,'charged':.52,'ultimate':.82}[phase]
   bones={}
   for bone,a,b in zip(BONES,wind,hit):
    if phase=='attack_b':a,b=flip(a),flip(b)
    if phase=='charged':a,b=scale(a,1.08),scale(b,1.12)
    if phase=='ultimate':a,b=scale(a,1.2),scale(b,1.28)
    # Script damage is immediate; bring the visible strike near the start
    # rather than making players wait for a long windup after the hit.
    bones[bone]={'rotation':{'0.0':[0,0,0],f'{duration*.10:.3f}':a,f'{duration*.25:.3f}':b,f'{duration:.3f}':[0,0,0]}}
   animations[f'animation.hakkai.weapon_{kind}_{phase}']={'loop':False,'animation_length':duration,'bones':bones}
 # Each of the eight boss-derived player blades has its own skill flourish;
 # their shared sword class still uses the two standard attacks and ultimate.
 wind,hit=POSES['sword']
 for i in range(8):
  duration=.44+i*.015;bones={}
  for bone,a,b in zip(BONES,wind,hit):
   if i%2:a,b=flip(a),flip(b)
   a,b=scale(a,1+i*.035),scale(b,1+i*.04)
   bones[bone]={'rotation':{'0.0':[0,0,0],f'{duration*.12:.3f}':a,f'{duration*.30:.3f}':b,f'{duration:.3f}':[0,0,0]}}
  animations[f'animation.hakkai.warden_blade_skill_{i}']={'loop':False,'animation_length':duration,'bones':bones}
 return (json.dumps({'format_version':'1.8.0','animations':animations},indent=2)+'\n').encode()
def unique():
 source=(ROOT/'Hakkai_v7.1.0/BehaviorPack/scripts/data.js').read_text(encoding='utf8')
 rows=json.loads(re.search(r'^export const catalog=(\[.*\]);$',source,re.M)[1])
 rows=[(x['id'],KIND_IDS[x['kind']]) for x in rows if x['kind'] in KIND_IDS]
 rows += [('ult_sword','sword'),('ult_axe','axe')]+[(f'warden_blade_{i}','sword') for i in range(8)]
 assert len(rows)==105 and len({ident for ident,_ in rows})==105
 result={}
 for ident,kind in rows:
  digest=hashlib.sha256(ident.encode()).digest();wind,hit=POSES[kind]
  # Stable per-weapon choreography: independently vary windup, strike angles,
  # torso counter-rotation and tempo. This is procedural, not hand-authored.
  duration_base=.32+(digest[0]%9)*.009
  for phase in ('attack_a','attack_b','forward','back','left','right','charged','ultimate'):
   duration=round(duration_base*({'charged':1.5,'ultimate':2.15}.get(phase,1)),3)
   bones={}
   for index,(bone,a0,b0) in enumerate(zip(BONES,wind,hit)):
    a=a0[:];b=b0[:];a[0]+=((digest[1+index]%9)-4)*2;b[0]+=((digest[6+index]%9)-4)*2
    a[1]+=((digest[11+index]%9)-4)*2;b[2]+=((digest[16+index]%9)-4)*2
    if phase in ('attack_b','left'):a,b=flip(a),flip(b)
    if phase in ('left','right'):
     sign=-1 if phase=='left' else 1;a[1]+=sign*9;b[1]+=sign*13
    if phase=='forward':a[0]-=8;b[0]+=7
    if phase=='back':a[0]+=8;b[0]-=7
    if phase=='charged':a,b=scale(a,1.08),scale(b,1.12)
    if phase=='ultimate':a,b=scale(a,1.2),scale(b,1.25)
    bones[bone]={'rotation':{'0.0':[0,0,0],f'{duration*.10:.3f}':a,f'{duration*.25:.3f}':b,f'{duration:.3f}':[0,0,0]}}
   result[f'animation.hakkai.unique_weapon_{ident}_{phase}']={'loop':False,'animation_length':duration,'bones':bones}
 return (json.dumps({'format_version':'1.8.0','animations':result},separators=(',',':'))+'\n').encode()
if __name__=='__main__':
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');a=p.parse_args()
 for path,data in ((OUT,generate()),(UNIQUE_OUT,unique())):
  if a.write:path.write_bytes(data)
  elif not path.exists() or path.read_bytes()!=data:raise SystemExit(f'Weapon player animations out of date: {path}')
 print('32 class, 8 blade skills, 840 per-weapon/direction animations '+('written' if a.write else 'verified')+'; real Bedrock rendering unverified')

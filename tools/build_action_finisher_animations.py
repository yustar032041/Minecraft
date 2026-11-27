#!/usr/bin/env python3
"""Build ten explicitly choreographed finisher poses (not a client rendering test)."""
import argparse,json
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack/animations/action_finishers.animation.json'
# For each weapon: windup/impact/recovery angles for root, torso, both arms
# and both legs. No weapon-ID hash or random parameters are used.
POSES={
 'warden_0':{'root':[[0,0,0],[0,200,0],[0,360,0]],'body':[[-10,-25,0],[20,30,0],[0,0,0]],'rightarm':[[-130,10,55],[-80,-30,-70],[0,0,0]],'leftarm':[[-35,0,-40],[-60,10,30],[0,0,0]],'rightleg':[[30,0,0],[-35,0,0],[0,0,0]],'leftleg':[[-30,0,0],[35,0,0],[0,0,0]]},
 'warden_1':{'root':[[0,-35,0],[0,65,0],[0,0,0]],'body':[[0,-35,-15],[5,40,15],[0,0,0]],'rightarm':[[-90,40,70],[-115,-40,-70],[0,0,0]],'leftarm':[[-45,-25,-40],[-55,25,30],[0,0,0]],'rightleg':[[5,-15,-20],[-10,15,20],[0,0,0]],'leftleg':[[-5,-15,-20],[10,15,20],[0,0,0]]},
 'warden_2':{'root':[[0,0,0],[0,60,0],[0,0,0]],'body':[[-25,-20,0],[40,20,0],[0,0,0]],'rightarm':[[-165,5,25],[-25,-10,-30],[0,0,0]],'leftarm':[[-135,-20,-25],[-35,10,15],[0,0,0]],'rightleg':[[20,0,0],[-25,0,0],[0,0,0]],'leftleg':[[-20,0,0],[25,0,0],[0,0,0]]},
 'warden_3':{'root':[[0,-15,0],[0,15,0],[0,0,0]],'body':[[-10,-20,0],[20,15,0],[0,0,0]],'rightarm':[[-65,0,35],[-145,0,-10],[0,0,0]],'leftarm':[[-40,-10,-35],[-80,5,-15],[0,0,0]],'rightleg':[[35,0,0],[-30,0,0],[0,0,0]],'leftleg':[[-25,0,0],[35,0,0],[0,0,0]]},
 'warden_4':{'root':[[0,-50,0],[0,50,0],[0,0,0]],'body':[[-20,-30,0],[25,30,0],[0,0,0]],'rightarm':[[-150,15,35],[-65,-20,-50],[0,0,0]],'leftarm':[[-75,-20,-40],[-45,20,15],[0,0,0]],'rightleg':[[55,0,0],[-45,0,0],[0,0,0]],'leftleg':[[-45,0,0],[55,0,0],[0,0,0]]},
 'warden_5':{'root':[[0,45,0],[0,-60,0],[0,0,0]],'body':[[15,35,20],[-15,-45,-20],[0,0,0]],'rightarm':[[-70,-40,-70],[-115,40,65],[0,0,0]],'leftarm':[[-40,30,30],[-75,-30,-40],[0,0,0]],'rightleg':[[-20,0,20],[30,0,-20],[0,0,0]],'leftleg':[[20,0,20],[-30,0,-20],[0,0,0]]},
 'warden_6':{'root':[[0,0,0],[0,180,0],[0,360,0]],'body':[[-30,0,0],[30,0,0],[0,0,0]],'rightarm':[[-120,0,80],[-65,-25,-85],[0,0,0]],'leftarm':[[-100,0,-80],[-55,25,85],[0,0,0]],'rightleg':[[50,0,0],[-40,0,0],[0,0,0]],'leftleg':[[-40,0,0],[50,0,0],[0,0,0]]},
 'warden_7':{'root':[[0,0,0],[0,-180,0],[0,-360,0]],'body':[[10,20,0],[-10,-20,0],[0,0,0]],'rightarm':[[-110,40,70],[-110,-40,-70],[0,0,0]],'leftarm':[[-70,-20,-50],[-70,20,50],[0,0,0]],'rightleg':[[20,0,10],[-20,0,-10],[0,0,0]],'leftleg':[[-20,0,10],[20,0,-10],[0,0,0]]},
 'ult_sword':{'root':[[0,-20,0],[0,240,0],[0,360,0]],'body':[[-20,-35,0],[25,35,0],[0,0,0]],'rightarm':[[-150,30,65],[-70,-35,-75],[0,0,0]],'leftarm':[[-70,-30,-55],[-70,30,55],[0,0,0]],'rightleg':[[40,0,0],[-40,0,0],[0,0,0]],'leftleg':[[-40,0,0],[40,0,0],[0,0,0]]},
 'ult_axe':{'root':[[0,0,0],[0,120,0],[0,0,0]],'body':[[-35,-25,0],[45,25,0],[0,0,0]],'rightarm':[[-170,20,30],[-20,-15,-40],[0,0,0]],'leftarm':[[-150,-25,-30],[-30,15,20],[0,0,0]],'rightleg':[[30,0,0],[-35,0,0],[0,0,0]],'leftleg':[[-30,0,0],[35,0,0],[0,0,0]]}
}
def build():
 anim={}
 for name,bones in POSES.items():
  tracks={}
  for bone,(windup,impact,end) in bones.items():
   tracks[bone]={'rotation':{'0.0':[0,0,0],'0.15':windup,'0.35':impact,'0.72':end}}
  anim[f'animation.hakkai.action_finisher_{name}']={'loop':False,'animation_length':.72,'bones':tracks}
 return (json.dumps({'format_version':'1.8.0','animations':anim},indent=2)+'\n').encode()
if __name__=='__main__':
 p=argparse.ArgumentParser();group=p.add_mutually_exclusive_group(required=True);group.add_argument('--write',action='store_true');group.add_argument('--check',action='store_true');args=p.parse_args()
 data=build()
 if args.write:OUT.write_bytes(data)
 elif not OUT.exists() or OUT.read_bytes()!=data:raise SystemExit('Action finisher animations are out of date')
 print('10 authored finisher poses verified/generated; Bedrock rendering unverified')

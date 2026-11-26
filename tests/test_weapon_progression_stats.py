"""Weapon progression and item/catalog consistency; no game damage is simulated."""
import json,re,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];bp=root/'Hakkai_v7.1.0/BehaviorPack'
subprocess.run([sys.executable,str(root/'tools/sync_weapon_progression.py'),'--check'],cwd=root,check=True)
policy=json.loads((root/'tools/weapon_progression_policy.json').read_text());assert len(policy)==23
rows={x['id']:x for x in policy}
assert rows['gear_129']['old']['damage']==9 and rows['gear_129']['new']['damage']==31
assert rows['gear_177']['old']['damage']==7 and rows['gear_177']['new']['damage']==29
assert rows['gear_180']['old']['damage']==10 and rows['gear_180']['new']['damage']==29
assert all(x['new']['damage']>x['old']['damage'] and x['new']['durability']>x['old']['durability'] for x in policy)
print('23 weapon upgrade corrections and all 141 catalog/item links verified (static only)')

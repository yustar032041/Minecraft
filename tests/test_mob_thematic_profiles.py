"""Static synchronization, not Bedrock gameplay or animation validation."""
import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import sync_mob_thematic_profiles as sync

class ThematicProfiles(unittest.TestCase):
 def test_sync_idempotent(self):
  for path,expected in sync.outputs().items():self.assertEqual(path.read_bytes(),expected,str(path))
 def test_clients_and_desert_impact_animations_are_synchronized(self):
  subprocess.run(['node','--experimental-default-type=module','tools/sync_talent_attack_visuals.mjs','--check'],cwd=ROOT,check=True)
  subprocess.run([sys.executable,'tools/sync_desert_foe_visuals.py','--check'],cwd=ROOT,check=True)
 def test_all_curated_profiles_match_player_guide(self):
  scripts=ROOT/'Hakkai_v7.1.0/BehaviorPack/scripts'
  # Use JS itself to access the two runtime exports, preserving identifier
  # and signature fields instead of inventing a parallel JSON representation.
  code="""import {mobContent} from './Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {wildlife} from './Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {hasTwinShot} from './Hakkai_v7.1.0/BehaviorPack/scripts/mob_shot_styles.js';
console.log(JSON.stringify([...mobContent.values()].map(p=>[p,wildlife.find(w=>w.id===p.id),hasTwinShot(p)])));"""
  result=subprocess.run(['node','--experimental-default-type=module','-e',code],cwd=ROOT,check=True,capture_output=True,text=True)
  records={p['id']:(p,w,twin) for p,w,twin in json.loads(result.stdout) if p['id'] in sync.OVERRIDES}
  self.assertEqual(set(records),set(sync.OVERRIDES))
  for id,(_,talent,label,detail,role,lore) in sync.OVERRIDES.items():
   p,w,twin=records[id];self.assertEqual(p['talent'],talent,id);self.assertEqual(w['talent'],talent,id)
   self.assertEqual(p['actionKey'],label,id)
   updated=True
   if talent in sync.PROJECTILE_EFFECTS:expected=sync.projectile_detail(talent,p['variant'],twin)
   elif id in sync.BURST_DETAILS:expected=sync.BURST_DETAILS[id]
   elif id in sync.RUSH_DETAILS:expected=sync.RUSH_DETAILS[id]
   elif id in sync.GUARD_TRAITS:
    expected=p['actionDetail'];self.assertIn(sync.GUARD_TRAITS[id],expected,id);self.assertIn('接触距離',expected,id)
   else:expected=detail;updated=False
   self.assertEqual(p['actionDetail'],expected,id)
   self.assertEqual(w['role'],role,id);self.assertEqual(w['lore'],expected if updated else lore,id)
   self.assertIn('固有技「'+label+'」',p['lore'])
if __name__=='__main__':unittest.main()

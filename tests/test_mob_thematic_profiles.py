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
console.log(JSON.stringify([...mobContent.values()].map(p=>[p,wildlife.find(w=>w.id===p.id)])));"""
  result=subprocess.run(['node','--experimental-default-type=module','-e',code],cwd=ROOT,check=True,capture_output=True,text=True)
  records={p['id']:(p,w) for p,w in json.loads(result.stdout) if p['id'] in sync.OVERRIDES}
  self.assertEqual(set(records),set(sync.OVERRIDES))
  for id,(_,talent,label,detail,role,lore) in sync.OVERRIDES.items():
   p,w=records[id];self.assertEqual(p['talent'],talent,id);self.assertEqual(w['talent'],talent,id)
   self.assertEqual(p['actionKey'],label,id);self.assertEqual(p['actionDetail'],detail,id)
   self.assertEqual(w['role'],role,id);self.assertEqual(w['lore'],lore,id)
   self.assertIn('固有技「'+label+'」',p['lore'])
if __name__=='__main__':unittest.main()

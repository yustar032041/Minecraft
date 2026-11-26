import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import sync_mob_signature_descriptions as sync
class SignatureDescriptions(unittest.TestCase):
 def test_idempotent(self):self.assertEqual(sync.FILE.read_bytes(),sync.desired())
 def test_all_descriptions_match_runtime_signature_style(self):
  code="import {mobContentList} from './Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js'; console.log(JSON.stringify(mobContentList.filter(x=>x.temper==='hostile')));"
  r=subprocess.run(['node','--experimental-default-type=module','-e',code],cwd=ROOT,check=True,capture_output=True,text=True)
  profiles=json.loads(r.stdout);self.assertEqual(len(profiles),104)
  for x in profiles:self.assertEqual(x['signatureDetail'],sync.PREFIX+sync.EFFECTS[x['signatureId']%15],x['id'])
if __name__=='__main__':unittest.main()

from pathlib import Path
import json, re, unittest
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
RP = ROOT/'Hakkai_v7.1.0/ResourcePack'

class MusicAssets(unittest.TestCase):
 def test_sources_and_audio(self):
  sources=sorted((ROOT/'music/warden_sources').glob('*.strudel.js'))
  self.assertEqual(len(sources),5)
  definitions=json.loads((RP/'sounds/sound_definitions.json').read_text())['sound_definitions']
  ticks=[937,1372,613,1325,747]
  for i,src in enumerate(sources,1):
   self.assertRegex(src.read_text(),r'Tempo:\s*\d+')
   entry=definitions[f'hakkai.warden_phase_{i}'];self.assertEqual(entry['category'],'music')
   sound=entry['sounds'][0];self.assertTrue(sound['stream']);self.assertEqual(sound['name'],f'sounds/hakkai/warden_phase_{i}')
   path=RP/(sound['name']+'.ogg');info=sf.info(path)
   self.assertEqual((info.format,info.subtype,info.samplerate,info.channels),('OGG','VORBIS',32000,2))
   self.assertAlmostEqual(info.duration,ticks[i-1]/20,places=2)
   data,_=sf.read(path,dtype='float32');self.assertTrue(np.isfinite(data).all());self.assertLess(np.abs(data).max(),1)
   self.assertGreater(np.sqrt(np.mean(data**2)),.015)
   self.assertLess(np.max(np.abs(data[0]-data[-1])),.02)
if __name__=='__main__': unittest.main()

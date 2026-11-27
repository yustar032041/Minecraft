"""Tests for the isolation rig; these do not run Bedrock or render anything."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('hud_repro', ROOT / 'tools/build_hud_repro.py')
rig = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rig)


def fake_source():
    bp = {'header': {'uuid': str(uuid.uuid4()), 'name': 'BP', 'version': [7, 1, 64]},
          'modules': [{'uuid': str(uuid.uuid4()), 'type': 'data', 'version': [7, 1, 64]}],
          'dependencies': [{'uuid': 'original-resource', 'version': [7, 1, 64]},
                           {'module_name': '@minecraft/server', 'version': '2.11.0'}]}
    rp = {'header': {'uuid': 'original-resource', 'name': 'RP', 'version': [7, 1, 64]},
          'modules': [{'uuid': str(uuid.uuid4()), 'type': 'resources', 'version': [7, 1, 64]}]}
    return {'BehaviorPack': {'manifest.json': json.dumps(bp).encode(), 'scripts/main.js': b'unchanged'},
            'ResourcePack': {'manifest.json': json.dumps(rp).encode(), rig.HUD: b'hud', 'textures/x.png': b'pixels'}}


class ReproRigTests(unittest.TestCase):
    def test_cases_and_identity(self):
        original = fake_source()
        cases = {case: rig.make_case(original, case) for case in rig.CASES}
        for case, data in cases.items():
            rig.verify_case(original, data, case)
            rp = json.loads(data['ResourcePack']['manifest.json'])
            bp = json.loads(data['BehaviorPack']['manifest.json'])
            self.assertTrue(any(d.get('uuid') == rp['header']['uuid'] and d['version'] == rp['header']['version'] for d in bp['dependencies']))
            self.assertEqual(data, rig.make_case(original, case))
        self.assertEqual(len({rig.identity(case, 'ResourcePack:header') for case in rig.CASES}), 3)
        self.assertIn(rig.HUD, cases['A_control']['ResourcePack'])
        self.assertIn(rig.HUD, cases['A2_identity_control']['ResourcePack'])
        self.assertNotIn(rig.HUD, cases['B_without_hud_ui']['ResourcePack'])
        self.assertEqual(original['BehaviorPack']['scripts/main.js'], b'unchanged')

    def test_fault_injection(self):
        original = fake_source()
        good = rig.make_case(original, 'B_without_hud_ui')
        for pack, name, payload in [('ResourcePack', 'textures/x.png', b'damaged'),
                                    ('BehaviorPack', 'scripts/main.js', b'damaged'),
                                    ('ResourcePack', 'manifest.json', b'{}'),
                                    ('ResourcePack', rig.HUD, b'hud')]:
            broken = copy.deepcopy(good)
            broken[pack][name] = payload
            with self.assertRaises(ValueError):
                rig.verify_case(original, broken, 'B_without_hud_ui')
        broken = copy.deepcopy(good)
        del broken['BehaviorPack']['scripts/main.js']
        with self.assertRaises(ValueError):
            rig.verify_case(original, broken, 'B_without_hud_ui')
        broken = copy.deepcopy(good)
        manifest = json.loads(broken['ResourcePack']['manifest.json'])
        manifest['capabilities'] = ['pbr']
        broken['ResourcePack']['manifest.json'] = json.dumps(manifest).encode()
        with self.assertRaises(ValueError):
            rig.verify_case(original, broken, 'B_without_hud_ui')

    def test_deterministic_zip_and_bad_path(self):
        files = {'one': b'a', 'two': b'b'}
        raw = rig.zip_bytes(files)
        self.assertEqual(raw, rig.zip_bytes(files))
        self.assertEqual(rig.read_zip(raw), files)
        with self.assertRaises(ValueError):
            rig.read_zip(rig.zip_bytes({'../evil': b'x'}))

    def test_existing_output_and_failed_source_do_not_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'existing'
            output.mkdir()
            marker = output / 'important'
            marker.write_bytes(b'keep')
            with self.assertRaises(FileExistsError):
                rig.build(output)
            self.assertEqual(marker.read_bytes(), b'keep')
            bad = Path(tmp) / 'bad'
            bad.write_bytes(b'wrong')
            missing = Path(tmp) / 'new'
            with self.assertRaises(ValueError):
                rig.build(missing, bad)
            self.assertFalse(missing.exists())


if __name__ == '__main__':
    unittest.main()

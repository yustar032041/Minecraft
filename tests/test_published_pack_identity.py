"""Packaging guard tests with tiny synthetic archives, not client/cache tests."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import build_mcaddon as builder


class PublishedIdentityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.packs = self.root / 'source'
        self.archive = self.root / 'published.mcaddon'
        self.manifests = []
        with zipfile.ZipFile(self.archive, 'w') as outer:
            for pack in builder.PACKS:
                identity, version = builder.PUBLISHED_IDENTITIES[pack]
                manifest = {'header': {'uuid': identity, 'version': list(version)}}
                self.manifests.append(manifest)
                packroot = self.packs / pack
                packroot.mkdir(parents=True)
                (packroot / 'manifest.json').write_text(json.dumps(manifest), encoding='utf8')
                (packroot / 'sample.txt').write_bytes(b'original')
                stream = io.BytesIO()
                with zipfile.ZipFile(stream, 'w') as inner:
                    for path in sorted(packroot.iterdir()):
                        inner.write(path, path.name)
                outer.writestr(pack + '.mcpack', stream.getvalue())
        self.sha = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        self.patchers = [patch.object(builder, 'PACK_ROOT', self.packs),
                         patch.object(builder, 'PUBLISHED', self.archive),
                         patch.object(builder, 'PUBLISHED_SHA256', self.sha)]
        for patcher in self.patchers:
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_identical_source_is_allowed_and_changed_bytes_rejected(self):
        builder.verify_published_identity(self.manifests)
        path = self.packs / 'ResourcePack/sample.txt'
        path.write_bytes(b'changed!')  # same length, different contents
        with self.assertRaisesRegex(ValueError, 'assign a new pack version'):
            builder.verify_published_identity(self.manifests)

    def test_missing_and_extra_files_are_rejected(self):
        path = self.packs / 'BehaviorPack/sample.txt'
        path.unlink()
        with self.assertRaisesRegex(ValueError, 'assign a new pack version'):
            builder.verify_published_identity(self.manifests)
        path.write_bytes(b'original')
        (path.parent / 'extra.txt').write_text('extra')
        with self.assertRaisesRegex(ValueError, 'assign a new pack version'):
            builder.verify_published_identity(self.manifests)

    def test_missing_or_tampered_reference_fails_closed(self):
        self.archive.write_bytes(b'not the trusted archive')
        with self.assertRaisesRegex(ValueError, 'cannot verify published'):
            builder.verify_published_identity(self.manifests)
        self.archive.unlink()
        with self.assertRaisesRegex(ValueError, 'cannot verify published'):
            builder.verify_published_identity(self.manifests)

    def test_new_version_builds_only_when_modules_and_dependency_match(self):
        version = [7, 1, 65]
        bp_uuid, rp_uuid = (builder.PUBLISHED_IDENTITIES[p][0] for p in builder.PACKS)
        bp = {'header': {'uuid': bp_uuid, 'version': version},
              'modules': [{'version': version}],
              'dependencies': [{'uuid': rp_uuid, 'version': version}]}
        rp = {'header': {'uuid': rp_uuid, 'version': version},
              'modules': [{'version': version}]}
        for pack, manifest in zip(builder.PACKS, (bp, rp)):
            (self.packs / pack / 'manifest.json').write_text(json.dumps(manifest), encoding='utf8')
        with patch.object(builder, 'check_crafting_unlocks', return_value=True):
            output = self.root / 'new.mcaddon'
            self.assertEqual(builder.build(output), 4)
            with zipfile.ZipFile(output) as archive:
                self.assertEqual(set(archive.namelist()), {'BehaviorPack.mcpack', 'ResourcePack.mcpack'})
            bp['dependencies'][0]['version'] = [7, 1, 64]
            (self.packs / 'BehaviorPack/manifest.json').write_text(json.dumps(bp), encoding='utf8')
            with self.assertRaisesRegex(ValueError, 'dependency mismatch'):
                builder.build(self.root / 'mismatched.mcaddon')
            bp['dependencies'][0]['version'] = version
            bp['modules'][0]['version'] = [7, 1, 64]
            (self.packs / 'BehaviorPack/manifest.json').write_text(json.dumps(bp), encoding='utf8')
            with self.assertRaisesRegex(ValueError, 'module versions'):
                builder.build(self.root / 'bad-module.mcaddon')

    def test_only_matching_uuid_and_version_are_compared(self):
        # Both identity and version are needed; a later version is not
        # compared to the old artifact. A separate release policy still applies.
        newer = [{'header': {**m['header'], 'version': [7, 1, 65]}} for m in self.manifests]
        self.archive.unlink()
        builder.verify_published_identity(newer)
        # If even one identity remains published, the trusted archive is required.
        newer[1] = self.manifests[1]
        with self.assertRaisesRegex(ValueError, 'cannot verify published'):
            builder.verify_published_identity(newer)


if __name__ == '__main__':
    unittest.main()

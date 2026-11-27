"""Archive layout/round-trip test, not an in-game import test."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'tools'))
from build_mcaddon import build

with tempfile.TemporaryDirectory() as tmp:
    first, second = Path(tmp) / 'first.mcaddon', Path(tmp) / 'second.mcaddon'
    # Internal-only bypass exercises archive construction while sources are
    # intentionally newer than published v7.1.64. Never distribute these files.
    count = build(first, _test_allow_published_mismatch=True)
    assert build(second, _test_allow_published_mismatch=True) == count
    assert hashlib.sha256(first.read_bytes()).digest() == hashlib.sha256(second.read_bytes()).digest()
    with zipfile.ZipFile(first) as bundle:
        assert bundle.testzip() is None
        assert set(bundle.namelist()) == {'BehaviorPack.mcpack', 'ResourcePack.mcpack'}
        manifests = {}
        total = 0
        for pack in ('BehaviorPack','ResourcePack'):
            with zipfile.ZipFile(io.BytesIO(bundle.read(f'{pack}.mcpack'))) as z:
                names = z.namelist(); total += len(names)
                # Source-only notes and old scratch files are not game assets.
                # Their removal is not evidence of a Switch rendering fix.
                assert not any(name.lower().endswith('.md') for name in names)
                assert 'textures/hakkai/png_test.bin' not in names
                assert 'textures/hakkai/text_test.txt' not in names
                assert len(names) == len(set(names))
                assert all(not name.startswith('/') and '..' not in Path(name).parts for name in names)
                assert z.testzip() is None
                manifests[pack] = json.loads(z.read('manifest.json'))
                expected={p.relative_to(root/'Hakkai_v7.1.0'/pack).as_posix() for p in (root/'Hakkai_v7.1.0'/pack).rglob('*') if p.is_file()}
                assert set(names)==expected
                for name in names:
                    assert hashlib.sha256(z.read(name)).digest()==hashlib.sha256((root/'Hakkai_v7.1.0'/pack/name).read_bytes()).digest(),name
                assert ('scripts/main.js' if pack=='BehaviorPack' else 'textures/item_texture.json') in names
        assert total==count
        bp,rp=manifests['BehaviorPack'],manifests['ResourcePack']
        assert bp['header']['version'] == rp['header']['version'] == [7, 1, 64]
        assert any(d.get('uuid') == rp['header']['uuid'] and d.get('version')==rp['header']['version'] for d in bp['dependencies'])
    try:
        build(Path(tmp) / 'wrong.zip')
        raise AssertionError('should reject an invalid suffix')
    except ValueError:
        pass
    # Even test mode must not overwrite the actual release file.
    published = root / 'downloads/Hakkai-v7.1.64.mcaddon'
    before = hashlib.sha256(published.read_bytes()).digest()
    try:
        build(published, _test_allow_published_mismatch=True)
        raise AssertionError('should protect published archive')
    except ValueError as exc:
        assert 'refusing to overwrite' in str(exc)
    assert hashlib.sha256(published.read_bytes()).digest() == before
    # An ordinary build must refuse changed sources with the published identity.
    forbidden = Path(tmp) / 'unversioned.mcaddon'
    try:
        build(forbidden)
        raise AssertionError('changed pack cannot reuse published UUID/version')
    except ValueError as exc:
        assert 'assign a new pack version' in str(exc)
    assert not forbidden.exists()
    # The legacy command-line flag must not bypass the identity guard either.
    cli = subprocess.run([sys.executable, str(root / 'tools/build_mcaddon.py'),
                          '--output', str(forbidden), '--allow-unfinished'],
                         capture_output=True, text=True)
    assert cli.returncode != 0, cli.stdout
    assert 'assign a new pack version' in cli.stderr, cli.stderr
    assert not forbidden.exists()
print('Deterministic temporary test archives and published identity protections OK (no Bedrock import test)')

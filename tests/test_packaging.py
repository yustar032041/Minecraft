"""Archive layout/round-trip test, not an in-game import test."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'tools'))
from build_mcaddon import build

with tempfile.TemporaryDirectory() as tmp:
    first, second = Path(tmp) / 'first.mcaddon', Path(tmp) / 'second.mcaddon'
    count = build(first)
    assert build(second) == count
    assert hashlib.sha256(first.read_bytes()).digest() == hashlib.sha256(second.read_bytes()).digest()
    with zipfile.ZipFile(first) as bundle:
        assert bundle.testzip() is None
        assert set(bundle.namelist()) == {'BehaviorPack.mcpack', 'ResourcePack.mcpack'}
        manifests = {}
        total = 0
        for pack in ('BehaviorPack','ResourcePack'):
            with zipfile.ZipFile(io.BytesIO(bundle.read(f'{pack}.mcpack'))) as z:
                names = z.namelist(); total += len(names)
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
        assert bp['header']['version'] == rp['header']['version'] == [7, 1, 19]
        assert any(d.get('uuid') == rp['header']['uuid'] and d.get('version')==rp['header']['version'] for d in bp['dependencies'])
    try:
        build(Path(tmp) / 'wrong.zip')
        raise AssertionError('should reject an invalid suffix')
    except ValueError:
        pass
print('Deterministic mcaddon with two root-manifest mcpacks, full source hashes and CRCs OK (no Bedrock import test)')

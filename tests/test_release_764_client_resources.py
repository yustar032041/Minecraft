"""Integrity of published v7.1.64 archive; not a multiplayer delivery test."""
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZipFile

root=Path(__file__).resolve().parents[1]
archive=root/'downloads/Hakkai-v7.1.64.mcaddon'
assert hashlib.sha256(archive.read_bytes()).hexdigest()=='8095fd7a501c670514895b23093ea93284742b840b7ee0a53c896498e80dcfb5'
with ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert set(bundle.namelist())=={'BehaviorPack.mcpack','ResourcePack.mcpack'}
    with ZipFile(io.BytesIO(bundle.read('ResourcePack.mcpack'))) as rp:
        assert rp.testzip() is None
        names=rp.namelist()
        assert len(names)==len(set(names)) and len(names)==len({n.casefold() for n in names})
        assert all(not n.startswith('/') and '..' not in n.split('/') and '\\' not in n for n in names)
        manifest=json.loads(rp.read('manifest.json'))
        assert manifest['header']['version']==[7,1,64]
        assert manifest['header']['uuid']=='264d2bb6-d9e8-4ed4-9e39-96c2307a7a04'
        expected={
            'texts/en_US.lang':'cc50436a63d9c2c4c3fd7e5c4c23b47d886bbf7d162581d6aecd319ce3addc41',
            'texts/ja_JP.lang':'7eee97d701a5b185ac3594b9c3a04e17e793b38fd83beaf5d197fcd070c0c7a8',
            'texts/languages.json':'3c01b07418bfb441d460d2f72f54a9f050012ada91c76fb79165cdc9706b6fd3',
            'textures/item_texture.json':'32a61ae5bbc65d387bbba0f7310b61aaa1ebe94799aa5e6eb6339848aa17d26b',
            'textures/terrain_texture.json':'d14cec2c6cc45ee392268d0c7f741631bad0a92dfb9151ac059647764029a857',
            'ui/hud_screen.json':'ab606ab8a768b4bbbe9da93c0f6b538928196112ead2cc1755009d39cfbe3699',
        }
        for path,digest in expected.items():
            data=rp.read(path)
            assert hashlib.sha256(data).hexdigest()==digest,path
            assert not data.startswith(b'\xef\xbb\xbf')
            assert '\ufffd' not in data.decode('utf8'),path
        assert not any(n.startswith('font/') for n in names)
        assert 'textures/flipbook_textures.json' not in names
print('Published v7.1.64 client archive: checksum, CRC, paths and UTF-8 metadata OK; network/cache/rendering untested')

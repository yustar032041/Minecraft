"""Compare every published v7.1.64 pack file to its release commit.

Requires the release archive and commit in the local Git checkout. This checks
bytes before distribution, not the Switch's downloaded cache or rendering.
"""
import io
from pathlib import Path
import subprocess
import tarfile
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '100d104a3c6341758fe876820d111614bf45d85c'
ARCHIVE = ROOT / 'downloads/Hakkai-v7.1.64.mcaddon'


def compare(entries, source):
    """Return paths missing or differing, given archive bytes and source bytes."""
    return {name for name in entries.keys() | source.keys()
            if entries.get(name) != source.get(name)}


assert not compare({'a': b'a'}, {'a': b'a'})
assert compare({'a': b'a'}, {'a': b'b'}) == {'a'}
assert compare({'a': b''}, {}) == {'a'}
assert compare({}, {'b': b''}) == {'b'}

with ZipFile(ARCHIVE) as bundle:
    assert len(bundle.namelist()) == len(set(bundle.namelist()))
    assert set(bundle.namelist()) == {'BehaviorPack.mcpack', 'ResourcePack.mcpack'}
    for pack in ('BehaviorPack', 'ResourcePack'):
        with ZipFile(io.BytesIO(bundle.read(pack + '.mcpack'))) as published:
            infos = published.infolist()
            assert len(infos) == len({entry.filename for entry in infos})
            assert not any(entry.is_dir() for entry in infos)
            entries = {entry.filename: published.read(entry) for entry in infos}
        source = {}
        prefix = f'Hakkai_v7.1.0/{pack}/'
        proc = subprocess.Popen(['git', 'archive', COMMIT, prefix.rstrip('/')],
                                cwd=ROOT, stdout=subprocess.PIPE)
        try:
            with tarfile.open(fileobj=proc.stdout, mode='r|') as tar:
                for member in tar:
                    assert member.isdir() or member.isfile(), member.name
                    if member.isfile():
                        assert member.name.startswith(prefix), member.name
                        name = member.name[len(prefix):]
                        assert name not in source, name
                        source[name] = tar.extractfile(member).read()
        finally:
            proc.stdout.close()
            status = proc.wait()
        assert status == 0, f'git archive failed: {status}'
        assert entries and source
        mismatches = compare(entries, source)
        assert not mismatches, f'{pack}: missing, extra, or changed: {sorted(mismatches)}'
        print(f'{pack}: {len(entries)} files byte-for-byte equal to release commit')
print('Published archive vs release source OK; network delivery, cache and rendering untested')

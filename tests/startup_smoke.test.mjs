// A separate loader ensures the complete entrypoint uses our startup API fake.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const run=spawnSync(process.execPath,['--no-warnings','--experimental-loader','./tests/startup_stub_loader.mjs','--experimental-default-type=module','tests/startup_smoke_runner.mjs'],{encoding:'utf8'});
assert.equal(run.status,0,`${run.stdout}\n${run.stderr}`);console.log(run.stdout.trim());

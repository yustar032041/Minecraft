// Regression for an unsupported supplementary-plane lock emoji in four
// forms. These mocks cannot establish how Bedrock renders Japanese glyphs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js', 'utf8');
const blocks = [
  ['async function realmAdventureRequestBoard(', 'async function realmAdventureHistory('],
  ['async function realmGuideConversationBoard(', 'async function realmRankDestinationBoard('],
  ['async function realmNpcPlaceBoard(', 'async function realmNpcConversation('],
  ['async function realmAwakeningBoard(', 'function applyRealmAwakenedVisual('],
];

function setup() {
  const state = {rank: 0, discovered: false, done: false, guards: 0, claims: 0, rows: []};
  const ctx = {
    realmRankUpdate: () => {}, realmRankIndex: () => state.rank,
    marked: (_p, key) => key === 'realm_discoveries' ? state.discovered : state.done,
    realmRankRequests: [{rank: 1, name: '依頼', desc: '説明', check: () => false}],
    realmRanks: [[0, '初級'], [1, '上級']],
    realmGuideDialogues: [['案内人']],
    realmSeasonStoryCount: () => 0, realmSecretChapterCount: () => 0,
    space: () => ({}),
    num: (_p, key) => key === 'guards' ? state.guards : state.claims,
    realmAwakenedGear: [['草原', '覚醒鎧', 'gear', 0, 1]],
    guardians: ['守護者'],
    form: async (_p, _title, _body, rows) => { state.rows = rows; return undefined; },
  };
  vm.createContext(ctx);
  for (const [start, end] of blocks) {
    const from = source.indexOf(start), to = source.indexOf(end, from);
    assert.ok(from >= 0 && to > from, start);
    vm.runInContext(source.slice(from, to), ctx);
  }
  return {ctx, state};
}

for (const [name, kind] of [
  ['realmAdventureRequestBoard', 'request'],
  ['realmGuideConversationBoard', 'guide'],
  ['realmNpcPlaceBoard', 'guide'],
  ['realmAwakeningBoard', 'armor'],
]) {
  test(`${name} keeps locked and unlocked states with readable Japanese`, async () => {
    const {ctx, state} = setup();
    await ctx[name]({isValid: true});
    const locked = state.rows[0][0];
    assert.ok(locked.startsWith('§8【未解放】 '), locked);
    assert.ok([...locked].every(c => c.codePointAt(0) <= 0xFFFF), locked);
    if (kind === 'request') state.rank = 1;
    if (kind === 'guide') state.discovered = true;
    if (kind === 'armor') { state.rank = 1; state.guards = 1; }
    await ctx[name]({isValid: true});
    assert.ok(state.rows[0][0].startsWith('◇ '), state.rows[0][0]);
    if (kind === 'request') {
      state.done = true;
      await ctx[name]({isValid: true});
      assert.ok(state.rows[0][0].startsWith('◆ '));
    }
    if (kind === 'armor') {
      state.claims = 1;
      await ctx[name]({isValid: true});
      assert.ok(state.rows[0][0].startsWith('§a◆ '));
    }
  });
}

"""Check the synchronized recipe policy and script-based alternate paths."""
import subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'tools/sync_equipment_materials.py'),'--check'],check=True)
s=(root/'Hakkai_v7.1.0/BehaviorPack/scripts/main.js').read_text()
def body(start,end):return s[s.index(start):s.index(end,s.index(start))]
assert "['minecraft:diamond',1],['minecraft:netherite_ingot',1]" in body('async function legendGearTrialBoard(', 'async function nextHeldGearRecipe(')
assert "['minecraft:diamond',1],['minecraft:netherite_scrap',1]" in body('async function armorSetTrial(', '// --- v4.9.0')
assert "['minecraft:ancient_debris',1]" in body('async function guardianLegacyForge(', 'function applyGuardianLegacyEffects(')
assert "['minecraft:netherite_ingot',1]" in body('async function finalAwakeningTrial(', 'async function finalChronicle(')
assert "['minecraft:diamond',1]" in body('async function realmAscensionBoard(', 'function applyRealmAwakenedEffects(')
assert "['minecraft:diamond',1]" in body('async function realmAwakeningBoard(', 'function applyRealmAwakenedVisual(')
assert "['minecraft:netherite_scrap',2]" in body('async function nightwalkerAwakeningTrial(', 'function applyNightwalkerAwakeningVisual(')
print('Equipment recipe policy and scripted material costs verified (static)')

// Player-local ambience for the eight realms. Fog tags are owned by this pack;
// never clear the full stack, because other packs may have their own entries.
export const AMBIENCE_TAG = 'hakkai_realm_ambience';
export const LEGACY_TAG = 'hakkai_climate';
const REALM_PARTICLES = ['meadow_pollen','forest_spores','dune_spiral','frost_glimmer','storm_spark','cave_glimmers','sky_motes','time_sparks'];
const SITE_PARTICLES = {meadow:0,forest:1,dune:2,snow:3,cliff:4,cave:5,sky:6,clock:7,coast:6};
// Hand-selected for named landscape profiles, rather than assuming that
// terrainStyle means the same visual biome in every realm.
const BIOME_PARTICLES = [
 [0,0,1,1,0,6,0,1,0,0,1,5],
 [1,1,5,1,1,1,5,1,1,0,1,5],
 [2,2,2,2,2,2,2,2,2,2,2,2],
 [3,3,3,3,3,3,3,3,3,3,3,3],
 [4,1,4,4,4,4,4,4,4,4,4,4],
 [5,5,5,5,5,5,5,5,5,5,5,5],
 [6,6,6,4,6,6,6,0,4,6,6,6],
 [7,7,7,7,7,7,7,7,7,7,7,7]
];
const EXTRA_PARTICLES = [
 [0,0,0,0,0],[1,1,5,1,1],[2,2,2,2,2],[3,3,3,3,3],
 [4,4,4,4,4],[5,5,5,5,5],[6,6,0,6,6],[7,7,7,7,7]
];
export function timePhase(time) {
 if(!Number.isFinite(time)) return undefined;
 const t=((time%24000)+24000)%24000;
 return t<3000||t>=23000?'morning':t<12000?'day':t<13000?'evening':'night';
}
export function realmTheme(dimensionId, site) {
 const m=/^hakkai:realm_([0-9])$/.exec(dimensionId);
 if(!m)return undefined;
 const theme=site?.theme;
 if(Number.isInteger(theme)&&theme>=0&&theme<8)return theme;
 // The atlas and linked-world dimensions have no single realm theme:
 // apply ambience only within a known, built themed site.
 const realm=Number(m[1]);return realm<8?realm:undefined;
}
export function ambientParticle(theme, biomeId, site) {
 if(!Number.isInteger(theme)||theme<0||theme>7)return undefined;
 if(site?.style in SITE_PARTICLES) return `hakkai:${REALM_PARTICLES[SITE_PARTICLES[site.style]]}`;
 let m=/^hakkai:seed_([0-7])_(\d\d)$/.exec(biomeId??'');
 let n;
 if(m&&Number(m[1])===theme)n=BIOME_PARTICLES[theme][Number(m[2])];
 m=/^hakkai:seed_(extra|new)_([0-7])_(\d+)$/.exec(biomeId??'');
 if(m&&Number(m[2])===theme){const i=m[1]==='new'?4:Number(m[3]);n=EXTRA_PARTICLES[theme][i];}
 return `hakkai:${REALM_PARTICLES[n??theme]}`;
}
// Called on the existing 40-tick cadence, including spectators and other
// dimensions so that a transition or quiet mode removes only our own fog.
export function updateRealmAmbience(player, state, {theme, phase, biomeId, site, quiet=false, tick}) {
 const desired=!quiet&&Number.isInteger(theme)&&theme>=0&&theme<8&&phase?`hakkai:realm_ambient_${theme}_${phase}`:undefined;
 try {
   const fog=player.fogSettings;
   // On a new session, clean up the old command-era tag as well. Retry on
   // any failure; don't claim the state was applied before push succeeds.
   if(!state.ambienceInitialized){fog.remove(LEGACY_TAG);fog.remove(AMBIENCE_TAG);state.ambienceApplied=undefined;state.ambienceInitialized=true;}
   const tags=fog.getTags();
   if(state.ambienceApplied!==desired || (desired?!tags.includes(AMBIENCE_TAG):tags.includes(AMBIENCE_TAG))){
     fog.remove(AMBIENCE_TAG);state.ambienceApplied=undefined;
     if(desired){fog.push(desired,AMBIENCE_TAG);state.ambienceApplied=desired;}
   }
 } catch { state.ambienceApplied=undefined; }
 if(!desired||!Number.isFinite(tick)||tick<(state.ambientParticleAt??0))return;
 // One player-visible emitter per 120 ticks. Skip when swimming, where
 // free-floating air motes would be especially misleading.
 state.ambientParticleAt=tick+120;
 try {
   if(player.isSwimming)return;
   const l=player.location,view=player.getViewDirection();
   player.spawnParticle(ambientParticle(theme,biomeId,site),{x:l.x+view.x*2.5,y:l.y+1.1,z:l.z+view.z*2.5});
 } catch {}
}

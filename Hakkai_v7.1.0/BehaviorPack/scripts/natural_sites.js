// Legacy 12 locations + 8 frontiers + 20 more islands. Keep IDs and saved
// visit/build markers stable; only their access and terrain integration change.
export const isNaturalSite=site=>Number.isInteger(site?.id)&&(site.id>=9&&site.id<=48||site.id>=59&&site.id<=68);
export function siteBounds(site,width=45){
 const size=site.size??width,half=(size-1)/2;
 return {x0:site.x-half,x1:site.x+half,z0:site.z-half,z1:site.z+half};
}
export function inSite(site,x,z,width=45){
 const b=siteBounds(site,width);return x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1;
}
export function siteIntersects(site,x0,z0,x1,z1,width=45){
 const b=siteBounds(site,width);return x0<=b.x1&&x1>=b.x0&&z0<=b.z1&&z1>=b.z0;
}
// Flatten only the approach, not the saved structure. This changes fresh
// terrain only; old completed/skipped chunks are never rebuilt.
export function blendSiteHeight(base,x,z,sites,width=45){
 let distance=Infinity;
 for(const s of sites){
  const b=siteBounds(s,width),dx=Math.max(b.x0-x,0,x-b.x1),dz=Math.max(b.z0-z,0,z-b.z1);
  distance=Math.min(distance,Math.hypot(dx,dz));
 }
 if(distance>=32)return base;
 if(base<0)return 87; // a small foothold around sky structures, not all void
 const t=distance/32,weight=t*t*(3-2*t);
 return Math.round(87*(1-weight)+base*weight);
}

// Saved expedition discovery coordinates remain unchanged.
export const FRONTIER_SITES=[[310,25],[352,-24],[394,25]];
export const SKY_FRONTIER_SITES=[[302,0],[342,0],[398,0]];

// Assign each original identity to one well-separated seeded cell per realm.
// New plans are closer to the starting areas; saved plans are never moved.
// This remains a scripted, one-per-identity plan, not native worldgen.
export function seededSiteCandidates(places,seed){
 let seedHash=2166136261;
 for(const c of String(seed))seedHash=Math.imul(seedHash^c.charCodeAt(0),16777619)>>>0;
 const hash=(a,b,salt)=>{
  let h=(seedHash^Math.imul(a+1,0x9e3779b1)^Math.imul(b+1,0x85ebca6b)^salt)>>>0;
  h=Math.imul(h^(h>>>16),0x7feb352d)>>>0;h=Math.imul(h^(h>>>15),0x846ca68b)>>>0;
  return (h^(h>>>16))>>>0;
 };
 const plans=new Map();
 for(let realm=0;realm<8;realm++){
  const cells=[];for(const x of [-512,-256,256,512])for(const z of [-544,-288,288,544])cells.push({x,z});
  for(let i=cells.length-1;i>0;i--){const j=hash(realm,i,401)%(i+1);[cells[i],cells[j]]=[cells[j],cells[i]];}
  const sites=places.filter(s=>s.dim===realm&&isNaturalSite(s)).sort((a,b)=>a.id-b.id);
  sites.forEach((site,i)=>{
   const dx=hash(realm,site.id,409)%49-24,dz=hash(realm,site.id,419)%49-24;
   plans.set(site.id,cells.map((_,j)=>{const c=cells[(i+j)%cells.length];return {x:c.x+dx,z:c.z+dz};}));
  });
 }
 return plans;
}
export function seededSitePlans(places,seed){
 return new Map([...seededSiteCandidates(places,seed)].map(([id,choices])=>[id,choices[0]]));
}
// Only plan an alternative before writing a new plan. Existing saved plans and
// legacy sites never move: adjacent chunks may already have been blended.
export function initializeNaturalSitePlans({places,seed,world,num,property,ns}){
 const candidates=seededSiteCandidates(places,seed),sites=places.filter(isNaturalSite),chosen=new Map(),newSites=[];
 for(const site of sites){
  const key=`natural_site_plan_${site.id}_v2`,raw=world.getDynamicProperty(ns+key);
  if(raw!==undefined){
   let saved;try{saved=JSON.parse(raw);}catch{throw Error(`Invalid site plan ${site.id}`);}
   if(!Number.isSafeInteger(saved?.x)||!Number.isSafeInteger(saved?.z))throw Error(`Invalid site plan ${site.id}`);
   chosen.set(site.id,{...site,...saved});
  }else if(num(world,`built_${site.id}`))chosen.set(site.id,{...site});
  else{chosen.set(site.id,{...site,...candidates.get(site.id)[0]});newSites.push(site);}
 }
 function generated(site){
  const b=siteBounds(site);
  for(let cx=Math.floor(b.x0/16);cx<=Math.floor(b.x1/16);cx++)for(let cz=Math.floor(b.z0/16);cz<=Math.floor(b.z1/16);cz++)
   if(num(world,`seed_land_${site.dim}_${cx}_${cz}_v1`)||num(world,`seed_land_${site.dim}_${cx}_${cz}_skip_v1`))return true;
  return false;
 }
 function conflicts(candidate){
  const b=siteBounds(candidate);
  for(const other of chosen.values())if(other.id!==candidate.id&&other.dim===candidate.dim&&siteIntersects(other,b.x0-32,b.z0-32,b.x1+32,b.z1+32))return true;
  return places.some(other=>!isNaturalSite(other)&&other.dim===candidate.dim&&siteIntersects(other,b.x0-32,b.z0-32,b.x1+32,b.z1+32));
 }
 for(const site of newSites){
  const options=candidates.get(site.id).map(plan=>({...site,...plan}));
  const pick=options.find(candidate=>!conflicts(candidate)&&!generated(candidate));
  // No clean candidate: preserve the initial plan; placement still refuses to
  // overwrite old terrain and can never pretend the location was generated.
  if(pick)chosen.set(site.id,pick);
 }
 for(const site of newSites){const c=chosen.get(site.id);property(world,`natural_site_plan_${site.id}_v2`,JSON.stringify({x:c.x,z:c.z}));}
 for(const site of sites){const c=chosen.get(site.id);site.x=c.x;site.z=c.z;}
}

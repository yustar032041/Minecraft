// Node-only loader for exercising the terrain generator with a simulated API.
export async function resolve(specifier,context,nextResolve){
 if(specifier==='@minecraft/server')return {url:new URL('./stubs/minecraft_server.mjs',import.meta.url).href,shortCircuit:true};
 return nextResolve(specifier,context);
}

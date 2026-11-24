// Each pipe moves from the barrel opposite the arrow to the barrel at its tip.
// Pipes do not join to each other; every endpoint is an actual barrel.
const DIRECTIONS={factory_pipe:[1,0,0],factory_pipe_west:[-1,0,0],factory_pipe_north:[0,0,-1],factory_pipe_south:[0,0,1],factory_pipe_up:[0,1,0],factory_pipe_down:[0,-1,0]};
export function pipeEndpoints(kind,p){
 const v=DIRECTIONS[kind];if(!v)return undefined;
 return {from:{x:p.x-v[0],y:p.y-v[1],z:p.z-v[2]},to:{x:p.x+v[0],y:p.y+v[1],z:p.z+v[2]}};
}

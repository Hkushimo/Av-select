import type {FlowConnection} from "./signal-flow";
export type RoleFlow={role:string;connections:FlowConnection[]};
export const DEFAULT_ROLE="General";
export const COMMON_ROLES=["General","Video","Audio","Lighting","Graphics","Camera","Streaming","Playback","LED / Projection","Stage / Show"];
export function matchingFlow(flows:RoleFlow[],role:string):FlowConnection[]{
 return flows.find(f=>f.role===role)?.connections||[];
}

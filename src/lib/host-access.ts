export function isHost(uid:string,adminClaim:unknown,configuredUids:string,emulated:boolean):boolean {
 const allowed=configuredUids.split(',').map(value=>value.trim()).filter(Boolean);
 return allowed.includes(uid)||(emulated&&adminClaim===true);
}

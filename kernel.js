(()=>{"use strict";
const DB_NAME="pijush-os",DB_VERSION=2,STORE="files",META="meta";
const seed={"Desktop":{type:"dir"},"Documents":{type:"dir"},"Projects":{type:"dir"},"Downloads":{type:"dir"},"Documents/README.txt":{type:"file",content:"Welcome to PIJUSH OS.\n\nThis workspace is managed by WebKernel."},"notes.txt":{type:"file",content:"PIJUSH OS\nA browser-native operating system experiment."}};
class EventBus{constructor(){this.map=new Map()}on(t,f){if(!this.map.has(t))this.map.set(t,new Set);this.map.get(t).add(f);return()=>this.map.get(t)?.delete(f)}emit(t,d){this.map.get(t)?.forEach(f=>{try{f(d)}catch{}})}}
class FileSystem{
 constructor(){this.db=null;this.memory=new Map;this.storageError=null;this.ready=this.init().catch(error=>{console.error("PIJUSH OS filesystem initialization failed; using temporary memory storage.",error);this.db=null;this.memory.clear();for(const[p,v]of Object.entries(seed))this.memory.set(p,v);this.storageError=error})}
 async init(){if(!("indexedDB"in window)){for(const [p,v]of Object.entries(seed))this.memory.set(p,v);return}
  this.db=await new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE);if(!d.objectStoreNames.contains(META))d.createObjectStore(META)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  if(await this.count()===0){await new Promise((resolve,reject)=>{const tx=this.db.transaction(STORE,"readwrite");const store=tx.objectStore(STORE);Object.entries(seed).forEach(([path,value])=>store.put(value,path));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
 }
 count(){return this.db?new Promise((res,rej)=>{const r=this.db.transaction(STORE,"readonly").objectStore(STORE).count();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}):Promise.resolve(this.memory.size)}
 async write(path,value){await this.ready;path=this.normalize(path);if(!path)throw Error("Invalid path");if(!this.db){this.memory.set(path,structuredClone(value));return}return new Promise((res,rej)=>{const r=this.db.transaction(STORE,"readwrite").objectStore(STORE).put(structuredClone(value),path);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
 async read(path){await this.ready;path=this.normalize(path);if(!this.db)return this.memory.has(path)?structuredClone(this.memory.get(path)):null;return new Promise((res,rej)=>{const r=this.db.transaction(STORE,"readonly").objectStore(STORE).get(path);r.onsuccess=()=>res(r.result?structuredClone(r.result):null);r.onerror=()=>rej(r.error)})}
 async remove(path){await this.ready;path=this.normalize(path);if(!this.db){this.memory.delete(path);return}return new Promise((res,rej)=>{const r=this.db.transaction(STORE,"readwrite").objectStore(STORE).delete(path);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
 async list(prefix=""){await this.ready;prefix=this.normalize(prefix);if(prefix)prefix+="/";if(!this.db)return[...this.memory.entries()].filter(([p])=>p===prefix.slice(0,-1)||p.startsWith(prefix));return new Promise((res,rej)=>{const out=[],r=this.db.transaction(STORE,"readonly").objectStore(STORE).openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return res(out);if(!prefix||c.key.startsWith(prefix))out.push([c.key,structuredClone(c.value)]);c.continue()};r.onerror=()=>rej(r.error)})}
 async replaceAll(entries){await this.ready;if(!Array.isArray(entries))throw Error("Invalid filesystem snapshot");if(!this.db){this.memory.clear();for(const[p,v]of entries)this.memory.set(this.normalize(p),structuredClone(v));return}await new Promise((resolve,reject)=>{const tx=this.db.transaction(STORE,"readwrite");const store=tx.objectStore(STORE);store.clear();for(const[p,v]of entries)store.put(structuredClone(v),this.normalize(p));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error("Filesystem restore failed"));tx.onabort=()=>reject(tx.error||Error("Filesystem restore aborted"))})}
 normalize(path){return String(path||"").replace(/^\/+|\/+$/g,"").replace(/\/+/g,"/")}
 async reset(){await this.ready;return this.replaceAll(Object.entries(seed))}
}
class PermissionManager{
 constructor(bus){this.bus=bus;this.grants=new Map;this.catalog={ "filesystem.read":"Read files","filesystem.write":"Create and modify files","filesystem.delete":"Delete files","notifications":"Show system notifications","system.info":"Read system information","process.control":"Control application processes"}}
 request(appId,permissions=[]){const current=this.grants.get(appId)||new Set,requested=[...new Set(permissions)];const missing=requested.filter(p=>!current.has(p));this.bus.emit("permission:request",{appId,permissions:missing});return missing}
 grant(appId,permissions=[]){const set=this.grants.get(appId)||new Set;permissions.forEach(p=>{if(this.catalog[p])set.add(p)});this.grants.set(appId,set);this.bus.emit("permission:grant",{appId,permissions:[...set]})}
 revoke(appId,permissions=[]){if(!this.grants.has(appId))return;const set=this.grants.get(appId);permissions.forEach(p=>set.delete(p));this.bus.emit("permission:revoke",{appId,permissions})}
 has(appId,permission){return(this.grants.get(appId)||new Set).has(permission)}
 check(appId,permission){if(!this.has(appId,permission))throw new Error("Permission denied: "+permission);return true}
 list(appId){return[...(this.grants.get(appId)||new Set)]}
 reset(appId){this.grants.delete(appId)}
}
class ProcessManager{
 constructor(bus){this.bus=bus;this.next=100;this.processes=new Map}
 spawn(name,type="app",appId=null){const p={pid:this.next++,name,type,appId,state:"running",startedAt:Date.now()};this.processes.set(p.pid,p);this.bus.emit("process:start",p);return p}
 setState(pid,state){const p=this.processes.get(pid);if(!p||!["running","suspended","terminated"].includes(state))return false;p.state=state;this.bus.emit("process:update",{...p});return true}
 kill(pid){const p=this.processes.get(pid);if(!p)return false;p.state="terminated";p.endedAt=Date.now();this.bus.emit("process:exit",{...p});return true}
 list(){return[...this.processes.values()].filter(p=>p.state!=="terminated").map(p=>({...p}))}
}
class AppManager{
 constructor(bus,pm,permissions){this.bus=bus;this.pm=pm;this.permissions=permissions;this.apps=new Map}
 register(manifest){if(!manifest?.id||this.apps.has(manifest.id))throw Error("Invalid or duplicate app");const m={version:"1.0.0",permissions:[],...manifest,installedAt:Date.now()};this.apps.set(m.id,m);this.bus.emit("app:install",m);return m}
 install(manifest){return this.register(manifest)}
 uninstall(id){if(!this.apps.delete(id))return false;this.permissions.reset(id);for(const p of this.pm.list())if(p.appId===id)this.pm.kill(p.pid);this.bus.emit("app:uninstall",{id});return true}
 get(id){return this.apps.get(id)||null}
 list(){return[...this.apps.values()].map(a=>({...a,permissions:[...(a.permissions||[])]}))}
 launch(id){const a=this.get(id);if(!a)throw Error("Application not found");const missing=this.permissions.request(id,a.permissions||[]);if(missing.length)throw Error("Permission required: "+missing.join(", "));const p=this.pm.spawn(a.name,"app",id);this.bus.emit("app:launch",{app:a,process:p});return p}
}
class WebKernel{
 constructor(){this.bus=new EventBus;this.fs=new FileSystem;this.permissions=new PermissionManager(this.bus);this.processes=new ProcessManager(this.bus);this.apps=new AppManager(this.bus,this.processes,this.permissions);this.ready=this.fs.ready.then(()=>{for(const a of[
 {id:"files",name:"Files",version:"1.1.0",permissions:["filesystem.read"]},
 {id:"terminal",name:"Terminal",version:"1.1.0",permissions:["filesystem.read","filesystem.write"]},
 {id:"editor",name:"Editor",version:"1.1.0",permissions:["filesystem.read","filesystem.write"]},
 {id:"calculator",name:"Calculator",version:"1.1.0",permissions:[]},
 {id:"monitor",name:"Monitor",version:"1.1.0",permissions:["system.info"]},
 {id:"settings",name:"Settings",version:"1.1.0",permissions:["filesystem.write"]}
 ])this.apps.register(a);this.bus.emit("kernel:ready")})}
 api(appId){return{fs:{read:p=>(this.permissions.check(appId,"filesystem.read"),this.fs.read(p)),write:(p,v)=>(this.permissions.check(appId,"filesystem.write"),this.fs.write(p,v)),remove:p=>(this.permissions.check(appId,"filesystem.delete"),this.fs.remove(p)),list:p=>(this.permissions.check(appId,"filesystem.read"),this.fs.list(p))},notify:(t,m)=>(this.permissions.check(appId,"notifications"),this.bus.emit("notification",{title:t,message:m})),processes:{list:()=>this.processes.list()}}}
}
window.PIJUSH={kernel:new WebKernel};
})();
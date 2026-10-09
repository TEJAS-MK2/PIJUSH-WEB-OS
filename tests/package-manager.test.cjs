const test=require("node:test");
const assert=require("node:assert/strict");
const {validatePackage,sandboxDocument}=require("../package-manager.js");
const valid=()=>({manifest:{id:"hello-world",name:"Hello World",version:"1.0.0",description:"A demo",entrypoint:"index.html",permissions:[]},html:"<!doctype html><html><body><h1>Hello</h1></body></html>"});
test("accepts a valid PIJAPP package",()=>{assert.equal(validatePackage(valid()).manifest.id,"hello-world")});
test("rejects malformed and reserved identifiers",()=>{for(const id of ["Files","../bad","files","x","bad name"])assert.throws(()=>validatePackage({...valid(),manifest:{...valid().manifest,id}}))});
test("rejects unknown permissions",()=>{const p=valid();p.manifest.permissions=["filesystem.root"];assert.throws(()=>validatePackage(p),/permission/i)});
test("rejects oversized source and embedded browsing elements",()=>{const p=valid();p.html="x".repeat(256*1024+1);assert.throws(()=>validatePackage(p),/large/i);const q=valid();q.html="<iframe src='https://example.com'></iframe>";assert.throws(()=>validatePackage(q),/elements/i)});
test("rejects duplicate permissions and invalid versions",()=>{const p=valid();p.manifest.permissions=["filesystem.read","filesystem.read"];assert.throws(()=>validatePackage(p));const q=valid();q.manifest.version="latest";assert.throws(()=>validatePackage(q),/Version/i)});
test("sandbox document applies CSP and nonce-bound parent bridge",()=>{const p=validatePackage(valid());const html=sandboxDocument(p,"test-nonce");assert.match(html,/Content-Security-Policy/);assert.match(html,/connect-src 'none'/);assert.match(html,/channel:"pijush-app"/);assert.doesNotMatch(html,/allow-same-origin/);assert.match(html,/test-nonce/);});

const fs=require("node:fs");
const kernelSource=fs.readFileSync(require.resolve("../kernel.js"),"utf8");
const appSource=fs.readFileSync(require.resolve("../app.js"),"utf8");
test("kernel refuses launch until requested permissions are explicitly granted",()=>{assert.match(kernelSource,/if\(missing\.length\)throw Error\("Permission required:/);assert.doesNotMatch(kernelSource,/if\(missing\.length\)this\.permissions\.grant/)});
test("third-party apps use scripts-only iframe isolation and permission checks",()=>{assert.match(appSource,/sandbox="allow-scripts"/);assert.doesNotMatch(appSource,/sandbox="[^"]*allow-same-origin/);assert.match(appSource,/kernel\.permissions\.has\(id,d\.permission\)/);assert.match(appSource,/AppData\/"\+id/);});
test("local package installation validates before persisting and has a size limit",()=>{assert.match(appSource,/PIJUSHAppPackages\.validatePackage\(raw\)/);assert.match(appSource,/f\.size>350\*1024/);assert.match(appSource,/confirm\("Install /);});

test("entrypoint and integrity metadata are constrained",()=>{const p=valid();p.manifest.entrypoint="../outside.html";assert.throws(()=>validatePackage(p),/entrypoint/i);const q=valid();q.integrity={algorithm:"MD5",digest:"abc"};assert.throws(()=>validatePackage(q),/integrity/i)});

test("integrity payload includes the normalized manifest and permissions",()=>{const {integrityPayload}=require("../package-manager.js");const p=valid();const base=integrityPayload(p);const changed={...p,manifest:{...p.manifest,permissions:["filesystem.read"]}};assert.notEqual(integrityPayload(changed),base);assert.match(base,/"entrypoint":"index.html"/)});
test("App Store exposes rollback and verifies packages before launch",()=>{const fs=require("node:fs");const source=fs.readFileSync(require.resolve("../app.js"),"utf8");assert.match(source,/data-rollback/);assert.match(source,/await verifyPackageIntegrity\(pkg\)/);assert.match(source,/AppBackups\//)});

test("fresh IndexedDB initialization seeds directly without waiting on its own ready promise",()=>{const fs=require("node:fs");const source=fs.readFileSync(require.resolve("../kernel.js"),"utf8");assert.doesNotMatch(source,/if\(await this\.count\(\)===0\)for\(const\[p,v\]of Object\.entries\(seed\)\)await this\.write\(p,v\)/);assert.match(source,/if\(await this\.count\(\)===0\)\{await new Promise/);assert.match(source,/store\.put\(value,path\)/)});
test("app install uses the current full-package checksum helper",()=>{assert.match(appSource,/const digest=await digestPackage\(pkg\)/);assert.doesNotMatch(appSource,/digestHtml\(/)});


test("filesystem initialization failure falls back to seeded memory storage",()=>{assert.match(kernelSource,/this\.ready=this\.init\(\)\.catch\(error=>/);assert.match(kernelSource,/this\.db=null;this\.memory\.clear\(\)/);assert.match(kernelSource,/this\.storageError=error/)});
test("boot watchdog reports a kernel that never becomes ready",()=>{assert.match(appSource,/bootWatchdog/);assert.match(appSource,/kernel readiness has not completed/);assert.match(appSource,/kernelReady\.then\([\s\S]*?\.catch\(error=>/)});

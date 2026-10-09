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

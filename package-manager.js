(function(root){ "use strict";
const ALLOWED=new Set(["filesystem.read","filesystem.write","filesystem.delete","notifications","system.info"]);
const MAX_SOURCE=256*1024,MAX_PACKAGE=350*1024;
function validatePackage(pkg){
 if(!pkg||typeof pkg!=="object"||Array.isArray(pkg))throw Error("Package must be a JSON object");
 const m=pkg.manifest;
 if(!m||typeof m!=="object")throw Error("Missing manifest");
 if(typeof m.id!=="string"||!/^[a-z][a-z0-9-]{1,39}$/.test(m.id)||["files","terminal","editor","calculator","monitor","settings","taskmanager","developer","appstore"].includes(m.id))throw Error("Invalid or reserved app id");
 if(typeof m.name!=="string"||!m.name.trim()||m.name.length>60)throw Error("App name must be 1–60 characters");
 if(typeof m.version!=="string"||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(m.version))throw Error("Version must use MAJOR.MINOR.PATCH");
 if(m.entrypoint!==undefined&&m.entrypoint!=="index.html")throw Error("Only the index.html entrypoint is supported");
 if(typeof pkg.html!=="string"||!pkg.html.trim()||pkg.html.length>MAX_SOURCE)throw Error("HTML entrypoint is missing or too large");
 if(pkg.integrity!==undefined&&(!pkg.integrity||pkg.integrity.algorithm!=="SHA-256"||typeof pkg.integrity.digest!=="string"||!/^[a-f0-9]{64}$/.test(pkg.integrity.digest)))throw Error("Invalid SHA-256 integrity metadata");
 if(JSON.stringify(pkg).length>MAX_PACKAGE)throw Error("Package exceeds size limit");
 if(!Array.isArray(m.permissions)||m.permissions.length>ALLOWED.size||m.permissions.some(p=>!ALLOWED.has(p))||new Set(m.permissions).size!==m.permissions.length)throw Error("Unknown or duplicate permission");
 if(/<\s*(iframe|object|embed|base)\b/i.test(pkg.html))throw Error("Embedded browsing and plugin elements are not allowed");
 return {manifest:{id:m.id,name:m.name.trim(),version:m.version,description:String(m.description||"").slice(0,240),entrypoint:"index.html",permissions:[...m.permissions]},html:pkg.html,integrity:pkg.integrity||null};
}
function sandboxDocument(pkg,nonce){
 const csp="<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'\">";
 const bridge='<script>(function(){const token='+JSON.stringify(nonce)+';const allowed=new Set('+JSON.stringify(pkg.manifest.permissions)+');const pending=new Map();let seq=0;window.pijush={request:function(permission,method,args){if(!allowed.has(permission))return Promise.reject(Error("Permission not granted"));return new Promise(function(resolve,reject){const id=++seq;pending.set(id,{resolve:resolve,reject:reject});parent.postMessage({channel:"pijush-app",token:token,id:id,permission:permission,method:method,args:args},"*");setTimeout(function(){if(pending.has(id)){pending.delete(id);reject(Error("API timeout"));}},5000);});}};window.addEventListener("message",function(e){if(e.source!==parent||!e.data||e.data.channel!=="pijush-host"||e.data.token!==token)return;const p=pending.get(e.data.id);if(!p)return;pending.delete(e.data.id);e.data.error?p.reject(Error(e.data.error)):p.resolve(e.data.value);});})();</script>';
 let html=pkg.html;
 if(/<\s*head\b/i.test(html))html=html.replace(/<\s*head\b[^>]*>/i,m=>m+csp);else html=csp+html;
 if(/<\/body\s*>/i.test(html))html=html.replace(/<\/body\s*>/i,bridge+"</body>");else html+=bridge;
 return html;
}
const api={validatePackage,sandboxDocument,allowedPermissions:[...ALLOWED],maxSourceBytes:MAX_SOURCE};
root.PIJUSHAppPackages=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);

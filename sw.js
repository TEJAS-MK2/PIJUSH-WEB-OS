const CACHE="pijush-os-v12";
const ASSETS=["./","./index.html","./styles.css?v=12","./app.js?v=12","./kernel.js?v=12","./package-manager.js?v=12","./recovery.js?v=12","./system-center.js?v=12","./xp-suite.js?v=12","./manifest.webmanifest","./favicon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 const refreshFirst=request.mode==="navigate"||url.pathname.endsWith(".js")||url.pathname.endsWith(".css");
 if(refreshFirst){
  event.respondWith(fetch(request,{cache:"no-store"}).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});}
   return response;
  }).catch(async()=>{
   const cached=await caches.match(request);
   return cached||caches.match("./index.html");
  }));
  return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
  if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone())).catch(()=>{});
  return response;
 }).catch(()=>caches.match("./index.html"))));
});
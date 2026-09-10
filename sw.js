/* Simple PDF Converter service worker: makes the whole app work offline. */
const VERSION='v2026-09-10-2';
const CACHE='spc-'+VERSION;
const ASSETS=['./','./index.html','./jspdf.umd.min.js','./bg.jpg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;
  if(req.mode==='navigate'){
    // page: try network briefly, fall back to the cached app
    e.respondWith((async()=>{
      try{
        const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),3000);
        const res=await fetch(req,{signal:ctrl.signal}); clearTimeout(t);
        if(res&&res.ok){ const c=await caches.open(CACHE); c.put('./index.html',res.clone()); }
        return res;
      }catch(err){
        const c=await caches.open(CACHE);
        return (await c.match('./index.html'))||(await c.match('./'))||Response.error();
      }
    })());
    return;
  }
  // assets: cache first, refresh in background
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    const hit=await c.match(req,{ignoreSearch:true});
    const refresh=fetch(req).then(res=>{ if(res&&res.ok) c.put(req,res.clone()); return res; }).catch(()=>null);
    return hit||(await refresh)||Response.error();
  })());
});
self.addEventListener('message',e=>{ if(e.data==='skipWaiting') self.skipWaiting(); });

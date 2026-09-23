// Live Server is a static preview. Open the Node server for sessions and signaling.
(async()=>{
 const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 if(local&&location.port!=='3000'){
  try{
   const response=await fetch('/api/health',{signal:AbortSignal.timeout(2000)});
   const data=await response.json();
   if(data.app!=='Sheikh')throw new Error('Static preview');
  }catch{
   location.replace('http://localhost:3000/'+location.search+location.hash);
   return;
  }
 }
 for(const src of ['/socket.io/socket.io.js','/js/app.js']){
  try{await new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=src;
   script.onload=resolve;script.onerror=reject;document.body.append(script);
  });}catch{
   document.querySelector('#authError').textContent='Cannot connect to Sheikh. Start the Node server with npm start, then refresh.';
   break;
  }
 }
})();

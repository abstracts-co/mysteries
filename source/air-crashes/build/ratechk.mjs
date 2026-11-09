import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--ignore-gpu-blocklist','--enable-webgl','--use-angle=gl-egl','--use-gl=angle'] });
const p = await b.newPage();
await p.goto('http://127.0.0.1:8043/artifact/index.html?shot=1');
await p.waitForFunction(()=>!document.querySelector('#load')||document.querySelector('#load').style.opacity==='0',{timeout:120000});
const ids = (process.env.IDS || 'af447,mh370,twa800,egyptair990,airnz901,jal123,stardust,earhart,ladybegood,flight19').split(',');
for (const id of ids) {
  const r = await p.evaluate(async (id)=>{ const M=window.__mysteries; await M.open(id,{paused:1}); const s=M.sim(); const out=[];
    for (const [i,B] of s.beats.entries()) { let mx=0, mn=1e9; const N=60; for (let k=0;k<N;k++){ const a=B.s+B.len*k/N, c=Math.min(B.s+B.len*(k+1)/N, B.s+B.len-1e-3); const r=(s.realOf(c)-s.realOf(a))/(c-a); mx=Math.max(mx,r); mn=Math.min(mn,r);} out.push(`${i}:${B.v||'-'} ${B.len.toFixed(1)}s x${mn.toFixed(1)}..${mx.toFixed(0)}`); }
    return id+' | '+out.join(' | ')+' || cuts '+s.cuts.map(c=>Math.round(c.skip/60)+'m').join(','); }, id);
  console.log(r);
}
await b.close();

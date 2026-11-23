import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5176'],{windowsHide:true,stdio:'pipe'});let browser;
try{
  await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))resolve();});server.on('error',reject);setTimeout(()=>reject(new Error('Preview startup timeout')),15000).unref();});
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://127.0.0.1:5176/');await page.waitForFunction(()=>document.querySelector('#vr-entry .vr-button')&&!document.querySelector('#vr-entry').textContent.includes('جارٍ'),null,{timeout:20000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);await fs.mkdir('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/welcome.png'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);await page.screenshot({path:'docs/screenshots/mobile.png'});
  console.log('Captured the production welcome screens without debug controls.');
}finally{await browser?.close();server.kill();}

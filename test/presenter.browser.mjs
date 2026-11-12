import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import {render} from '../render.mjs';

test('presenter windows, isolated sessions, notes, timer, fallbacks, touch and print', {timeout:60000}, async()=>{
 const deck=render('# First\n<!-- First note <img src=x onerror="window.noteExecuted=true"> -->\n\n---\n# Second\n<!-- Second note -->\n\n---\n# Third','default',new Map(),'Presenter test');
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; base-uri 'none'; frame-src 'self'; frame-ancestors 'self'");res.end(deck.html);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/d/test/`;
 let browser;
 try {
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true});
 const errors=[];
 const manual=await browser.newPage(),isolated=await browser.newPage(),noChannel=await browser.newPage(),normal=await browser.newPage();
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1400,height:1000});
 await page.goto(base+'#2');assert.equal(await page.$eval('#count',e=>e.textContent),'2 / 3');
 await page.click('#presenter');await page.waitForFunction(()=>document.body.classList.contains('presenter'));
 assert.equal(await page.$eval('#speaker-notes',e=>e.textContent),'Second note');
 await page.waitForFunction(()=>document.querySelector('#current-preview').contentDocument?.querySelector('#count')?.textContent==='2 / 3');
 await page.waitForFunction(()=>document.querySelector('#next-preview').contentDocument?.querySelector('#count')?.textContent==='3 / 3');
 const audiencePromise=new Promise(resolve=>page.once('popup',resolve));await page.click('#open-audience');const audience=await Promise.race([audiencePromise,new Promise((_,reject)=>setTimeout(()=>reject(Error('No audience popup')),5000))]);
 audience.on('pageerror',e=>errors.push(e.message));await audience.waitForSelector('.active');
 await audience.waitForFunction(()=>document.querySelector('#count').textContent==='2 / 3');
 assert.equal(await audience.$eval('#viewer-nav',e=>getComputedStyle(e).display),'none');
 assert.equal(await audience.$eval('#presenter-panel',e=>getComputedStyle(e).display),'none');
 await page.click('#next');await audience.waitForFunction(()=>document.querySelector('#count').textContent==='3 / 3');
 assert.equal(await page.$eval('#end-of-deck',e=>e.hidden),false);
 assert.equal(await page.$eval('#speaker-notes',e=>e.textContent),'No speaker notes for this slide.');
 await audience.keyboard.press('ArrowLeft');await page.waitForFunction(()=>document.querySelector('#count').textContent==='2 / 3');
 await page.keyboard.press('ArrowLeft');await audience.waitForFunction(()=>document.querySelector('#count').textContent==='1 / 3');
 assert.match(await page.$eval('#speaker-notes',e=>e.textContent),/<img/);assert.equal(await page.$('#speaker-notes img'),null);assert.equal(await page.evaluate(()=>window.noteExecuted),undefined);
 
 // Opening an old manual URL synchronizes to the presenter's current slide.
 await page.bringToFront();await page.click('#next');await manual.goto((await page.$eval('#audience-link',e=>e.href)).replace(/#\d+$/,'#1'));
 await manual.waitForFunction(()=>document.querySelector('#count').textContent==='2 / 3',{timeout:5000});
 await isolated.goto(base+'?view=audience&session=unrelated#1');
 await page.click('#next');await audience.waitForFunction(()=>document.querySelector('#count').textContent==='3 / 3',{timeout:5000});
 assert.equal(await isolated.$eval('#count',e=>e.textContent),'1 / 3');
 await audience.reload();await audience.waitForFunction(()=>document.querySelector('#count').textContent==='3 / 3');
 await page.click('#timer-toggle');await page.waitForFunction(()=>document.querySelector('#timer').textContent!=='00:00');await page.click('#timer-toggle');
 const paused=await page.$eval('#timer',e=>e.textContent);await new Promise(r=>setTimeout(r,1100));assert.equal(await page.$eval('#timer',e=>e.textContent),paused);
 await page.click('#timer-reset');assert.equal(await page.$eval('#timer',e=>e.textContent),'00:00');
 await page.evaluate(()=>{window.open=()=>null;});await page.click('#open-audience');assert.match(await page.$eval('#presenter-status',e=>e.textContent),/Popup blocked/);
 await audience.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(Error('denied'));});await audience.keyboard.press('f');await audience.waitForSelector('#viewer-help.open');await audience.keyboard.press('Escape');assert.equal(await audience.$eval('#viewer-help',e=>e.classList.contains('open')),false);
 await noChannel.evaluateOnNewDocument(()=>{delete window.BroadcastChannel;});await noChannel.goto(base+'?view=presenter&session=fallback');assert.equal(await noChannel.$eval('#open-audience',e=>e.disabled),true);assert.match(await noChannel.$eval('#presenter-status',e=>e.textContent),/BroadcastChannel/);
 await normal.goto(base);await normal.evaluate(()=>{for(const [type,x]of [['touchstart',200],['touchend',30]]){const e=new Event(type);Object.defineProperty(e,'changedTouches',{value:[{clientX:x}]});window.dispatchEvent(e);}});assert.equal(await normal.$eval('#count',e=>e.textContent),'2 / 3');
 await normal.emulateMediaType('print');assert.equal(await normal.$$eval('body>.marpit>svg',ss=>ss.filter(s=>getComputedStyle(s).display!=='none').length),3);assert.equal(await normal.$eval('#viewer-nav',e=>getComputedStyle(e).display),'none');
 const pdf=Buffer.from(await normal.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 await page.emulateMediaType('print');assert.equal(await page.$$eval('body>.marpit>svg',ss=>ss.filter(s=>getComputedStyle(s).display!=='none').length),3);assert.equal(await page.$eval('#presenter-panel',e=>getComputedStyle(e).display),'none');await page.emulateMediaType('screen');
 if(process.env.TEST_OUTPUT_DIR){await fs.mkdir(process.env.TEST_OUTPUT_DIR,{recursive:true});await page.screenshot({path:process.env.TEST_OUTPUT_DIR+'/presenter.png',fullPage:true});await audience.screenshot({path:process.env.TEST_OUTPUT_DIR+'/audience.png'});await fs.writeFile(process.env.TEST_OUTPUT_DIR+'/slides.pdf',pdf);}
 assert.deepEqual(errors,[]);
 } finally {await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';
const token=process.env.PUBLISH_TOKEN;
if(!token)throw Error('Set PUBLISH_TOKEN');
const baseUrl=process.env.PUBLIC_URL||'http://localhost:3000';
const output=process.env.TEST_OUTPUT_DIR||'output';
await fs.mkdir(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true});
try{
const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.goto(baseUrl,{waitUntil:'networkidle0'});
await page.type('#token',token);await page.select('#theme',process.env.TEST_THEME||'slate');await page.click('#publish');
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Published'),{timeout:90000});
const result=await page.$eval('#links',e=>[...e.querySelectorAll('a')].map(a=>a.href));console.log(JSON.stringify({links:result}));
await page.click('#publish');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Published'),{timeout:90000});
const again=await page.$eval('#links a',a=>a.href);if(again!==result[0])throw Error('unstable URL');
await page.goto(result[0],{waitUntil:'networkidle0'});await page.click('#next');if(await page.$eval('#count',e=>e.textContent)!=='2 / 2')throw Error('navigation failed');
await page.screenshot({path:output+'/mobile.png'});
const pdf=await fetch(result[1]);const bytes=Buffer.from(await pdf.arrayBuffer());if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('not PDF');await fs.writeFile(output+'/demo.pdf',bytes);
await fs.writeFile(output+'/verification.json',JSON.stringify({url:result[0],pdf:result[1],stable:true,navigation:true,pdfBytes:bytes.length},null,2));console.log('Browser publish, republish, navigation and PDF download passed');
}finally{await browser.close()}

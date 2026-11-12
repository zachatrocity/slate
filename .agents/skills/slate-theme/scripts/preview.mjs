#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {render,themeName} from '../../../../render.mjs';
import puppeteer from 'puppeteer-core';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const [slug,example]=process.argv.slice(2);
if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw Error('Usage: preview.mjs <theme-slug> [example.md]');
const themes=new Map();
for(const name of await fs.readdir(path.join(root,'themes'))){
 if(name.endsWith('.css')){const css=await fs.readFile(path.join(root,'themes',name),'utf8');const id=themeName(css);if(themes.has(id))throw Error('Duplicate theme: '+id);themes.set(id,css);}
}
if(!themes.has(slug))throw Error('Theme not found: '+slug);
const output=path.join(root,'output','theme-previews',slug);
await fs.mkdir(output,{recursive:true});
const fixture=`---
paginate: true
footer: Theme validation
---
# A clear idea deserves room to breathe

A realistic subtitle with **emphasis** and an *alternative voice*.

---
# A deliberately longer heading to check wrapping and spacing

- An important point with enough words to fill more than one short line
- A supporting point with **emphasis**, a [link](https://example.com), and inline \`code\`
  - A nested detail with ordinary presentation-length text
- A final takeaway

> A memorable quotation should remain readable from the back of the room.

---
# Data, code, and equations

| Quarter | Revenue | Change |
| :--- | ---: | ---: |
| Q1 | 120,000 | +12% |
| Q2 | 144,000 | +20% |

\`\`\`javascript
const message = "Make the next step obvious";
console.log(message);
\`\`\`

Inline math: $E=mc^2$. Display math:

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

---
![bg right:40%](assets/crystal.png)
# Image and text

Local images should stay crisp and leave room for the message.

1. Explain the context
2. Show the evidence
3. Make a recommendation
`;
let markdown=example?await fs.readFile(path.resolve(example),'utf8'):fixture;
const assetRoot=example?path.dirname(path.resolve(example)):path.join(root,'examples');
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'};
// Inline raster assets so the preview is portable and browser file access stays disabled.
const pieces=markdown.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g);
for(let i=0;i<pieces.length;i+=2){
 for(const match of [...pieces[i].matchAll(/!\[([^\]]*)\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)]){
  const link=match[2].replace(/^<|>$/g,'');
  if(link.startsWith('data:image/'))continue;
  if(/^[a-z]+:|^\/\//i.test(link))throw Error('Save remote images locally before previewing: '+link);
  const file=path.resolve(assetRoot,decodeURIComponent(link));
  if(!mime[path.extname(file).toLowerCase()])throw Error('Use local PNG/JPEG/WebP/GIF: '+link);
  const data=await fs.readFile(file);
  pieces[i]=pieces[i].replace(match[0],`![${match[1]}](data:${mime[path.extname(file).toLowerCase()]};base64,${data.toString('base64')})`);
 }
 if(/!\[\[|!\[[^\]]*\]\[/.test(pieces[i]))throw Error('Use inline Markdown images in the preview fixture.');
}
markdown=pieces.join('');
const deck=render(markdown,slug,themes,'Theme preview: '+slug);
await fs.writeFile(path.join(output,'preview.html'),deck.html);
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true});
try{
 const page=await browser.newPage();
 await page.setRequestInterception(true);
 const blocked=new Set();
 page.on('request',request=>{
  if(/^(data:|about:)/.test(request.url()))request.continue();
  else{blocked.add(request.url());request.abort();}
 });
 await page.setViewport({width:Math.round(deck.width),height:Math.round(deck.height)});
 await page.setContent(deck.html,{waitUntil:'networkidle0'});
 await page.evaluate(()=>document.fonts.ready);
 const diagnostics=[];
 for(let i=0;i<deck.slides;i++){
  if(i)await page.click('#next');
  const overflow=await page.$eval('.marpit>svg.active',svg=>[...svg.querySelectorAll('section')].map(s=>({width:s.clientWidth,height:s.clientHeight,scrollWidth:s.scrollWidth,scrollHeight:s.scrollHeight})).filter(s=>s.scrollWidth>s.width+2||s.scrollHeight>s.height+2));
  diagnostics.push({slide:i+1,overflow});
  await page.screenshot({path:path.join(output,`slide-${String(i+1).padStart(2,'0')}.png`)});
 }
 await page.pdf({path:path.join(output,'preview.pdf'),printBackground:true,preferCSSPageSize:true});
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 // Mobile emulation may reload the page; restore the self-contained document.
 await page.setContent(deck.html,{waitUntil:'networkidle0'});
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(output,'mobile.png')});
 const report={theme:slug,slides:deck.slides,width:deck.width,height:deck.height,blockedRequests:[...blocked],diagnostics,visualReviewRequired:true};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({output,slides:deck.slides,blockedRequests:blocked.size,overflowSlides:diagnostics.filter(x=>x.overflow.length).map(x=>x.slide)}));
 if(blocked.size)process.exitCode=1;
}finally{await browser.close()}

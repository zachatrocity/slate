import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer-core';
import {render,themeName} from './render.mjs';
const app=express(), root=path.resolve(process.env.DATA_DIR||'data'), origin=(process.env.PUBLIC_URL||'http://localhost:3000').replace(/\/$/,'');
const token=process.env.PUBLISH_TOKEN;if(!token||token.length<24)throw Error('PUBLISH_TOKEN must be set (at least 24 characters)');
await fs.mkdir(root,{recursive:true});await fs.mkdir(path.join(root,'themes'),{recursive:true});
const themes=new Map();for(const dir of ['themes',path.join(root,'themes')])for(const name of await fs.readdir(dir))if(name.endsWith('.css')){const css=await fs.readFile(path.join(dir,name),'utf8');themes.set(themeName(css),css);}
app.disable('x-powered-by');app.use(express.json({limit:'60mb'}));
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const auth=(req,res,next)=>{const b=Buffer.from((req.headers.authorization||'').replace(/^Bearer /,'')),a=Buffer.from(token);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:'Publishing token required'});next();};
app.get('/health',(_,res)=>res.json({ok:true}));
app.get('/api/themes',(_,res)=>res.json({themes:['default','gaia','uncover',...themes.keys()].map(id=>({id,name:id.replace(/_/g,' ')})),gallery:'https://rnd195.github.io/marp-community-themes/'}));
app.post('/api/themes',auth,async(req,res,next)=>{try{const css=req.body.css;if(typeof css!=='string'||css.length>300000)throw Error('CSS must be under 300 KB');const name=themeName(css);if(['default','gaia','uncover'].includes(name))throw Error('Cannot overwrite built-in themes');const m=new Map(themes);m.set(name,css);render('# Theme check',name,m,'Theme check');await fs.writeFile(path.join(root,'themes',name+'.css'),css);themes.set(name,css);res.json({id:name});}catch(e){next(e)}});
let active=false;
app.post('/api/decks',auth,async(req,res,next)=>{
 if(active)return res.status(409).json({error:'Another deck is rendering. Try again shortly.'});active=true;let temp,browser;
 try{
 const {markdown,title='Untitled presentation',theme,assets=[]}=req.body;
 if(typeof markdown!=='string'||markdown.length>1000000)throw Error('Markdown required (max 1 MB)');
 if(typeof title!=='string'||title.length>300)throw Error('Title must be under 300 characters');
 if(!Array.isArray(assets)||assets.length>100)throw Error('Maximum 100 images');
 const id=req.body.id||crypto.randomUUID();if(!uuid.test(id))throw Error('Invalid deck ID');
 temp=path.join(root,'.render-'+crypto.randomUUID());await fs.mkdir(path.join(temp,'assets'),{recursive:true});
 if(/!\[\[/.test(markdown))throw Error('Unresolved Obsidian embed; publish through the plugin to include vault images');
 const files=new Map();let total=0;
 for(const a of assets){if(typeof a.name!=='string'||!/^[-\w.]+$/.test(a.name)||a.name.startsWith('.')||files.has(a.name))throw Error('Invalid or duplicate image name');if(!['image/png','image/jpeg','image/gif','image/webp'].includes(a.mime))throw Error('Supported images: PNG, JPEG, GIF, WebP');if(typeof a.base64!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(a.base64))throw Error('Invalid image encoding');const bytes=Buffer.from(a.base64,'base64');total+=bytes.length;if(bytes.length>15*1024*1024||total>40*1024*1024)throw Error('Image size limit exceeded');files.set(a.name,{bytes,mime:a.mime});await fs.writeFile(path.join(temp,'assets',a.name),bytes);}
 const deck=render(markdown,theme,themes,title);if(deck.slides>150)throw Error('Maximum 150 slides');
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const missingImages=new Set();const page=await browser.newPage();await page.setRequestInterception(true);
 page.on('request',r=>{const u=new URL(r.url());if(u.origin==='https://deck.invalid'&&u.pathname.startsWith('/assets/')){const file=files.get(decodeURIComponent(u.pathname.slice(8)));if(file)return r.respond({status:200,contentType:file.mime,body:file.bytes});}if(u.protocol==='data:')return r.continue();if(r.resourceType()==='image')missingImages.add(u.pathname);return r.abort();});
 await page.setContent(deck.html.replace('<head>','<head><base href="https://deck.invalid/">'),{waitUntil:'networkidle0',timeout:30000});
 await page.emulateMediaType('print');await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 if(missingImages.size)throw Error('Missing or remote image: '+[...missingImages].join(', '));
 await page.pdf({path:path.join(temp,'slides.pdf'),preferCSSPageSize:true,printBackground:true,timeout:60000});await browser.close();browser=null;
 await fs.writeFile(path.join(temp,'index.html'),deck.html);await fs.writeFile(path.join(temp,'source.md'),markdown);await fs.writeFile(path.join(temp,'meta.json'),JSON.stringify({id,title,theme:deck.theme,slides:deck.slides,updated:new Date().toISOString()}));
 // Atomic pointer swap: readers see the old complete revision or the new complete revision.
 const revisions=path.join(root,'revisions');await fs.mkdir(revisions,{recursive:true});const revision=crypto.randomUUID();await fs.rename(temp,path.join(revisions,revision));temp=null;
 const pointer=path.join(root,id+'.json'),pending=pointer+'.tmp';await fs.writeFile(pending,JSON.stringify({revision}));await fs.rename(pending,pointer);
 res.json({id,url:`${origin}/d/${id}/`,pdfUrl:`${origin}/d/${id}/slides.pdf`,theme:deck.theme,slides:deck.slides});
 }catch(e){next(e)}finally{if(browser)await browser.close();if(temp)await fs.rm(temp,{recursive:true,force:true});active=false;}
});
app.get(/^\/d\/([\w-]+)(?:\/(.*))?$/,async(req,res,next)=>{try{const id=req.params[0],file=req.params[1]||'index.html';if(!uuid.test(id))return res.sendStatus(404);if(!req.path.endsWith('/')&&!req.params[1])return res.redirect(302,req.path+'/');if(!['index.html','slides.pdf'].includes(file)&&!/^assets\/[-\w.]+$/.test(file))return res.sendStatus(404);const {revision}=JSON.parse(await fs.readFile(path.join(root,id+'.json'),'utf8'));res.set('Cache-Control','no-cache');res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','no-referrer');res.set('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; base-uri 'none'; frame-src 'self'; frame-ancestors 'self'");res.sendFile(path.join(root,'revisions',revision,file));}catch(e){if(e.code==='ENOENT')res.sendStatus(404);else next(e)}});
app.use(express.static('public'));
app.use((err,req,res,next)=>{console.error(err.message);res.status(err.type==='entity.too.large'?413:400).json({error:err.message||'Could not render deck'});});
app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Slate ready'));

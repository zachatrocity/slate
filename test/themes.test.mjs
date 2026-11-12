import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {render,themeName} from '../render.mjs';
const themes=new Map();
for(const file of await fs.readdir(new URL('../themes/',import.meta.url))){
 if(file.endsWith('.css')){const css=await fs.readFile(new URL('../themes/'+file,import.meta.url),'utf8');themes.set(themeName(css),css);}
}
for(const name of ['dracula','nord','neobeam','rose-pine','rose-pine-moon','rose-pine-dawn']){
 test(`${name}: renders offline with valid theme imports`,()=>{
  const css=themes.get(name);assert.ok(css);
  for(const m of css.matchAll(/@import\s+["']([^"']+)["']/g))assert.ok(['default','gaia','uncover',...themes.keys()].includes(m[1]),m[1]);
  assert.doesNotMatch(css,/@import\s+url\(["']?https?:/);
  const deck=render('# Theme test\n\n**Bold** and $E=mc^2$\n\n---\n# Code\n\n```js\nconst slides = 2;\n```',name,themes,'Theme test');
  assert.equal(deck.slides,2);assert.ok(deck.width>0&&deck.height>0);
 });
}

import {test} from 'node:test';import assert from 'node:assert/strict';import {render,themeName} from '../render.mjs';
test('slides and metadata preserved without exposing publishing properties',()=>{const d=render('---\npaginate: true\nslides_url: https://private.invalid\n---\n# One\n\n---\n\n# Two','gaia',new Map(),'Title');assert.equal(d.slides,2);assert.equal(d.theme,'gaia');assert.ok(!d.html.includes('private.invalid'));assert.ok(d.html.includes('@page{size:1280px 720px'));});
test('custom theme and unknown theme validation',()=>{const css='/* @theme custom */\n@import "default";\nsection{background:red}';assert.equal(themeName(css),'custom');assert.equal(render('# hi','custom',new Map([['custom',css]]),'test').slides,1);assert.throws(()=>render('# hi','missing',new Map(),'t'));});
test('author HTML and title injection not executable',()=>{const d=render('<script>alert(1)</script>','default',new Map(),'</title><script>bad()</script>');assert.ok(!d.html.includes('<script>alert(1)</script>'));assert.ok(!d.html.includes('<script>bad()</script>'));});
test('speaker notes stay aligned, exclude directives, and cannot break their JSON container',()=>{
 const d=render('# One\n<!-- Remember <img src=x onerror=alert(1)> and </script><script>bad()</script> -->\n<!-- _class: lead -->\n\n---\n# Two\n<!-- Second note -->','default',new Map(),'Notes');
 const encoded=d.html.match(/<script id="slide-notes" type="application\/json">([\s\S]*?)<\/script>/)[1];
 const notes=JSON.parse(encoded);assert.equal(notes.length,2);assert.match(notes[0][0],/Remember/);assert.equal(notes[1][0],'Second note');assert.ok(!encoded.includes('<'));assert.ok(!notes.flat().some(n=>n.includes('_class')));
});

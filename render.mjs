import {Marp} from '@marp-team/marp-core';
import YAML from 'yaml';
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function themeName(css){const n=css.match(/@theme\s+([\w-]+)/)?.[1];if(!n)throw Error('CSS needs a /* @theme name */ declaration');return n;}
export function render(markdown, theme, themes, title){
 let body=markdown, fm={};const match=markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 if(match){fm=YAML.parse(match[1])||{};if(typeof fm!=='object'||Array.isArray(fm))throw Error('Invalid frontmatter');body=markdown.slice(match[0].length);}
 const selected=theme||fm.slide_theme||fm.theme||'default';
 if(!['default','gaia','uncover',...themes.keys()].includes(selected))throw Error('Unknown theme: '+selected);
 // Keep author-facing Marp options, never render private publishing metadata.
 const allowed={};for(const k of ['paginate','size','class','header','footer','backgroundColor','color'])if(k in fm)allowed[k]=fm[k];
 allowed.theme=selected;
 const marp=new Marp({html:false});for(const css of themes.values())marp.themeSet.add(css);
 const r=marp.render('---\n'+YAML.stringify(allowed)+'---\n'+body);
 const dimensions=r.html.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);const width=Number(dimensions?.[1]||1280),height=Number(dimensions?.[2]||720);
 const css=r.css.replace(/<\/style/gi,'<\\/style');
 const shell=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}\nhtml,body{margin:0;background:#101119}.marpit>svg{display:block;width:100%;height:auto}.marpit>svg{break-after:page} @page{size:${width}px ${height}px;margin:0} @media print{html,body{background:white}.marpit>svg{width:${width}px;height:${height}px}nav{display:none!important}} @media screen{body.present .marpit>svg{display:none}body.present .marpit>svg.active{display:block;width:100vw;height:100dvh}nav{position:fixed;bottom:12px;right:14px;background:#171c2b;color:white;border-radius:24px;padding:7px;display:flex;align-items:center;gap:10px;font:14px system-ui;z-index:10}nav button,nav a{border:0;background:transparent;color:inherit;font:inherit;padding:8px;text-decoration:none;cursor:pointer}}</style></head><body>${r.html}<nav><button id="prev" aria-label="Previous slide">←</button><span id="count"></span><button id="next" aria-label="Next slide">→</button><button id="full" aria-label="Fullscreen">⛶</button><a href="./slides.pdf">PDF</a></nav><script>
const slides=[...document.querySelectorAll('.marpit>svg')];let i=Math.max(0,Math.min(slides.length-1,(parseInt(location.hash.slice(1))||1)-1));document.body.classList.add('present');function show(n){i=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,j)=>s.classList.toggle('active',i===j));document.getElementById('count').textContent=(i+1)+' / '+slides.length;history.replaceState(null,'','#'+(i+1));}document.getElementById('next').onclick=()=>show(i+1);document.getElementById('prev').onclick=()=>show(i-1);document.getElementById('full').onclick=()=>document.documentElement.requestFullscreen?.();addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown',' '].includes(e.key)){e.preventDefault();show(i+1)}if(['ArrowLeft','ArrowUp'].includes(e.key))show(i-1)});let x;addEventListener('touchstart',e=>{x=e.changedTouches[0].clientX},{passive:true});addEventListener('touchend',e=>{let d=e.changedTouches[0].clientX-x;if(Math.abs(d)>50)show(i+(d<0?1:-1))},{passive:true});show(i);
</script></body></html>`;
 return {html:shell,width,height,theme:selected,slides:(r.html.match(/data-marpit-svg=/g)||[]).length};
}

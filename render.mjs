import {viewerStyles,viewerMarkup,viewerClient} from './viewer.mjs';
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
 const marp=new Marp({html:false,emoji:{unicode:true,shortcode:true}});for(const css of themes.values())marp.themeSet.add(css);
 const r=marp.render('---\n'+YAML.stringify(allowed)+'---\n'+body);
 const dimensions=r.html.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);const width=Number(dimensions?.[1]||1280),height=Number(dimensions?.[2]||720);
 const css=r.css.replace(/<\/style/gi,'<\\/style');
 // Notes are public deck data; encode as inert JSON, never interpolate as HTML.
 const notes=JSON.stringify(r.comments||[]).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 const shell=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}\n${viewerStyles} @page{size:${width}px ${height}px;margin:0} @media print{body>.marpit>svg{width:${width}px;height:${height}px}}</style></head><body>${r.html}${viewerMarkup}<script id="slide-notes" type="application/json">${notes}</script><script>(${viewerClient.toString()})();</script></body></html>`;

 return {html:shell,width,height,theme:selected,slides:(r.html.match(/data-marpit-svg=/g)||[]).length};
}

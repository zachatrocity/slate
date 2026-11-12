// Embedded into each published deck so its viewer is versioned with the deck.
export const viewerStyles = `
html,body{margin:0;background:#101119}.marpit>svg{display:block;width:100%;height:auto;break-after:page}
#presenter-panel,#viewer-help{display:none}
#presenter-panel [hidden],#viewer-nav [hidden]{display:none!important}
#leave-presenter{color:#c6b2f2}
@media print{html,body{background:white}nav,#presenter-panel,#viewer-help{display:none!important}}
@media screen{
 body.present>.marpit>svg{display:none}body.present>.marpit>svg.active{display:block;width:100vw;height:100dvh}
 #viewer-nav{position:fixed;bottom:12px;right:14px;background:#171c2b;color:white;border-radius:24px;padding:7px;display:flex;align-items:center;gap:10px;font:14px system-ui;z-index:10;max-width:calc(100vw - 42px);flex-wrap:wrap}
 #viewer-nav button,#viewer-nav a{border:0;background:transparent;color:inherit;font:inherit;padding:8px;text-decoration:none;cursor:pointer}
 body.audience #viewer-nav,body.preview #viewer-nav{display:none}
 body.presenter{background:#19171f;color:#eeeaf4;font:16px/1.5 system-ui}
 body.presenter>.marpit{display:none}
 body.presenter #presenter-panel{display:block;max-width:1400px;padding:24px;margin:auto}
 body.presenter #viewer-nav{position:static;margin:12px 0;border-radius:10px;width:fit-content}
 #presenter-panel h1{font-size:24px;margin:0}#presenter-panel h2{font-size:16px;margin:12px 0 6px;color:#c6b2f2}
 .presenter-previews{display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:start}
 .presenter-previews iframe{pointer-events:none;width:100%;border:1px solid #514461;border-radius:8px;background:#101119;aspect-ratio:var(--slide-ratio)}
 #speaker-notes{white-space:pre-wrap;overflow-wrap:anywhere;background:#211e29;border-radius:8px;padding:20px;min-height:100px}
 #presenter-panel button,#audience-link{background:#b69aff;color:#211534;border:0;border-radius:6px;padding:10px 14px;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}
 #presenter-panel button:disabled{opacity:.5;cursor:default}
 .presenter-actions,.timer-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:14px 0}
 #timer{font:28px ui-monospace,monospace;font-variant-numeric:tabular-nums}
 #presenter-status{color:#c6b2f2}#presenter-panel details{margin:16px 0}#presenter-panel small{color:#b8b0c5}
 #viewer-help.open{display:block;position:fixed;inset:20% 10%;z-index:20;padding:24px;background:#211e29;color:#eeeaf4;font:18px system-ui;border:1px solid #b69aff;border-radius:12px}
 @media(max-width:700px){.presenter-previews{grid-template-columns:1fr}body.presenter #presenter-panel{padding:14px}}
}`;

export const viewerMarkup = `
<nav id="viewer-nav" aria-label="Slide controls"><button id="prev" aria-label="Previous slide">←</button><span id="count" aria-live="polite"></span><button id="next" aria-label="Next slide">→</button><button id="full" aria-label="Fullscreen">⛶</button><a href="./slides.pdf">PDF</a><button id="presenter">Presenter</button></nav>
<main id="presenter-panel">
 <h1>Presenter view</h1>
 <div class="presenter-actions"><button id="open-audience">Open audience window</button><a id="audience-link" target="_blank" rel="noopener">Open manually</a></div>
 <p id="presenter-status" role="status"></p>
 <div id="presenter-navigation"></div>
 <div class="presenter-previews"><section><h2>Current slide</h2><iframe id="current-preview" title="Current slide preview" tabindex="-1"></iframe></section><section><h2>Next slide</h2><iframe id="next-preview" title="Next slide preview" tabindex="-1"></iframe><p id="end-of-deck" hidden>End of presentation</p></section></div>
 <h2>Speaker notes</h2><div id="speaker-notes"></div>
 <div class="timer-controls"><output id="timer" aria-label="Elapsed presentation time">00:00</output><button id="timer-toggle">Start timer</button><button id="timer-reset">Reset timer</button></div>
 <details><summary>Projector setup and limitations</summary><ol><li>Open the audience window and move it to the projector or second display.</li><li>Click inside that window and press F or double-click to enter fullscreen. Press Escape to leave fullscreen.</li><li>If a popup is blocked, use Open manually. If fullscreen is unavailable, maximize the audience window or use browser fullscreen.</li></ol><p>Both windows must use the same browser profile and deck/session URL. This does not cast to another device or make a phone a remote control. Mobile browsers may restrict multiple windows and fullscreen.</p><p>Notes are embedded in the published deck and can be read by anyone with access to it. They are hidden on the audience screen, not protected as secrets.</p></details>
 <a id="leave-presenter" href="?">Return to slideshow</a>
</main>
<div id="viewer-help" role="status"></div>`;

export function viewerClient() {
 const $ = id => document.getElementById(id);
 const slides = [...document.querySelectorAll('body>.marpit>svg')];
 if (!slides.length) return;
 const notes = JSON.parse($('slide-notes').textContent);
 const params = new URLSearchParams(location.search);
 const mode = ['presenter','audience','preview'].includes(params.get('view')) ? params.get('view') : 'normal';
 let session = params.get('session');
 if (mode === 'presenter' && !session) {
  session = crypto.randomUUID(); params.set('session', session);
  history.replaceState(null, '', '?' + params.toString() + location.hash);
 }
 const clamp = n => Math.max(0, Math.min(slides.length - 1, n));
 const fromHash = () => clamp((parseInt(location.hash.slice(1), 10) || 1) - 1);
 let index = fromHash(), channel, audienceWindow, elapsed = 0, started = null;
 document.body.classList.add('present', mode);
 const urlFor = (view, slide=index) => {
  const url = new URL(location.href); url.search = ''; url.searchParams.set('view', view);
  if (session && view !== 'preview') url.searchParams.set('session', session);
  url.hash = String(slide + 1); return url.href;
 };
 function status(message) { $('presenter-status').textContent = message; }
 function send(message) { channel?.postMessage(message); }
 function show(next, broadcast = true) {
  if (!Number.isInteger(next)) return;
  index = clamp(next);
  slides.forEach((slide, i) => slide.classList.toggle('active', index === i));
  $('count').textContent = `${index + 1} / ${slides.length}`;
  $('prev').disabled = index === 0; $('next').disabled = index === slides.length - 1;
  history.replaceState(null, '', location.pathname + location.search + '#' + (index + 1));
  if (mode === 'presenter') {
   $('current-preview').src = urlFor('preview');
   $('next-preview').hidden = index === slides.length - 1;
   $('end-of-deck').hidden = index !== slides.length - 1;
   if (index < slides.length - 1) $('next-preview').src = urlFor('preview', index + 1);
   $('speaker-notes').textContent = (notes[index] || []).join('\n\n') || 'No speaker notes for this slide.';
   $('audience-link').href = urlFor('audience');
   const plain = new URL(location.href); plain.search = ''; $('leave-presenter').href = plain.href;
  }
  if (broadcast) send({type:'slide', index});
 }
 if (['presenter','audience'].includes(mode)) {
  if (session && 'BroadcastChannel' in window) {
   try {
    channel = new BroadcastChannel('slate:' + location.pathname + ':' + session);
    channel.onmessage = ({data}) => {
     if (!data || typeof data !== 'object') return;
     if (data.type === 'slide' && Number.isInteger(data.index)) show(data.index, false);
     if (data.type === 'hello' && mode === 'presenter') { send({type:'slide',index}); status('Audience connected. Move its window to the projector, then press F there for fullscreen.'); }
    };
   } catch { status('Window synchronization is unavailable. Use the regular slideshow in one window.'); }
  } else status('Window synchronization requires BroadcastChannel and a shared session URL. Use the regular slideshow instead.');
 }
 if (mode === 'presenter') {
  $('presenter-navigation').append($('viewer-nav')); $('presenter').hidden = true; $('full').hidden = true;
  if (channel) status('Open the audience window, then move it to your projector or external display.');
  $('open-audience').disabled = !channel; $('audience-link').hidden = !channel;
  const ratio = slides[0].getAttribute('viewBox')?.split(/\s+/).slice(2).join(' / ') || '16 / 9';
  document.documentElement.style.setProperty('--slide-ratio', ratio);
  $('open-audience').onclick = () => {
   audienceWindow = window.open(urlFor('audience'), 'slate-audience-' + session, 'popup,width=1280,height=720');
   status(audienceWindow ? 'Audience window opened. Move it to your external display and press F there.' : 'Popup blocked. Use Open manually, or allow popups for this site.');
  };
  const paintTimer = () => {
   const seconds = Math.floor((elapsed + (started === null ? 0 : performance.now() - started)) / 1000);
   $('timer').textContent = `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${(seconds % 60).toString().padStart(2,'0')}`;
  };
  $('timer-toggle').onclick = () => {
   if (started === null) { started = performance.now(); $('timer-toggle').textContent = 'Pause timer'; }
   else { elapsed += performance.now() - started; started = null; $('timer-toggle').textContent = 'Start timer'; }
   paintTimer();
  };
  $('timer-reset').onclick = () => { elapsed = 0; started = null; $('timer-toggle').textContent = 'Start timer'; paintTimer(); };
  setInterval(paintTimer, 250);
 }
 $('presenter').onclick = () => {
  session = crypto.randomUUID(); location.href = urlFor('presenter');
 };
 $('prev').onclick = () => show(index - 1); $('next').onclick = () => show(index + 1);
 async function fullscreen() {
  try {
   if (!document.documentElement.requestFullscreen) throw Error('Fullscreen unavailable');
   if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();
  } catch {
   $('viewer-help').textContent = 'Fullscreen is unavailable here. Maximize this window or use your browser’s fullscreen command. Press Escape or click this message to dismiss.';
   $('viewer-help').classList.add('open');
  }
 }
 $('viewer-help').onclick = () => $('viewer-help').classList.remove('open');
 $('full').onclick = fullscreen;
 if (mode !== 'preview') addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
  if (event.key === ' ' && /^(BUTTON|A)$/.test(event.target.tagName)) return;
  if (['ArrowRight','ArrowDown',' '].includes(event.key)) { event.preventDefault(); show(index + 1); }
  if (['ArrowLeft','ArrowUp'].includes(event.key)) { event.preventDefault(); show(index - 1); }
  if (event.key === 'Home') show(0); if (event.key === 'End') show(slides.length - 1);
  if (event.key.toLowerCase() === 'f' && mode !== 'presenter') fullscreen();
  if (event.key === 'Escape') $('viewer-help').classList.remove('open');
 });
 if (mode === 'audience') addEventListener('dblclick', fullscreen);
 if (mode === 'normal' || mode === 'audience') {
  let x;
  addEventListener('touchstart', e => { x=e.changedTouches[0].clientX; }, {passive:true});
  addEventListener('touchend', e => { if(x===undefined)return;const delta=e.changedTouches[0].clientX-x;x=undefined;if(Math.abs(delta)>50)show(index+(delta<0?1:-1)); }, {passive:true});
 }
 addEventListener('hashchange', () => show(fromHash()));
 addEventListener('pagehide', () => channel?.close());
 addEventListener('pageshow', event => { if (event.persisted && channel) location.reload(); });
 show(index, false);
 if (mode === 'audience') send({type:'hello'});
}

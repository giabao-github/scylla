(function(){var e=`scylla-widget-button`,t=`scylla-widget-container`,n=`bottom-right`,r=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,i=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;(function(){let a=`Open chat widget`,o=null,s=null,c=null,l=null,u=!1,d=!1,f=null,p=null,m=null,h=null,g=n,_=e=>e===`bottom-left`||e===`bottom-right`?e:n,v=e=>e===`localhost`||e===`127.0.0.1`||e===`::1`||e===`[::1]`,y=e=>{if(!(e instanceof HTMLScriptElement)||!e.src)return!1;if(e.getAttribute(`data-scylla-widget`)===`true`)return!0;try{let t=new URL(e.src,window.location.href).pathname.toLowerCase();return t.endsWith(`/widget.js`)||t.endsWith(`/embed.js`)||t.endsWith(`/embed.ts`)}catch{return!1}},b=()=>Array.from(document.querySelectorAll(`script[data-organization-id][data-scylla-widget]`)).find(y)||(Array.from(document.querySelectorAll(`script[data-organization-id]`)).find(y)??null),x=document.currentScript instanceof HTMLScriptElement?document.currentScript:null;if(x)h=x.getAttribute(`data-organization-id`),g=_(x.getAttribute(`data-position`));else{let e=b();e&&(h=e.getAttribute(`data-organization-id`),g=_(e.getAttribute(`data-position`)))}if(!h){console.error(`Scylla Widget: data-organization-id attribute is required`);return}let S=e=>{let t=e?.getAttribute(`data-widget-url`);try{if(t)return new URL(t,window.location.href);if(e?.src)return new URL(`/`,new URL(e.src,window.location.href))}catch(e){return console.error(`Scylla Widget: invalid widget URL configuration`,e),null}return console.error(`Scylla Widget: unable to resolve widget URL`),null},C=S(x);if(!C){let e=b();e&&e!==x&&(C=S(e))}if(!C)return;let w=C;w.protocol!==`https:`&&!v(w.hostname)&&console.warn(`Scylla Widget: non-HTTPS widget URL detected outside localhost`,w.toString());function T(){document.readyState===`loading`?m||(m=()=>{m=null,j()},document.addEventListener(`DOMContentLoaded`,m,{once:!0})):j()}function E(e){c&&(c.style.display=e?`flex`:`none`,c.style.opacity=e?`1`:`0`,s&&s.setAttribute(`aria-busy`,String(e)))}function D(){!o||d||(d=!0,E(!0),o.src=M())}function O(){d&&E(!1)}function k(){l&&(l.style.transform=`scale(1.05)`)}function A(){l&&(l.style.transform=`scale(1)`)}function j(){l=document.createElement(`button`),l.id=e,l.type=`button`,l.innerHTML=r,l.setAttribute(`aria-label`,a),l.setAttribute(`aria-expanded`,`false`),l.setAttribute(`aria-haspopup`,`dialog`),l.style.cssText=`
      position: fixed;
      ${g===`bottom-right`?`right: 20px;`:`left: 20px;`}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #a78bfa;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(167, 139, 250, 0.35);
      transition: all 0.2s ease;
    `,l.addEventListener(`click`,P),l.addEventListener(`mouseenter`,k),l.addEventListener(`mouseleave`,A),document.body.appendChild(l),s=document.createElement(`div`),s.id=t,s.tabIndex=-1,s.setAttribute(`role`,`dialog`),s.setAttribute(`aria-label`,`Chat widget`),s.setAttribute(`aria-busy`,`true`),l.setAttribute(`aria-controls`,s.id),s.style.cssText=`
      position: fixed;
      ${g===`bottom-right`?`right: 20px;`:`left: 20px;`}
      bottom: 90px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 110px);
      z-index: 999998;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(167, 139, 250, 0.35);
      display: none;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `,c=document.createElement(`div`),c.setAttribute(`aria-hidden`,`true`),c.style.cssText=`
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.35));
      color: rgba(255, 255, 255, 0.92);
      z-index: 1;
      pointer-events: none;
      transition: opacity 0.2s ease;
    `;let n=document.createElement(`div`);n.style.cssText=`
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-top-color: rgba(255, 255, 255, 0.95);
    `,n.animate([{transform:`rotate(0deg)`},{transform:`rotate(360deg)`}],{duration:750,iterations:1/0});let i=document.createElement(`div`);i.textContent=`Loading widget...`,i.style.cssText=`
      font: 500 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0.01em;
    `,c.append(n,i),o=document.createElement(`iframe`),o.style.cssText=`
      width: 100%;
      height: 100%;
      border: none;
    `,o.allow=`microphone; clipboard-read; clipboard-write`,o.sandbox=`allow-scripts allow-same-origin allow-forms allow-top-navigation-by-user-activation`,o.title=`Chat widget`,o.addEventListener(`load`,O),s.appendChild(c),s.appendChild(o),document.body.appendChild(s),E(!1),window.addEventListener(`message`,N)}function M(){let e=new URL(w.toString());return e.searchParams.set(`organizationId`,h),e.toString()}function N(e){if(e.origin!==w.origin)return;let t=e.data;if(typeof t!=`object`||!t||typeof t.type!=`string`)return;let{type:n,payload:r}=t;switch(n){case`close`:I();break;case`resize`:{let e=Number(r?.height);if(!s||!Number.isFinite(e)||e<=0||e>2e3)break;s.style.height=`${e}px`;break}}}function P(){u?I():F()}function F(){s&&l&&(f&&=(clearTimeout(f),null),p&&=(clearTimeout(p),null),u=!0,D(),s.style.display=`block`,f=setTimeout(()=>{s&&(s.style.opacity=`1`,s.style.transform=`translateY(0)`,s.focus({preventScroll:!0})),f=null},10),l.innerHTML=i,l.setAttribute(`aria-label`,`Close chat widget`),l.setAttribute(`aria-expanded`,`true`))}function I(){s&&l&&(f&&=(clearTimeout(f),null),p&&=(clearTimeout(p),null),u=!1,s.style.opacity=`0`,s.style.transform=`translateY(10px)`,p=setTimeout(()=>{s&&(s.style.display=`none`),p=null},300),l.innerHTML=r,l.setAttribute(`aria-label`,a),l.setAttribute(`aria-expanded`,`false`),l.focus({preventScroll:!0}))}function L(){m&&=(document.removeEventListener(`DOMContentLoaded`,m),null),p&&=(clearTimeout(p),null),f&&=(clearTimeout(f),null),window.removeEventListener(`message`,N),s&&(s.remove(),s=null,c=null),o&&=(o.removeEventListener(`load`,O),null),d=!1,l&&=(l.removeEventListener(`click`,P),l.removeEventListener(`mouseenter`,k),l.removeEventListener(`mouseleave`,A),l.remove(),null),u=!1}function R(e){L(),e.organizationId&&(h=e.organizationId),e.position&&(g=_(e.position)),T()}window.ScyllaWidget={init:R,show:F,hide:I,destroy:L,isOpen:()=>u},T()})()})();
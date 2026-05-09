(function(){var e=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,t=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`,n=[`bottom-right`,`bottom-left`],r=`scylla-widget-button`,i=`scylla-widget-container`,a=n[0],o=2e3;function s(e){if(typeof e!=`object`||!e||!(`height`in e))return console.warn(`Scylla Widget: invalid resize message payload`),null;let{height:t}=e;if(typeof t!=`number`&&typeof t!=`string`||typeof t==`string`&&t.trim()===``)return console.warn(`Scylla Widget: invalid resize height type`),null;let n=Number(t);return Number.isFinite(n)?n<100||n>2e3?(console.warn(`Scylla Widget: resize height ${n} out of bounds [100, ${o}]`),null):n:(console.warn(`Scylla Widget: resize height "${t}" is not a finite number`),null)}(function(){let n=`Open chat widget`,o=null,c=null,l=null,u=null,d=!1,f=!1,p=null,m=null,h=null,g=null,_=a,v=e=>e===`bottom-left`||e===`bottom-right`?e:a,y=e=>e===`localhost`||e===`127.0.0.1`||e===`::1`||e===`[::1]`,b=e=>{if(!(e instanceof HTMLScriptElement)||!e.src)return!1;if(e.getAttribute(`data-scylla-widget`)===`true`)return!0;try{let t=new URL(e.src,window.location.href).pathname.toLowerCase();return t.endsWith(`/widget.js`)||t.endsWith(`/embed.js`)||t.endsWith(`/embed.ts`)}catch{return!1}},x=()=>Array.from(document.querySelectorAll(`script[data-organization-id][data-scylla-widget]`)).find(b)||(Array.from(document.querySelectorAll(`script[data-organization-id]`)).find(b)??null),S=document.currentScript instanceof HTMLScriptElement?document.currentScript:null;if(S)g=S.getAttribute(`data-organization-id`),_=v(S.getAttribute(`data-position`));else{let e=x();e&&(g=e.getAttribute(`data-organization-id`),_=v(e.getAttribute(`data-position`)))}if(!g){console.error(`Scylla Widget: data-organization-id attribute is required`);return}let C=e=>{let t=e?.getAttribute(`data-widget-url`);try{if(t)return new URL(t,window.location.href);if(e?.src)return new URL(`/`,new URL(e.src,window.location.href))}catch(e){return console.error(`Scylla Widget: invalid widget URL configuration`,e),null}return console.error(`Scylla Widget: unable to resolve widget URL`),null},w=C(S);if(!w){let e=x();e&&e!==S&&(w=C(e))}if(!w)return;let T=w;T.protocol!==`https:`&&!y(T.hostname)&&console.warn(`Scylla Widget: non-HTTPS widget URL detected outside localhost`,T.toString());function E(){document.readyState===`loading`?h||(h=()=>{h=null,M()},document.addEventListener(`DOMContentLoaded`,h,{once:!0})):M()}function D(e){l&&(l.style.display=e?`flex`:`none`,l.style.opacity=e?`1`:`0`,c&&c.setAttribute(`aria-busy`,String(e)))}function O(){if(!o||f)return;let e=N();e&&(f=!0,D(!0),o.src=e)}function k(){f&&D(!1)}function A(){u&&(u.style.transform=`scale(1.05)`)}function j(){u&&(u.style.transform=`scale(1)`)}function M(){u=document.createElement(`button`),u.id=r,u.type=`button`,u.innerHTML=e,u.setAttribute(`aria-label`,n),u.setAttribute(`aria-expanded`,`false`),u.setAttribute(`aria-haspopup`,`dialog`),u.style.cssText=`
      position: fixed;
      ${_===`bottom-right`?`right: 20px;`:`left: 20px;`}
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
    `,u.addEventListener(`click`,F),u.addEventListener(`mouseenter`,A),u.addEventListener(`mouseleave`,j),document.body.appendChild(u),c=document.createElement(`div`),c.id=i,c.tabIndex=-1,c.setAttribute(`role`,`dialog`),c.setAttribute(`aria-label`,`Chat widget`),c.setAttribute(`aria-busy`,`true`),u.setAttribute(`aria-controls`,c.id),c.style.cssText=`
      position: fixed;
      ${_===`bottom-right`?`right: 20px;`:`left: 20px;`}
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
    `,l=document.createElement(`div`),l.setAttribute(`aria-hidden`,`true`),l.style.cssText=`
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
    `;let t=document.createElement(`div`);t.style.cssText=`
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-top-color: rgba(255, 255, 255, 0.95);
    `,t.animate([{transform:`rotate(0deg)`},{transform:`rotate(360deg)`}],{duration:750,iterations:1/0});let a=document.createElement(`div`);a.textContent=`Loading widget...`,a.style.cssText=`
      font: 500 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0.01em;
    `,l.append(t,a),o=document.createElement(`iframe`),o.style.cssText=`
      width: 100%;
      height: 100%;
      border: none;
    `,o.allow=`microphone; clipboard-write`,o.sandbox=`allow-scripts allow-same-origin allow-forms allow-top-navigation-by-user-activation`,o.title=`Chat widget`,o.addEventListener(`load`,k),c.appendChild(l),c.appendChild(o),document.body.appendChild(c),D(!1),window.addEventListener(`message`,P)}function N(){if(!g)return console.error(`Scylla Widget: missing organization ID`),null;let e=new URL(T.toString());return e.searchParams.set(`organizationId`,g),e.toString()}function P(e){if(e.origin!==T.origin||!o||e.source!==o.contentWindow)return;let t=e.data;if(typeof t!=`object`||!t||typeof t.type!=`string`)return;let{type:n,payload:r}=t;switch(n){case`close`:L();break;case`resize`:{let e=s(r);if(!c||e===null)break;c.style.height=`${e}px`;break}}}function F(){d?L():I()}function I(){c&&u&&(p&&=(clearTimeout(p),null),m&&=(clearTimeout(m),null),d=!0,O(),c.style.display=`block`,p=setTimeout(()=>{c&&(c.style.opacity=`1`,c.style.transform=`translateY(0)`,c.focus({preventScroll:!0})),p=null},10),u.innerHTML=t,u.setAttribute(`aria-label`,`Close chat widget`),u.setAttribute(`aria-expanded`,`true`))}function L(){c&&u&&(p&&=(clearTimeout(p),null),m&&=(clearTimeout(m),null),d=!1,c.style.opacity=`0`,c.style.transform=`translateY(10px)`,m=setTimeout(()=>{c&&(c.style.display=`none`),m=null},300),u.innerHTML=e,u.setAttribute(`aria-label`,n),u.setAttribute(`aria-expanded`,`false`),u.focus({preventScroll:!0}))}function R(){h&&=(document.removeEventListener(`DOMContentLoaded`,h),null),m&&=(clearTimeout(m),null),p&&=(clearTimeout(p),null),window.removeEventListener(`message`,P),c&&(c.remove(),c=null,l=null),o&&=(o.removeEventListener(`load`,k),null),f=!1,u&&=(u.removeEventListener(`click`,F),u.removeEventListener(`mouseenter`,A),u.removeEventListener(`mouseleave`,j),u.remove(),null),d=!1}function z(e){R(),e.organizationId&&(g=e.organizationId),e.position&&(_=v(e.position)),E()}window.ScyllaWidget={init:z,show:I,hide:L,destroy:R,isOpen:()=>d},E()})()})();
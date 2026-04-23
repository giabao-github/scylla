(function(){var e=`scylla-widget-button`,t=`scylla-widget-container`,n=`bottom-right`,r=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,i=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;(function(){let a=`Open chat widget`,o=null,s=null,c=null,l=!1,u=null,d=null,f=null,p=null,m=n,h=e=>e===`bottom-left`||e===`bottom-right`?e:n,g=e=>e===`localhost`||e===`127.0.0.1`||e===`::1`||e===`[::1]`,_=e=>{if(!(e instanceof HTMLScriptElement)||!e.src)return!1;if(e.getAttribute(`data-scylla-widget`)===`true`)return!0;try{let t=new URL(e.src,window.location.href).pathname.toLowerCase();return t.endsWith(`/widget.js`)||t.endsWith(`/embed.js`)||t.endsWith(`/embed.ts`)}catch{return!1}},v=()=>Array.from(document.querySelectorAll(`script[data-organization-id]`)).find(_)??null,y=document.currentScript instanceof HTMLScriptElement?document.currentScript:null;if(y)p=y.getAttribute(`data-organization-id`),m=h(y.getAttribute(`data-position`));else{let e=v();e&&(p=e.getAttribute(`data-organization-id`),m=h(e.getAttribute(`data-position`)))}if(!p){console.error(`Scylla Widget: data-organization-id attribute is required`);return}let b=e=>{let t=e?.getAttribute(`data-widget-url`)||window.SCYLLA_WIDGET_URL;try{if(t)return new URL(t,window.location.href);if(e?.src)return new URL(`/`,new URL(e.src,window.location.href))}catch(e){return console.error(`Scylla Widget: invalid widget URL configuration`,e),null}return console.error(`Scylla Widget: unable to resolve widget URL`),null},x=b(y);if(!x&&y===null&&(x=b(v())),!x){console.error(`Scylla Widget: invalid widget URL configuration`);return}let S=x;function C(){c&&(c.style.transform=`scale(1.05)`)}function w(){c&&(c.style.transform=`scale(1)`)}S.protocol!==`https:`&&!g(S.hostname)&&console.warn(`Scylla Widget: non-HTTPS widget URL detected outside localhost`,S.toString());function T(){document.readyState===`loading`?f||(f=()=>{f=null,E()},document.addEventListener(`DOMContentLoaded`,f,{once:!0})):E()}function E(){c=document.createElement(`button`),c.id=e,c.type=`button`,c.innerHTML=r,c.setAttribute(`aria-label`,a),c.setAttribute(`aria-expanded`,`false`),c.setAttribute(`aria-haspopup`,`dialog`),c.style.cssText=`
      position: fixed;
      ${m===`bottom-right`?`right: 20px;`:`left: 20px;`}
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
    `,c.addEventListener(`click`,k),c.addEventListener(`mouseenter`,C),c.addEventListener(`mouseleave`,w),document.body.appendChild(c),s=document.createElement(`div`),s.id=t,c.setAttribute(`aria-controls`,s.id),s.style.cssText=`
      position: fixed;
      ${m===`bottom-right`?`right: 20px;`:`left: 20px;`}
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
    `,o=document.createElement(`iframe`),o.src=D(),o.style.cssText=`
      width: 100%;
      height: 100%;
      border: none;
    `,o.allow=`microphone; clipboard-read; clipboard-write`,o.sandbox=`allow-scripts allow-same-origin allow-forms allow-top-navigation-by-user-activation`,o.title=`Chat widget`,s.appendChild(o),document.body.appendChild(s),window.addEventListener(`message`,O)}function D(){let e=new URL(S.toString());return e.searchParams.set(`organizationId`,p),e.toString()}function O(e){if(e.origin!==S.origin)return;let t=e.data;if(typeof t!=`object`||!t||typeof t.type!=`string`)return;let{type:n,payload:r}=t;switch(n){case`close`:j();break;case`resize`:{let e=Number(r?.height);if(!s||!Number.isFinite(e)||e<=0||e>2e3)break;s.style.height=`${e}px`;break}}}function k(){l?j():A()}function A(){s&&c&&(u&&=(clearTimeout(u),null),d&&=(clearTimeout(d),null),l=!0,s.style.display=`block`,u=setTimeout(()=>{s&&(s.style.opacity=`1`,s.style.transform=`translateY(0)`),o?.focus({preventScroll:!0}),u=null},10),c.innerHTML=i,c.setAttribute(`aria-label`,`Close chat widget`),c.setAttribute(`aria-expanded`,`true`))}function j(){s&&c&&(u&&=(clearTimeout(u),null),l=!1,s.style.opacity=`0`,s.style.transform=`translateY(10px)`,d=setTimeout(()=>{s&&(s.style.display=`none`),d=null},300),c.innerHTML=r,c.setAttribute(`aria-label`,a),c.setAttribute(`aria-expanded`,`false`),c.focus({preventScroll:!0}))}function M(){f&&=(document.removeEventListener(`DOMContentLoaded`,f),null),d&&=(clearTimeout(d),null),u&&=(clearTimeout(u),null),window.removeEventListener(`message`,O),s&&(s.remove(),s=null,o=null),c&&=(c.removeEventListener(`click`,k),c.removeEventListener(`mouseenter`,C),c.removeEventListener(`mouseleave`,w),c.remove(),null),l=!1}function N(e){M(),e.organizationId&&(p=e.organizationId),e.position&&(m=h(e.position)),T()}window.ScyllaWidget={init:N,show:A,hide:j,destroy:M},T()})()})();
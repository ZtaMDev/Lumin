let u=null;function b(e){e.cleanup&&e.cleanup();for(const n of e.deps)n.delete(e);e.deps.clear();const t=u;u=e;try{e.cleanup=e.execute()}finally{u=t}}function N(e){for(const t of[...e])b(t)}function y(e){let t=e;const n=new Set;function o(r){if(arguments.length===0)return u&&(n.add(u),u.deps.add(n)),t;{const i=r;return Object.is(t,i)||(t=i,N(n)),t}}return Object.defineProperty(o,"value",{get(){return o()},set(r){o(r)},enumerable:!0}),o._subscribe=r=>{const i={execute:()=>r(t),deps:new Set,cleanup:void 0};return n.add(i),()=>{n.delete(i);for(const a of i.deps)a.delete(i)}},o._peek=()=>t,o}function f(e){const t={execute:e,deps:new Set,cleanup:void 0};return b(t),()=>{t.cleanup&&t.cleanup();for(const n of t.deps)n.delete(t);t.deps.clear()}}function g(e,t,n,o,r){f(()=>{const i=t();e[n]=i}),e.addEventListener(o,()=>{const i=e[n];t(i)})}function A(e,t){const o=e.tagName.toLowerCase()==="select"?"change":"input";g(e,t,"value",o)}function L(e,t){g(e,t,"checked","change")}function I(e,t){f(()=>{e.value=String(t())}),e.addEventListener("input",()=>{const n=e.valueAsNumber;Number.isNaN(n)||t(n)})}function _(e,t){f(()=>{e.checked=e.value===t()}),e.addEventListener("change",()=>{e.checked&&t(e.value)})}function B(e,t){const n=e;f(()=>{const o=t();for(const r of Array.from(n.options))r.selected=o.includes(r.value)}),n.addEventListener("change",()=>{const o=[];for(const r of Array.from(n.selectedOptions))o.push(r.value);t(o)})}function T(e,t,n){const o=e.tagName.toLowerCase(),r=e.type?.toLowerCase()||"";switch(t){case"value":o==="input"&&(r==="number"||r==="range")?I(e,n):A(e,n);break;case"checked":L(e,n);break;case"group":_(e,n);break;case"selected":B(e,n);break;default:g(e,n,t,"input");break}}function M(e){const t={mount:[],destroy:[]};return{result:e(),...t}}function w(e){for(const t of e)try{t()}catch(n){console.error("Error in hook:",n)}}function c(e,t,...n){if(typeof e=="function"){const{result:r,mount:i,destroy:a}=M(()=>e(t||{},...n)),p=Array.isArray(r)?r:[r];for(const d of p)d instanceof HTMLElement&&(i.length>0&&setTimeout(()=>w(i),0),a.length>0&&(d._luminDestroy=a));return r}const o=document.createElement(e);if(t)for(const[r,i]of Object.entries(t)){if(r.startsWith("bind:")){const a=r.slice(5);typeof i=="function"&&"_peek"in i&&T(o,a,i);continue}if(r.startsWith("on")&&typeof i=="function"){const a=r.slice(2).toLowerCase();o.addEventListener(a,i)}else typeof i=="function"?f(()=>{const a=i();r==="value"||r==="checked"||r==="disabled"||r==="selected"?o[r]=a:typeof a=="boolean"?a?o.setAttribute(r,""):o.removeAttribute(r):o.setAttribute(r,String(a))}):o.setAttribute(r,String(i))}for(const r of n.flat(1/0))if(r!=null)if(typeof r=="function"){const i=document.createComment("cf-start"),a=document.createComment("cf-end");o.appendChild(i),o.appendChild(a);let p=[];f(()=>{let d=r(),l=[];const x=Array.isArray(d)?d.flat(1/0):[d];for(let s of x)if(s!=null){for(;typeof s=="function";)s=s();s instanceof Node?l.push(s):l.push(document.createTextNode(String(s)))}const E=new Set(l);for(const s of p)E.has(s)||(C(s),s.parentNode===o&&o.removeChild(s));for(const s of l)o.insertBefore(s,a);p=l})}else r instanceof Node?o.appendChild(r):o.appendChild(document.createTextNode(String(r)));return o}function k(e,...t){return t.flat(1/0)}function C(e){if(e instanceof HTMLElement){const t=e._luminDestroy;t&&w(t)}e.childNodes.forEach(C)}function m(e,t,n){for(;e.firstChild;)e.removeChild(e.firstChild);const o=c(t,{}),r=Array.isArray(o)?o:[o];for(const i of r)i!=null&&(i instanceof Node?e.appendChild(i):e.appendChild(document.createTextNode(String(i))))}function D(e={}){"use static";const t=y(0);if(typeof document<"u"){const n="lumix-style-index";if(!document.getElementById(n)){const o=document.createElement("style");o.id=n,o.textContent=`
  .page {
    max-width: 640px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }
  
  h1 { color: #4f46e5; }
  
  .nav {
    margin: 2rem 0;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
  }
  
  .nav h3 {
    margin-top: 0;
    color: #374151;
  }
  
  .nav a {
    display: block;
    margin: 0.5rem 0;
    padding: 0.5rem;
    color: #4f46e5;
    text-decoration: none;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .nav a:hover {
    background: #e0e7ff;
  }
  
  .demo {
    margin: 2rem 0;
    padding: 1rem;
    border: 2px dashed #4f46e5;
    border-radius: 8px;
  }
  
  code { 
    background: #f3f4f6; 
    padding: 0.2rem 0.4rem; 
    border-radius: 4px; 
  }
  
  button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
`,document.head.appendChild(o)}}return c(k,null,c("div",{class:"page"},[`
  `,c("h1",null,["Lumix (Static)"]),`
  `,c("p",null,["Meta-framework template. Edit ",c("code",null,["src/routes/index.lumix"]),"."]),`
  
  `,c("nav",{class:"nav"},[`
    `,c("h3",null,["Navigation:"]),`
    `,c("a",{href:"/"},['Home (Static - "use static")']),`
    `,c("a",{href:"/about"},['About (Server - "use server")']),`
  `]),`
  
  `,c("div",{class:"demo"},[`
    `,c("p",null,["Interactive counter (this is an island):"]),`
    `,c("button",{onclick:()=>t(t()+1)},["Count: ",()=>t()]),`
  `]),`
`]),`

`)}function H(e={}){"use server";const t=new Date().toISOString(),n=typeof navigator<"u"?navigator.userAgent:"Server-Side",o=y(0);if(typeof document<"u"){const r="lumix-style-about";if(!document.getElementById(r)){const i=document.createElement("style");i.id=r,i.textContent=`
  .page { 
    padding: 2rem; 
    font-family: system-ui, sans-serif; 
    max-width: 640px;
    margin: 0 auto;
  }
  
  h1 { 
    color: #059669; 
  }
  
  .nav {
    margin-top: 2rem;
    padding: 1rem;
    background: #f0fdf4;
    border-radius: 8px;
  }
  
  .nav a {
    color: #059669;
    text-decoration: none;
    font-weight: 500;
  }
  
  .nav a:hover {
    text-decoration: underline;
  }
  
  button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  
  strong {
    color: #059669;
  }
  
  span {
    font-weight: bold;
    color: #059669;
  }
  
  code {
    background: #f0fdf4;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    color: #059669;
  }
`,document.head.appendChild(i)}}return c(k,null,c("div",{class:"page"},[`
  `,c("h1",null,["About (Server-Side)"]),`
  `,c("p",null,["This page uses ",c("code",null,['"use server"'])," directive for SSR."]),`
  `,c("p",null,["Server timestamp: ",c("strong",null,[()=>t])]),`
  `,c("p",null,["User agent: ",c("strong",null,[()=>n])]),`
  `,c("p",null,["Interactive counter: ",c("span",null,[()=>o()])]),`
  `,c("button",{onclick:()=>o(o()+1)},["Increment"]),`
  
  `,c("nav",{class:"nav"},[`
    `,c("a",{href:"/"},["← Back to Home"]),`
  `]),`
`]),`

`)}const h={c0:D,c1:H},S=[{path:"/",id:"c0",directive:"static"},{path:"/about",id:"c1",directive:"server"}];function R(){return window.location.pathname.replace(/\/$/,"")||"/"}function v(){const e=R();return S.find(t=>t.path===e)}if(!window.__LUMIX_ISLANDS__||window.__LUMIX_ISLANDS__.length===0){const e=v();if(e){const t=document.getElementById("app");if(t){const n=h[e.id];n&&m(t,n)}}document.addEventListener("click",t=>{const n=t.target.closest("a");if(!n||n.target==="_blank"||n.hasAttribute("download")||!n.href)return;const o=new URL(n.href);if(o.origin!==window.location.origin)return;const r=S.find(a=>a.path===o.pathname);if(!r)return;t.preventDefault(),window.history.pushState({},"",o.pathname);const i=document.getElementById("app");if(i){const a=h[r.id];if(a){for(;i.firstChild;)i.removeChild(i.firstChild);m(i,a)}}}),window.addEventListener("popstate",()=>{const t=v();if(t){const n=document.getElementById("app");if(n){const o=h[t.id];if(o){for(;n.firstChild;)n.removeChild(n.firstChild);m(n,o)}}}})}

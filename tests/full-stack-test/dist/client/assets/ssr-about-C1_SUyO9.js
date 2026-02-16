let d=null;function v(e){e.cleanup&&e.cleanup();for(const r of e.deps)r.delete(e);e.deps.clear();const t=d;d=e;try{e.cleanup=e.execute()}finally{d=t}}function k(e){for(const t of[...e])v(t)}function w(e){let t=e;const r=new Set;function o(n){if(arguments.length===0)return d&&(r.add(d),d.deps.add(r)),t;{const i=n;return Object.is(t,i)||(t=i,k(r)),t}}return Object.defineProperty(o,"value",{get(){return o()},set(n){o(n)},enumerable:!0}),o._subscribe=n=>{const i={execute:()=>n(t),deps:new Set,cleanup:void 0};return r.add(i),()=>{r.delete(i);for(const s of i.deps)s.delete(i)}},o._peek=()=>t,o}function f(e){const t={execute:e,deps:new Set,cleanup:void 0};return v(t),()=>{t.cleanup&&t.cleanup();for(const r of t.deps)r.delete(t);t.deps.clear()}}function m(e,t,r,o,n){f(()=>{const i=t();e[r]=i}),e.addEventListener(o,()=>{const i=e[r];t(i)})}function C(e,t){const o=e.tagName.toLowerCase()==="select"?"change":"input";m(e,t,"value",o)}function N(e,t){m(e,t,"checked","change")}function E(e,t){f(()=>{e.value=String(t())}),e.addEventListener("input",()=>{const r=e.valueAsNumber;Number.isNaN(r)||t(r)})}function A(e,t){f(()=>{e.checked=e.value===t()}),e.addEventListener("change",()=>{e.checked&&t(e.value)})}function x(e,t){const r=e;f(()=>{const o=t();for(const n of Array.from(r.options))n.selected=o.includes(n.value)}),r.addEventListener("change",()=>{const o=[];for(const n of Array.from(r.selectedOptions))o.push(n.value);t(o)})}function L(e,t,r){const o=e.tagName.toLowerCase(),n=e.type?.toLowerCase()||"";switch(t){case"value":o==="input"&&(n==="number"||n==="range")?E(e,r):C(e,r);break;case"checked":N(e,r);break;case"group":A(e,r);break;case"selected":x(e,r);break;default:m(e,r,t,"input");break}}function I(e){const t={mount:[],destroy:[]};return{result:e(),...t}}function b(e){for(const t of e)try{t()}catch(r){console.error("Error in hook:",r)}}function c(e,t,...r){if(typeof e=="function"){const{result:n,mount:i,destroy:s}=I(()=>e(t||{},...r)),p=Array.isArray(n)?n:[n];for(const u of p)u instanceof HTMLElement&&(i.length>0&&setTimeout(()=>b(i),0),s.length>0&&(u._luminDestroy=s));return n}const o=document.createElement(e);if(t)for(const[n,i]of Object.entries(t)){if(n.startsWith("bind:")){const s=n.slice(5);typeof i=="function"&&"_peek"in i&&L(o,s,i);continue}if(n.startsWith("on")&&typeof i=="function"){const s=n.slice(2).toLowerCase();o.addEventListener(s,i)}else typeof i=="function"?f(()=>{const s=i();n==="value"||n==="checked"||n==="disabled"||n==="selected"?o[n]=s:typeof s=="boolean"?s?o.setAttribute(n,""):o.removeAttribute(n):o.setAttribute(n,String(s))}):o.setAttribute(n,String(i))}for(const n of r.flat(1/0))if(n!=null)if(typeof n=="function"){const i=document.createComment("cf-start"),s=document.createComment("cf-end");o.appendChild(i),o.appendChild(s);let p=[];f(()=>{let u=n(),l=[];const y=Array.isArray(u)?u.flat(1/0):[u];for(let a of y)if(a!=null){for(;typeof a=="function";)a=a();a instanceof Node?l.push(a):l.push(document.createTextNode(String(a)))}const S=new Set(l);for(const a of p)S.has(a)||(g(a),a.parentNode===o&&o.removeChild(a));for(const a of l)o.insertBefore(a,s);p=l})}else n instanceof Node?o.appendChild(n):o.appendChild(document.createTextNode(String(n)));return o}function T(e,...t){return t.flat(1/0)}function g(e){if(e instanceof HTMLElement){const t=e._luminDestroy;t&&b(t)}e.childNodes.forEach(g)}function _(e,t,r){for(;e.firstChild;)e.removeChild(e.firstChild);const o=c(t,{}),n=Array.isArray(o)?o:[o];for(const i of n)i!=null&&(i instanceof Node?e.appendChild(i):e.appendChild(document.createTextNode(String(i))))}function H(e={}){"use server";const t=new Date().toISOString(),r=typeof navigator<"u"?navigator.userAgent:"Server-Side",o=w(0);if(typeof document<"u"){const n="lumix-style-about";if(!document.getElementById(n)){const i=document.createElement("style");i.id=n,i.textContent=`
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
`,document.head.appendChild(i)}}return c(T,null,c("div",{class:"page"},[`
  `,c("h1",null,["About (Server-Side Rendering)"]),`
  `,c("p",null,["Esta página usa ",c("code",null,['"use server"'])," para SSR dinámico."]),`
  `,c("p",null,[c("strong",null,["Comportamiento SSR:"])," El timestamp cambia en cada recarga porque se renderiza en el servidor en cada request."]),`
  `,c("p",null,["Server timestamp: ",c("strong",null,[()=>t])]),`
  `,c("p",null,["User agent: ",c("strong",null,[()=>r])]),`
  `,c("p",null,["Interactive counter (hidratado en cliente): ",c("span",null,[()=>o()])]),`
  `,c("button",{onclick:()=>o(o()+1)},["Increment"]),`
  
  `,c("nav",{class:"nav"},[`
    `,c("a",{href:"/"},["← Volver a Home (Static)"]),`
  `]),`
`]),`

`)}const h=document.getElementById("app");h&&_(h,H);

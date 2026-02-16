let u=null;function b(e){e.cleanup&&e.cleanup();for(const r of e.deps)r.delete(e);e.deps.clear();const n=u;u=e;try{e.cleanup=e.execute()}finally{u=n}}function S(e){for(const n of[...e])b(n)}function x(e){let n=e;const r=new Set;function o(t){if(arguments.length===0)return u&&(r.add(u),u.deps.add(r)),n;{const i=t;return Object.is(n,i)||(n=i,S(r)),n}}return Object.defineProperty(o,"value",{get(){return o()},set(t){o(t)},enumerable:!0}),o._subscribe=t=>{const i={execute:()=>t(n),deps:new Set,cleanup:void 0};return r.add(i),()=>{r.delete(i);for(const c of i.deps)c.delete(i)}},o._peek=()=>n,o}function f(e){const n={execute:e,deps:new Set,cleanup:void 0};return b(n),()=>{n.cleanup&&n.cleanup();for(const r of n.deps)r.delete(n);n.deps.clear()}}function m(e,n,r,o,t){f(()=>{const i=n();e[r]=i}),e.addEventListener(o,()=>{const i=e[r];n(i)})}function N(e,n){const o=e.tagName.toLowerCase()==="select"?"change":"input";m(e,n,"value",o)}function w(e,n){m(e,n,"checked","change")}function C(e,n){f(()=>{e.value=String(n())}),e.addEventListener("input",()=>{const r=e.valueAsNumber;Number.isNaN(r)||n(r)})}function E(e,n){f(()=>{e.checked=e.value===n()}),e.addEventListener("change",()=>{e.checked&&n(e.value)})}function A(e,n){const r=e;f(()=>{const o=n();for(const t of Array.from(r.options))t.selected=o.includes(t.value)}),r.addEventListener("change",()=>{const o=[];for(const t of Array.from(r.selectedOptions))o.push(t.value);n(o)})}function L(e,n,r){const o=e.tagName.toLowerCase(),t=e.type?.toLowerCase()||"";switch(n){case"value":o==="input"&&(t==="number"||t==="range")?C(e,r):N(e,r);break;case"checked":w(e,r);break;case"group":E(e,r);break;case"selected":A(e,r);break;default:m(e,r,n,"input");break}}function I(e){const n={mount:[],destroy:[]};return{result:e(),...n}}function g(e){for(const n of e)try{n()}catch(r){console.error("Error in hook:",r)}}function a(e,n,...r){if(typeof e=="function"){const{result:t,mount:i,destroy:c}=I(()=>e(n||{},...r)),p=Array.isArray(t)?t:[t];for(const d of p)d instanceof HTMLElement&&(i.length>0&&setTimeout(()=>g(i),0),c.length>0&&(d._luminDestroy=c));return t}const o=document.createElement(e);if(n)for(const[t,i]of Object.entries(n)){if(t.startsWith("bind:")){const c=t.slice(5);typeof i=="function"&&"_peek"in i&&L(o,c,i);continue}if(t.startsWith("on")&&typeof i=="function"){const c=t.slice(2).toLowerCase();o.addEventListener(c,i)}else typeof i=="function"?f(()=>{const c=i();t==="value"||t==="checked"||t==="disabled"||t==="selected"?o[t]=c:typeof c=="boolean"?c?o.setAttribute(t,""):o.removeAttribute(t):o.setAttribute(t,String(c))}):o.setAttribute(t,String(i))}for(const t of r.flat(1/0))if(t!=null)if(typeof t=="function"){const i=document.createComment("cf-start"),c=document.createComment("cf-end");o.appendChild(i),o.appendChild(c);let p=[];f(()=>{let d=t(),l=[];const y=Array.isArray(d)?d.flat(1/0):[d];for(let s of y)if(s!=null){for(;typeof s=="function";)s=s();s instanceof Node?l.push(s):l.push(document.createTextNode(String(s)))}const k=new Set(l);for(const s of p)k.has(s)||(v(s),s.parentNode===o&&o.removeChild(s));for(const s of l)o.insertBefore(s,c);p=l})}else t instanceof Node?o.appendChild(t):o.appendChild(document.createTextNode(String(t)));return o}function T(e,...n){return n.flat(1/0)}function v(e){if(e instanceof HTMLElement){const n=e._luminDestroy;n&&g(n)}e.childNodes.forEach(v)}function H(e,n,r){for(;e.firstChild;)e.removeChild(e.firstChild);const o=a(n,{}),t=Array.isArray(o)?o:[o];for(const i of t)i!=null&&(i instanceof Node?e.appendChild(i):e.appendChild(document.createTextNode(String(i))))}function M(e={}){"use static";const n=new Date().toISOString(),r=x(0);if(typeof document<"u"){const o="lumix-style-index";if(!document.getElementById(o)){const t=document.createElement("style");t.id=o,t.textContent=`
  .page {
    max-width: 640px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }
  
  h1 { color: #4f46e5; }
  
  .info {
    margin: 2rem 0;
    padding: 1rem;
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    border-radius: 4px;
  }
  
  .info h3 {
    margin-top: 0;
    color: #92400e;
  }
  
  .info strong {
    color: #92400e;
  }
  
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
`,document.head.appendChild(t)}}return a(T,null,a("div",{class:"page"},[`
  `,a("h1",null,["Lumix (Static Site Generation)"]),`
  `,a("p",null,["Meta-framework template. Edit ",a("code",null,["src/routes/index.lumix"]),"."]),`
  
  `,a("div",{class:"info"},[`
    `,a("h3",null,["SSG vs SSR:"]),`
    `,a("p",null,[a("strong",null,["Esta página (SSG):"])," Generada una vez en build time. El timestamp NO cambia al recargar."]),`
    `,a("p",null,["Build timestamp: ",a("strong",null,[()=>n])]),`
    `,a("p",null,[a("em",null,["Recarga la página varias veces - el timestamp permanece igual porque es estático."])]),`
  `]),`
  
  `,a("nav",{class:"nav"},[`
    `,a("h3",null,["Navigation:"]),`
    `,a("a",{href:"/"},['Home (Static - "use static")']),`
    `,a("a",{href:"/about"},['About (Server - "use server")']),`
  `]),`
  
  `,a("div",{class:"demo"},[`
    `,a("p",null,["Interactive counter (island hidratada en cliente):"]),`
    `,a("button",{onclick:()=>r(r()+1)},["Count: ",()=>r()]),`
    `,a("p",null,[a("em",null,["Este contador funciona porque se hidrata en el cliente, pero el HTML inicial es estático."])]),`
  `]),`
`]),`

`)}const h=document.getElementById("app");h&&H(h,M);

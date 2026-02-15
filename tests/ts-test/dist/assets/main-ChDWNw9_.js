let a=null;function h(e){e.cleanup&&e.cleanup();for(const c of e.deps)c.delete(e);e.deps.clear();const t=a;a=e;try{e.cleanup=e.execute()}finally{a=t}}function g(e){for(const t of[...e])h(t)}function C(e){let t=e;const c=new Set;function o(n){if(arguments.length===0)return a&&(c.add(a),a.deps.add(c)),t;{const i=n;return Object.is(t,i)||(t=i,g(c)),t}}return Object.defineProperty(o,"value",{get(){return o()},set(n){o(n)},enumerable:!0}),o._subscribe=n=>{const i={execute:()=>n(t),deps:new Set,cleanup:void 0};return c.add(i),()=>{c.delete(i);for(const s of i.deps)s.delete(i)}},o._peek=()=>t,o}function u(e){const t={execute:e,deps:new Set,cleanup:void 0};return h(t),()=>{t.cleanup&&t.cleanup();for(const c of t.deps)c.delete(t);t.deps.clear()}}function m(e,t,c,o,n){u(()=>{const i=t();e[c]=i}),e.addEventListener(o,()=>{const i=e[c];t(i)})}function N(e,t){const o=e.tagName.toLowerCase()==="select"?"change":"input";m(e,t,"value",o)}function w(e,t){m(e,t,"checked","change")}function E(e,t){u(()=>{e.value=String(t())}),e.addEventListener("input",()=>{const c=e.valueAsNumber;Number.isNaN(c)||t(c)})}function S(e,t){u(()=>{e.checked=e.value===t()}),e.addEventListener("change",()=>{e.checked&&t(e.value)})}function A(e,t){const c=e;u(()=>{const o=t();for(const n of Array.from(c.options))n.selected=o.includes(n.value)}),c.addEventListener("change",()=>{const o=[];for(const n of Array.from(c.selectedOptions))o.push(n.value);t(o)})}function x(e,t,c){const o=e.tagName.toLowerCase(),n=e.type?.toLowerCase()||"";switch(t){case"value":o==="input"&&(n==="number"||n==="range")?E(e,c):N(e,c);break;case"checked":w(e,c);break;case"group":S(e,c);break;case"selected":A(e,c);break;default:m(e,c,t,"input");break}}function L(e){const t={mount:[],destroy:[]};return{result:e(),...t}}function y(e){for(const t of e)try{t()}catch(c){console.error("Error in hook:",c)}}function f(e,t,...c){if(typeof e=="function"){const{result:n,mount:i,destroy:s}=L(()=>e(t||{},...c)),p=Array.isArray(n)?n:[n];for(const d of p)d instanceof HTMLElement&&(i.length>0&&setTimeout(()=>y(i),0),s.length>0&&(d._luminDestroy=s));return n}const o=document.createElement(e);if(t)for(const[n,i]of Object.entries(t)){if(n.startsWith("bind:")){const s=n.slice(5);typeof i=="function"&&"_peek"in i&&x(o,s,i);continue}if(n.startsWith("on")&&typeof i=="function"){const s=n.slice(2).toLowerCase();o.addEventListener(s,i)}else typeof i=="function"?u(()=>{const s=i();n==="value"||n==="checked"||n==="disabled"||n==="selected"?o[n]=s:typeof s=="boolean"?s?o.setAttribute(n,""):o.removeAttribute(n):o.setAttribute(n,String(s))}):o.setAttribute(n,String(i))}for(const n of c.flat(1/0))if(n!=null)if(typeof n=="function"){const i=document.createComment("cf-start"),s=document.createComment("cf-end");o.appendChild(i),o.appendChild(s);let p=[];u(()=>{let d=n(),l=[];const v=Array.isArray(d)?d.flat(1/0):[d];for(let r of v)if(r!=null){for(;typeof r=="function";)r=r();r instanceof Node?l.push(r):l.push(document.createTextNode(String(r)))}const k=new Set(l);for(const r of p)k.has(r)||(b(r),r.parentNode===o&&o.removeChild(r));for(const r of l)o.insertBefore(r,s);p=l})}else n instanceof Node?o.appendChild(n):o.appendChild(document.createTextNode(String(n)));return o}function H(e,...t){return t.flat(1/0)}function b(e){if(e instanceof HTMLElement){const t=e._luminDestroy;t&&y(t)}e.childNodes.forEach(b)}function I(e,t,c){for(;e.firstChild;)e.removeChild(e.firstChild);const o=f(t,{}),n=Array.isArray(o)?o:[o];for(const i of n)i!=null&&(i instanceof Node?e.appendChild(i):e.appendChild(document.createTextNode(String(i))))}function T(e={}){const t=C("Hello LumixJS!");if(u(()=>{console.log(t())}),typeof document<"u"){const c="lumix-style-app";if(!document.getElementById(c)){const o=document.createElement("style");o.id=c,o.textContent=`
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family: system-ui, -apple-system, sans-serif;
  }
  h1 {
    color: #4f46e5;
  }
  code {
    background: #f3f4f6;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
  }
`,document.head.appendChild(o)}}return f(H,null,f("div",{class:"container"},[`
  `,f("h1",null,[()=>t()]),`
  `,f("p",null,["Edit ",f("code",null,["src/App.lumix"])," to get started."]),`
  `,f("button",{onClick:()=>t("Hello World!")},["Click me"]),`
`]),`

`)}const _=document.getElementById("app");I(_,T);

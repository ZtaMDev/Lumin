let a=null;function h(e){e.cleanup&&e.cleanup();for(const c of e.deps)c.delete(e);e.deps.clear();const t=a;a=e;try{e.cleanup=e.execute()}finally{a=t}}function C(e){for(const t of[...e])h(t)}function N(e){let t=e;const c=new Set;function o(n){if(arguments.length===0)return a&&(c.add(a),a.deps.add(c)),t;{const i=n;return Object.is(t,i)||(t=i,C(c)),t}}return Object.defineProperty(o,"value",{get(){return o()},set(n){o(n)},enumerable:!0}),o._subscribe=n=>{const i={execute:()=>n(t),deps:new Set,cleanup:void 0};return c.add(i),()=>{c.delete(i);for(const r of i.deps)r.delete(i)}},o._peek=()=>t,o}function u(e){const t={execute:e,deps:new Set,cleanup:void 0};return h(t),()=>{t.cleanup&&t.cleanup();for(const c of t.deps)c.delete(t);t.deps.clear()}}function m(e,t,c,o,n){u(()=>{const i=t();e[c]=i}),e.addEventListener(o,()=>{const i=e[c];t(i)})}function w(e,t){const o=e.tagName.toLowerCase()==="select"?"change":"input";m(e,t,"value",o)}function E(e,t){m(e,t,"checked","change")}function S(e,t){u(()=>{e.value=String(t())}),e.addEventListener("input",()=>{const c=e.valueAsNumber;Number.isNaN(c)||t(c)})}function x(e,t){u(()=>{e.checked=e.value===t()}),e.addEventListener("change",()=>{e.checked&&t(e.value)})}function A(e,t){const c=e;u(()=>{const o=t();for(const n of Array.from(c.options))n.selected=o.includes(n.value)}),c.addEventListener("change",()=>{const o=[];for(const n of Array.from(c.selectedOptions))o.push(n.value);t(o)})}function L(e,t,c){const o=e.tagName.toLowerCase(),n=e.type?.toLowerCase()||"";switch(t){case"value":o==="input"&&(n==="number"||n==="range")?S(e,c):w(e,c);break;case"checked":E(e,c);break;case"group":x(e,c);break;case"selected":A(e,c);break;default:m(e,c,t,"input");break}}function H(e){const t={mount:[],destroy:[]};return{result:e(),...t}}function y(e){for(const t of e)try{t()}catch(c){console.error("Error in hook:",c)}}function f(e,t,...c){if(typeof e=="function"){const{result:n,mount:i,destroy:r}=H(()=>e(t||{},...c)),p=Array.isArray(n)?n:[n];for(const d of p)d instanceof HTMLElement&&(i.length>0&&setTimeout(()=>y(i),0),r.length>0&&(d._luminDestroy=r));return n}const o=document.createElement(e);if(t)for(const[n,i]of Object.entries(t)){if(n.startsWith("bind:")){const r=n.slice(5);typeof i=="function"&&"_peek"in i&&L(o,r,i);continue}if(n.startsWith("on")&&typeof i=="function"){const r=n.slice(2).toLowerCase();o.addEventListener(r,i)}else typeof i=="function"?u(()=>{const r=i();n==="value"||n==="checked"||n==="disabled"||n==="selected"?o[n]=r:typeof r=="boolean"?r?o.setAttribute(n,""):o.removeAttribute(n):o.setAttribute(n,String(r))}):o.setAttribute(n,String(i))}for(const n of c.flat(1/0))if(n!=null)if(typeof n=="function"){const i=document.createComment("cf-start"),r=document.createComment("cf-end");o.appendChild(i),o.appendChild(r);let p=[];u(()=>{let d=n(),l=[];const v=Array.isArray(d)?d.flat(1/0):[d];for(let s of v)if(s!=null){for(;typeof s=="function";)s=s();if(s instanceof Node)l.push(s);else{const g=s==null?"":String(s);l.push(document.createTextNode(g))}}const k=new Set(l);for(const s of p)k.has(s)||(b(s),s.parentNode===o&&o.removeChild(s));for(const s of l)o.insertBefore(s,r);p=l})}else if(n instanceof Node)o.appendChild(n);else{const i=n==null?"":String(n);o.appendChild(document.createTextNode(i))}return o}function I(e,...t){return t.flat(1/0)}function b(e){if(e instanceof HTMLElement){const t=e._luminDestroy;t&&y(t)}e.childNodes.forEach(b)}function T(e,t,c){for(;e.firstChild;)e.removeChild(e.firstChild);const o=f(t,{}),n=Array.isArray(o)?o:[o];for(const i of n)i!=null&&(i instanceof Node?e.appendChild(i):e.appendChild(document.createTextNode(String(i))))}function _(e={}){const t=N("Hello LumixJS!");if(u(()=>{console.log(t())}),typeof document<"u"){const c="lumix-style-main";if(!document.getElementById(c)){const o=document.createElement("style");o.id=c,o.textContent=`
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
`,document.head.appendChild(o)}}return f(I,null,f("div",{class:"container"},[`
  `,f("h1",null,[()=>t()]),`
  `,f("p",null,["Edit ",f("code",null,["src/App.lumix"])," to get started."]),`
  `,f("button",{onClick:()=>t("Hello World!")},["Click me"]),`
`]),`

`)}const j=document.getElementById("app");T(j,_);

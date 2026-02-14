(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function o(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(n){if(n.ep)return;n.ep=!0;const r=o(n);fetch(n.href,r)}})();let h=null,x=0;const k=new Set;function C(t){t.cleanup&&t.cleanup();for(const o of t.deps)o.delete(t);t.deps.clear();const e=h;h=t;try{t.cleanup=t.execute()}finally{h=e}}function N(t){for(const e of[...t])x>0?k.add(e):C(e)}function g(t){let e=t;const o=new Set;function i(n){if(arguments.length===0)return h&&(o.add(h),h.deps.add(o)),e;{const r=n;return Object.is(e,r)||(e=r,N(o)),e}}return Object.defineProperty(i,"value",{get(){return i()},set(n){i(n)},enumerable:!0}),i._subscribe=n=>{const r={execute:()=>n(e),deps:new Set,cleanup:void 0};return o.add(r),()=>{o.delete(r);for(const c of r.deps)c.delete(r)}},i._peek=()=>e,i}function y(t){const e={execute:t,deps:new Set,cleanup:void 0};return C(e),()=>{e.cleanup&&e.cleanup();for(const o of e.deps)o.delete(e);e.deps.clear()}}function E(t){const e=g(void 0);y(()=>{e(t())});function o(){return e()}return Object.defineProperty(o,"value",{get(){return e()},enumerable:!0}),o._subscribe=e._subscribe,o._peek=e._peek,o}function S(t){x++;try{return t()}finally{if(x--,x===0){const e=[...k];k.clear();for(const o of e)C(o)}}}function L(t){const e=structuredClone(t),o=new Map,i=new Set;function n(a){const u=a;return o.has(u)||o.set(u,g(e[a])),o.get(u)}function r(a){return n(a)()}function c(a,u){n(a)(u),m(a)}function f(a){S(()=>{for(const[u,b]of Object.entries(a))n(u)(b)});for(const u of Object.keys(a))m(u)}function p(){S(()=>{for(const[a,u]of Object.entries(e))n(a)(structuredClone(u))}),m()}function l(){const a={};for(const u of Object.keys(e)){const b=o.get(u);a[u]=b?b._peek():e[u]}return Object.freeze(a)}function d(a){return i.add(a),()=>i.delete(a)}function m(a){const u=l();for(const b of i)b(u,a)}const v=new Proxy({},{get(a,u){return r(u)},set(a,u,b){return c(u,b),!0},ownKeys(){return Object.keys(e)},getOwnPropertyDescriptor(a,u){if(u in e)return{configurable:!0,enumerable:!0,writable:!0}},has(a,u){return u in e}});return{get:r,set:c,update:f,reset:p,snapshot:l,subscribe:d,signal:n,state:v}}function A(t,e){const{key:o,storage:i=typeof localStorage<"u"?localStorage:null,serialize:n=JSON.stringify,deserialize:r=JSON.parse,include:c,exclude:f}=e;if(!i)return()=>{};try{const l=i.getItem(o);if(l){const d=r(l);d&&typeof d=="object"&&t.update(d)}}catch{}return t.subscribe(l=>{try{let d={...l};if(c){const m={};for(const v of c)v in d&&(m[v]=d[v]);d=m}if(f)for(const m of f)delete d[m];i.setItem(o,n(d))}catch{}})}function w(t,e,o,i,n){y(()=>{const r=e();t[o]=r}),t.addEventListener(i,()=>{const r=t[o];e(r)})}function I(t,e){const i=t.tagName.toLowerCase()==="select"?"change":"input";w(t,e,"value",i)}function _(t,e){w(t,e,"checked","change")}function j(t,e){y(()=>{t.value=String(e())}),t.addEventListener("input",()=>{const o=t.valueAsNumber;Number.isNaN(o)||e(o)})}function z(t,e){y(()=>{t.checked=t.value===e()}),t.addEventListener("change",()=>{t.checked&&e(t.value)})}function P(t,e){const o=t;y(()=>{const i=e();for(const n of Array.from(o.options))n.selected=i.includes(n.value)}),o.addEventListener("change",()=>{const i=[];for(const n of Array.from(o.selectedOptions))i.push(n.value);e(i)})}function D(t,e,o){var r;const i=t.tagName.toLowerCase(),n=((r=t.type)==null?void 0:r.toLowerCase())||"";switch(e){case"value":i==="input"&&(n==="number"||n==="range")?j(t,o):I(t,o);break;case"checked":_(t,o);break;case"group":z(t,o);break;case"selected":P(t,o);break;default:w(t,o,e,"input");break}}function s(t,e,...o){if(typeof t=="function")return t(e||{},...o);const i=document.createElement(t);if(e)for(const[n,r]of Object.entries(e)){if(n.startsWith("bind:")){const c=n.slice(5);typeof r=="function"&&"_peek"in r&&D(i,c,r);continue}if(n.startsWith("on")&&typeof r=="function"){const c=n.slice(2).toLowerCase();i.addEventListener(c,r)}else typeof r=="function"?y(()=>{const c=r();n==="value"||n==="checked"||n==="disabled"||n==="selected"?i[n]=c:typeof c=="boolean"?c?i.setAttribute(n,""):i.removeAttribute(n):i.setAttribute(n,String(c))}):i.setAttribute(n,String(r))}for(const n of o.flat(1/0))if(n!=null)if(typeof n=="function"){const r=document.createTextNode("");i.appendChild(r),y(()=>{const c=n();r.textContent=String(c??"")})}else n instanceof Node?i.appendChild(n):i.appendChild(document.createTextNode(String(n)));return i}function B(t,e,o){for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(e(o))}function F(t={}){const e=g(0),o=()=>e(e()+1),i=()=>e(e()-1),n="Styled Counter",r=g("blue");if(typeof document<"u"){const c="lumin-style-styledcounter";if(!document.getElementById(c)){const f=document.createElement("style");f.id=c,f.textContent=`
  .counter {
    border: 2px solid #ccc;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    font-family: sans-serif;
  }
  .display {
    font-size: 2rem;
    margin: 10px 0;
  }
  button {
    padding: 10px 20px;
    font-size: 1rem;
    cursor: pointer;
    margin: 0 5px;
  }
`,document.head.appendChild(f)}}return s("div",{class:"counter"},[`
  `,s("h1",null,[()=>n]),`
  `,s("div",{class:"display",style:()=>"color: "+r()},[`
    Count: `,()=>e(),`
  `]),`
  `,s("button",{onClick:o},["Increment"]),`
  `,s("button",{onClick:i},["Decrement"]),`
  `,s("button",{onClick:()=>r(r()==="blue"?"red":"blue")},[`
    Toggle Color
  `]),`
`])}function J(t={}){const e=g(""),o=g(25),i=g(!1),n=E(()=>{const p=e();return p?`Hello, ${p}!`:"Enter your name..."}),r=L({email:"",theme:"light",submissions:0});A(r,{key:"lumin-form-demo"});function c(){S(()=>{e(""),o(25),i(!1),r.reset()})}function f(){r.set("submissions",r.get("submissions")+1),console.log("Submitted!",{name:e(),age:o(),accepted:i(),email:r.get("email")})}if(typeof document<"u"){const p="lumin-style-formdemo";if(!document.getElementById(p)){const l=document.createElement("style");l.id=p,l.textContent=`
  .form-demo {
    max-width: 480px;
    margin: 2rem auto;
    padding: 2rem;
    border-radius: 12px;
    background: #1a1a2e;
    color: #eee;
    font-family: 'Segoe UI', sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }
  h2 { margin: 0 0 1.5rem; color: #e94560; }
  .field { margin-bottom: 1rem; }
  .field label {
    display: block;
    font-size: 0.85rem;
    color: #aaa;
    margin-bottom: 4px;
  }
  .field input, .field select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #333;
    border-radius: 6px;
    background: #16213e;
    color: #eee;
    font-size: 1rem;
    box-sizing: border-box;
  }
  .field input:focus {
    outline: none;
    border-color: #e94560;
  }
  .checkbox-field {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 1rem;
  }
  .checkbox-field input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #e94560;
  }
  .greeting {
    padding: 12px;
    border-radius: 6px;
    background: #0f3460;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 1rem;
  }
  button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    transition: transform 0.1s;
  }
  button:active { transform: scale(0.97); }
  .btn-primary { background: #e94560; color: white; }
  .btn-secondary { background: #333; color: #ccc; }
  .stats {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #333;
    font-size: 0.85rem;
    color: #888;
  }
`,document.head.appendChild(l)}}return s("div",{class:"form-demo"},[`
  `,s("h2",null,["LuminJS Form Demo"]),`

  `,s("div",{class:"greeting"},[()=>n()]),`

  `,s("div",{class:"field"},[`
    `,s("label",null,["Name"]),`
    `,s("input",{type:"text","bind:value":e}),`
  `]),`

  `,s("div",{class:"field"},[`
    `,s("label",null,["Age"]),`
    `,s("input",{type:"number","bind:value":o}),`
  `]),`

  `,s("div",{class:"field"},[`
    `,s("label",null,["Email (stored)"]),`
    `,s("input",{type:"email","bind:value":r.signal("email")}),`
  `]),`

  `,s("div",{class:"checkbox-field"},[`
    `,s("input",{type:"checkbox","bind:checked":i}),`
    `,s("label",null,["I accept the terms"]),`
  `]),`

  `,s("div",{class:"actions"},[`
    `,s("button",{class:"btn-primary",onClick:f},["Submit"]),`
    `,s("button",{class:"btn-secondary",onClick:c},["Reset All"]),`
  `]),`

  `,s("div",{class:"stats"},[`
    Submissions: `,()=>r.get("submissions"),`
  `]),`
`])}function T(t={}){return s("div",null,[`
  `,s(F,null),`
  `,s(J,null),`
`])}const O=document.getElementById("app");O&&B(O,T);

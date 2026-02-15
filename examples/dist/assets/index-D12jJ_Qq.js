(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function o(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(n){if(n.ep)return;n.ep=!0;const s=o(n);fetch(n.href,s)}})();let v=null,C=0;const w=new Set;function I(t){t.cleanup&&t.cleanup();for(const o of t.deps)o.delete(t);t.deps.clear();const e=v;v=t;try{t.cleanup=t.execute()}finally{v=e}}function D(t){for(const e of[...t])C>0?w.add(e):I(e)}function y(t){let e=t;const o=new Set;function r(n){if(arguments.length===0)return v&&(o.add(v),v.deps.add(o)),e;{const s=n;return Object.is(e,s)||(e=s,D(o)),e}}return Object.defineProperty(r,"value",{get(){return r()},set(n){r(n)},enumerable:!0}),r._subscribe=n=>{const s={execute:()=>n(e),deps:new Set,cleanup:void 0};return o.add(s),()=>{o.delete(s);for(const c of s.deps)c.delete(s)}},r._peek=()=>e,r}function x(t){const e={execute:t,deps:new Set,cleanup:void 0};return I(e),()=>{e.cleanup&&e.cleanup();for(const o of e.deps)o.delete(e);e.deps.clear()}}function z(t){const e=y(void 0);x(()=>{e(t())});function o(){return e()}return Object.defineProperty(o,"value",{get(){return e()},enumerable:!0}),o._subscribe=e._subscribe,o._peek=e._peek,o}function S(t){C++;try{return t()}finally{if(C--,C===0){const e=[...w];w.clear();for(const o of e)I(o)}}}function T(t){const e=structuredClone(t),o=new Map,r=new Set;function n(a){const u=a;return o.has(u)||o.set(u,y(e[a])),o.get(u)}function s(a){return n(a)()}function c(a,u){n(a)(u),b(a)}function d(a){S(()=>{for(const[u,g]of Object.entries(a))n(u)(g)});for(const u of Object.keys(a))b(u)}function p(){S(()=>{for(const[a,u]of Object.entries(e))n(a)(structuredClone(u))}),b()}function f(){const a={};for(const u of Object.keys(e)){const g=o.get(u);a[u]=g?g._peek():e[u]}return Object.freeze(a)}function l(a){return r.add(a),()=>r.delete(a)}function b(a){const u=f();for(const g of r)g(u,a)}const m=new Proxy({},{get(a,u){return s(u)},set(a,u,g){return c(u,g),!0},ownKeys(){return Object.keys(e)},getOwnPropertyDescriptor(a,u){if(u in e)return{configurable:!0,enumerable:!0,writable:!0}},has(a,u){return u in e}});return{get:s,set:c,update:d,reset:p,snapshot:f,subscribe:l,signal:n,state:m}}function j(t,e){const{key:o,storage:r=typeof localStorage<"u"?localStorage:null,serialize:n=JSON.stringify,deserialize:s=JSON.parse,include:c,exclude:d}=e;if(!r)return()=>{};try{const f=r.getItem(o);if(f){const l=s(f);l&&typeof l=="object"&&t.update(l)}}catch{}return t.subscribe(f=>{try{let l={...f};if(c){const b={};for(const m of c)m in l&&(b[m]=l[m]);l=b}if(d)for(const b of d)delete l[b];r.setItem(o,n(l))}catch{}})}function N(t,e,o,r,n){x(()=>{const s=e();t[o]=s}),t.addEventListener(r,()=>{const s=t[o];e(s)})}function M(t,e){const r=t.tagName.toLowerCase()==="select"?"change":"input";N(t,e,"value",r)}function B(t,e){N(t,e,"checked","change")}function H(t,e){x(()=>{t.value=String(e())}),t.addEventListener("input",()=>{const o=t.valueAsNumber;Number.isNaN(o)||e(o)})}function P(t,e){x(()=>{t.checked=t.value===e()}),t.addEventListener("change",()=>{t.checked&&e(t.value)})}function F(t,e){const o=t;x(()=>{const r=e();for(const n of Array.from(o.options))n.selected=r.includes(n.value)}),o.addEventListener("change",()=>{const r=[];for(const n of Array.from(o.selectedOptions))r.push(n.value);e(r)})}function R(t,e,o){const r=t.tagName.toLowerCase(),n=t.type?.toLowerCase()||"";switch(e){case"value":r==="input"&&(n==="number"||n==="range")?H(t,o):M(t,o);break;case"checked":B(t,o);break;case"group":P(t,o);break;case"selected":F(t,o);break;default:N(t,o,e,"input");break}}let h=null;function J(t){h?h.mount.push(t):console.warn("onMount must be called during component initialization.")}function K(t){h?h.destroy.push(t):console.warn("onDestroy must be called during component initialization.")}function V(t){const e=h,o={mount:[],destroy:[]};h=o;try{return{result:t(),...o}}finally{h=e}}function _(t){for(const e of t)try{e()}catch(o){console.error("Error in hook:",o)}}function i(t,e,...o){if(typeof t=="function"){const{result:n,mount:s,destroy:c}=V(()=>t(e||{},...o)),d=Array.isArray(n)?n:[n];for(const p of d)p instanceof HTMLElement&&(s.length>0&&setTimeout(()=>_(s),0),c.length>0&&(p._luminDestroy=c));return n}const r=document.createElement(t);if(e)for(const[n,s]of Object.entries(e)){if(n.startsWith("bind:")){const c=n.slice(5);typeof s=="function"&&"_peek"in s&&R(r,c,s);continue}if(n.startsWith("on")&&typeof s=="function"){const c=n.slice(2).toLowerCase();r.addEventListener(c,s)}else typeof s=="function"?x(()=>{const c=s();n==="value"||n==="checked"||n==="disabled"||n==="selected"?r[n]=c:typeof c=="boolean"?c?r.setAttribute(n,""):r.removeAttribute(n):r.setAttribute(n,String(c))}):r.setAttribute(n,String(s))}for(const n of o.flat(1/0))if(n!=null)if(typeof n=="function"){const s=document.createComment("cf-start"),c=document.createComment("cf-end");r.appendChild(s),r.appendChild(c);let d=[];x(()=>{let p=n(),f=[];const l=Array.isArray(p)?p.flat(1/0):[p];for(let m of l)if(m!=null){for(;typeof m=="function";)m=m();m instanceof Node?f.push(m):f.push(document.createTextNode(String(m)))}const b=new Set(f);for(const m of d)b.has(m)||(A(m),m.parentNode===r&&r.removeChild(m));for(const m of f)r.insertBefore(m,c);d=f})}else n instanceof Node?r.appendChild(n):r.appendChild(document.createTextNode(String(n)));return r}function k(t,...e){return e.flat(1/0)}function A(t){if(t instanceof HTMLElement){const e=t._luminDestroy;e&&_(e)}t.childNodes.forEach(A)}function W(t,e,o){for(;t.firstChild;)t.removeChild(t.firstChild);const r=i(e,{}),n=Array.isArray(r)?r:[r];for(const s of n)s!=null&&(s instanceof Node?t.appendChild(s):t.appendChild(document.createTextNode(String(s))))}function E(t,e){return()=>{if(t())return e[0].body();for(let o=1;o<e.length;o++){const r=e[o];if(!r.cond||r.cond())return r.body()}return[]}}function $(t,e,o){const r=new Map;return()=>{const n=t()||[];if(!o)return n.map((d,p)=>e(d,p));const s=n.map((d,p)=>{const f=o(d);if(r.has(f))return r.get(f);const l=e(d,p);return r.set(f,l),l}),c=new Set(n.map(o));for(const d of r.keys())c.has(d)||r.delete(d);return s}}function L(t={}){if(typeof document<"u"){const e="lumix-style-mylayout";if(!document.getElementById(e)){const o=document.createElement("style");o.id=e,o.textContent=`
  .card {
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 20px;
    font-family: sans-serif;
  }
  .card-header {
    background: #f5f5f5;
    padding: 10px 15px;
    border-bottom: 1px solid #ddd;
  }
  .card-body {
    padding: 15px;
  }
  h3 { margin: 0; }
`,document.head.appendChild(o)}}return i(k,null,i("div",{class:"card"},[`
  `,i("div",{class:"card-header"},[`
    `,t.slots?.header?t.slots.header():[i("h3",null,["Default Header"])],`
  `]),`
  `,i("div",{class:"card-body"},[`
    `,t.children?t.children():[],`
  `]),`
`]),`

`)}function q(t={}){let e=y(0),o=y(!0),r=y(["Apple","Banana","Cherry"]);J(()=>{console.log("ControlFlowDemo mounted")}),K(()=>{console.log("ControlFlowDemo destroyed")});const n=()=>o(!o()),s=()=>e(e()+1),c=()=>e(e()-1),d=()=>{const l=r().concat(`Item ${r().length+1}`);r(l)},p=()=>{const l=r().slice(0,-1);r(l)},f=()=>{const l=[...r()].sort(()=>Math.random()-.5);r(l)};if(typeof document<"u"){const l="lumix-style-controlflowdemo";if(!document.getElementById(l)){const b=document.createElement("style");b.id=l,b.textContent=`
  section {
    margin: 20px 0;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
  button {
    padding: 5px 15px;
    margin-right: 5px;
    cursor: pointer;
  }
`,document.head.appendChild(b)}}return i(k,null,i("div",null,[`
  `,i("h1",null,["Control Flow Demo"]),`
  
  `,i("section",null,[`
    `,i("h2",null,["Conditional Rendering"]),`
    `,i("button",{onClick:n},["Toggle Visible"]),`
    
    `,E(()=>o(),[{body:()=>[`
      `,i("div",{style:"background: #e0f7fa; padding: 10px; border-radius: 8px; margin: 10px 0;"},[`
        `,i("p",null,["This content is togglable!"]),`
        
        `,i("div",null,[`
           `,i("button",{onClick:s},["+"]),`
           `,i("span",{style:"margin: 0 10px;"},["Count: ",()=>e()]),`
           `,i("button",{onClick:c},["-"]),`
        `]),`

        `,E(()=>e()>0,[{body:()=>[`
          `,i("p",{style:"color: green; font-weight: bold;"},["Count is positive"]),`
        `]},{cond:()=>e()<0,body:()=>[`
          `,i("p",{style:"color: red; font-weight: bold;"},["Count is negative"]),`
        `]},{body:()=>[`
          `,i("p",{style:"color: gray;"},["Count is zero"]),`
        `]}]),`
      `]),`
    `]},{body:()=>[`
      `,i("p",null,["Content is hidden."]),`
    `]}]),`
  `]),`

  `,i("hr",null),`

  `,i("section",null,[`
    `,i("h2",null,["Loops (Reactive List)"]),`
    `,i("button",{onClick:d},["Add Item"]),`
    `,i("button",{onClick:p},["Remove Item"]),`
    `,i("button",{onClick:f},["Shuffle Items"]),`
    
    `,i("ul",null,[`
      `,$(()=>r(),l=>[`
        `,i("li",null,[()=>l]),`
      `],l=>l),`
    `]),`
  `]),`
`]),`

`)}function G(t={}){const e=y(""),o=y(25),r=y(!1),n=z(()=>{const p=e();return p?`Hello, ${p}!`:"Enter your name..."}),s=T({email:"",theme:"light",submissions:0});j(s,{key:"lumin-form-demo"});function c(){S(()=>{e(""),o(25),r(!1),s.reset()})}function d(){s.set("submissions",s.get("submissions")+1),console.log("Submitted!",{name:e(),age:o(),accepted:r(),email:s.get("email")})}if(typeof document<"u"){const p="lumix-style-formdemo";if(!document.getElementById(p)){const f=document.createElement("style");f.id=p,f.textContent=`
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
`,document.head.appendChild(f)}}return i(k,null,i("div",{class:"form-demo"},[`
  `,i("h2",null,["LuminJS Form Demo"]),`

  `,i("div",{class:"greeting"},[()=>n()]),`

  `,i("div",{class:"field"},[`
    `,i("label",null,["Name"]),`
    `,i("input",{type:"text","bind:value":e}),`
  `]),`

  `,i("div",{class:"field"},[`
    `,i("label",null,["Age"]),`
    `,i("input",{type:"number","bind:value":o}),`
  `]),`

  `,i("div",{class:"field"},[`
    `,i("label",null,["Email (stored)"]),`
    `,i("input",{type:"email","bind:value":s.signal("email")}),`
  `]),`

  `,i("div",{class:"checkbox-field"},[`
    `,i("input",{type:"checkbox","bind:checked":r}),`
    `,i("label",null,["I accept the terms"]),`
  `]),`

  `,i("div",{class:"actions"},[`
    `,i("button",{class:"btn-primary",onClick:d},["Submit"]),`
    `,i("button",{class:"btn-secondary",onClick:c},["Reset All"]),`
  `]),`

  `,i("div",{class:"stats"},[`
    Submissions: `,()=>s.get("submissions"),`
  `]),`
`]),`
`)}function U(t={}){const e=y(0),o=()=>e(e()+1),r=()=>e(e()-1),n="Styled Counter",s=y("blue");if(typeof document<"u"){const c="lumix-style-styledcounter";if(!document.getElementById(c)){const d=document.createElement("style");d.id=c,d.textContent=`
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
`,document.head.appendChild(d)}}return i(k,null,i("div",{class:"counter"},[`
  `,i("h1",null,[()=>n]),`
  `,i("div",{class:"display",style:()=>{const c="color: "+s();return typeof c=="function"?c():c}},[`
    Count: `,()=>e(),`
  `]),`
  `,i("button",{onClick:o},["Increment"]),`
  `,i("button",{onClick:r},["Decrement"]),`
  `,i("button",{onClick:()=>s(s()==="blue"?"red":"blue")},[`
    Toggle Color
  `]),`
`]),`
`)}function Q(t={}){const e=y(!1),o=()=>e(!e());if(typeof document<"u"){const r="lumix-style-layoutdemo";if(!document.getElementById(r)){const n=document.createElement("style");n.id=r,n.textContent=`
  .demo {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  button {
    padding: 8px 16px;
    cursor: pointer;
  }
`,document.head.appendChild(n)}}return i(k,null,i("div",{class:"demo"},[`
  `,i("h1",null,["Slots & Layouts Demo"]),`
  
  `,i(L,{children:()=>[`
    `,`
    `,i("p",null,["This is the ",i("strong",null,["default slot"])," content."]),`
    `,i("p",null,["It can contain multiple nodes."]),`
    
    `,E(()=>e(),[{body:()=>[`
      `,i("p",{style:"color: green;"},["Extra reactive content inside default slot!"]),`
    `]}]),`
  `],slots:{header:()=>[i("div",{},[`
      `,i("h2",{style:"color: blue;"},["Custom Header"]),`
    `])]}}),`

  `,i(L,{children:()=>[`
    `,i("p",null,["This card uses the ",i("em",null,["Default Header"])," fallback."]),`
    `,i("button",{onClick:o},["Toggle Extra Content"]),`
  `]}),`

  `,i(q,null),`
  `,i(G,null),`
  `,i(U,null),`

`]),`

`)}const O=document.getElementById("app");O&&W(O,Q);

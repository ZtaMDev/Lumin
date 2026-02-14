(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function o(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(n){if(n.ep)return;n.ep=!0;const s=o(n);fetch(n.href,s)}})();let v=null,k=0;const C=new Set;function E(t){t.cleanup&&t.cleanup();for(const o of t.deps)o.delete(t);t.deps.clear();const e=v;v=t;try{t.cleanup=t.execute()}finally{v=e}}function D(t){for(const e of[...t])k>0?C.add(e):E(e)}function y(t){let e=t;const o=new Set;function r(n){if(arguments.length===0)return v&&(o.add(v),v.deps.add(o)),e;{const s=n;return Object.is(e,s)||(e=s,D(o)),e}}return Object.defineProperty(r,"value",{get(){return r()},set(n){r(n)},enumerable:!0}),r._subscribe=n=>{const s={execute:()=>n(e),deps:new Set,cleanup:void 0};return o.add(s),()=>{o.delete(s);for(const c of s.deps)c.delete(s)}},r._peek=()=>e,r}function x(t){const e={execute:t,deps:new Set,cleanup:void 0};return E(e),()=>{e.cleanup&&e.cleanup();for(const o of e.deps)o.delete(e);e.deps.clear()}}function A(t){const e=y(void 0);x(()=>{e(t())});function o(){return e()}return Object.defineProperty(o,"value",{get(){return e()},enumerable:!0}),o._subscribe=e._subscribe,o._peek=e._peek,o}function w(t){k++;try{return t()}finally{if(k--,k===0){const e=[...C];C.clear();for(const o of e)E(o)}}}function z(t){const e=structuredClone(t),o=new Map,r=new Set;function n(u){const d=u;return o.has(d)||o.set(d,y(e[u])),o.get(d)}function s(u){return n(u)()}function c(u,d){n(u)(d),b(u)}function a(u){w(()=>{for(const[d,g]of Object.entries(u))n(d)(g)});for(const d of Object.keys(u))b(d)}function m(){w(()=>{for(const[u,d]of Object.entries(e))n(u)(structuredClone(d))}),b()}function f(){const u={};for(const d of Object.keys(e)){const g=o.get(d);u[d]=g?g._peek():e[d]}return Object.freeze(u)}function l(u){return r.add(u),()=>r.delete(u)}function b(u){const d=f();for(const g of r)g(d,u)}const p=new Proxy({},{get(u,d){return s(d)},set(u,d,g){return c(d,g),!0},ownKeys(){return Object.keys(e)},getOwnPropertyDescriptor(u,d){if(d in e)return{configurable:!0,enumerable:!0,writable:!0}},has(u,d){return d in e}});return{get:s,set:c,update:a,reset:m,snapshot:f,subscribe:l,signal:n,state:p}}function j(t,e){const{key:o,storage:r=typeof localStorage<"u"?localStorage:null,serialize:n=JSON.stringify,deserialize:s=JSON.parse,include:c,exclude:a}=e;if(!r)return()=>{};try{const f=r.getItem(o);if(f){const l=s(f);l&&typeof l=="object"&&t.update(l)}}catch{}return t.subscribe(f=>{try{let l={...f};if(c){const b={};for(const p of c)p in l&&(b[p]=l[p]);l=b}if(a)for(const b of a)delete l[b];r.setItem(o,n(l))}catch{}})}function I(t,e,o,r,n){x(()=>{const s=e();t[o]=s}),t.addEventListener(r,()=>{const s=t[o];e(s)})}function M(t,e){const r=t.tagName.toLowerCase()==="select"?"change":"input";I(t,e,"value",r)}function T(t,e){I(t,e,"checked","change")}function B(t,e){x(()=>{t.value=String(e())}),t.addEventListener("input",()=>{const o=t.valueAsNumber;Number.isNaN(o)||e(o)})}function H(t,e){x(()=>{t.checked=t.value===e()}),t.addEventListener("change",()=>{t.checked&&e(t.value)})}function P(t,e){const o=t;x(()=>{const r=e();for(const n of Array.from(o.options))n.selected=r.includes(n.value)}),o.addEventListener("change",()=>{const r=[];for(const n of Array.from(o.selectedOptions))r.push(n.value);e(r)})}function F(t,e,o){const r=t.tagName.toLowerCase(),n=t.type?.toLowerCase()||"";switch(e){case"value":r==="input"&&(n==="number"||n==="range")?B(t,o):M(t,o);break;case"checked":T(t,o);break;case"group":H(t,o);break;case"selected":P(t,o);break;default:I(t,o,e,"input");break}}let h=null;function R(t){h?h.mount.push(t):console.warn("onMount must be called during component initialization.")}function J(t){h?h.destroy.push(t):console.warn("onDestroy must be called during component initialization.")}function K(t){const e=h,o={mount:[],destroy:[]};h=o;try{return{result:t(),...o}}finally{h=e}}function O(t){for(const e of t)try{e()}catch(o){console.error("Error in hook:",o)}}function i(t,e,...o){if(typeof t=="function"){const{result:n,mount:s,destroy:c}=K(()=>t(e||{},...o));return n instanceof HTMLElement&&(s.length>0&&setTimeout(()=>O(s),0),c.length>0&&(n._luminDestroy=c)),n}const r=document.createElement(t);if(e)for(const[n,s]of Object.entries(e)){if(n.startsWith("bind:")){const c=n.slice(5);typeof s=="function"&&"_peek"in s&&F(r,c,s);continue}if(n.startsWith("on")&&typeof s=="function"){const c=n.slice(2).toLowerCase();r.addEventListener(c,s)}else typeof s=="function"?x(()=>{const c=s();n==="value"||n==="checked"||n==="disabled"||n==="selected"?r[n]=c:typeof c=="boolean"?c?r.setAttribute(n,""):r.removeAttribute(n):r.setAttribute(n,String(c))}):r.setAttribute(n,String(s))}for(const n of o.flat(1/0))if(n!=null)if(typeof n=="function"){const s=document.createComment("cf-start"),c=document.createComment("cf-end");r.appendChild(s),r.appendChild(c);let a=[];x(()=>{let m=n(),f=[];const l=Array.isArray(m)?m.flat(1/0):[m];for(let p of l)if(p!=null){for(;typeof p=="function";)p=p();p instanceof Node?f.push(p):f.push(document.createTextNode(String(p)))}const b=new Set(f);for(const p of a)b.has(p)||(_(p),p.parentNode===r&&r.removeChild(p));for(const p of f)r.insertBefore(p,c);a=f})}else n instanceof Node?r.appendChild(n):r.appendChild(document.createTextNode(String(n)));return r}function _(t){if(t instanceof HTMLElement){const e=t._luminDestroy;e&&O(e)}t.childNodes.forEach(_)}function V(t,e,o){for(;t.firstChild;)t.removeChild(t.firstChild);const r=i(e,{});t.appendChild(r)}function S(t,e){return()=>{if(t())return e[0].body();for(let o=1;o<e.length;o++){const r=e[o];if(!r.cond||r.cond())return r.body()}return[]}}function W(t,e,o){const r=new Map;return()=>{const n=t()||[];if(!o)return n.map((a,m)=>e(a,m));const s=n.map((a,m)=>{const f=o(a);if(r.has(f))return r.get(f);const l=e(a,m);return r.set(f,l),l}),c=new Set(n.map(o));for(const a of r.keys())c.has(a)||r.delete(a);return s}}function N(t={}){if(typeof document<"u"){const e="lumin-style-mylayout";if(!document.getElementById(e)){const o=document.createElement("style");o.id=e,o.textContent=`
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
`,document.head.appendChild(o)}}return i("div",null,[i("div",{class:"card"},[`
  `,i("div",{class:"card-header"},[`
    `,t.slots?.header?t.slots.header():[i("h3",null,["Default Header"])],`
  `]),`
  `,i("div",{class:"card-body"},[`
    `,t.children?t.children():[],`
  `]),`
`]),`

`])}function $(t={}){let e=y(0),o=y(!0),r=y(["Apple","Banana","Cherry"]);R(()=>{console.log("ControlFlowDemo mounted")}),J(()=>{console.log("ControlFlowDemo destroyed")});const n=()=>o(!o()),s=()=>e(e()+1),c=()=>e(e()-1),a=()=>{const l=r().concat(`Item ${r().length+1}`);r(l)},m=()=>{const l=r().slice(0,-1);r(l)},f=()=>{const l=[...r()].sort(()=>Math.random()-.5);r(l)};if(typeof document<"u"){const l="lumin-style-controlflowdemo";if(!document.getElementById(l)){const b=document.createElement("style");b.id=l,b.textContent=`
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
`,document.head.appendChild(b)}}return i("div",null,[i("div",null,[`
  `,i("h1",null,["Control Flow Demo"]),`
  
  `,i("section",null,[`
    `,i("h2",null,["Conditional Rendering"]),`
    `,i("button",{onClick:n},["Toggle Visible"]),`
    
    `,S(()=>o(),[{body:()=>[`
      `,i("div",{style:"background: #e0f7fa; padding: 10px; border-radius: 8px; margin: 10px 0;"},[`
        `,i("p",null,["This content is togglable!"]),`
        
        `,i("div",null,[`
           `,i("button",{onClick:s},["+"]),`
           `,i("span",{style:"margin: 0 10px;"},["Count: ",()=>e()]),`
           `,i("button",{onClick:c},["-"]),`
        `]),`

        `,S(()=>e()>0,[{body:()=>[`
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
    `,i("button",{onClick:a},["Add Item"]),`
    `,i("button",{onClick:m},["Remove Item"]),`
    `,i("button",{onClick:f},["Shuffle Items"]),`
    
    `,i("ul",null,[`
      `,W(()=>r(),l=>[`
        `,i("li",null,[()=>l]),`
      `],l=>l),`
    `]),`
  `]),`
`]),`

`])}function q(t={}){const e=y(""),o=y(25),r=y(!1),n=A(()=>{const m=e();return m?`Hello, ${m}!`:"Enter your name..."}),s=z({email:"",theme:"light",submissions:0});j(s,{key:"lumin-form-demo"});function c(){w(()=>{e(""),o(25),r(!1),s.reset()})}function a(){s.set("submissions",s.get("submissions")+1),console.log("Submitted!",{name:e(),age:o(),accepted:r(),email:s.get("email")})}if(typeof document<"u"){const m="lumin-style-formdemo";if(!document.getElementById(m)){const f=document.createElement("style");f.id=m,f.textContent=`
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
`,document.head.appendChild(f)}}return i("div",null,[i("div",{class:"form-demo"},[`
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
    `,i("button",{class:"btn-primary",onClick:a},["Submit"]),`
    `,i("button",{class:"btn-secondary",onClick:c},["Reset All"]),`
  `]),`

  `,i("div",{class:"stats"},[`
    Submissions: `,()=>s.get("submissions"),`
  `]),`
`]),`
`])}function G(t={}){const e=y(0),o=()=>e(e()+1),r=()=>e(e()-1),n="Styled Counter",s=y("blue");if(typeof document<"u"){const c="lumin-style-styledcounter";if(!document.getElementById(c)){const a=document.createElement("style");a.id=c,a.textContent=`
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
`,document.head.appendChild(a)}}return i("div",null,[i("div",{class:"counter"},[`
  `,i("h1",null,[()=>n]),`
  `,i("div",{class:"display",style:()=>"color: "+s()},[`
    Count: `,()=>e(),`
  `]),`
  `,i("button",{onClick:o},["Increment"]),`
  `,i("button",{onClick:r},["Decrement"]),`
  `,i("button",{onClick:()=>s(s()==="blue"?"red":"blue")},[`
    Toggle Color
  `]),`
`]),`
`])}function U(t={}){const e=y(!1),o=()=>e(!e());if(typeof document<"u"){const r="lumin-style-layoutdemo";if(!document.getElementById(r)){const n=document.createElement("style");n.id=r,n.textContent=`
  .demo {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  button {
    padding: 8px 16px;
    cursor: pointer;
  }
`,document.head.appendChild(n)}}return i("div",null,[i("div",{class:"demo"},[`
  `,i("h1",null,["Slots & Layouts Demo"]),`
  
  `,i(N,{children:()=>[`
    `,`
    `,i("p",null,["This is the ",i("strong",null,["default slot"])," content."]),`
    `,i("p",null,["It can contain multiple nodes."]),`
    
    `,S(()=>e(),[{body:()=>[`
      `,i("p",{style:"color: green;"},["Extra reactive content inside default slot!"]),`
    `]}]),`
  `],slots:{header:()=>[i("div",{},[`
      `,i("h2",{style:"color: blue;"},["Custom Header"]),`
    `])]}}),`

  `,i(N,{children:()=>[`
    `,i("p",null,["This card uses the ",i("em",null,["Default Header"])," fallback."]),`
    `,i("button",{onClick:o},["Toggle Extra Content"]),`
  `]}),`

  `,i($,null),`
  `,i(q,null),`
  `,i(G,null),`

`]),`

`])}const L=document.getElementById("app");L&&V(L,U);

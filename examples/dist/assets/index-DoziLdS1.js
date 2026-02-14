(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function r(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(n){if(n.ep)return;n.ep=!0;const i=r(n);fetch(n.href,i)}})();let u=null;function b(e){e.cleanup&&e.cleanup();for(const r of e.deps)r.delete(e);e.deps.clear();const t=u;u=e;try{e.cleanup=e.execute()}finally{u=t}}function E(e){for(const t of[...e])b(t)}function k(e){let t=e;const r=new Set;function o(n){if(arguments.length===0)return u&&(r.add(u),u.deps.add(r)),t;{const i=n;return Object.is(t,i)||(t=i,E(r)),t}}return Object.defineProperty(o,"value",{get(){return o()},set(n){o(n)},enumerable:!0}),o._subscribe=n=>{const i={execute:()=>n(t),deps:new Set,cleanup:void 0};return r.add(i),()=>{r.delete(i);for(const c of i.deps)c.delete(i)}},o._peek=()=>t,o}function l(e){const t={execute:e,deps:new Set,cleanup:void 0};return b(t),()=>{t.cleanup&&t.cleanup();for(const r of t.deps)r.delete(t);t.deps.clear()}}function p(e,t,r,o,n){l(()=>{const i=t();e[r]=i}),e.addEventListener(o,()=>{const i=e[r];t(i)})}function w(e,t){const o=e.tagName.toLowerCase()==="select"?"change":"input";p(e,t,"value",o)}function N(e,t){p(e,t,"checked","change")}function L(e,t){l(()=>{e.value=String(t())}),e.addEventListener("input",()=>{const r=e.valueAsNumber;Number.isNaN(r)||t(r)})}function S(e,t){l(()=>{e.checked=e.value===t()}),e.addEventListener("change",()=>{e.checked&&t(e.value)})}function A(e,t){const r=e;l(()=>{const o=t();for(const n of Array.from(r.options))n.selected=o.includes(n.value)}),r.addEventListener("change",()=>{const o=[];for(const n of Array.from(r.selectedOptions))o.push(n.value);t(o)})}function O(e,t,r){var i;const o=e.tagName.toLowerCase(),n=((i=e.type)==null?void 0:i.toLowerCase())||"";switch(t){case"value":o==="input"&&(n==="number"||n==="range")?L(e,r):w(e,r);break;case"checked":N(e,r);break;case"group":S(e,r);break;case"selected":A(e,r);break;default:p(e,r,t,"input");break}}function I(e){const t={mount:[],destroy:[]};try{return{result:e(),...t}}finally{}}function v(e){for(const t of e)try{t()}catch(r){console.error("Error in hook:",r)}}function s(e,t,...r){if(typeof e=="function"){const{result:n,mount:i,destroy:c}=I(()=>e(t||{},...r));return n instanceof HTMLElement&&(i.length>0&&setTimeout(()=>v(i),0),c.length>0&&(n._luminDestroy=c)),n}const o=document.createElement(e);if(t)for(const[n,i]of Object.entries(t)){if(n.startsWith("bind:")){const c=n.slice(5);typeof i=="function"&&"_peek"in i&&O(o,c,i);continue}if(n.startsWith("on")&&typeof i=="function"){const c=n.slice(2).toLowerCase();o.addEventListener(c,i)}else typeof i=="function"?l(()=>{const c=i();n==="value"||n==="checked"||n==="disabled"||n==="selected"?o[n]=c:typeof c=="boolean"?c?o.setAttribute(n,""):o.removeAttribute(n):o.setAttribute(n,String(c))}):o.setAttribute(n,String(i))}for(const n of r.flat(1/0))if(n!=null)if(typeof n=="function"){const i=document.createComment("cf-start"),c=document.createComment("cf-end");o.appendChild(i),o.appendChild(c);let m=[];l(()=>{let f=n(),a=[];const C=Array.isArray(f)?f.flat(1/0):[f];for(let d of C)if(d!=null){for(;typeof d=="function";)d=d();d instanceof Node?a.push(d):a.push(document.createTextNode(String(d)))}const x=new Set(a);for(const d of m)x.has(d)||(g(d),d.parentNode===o&&o.removeChild(d));for(const d of a)o.insertBefore(d,c);m=a})}else n instanceof Node?o.appendChild(n):o.appendChild(document.createTextNode(String(n)));return o}function g(e){if(e instanceof HTMLElement){const t=e._luminDestroy;t&&v(t)}e.childNodes.forEach(g)}function T(e,t,r){for(;e.firstChild;)e.removeChild(e.firstChild);const o=s(t,{});e.appendChild(o)}function H(e,t){return()=>{if(e())return t[0].body();for(let r=1;r<t.length;r++){const o=t[r];if(!o.cond||o.cond())return o.body()}return[]}}function h(e={}){var t;if(typeof document<"u"){const r="lumin-style-mylayout";if(!document.getElementById(r)){const o=document.createElement("style");o.id=r,o.textContent=`
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
`,document.head.appendChild(o)}}return s("div",null,[s("div",{class:"card"},[`
  `,s("div",{class:"card-header"},[`
    `,(t=e.slots)!=null&&t.header?e.slots.header():[s("h3",null,["Default Header"])],`
  `]),`
  `,s("div",{class:"card-body"},[`
    `,e.children?e.children():[],`
  `]),`
`]),`

`])}function _(e={}){const t=k(!1),r=()=>t(!t());if(typeof document<"u"){const o="lumin-style-layoutdemo";if(!document.getElementById(o)){const n=document.createElement("style");n.id=o,n.textContent=`
  .demo {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  button {
    padding: 8px 16px;
    cursor: pointer;
  }
`,document.head.appendChild(n)}}return s("div",null,[s("div",{class:"demo"},[`
  `,s("h1",null,["Slots & Layouts Demo"]),`
  
  `,s(h,{children:()=>[`
    `,`
    `,s("p",null,["This is the ",s("strong",null,["default slot"])," content."]),`
    `,s("p",null,["It can contain multiple nodes."]),`
    
    `,H(()=>t(),[{body:()=>[`
      `,s("p",{style:"color: green;"},["Extra reactive content inside default slot!"]),`
    `]}]),`
  `],slots:{header:()=>[s("div",{},[`
      `,s("h2",{style:"color: blue;"},["Custom Header"]),`
    `])]}}),`

  `,s(h,{children:()=>[`
    `,s("p",null,["This card uses the ",s("em",null,["Default Header"])," fallback."]),`
    `,s("button",{onClick:r},["Toggle Extra Content"]),`
  `]}),`
`]),`

`])}const y=document.getElementById("app");y&&T(y,_);

(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const c of o.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function i(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(n){if(n.ep)return;n.ep=!0;const o=i(n);fetch(n.href,o)}})();let d=null;function v(e){e.cleanup&&e.cleanup();for(const i of e.deps)i.delete(e);e.deps.clear();const t=d;d=e;try{e.cleanup=e.execute()}finally{d=t}}function N(e){for(const t of[...e])v(t)}function k(e){let t=e;const i=new Set;function r(n){if(arguments.length===0)return d&&(i.add(d),d.deps.add(i)),t;{const o=n;return Object.is(t,o)||(t=o,N(i)),t}}return Object.defineProperty(r,"value",{get(){return r()},set(n){r(n)},enumerable:!0}),r._subscribe=n=>{const o={execute:()=>n(t),deps:new Set,cleanup:void 0};return i.add(o),()=>{i.delete(o);for(const c of o.deps)c.delete(o)}},r._peek=()=>t,r}function l(e){const t={execute:e,deps:new Set,cleanup:void 0};return v(t),()=>{t.cleanup&&t.cleanup();for(const i of t.deps)i.delete(t);t.deps.clear()}}function p(e,t,i,r,n){l(()=>{const o=t();e[i]=o}),e.addEventListener(r,()=>{const o=e[i];t(o)})}function x(e,t){const r=e.tagName.toLowerCase()==="select"?"change":"input";p(e,t,"value",r)}function E(e,t){p(e,t,"checked","change")}function S(e,t){l(()=>{e.value=String(t())}),e.addEventListener("input",()=>{const i=e.valueAsNumber;Number.isNaN(i)||t(i)})}function L(e,t){l(()=>{e.checked=e.value===t()}),e.addEventListener("change",()=>{e.checked&&t(e.value)})}function A(e,t){const i=e;l(()=>{const r=t();for(const n of Array.from(i.options))n.selected=r.includes(n.value)}),i.addEventListener("change",()=>{const r=[];for(const n of Array.from(i.selectedOptions))r.push(n.value);t(r)})}function I(e,t,i){var o;const r=e.tagName.toLowerCase(),n=((o=e.type)==null?void 0:o.toLowerCase())||"";switch(t){case"value":r==="input"&&(n==="number"||n==="range")?S(e,i):x(e,i);break;case"checked":E(e,i);break;case"group":L(e,i);break;case"selected":A(e,i);break;default:p(e,i,t,"input");break}}function O(e){const t={mount:[],destroy:[]};try{return{result:e(),...t}}finally{}}function b(e){for(const t of e)try{t()}catch(i){console.error("Error in hook:",i)}}function s(e,t,...i){if(typeof e=="function"){const{result:n,mount:o,destroy:c}=O(()=>e(t||{},...i));return n instanceof HTMLElement&&(o.length>0&&setTimeout(()=>b(o),0),c.length>0&&(n._luminDestroy=c)),n}const r=document.createElement(e);if(t)for(const[n,o]of Object.entries(t)){if(n.startsWith("bind:")){const c=n.slice(5);typeof o=="function"&&"_peek"in o&&I(r,c,o);continue}if(n.startsWith("on")&&typeof o=="function"){const c=n.slice(2).toLowerCase();r.addEventListener(c,o)}else typeof o=="function"?l(()=>{const c=o();n==="value"||n==="checked"||n==="disabled"||n==="selected"?r[n]=c:typeof c=="boolean"?c?r.setAttribute(n,""):r.removeAttribute(n):r.setAttribute(n,String(c))}):r.setAttribute(n,String(o))}for(const n of i.flat(1/0))if(n!=null)if(typeof n=="function"){const o=document.createComment("cf-start"),c=document.createComment("cf-end");r.appendChild(o),r.appendChild(c);let m=[];l(()=>{let f=n(),a=[];const C=Array.isArray(f)?f.flat(1/0):[f];for(let u of C)if(u!=null){for(;typeof u=="function";)u=u();u instanceof Node?a.push(u):a.push(document.createTextNode(String(u)))}const w=new Set(a);for(const u of m)w.has(u)||(g(u),u.parentNode===r&&r.removeChild(u));for(const u of a)r.insertBefore(u,c);m=a})}else n instanceof Node?r.appendChild(n):r.appendChild(document.createTextNode(String(n)));return r}function g(e){if(e instanceof HTMLElement){const t=e._luminDestroy;t&&b(t)}e.childNodes.forEach(g)}function P(e,t,i){for(;e.firstChild;)e.removeChild(e.firstChild);const r=s(t,{});e.appendChild(r)}function h(e={}){let{title:t,count:i,active:r=!1}=e;if(t===void 0)throw new Error("LuminJS: Component 'MyCard' missing required prop 'title'");if(i===void 0)throw new Error("LuminJS: Component 'MyCard' missing required prop 'count'");if(typeof document<"u"){const n="lumin-style-mycard";if(!document.getElementById(n)){const o=document.createElement("style");o.id=n,o.textContent=`
  .card {
    padding: 15px;
    margin: 15px 0;
    border-radius: 8px;
    font-family: sans-serif;
  }
  h2 {
    margin-top: 0;
    color: #333;
  }
`,document.head.appendChild(o)}}return s("div",null,[s("div",{class:"card",style:()=>r?"border: 2px solid blue; background: #f0f8ff;":"border: 1px solid #ccc;"},[`
  `,s("h2",null,[()=>t]),`
  `,s("p",null,["Count Value: ",()=>i]),`
  `,s("p",null,["Status: ",()=>r?"Active":"Inactive"]),`
`]),`

`])}function M(e={}){const t=k(0),i=()=>t(t()+1),r=()=>t(t()-1);if(typeof document<"u"){const n="lumin-style-propsdemo";if(!document.getElementById(n)){const o=document.createElement("style");o.id=n,o.textContent=`
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }
  .controls {
    margin: 10px 0;
  }
  button {
    padding: 8px 16px;
    margin-right: 10px;
    cursor: pointer;
  }
  .note {
    font-size: 0.9em;
    color: #666;
    font-style: italic;
    margin-top: 20px;
  }
`,document.head.appendChild(o)}}return s("div",null,[s("div",{class:"container"},[`
  `,s("h1",null,["Component Props Demo"]),`
  `,s("p",null,["Parent Counter: ",s("strong",null,[()=>t()])]),`
  
  `,s("div",{class:"controls"},[`
    `,s("button",{onClick:i},["Parent +"]),`
    `,s("button",{onClick:r},["Parent -"]),`
  `]),`

  `,s("hr",null),`

  `,s(h,{title:"Reactive Card (Props)",count:()=>t(),active:()=>!0}),`
  
  `,s(h,{title:"Static Card (Default Active)",count:()=>100}),`

  `,s("p",{class:"note"},["Note: If you omit 'title' or 'count', an error will be thrown (see console)."]),`
`]),`

`])}const y=document.getElementById("app");y&&P(y,M);

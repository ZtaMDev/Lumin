(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function r(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(n){if(n.ep)return;n.ep=!0;const i=r(n);fetch(n.href,i)}})();let m=null;function w(e){e.cleanup&&e.cleanup();for(const r of e.deps)r.delete(e);e.deps.clear();const t=m;m=e;try{e.cleanup=e.execute()}finally{m=t}}function x(e){for(const t of[...e])w(t)}function b(e){let t=e;const r=new Set;function o(n){if(arguments.length===0)return m&&(r.add(m),m.deps.add(r)),t;{const i=n;return Object.is(t,i)||(t=i,x(r)),t}}return Object.defineProperty(o,"value",{get(){return o()},set(n){o(n)},enumerable:!0}),o._subscribe=n=>{const i={execute:()=>n(t),deps:new Set,cleanup:void 0};return r.add(i),()=>{r.delete(i);for(const c of i.deps)c.delete(i)}},o._peek=()=>t,o}function h(e){const t={execute:e,deps:new Set,cleanup:void 0};return w(t),()=>{t.cleanup&&t.cleanup();for(const r of t.deps)r.delete(t);t.deps.clear()}}function g(e,t,r,o,n){h(()=>{const i=t();e[r]=i}),e.addEventListener(o,()=>{const i=e[r];t(i)})}function L(e,t){const o=e.tagName.toLowerCase()==="select"?"change":"input";g(e,t,"value",o)}function S(e,t){g(e,t,"checked","change")}function E(e,t){h(()=>{e.value=String(t())}),e.addEventListener("input",()=>{const r=e.valueAsNumber;Number.isNaN(r)||t(r)})}function A(e,t){h(()=>{e.checked=e.value===t()}),e.addEventListener("change",()=>{e.checked&&t(e.value)})}function I(e,t){const r=e;h(()=>{const o=t();for(const n of Array.from(r.options))n.selected=o.includes(n.value)}),r.addEventListener("change",()=>{const o=[];for(const n of Array.from(r.selectedOptions))o.push(n.value);t(o)})}function O(e,t,r){var i;const o=e.tagName.toLowerCase(),n=((i=e.type)==null?void 0:i.toLowerCase())||"";switch(t){case"value":o==="input"&&(n==="number"||n==="range")?E(e,r):L(e,r);break;case"checked":S(e,r);break;case"group":A(e,r);break;case"selected":I(e,r);break;default:g(e,r,t,"input");break}}let p=null;function M(e){p?p.mount.push(e):console.warn("onMount must be called during component initialization.")}function _(e){p?p.destroy.push(e):console.warn("onDestroy must be called during component initialization.")}function D(e){const t=p,r={mount:[],destroy:[]};p=r;try{return{result:e(),...r}}finally{p=t}}function k(e){for(const t of e)try{t()}catch(r){console.error("Error in hook:",r)}}function s(e,t,...r){if(typeof e=="function"){const{result:n,mount:i,destroy:c}=D(()=>e(t||{},...r));return n instanceof HTMLElement&&(i.length>0&&setTimeout(()=>k(i),0),c.length>0&&(n._luminDestroy=c)),n}const o=document.createElement(e);if(t)for(const[n,i]of Object.entries(t)){if(n.startsWith("bind:")){const c=n.slice(5);typeof i=="function"&&"_peek"in i&&O(o,c,i);continue}if(n.startsWith("on")&&typeof i=="function"){const c=n.slice(2).toLowerCase();o.addEventListener(c,i)}else typeof i=="function"?h(()=>{const c=i();n==="value"||n==="checked"||n==="disabled"||n==="selected"?o[n]=c:typeof c=="boolean"?c?o.setAttribute(n,""):o.removeAttribute(n):o.setAttribute(n,String(c))}):o.setAttribute(n,String(i))}for(const n of r.flat(1/0))if(n!=null)if(typeof n=="function"){const i=document.createComment("cf-start"),c=document.createComment("cf-end");o.appendChild(i),o.appendChild(c);let d=[];h(()=>{let a=n(),f=[];const l=Array.isArray(a)?a.flat(1/0):[a];for(let u of l)if(u!=null){for(;typeof u=="function";)u=u();u instanceof Node?f.push(u):f.push(document.createTextNode(String(u)))}const y=new Set(f);for(const u of d)y.has(u)||(N(u),u.parentNode===o&&o.removeChild(u));for(const u of f)o.insertBefore(u,c);d=f})}else n instanceof Node?o.appendChild(n):o.appendChild(document.createTextNode(String(n)));return o}function N(e){if(e instanceof HTMLElement){const t=e._luminDestroy;t&&k(t)}e.childNodes.forEach(N)}function T(e,t,r){for(;e.firstChild;)e.removeChild(e.firstChild);const o=s(t,{});e.appendChild(o)}function v(e,t){return()=>{if(e())return t[0].body();for(let r=1;r<t.length;r++){const o=t[r];if(!o.cond||o.cond())return o.body()}return[]}}function B(e,t,r){const o=new Map;return()=>{const n=e()||[];if(!r)return n.map((d,a)=>t(d,a));const i=n.map((d,a)=>{const f=r(d);if(o.has(f))return o.get(f);const l=t(d,a);return o.set(f,l),l}),c=new Set(n.map(r));for(const d of o.keys())c.has(d)||o.delete(d);return i}}function H(e={}){let t=b(0),r=b(!0),o=b(["Apple","Banana","Cherry"]);M(()=>{console.log("ControlFlowDemo mounted")}),_(()=>{console.log("ControlFlowDemo destroyed")});const n=()=>r(!r()),i=()=>t(t()+1),c=()=>t(t()-1),d=()=>{const l=o().concat(`Item ${o().length+1}`);o(l)},a=()=>{const l=o().slice(0,-1);o(l)},f=()=>{const l=[...o()].sort(()=>Math.random()-.5);o(l)};if(typeof document<"u"){const l="lumin-style-controlflowdemo";if(!document.getElementById(l)){const y=document.createElement("style");y.id=l,y.textContent=`
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
`,document.head.appendChild(y)}}return s("div",null,[s("div",null,[`
  `,s("h1",null,["Control Flow Demo"]),`
  
  `,s("section",null,[`
    `,s("h2",null,["Conditional Rendering"]),`
    `,s("button",{onClick:n},["Toggle Visible"]),`
    
    `,v(()=>r(),[{body:()=>[`
      `,s("div",{style:"background: #e0f7fa; padding: 10px; border-radius: 8px; margin: 10px 0;"},[`
        `,s("p",null,["This content is togglable!"]),`
        
        `,s("div",null,[`
           `,s("button",{onClick:i},["+"]),`
           `,s("span",{style:"margin: 0 10px;"},["Count: ",()=>t()]),`
           `,s("button",{onClick:c},["-"]),`
        `]),`

        `,v(()=>t()>0,[{body:()=>[`
          `,s("p",{style:"color: green; font-weight: bold;"},["Count is positive"]),`
        `]},{cond:()=>t()<0,body:()=>[`
          `,s("p",{style:"color: red; font-weight: bold;"},["Count is negative"]),`
        `]},{body:()=>[`
          `,s("p",{style:"color: gray;"},["Count is zero"]),`
        `]}]),`
      `]),`
    `]},{body:()=>[`
      `,s("p",null,["Content is hidden."]),`
    `]}]),`
  `]),`

  `,s("hr",null),`

  `,s("section",null,[`
    `,s("h2",null,["Loops (Reactive List)"]),`
    `,s("button",{onClick:d},["Add Item"]),`
    `,s("button",{onClick:a},["Remove Item"]),`
    `,s("button",{onClick:f},["Shuffle Items"]),`
    
    `,s("ul",null,[`
      `,B(()=>o(),l=>[`
        `,s("li",null,[()=>l]),`
      `],l=>l),`
    `]),`
  `]),`
`]),`

`])}const C=document.getElementById("app");C&&T(C,H);

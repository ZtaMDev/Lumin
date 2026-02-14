(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function i(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(n){if(n.ep)return;n.ep=!0;const s=i(n);fetch(n.href,s)}})();let m=null;function w(e){e.cleanup&&e.cleanup();for(const i of e.deps)i.delete(e);e.deps.clear();const t=m;m=e;try{e.cleanup=e.execute()}finally{m=t}}function L(e){for(const t of[...e])w(t)}function b(e){let t=e;const i=new Set;function o(n){if(arguments.length===0)return m&&(i.add(m),m.deps.add(i)),t;{const s=n;return Object.is(t,s)||(t=s,L(i)),t}}return Object.defineProperty(o,"value",{get(){return o()},set(n){o(n)},enumerable:!0}),o._subscribe=n=>{const s={execute:()=>n(t),deps:new Set,cleanup:void 0};return i.add(s),()=>{i.delete(s);for(const c of s.deps)c.delete(s)}},o._peek=()=>t,o}function h(e){const t={execute:e,deps:new Set,cleanup:void 0};return w(t),()=>{t.cleanup&&t.cleanup();for(const i of t.deps)i.delete(t);t.deps.clear()}}function v(e,t,i,o,n){h(()=>{const s=t();e[i]=s}),e.addEventListener(o,()=>{const s=e[i];t(s)})}function N(e,t){const o=e.tagName.toLowerCase()==="select"?"change":"input";v(e,t,"value",o)}function S(e,t){v(e,t,"checked","change")}function I(e,t){h(()=>{e.value=String(t())}),e.addEventListener("input",()=>{const i=e.valueAsNumber;Number.isNaN(i)||t(i)})}function A(e,t){h(()=>{e.checked=e.value===t()}),e.addEventListener("change",()=>{e.checked&&t(e.value)})}function D(e,t){const i=e;h(()=>{const o=t();for(const n of Array.from(i.options))n.selected=o.includes(n.value)}),i.addEventListener("change",()=>{const o=[];for(const n of Array.from(i.selectedOptions))o.push(n.value);t(o)})}function M(e,t,i){const o=e.tagName.toLowerCase(),n=e.type?.toLowerCase()||"";switch(t){case"value":o==="input"&&(n==="number"||n==="range")?I(e,i):N(e,i);break;case"checked":S(e,i);break;case"group":A(e,i);break;case"selected":D(e,i);break;default:v(e,i,t,"input");break}}let p=null;function O(e){p?p.mount.push(e):console.warn("onMount must be called during component initialization.")}function T(e){p?p.destroy.push(e):console.warn("onDestroy must be called during component initialization.")}function _(e){const t=p,i={mount:[],destroy:[]};p=i;try{return{result:e(),...i}}finally{p=t}}function k(e){for(const t of e)try{t()}catch(i){console.error("Error in hook:",i)}}function r(e,t,...i){if(typeof e=="function"){const{result:n,mount:s,destroy:c}=_(()=>e(t||{},...i));return n instanceof HTMLElement&&(s.length>0&&setTimeout(()=>k(s),0),c.length>0&&(n._luminDestroy=c)),n}const o=document.createElement(e);if(t)for(const[n,s]of Object.entries(t)){if(n.startsWith("bind:")){const c=n.slice(5);typeof s=="function"&&"_peek"in s&&M(o,c,s);continue}if(n.startsWith("on")&&typeof s=="function"){const c=n.slice(2).toLowerCase();o.addEventListener(c,s)}else typeof s=="function"?h(()=>{const c=s();n==="value"||n==="checked"||n==="disabled"||n==="selected"?o[n]=c:typeof c=="boolean"?c?o.setAttribute(n,""):o.removeAttribute(n):o.setAttribute(n,String(c))}):o.setAttribute(n,String(s))}for(const n of i.flat(1/0))if(n!=null)if(typeof n=="function"){const s=document.createComment("cf-start"),c=document.createComment("cf-end");o.appendChild(s),o.appendChild(c);let u=[];h(()=>{let f=n(),a=[];const l=Array.isArray(f)?f.flat(1/0):[f];for(let d of l)if(d!=null){for(;typeof d=="function";)d=d();d instanceof Node?a.push(d):a.push(document.createTextNode(String(d)))}const y=new Set(a);for(const d of u)y.has(d)||(E(d),d.parentNode===o&&o.removeChild(d));for(const d of a)o.insertBefore(d,c);u=a})}else n instanceof Node?o.appendChild(n):o.appendChild(document.createTextNode(String(n)));return o}function E(e){if(e instanceof HTMLElement){const t=e._luminDestroy;t&&k(t)}e.childNodes.forEach(E)}function H(e,t,i){for(;e.firstChild;)e.removeChild(e.firstChild);const o=r(t,{});e.appendChild(o)}function g(e,t){return()=>{if(e())return t[0].body();for(let i=1;i<t.length;i++){const o=t[i];if(!o.cond||o.cond())return o.body()}return[]}}function B(e,t,i){const o=new Map;return()=>{const n=e()||[];if(!i)return n.map((u,f)=>t(u,f));const s=n.map((u,f)=>{const a=i(u);if(o.has(a))return o.get(a);const l=t(u,f);return o.set(a,l),l}),c=new Set(n.map(i));for(const u of o.keys())c.has(u)||o.delete(u);return s}}function C(e={}){if(typeof document<"u"){const t="lumin-style-mylayout";if(!document.getElementById(t)){const i=document.createElement("style");i.id=t,i.textContent=`
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
`,document.head.appendChild(i)}}return r("div",null,[r("div",{class:"card"},[`
  `,r("div",{class:"card-header"},[`
    `,e.slots?.header?e.slots.header():[r("h3",null,["Default Header"])],`
  `]),`
  `,r("div",{class:"card-body"},[`
    `,e.children?e.children():[],`
  `]),`
`]),`

`])}function P(e={}){let t=b(0),i=b(!0),o=b(["Apple","Banana","Cherry"]);O(()=>{console.log("ControlFlowDemo mounted")}),T(()=>{console.log("ControlFlowDemo destroyed")});const n=()=>i(!i()),s=()=>t(t()+1),c=()=>t(t()-1),u=()=>{const l=o().concat(`Item ${o().length+1}`);o(l)},f=()=>{const l=o().slice(0,-1);o(l)},a=()=>{const l=[...o()].sort(()=>Math.random()-.5);o(l)};if(typeof document<"u"){const l="lumin-style-controlflowdemo";if(!document.getElementById(l)){const y=document.createElement("style");y.id=l,y.textContent=`
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
`,document.head.appendChild(y)}}return r("div",null,[r("div",null,[`
  `,r("h1",null,["Control Flow Demo"]),`
  
  `,r("section",null,[`
    `,r("h2",null,["Conditional Rendering"]),`
    `,r("button",{onClick:n},["Toggle Visible"]),`
    
    `,g(()=>i(),[{body:()=>[`
      `,r("div",{style:"background: #e0f7fa; padding: 10px; border-radius: 8px; margin: 10px 0;"},[`
        `,r("p",null,["This content is togglable!"]),`
        
        `,r("div",null,[`
           `,r("button",{onClick:s},["+"]),`
           `,r("span",{style:"margin: 0 10px;"},["Count: ",()=>t()]),`
           `,r("button",{onClick:c},["-"]),`
        `]),`

        `,g(()=>t()>0,[{body:()=>[`
          `,r("p",{style:"color: green; font-weight: bold;"},["Count is positive"]),`
        `]},{cond:()=>t()<0,body:()=>[`
          `,r("p",{style:"color: red; font-weight: bold;"},["Count is negative"]),`
        `]},{body:()=>[`
          `,r("p",{style:"color: gray;"},["Count is zero"]),`
        `]}]),`
      `]),`
    `]},{body:()=>[`
      `,r("p",null,["Content is hidden."]),`
    `]}]),`
  `]),`

  `,r("hr",null),`

  `,r("section",null,[`
    `,r("h2",null,["Loops (Reactive List)"]),`
    `,r("button",{onClick:u},["Add Item"]),`
    `,r("button",{onClick:f},["Remove Item"]),`
    `,r("button",{onClick:a},["Shuffle Items"]),`
    
    `,r("ul",null,[`
      `,B(()=>o(),l=>[`
        `,r("li",null,[()=>l]),`
      `],l=>l),`
    `]),`
  `]),`
`]),`

`])}function j(e={}){const t=b(!1),i=()=>t(!t());if(typeof document<"u"){const o="lumin-style-layoutdemo";if(!document.getElementById(o)){const n=document.createElement("style");n.id=o,n.textContent=`
  .demo {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  button {
    padding: 8px 16px;
    cursor: pointer;
  }
`,document.head.appendChild(n)}}return r("div",null,[r("div",{class:"demo"},[`
  `,r("h1",null,["Slots & Layouts Demo"]),`
  
  `,r(C,{children:()=>[`
    `,`
    `,r("p",null,["This is the ",r("strong",null,["default slot"])," content."]),`
    `,r("p",null,["It can contain multiple nodes."]),`
    
    `,g(()=>t(),[{body:()=>[`
      `,r("p",{style:"color: green;"},["Extra reactive content inside default slot!"]),`
    `]}]),`
  `],slots:{header:()=>[r("div",{},[`
      `,r("h2",{style:"color: blue;"},["Custom Header"]),`
    `])]}}),`

  `,r(C,{children:()=>[`
    `,r("p",null,["This card uses the ",r("em",null,["Default Header"])," fallback."]),`
    `,r("button",{onClick:i},["Toggle Extra Content"]),`
  `]}),`

  `,r(P,null),`
`]),`

`])}const x=document.getElementById("app");x&&H(x,j);

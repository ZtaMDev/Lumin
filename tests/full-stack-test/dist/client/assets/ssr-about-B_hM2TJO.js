let u=null;function b(e){e.cleanup&&e.cleanup();for(const o of e.deps)o.delete(e);e.deps.clear();const n=u;u=e;try{e.cleanup=e.execute()}finally{u=n}}function S(e){for(const n of[...e])b(n)}function v(e){let n=e;const o=new Set;function i(r){if(arguments.length===0)return u&&(o.add(u),u.deps.add(o)),n;{const a=r;return Object.is(n,a)||(n=a,S(o)),n}}return Object.defineProperty(i,"value",{get(){return i()},set(r){i(r)},enumerable:!0}),i._subscribe=r=>{const a={execute:()=>r(n),deps:new Set,cleanup:void 0};return o.add(a),()=>{o.delete(a);for(const s of a.deps)s.delete(a)}},i._peek=()=>n,i}function f(e){const n={execute:e,deps:new Set,cleanup:void 0};return b(n),()=>{n.cleanup&&n.cleanup();for(const o of n.deps)o.delete(n);n.deps.clear()}}function m(e,n,o,i,r){f(()=>{const a=n();e[o]=a}),e.addEventListener(i,()=>{const a=e[o];n(a)})}function E(e,n){const i=e.tagName.toLowerCase()==="select"?"change":"input";m(e,n,"value",i)}function N(e,n){m(e,n,"checked","change")}function A(e,n){f(()=>{e.value=String(n())}),e.addEventListener("input",()=>{const o=e.valueAsNumber;Number.isNaN(o)||n(o)})}function L(e,n){f(()=>{e.checked=e.value===n()}),e.addEventListener("change",()=>{e.checked&&n(e.value)})}function z(e,n){const o=e;f(()=>{const i=n();for(const r of Array.from(o.options))r.selected=i.includes(r.value)}),o.addEventListener("change",()=>{const i=[];for(const r of Array.from(o.selectedOptions))i.push(r.value);n(i)})}function I(e,n,o){const i=e.tagName.toLowerCase(),r=e.type?.toLowerCase()||"";switch(n){case"value":i==="input"&&(r==="number"||r==="range")?A(e,o):E(e,o);break;case"checked":N(e,o);break;case"group":L(e,o);break;case"selected":z(e,o);break;default:m(e,o,n,"input");break}}function T(e){const n={mount:[],destroy:[]};return{result:e(),...n}}function y(e){for(const n of e)try{n()}catch(o){console.error("Error in hook:",o)}}function t(e,n,...o){if(typeof e=="function"){const{result:r,mount:a,destroy:s}=T(()=>e(n||{},...o)),d=Array.isArray(r)?r:[r];for(const l of d)l instanceof HTMLElement&&(a.length>0&&setTimeout(()=>y(a),0),s.length>0&&(l._luminDestroy=s));return r}const i=document.createElement(e);if(n)for(const[r,a]of Object.entries(n)){if(r.startsWith("bind:")){const s=r.slice(5);typeof a=="function"&&"_peek"in a&&I(i,s,a);continue}if(r.startsWith("on")&&typeof a=="function"){const s=r.slice(2).toLowerCase();i.addEventListener(s,a)}else typeof a=="function"?f(()=>{const s=a();r==="value"||r==="checked"||r==="disabled"||r==="selected"?i[r]=s:typeof s=="boolean"?s?i.setAttribute(r,""):i.removeAttribute(r):i.setAttribute(r,String(s))}):i.setAttribute(r,String(a))}for(const r of o.flat(1/0))if(r!=null)if(typeof r=="function"){const a=document.createComment("cf-start"),s=document.createComment("cf-end");i.appendChild(a),i.appendChild(s);let d=[];f(()=>{let l=r(),g=[];const k=Array.isArray(l)?l.flat(1/0):[l];for(let c of k)if(c!=null){for(;typeof c=="function";)c=c();if(c instanceof Node)g.push(c);else{const C=c==null?"":String(c);g.push(document.createTextNode(C))}}const w=new Set(g);for(const c of d)w.has(c)||(x(c),c.parentNode===i&&i.removeChild(c));for(const c of g)i.insertBefore(c,s);d=g})}else if(r instanceof Node)i.appendChild(r);else{const a=r==null?"":String(r);i.appendChild(document.createTextNode(a))}return i}function p(e,...n){return n.flat(1/0)}function x(e){if(e instanceof HTMLElement){const n=e._luminDestroy;n&&y(n)}e.childNodes.forEach(x)}function R(e,n,o){for(;e.firstChild;)e.removeChild(e.firstChild);const i=t(n,{}),r=Array.isArray(i)?i:[i];for(const a of r)a!=null&&(a instanceof Node?e.appendChild(a):e.appendChild(document.createTextNode(String(a))))}function j(e={}){if(typeof document<"u"){const n="lumix-style-mainlayout";if(!document.getElementById(n)){const o=document.createElement("style");o.id=n,o.textContent=`
  * {
    box-sizing: border-box;
    font-family: system-ui
  }
  
  body {
    margin: 0;
    background: #0a0a0f;
    color: #e4e4e7;
  }
  
  .layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .header {
    background: rgba(15, 15, 20, 0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem 0;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }
  
  .header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
  }
  
  .logo svg {
    color: #8b5cf6;
  }
  
  .logo img {
    display: block;
  }
  
  .nav {
    display: flex;
    gap: 0.5rem;
  }
  
  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #a1a1aa;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: all 0.2s;
  }
  
  .nav-link:hover {
    color: #fff;
    background: rgba(139, 92, 246, 0.1);
  }
  
  .nav-link svg {
    width: 18px;
    height: 18px;
  }
  
  .nav-link img {
    display: block;
    filter: brightness(0) saturate(100%) invert(67%) sepia(6%) saturate(289%) hue-rotate(202deg) brightness(93%) contrast(87%);
  }
  
  .nav-link:hover img {
    filter: brightness(0) saturate(100%) invert(100%);
  }
  
  .main {
    flex: 1;
    padding: 3rem 0;
  }
  
  .footer {
    background: rgba(15, 15, 20, 0.6);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2rem 0;
    text-align: center;
    color: #71717a;
    font-size: 0.875rem;
  }
  
  .footer p {
    margin: 0;
  }
`,document.head.appendChild(o)}}return t(p,null,t("div",{class:"layout"},[`
  `,t("header",{class:"header"},[`
    `,t("div",{class:"container"},[`
      `,t("div",{class:"logo"},[`
        `,t("img",{src:"/icons/logo.svg",alt:"Lumix",width:"32",height:"32"}),`
        `,t("span",null,["Lumix"]),`
      `]),`
      `,t("nav",{class:"nav"},[`
        `,t("a",{href:"/",class:"nav-link"},[`
          `,t("img",{src:"/icons/home.svg",alt:"",width:"20",height:"20"}),`
          `,t("span",null,["Home"]),`
        `]),`
        `,t("a",{href:"/about",class:"nav-link"},[`
          `,t("img",{src:"/icons/info.svg",alt:"",width:"20",height:"20"}),`
          `,t("span",null,["About"]),`
        `]),`
      `]),`
    `]),`
  `]),`
  
  `,t("main",{class:"main"},[`
    `,t("div",{class:"container"},[`
      `,e.children?e.children():[],`
    `]),`
  `]),`
  
  `,t("footer",{class:"footer"},[`
    `,t("div",{class:"container"},[`
      `,e.slots?.footer?e.slots.footer():[t("p",null,["Built with Lumix • A modern web framework"])],`
    `]),`
  `]),`
`]),`

`)}function B(e={}){let{initialCount:n=0,label:o="Count"}=e;const i=v(n);function r(){i(i()+1)}function a(){i(i()-1)}function s(){i(n)}if(typeof document<"u"){const d="lumix-style-counter";if(!document.getElementById(d)){const l=document.createElement("style");l.id=d,l.textContent=`
  .counter {
    background: rgba(24, 24, 27, 0.6);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 16px;
    padding: 2.5rem;
    text-align: center;
    backdrop-filter: blur(12px);
  }
  
  .counter h3 {
    margin: 0 0 1.5rem 0;
    color: #e4e4e7;
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: 0.025em;
  }
  
  .display {
    font-size: 4rem;
    font-weight: 700;
    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 1.5rem 0;
    font-variant-numeric: tabular-nums;
  }
  
  .buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 2rem;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 10px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
  }
  
  .btn-secondary {
    background: rgba(63, 63, 70, 0.6);
    color: #e4e4e7;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .btn-secondary:hover {
    background: rgba(82, 82, 91, 0.6);
  }
  
  .btn:active {
    transform: translateY(0);
  }
`,document.head.appendChild(l)}}return t(p,null,t("div",{class:"counter"},[`
  `,t("h3",null,[()=>o]),`
  `,t("div",{class:"display"},[()=>i()]),`
  `,t("div",{class:"buttons"},[`
    `,t("button",{onclick:a,class:"btn btn-secondary"},["-"]),`
    `,t("button",{onclick:s,class:"btn btn-secondary"},["Reset"]),`
    `,t("button",{onclick:r,class:"btn btn-primary"},["+"]),`
  `]),`
`]),`

`)}function M(e={}){"use server";const n=new Date().toISOString();if(v(0),typeof document<"u"){const o="lumix-style-about";if(!document.getElementById(o)){const i=document.createElement("style");i.id=o,i.textContent=`
  .page {
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .hero {
    text-align: center;
    margin-bottom: 4rem;
  }
  
  .hero-logo {
    display: block;
    margin: 0 auto 2rem;
    opacity: 0.9;
  }
  
  h1 {
    font-size: 3.5rem;
    margin: 0 0 1rem 0;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  
  .subtitle {
    font-size: 1.25rem;
    color: #a1a1aa;
    margin: 0;
    font-weight: 400;
  }
  
  .info-card {
    background: rgba(24, 24, 27, 0.6);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 16px;
    padding: 2rem;
    margin: 3rem 0;
    backdrop-filter: blur(12px);
  }
  
  .card-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
  }
  
  .card-icon svg {
    color: white;
  }
  
  .card-icon img {
    display: block;
    filter: brightness(0) saturate(100%) invert(100%);
  }
  
  .info-card h2 {
    margin: 0 0 1rem 0;
    color: #e4e4e7;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .info-card p {
    color: #a1a1aa;
    line-height: 1.6;
    margin: 0 0 1.5rem 0;
  }
  
  .info-card ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .info-card li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #d4d4d8;
  }
  
  .info-card li svg {
    color: #10b981;
    flex-shrink: 0;
  }
  
  .info-card li img {
    flex-shrink: 0;
    filter: brightness(0) saturate(100%) invert(64%) sepia(98%) saturate(1000%) hue-rotate(115deg) brightness(96%) contrast(89%);
  }
  
  .server-info {
    background: rgba(24, 24, 27, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2rem;
    margin: 3rem 0;
  }
  
  .server-info h3 {
    margin: 0 0 1.5rem 0;
    color: #e4e4e7;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .info-grid {
    display: grid;
    gap: 1rem;
  }
  
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(39, 39, 42, 0.6);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .info-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #a1a1aa;
  }
  
  .info-label svg {
    color: #10b981;
  }
  
  .info-label img {
    filter: brightness(0) saturate(100%) invert(64%) sepia(98%) saturate(1000%) hue-rotate(115deg) brightness(96%) contrast(89%);
  }
  
  .info-value {
    font-family: 'Courier New', monospace;
    color: #10b981;
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .hint {
    margin: 1.5rem 0 0 0;
    padding: 1rem;
    background: rgba(234, 179, 8, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(234, 179, 8, 0.2);
    color: #fbbf24;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .hint svg {
    flex-shrink: 0;
  }
  
  .hint img {
    flex-shrink: 0;
    filter: brightness(0) saturate(100%) invert(79%) sepia(61%) saturate(1000%) hue-rotate(359deg) brightness(102%) contrast(97%);
  }
  
  .demo-section {
    margin: 4rem 0;
  }
  
  .demo-section h2 {
    text-align: center;
    margin-bottom: 1rem;
    color: #e4e4e7;
    font-size: 2rem;
    font-weight: 700;
  }
  
  .demo-description {
    text-align: center;
    margin-bottom: 2rem;
    color: #a1a1aa;
  }
`,document.head.appendChild(i)}}return t(p,null,t(j,{children:()=>[`
  `,t("div",{class:"page"},[`
    `,t("div",{class:"hero"},[`
      `,t("img",{src:"/icons/logo.svg",alt:"Lumix",class:"hero-logo",width:"80",height:"80"}),`
      `,t("h1",null,["About"]),`
      `,t("p",{class:"subtitle"},["Server-Side Rendering in action"]),`
    `]),`
    
    `,t("div",{class:"info-card ssr"},[`
      `,t("div",{class:"card-icon"},[`
        `,t("img",{src:"/icons/monitor.svg",alt:"",width:"24",height:"24"}),`
      `]),`
      `,t("h2",null,["Server-Side Rendering (SSR)"]),`
      `,t("p",null,["This page is rendered on the server for every request, then hydrated on the client for interactivity."]),`
      `,t("ul",null,[`
        `,t("li",null,[`
          `,t("img",{src:"/icons/check.svg",alt:"",width:"16",height:"16"}),`
          Dynamic server-side data
        `]),`
        `,t("li",null,[`
          `,t("img",{src:"/icons/check.svg",alt:"",width:"16",height:"16"}),`
          Fresh content on every request
        `]),`
        `,t("li",null,[`
          `,t("img",{src:"/icons/check.svg",alt:"",width:"16",height:"16"}),`
          Client-side hydration
        `]),`
      `]),`
    `]),`
    
    `,t("div",{class:"server-info"},[`
      `,t("h3",null,["Server Information"]),`
      `,t("div",{class:"info-grid"},[`
        `,t("div",{class:"info-item"},[`
          `,t("div",{class:"info-label"},[`
            `,t("img",{src:"/icons/clock.svg",alt:"",width:"16",height:"16"}),`
            `,t("span",null,["Server Time"]),`
          `]),`
          `,t("span",{class:"info-value"},[()=>n]),`
        `]),`
        `,t("div",{class:"info-item"},[`
          `,t("div",{class:"info-label"},[`
            `,t("img",{src:"/icons/box.svg",alt:"",width:"16",height:"16"}),`
            `,t("span",null,["Rendering Mode"]),`
          `]),`
          `,t("span",{class:"info-value"},["SSR (Dynamic)"]),`
        `]),`
      `]),`
      `,t("div",{class:"hint"},[`
        `,t("img",{src:"/icons/help-circle.svg",alt:"",width:"16",height:"16"}),`
        `,t("span",null,["Reload this page to see the timestamp update"]),`
      `]),`
    `]),`
    
    `,t("div",{class:"demo-section"},[`
      `,t("h2",null,["Client-Side Interactivity"]),`
      `,t("p",{class:"demo-description"},["Even though this page is server-rendered, it's fully interactive on the client:"]),`
      `,t(B,{initialCount:10,label:"SSR Counter"}),`
    `]),`
  `]),`
`]}),`

`)}const h=document.getElementById("app");h&&R(h,M);

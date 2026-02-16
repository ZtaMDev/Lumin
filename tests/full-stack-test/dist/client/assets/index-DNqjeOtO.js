let u=null;function b(e){e.cleanup&&e.cleanup();for(const r of e.deps)r.delete(e);e.deps.clear();const n=u;u=e;try{e.cleanup=e.execute()}finally{u=n}}function C(e){for(const n of[...e])b(n)}function E(e){let n=e;const r=new Set;function o(i){if(arguments.length===0)return u&&(r.add(u),u.deps.add(r)),n;{const a=i;return Object.is(n,a)||(n=a,C(r)),n}}return Object.defineProperty(o,"value",{get(){return o()},set(i){o(i)},enumerable:!0}),o._subscribe=i=>{const a={execute:()=>i(n),deps:new Set,cleanup:void 0};return r.add(a),()=>{r.delete(a);for(const s of a.deps)s.delete(a)}},o._peek=()=>n,o}function f(e){const n={execute:e,deps:new Set,cleanup:void 0};return b(n),()=>{n.cleanup&&n.cleanup();for(const r of n.deps)r.delete(n);n.deps.clear()}}function m(e,n,r,o,i){f(()=>{const a=n();e[r]=a}),e.addEventListener(o,()=>{const a=e[r];n(a)})}function S(e,n){const o=e.tagName.toLowerCase()==="select"?"change":"input";m(e,n,"value",o)}function N(e,n){m(e,n,"checked","change")}function L(e,n){f(()=>{e.value=String(n())}),e.addEventListener("input",()=>{const r=e.valueAsNumber;Number.isNaN(r)||n(r)})}function A(e,n){f(()=>{e.checked=e.value===n()}),e.addEventListener("change",()=>{e.checked&&n(e.value)})}function I(e,n){const r=e;f(()=>{const o=n();for(const i of Array.from(r.options))i.selected=o.includes(i.value)}),r.addEventListener("change",()=>{const o=[];for(const i of Array.from(r.selectedOptions))o.push(i.value);n(o)})}function z(e,n,r){const o=e.tagName.toLowerCase(),i=e.type?.toLowerCase()||"";switch(n){case"value":o==="input"&&(i==="number"||i==="range")?L(e,r):S(e,r);break;case"checked":N(e,r);break;case"group":A(e,r);break;case"selected":I(e,r);break;default:m(e,r,n,"input");break}}function B(e){const n={mount:[],destroy:[]};return{result:e(),...n}}function v(e){for(const n of e)try{n()}catch(r){console.error("Error in hook:",r)}}function t(e,n,...r){if(typeof e=="function"){const{result:i,mount:a,destroy:s}=B(()=>e(n||{},...r)),d=Array.isArray(i)?i:[i];for(const l of d)l instanceof HTMLElement&&(a.length>0&&setTimeout(()=>v(a),0),s.length>0&&(l._luminDestroy=s));return i}const o=document.createElement(e);if(n)for(const[i,a]of Object.entries(n)){if(i.startsWith("bind:")){const s=i.slice(5);typeof a=="function"&&"_peek"in a&&z(o,s,a);continue}if(i.startsWith("on")&&typeof a=="function"){const s=i.slice(2).toLowerCase();o.addEventListener(s,a)}else typeof a=="function"?f(()=>{const s=a();i==="value"||i==="checked"||i==="disabled"||i==="selected"?o[i]=s:typeof s=="boolean"?s?o.setAttribute(i,""):o.removeAttribute(i):o.setAttribute(i,String(s))}):o.setAttribute(i,String(a))}for(const i of r.flat(1/0))if(i!=null)if(typeof i=="function"){const a=document.createComment("cf-start"),s=document.createComment("cf-end");o.appendChild(a),o.appendChild(s);let d=[];f(()=>{let l=i(),g=[];const x=Array.isArray(l)?l.flat(1/0):[l];for(let c of x)if(c!=null){for(;typeof c=="function";)c=c();if(c instanceof Node)g.push(c);else{const w=c==null?"":String(c);g.push(document.createTextNode(w))}}const k=new Set(g);for(const c of d)k.has(c)||(y(c),c.parentNode===o&&o.removeChild(c));for(const c of g)o.insertBefore(c,s);d=g})}else if(i instanceof Node)o.appendChild(i);else{const a=i==null?"":String(i);o.appendChild(document.createTextNode(a))}return o}function p(e,...n){return n.flat(1/0)}function y(e){if(e instanceof HTMLElement){const n=e._luminDestroy;n&&v(n)}e.childNodes.forEach(y)}function R(e,n,r){for(;e.firstChild;)e.removeChild(e.firstChild);const o=t(n,{}),i=Array.isArray(o)?o:[o];for(const a of i)a!=null&&(a instanceof Node?e.appendChild(a):e.appendChild(document.createTextNode(String(a))))}function j(e={}){if(typeof document<"u"){const n="lumix-style-mainlayout";if(!document.getElementById(n)){const r=document.createElement("style");r.id=n,r.textContent=`
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
`,document.head.appendChild(r)}}return t(p,null,t("div",{class:"layout"},[`
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

`)}function T(e={}){let{initialCount:n=0,label:r="Count"}=e;const o=E(n);function i(){o(o()+1)}function a(){o(o()-1)}function s(){o(n)}if(typeof document<"u"){const d="lumix-style-counter";if(!document.getElementById(d)){const l=document.createElement("style");l.id=d,l.textContent=`
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
  `,t("h3",null,[()=>r]),`
  `,t("div",{class:"display"},[()=>o()]),`
  `,t("div",{class:"buttons"},[`
    `,t("button",{onclick:a,class:"btn btn-secondary"},["-"]),`
    `,t("button",{onclick:s,class:"btn btn-secondary"},["Reset"]),`
    `,t("button",{onclick:i,class:"btn btn-primary"},["+"]),`
  `]),`
`]),`

`)}function _(e={}){"use prerender";if(typeof document<"u"){const n="lumix-style-index";if(!document.getElementById(n)){const r=document.createElement("style");r.id=n,r.textContent=`
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
    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
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
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 16px;
    padding: 2rem;
    margin: 3rem 0;
    backdrop-filter: blur(12px);
  }
  
  .card-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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
    color: #8b5cf6;
    flex-shrink: 0;
  }
  
  .info-card li img {
    flex-shrink: 0;
    filter: brightness(0) saturate(100%) invert(52%) sepia(98%) saturate(3283%) hue-rotate(242deg) brightness(96%) contrast(91%);
  }
  
  .demo-section {
    margin: 4rem 0;
  }
  
  .demo-section h2 {
    text-align: center;
    margin-bottom: 2rem;
    color: #e4e4e7;
    font-size: 2rem;
    font-weight: 700;
  }
  
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin: 4rem 0;
  }
  
  .feature {
    background: rgba(24, 24, 27, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2rem;
    transition: all 0.3s;
  }
  
  .feature:hover {
    transform: translateY(-4px);
    border-color: rgba(139, 92, 246, 0.3);
    box-shadow: 0 12px 24px rgba(139, 92, 246, 0.1);
  }
  
  .feature-icon {
    width: 48px;
    height: 48px;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
  }
  
  .feature-icon svg {
    color: #8b5cf6;
  }
  
  .feature-icon img {
    display: block;
    filter: brightness(0) saturate(100%) invert(52%) sepia(98%) saturate(3283%) hue-rotate(242deg) brightness(96%) contrast(91%);
  }
  
  .feature h3 {
    margin: 0 0 0.75rem 0;
    color: #e4e4e7;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .feature p {
    margin: 0;
    color: #a1a1aa;
    line-height: 1.6;
  }
  
  [slot="footer"] a {
    color: #8b5cf6;
    text-decoration: none;
    font-weight: 500;
  }
  
  [slot="footer"] a:hover {
    text-decoration: underline;
  }
`,document.head.appendChild(r)}}return t(p,null,t(j,{children:()=>[`
  `,t("div",{class:"page"},[`
    `,t("div",{class:"hero"},[`
      `,t("img",{src:"/icons/logo.svg",alt:"Lumix",class:"hero-logo",width:"80",height:"80"}),`
      `,t("h1",null,["Welcome to Lumix"]),`
      `,t("p",{class:"subtitle"},["A high-performance web framework with Progressive Instant Rendering"]),`
    `]),`
    
    `,t("div",{class:"info-card"},[`
      `,t("div",{class:"card-icon"},[`
        `,t("img",{src:"/icons/activity.svg",alt:"",width:"24",height:"24"}),`
      `]),`
      `,t("h2",null,["Progressive Instant Rendering (PIR)"]),`
      `,t("p",null,["This page is prerendered at build time for instant loads and perfect SEO, then fully hydrated on the client for complete interactivity."]),`
      `,t("ul",null,[`
        `,t("li",null,[`
          `,t("img",{src:"/icons/check.svg",alt:"",width:"16",height:"16"}),`
          Instant page loads
        `]),`
        `,t("li",null,[`
          `,t("img",{src:"/icons/check.svg",alt:"",width:"16",height:"16"}),`
          Perfect SEO
        `]),`
        `,t("li",null,[`
          `,t("img",{src:"/icons/check.svg",alt:"",width:"16",height:"16"}),`
          Full client-side interactivity
        `]),`
      `]),`
    `]),`
    
    `,t("div",{class:"demo-section"},[`
      `,t("h2",null,["Interactive Component Demo"]),`
      `,t(T,{initialCount:0,label:"Click Counter"}),`
    `]),`
    
    `,t("div",{class:"features"},[`
      `,t("div",{class:"feature"},[`
        `,t("div",{class:"feature-icon"},[`
          `,t("img",{src:"/icons/zap.svg",alt:"",width:"24",height:"24"}),`
        `]),`
        `,t("h3",null,["Fast"]),`
        `,t("p",null,["Native Rust compiler for near-instant builds"]),`
      `]),`
      `,t("div",{class:"feature"},[`
        `,t("div",{class:"feature-icon"},[`
          `,t("img",{src:"/icons/smile.svg",alt:"",width:"24",height:"24"}),`
        `]),`
        `,t("h3",null,["Reactive"]),`
        `,t("p",null,["Fine-grained reactivity with signals"]),`
      `]),`
      `,t("div",{class:"feature"},[`
        `,t("div",{class:"feature-icon"},[`
          `,t("img",{src:"/icons/settings.svg",alt:"",width:"24",height:"24"}),`
        `]),`
        `,t("h3",null,["Flexible"]),`
        `,t("p",null,["PIR, SSR, and SSG rendering modes"]),`
      `]),`
    `]),`
  `]),`
  
  `,`
`],slots:{footer:()=>[t("div",{},[`
    `,t("p",null,["Built with Lumix • ",t("a",{href:"https://github.com/ZtaMDev/Lumix",target:"_blank"},["GitHub"])]),`
  `])]}}),`

`)}const h=document.getElementById("app");h&&R(h,_);

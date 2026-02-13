(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))o(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const i of t.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function c(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function o(e){if(e.ep)return;e.ep=!0;const t=c(e);fetch(e.href,t)}})();let l=null;function d(r){l=r,r(),l=null}function f(r){let n=r;const c=new Set;function o(e){return arguments.length===0?(l&&c.add(l),n):(n=e,c.forEach(t=>t(n)),n)}return Object.defineProperty(o,"value",{get(){return o()},enumerable:!0}),o._subscribe=e=>(c.add(e),()=>c.delete(e)),o}function s(r,n,...c){if(typeof r=="function")return r(n||{},...c);const o=document.createElement(r);if(n)for(const[e,t]of Object.entries(n))if(e.startsWith("on")&&typeof t=="function"){const i=e.slice(2).toLowerCase();o.addEventListener(i,t)}else typeof t=="function"?d(()=>{const i=t();typeof i=="boolean"?i?o.setAttribute(e,""):o.removeAttribute(e):o.setAttribute(e,String(i))}):o.setAttribute(e,String(t));for(const e of c.flat())if(e!=null)if(typeof e=="function"){const t=document.createTextNode("");o.appendChild(t),d(()=>{const i=e();t.textContent=String(i)})}else e instanceof HTMLElement||e instanceof Node?o.appendChild(e):o.appendChild(document.createTextNode(String(e)));return o}function p(r,n,c){for(;r.firstChild;)r.removeChild(r.firstChild);r.appendChild(n(c))}function m(r={}){const n=f(0),c=()=>n(n()+1),o=()=>n(n()-1),e="Styled Counter",t=f("blue");if(typeof document<"u"){const i="lumin-styles";if(!document.getElementById(i)){const u=document.createElement("style");u.id=i,u.textContent=`
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
`,document.head.appendChild(u)}}return s("div",{class:"counter"},[`
  `,s("h1",null,[()=>e]),`
  `,s("div",{class:"display",style:()=>"color: "+t()},[`
    Count: `,()=>n(),`
  `]),`
  `,s("button",{onClick:c},["Increment"]),`
  `,s("button",{onClick:o},["Decrement"]),`
  `,s("button",{onClick:()=>t(t()==="blue"?"red":"blue")},[`
    Toggle Color
  `]),`
`])}function y(r={}){return s("div",null,[`
  `,s(m,null),`
`])}const a=document.getElementById("app");a&&p(a,y);

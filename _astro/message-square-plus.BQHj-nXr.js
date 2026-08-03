import{r as o}from"./index.CVf8TyFT.js";/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const p=(...t)=>t.filter((e,r,a)=>!!e&&e.trim()!==""&&a.indexOf(e)===r).join(" ").trim();/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const b=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const C=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,r,a)=>a?a.toUpperCase():r.toLowerCase());/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const u=t=>{const e=C(t);return e.charAt(0).toUpperCase()+e.slice(1)};/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/var d={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const W=t=>{for(const e in t)if(e.startsWith("aria-")||e==="role"||e==="title")return!0;return!1},v=o.createContext({}),x=()=>o.useContext(v),A=o.forwardRef(({color:t,size:e,strokeWidth:r,absoluteStrokeWidth:a,className:n="",children:s,iconNode:m,...h},k)=>{const{size:c=24,strokeWidth:l=2,absoluteStrokeWidth:f=!1,color:w="currentColor",className:y=""}=x()??{},g=a??f?Number(r??l)*24/Number(e??c):r??l;return o.createElement("svg",{ref:k,...d,width:e??c??d.width,height:e??c??d.height,stroke:t??w,strokeWidth:g,className:p("lucide",y,n),...!s&&!W(h)&&{"aria-hidden":"true"},...h},[...m.map(([N,M])=>o.createElement(N,M)),...Array.isArray(s)?s:[s]])});/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const i=(t,e)=>{const r=o.forwardRef(({className:a,...n},s)=>o.createElement(A,{ref:s,iconNode:e,className:p(`lucide-${b(u(t))}`,`lucide-${t}`,a),...n}));return r.displayName=u(t),r};/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const z=[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],L=i("loader-circle",z);/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const H=[["path",{d:"m10 17 5-5-5-5",key:"1bsop3"}],["path",{d:"M15 12H3",key:"6jk70r"}],["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}]],$=i("log-in",H);/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const j=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],E=i("log-out",j);/**
* @license lucide-react v1.28.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const S=[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}],["path",{d:"M12 8v6",key:"1ib9pf"}],["path",{d:"M9 11h6",key:"1fldmi"}]],R=i("message-square-plus",S);export{L,R as M,$ as a,E as b,i as c};

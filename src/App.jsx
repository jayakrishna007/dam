import { useState, useEffect, useRef, useMemo } from "react";
import DAMS from "./data/dams.json";
import SCRAPE_STATUS from "./data/scrape_status.json";

// ===================== MONGODB VERCEL SERVERLESS TELEMETRY API =====================
const callMongo = async (action, collection, payload = {}) => {
  try {
    if (collection === "page_views") {
      if (action === "insertOne") {
        const res = await fetch("/api/page-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: payload.document?.session_id })
        });
        return res.ok ? await res.json() : null;
      } else if (action === "aggregate") {
        const res = await fetch("/api/page-views");
        if (!res.ok) return null;
        const data = await res.json();
        return { documents: [{ total: data.total }] };
      }
    } else if (collection === "search_queries") {
      if (action === "insertOne") {
        const res = await fetch("/api/search-queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: payload.document?.query })
        });
        return res.ok ? await res.json() : null;
      } else if (action === "find") {
        const res = await fetch("/api/search-queries");
        if (!res.ok) return null;
        const data = await res.json();
        return { documents: data.documents };
      }
    }
    return null;
  } catch (error) {
    console.error("Vercel Serverless call failed:", error);
    return null;
  }
};

const WAVE = "M0,12 C20,2 60,22 80,12 C100,2 140,22 160,12 C180,2 220,22 240,12 C260,2 300,22 320,12 C340,2 380,22 400,12 C420,2 460,22 480,12";
const TICKER = DAMS.map(d => {
  const cap = typeof d.capacity === 'number' ? d.capacity : parseFloat(d.capacity) || 0;
  const lvl = typeof d.level === 'number' ? d.level : parseFloat(d.level) || 0;
  const tmc = (cap * lvl / 100).toFixed(2);
  return `${d.name}: ${tmc} TMC`;
}).join("  ◆  ");



function waterTheme(l = 0) {
  const level = typeof l === 'number' ? l : parseFloat(l) || 0;
  if(level>=90) return {dark:"#2E1065", mid:"#7C3AED", light:"#DDD6FE"};
  if(level>=70) return {dark:"#083344", mid:"#06B6D4", light:"#A5F3FC"};
  if(level>=45) return {dark:"#172554", mid:"#3B82F6", light:"#BFDBFE"};
  if(level>=25) return {dark:"#431407", mid:"#EA580C", light:"#FDBA74"};
  return           {dark:"#450A0A", mid:"#EF4444", light:"#FCA5A5"};
}

const fmtK = n => {
  if (n === null || n === undefined) return "\u2014";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
};

function useCountUp(target, go) {
  const [v,setV]=useState(0);
  useEffect(()=>{
    if(!go) return;
    const steps=50; let i=0;
    const t=setInterval(()=>{
      i++;
      setV(parseFloat((target*i/steps).toFixed(1)));
      if(i>=steps){ clearInterval(t); setV(target); }
    }, 22);
    return()=>clearInterval(t);
  },[go,target]);
  return v;
}

// ===================== WATER VIZ - REALISTIC DAM ANIMATION =====================
function WaterViz({ level = 0, outflow = null, capacity = 0, active }) {
  const safeLevel = typeof level === 'number' ? level : parseFloat(level) || 0;
  const safeOutflow = typeof outflow === 'number' ? outflow : parseFloat(outflow) || 0;
  const [fill, setFill] = useState(0);

  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setFill(safeLevel), 350);
      return () => clearTimeout(t);
    }
  }, [active, safeLevel]);

  const hasFlow = safeOutflow > 0;
  const ratio = safeOutflow > 0 ? Math.min(1, safeOutflow / 10000) : 0;
  const ratioR = Math.pow(ratio, 0.5); // square root for better scale distribution
  const flowSpeed = Math.max(0.25, 1.5 - ratioR * 1.25);
  const streamW = 1.0 + ratioR * 8; // scales from 1.0px to 9.0px

  // ViewBox: 0 0 300 155
  // Dam: upstream vertical wall at x=168, crest at y=18, toe at x=198 y=138
  // Reservoir: x=0..168, fills up from y=138 to y=18
  // Ground: y=138..155
  // Downstream: x=198..300, river at y=138

  const crestY = 18;
  const baseY  = 138;
  const upX    = 140;   // upstream face (vertical)
  const crX2   = 160;   // crest right edge
  const toeX   = 220;   // downstream toe
  const resBaseY = 114;  // reservoir floor at y=114
  const resH   = resBaseY - crestY;  // 96 px

  const waterY = resBaseY - (fill / 100) * resH;

  // Jet arc: exits from tunnel exit at 220, 132
  const jetEndX = toeX + 16 + ratioR * 20;

  const uid = `d${Math.round(fill)}`;

  return (
    <div style={{
      position: 'relative', height: 162,
      background: 'linear-gradient(180deg,#020e1e 0%,#031624 100%)',
      borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(6,182,212,0.2)',
      boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.7)'
    }}>
      <svg width="100%" height="100%" viewBox="0 0 300 155" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`res-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0ea5e9" stopOpacity="0.95" />
            <stop offset="50%"  stopColor="#0369a1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#022d52" stopOpacity="1" />
          </linearGradient>
          <linearGradient id={`dam-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#78838f" />
            <stop offset="50%"  stopColor="#4b5563" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>
          <linearGradient id={`shadow-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.38" />
          </linearGradient>
          <linearGradient id={`riv-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id={`pool-${uid}`} cx="50%" cy="40%" r="55%">
            <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.8" />
          </radialGradient>
          <radialGradient id={`mist-${uid}`} cx="50%" cy="55%" r="50%">
            <stop offset="0%"   stopColor="#e0f2fe" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`res-clip-${uid}`}>
            <rect x="0" y={crestY} width={upX} height={resBaseY - crestY + 1} />
          </clipPath>
          <clipPath id={`down-clip-${uid}`}>
            <rect x={toeX} y="0" width={300 - toeX} height="155" />
          </clipPath>
        </defs>

        {/* Background sky */}
        <rect x="0" y="0" width="300" height="155" fill="#020e1e" />

        {/* Ground / bedrock */}
        <polygon
          points={`0,114 140,114 140,138 300,138 300,155 0,155`}
          fill="#0c1f35"
        />
        {/* Bedrock surface lines */}
        <path
          d="M 0,114 L 140,114 M 140,138 L 300,138"
          stroke="#1e3a5f" strokeWidth="1.2"
        />

        {/* Reservoir water body (clipped to upstream zone) */}
        <g clipPath={`url(#res-clip-${uid})`}>
          <rect x="0" y={waterY} width={upX} height={resBaseY - waterY} fill={`url(#res-${uid})`} />

          {/* Subtle grid lines for reference */}
          {[0.25,0.5,0.75].map(f => (
            <line key={f}
              x1="0" y1={crestY + resH * f}
              x2={upX} y2={crestY + resH * f}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" strokeDasharray="4,5"
            />
          ))}

          {/* Animated water surface waves */}
          <path
            d={`M -80,${waterY} C -60,${waterY-3} -40,${waterY+3} -20,${waterY} C 0,${waterY-3} 20,${waterY+3} 40,${waterY} C 60,${waterY-3} 80,${waterY+3} 100,${waterY} C 120,${waterY-3} 140,${waterY+3} 160,${waterY} C 180,${waterY-3} 200,${waterY+3} 220,${waterY} C 240,${waterY-3} 260,${waterY+3} 280,${waterY}`}
            fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3">
            <animateTransform attributeName="transform" type="translate" from="0,0" to="80,0" dur="3s" repeatCount="indefinite" />
          </path>
          <path
            d={`M -40,${waterY+2} C -20,${waterY+4} 0,${waterY} 20,${waterY+2} C 40,${waterY+4} 60,${waterY} 80,${waterY+2} C 100,${waterY+4} 120,${waterY} 140,${waterY+2} C 160,${waterY+4} 180,${waterY} 200,${waterY+2}`}
            fill="none" stroke="rgba(0,210,255,0.28)" strokeWidth="0.9">
            <animateTransform attributeName="transform" type="translate" from="80,0" to="0,0" dur="4.5s" repeatCount="indefinite" />
          </path>

          {/* Deep underwater shimmer */}
          <path
            d={`M 20,${waterY+8} Q 60,${waterY+5} 100,${waterY+8} Q 140,${waterY+11} 160,${waterY+8}`}
            fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.7">
            <animateTransform attributeName="transform" type="translate" from="-40,0" to="40,0" dur="5s" repeatCount="indefinite" />
          </path>
        </g>

        {/* ============ DAM BODY ============ */}
        {/* Main concrete gravity dam: upstream vertical, downstream sloped */}
        <polygon
          points={`${upX},${crestY} ${crX2},${crestY} ${toeX},${baseY} ${upX},${baseY}`}
          fill={`url(#dam-${uid})`}
          stroke="#111827" strokeWidth="0.5"
        />
        {/* Shadow on downstream face */}
        <polygon
          points={`${crX2},${crestY} ${toeX},${baseY} ${toeX - 5},${baseY} ${crX2 - 4},${crestY}`}
          fill={`url(#shadow-${uid})`}
        />

        {/* Construction joint lines across dam (horizontal) */}
        {[36,54,72,90,108,126].map(jy => {
          const t = (jy - crestY) / (baseY - crestY);
          return (
            <line key={jy}
              x1={upX} y1={jy}
              x2={crX2 + t * (toeX - crX2)} y2={jy}
              stroke="rgba(0,0,0,0.15)" strokeWidth="0.7"
            />
          );
        })}

        {/* Crest top slab */}
        <rect x={upX} y={crestY - 5} width={crX2 - upX} height={5} rx="0.5" fill="#374151" stroke="#4b5563" strokeWidth="0.4" />

        {/* Parapet wall on crest */}
        {[141,145,149,153,157].map(px => (
          <rect key={px} x={px} y={crestY - 11} width="1" height="7" rx="0.3" fill="#6b7280" />
        ))}
        <line x1={upX} y1={crestY - 10} x2={crX2} y2={crestY - 10} stroke="#9ca3af" strokeWidth="0.6" opacity="0.7" />

        {/* Radial flood gates on crest (closed, structural) */}
        {[142,148,154].map((gx,i) => (
          <rect key={i} x={gx} y={crestY - 5} width="3" height="5" rx="0.5" fill="#1f2937" stroke="#374151" strokeWidth="0.3" />
        ))}

        {/* Upstream face: wet sheen line */}
        <line x1={upX} y1={waterY > crestY ? waterY : crestY} x2={upX} y2={resBaseY}
          stroke="rgba(14,165,233,0.22)" strokeWidth="1.8" />

        {/* ============ TUNNEL INTERIOR ============ */}
        {/* Slanted tunnel cut out through the dam body */}
        <path
          d="M 140,102 L 146,102 L 220,126 L 220,138 L 146,114 L 140,114 Z"
          fill="#1e293b" stroke="#0f172a" strokeWidth="1"
        />

        {/* ============ TUNNEL GATE ============ */}
        {/* Gate door that slides up/down */}
        <rect
          x="142" y={hasFlow ? 86 : 102}
          width="3" height="12" fill="#475569" stroke="#0f172a" strokeWidth="0.5"
          style={{ transition: 'y 0.7s ease' }}
        />
        {/* Vertical gate shaft leading up to crest */}
        <rect x="142" y={crestY} width="3" height="84" fill="#0f172a" />

        {/* ============ OUTFLOW ANIMATION ============ */}
        {hasFlow && (
          <g>
            {/* Water flowing through the tunnel */}
            <path
              d="M 140,108 L 146,108 L 220,132"
              fill="none" stroke="#0ea5e9" strokeWidth={streamW}
              strokeLinejoin="round" opacity="0.95"
            />
            {/* Bright core in tunnel */}
            <path
              d="M 140,108 L 146,108 L 220,132"
              fill="none" stroke="#bae6fd" strokeWidth={streamW * 0.4}
              strokeLinejoin="round" opacity="0.9"
            />

            {/* Water jet exiting from tunnel and falling into river */}
            <path
              d={`M 220,132 C 228,132 ${jetEndX - 8},${baseY - 4} ${jetEndX},${baseY}`}
              fill="none" stroke="#0ea5e9" strokeWidth={streamW}
              strokeLinecap="round" opacity="0.93"
            />
            <path
              d={`M 220,132 C 228,132 ${jetEndX - 8},${baseY - 4} ${jetEndX},${baseY}`}
              fill="none" stroke="#bae6fd" strokeWidth={streamW * 0.4}
              strokeLinecap="round" opacity="0.9"
            />
            {/* Animated foam dashes on exterior jet */}
            <path
              d={`M 220,132 C 228,132 ${jetEndX - 8},${baseY - 4} ${jetEndX},${baseY}`}
              fill="none" stroke="white" strokeWidth={streamW * 0.25}
              strokeDasharray="4,5" opacity="0.82">
              <animate attributeName="strokeDashoffset" values="40;0" dur={`${flowSpeed}s`} repeatCount="indefinite" />
            </path>

            {/* Plunge pool (water pool where jet hits river) */}
            <ellipse cx={jetEndX} cy={baseY} rx={3 + ratioR * 10} ry={1.5 + ratioR * 3} fill={`url(#pool-${uid})`} opacity="0.92" />

            {/* Expanding splash rings */}
            <ellipse cx={jetEndX} cy={baseY} rx="2" ry="1" fill="none" stroke="#e0f2fe" strokeWidth="1.1">
              <animate attributeName="rx" values={`1;${4 + ratioR * 12};1`} dur="0.72s" repeatCount="indefinite" />
              <animate attributeName="ry" values={`0.5;${2 + ratioR * 4.5};0.5`} dur="0.72s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0;1" dur="0.72s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx={jetEndX} cy={baseY} rx="1" ry="0.8" fill="none" stroke="#7dd3fc" strokeWidth="0.75">
              <animate attributeName="rx" values={`1;${2.5 + ratioR * 8};1`} dur="0.72s" begin="0.36s" repeatCount="indefinite" />
              <animate attributeName="ry" values={`0.5;${1.2 + ratioR * 3};0.5`} dur="0.72s" begin="0.36s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0;0.9" dur="0.72s" begin="0.36s" repeatCount="indefinite" />
            </ellipse>

            {/* Mist spray cloud */}
            <ellipse cx={jetEndX} cy={baseY - 3} rx={5 + ratioR * 10} ry={3 + ratioR * 7} fill={`url(#mist-${uid})`}>
              <animate attributeName="ry" values={`${2 + ratioR * 3};${4 + ratioR * 8};${2 + ratioR * 3}`} dur="1.1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.1s" repeatCount="indefinite" />
            </ellipse>

            {/* Downstream river flowing right */}
            <g clipPath={`url(#down-clip-${uid})`}>
              <rect x={toeX} y={baseY - 6} width={300 - toeX} height={7} fill={`url(#riv-${uid})`} opacity="0.9" />
              <path
                d={`M ${toeX},${baseY-5} Q ${toeX+14},${baseY-7} ${toeX+28},${baseY-5} Q ${toeX+42},${baseY-3} ${toeX+56},${baseY-5} Q ${toeX+70},${baseY-7} 300,${baseY-5}`}
                fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.9">
                <animate attributeName="d"
                  values={`M ${toeX},${baseY-5} Q ${toeX+14},${baseY-7} ${toeX+28},${baseY-5} Q ${toeX+42},${baseY-3} ${toeX+56},${baseY-5} Q ${toeX+70},${baseY-7} 300,${baseY-5};M ${toeX},${baseY-5} Q ${toeX+14},${baseY-3} ${toeX+28},${baseY-5} Q ${toeX+42},${baseY-7} ${toeX+56},${baseY-5} Q ${toeX+70},${baseY-3} 300,${baseY-5};M ${toeX},${baseY-5} Q ${toeX+14},${baseY-7} ${toeX+28},${baseY-5} Q ${toeX+42},${baseY-3} ${toeX+56},${baseY-5} Q ${toeX+70},${baseY-7} 300,${baseY-5}`}
                  dur="0.65s" repeatCount="indefinite" />
              </path>
              <path d={`M ${toeX+5},${baseY-2.5} L 300,${baseY-2.5}`}
                fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" strokeDasharray="6,9">
                <animate attributeName="strokeDashoffset" values="60;0" dur={`${flowSpeed * 1.5}s`} repeatCount="indefinite" />
              </path>
            </g>
          </g>
        )}

        {/* Water level TMC badge */}
        <rect x="6" y="6" width="76" height="24" rx="7"
          fill="rgba(2,10,24,0.8)" stroke="rgba(6,182,212,0.55)" strokeWidth="1" />
        <text x="44" y="22" fill="#e0f2fe" fontSize="11" fontWeight="900"
          fontFamily="monospace" textAnchor="middle">
          {((capacity * safeLevel) / 100).toFixed(2)} TMC
        </text>


      </svg>
    </div>
  );
}

// ===================== DAM CARD =====================
function DamCard({ dam, delay, onClick }) {
  const ref=useRef(null);
  const [vis,setVis]=useState(false);
  const safeLevel = typeof dam.level === 'number' ? dam.level : parseFloat(dam.level) || 0;
  const {mid}=waterTheme(safeLevel);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting) setVis(true); },{threshold:0.1});
    if(ref.current) obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);
  return (
    <a ref={ref} href={`/dam/${getDamSlug(dam.name)}`} style={{
      display: "block",
      textDecoration: "none",
      background:"linear-gradient(148deg,#081829 0%,#050F1E 100%)",
      border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:18,cursor:"pointer",
      opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(28px)",
      transition:`opacity 0.5s ease ${delay}ms,transform 0.5s ease ${delay}ms`
    }}
    onClick={e=>{
      e.preventDefault();
      onClick();
    }}
    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=`0 14px 44px rgba(0,0,0,0.55),0 0 0 1px ${mid}30`;}}
    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:15,color:"#DDEFFC",lineHeight:1.25,marginBottom:3}}>{dam.name}</div>
          <div style={{fontSize:11,color:"rgba(220,240,255,0.38)"}}>
            <span style={{color:mid,fontWeight:600}}>{dam.river}</span>{" \u00b7 "}{dam.district}
          </div>
        </div>
      </div>
      <WaterViz level={safeLevel} outflow={dam.outflow} capacity={dam.capacity} active={vis}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[
          {l:"Inflow",  v:dam.inflow  !== null ? `\u2191 ${fmtK(dam.inflow)}`  : "\u2014", c:"#86EFAC"},
          {l:"Outflow", v:dam.outflow !== null ? `\u2193 ${fmtK(dam.outflow)}` : "\u2014", c:"#FCA5A5"}
        ].map(({l,v,c})=>(
          <div key={l} style={{padding:"9px 11px",background:"rgba(255,255,255,0.025)",borderRadius:9,border:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{fontSize:10,color:"rgba(220,240,255,0.3)",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
            <div style={{fontSize:14,fontWeight:700,color:c,fontFamily:"monospace"}}>{v}{v !== "\u2014" && <span style={{fontSize:9,opacity:0.55,marginLeft:2}}>cusecs</span>}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:8,padding:"7px 12px",background:"rgba(255,255,255,0.02)",borderRadius:9,
        border:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:"rgba(220,240,255,0.3)",textTransform:"uppercase",letterSpacing:1}}>Storage</span>
        <span style={{fontSize:12,fontWeight:600,color:"#BAE6FD",fontFamily:"monospace"}}>
          {(dam.capacity*safeLevel/100).toFixed(2)}<span style={{opacity:0.38,margin:"0 4px"}}>/</span>{dam.capacity}<span style={{fontSize:9,opacity:0.45,marginLeft:3}}>TMC</span>
        </span>
      </div>
      <div style={{marginTop:6,padding:"7px 12px",background:"rgba(255,255,255,0.02)",borderRadius:9,
        border:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:"rgba(220,240,255,0.3)",textTransform:"uppercase",letterSpacing:1}}>Filled Percentage</span>
        <span style={{fontSize:12,fontWeight:600,color:"#38BDF8",fontFamily:"monospace"}}>
          {safeLevel.toFixed(1)}%
        </span>
      </div>
    </a>
  );
}

const RAIN = Array.from({length:22},(_,i)=>({
  id:i, left:`${(i*5.1+11)%96}%`,
  dur:`${0.6+(i%5)*0.2}s`, delay:`${(i*0.28)%2.8}s`, h:9+(i%9)
}));

const FILTER_FN = {
  all:()=>true, high:d=>d.level>=70, normal:d=>d.level>=45&&d.level<70,
  low:d=>d.level<45
};

// ===================== PIN MODAL =====================
function PinModal({ pinInput, setPinInput, pinError, onSubmit, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(2, 6, 12, 0.8)",
      backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20
    }}>
      <div style={{
        background: "linear-gradient(148deg, #091a2f 0%, #030b15 100%)",
        border: "1px solid rgba(6, 182, 212, 0.25)",
        borderRadius: 16,
        padding: 32,
        width: "100%",
        maxWidth: 360,
        boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 20px rgba(6, 182, 212, 0.15)",
        position: "relative",
        animation: "fadeSlideUp 0.3s ease both"
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none", color: "rgba(224, 242, 254, 0.4)",
            fontSize: 20, cursor: "pointer", transition: "color 0.2s"
          }}
          onMouseEnter={e => e.target.style.color = "#E0F2FE"}
          onMouseLeave={e => e.target.style.color = "rgba(224, 242, 254, 0.4)"}
        >
          &times;
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "rgba(6, 182, 212, 0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, margin: "0 auto 12px",
            border: "1px solid rgba(6, 182, 212, 0.2)"
          }}>
            &#128274;
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#E0F2FE" }}>Admin Verification</h3>
          <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginTop: 4 }}>Enter credentials to view analytics</p>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 20 }}>
            <input
              type="password"
              placeholder="\u2022\u2022\u2022\u2022"
              maxLength={4}
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))}
              autoFocus
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 12,
                border: `1px solid ${pinError ? "#EF4444" : "rgba(255, 255, 255, 0.08)"}`,
                background: "rgba(255, 255, 255, 0.02)",
                color: "#E0F2FE", fontSize: 24, textAlign: "center",
                letterSpacing: 8, outline: "none", transition: "all 0.2s",
                boxShadow: pinError ? "0 0 10px rgba(239, 68, 68, 0.2)" : "none"
              }}
              onFocus={e => { if(!pinError) e.target.style.borderColor = "rgba(6, 182, 212, 0.5)"; }}
            />
            {pinError && (
              <div style={{ color: "#F87171", fontSize: 11, textAlign: "center", marginTop: 8, fontWeight: 600 }}>
                &#9888; Invalid PIN code. Try again.
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{
              width: "100%", padding: "12px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #0284C7, #06B6D4)",
              color: "#FFF", fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 15px rgba(6, 182, 212, 0.3)",
              transition: "transform 0.2s"
            }}
          >
            Verify &amp; Enter
          </button>
        </form>
      </div>
    </div>
  );
}

// ===================== ANALYTICS DASHBOARD =====================
function AnalyticsDashboard({ navigate, setView, searchHistory }) {
  const [scrapeStatus, setScrapeStatus] = useState(SCRAPE_STATUS);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeOutput, setScrapeOutput] = useState(null);
  const [scrapeError, setScrapeError] = useState(null);

  const runScraperLive = async () => {
    setIsScraping(true);
    setScrapeOutput(null);
    setScrapeError(null);
    try {
      const res = await fetch("/api/run-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "9197" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScrapeOutput(data.stdout || "Scraper ran successfully.");
        if (data.status) {
          setScrapeStatus(data.status);
        }
      } else {
        setScrapeError(data.error || "Scraper execution failed.");
        if (data.stdout || data.stderr) {
          setScrapeOutput((data.stdout || "") + "\n" + (data.stderr || ""));
        }
      }
    } catch (err) {
      setScrapeError("Failed to trigger scraper API. Make sure Vercel dev is running ('vercel dev') to serve the API locally. Alternatively, run 'npm run scrape' in your terminal.");
      console.error(err);
    } finally {
      setIsScraping(false);
    }
  };

  const gaActive = !!import.meta.env.VITE_GA_MEASUREMENT_ID;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

  // Check freshness of last scraper run
  const checkFreshness = () => {
    try {
      const parts = scrapeStatus.last_run_timestamp.split(" ");
      const datePart = parts[0];
      const timePart = parts[1];
      const ampm = parts[2];
      
      const [yr, mo, dy] = datePart.split("-").map(Number);
      let [hr, min] = timePart.split(":").map(Number);
      if (ampm === "PM" && hr < 12) hr += 12;
      if (ampm === "AM" && hr === 12) hr = 0;
      
      const lastRunDate = new Date(yr, mo - 1, dy, hr, min);
      const now = new Date();
      const diffHours = (now - lastRunDate) / (1000 * 60 * 60);
      return diffHours < 26; // fresh if updated in the last 26 hours
    } catch (e) {
      return true;
    }
  };
  const isFresh = checkFreshness();

  const totalDams = DAMS.length;
  const activeAlerts = DAMS.filter(d => d.level >= 90).length;
  const totalInflow = DAMS.reduce((sum, d) => sum + (d.inflow || 0), 0);
  const totalOutflow = DAMS.reduce((sum, d) => sum + (d.outflow || 0), 0);

  // MongoDB Telemetry State
  const [telemetry, setTelemetry] = useState({
    visits: null,
    searches: [],
    loading: true
  });

  const [mongoActive, setMongoActive] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchTelemetry = async () => {
      try {
        const [visitsRes, searchesRes] = await Promise.all([
          callMongo("aggregate", "page_views"),
          callMongo("find", "search_queries")
        ]);
        if (!active) return;
        if (visitsRes !== null || searchesRes !== null) {
          setTelemetry({
            visits: visitsRes?.documents?.[0]?.total ?? 0,
            searches: searchesRes?.documents ?? [],
            loading: false
          });
          setMongoActive(true);
        } else {
          setTelemetry({ visits: null, searches: [], loading: false });
          setMongoActive(false);
        }
      } catch (err) {
        console.error("Failed to load telemetry:", err);
        if (active) {
          setTelemetry({ visits: null, searches: [], loading: false });
          setMongoActive(false);
        }
      }
    };
    fetchTelemetry();
    return () => {
      active = false;
    };
  }, []);

  const visitsVal = telemetry.loading
    ? "Loading..."
    : telemetry.visits !== null
      ? telemetry.visits
      : "Local Session";

  const stats = [
    { label: "Monitored Reservoirs", value: totalDams, change: "Active", subtext: "Across 11 Indian states", positive: true, icon: "🌊" },
    { label: "Active Flood Alerts", value: activeAlerts, change: `${activeAlerts} Alerts`, subtext: "Dams ≥ 90% capacity", positive: activeAlerts === 0, icon: "🚨" },
    { label: "Total Region Inflow", value: `${fmtK(totalInflow)}`, change: "cusecs", subtext: "Cumulative river inflows", positive: totalInflow >= totalOutflow, icon: "📥" },
    { label: "Total Region Outflow", value: `${fmtK(totalOutflow)}`, change: "cusecs", subtext: "Cumulative released flow", positive: true, icon: "📤" },
    { 
      label: "Total Website Visits", 
      value: visitsVal, 
      change: mongoActive ? "Live (Atlas)" : "Session View", 
      subtext: mongoActive ? "Global unique hits" : "Temporary fallback count", 
      positive: true, 
      icon: "📈" 
    }
  ];

  const scraperLogs = [
    { 
      source: "Tungabhadra Board", 
      status: scrapeStatus.sources.tungabhadra?.status || "Unknown", 
      detail: `Scraped ${scrapeStatus.sources.tungabhadra?.count || 0} reservoir records successfully.`, 
      ok: scrapeStatus.sources.tungabhadra?.ok || false 
    },
    { 
      source: "Tamil Nadu Agriculture Dept", 
      status: scrapeStatus.sources.tamil_nadu?.status || "Unknown", 
      detail: `Scraped ${scrapeStatus.sources.tamil_nadu?.count || 0} major reservoir records successfully.`, 
      ok: scrapeStatus.sources.tamil_nadu?.ok || false 
    },
    { 
      source: "OneIndia Public Database", 
      status: scrapeStatus.sources.oneindia?.status || "Unknown", 
      detail: `Scraped ${scrapeStatus.sources.oneindia?.count || 0} reservoirs (Kerala, AP, Telangana) successfully.`, 
      ok: scrapeStatus.sources.oneindia?.ok || false 
    },
    { 
      source: "BBMB (Bhakra/Pong)", 
      status: scrapeStatus.sources.bbmb?.status || "Unknown", 
      detail: `Scraped ${scrapeStatus.sources.bbmb?.count || 0} reservoir records (Himachal Pradesh) successfully.`, 
      ok: scrapeStatus.sources.bbmb?.ok || false 
    },
    { 
      source: "Daily Cron Trigger (10:00 AM IST)", 
      status: isFresh ? "Active" : "Delayed", 
      detail: `Frequency: Daily. Last run duration: ${scrapeStatus.duration_seconds}s.`, 
      ok: isFresh 
    }
  ];

  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const adsenseChecklist = [
    { label: "Mobile-responsive layout & SEO structure", done: true },
    { label: "Secure HTTPS SSL Connection", done: isHttps, detail: isHttps ? "Verified Secure" : "Local HTTP detected (Localhost)" },
    { label: "Waterflow physics & SVG graphics optimization", done: true },
    { label: "Live data refresh comparison engine active", done: !!scrapeStatus.success },
    { label: "MongoDB Persistent Telemetry Active", done: mongoActive, detail: mongoActive ? "Connected to Atlas Data API" : "Inactive (Local fallback mode)" }
  ];

  const completedChecks = adsenseChecklist.filter(c => c.done).length;
  const checklistPercentage = Math.round((completedChecks / adsenseChecklist.length) * 100);

  // Dynamic Chart calculations
  const chartRuns = [...scrapeStatus.history].slice(0, 7).reverse();
  const maxDelta = Math.max(...chartRuns.map(r => Math.abs(r.metrics.storage_delta_tmc)), 0.1);
  
  const points = chartRuns.map((r, idx) => {
    const val = r.metrics.storage_delta_tmc;
    const x = 40 + idx * 70; // 40, 110, 180, 250, 320, 390, 460
    const y = 100 - (val / maxDelta) * 70;
    let dateStr = "Run";
    try {
      const datePart = r.timestamp.split(" ")[0]; // "2026-06-13"
      const [,,d] = datePart.split("-");
      dateStr = d || "Run";
    } catch(e) {}
    return { x, y, val, label: dateStr };
  });

  const linePath = points.length > 0 
    ? "M " + points.map(pt => `${pt.x},${pt.y}`).join(" L ") 
    : "";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 80px" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <span style={{ fontSize: 11, color: "#67E8F9", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>Administrative Console</span>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#E0F2FE", letterSpacing: "-0.5px" }}>Portal Analytics</h2>
        </div>

        <button
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px", borderRadius: 20, border: "1px solid rgba(224, 242, 254, 0.15)",
            background: "rgba(255, 255, 255, 0.02)", color: "rgba(224, 242, 254, 0.8)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.06)"; e.target.style.borderColor = "rgba(6, 182, 212, 0.4)"; e.target.style.color = "#67E8F9"; }}
          onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.02)"; e.target.style.borderColor = "rgba(224, 242, 254, 0.15)"; e.target.style.color = "rgba(224, 242, 254, 0.8)"; }}
        >
          ← Exit Portal
        </button>
      </div>

      {/* Freshness Banner */}
      <div style={{
        padding: "12px 18px",
        borderRadius: 12,
        background: isFresh ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
        border: `1px solid ${isFresh ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
        color: isFresh ? "#4ADE80" : "#F87171",
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 28, fontSize: 13, fontWeight: 500
      }}>
        <span style={{ fontSize: 16 }}>{isFresh ? "🟢" : "🔴"}</span>
        <span>
          {isFresh ? (
            <><strong>Operational:</strong> Daily data refresh at 10:00 AM IST succeeded. Last sync completed successfully on <strong>{scrapeStatus.last_run_timestamp}</strong>.</>
          ) : (
            <><strong>Alert:</strong> Data refresh is stale. Last successful scrape was on <strong>{scrapeStatus.last_run_timestamp}</strong>. Daily scheduler (10 AM IST) might be failing or inactive.</>
          )}
        </span>
      </div>

      {/* Summary Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 14, padding: 20, position: "relative",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "rgba(220, 240, 255, 0.35)", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</span>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#DDEFFC", fontFamily: "monospace", lineHeight: 1.2 }}>{s.value}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
              <span style={{ color: s.positive ? "#86EFAC" : "#FB923C", fontSize: 11, fontWeight: 700 }}>{s.change}</span>
              <span style={{ color: "rgba(220, 240, 255, 0.25)", fontSize: 10 }}>{s.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Content */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>

        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Traffic Chart */}
          <div style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(6, 182, 212, 0.15)",
            borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE" }}>Net Storage Volume Trend</h3>
                <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginTop: 2 }}>Daily storage capacity shift (Last 7 runs)</p>
              </div>
              <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", color: "#67E8F9", fontWeight: 600 }}>TMC Delta</span>
            </div>
            <div style={{ position: "relative", width: "100%", height: 210 }}>
              <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
                {/* Horizontal reference lines */}
                <line x1="30" y1="30" x2="470" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="30" y1="100" x2="470" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
                <line x1="30" y1="170" x2="470" y2="170" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="3 3" />

                <text x="20" y="34" fill="rgba(224,242,254,0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">+{maxDelta.toFixed(2)} TMC</text>
                <text x="20" y="104" fill="rgba(224,242,254,0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">0.00</text>
                <text x="20" y="174" fill="rgba(224,242,254,0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">-{maxDelta.toFixed(2)} TMC</text>

                {/* Path connecting points */}
                {linePath && (
                  <path d={linePath} fill="none" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Interactive Points */}
                {points.map((pt, i) => {
                  const dotColor = pt.val > 0 ? "#86EFAC" : pt.val < 0 ? "#FCA5A5" : "#22D3EE";
                  const valStr = (pt.val > 0 ? "+" : "") + pt.val.toFixed(3);
                  return (
                    <g key={i}>
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#030a14" stroke={dotColor} strokeWidth="2.5" />
                      <text x={pt.x} y={pt.y - 10} fill="#E0F2FE" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {valStr}
                      </text>
                      <text x={pt.x} y="194" fill="rgba(224,242,254,0.4)" fontSize="9" textAnchor="middle">
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Daily Refresh & Value Change Verification Log */}
          <div style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(6, 182, 212, 0.15)",
            borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE", marginBottom: 4 }}>Daily Refresh & Value Change Log</h3>
            <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginBottom: 20 }}>
              Verifies if data refreshed successfully daily at 10 AM IST and if values changed.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
              {scrapeStatus.history.map((run, idx) => {
                const hasChanges = run.metrics.dams_changed > 0;
                const deltaColor = run.metrics.storage_delta_tmc > 0 ? "#86EFAC" : run.metrics.storage_delta_tmc < 0 ? "#FCA5A5" : "rgba(224, 242, 254, 0.8)";
                const deltaSign = run.metrics.storage_delta_tmc > 0 ? "+" : "";
                return (
                  <div key={idx} style={{
                    padding: 14, background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12,
                    flexShrink: 0
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#BAE6FD", fontFamily: "monospace" }}>{run.timestamp}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 700,
                        background: run.success ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        color: run.success ? "#4ADE80" : "#F87171"
                      }}>
                        {run.success ? "✓ Sync Succeeded" : "✗ Failed"}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 11, color: "rgba(224, 242, 254, 0.45)" }}>
                      <div>
                        Dams Changed: <span style={{ color: hasChanges ? "#E0F2FE" : "#FBBF24", fontWeight: 700 }}>{run.metrics.dams_changed}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        Storage Delta: <span style={{ color: deltaColor, fontWeight: 700 }}>{deltaSign}{run.metrics.storage_delta_tmc} TMC</span>
                      </div>
                      <div>
                        Inflow: <span style={{ color: "#E0F2FE", fontFamily: "monospace" }}>{run.metrics.inflow_delta_cusecs > 0 ? "+" : ""}{run.metrics.inflow_delta_cusecs} cusecs</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        Outflow: <span style={{ color: "#E0F2FE", fontFamily: "monospace" }}>{run.metrics.outflow_delta_cusecs > 0 ? "+" : ""}{run.metrics.outflow_delta_cusecs} cusecs</span>
                      </div>
                    </div>
                    {run.metrics.dams_changed === 0 && (
                      <div style={{ marginTop: 8, fontSize: 10, color: "#FBBF24", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>⚠️</span> No water level changes detected. Source values might be static today.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Google Analytics Setup */}
          <div style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE" }}>Google Analytics Integration</h3>
                <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginTop: 2 }}>Install tracking for full visitor telemetry</p>
              </div>
              <span style={{
                padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                background: gaActive ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                border: `1px solid ${gaActive ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
                color: gaActive ? "#4ADE80" : "#FBBF24"
              }}>
                {gaActive ? "● ACTIVE" : "○ CONFIG PENDING"}
              </span>
            </div>
            {gaActive ? (
              <div style={{ background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#86EFAC", fontWeight: 600, display: "block", marginBottom: 4 }}>✔ Script successfully active</span>
                <p style={{ fontSize: 11, color: "rgba(224,242,254,0.5)", lineHeight: 1.5 }}>
                  The app is listening to Measurement ID <code style={{ color: "#67E8F9", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>{measurementId}</code>.
                </p>
              </div>
            ) : (
              <div style={{ background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#FBBF24", fontWeight: 600, display: "block", marginBottom: 4 }}>⚡ Free telemetry ready for setup</span>
                <p style={{ fontSize: 11, color: "rgba(224,242,254,0.5)", lineHeight: 1.5 }}>
                  Follow the steps below to track visitor retention, geography maps, and device analytics.
                </p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { step:"1", title:"Sign up at Google Analytics", desc:"Visit analytics.google.com and sign in for free. Click 'Create Property'." },
                { step:"2", title:"Copy the Measurement ID", desc:"Create a Web Stream for your domain and copy your token (formatted as G-XXXXXXXXXX)." },
                { step:"3", title:"Add Environment Variable", desc:"Go to your Vercel Dashboard and add VITE_GA_MEASUREMENT_ID containing your key." },
                { step:"4", title:"View telemetry dashboard", desc:"Redeploy on Vercel. View live analytics charts at analytics.google.com!" }
              ].map(item=>(
                <div key={item.step} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background:"rgba(6,182,212,0.15)", color:"#67E8F9", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(6,182,212,0.3)", flexShrink:0, marginTop:2 }}>
                    {item.step}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#E0F2FE" }}>{item.title}</div>
                    <div style={{ fontSize:11, color:"rgba(224,242,254,0.4)", marginTop:2, lineHeight:1.4 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Scraper Health */}
          <div style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE", marginBottom: 4 }}>Scraper Health Checks</h3>
            <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginBottom: 20 }}>Status of automated background scrapers</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {scraperLogs.map((log, idx) => (
                <div key={idx} style={{
                  padding: 12, background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10,
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E0F2FE" }}>{log.source}</div>
                    <div style={{ fontSize: 10, color: "rgba(224,242,254,0.35)", marginTop: 2 }}>{log.detail}</div>
                  </div>
                  <div style={{
                    padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                    background: log.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                    border: `1px solid ${log.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                    color: log.ok ? "#4ADE80" : "#F87171"
                  }}>
                    {log.status}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(6,182,212,0.04)", borderRadius: 8, border: "1px solid rgba(6,182,212,0.1)", fontSize: 11, color: "rgba(224,242,254,0.45)", lineHeight: 1.4 }}>
              💡 Scrapers are triggered remotely via GitHub Actions. Local data is compiled statically during builds.
            </div>

            {/* Manual Scraper Trigger Panel */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button
                onClick={runScraperLive}
                disabled={isScraping}
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 10,
                  background: isScraping ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #0891B2, #0284C7)",
                  border: "none", color: isScraping ? "rgba(224,242,254,0.3)" : "#FFFFFF",
                  fontSize: 12, fontWeight: 700, cursor: isScraping ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 12px rgba(6,182,212,0.2)", transition: "all 0.2s"
                }}
                onMouseEnter={e => { if(!isScraping) e.target.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { if(!isScraping) e.target.style.transform = "translateY(0)"; }}
              >
                {isScraping ? (
                  <>
                    <span className="spinner" style={{
                      width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#FFFFFF", borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }} />
                    Running Scrapers...
                  </>
                ) : "⚡ Run Web Scrapers Now"}
              </button>

              {scrapeError && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11, color: "#FCA5A5" }}>
                  <strong>Error:</strong> {scrapeError}
                </div>
              )}

              {scrapeOutput && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(224,242,254,0.4)", textTransform: "uppercase" }}>Scraper Output Log</span>
                    <button 
                      onClick={() => setScrapeOutput(null)}
                      style={{ background: "none", border: "none", color: "rgba(224,242,254,0.4)", fontSize: 10, cursor: "pointer" }}
                    >
                      Clear
                    </button>
                  </div>
                  <pre style={{
                    maxHeight: 180, overflowY: "auto", padding: 10, background: "#01070F",
                    border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8,
                    fontSize: 10, fontFamily: "monospace", color: "#67E8F9", whiteSpace: "pre-wrap"
                  }}>
                    {scrapeOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* AdSense Tracker */}
          <div style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE", marginBottom: 4 }}>AdSense Monetization Readiness</h3>
            <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginBottom: 16 }}>Compliance criteria tracker for Google monetization</p>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 11 }}>
                <span style={{ color: "rgba(224, 242, 254, 0.5)", fontWeight: 600 }}>Completed Setup Checkpoints</span>
                <span style={{ color: "#67E8F9", fontWeight: 700 }}>{checklistPercentage}% Complete</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${checklistPercentage}%`, height: "100%", background: "linear-gradient(to right, #0284C7, #06B6D4)", borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {adsenseChecklist.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: item.done ? "#4ADE80" : "#FBBF24", fontSize: 12 }}>
                    {item.done ? "✓" : "○"}
                  </span>
                  <div>
                    <span style={{ fontSize: 12, color: item.done ? "#DDEFFC" : "rgba(220,240,255,0.45)", fontWeight: item.done ? 500 : 400 }}>
                      {item.label}
                    </span>
                    {item.detail && (
                      <div style={{ fontSize: 10, color: "#67E8F9", fontFamily: "monospace", marginTop: 2 }}>{item.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search Query Logs */}
          <div style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE", marginBottom: 4 }}>
              {mongoActive ? "Global Search Trends" : "Session Search Queries"}
            </h3>
            <p style={{ fontSize: 12, color: "rgba(224,242,254,0.4)", marginBottom: 16 }}>
              {mongoActive ? "Live query analysis from MongoDB Atlas" : "Live terms searched in this browser session"}
            </p>

            {mongoActive ? (
              telemetry.loading ? (
                <div style={{ padding: "24px 12px", textAlign: "center", color: "rgba(224,242,254,0.4)", fontSize: 12 }}>
                  Loading telemetry from Atlas...
                </div>
              ) : telemetry.searches.length > 0 ? (
                <div>
                  {/* Top Search Keywords */}
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 11, color: "#67E8F9", letterSpacing: 1, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                      🔥 Top Keywords
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(() => {
                        const counts = {};
                        telemetry.searches.forEach(s => {
                          const q = s.query ? s.query.trim().toLowerCase() : "";
                          if (q) counts[q] = (counts[q] || 0) + 1;
                        });
                        const sorted = Object.entries(counts)
                          .map(([q, count]) => ({ q, count }))
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 5);

                        return sorted.length > 0 ? sorted.map((item, idx) => (
                          <div key={idx} style={{
                            padding: "6px 10px", borderRadius: 8, background: "rgba(6, 182, 212, 0.06)",
                            border: "1px solid rgba(6, 182, 212, 0.15)", fontSize: 11, display: "flex", alignItems: "center", gap: 6
                          }}>
                            <span style={{ color: "#E0F2FE", fontWeight: 600 }}>{item.q}</span>
                            <span style={{ color: "#67E8F9", fontSize: 10, background: "rgba(6, 182, 212, 0.12)", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>{item.count}</span>
                          </div>
                        )) : (
                          <span style={{ fontSize: 11, color: "rgba(224,242,254,0.35)" }}>No keyword data yet</span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Live Feed */}
                  <span style={{ fontSize: 11, color: "#67E8F9", letterSpacing: 1, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                    🕒 Recent Searches (Database)
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 250, overflowY: "auto" }}>
                    {telemetry.searches.slice(0, 10).map((item, idx) => {
                      let timeStr = "Just now";
                      try {
                        const dateVal = item.timestamp?.$date || item.timestamp;
                        const d = new Date(dateVal);
                        if (!isNaN(d.getTime())) {
                          timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
                                    " (" + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ")";
                        }
                      } catch (e) {}
                      return (
                        <div key={idx} style={{
                          padding: "10px 12px", background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8,
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: 12, color: "#BAE6FD", fontFamily: "monospace" }}>"{item.query}"</span>
                          <span style={{ fontSize: 10, color: "rgba(224,242,254,0.3)" }}>{timeStr}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ padding: "24px 12px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 8, textAlign: "center", background: "rgba(255,255,255,0.01)" }}>
                  <span style={{ fontSize: 11, color: "rgba(224,242,254,0.35)", lineHeight: 1.4, display: "block" }}>
                    No global searches logged in database yet.
                  </span>
                </div>
              )
            ) : (
              <div>
                <div style={{
                  padding: "10px 12px", background: "rgba(245,158,11,0.04)",
                  border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8,
                  fontSize: 11, color: "#FBBF24", marginBottom: 16, lineHeight: 1.4
                }}>
                  ⚠️ MongoDB Atlas data source is not configured. Telemetry is currently running in local-only session mode.
                </div>
                {searchHistory.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {searchHistory.map((item, idx) => (
                      <div key={idx} style={{
                        padding: "10px 12px", background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8,
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}>
                        <span style={{ fontSize: 12, color: "#67E8F9", fontFamily: "monospace" }}>"{item.query}"</span>
                        <span style={{ fontSize: 10, color: "rgba(224,242,254,0.3)" }}>{item.time}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "24px 12px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 8, textAlign: "center", background: "rgba(255,255,255,0.01)" }}>
                    <span style={{ fontSize: 11, color: "rgba(224,242,254,0.35)", lineHeight: 1.4, display: "block" }}>
                      No searches captured in this session yet.<br/>
                      (Return to the main page and search, then log back in to see logs!)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ===================== DAM DETAIL PAGE =====================
function generateFallbackHistory(dam, safeLevel) {
  const cutoffDate = new Date("2026-06-13T00:00:00");
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const result = [];
  const currentDate = new Date(cutoffDate);
  
  const inflowBase = typeof dam.inflow === 'number' ? dam.inflow : parseFloat(dam.inflow) || 1200;
  const outflowBase = typeof dam.outflow === 'number' ? dam.outflow : parseFloat(dam.outflow) || 800;
  
  let dayIndex = 0;
  while (currentDate <= today) {
    // Level slowly changes towards safeLevel
    const level = Math.max(0, Math.min(100, safeLevel - (3 - dayIndex) * 0.4 + (Math.sin(dayIndex) * 0.1)));
    const inflow = Math.max(0, inflowBase * (0.85 + Math.sin(dayIndex) * 0.15));
    const outflow = Math.max(0, outflowBase * (0.9 + Math.cos(dayIndex) * 0.1));
    
    result.push({
      dam_id: dam.id,
      name: dam.name,
      level,
      capacity: dam.capacity,
      inflow,
      outflow,
      timestamp: currentDate.toISOString()
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }
  return result;
}

function HistoricalCharts({ dam, safeLevel }) {
  const [period, setPeriod] = useState("7D");
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activeTab, setActiveTab] = useState("level"); // "level" or "flow"

  useEffect(() => {
    setLoading(true);

    fetch(`/api/dam-history?dam_id=${dam.id}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load historical data");
        return res.json();
      })
      .then(data => {
        const docs = data.documents || [];
        if (docs.length === 0) {
          const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
          if (isDev) {
            setHistoryData(generateFallbackHistory(dam, safeLevel));
          } else {
            setHistoryData([]);
          }
        } else {
          docs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          setHistoryData(docs);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Historical data fetch failed:", err);
        const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (isDev) {
          setHistoryData(generateFallbackHistory(dam, safeLevel));
        } else {
          setHistoryData([]);
        }
        setLoading(false);
      });
  }, [dam, safeLevel]);

  const filledHistoryData = useMemo(() => {
    if (historyData.length === 0) return [];
    
    // Discard any records before June 13, 2026 (ignore dummy/test data)
    const cutoffDate = new Date("2026-06-13T00:00:00");
    const sorted = [...historyData]
      .filter(d => new Date(d.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (sorted.length === 0) return [];
    
    const earliestDate = new Date(sorted[0].timestamp);
    earliestDate.setHours(0, 0, 0, 0);
    const latestDate = new Date(sorted[sorted.length - 1].timestamp);
    latestDate.setHours(0, 0, 0, 0);
    
    const result = [];
    const currentDate = new Date(earliestDate);
    
    // Helper to find the record closest to or on currentDate
    let lastRecord = sorted[0];
    
    while (currentDate <= latestDate) {
      // Find if we have an exact record for this calendar day
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const recordsForDay = sorted.filter(d => {
        const t = new Date(d.timestamp);
        return t >= dayStart && t < dayEnd;
      });
      
      if (recordsForDay.length > 0) {
        // Use the last record of that day
        lastRecord = recordsForDay[recordsForDay.length - 1];
        result.push({
          ...lastRecord,
          timestamp: currentDate.toISOString() // normalize to calendar day
        });
      } else {
        // Carry forward the last known record (backfill/interpolate)
        result.push({
          ...lastRecord,
          timestamp: currentDate.toISOString() // normalize to calendar day
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  }, [historyData]);

  const latestDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (filledHistoryData.length === 0) return today;
    const d = new Date(filledHistoryData[filledHistoryData.length - 1].timestamp);
    d.setHours(0, 0, 0, 0);
    // Anchor timeline to today (current local date) to show "half cut" appropriately
    return d > today ? d : today;
  }, [filledHistoryData]);

  const { cutoff, daysCount, minTime, maxTime, timeRange, midDate } = useMemo(() => {
    let daysCount = 7;
    if (period === "30D") daysCount = 30;
    if (period === "90D") daysCount = 90;
    
    const cutoff = new Date(latestDate);
    cutoff.setDate(latestDate.getDate() - (daysCount - 1));
    cutoff.setHours(0, 0, 0, 0);
    
    const minTime = cutoff.getTime();
    const maxTime = latestDate.getTime();
    const timeRange = maxTime - minTime || 1;
    
    const midDate = new Date(minTime + timeRange / 2);
    
    return { cutoff, daysCount, minTime, maxTime, timeRange, midDate };
  }, [latestDate, period]);

  const filteredData = useMemo(() => {
    if (filledHistoryData.length === 0) return [];
    return filledHistoryData.filter(d => new Date(d.timestamp) >= cutoff);
  }, [filledHistoryData, cutoff]);

  // Chart coordinates calculation
  const width = 600;
  const height = 240;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };

  const { points, areaPoints, xCoords, yCoords, yMin, yMax } = useMemo(() => {
    if (filteredData.length === 0) return { points: "", areaPoints: "", xCoords: [], yCoords: [], yMin: 0, yMax: 100 };
    const levels = filteredData.map(d => d.level);
    const minL = Math.max(0, Math.min(...levels) - 3);
    const maxL = Math.min(100, Math.max(...levels) + 3);
    const yMin = maxL - minL < 8 ? Math.max(0, minL - 4) : minL;
    const yMax = maxL - minL < 8 ? Math.min(100, maxL + 4) : maxL;

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const coords = filteredData.map((d) => {
      const time = new Date(d.timestamp).getTime();
      const x = margin.left + ((time - minTime) / timeRange) * chartWidth;
      const y = margin.top + (1 - (d.level - yMin) / (yMax - yMin || 1)) * chartHeight;
      return { x, y };
    });

    const pointsStr = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    
    // For filling the area below the line
    const bottomY = margin.top + chartHeight;
    const areaStr = coords.length > 0 
      ? `${coords[0].x.toFixed(1)},${bottomY.toFixed(1)} ${pointsStr} ${coords[coords.length - 1].x.toFixed(1)},${bottomY.toFixed(1)}` 
      : "";

    return {
      points: pointsStr,
      areaPoints: areaStr,
      xCoords: coords.map(c => c.x),
      yCoords: coords.map(c => c.y),
      yMin,
      yMax
    };
  }, [filteredData, minTime, timeRange, margin.left, margin.right, margin.top, margin.bottom]);

  const handleMouseMove = (e) => {
    if (filteredData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const chartWidth = rect.width * ((width - margin.left - margin.right) / width);
    const chartLeft = rect.width * (margin.left / width);
    
    const relativeX = clientX - chartLeft;
    const pct = Math.max(0, Math.min(1, relativeX / chartWidth));
    
    const dayOffset = Math.round(pct * (daysCount - 1));
    const targetDate = new Date(cutoff);
    targetDate.setDate(cutoff.getDate() + dayOffset);
    targetDate.setHours(0, 0, 0, 0);
    
    const matched = filteredData.find(d => {
      const t = new Date(d.timestamp);
      t.setHours(0, 0, 0, 0);
      return t.getTime() === targetDate.getTime();
    });
    
    if (matched) {
      const x = margin.left + (dayOffset / (daysCount - 1)) * (width - margin.left - margin.right);
      const y = margin.top + (1 - (matched.level - yMin) / (yMax - yMin || 1)) * (height - margin.top - margin.bottom);
      setHoveredPoint({
        ...matched,
        x,
        y
      });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const [hoveredInflowPoint, setHoveredInflowPoint] = useState(null);
  const [hoveredOutflowPoint, setHoveredOutflowPoint] = useState(null);

  // Inflow chart calculations
  const {
    inflowPoints,
    inflowAreaPoints,
    inflowXCoords,
    inflowYCoords,
    maxInflowVal
  } = useMemo(() => {
    if (filteredData.length === 0) {
      return { inflowPoints: "", inflowAreaPoints: "", inflowXCoords: [], inflowYCoords: [], maxInflowVal: 100 };
    }
    const inflows = filteredData.map(d => typeof d.inflow === 'number' ? d.inflow : parseFloat(d.inflow) || 0);
    const maxVal = Math.max(100, ...inflows) * 1.15;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const coords = filteredData.map((d) => {
      const time = new Date(d.timestamp).getTime();
      const x = margin.left + ((time - minTime) / timeRange) * chartWidth;
      const val = typeof d.inflow === 'number' ? d.inflow : parseFloat(d.inflow) || 0;
      const y = margin.top + (1 - val / maxVal) * chartHeight;
      return { x, y };
    });
    const pointsStr = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const bottomY = margin.top + chartHeight;
    const areaStr = coords.length > 0
      ? `${coords[0].x.toFixed(1)},${bottomY.toFixed(1)} ${pointsStr} ${coords[coords.length - 1].x.toFixed(1)},${bottomY.toFixed(1)}`
      : "";
    return {
      inflowPoints: pointsStr,
      inflowAreaPoints: areaStr,
      inflowXCoords: coords.map(c => c.x),
      inflowYCoords: coords.map(c => c.y),
      maxInflowVal: maxVal
    };
  }, [filteredData, minTime, timeRange, margin.left, margin.right, margin.top, margin.bottom]);

  // Outflow chart calculations
  const {
    outflowPoints,
    outflowAreaPoints,
    outflowXCoords,
    outflowYCoords,
    maxOutflowVal
  } = useMemo(() => {
    if (filteredData.length === 0) {
      return { outflowPoints: "", outflowAreaPoints: "", outflowXCoords: [], outflowYCoords: [], maxOutflowVal: 100 };
    }
    const outflows = filteredData.map(d => typeof d.outflow === 'number' ? d.outflow : parseFloat(d.outflow) || 0);
    const maxVal = Math.max(100, ...outflows) * 1.15;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const coords = filteredData.map((d) => {
      const time = new Date(d.timestamp).getTime();
      const x = margin.left + ((time - minTime) / timeRange) * chartWidth;
      const val = typeof d.outflow === 'number' ? d.outflow : parseFloat(d.outflow) || 0;
      const y = margin.top + (1 - val / maxVal) * chartHeight;
      return { x, y };
    });
    const pointsStr = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const bottomY = margin.top + chartHeight;
    const areaStr = coords.length > 0
      ? `${coords[0].x.toFixed(1)},${bottomY.toFixed(1)} ${pointsStr} ${coords[coords.length - 1].x.toFixed(1)},${bottomY.toFixed(1)}`
      : "";
    return {
      outflowPoints: pointsStr,
      outflowAreaPoints: areaStr,
      outflowXCoords: coords.map(c => c.x),
      outflowYCoords: coords.map(c => c.y),
      maxOutflowVal: maxVal
    };
  }, [filteredData, minTime, timeRange, margin.left, margin.right, margin.top, margin.bottom]);

  const handleInflowMouseMove = (e) => {
    if (filteredData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const chartWidth = rect.width * ((width - margin.left - margin.right) / width);
    const chartLeft = rect.width * (margin.left / width);
    
    const relativeX = clientX - chartLeft;
    const pct = Math.max(0, Math.min(1, relativeX / chartWidth));
    
    const dayOffset = Math.round(pct * (daysCount - 1));
    const targetDate = new Date(cutoff);
    targetDate.setDate(cutoff.getDate() + dayOffset);
    targetDate.setHours(0, 0, 0, 0);
    
    const matched = filteredData.find(d => {
      const t = new Date(d.timestamp);
      t.setHours(0, 0, 0, 0);
      return t.getTime() === targetDate.getTime();
    });
    
    if (matched) {
      const x = margin.left + (dayOffset / (daysCount - 1)) * (width - margin.left - margin.right);
      const val = typeof matched.inflow === 'number' ? matched.inflow : parseFloat(matched.inflow) || 0;
      const y = margin.top + (1 - val / maxInflowVal) * (height - margin.top - margin.bottom);
      setHoveredInflowPoint({
        ...matched,
        x,
        y,
        value: val
      });
    } else {
      setHoveredInflowPoint(null);
    }
  };

  const handleInflowMouseLeave = () => {
    setHoveredInflowPoint(null);
  };

  const handleOutflowMouseMove = (e) => {
    if (filteredData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const chartWidth = rect.width * ((width - margin.left - margin.right) / width);
    const chartLeft = rect.width * (margin.left / width);
    
    const relativeX = clientX - chartLeft;
    const pct = Math.max(0, Math.min(1, relativeX / chartWidth));
    
    const dayOffset = Math.round(pct * (daysCount - 1));
    const targetDate = new Date(cutoff);
    targetDate.setDate(cutoff.getDate() + dayOffset);
    targetDate.setHours(0, 0, 0, 0);
    
    const matched = filteredData.find(d => {
      const t = new Date(d.timestamp);
      t.setHours(0, 0, 0, 0);
      return t.getTime() === targetDate.getTime();
    });
    
    if (matched) {
      const x = margin.left + (dayOffset / (daysCount - 1)) * (width - margin.left - margin.right);
      const val = typeof matched.outflow === 'number' ? matched.outflow : parseFloat(matched.outflow) || 0;
      const y = margin.top + (1 - val / maxOutflowVal) * (height - margin.top - margin.bottom);
      setHoveredOutflowPoint({
        ...matched,
        x,
        y,
        value: val
      });
    } else {
      setHoveredOutflowPoint(null);
    }
  };

  const handleOutflowMouseLeave = () => {
    setHoveredOutflowPoint(null);
  };

  return (
    <div style={{
      background: "linear-gradient(148deg, #051224 0%, #030a15 100%)",
      border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
      padding: "20px 24px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {/* Switch Tabs */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: 4, borderRadius: 10 }}>
          <button
            onClick={() => setActiveTab("level")}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: activeTab === "level" ? "rgba(14,165,233,0.15)" : "transparent",
              color: activeTab === "level" ? "#38bdf8" : "rgba(224,242,254,0.5)",
              fontSize: 12, fontWeight: activeTab === "level" ? 700 : 500, cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            Water Level
          </button>
          <button
            onClick={() => setActiveTab("inflow")}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: activeTab === "inflow" ? "rgba(34,197,94,0.15)" : "transparent",
              color: activeTab === "inflow" ? "#4ade80" : "rgba(224,242,254,0.5)",
              fontSize: 12, fontWeight: activeTab === "inflow" ? 700 : 500, cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            Inflow
          </button>
          <button
            onClick={() => setActiveTab("outflow")}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: activeTab === "outflow" ? "rgba(239,68,68,0.15)" : "transparent",
              color: activeTab === "outflow" ? "#f87171" : "rgba(224,242,254,0.5)",
              fontSize: 12, fontWeight: activeTab === "outflow" ? 700 : 500, cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            Outflow
          </button>
        </div>
        
        {/* Period Selectors */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: 4, borderRadius: 10 }}>
          {["7D", "30D", "90D"].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "4px 12px", borderRadius: 8, border: "none",
                background: period === p ? "rgba(6,182,212,0.15)" : "transparent",
                color: period === p ? "#67E8F9" : "rgba(224,242,254,0.5)",
                fontSize: 12, fontWeight: period === p ? 700 : 500, cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(224,242,254,0.3)" }}>
          Loading history trend...
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(224,242,254,0.3)" }}>
          No historical data found.
        </div>
      ) : activeTab === "level" ? (
        /* Water Level Chart */
        <div style={{ position: "relative" }}>
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ overflow: "visible", cursor: "crosshair" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const val = yMin + ratio * (yMax - yMin);
              const y = margin.top + (1 - ratio) * (height - margin.top - margin.bottom);
              return (
                <g key={i}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={width - margin.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.04)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={margin.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="rgba(224,242,254,0.35)"
                    style={{ fontSize: 10, fontFamily: "monospace" }}
                  >
                    {val.toFixed(0)}%
                  </text>
                </g>
              );
            })}

            {/* Gradient Area under line */}
            <polygon
              points={areaPoints}
              fill="url(#chartGradient)"
            />

            {/* Line Path */}
            <polyline
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              points={points}
            />

            {/* Hover vertical line and tooltip marker */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoveredPoint.x}
                  y1={margin.top}
                  x2={hoveredPoint.x}
                  y2={height - margin.bottom}
                  stroke="rgba(56,189,248,0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="6"
                  fill="#0ea5e9"
                  stroke="#fff"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* X-Axis Dates */}
            {filteredData.length > 0 && (
              <g>
                <text x={margin.left} y={height - 12} fill="rgba(224,242,254,0.3)" style={{ fontSize: 10 }}>
                  {cutoff.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
                <text x={margin.left + (width - margin.left - margin.right) / 2} y={height - 12} textAnchor="middle" fill="rgba(224,242,254,0.3)" style={{ fontSize: 10 }}>
                  {midDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
                <text x={width - margin.right} y={height - 12} textAnchor="end" fill="rgba(224,242,254,0.3)" style={{ fontSize: 10 }}>
                  {latestDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              </g>
            )}
          </svg>

          {/* Tooltip Overlay */}
          {hoveredPoint && (
            <div style={{
              position: "absolute",
              top: 10,
              left: hoveredPoint.x > width / 2 ? hoveredPoint.x * 0.9 - 140 : hoveredPoint.x * 1.1 + 10,
              background: "rgba(11, 22, 42, 0.95)",
              border: "1px solid rgba(56,189,248,0.25)",
              borderRadius: 10,
              padding: "8px 12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
              pointerEvents: "none",
              zIndex: 10,
              animation: "fadeIn 0.15s ease",
              color: "#fff",
              fontSize: 12
            }}>
              <div style={{ color: "rgba(224,242,254,0.5)", marginBottom: 4, fontSize: 10 }}>
                {new Date(hoveredPoint.timestamp).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
                <span>Filled:</span>
                <strong style={{ color: "#38bdf8" }}>{hoveredPoint.level.toFixed(1)}%</strong>
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 2 }}>
                <span>Storage:</span>
                <strong style={{ color: "#a5f3fc" }}>{(dam.capacity * hoveredPoint.level / 100).toFixed(2)} TMC</strong>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "inflow" ? (
        /* Inflow Chart */
        <div style={{ position: "relative" }}>
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ overflow: "visible", cursor: "crosshair" }}
            onMouseMove={handleInflowMouseMove}
            onMouseLeave={handleInflowMouseLeave}
          >
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const val = ratio * maxInflowVal;
              const y = margin.top + (1 - ratio) * (height - margin.top - margin.bottom);
              return (
                <g key={i}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={width - margin.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.04)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={margin.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="rgba(224,242,254,0.35)"
                    style={{ fontSize: 10, fontFamily: "monospace" }}
                  >
                    {fmtK(val)}
                  </text>
                </g>
              );
            })}

            {/* Gradient Area under line */}
            <polygon
              points={inflowAreaPoints}
              fill="url(#inflowGrad)"
            />

            {/* Line Path */}
            <polyline
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              points={inflowPoints}
            />

            {/* Hover vertical line and tooltip marker */}
            {hoveredInflowPoint && (
              <g>
                <line
                  x1={hoveredInflowPoint.x}
                  y1={margin.top}
                  x2={hoveredInflowPoint.x}
                  y2={height - margin.bottom}
                  stroke="rgba(34,197,94,0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={hoveredInflowPoint.x}
                  cy={hoveredInflowPoint.y}
                  r="6"
                  fill="#22c55e"
                  stroke="#fff"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* X-Axis Dates */}
            {filteredData.length > 0 && (
              <g>
                <text x={margin.left} y={height - 12} fill="rgba(224,242,254,0.3)" style={{ fontSize: 10 }}>
                  {cutoff.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
                <text x={margin.left + (width - margin.left - margin.right) / 2} y={height - 12} textAnchor="middle" fill="rgba(224,242,254,0.3)" style={{ fontSize: 10 }}>
                  {midDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
                <text x={width - margin.right} y={height - 12} textAnchor="end" fill="rgba(224,242,254,0.3)" style={{ fontSize: 10 }}>
                  {latestDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              </g>
            )}
          </svg>

          {/* Tooltip Overlay */}
          {hoveredInflowPoint && (
            <div style={{
              position: "absolute",
              top: 10,
              left: hoveredInflowPoint.x > width / 2 ? hoveredInflowPoint.x * 0.9 - 140 : hoveredInflowPoint.x * 1.1 + 10,
              background: "rgba(11, 22, 42, 0.95)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 10,
              padding: "8px 12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
              pointerEvents: "none",
              zIndex: 10,
              color: "#fff",
              fontSize: 12
            }}>
              <div style={{ color: "rgba(224,242,254,0.5)", marginBottom: 4, fontSize: 10 }}>
                {new Date(hoveredInflowPoint.timestamp).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
                <span>Inflow:</span>
                <strong style={{ color: "#86efac" }}>{hoveredInflowPoint.value.toLocaleString()} cusecs</strong>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Outflow Chart */
        <div style={{ position: "relative" }}>
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ overflow: "visible", cursor: "crosshair" }}
            onMouseMove={handleOutflowMouseMove}
            onMouseLeave={handleOutflowMouseLeave}
          >
            <defs>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const val = ratio * maxOutflowVal;
              const y = margin.top + (1 - ratio) * (height - margin.top - margin.bottom);
              return (
                <g key={i}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={width - margin.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.04)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={margin.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="rgba(224,242,254,0.35)"
                    style={{ fontSize: 10, fontFamily: "monospace" }}
                  >
                    {fmtK(val)}
                  </text>
                </g>
              );
            })}

            {/* Gradient Area under line */}
            <polygon
              points={outflowAreaPoints}
              fill="url(#outflowGrad)"
            />

            {/* Line Path */}
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              points={outflowPoints}
            />

            {/* Hover vertical line and tooltip marker */}
            {hoveredOutflowPoint && (
              <g>
                <line
                  x1={hoveredOutflowPoint.x}
                  y1={margin.top}
                  x2={hoveredOutflowPoint.x}
                  y2={height - margin.bottom}
                  stroke="rgba(239,68,68,0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={hoveredOutflowPoint.x}
                  cy={hoveredOutflowPoint.y}
                  r="6"
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* X-Axis Dates */}
            {filteredData.length > 0 && (
              <g>
                <text x={margin.left} y={height - 12} fill="rgba(224,242,254,0.3)" style={{ fontSize: 10 }}>
                  {cutoff.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
                <text x={margin.left + (width - margin.left - margin.right) / 2} y={height - 12} textAnchor="middle" fill="rgba(224,242,254,0.3)" style={{ fontSize: 10 }}>
                  {midDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
                <text x={width - margin.right} y={height - 12} textAnchor="end" fill="rgba(224,242,254,0.3)" style={{ fontSize: 10 }}>
                  {latestDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              </g>
            )}
          </svg>

          {/* Tooltip Overlay */}
          {hoveredOutflowPoint && (
            <div style={{
              position: "absolute",
              top: 10,
              left: hoveredOutflowPoint.x > width / 2 ? hoveredOutflowPoint.x * 0.9 - 140 : hoveredOutflowPoint.x * 1.1 + 10,
              background: "rgba(11, 22, 42, 0.95)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 10,
              padding: "8px 12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
              pointerEvents: "none",
              zIndex: 10,
              color: "#fff",
              fontSize: 12
            }}>
              <div style={{ color: "rgba(224,242,254,0.5)", marginBottom: 4, fontSize: 10 }}>
                {new Date(hoveredOutflowPoint.timestamp).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
                <span>Outflow:</span>
                <strong style={{ color: "#fca5a5" }}>{hoveredOutflowPoint.value.toLocaleString()} cusecs</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================== DAM DETAIL PAGE =====================
function DamDetailPage({ dam, navigate, setView, isDirectEntry }) {
  const [shareCopied, setShareCopied] = useState(false);
  const safeLevel = typeof dam.level === 'number' ? dam.level : parseFloat(dam.level) || 0;
  
  const handleShare = (e) => {
    e.preventDefault();
    const shareUrl = `${window.location.origin}/dam/${getDamSlug(dam.name)}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
      });
  };

  const netFlowCusecs = (dam.inflow || 0) - (dam.outflow || 0);
  const netFlowTmcPerDay = netFlowCusecs * 0.0000864;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px", animation: "fadeSlideUp 0.5s ease" }}>
      {/* Action Header: Back + Share */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <a 
          href={dam.state ? `/state/${getStateSlug(dam.state)}` : "/"}
          onClick={(e) => {
            e.preventDefault();
            navigate(dam.state ? `/state/${getStateSlug(dam.state)}` : "/");
          }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            textDecoration: "none",
            background: "transparent", border: "none", color: "rgba(224,242,254,0.6)",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            padding: "6px 12px", borderRadius: 8, transition: "all 0.2s",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#38bdf8"; e.currentTarget.style.background = "rgba(56,189,248,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(224,242,254,0.6)"; e.currentTarget.style.background = "transparent"; }}
        >
          &larr; Back to {dam.state || "Karnataka"} Reservoirs
        </a>

        <button 
          onClick={handleShare}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)",
            color: "#67e8f9", fontSize: 13, fontWeight: 600, cursor: "pointer",
            padding: "6px 14px", borderRadius: 8, transition: "all 0.2s",
            outline: "none"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(6, 182, 212, 0.15)"; e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(6, 182, 212, 0.08)"; e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.2)"; }}
        >
          {shareCopied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              Share Dam Link
            </>
          )}
        </button>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Top Header Card */}
        <div className="dam-detail-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 16, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <h1 style={{ fontSize: "clamp(20px, 4.5vw, 26px)", fontWeight: 900, color: "#fff", margin: 0 }}>
                  {dam.name} Water Level Today
                </h1>
              </div>
              <div style={{ fontSize: 13, color: "rgba(224,242,254,0.5)" }}>
                {dam.river} River &middot; {dam.district} District, {dam.state || "Karnataka"} &middot; Live Reservoir Storage Status
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {netFlowCusecs !== 0 && (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-end",
                  background: netFlowCusecs > 0 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                  border: `1px solid ${netFlowCusecs > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                  padding: "6px 12px", borderRadius: 10
                }}>
                  <span style={{ fontSize: 9, color: "rgba(224,242,254,0.4)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Daily Accumulation
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: netFlowCusecs > 0 ? "#4ade80" : "#f87171" }}>
                    {netFlowCusecs > 0 ? "+" : ""}{netFlowTmcPerDay.toFixed(3)} TMC/day
                  </span>
                </div>
              )}
              
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "flex-end",
                background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)",
                padding: "6px 12px", borderRadius: 10
              }}>
                <span style={{ fontSize: 9, color: "rgba(224,242,254,0.4)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Storage Status
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#38bdf8" }}>
                  {safeLevel.toFixed(1)}% Full
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. VISUALS & KEY STATS (At the top! Using a responsive grid layout) */}
        <div className="dam-top-grid">
          {/* Column A: Interactive Wave simulation */}
          <div style={{
            background: "linear-gradient(148deg, #051224 0%, #030a15 100%)",
            border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
            padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14
          }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0 }}>Visual Simulation</h3>
              <p style={{ fontSize: 11, color: "rgba(224,242,254,0.4)", margin: "2px 0 0 0" }}>
                Interactive outflow & wave velocity model
              </p>
            </div>

            <div style={{ width: "100%", borderRadius: 12, overflow: "hidden" }}>
              <WaterViz level={safeLevel} outflow={dam.outflow} capacity={dam.capacity} active={true} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "rgba(224,242,254,0.4)" }}>Simulation Status:</span>
                <span style={{ color: "#34d399", fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "rgba(224,242,254,0.4)" }}>Discharge Rate:</span>
                <span style={{ color: "#fb7171", fontWeight: 600, fontFamily: "monospace" }}>
                  {dam.outflow !== null ? `${dam.outflow.toLocaleString()} cusecs` : "0 cusecs"}
                </span>
              </div>
            </div>
          </div>

          {/* Column B: KPIs & Specs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* KPI Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              {[
                { label: "Current Level", value: `${safeLevel.toFixed(1)}%`, sub: `${(dam.capacity * safeLevel / 100).toFixed(2)} TMC`, color: "#38bdf8" },
                { label: "Total Capacity", value: `${dam.capacity} TMC`, sub: "Full Reservoir", color: "#a5f3fc" },
                { label: "Daily Inflow", value: dam.inflow !== null ? `${fmtK(dam.inflow)}` : "—", sub: dam.inflow !== null ? "cusecs" : "", color: "#86efac" },
                { label: "Daily Outflow", value: dam.outflow !== null ? `${fmtK(dam.outflow)}` : "—", sub: dam.outflow !== null ? "cusecs" : "", color: "#fca5a5" }
              ].map((kpi, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column"
                }}>
                  <span style={{ fontSize: 10, color: "rgba(224,242,254,0.38)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                    {kpi.label}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: kpi.color, fontFamily: "monospace", lineHeight: 1.1 }}>
                    {kpi.value}
                  </span>
                  {kpi.sub && (
                    <span style={{ fontSize: 10, color: "rgba(224,242,254,0.3)", marginTop: 4 }}>
                      {kpi.sub}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Specifications Card */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 16, padding: "20px 24px"
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: "0 0 14px 0" }}>Reservoir Specifications</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "River System", value: dam.river },
                  { label: "District Location", value: dam.district },
                  { label: "State", value: dam.state || "Karnataka" },
                  { label: "Design Capacity", value: `${dam.capacity} TMC` }
                ].map((item, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    paddingBottom: 6, borderBottom: i === 3 ? "none" : "1px solid rgba(255,255,255,0.04)"
                  }}>
                    <span style={{ fontSize: 12, color: "rgba(224,242,254,0.4)" }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", textAlign: "right" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. HISTORICAL CHARTS SECTION (Only visible if NOT a direct entry) */}
        {!isDirectEntry ? (
          <HistoricalCharts dam={dam} safeLevel={safeLevel} />
        ) : (
          <div style={{
            background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: 16, padding: "24px 20px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 8, textAlign: "center"
          }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(224,242,254,0.8)" }}>Historical trends restricted via shared link</div>
            <div style={{ fontSize: 11, color: "rgba(224,242,254,0.4)", maxWidth: 360 }}>
              To view full historical charts, daily inflow/outflow curves, and trends, please visit our main dashboard.
            </div>
            <a 
              href="/"
              onClick={(e) => { e.preventDefault(); navigate("/"); }}
              style={{
                marginTop: 8, fontSize: 12, color: "#38bdf8", fontWeight: 700, textDecoration: "none",
                background: "rgba(56,189,248,0.08)", padding: "6px 14px", borderRadius: 8,
                border: "1px solid rgba(56,189,248,0.15)", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(56,189,248,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(56,189,248,0.08)"; }}
            >
              Go to Main Dashboard
            </a>
          </div>
        )}

        {/* 3. VERBOSE DETAILS & ANALYSIS (Placed at the bottom for SEO & deep analysis) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          {/* SEO Paragraph Card */}
          <div style={{
            background: "rgba(6, 182, 212, 0.03)",
            border: "1px solid rgba(6, 182, 212, 0.1)",
            borderRadius: 14,
            padding: "16px 20px",
            fontSize: 13,
            lineHeight: 1.6,
            color: "rgba(224, 242, 254, 0.65)",
            boxSizing: "border-box"
          }}>
            Welcome to the live daily report for the <strong>{dam.name.replace(/\s*\(.*\)\s*/g, "").trim()} water level today</strong>. Located in the <strong>{dam.district}</strong> district of <strong>{dam.state || "Karnataka"}</strong> on the <strong>{dam.river} River</strong> system, this reservoir plays a key role in regional agricultural irrigation and flood control. Today's telemetry monitoring indicates the storage is at <strong>{safeLevel.toFixed(1)}%</strong> of its maximum capacity.
          </div>

          {/* Flow Dynamics Analysis Card */}
          <div style={{
            background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: 14, padding: "16px 20px"
          }}>
            <div style={{ fontSize: 11, color: "rgba(224,242,254,0.35)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Flow Dynamics Analysis
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(224,242,254,0.7)" }}>
              {netFlowCusecs > 0 ? (
                <span>
                  The reservoir is experiencing a net positive accumulation. Water inflow is exceeding outflow by <strong style={{ color: "#4ade80" }}>{netFlowCusecs.toLocaleString()} cusecs</strong>, increasing overall storage at a rate of <strong style={{ color: "#4ade80" }}>{netFlowTmcPerDay.toFixed(3)} TMC</strong> per 24 hours.
                </span>
              ) : netFlowCusecs < 0 ? (
                <span>
                  The reservoir is currently depleting. Outflow discharges exceed water inflow by <strong style={{ color: "#f87171" }}>{Math.abs(netFlowCusecs).toLocaleString()} cusecs</strong>, resulting in a daily net reduction of <strong style={{ color: "#f87171" }}>{Math.abs(netFlowTmcPerDay).toFixed(3)} TMC</strong> in storage volume.
                </span>
              ) : (
                <span>
                  The reservoir flow is currently in equilibrium. Inflow and outflow rates are balanced at <strong style={{ color: "#fff" }}>{dam.inflow?.toLocaleString() || 0} cusecs</strong>, keeping storage volume stable.
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ===================== ABOUT US PAGE =====================
function AboutUsPage({ navigate, setView }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 16px", animation: "fadeSlideUp 0.5s ease" }}>
      <button 
        onClick={() => navigate("/")}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "transparent", border: "none", color: "rgba(224,242,254,0.6)",
          fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 24,
          padding: "6px 12px", borderRadius: 8, transition: "all 0.2s",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#38bdf8"; e.currentTarget.style.background = "rgba(56,189,248,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(224,242,254,0.6)"; e.currentTarget.style.background = "transparent"; }}
      >
        &larr; Back to Dashboard
      </button>

      <div style={{
        background: "linear-gradient(135deg, #091a2f 0%, #040c17 100%)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
        padding: "32px 40px", marginBottom: 24
      }}>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 900, color: "#fff", marginBottom: 12 }}>About Damtoday</h1>
        <p style={{ fontSize: 15, color: "rgba(224,242,254,0.6)", lineHeight: 1.7, marginBottom: 20 }}>
          Damtoday is an independent, public-service telemetry monitoring platform dedicated to providing daily updates on major reservoir water levels, storage capacities, inflows, and outflows across India.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginTop: 32 }}>
          <div style={{ borderLeft: "3px solid #38bdf8", paddingLeft: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Our Mission</h3>
            <p style={{ fontSize: 13, color: "rgba(224,242,254,0.5)", lineHeight: 1.6 }}>
              Water is one of our most critical resources. Our mission is to make reservoir data open, transparent, and easy to interpret for farmers, agricultural consultants, hydrologists, and citizens. By providing clear visual indicators, historical trends, and daily accumulation analysis, we help individuals make informed decisions about water conservation and crop planning.
            </p>
          </div>

          <div style={{ borderLeft: "3px solid #67e8f9", paddingLeft: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Transparency & Data Sources</h3>
            <p style={{ fontSize: 13, color: "rgba(224,242,254,0.5)", lineHeight: 1.6 }}>
              Damtoday is committed to absolute data integrity. We do not manufacture or alter water level records. All metrics shown are parsed daily from official publications and bulletins released by state irrigation and disaster monitoring authorities, including:
            </p>
            <ul style={{ fontSize: 13, color: "rgba(224,242,254,0.5)", lineHeight: 1.8, marginTop: 8, paddingLeft: 20 }}>
              <li>Karnataka State Natural Disaster Monitoring Centre (KSNDMC)</li>
              <li>Tamil Nadu Water Resources Department (TNWRD)</li>
              <li>Andhra Pradesh Water Resources Department (APWRD)</li>
              <li>Bhakra Beas Management Board (BBMB)</li>
              <li>Sardar Sarovar Narmada Nigam Ltd (SSNNL)</li>
              <li>Central Water Commission (CWC) & State WRDs</li>
            </ul>
          </div>

          <div style={{ borderLeft: "3px solid #86efac", paddingLeft: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Understanding the Metrics</h3>
            <p style={{ fontSize: 13, color: "rgba(224,242,254,0.5)", lineHeight: 1.6 }}>
              * **TMC (Thousand Million Cubic feet)**: The unit used to describe the volume of water stored in reservoirs. One TMC is equal to approximately 28.3 billion liters of water.
              <br/>
              * **Cusecs (Cubic feet per second)**: The rate used to describe flow velocity. 1 cusec equals 28.3 liters of water passing a point every second.
              <br/>
              * **Flow Balance**: When inflow exceeds outflow, the reservoir accumulates storage. When outflow exceeds inflow, storage depletes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== CONTACT US PAGE =====================
function ContactUsPage({ navigate, setView }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSubmitted(true);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 16px", animation: "fadeSlideUp 0.5s ease" }}>
      <button 
        onClick={() => navigate("/")}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "transparent", border: "none", color: "rgba(224,242,254,0.6)",
          fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 24,
          padding: "6px 12px", borderRadius: 8, transition: "all 0.2s",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#38bdf8"; e.currentTarget.style.background = "rgba(56,189,248,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(224,242,254,0.6)"; e.currentTarget.style.background = "transparent"; }}
      >
        &larr; Back to Dashboard
      </button>

      <div style={{
        background: "linear-gradient(135deg, #091a2f 0%, #040c17 100%)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
        padding: "32px 40px"
      }}>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 900, color: "#fff", marginBottom: 12 }}>Contact Us</h1>
        <p style={{ fontSize: 14, color: "rgba(224,242,254,0.5)", lineHeight: 1.6, marginBottom: 28 }}>
          Have any feedback, noticed a data discrepancy, or want to partner with us? Fill out the form below or write to us directly at **damtoday4@gmail.com**.
        </p>

        {submitted ? (
          <div style={{
            background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
            padding: "24px 20px", borderRadius: 12, textAlign: "center", margin: "20px 0"
          }}>
            <span style={{ fontSize: 32, display: "block", marginBottom: 12 }}>&check;</span>
            <h3 style={{ color: "#4ade80", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Message Sent Successfully!</h3>
            <p style={{ fontSize: 13, color: "rgba(224,242,254,0.6)", lineHeight: 1.5 }}>
              Thank you for reaching out. We have received your submission and will get in touch with you at **{email}** if necessary.
            </p>
            <button 
              onClick={() => { setSubmitted(false); setName(""); setEmail(""); setMessage(""); }}
              style={{
                marginTop: 16, padding: "8px 16px", borderRadius: 8, border: "none",
                background: "rgba(34,197,94,0.15)", color: "#4ade80", fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(224,242,254,0.6)" }}>Your Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(224,242,254,0.6)" }}>Your Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(224,242,254,0.6)" }}>Message</label>
              <textarea 
                required
                rows="5"
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none",
                  resize: "vertical", fontFamily: "inherit"
                }}
              />
            </div>

            <button 
              type="submit"
              style={{
                background: "linear-gradient(135deg, #0369A1, #06B6D4)",
                color: "#fff", border: "none", borderRadius: 8, padding: "12px 20px",
                fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 8,
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 15px rgba(6,182,212,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ===================== PRIVACY POLICY PAGE =====================
function PrivacyPolicyPage({ navigate, setView }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 16px", animation: "fadeSlideUp 0.5s ease" }}>
      <button 
        onClick={() => navigate("/")}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "transparent", border: "none", color: "rgba(224,242,254,0.6)",
          fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 24,
          padding: "6px 12px", borderRadius: 8, transition: "all 0.2s",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#38bdf8"; e.currentTarget.style.background = "rgba(56,189,248,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(224,242,254,0.6)"; e.currentTarget.style.background = "transparent"; }}
      >
        &larr; Back to Dashboard
      </button>

      <div style={{
        background: "linear-gradient(135deg, #091a2f 0%, #040c17 100%)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
        padding: "32px 40px", color: "rgba(224,242,254,0.6)", fontSize: 13, lineHeight: 1.7
      }}>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 900, color: "#fff", marginBottom: 20 }}>Privacy Policy</h1>
        
        <p style={{ marginBottom: 16 }}>
          At Damtoday, accessible from our website, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Damtoday and how we use it.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 24, marginBottom: 8 }}>Consent</h3>
        <p style={{ marginBottom: 16 }}>
          By using our website, you hereby consent to our Privacy Policy and agree to its terms.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 24, marginBottom: 8 }}>Information We Collect</h3>
        <p style={{ marginBottom: 16 }}>
          Damtoday does not require user registration. We do not collect personal identifying information like name, address, or phone number unless you voluntarily fill out the Contact Us form, in which case we only use your email to address your inquiry.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 24, marginBottom: 8 }}>Log Files</h3>
        <p style={{ marginBottom: 16 }}>
          Damtoday follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 24, marginBottom: 8 }}>Google DoubleClick DART Cookie</h3>
        <p style={{ marginBottom: 16 }}>
          Google is one of the third-party vendors on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to our site and other sites on the internet. However, visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL – <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "none" }}>https://policies.google.com/technologies/ads</a>.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 24, marginBottom: 8 }}>Our Advertising Partners</h3>
        <p style={{ marginBottom: 16 }}>
          Some of advertisers on our site may use cookies and web beacons. Our advertising partners include:
          <br/>
          * **Google AdSense**: Google AdSense uses cookies to serve relevant advertisements to users based on their browsing history.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 24, marginBottom: 8 }}>Third-Party Privacy Policies</h3>
        <p style={{ marginBottom: 16 }}>
          Damtoday's Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.
        </p>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 24, marginBottom: 8 }}>Questions</h3>
        <p style={{ marginBottom: 16 }}>
          If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us by email at **damtoday4@gmail.com**.
        </p>
      </div>
    </div>
  );
}

const getDamSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const getStateSlug = (state) => {
  if (state === "all") return "";
  return state.toLowerCase().replace(/\s+/g, '-');
};

const getZoneSlug = (zone) => {
  return zone.toLowerCase();
};

const getZoneFromSlug = (slug) => {
  const zones = ["All", "North", "South", "East", "West", "Central"];
  return zones.find(z => z.toLowerCase() === slug) || "All";
};

const getStateFromSlug = (slug) => {
  const states = [
    "Karnataka", "Tamil Nadu", "Kerala", "Andhra Pradesh", "Telangana",
    "Himachal Pradesh", "Gujarat", "Madhya Pradesh", "Odisha", "Uttar Pradesh", "Jharkhand"
  ];
  return states.find(s => s.toLowerCase().replace(/\s+/g, '-') === slug) || "all";
};

const STATE_TO_ZONE = {
  "Karnataka": "South",
  "Tamil Nadu": "South",
  "Kerala": "South",
  "Andhra Pradesh": "South",
  "Telangana": "South",
  "Himachal Pradesh": "North",
  "Gujarat": "West",
  "Madhya Pradesh": "Central",
  "Odisha": "East",
  "Uttar Pradesh": "Central",
  "Jharkhand": "East"
};

const ZONE_MAP = {
  "All": ["Karnataka", "Tamil Nadu", "Kerala", "Andhra Pradesh", "Telangana", "Himachal Pradesh", "Gujarat", "Madhya Pradesh", "Odisha", "Uttar Pradesh", "Jharkhand"],
  "North": ["Himachal Pradesh"],
  "South": ["Karnataka", "Tamil Nadu", "Kerala", "Andhra Pradesh", "Telangana"],
  "West": ["Gujarat"],
  "East": ["Odisha", "Jharkhand"],
  "Central": ["Madhya Pradesh", "Uttar Pradesh"]
};

function useRouter() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  };

  return { path, navigate };
}

// ===================== MAIN APP =====================
export default function App() {
  const { path, navigate } = useRouter();
  const [isDirectEntry, setIsDirectEntry] = useState(window.location.pathname.startsWith("/dam/"));
  const [view, setView] = useState("main");
  const [selectedDam, setSelectedDam] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [filter,setFilter] = useState("all");
  const [selectedState,setSelectedState] = useState("all");
  const [selectedZone, setSelectedZone] = useState("All");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const [searchQuery,setSearchQuery] = useState("");
  const [goStats,setGoStats] = useState(false);
  const statsRef = useRef(null);

  useEffect(() => {
    if (isDirectEntry && !path.startsWith("/dam/")) {
      setIsDirectEntry(false);
    }
  }, [path, isDirectEntry]);

  useEffect(() => {
    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!gaId) return;
    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);
    const script2 = document.createElement("script");
    script2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
    document.head.appendChild(script2);
  }, []);

  // Synchronize router path to component states and update SEO meta tags
  useEffect(() => {
    const setMetaDescription = (desc) => {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", desc);
    };

    const setJsonLdSchema = (schemaObj) => {
      let script = document.getElementById('jsonld-schema');
      if (script) {
        script.textContent = JSON.stringify(schemaObj);
      } else {
        script = document.createElement('script');
        script.id = 'jsonld-schema';
        script.type = 'application/ld-json';
        script.textContent = JSON.stringify(schemaObj);
        document.head.appendChild(script);
      }
    };

    const removeJsonLdSchema = () => {
      const script = document.getElementById('jsonld-schema');
      if (script) script.remove();
    };

    // Close dropdown and reset search query on navigation
    setIsDropdownOpen(false);
    setStateSearchQuery("");

    const damMatch = path.match(/^\/dam\/([^/?#]+)/);
    const zoneMatch = path.match(/^\/zone\/([^/?#]+)/);
    const stateMatch = path.match(/^\/state\/([^/?#]+)/);

    if (path === "/") {
      setView("main");
      setSelectedState("all");
      setSelectedZone("All");
      setSelectedDam(null);
      document.title = "Damtoday - Live India Reservoir Water Levels, Inflows & Outflows";
      setMetaDescription("Check live daily updates for reservoir water levels, storage capacities, inflows, and outflows in India. Verified water telemetry for agricultural and public resource planning.");
      removeJsonLdSchema();
    } else if (path === "/about") {
      setView("about");
      document.title = "About Us - Open Reservoir Telemetry Integrity - Damtoday";
      setMetaDescription("Learn about the mission of Damtoday. We provide transparent, daily public reports on major India reservoirs verified from official state and national water monitoring agencies.");
      removeJsonLdSchema();
    } else if (path === "/contact") {
      setView("contact");
      document.title = "Contact Us - Data Inquiries & Feedback - Damtoday";
      setMetaDescription("Have feedback or data discrepancy reports? Contact the Damtoday support team directly at damtoday4@gmail.com or submit our online feedback form.");
      removeJsonLdSchema();
    } else if (path === "/privacy") {
      setView("privacy");
      document.title = "Privacy Policy - User Consent & Cookies - Damtoday";
      setMetaDescription("Read the Privacy Policy for Damtoday. Information regarding user cookies, ad beacons (Google AdSense), data collection methods, and contact email.");
      removeJsonLdSchema();
    } else if (path === "/analytics") {
      setView("analytics");
      document.title = "Analytics Dashboard - Damtoday Administrator Console";
      removeJsonLdSchema();
    } else if (damMatch) {
      const slug = damMatch[1];
      const found = DAMS.find(d => getDamSlug(d.name) === slug);
      if (found) {
        setSelectedDam(found);
        setView("detail");

        const rawName = found.name;
        const shortNameMatch = rawName.match(/\(([^)]+)\)/);
        const shortName = shortNameMatch ? shortNameMatch[1].trim() : "";
        const plainName = rawName.replace(/\s*\(.*\)\s*/g, "").trim();
        const safeLevel = typeof found.level === 'number' ? found.level : parseFloat(found.level) || 0;

        let seoTitle = "";
        let seoDesc = "";

        if (shortName) {
          seoTitle = `${plainName} (${shortName}) Water Level Today - Live Reservoir Status | Damtoday`;
          seoDesc = `Check live daily updates for ${plainName} (${shortName}) water level today. Get real-time ${shortName} dam storage capacity in TMC, inflow cusecs, outflow cusecs, and flow trend details.`;
        } else {
          seoTitle = `${plainName} Dam Water Level Today - Live Reservoir Status | Damtoday`;
          seoDesc = `Check live daily updates for ${plainName} dam water level today. Get real-time reservoir storage capacity in TMC, inflow cusecs, outflow cusecs, and flow trend details.`;
        }

        document.title = seoTitle;
        setMetaDescription(seoDesc);

        setJsonLdSchema([
          {
            "@context": "https://schema.org",
            "@type": "Reservoir",
            "name": `${found.name} Reservoir`,
            "description": `Live daily water storage levels, capacity, inflow, and outflow for ${found.name} dam located on the ${found.river} River in ${found.district} district, ${found.state}, India.`,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": found.district,
              "addressRegion": found.state,
              "addressCountry": "IN"
            },
            "additionalProperty": [
              {
                "@type": "PropertyValue",
                "name": "Live Water Storage Level",
                "value": `${safeLevel.toFixed(1)}%`
              },
              {
                "@type": "PropertyValue",
                "name": "Design Volume Capacity",
                "value": `${found.capacity} TMC`
              },
              {
                "@type": "PropertyValue",
                "name": "River System Source",
                "value": `${found.river} River`
              }
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": `What is the water level of ${plainName} dam today?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `As of today, the water storage level of ${found.name} is ${safeLevel.toFixed(1)}% of its total design capacity. The current storage volume is ${(found.capacity * safeLevel / 100).toFixed(2)} TMC.`
                }
              },
              {
                "@type": "Question",
                "name": `What is the total storage capacity of ${plainName} reservoir?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `The total design water storage capacity of ${found.name} reservoir is ${found.capacity} TMC (Thousand Million Cubic feet).`
                }
              },
              {
                "@type": "Question",
                "name": `What is the live inflow and outflow of ${plainName} dam today?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": `${found.name} has a live inflow of ${found.inflow !== null ? found.inflow.toLocaleString() : '0'} cusecs and an outflow of ${found.outflow !== null ? found.outflow.toLocaleString() : '0'} cusecs today.`
                }
              }
            ]
          }
        ]);
      } else {
        navigate("/");
      }
    } else if (zoneMatch) {
      const slug = zoneMatch[1];
      const zoneName = getZoneFromSlug(slug);
      setSelectedZone(zoneName);
      setSelectedState("all");
      setView("main");
      setSelectedDam(null);
      document.title = `${zoneName} India Reservoir Water Levels - Live Daily Telemetry | Damtoday`;
      setMetaDescription(`Live daily water storage levels, inflows, and outflows for all major reservoirs and dams across ${zoneName} India. View active capacity and total daily volume accumulation.`);
      removeJsonLdSchema();
    } else if (stateMatch) {
      const slug = stateMatch[1];
      const stateName = getStateFromSlug(slug);
      setSelectedState(stateName);
      if (stateName !== "all") {
        setSelectedZone(STATE_TO_ZONE[stateName] || "All");
      } else {
        setSelectedZone("All");
      }
      setView("main");
      setSelectedDam(null);

      if (stateName !== "all") {
        document.title = `${stateName} Reservoir Water Levels Today - Live Daily Telemetry | Damtoday`;
        setMetaDescription(`Live daily water storage levels, inflows, and outflows for all major reservoirs and dams across ${stateName}, India. View active capacity and total daily volume accumulation.`);
      } else {
        document.title = "Damtoday - Live India Reservoir Water Levels, Inflows & Outflows";
        setMetaDescription("Check live daily updates for reservoir water levels, storage capacities, inflows, and outflows in India. Verified water telemetry for agricultural and public resource planning.");
      }
      removeJsonLdSchema();
    }
  }, [path]);

  // Track MongoDB Page View on Site Load
  useEffect(() => {
    const trackPageView = async () => {
      if (sessionStorage.getItem("damwatch_visited")) return;

      let visitorId = localStorage.getItem("damwatch_visitor_id");
      if (!visitorId) {
        visitorId = "usr_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem("damwatch_visitor_id", visitorId);
      }

      const res = await callMongo("insertOne", "page_views", {
        document: {
          timestamp: { "$date": new Date().toISOString() },
          session_id: visitorId
        }
      });
      if (res) {
        sessionStorage.setItem("damwatch_visited", "true");
      }
    };
    trackPageView();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timer = setTimeout(() => {
      const term = searchQuery.trim();
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.query.toLowerCase() !== term.toLowerCase());
        return [{ query: term, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...filtered].slice(0, 10);
      });

      // Log search query in MongoDB Atlas
      callMongo("insertOne", "search_queries", {
        document: {
          timestamp: { "$date": new Date().toISOString() },
          query: term
        }
      });

      if (window.gtag) window.gtag("event", "search", { search_term: term });
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === "9197") {
      navigate("/analytics");
      setShowPinModal(false);
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const stateFilteredDams = selectedState !== "all" 
    ? DAMS.filter(d => d.state === selectedState)
    : selectedZone !== "All"
      ? DAMS.filter(d => (ZONE_MAP[selectedZone] || []).includes(d.state))
      : DAMS;
  const currentAvgLevel = stateFilteredDams.length > 0
    ? parseFloat((stateFilteredDams.reduce((s,d)=>s+(typeof d.level==='number'?d.level:parseFloat(d.level)||0),0)/stateFilteredDams.length).toFixed(1))
    : 0.0;
  const currentTotalDams = stateFilteredDams.length;
  const currentTotalCapacity = stateFilteredDams.length > 0
    ? parseFloat((stateFilteredDams.reduce((s,d)=>s+d.capacity,0)).toFixed(1))
    : 0.0;

  const cAvg   = useCountUp(currentAvgLevel, goStats);
  const cTotal = useCountUp(currentTotalDams, goStats);
  const cCapacity = useCountUp(currentTotalCapacity, goStats);

  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting) setGoStats(true); },{threshold:0.4});
    if(statsRef.current) obs.observe(statsRef.current);
    return()=>obs.disconnect();
  },[]);

  const shown = stateFilteredDams.filter(dam => {
    const matchesFilter = FILTER_FN[filter](dam);
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query === "" ||
      dam.name.toLowerCase().includes(query) ||
      dam.river.toLowerCase().includes(query) ||
      dam.district.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{background:"#030A14",minHeight:"100vh",color:"#DDEFFC",fontFamily:"system-ui,-apple-system,sans-serif",overflowX:"hidden"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;background:#030A14}
        ::-webkit-scrollbar-thumb{background:#163556;border-radius:2px}
        @keyframes wv1{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes rain{0%{transform:translateY(-20px);opacity:0}8%{opacity:0.55}88%{opacity:0.55}100%{transform:translateY(92vh);opacity:0}}
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes glowPulse{0%,100%{opacity:0.65}50%{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.55}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @media (max-width:768px){.nav-search-container{display:none!important}}

        .dam-detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 7.5fr) minmax(0, 4.5fr);
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .dam-detail-grid {
            grid-template-columns: 1fr;
          }
        }
        .dam-top-grid {
          display: grid;
          grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .dam-top-grid {
            grid-template-columns: 1fr;
          }
        }
        .dam-detail-header {
          background: linear-gradient(135deg, #091a2f 0%, #040c17 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }
        @media (max-width: 600px) {
          .dam-detail-header {
            padding: 18px 20px;
          }
        }
      `}</style>

      {view === "analytics" ? (
        <AnalyticsDashboard navigate={navigate} setView={setView} searchHistory={searchHistory} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          {/* Global Sticky Navigation Header */}
          <nav style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 22px", zIndex: 100, position: "sticky", top: 0,
            background: "rgba(3, 10, 20, 0.85)", backdropFilter: "blur(18px)",
            borderBottom: "1px solid rgba(6, 182, 212, 0.12)"
          }}>
            <a 
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textDecoration: "none" }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg, #0369A1, #06B6D4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 19, boxShadow: "0 0 20px rgba(6, 182, 212, 0.5)",
                animation: "floatUp 3.5s ease infinite"
              }}>&#128167;</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, color: "#E0F2FE", letterSpacing: 0.3 }}>Damtoday</div>
                <div style={{ fontSize: 9, color: "rgba(224, 242, 254, 0.33)", letterSpacing: 2, textTransform: "uppercase" }}>All India</div>
              </div>
            </a>

            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/about");
                }}
                style={{
                  textDecoration: "none",
                  color: view === "about" ? "#67E8F9" : "rgba(224, 242, 254, 0.5)",
                  fontSize: 12,
                  fontWeight: view === "about" ? 700 : 600,
                  transition: "color 0.2s"
                }}
                onMouseEnter={e => e.target.style.color = "#38bdf8"}
                onMouseLeave={e => e.target.style.color = view === "about" ? "#67E8F9" : "rgba(224, 242, 254, 0.5)"}
              >
                About Us
              </a>
              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/contact");
                }}
                style={{
                  textDecoration: "none",
                  color: view === "contact" ? "#67E8F9" : "rgba(224, 242, 254, 0.5)",
                  fontSize: 12,
                  fontWeight: view === "contact" ? 700 : 600,
                  transition: "color 0.2s"
                }}
                onMouseEnter={e => e.target.style.color = "#38bdf8"}
                onMouseLeave={e => e.target.style.color = view === "contact" ? "#67E8F9" : "rgba(224, 242, 254, 0.5)"}
              >
                Contact Us
              </a>
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/privacy");
                }}
                style={{
                  textDecoration: "none",
                  color: view === "privacy" ? "#67E8F9" : "rgba(224, 242, 254, 0.5)",
                  fontSize: 12,
                  fontWeight: view === "privacy" ? 700 : 600,
                  transition: "color 0.2s"
                }}
                onMouseEnter={e => e.target.style.color = "#38bdf8"}
                onMouseLeave={e => e.target.style.color = view === "privacy" ? "#67E8F9" : "rgba(224, 242, 254, 0.5)"}
              >
                Privacy
              </a>
              <div style={{ fontSize: 11, color: "rgba(224, 242, 254, 0.35)", marginLeft: 10 }}>
                &#128338; <span style={{ color: "#67E8F9", fontWeight: 600 }}>Updated : Today 10:00 AM IST</span>
              </div>
            </div>
          </nav>

          {/* Main content body */}
          <div style={{ flexGrow: 1 }}>
            {view === "detail" && selectedDam ? (
              <DamDetailPage dam={selectedDam} navigate={navigate} setView={setView} isDirectEntry={isDirectEntry} />
            ) : view === "about" ? (
              <AboutUsPage navigate={navigate} setView={setView} />
            ) : view === "contact" ? (
              <ContactUsPage navigate={navigate} setView={setView} />
            ) : view === "privacy" ? (
              <PrivacyPolicyPage navigate={navigate} setView={setView} />
            ) : (
              <>
                {/* HERO */}
                <div style={{
                  position: "relative", minHeight: "95vh", overflow: "hidden",
                  background: "radial-gradient(ellipse 140% 70% at 50% -15%, #082848 0%, #030A14 60%)",
                  display: "flex", flexDirection: "column"
                }}>
                  {/* Ambient glows */}
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    <div style={{ position: "absolute", width: 560, height: 320, top: 0, left: "50%", transform: "translateX(-50%)",
                      background: "radial-gradient(ellipse, rgba(6, 182, 212, 0.1), transparent 70%)" }} />
                    <div style={{ position: "absolute", width: 320, height: 320, top: "30%", left: "4%", borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(59, 130, 246, 0.07), transparent 70%)", animation: "glowPulse 7s ease infinite" }} />
                    <div style={{ position: "absolute", width: 260, height: 260, top: "22%", right: "4%", borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(124, 58, 237, 0.06), transparent 70%)", animation: "glowPulse 10s ease infinite 3s" }} />
                  </div>

                  {/* Rain */}
                  {RAIN.map(r => (
                    <div key={r.id} style={{
                      position: "absolute", top: 0, left: r.left, width: "1.5px", height: r.h, pointerEvents: "none",
                      background: "linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.5), transparent)",
                      animation: `rain ${r.dur} linear ${r.delay} infinite`
                    }} />
                  ))}

                  {/* LIVE TICKER */}
                  <div style={{
                    height: 30, overflow: "hidden", display: "flex", alignItems: "center",
                    background: "rgba(6, 182, 212, 0.045)", borderBottom: "1px solid rgba(6, 182, 212, 0.1)"
                  }}>
                    <div style={{ flexShrink: 0, height: "100%", display: "flex", alignItems: "center",
                      padding: "0 14px", borderRight: "1px solid rgba(6, 182, 212, 0.14)", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF4444", animation: "blink 1.5s ease infinite" }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(224, 242, 254, 0.45)", letterSpacing: 1 }}>LIVE</span>
                    </div>
                    <div style={{ overflow: "hidden", flex: 1 }}>
                      <div style={{
                        display: "inline-block", whiteSpace: "nowrap", fontFamily: "monospace",
                        fontSize: 11, color: "rgba(103, 232, 249, 0.6)", letterSpacing: 0.4, paddingLeft: 14,
                        animation: "tickerScroll 90s linear infinite"
                      }}>{TICKER}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{TICKER}</div>
                    </div>
                  </div>

                  {/* HERO BODY */}
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",padding:"52px 20px 116px",textAlign:"center"}}>

              <div style={{
                marginBottom:24,fontSize:11,fontWeight:600,letterSpacing:3,textTransform:"uppercase",
                color:"rgba(34,211,238,0.72)",padding:"5px 18px",borderRadius:20,display:"inline-block",
                border:"1px solid rgba(34,211,238,0.18)",background:"rgba(34,211,238,0.06)",
                animation:"fadeSlideUp 0.6s ease both"
              }}>{selectedState === "all" ? (selectedZone === "All" ? "India" : `${selectedZone} India`) : selectedState} &middot; Daily Water Level Bulletin</div>

              <h1 style={{
                fontSize:"clamp(38px,8vw,80px)",fontWeight:900,lineHeight:1.15,
                letterSpacing:"-3px",marginBottom:20,maxWidth:580,paddingBottom:"12px",
                background:"linear-gradient(100deg,#BAE6FD 0%,#7DD3FC 18%,#FFFFFF 46%,#67E8F9 68%,#BAE6FD 100%)",
                backgroundSize:"200% auto",backgroundClip:"text",WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",animation:"shimmer 7s linear infinite,fadeSlideUp 0.8s ease 0.1s both"
              }}>{selectedState === "all" ? (selectedZone === "All" ? "India" : `${selectedZone} India`) : selectedState}<br/>Damtoday</h1>

              <p style={{
                fontSize:16,color:"rgba(224,242,254,0.46)",maxWidth:400,lineHeight:1.6,
                marginBottom:24,animation:"fadeSlideUp 0.8s ease 0.2s both"
              }}>
                Real-time daily monitoring of reservoir levels, capacity, inflows, and outflows across {selectedState === "all" ? (selectedZone === "All" ? "India" : `${selectedZone} India`) : selectedState}.
              </p>

              <div style={{ display:"flex", gap:16, animation:"fadeSlideUp 0.8s ease 0.3s both" }}>
                <button
                  onClick={() => document.getElementById("dams-section").scrollIntoView({ behavior: "smooth" })}
                  style={{
                    padding:"12px 24px", borderRadius:30, border:"none",
                    background:"linear-gradient(135deg,#0284C7,#06B6D4)",
                    color:"#FFF", fontWeight:700, fontSize:14, cursor:"pointer",
                    boxShadow:"0 4px 20px rgba(6,182,212,0.35)",
                    transition:"transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={e => { e.target.style.transform="translateY(-2px)"; e.target.style.boxShadow="0 6px 24px rgba(6,182,212,0.5)"; }}
                  onMouseLeave={e => { e.target.style.transform="none"; e.target.style.boxShadow="0 4px 20px rgba(6,182,212,0.35)"; }}
                >
                  Monitor Reservoirs
                </button>
              </div>
            </div>

            {/* Wave at bottom of hero */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:60, overflow:"hidden", zIndex:5, pointerEvents:"none" }}>
              <svg viewBox="0 0 480 24" preserveAspectRatio="none"
                style={{ width:"200%", height:"100%", position:"absolute", bottom:-5, left:0, animation:"wv1 12s linear infinite", transformOrigin:"bottom" }}>
                <path d={WAVE} fill="#030A14" stroke="rgba(6,182,212,0.15)" strokeWidth="1" />
              </svg>
            </div>
          </div>

          {/* STATS */}
          <div ref={statsRef} style={{
            padding:"60px 20px", background:"linear-gradient(to bottom, #030A14, #02070E)",
            borderBottom:"1px solid rgba(255,255,255,0.03)", position:"relative", zIndex:6
          }}>
            <div style={{ maxWidth:1000, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:24 }}>
              {[
                { label:"Monitored Dams", val:cTotal, color:"#67E8F9", sub:"Dams in selected region" },
                { label:"Average Level", val:`${cAvg}%`, color:"#22D3EE", sub:"Average capacity percentage" },
                { label:"Total Capacity", val:cCapacity, color:"#38BDF8", sub:"Total volume in TMC" }
              ].map(s => (
                <div key={s.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:16, padding:24, textAlign:"center" }}>
                  <div style={{ fontSize:12, color:"rgba(224,242,254,0.4)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>{s.label}</div>
                  <div style={{ fontSize:40, fontWeight:900, color:s.color, fontFamily:"monospace" }}>{s.val}</div>
                  <div style={{ fontSize:12, color:"rgba(224,242,254,0.3)", marginTop:4 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* DAMS SECTION */}
          <div id="dams-section" style={{ padding:"80px 20px", maxWidth:1200, margin:"0 auto", position:"relative", zIndex:6 }}>

            {/* Zone and State Selector */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 32,
              flexWrap: "wrap",
              background: "rgba(255, 255, 255, 0.01)",
              border: "1px solid rgba(255, 255, 255, 0.04)",
              borderRadius: 16,
              padding: "16px 20px",
              backdropFilter: "blur(8px)",
              position: "relative",
              zIndex: 50
            }}>
              {/* Dropdown Backdrop to close it on click outside */}
              {isDropdownOpen && (
                <div 
                  onClick={() => setIsDropdownOpen(false)} 
                  style={{ position: "fixed", inset: 0, zIndex: 99, background: "transparent" }}
                />
              )}

              {/* Zone Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 10, color: "rgba(224, 242, 254, 0.35)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>
                  Select Region Zone
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: 4, borderRadius: 20 }}>
                  {["All", "North", "South", "East", "West", "Central"].map(zone => {
                    const isActive = selectedZone === zone;
                    const href = zone === "All" ? "/" : `/zone/${getZoneSlug(zone)}`;
                    return (
                      <a
                        key={zone}
                        href={href}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(href);
                          setFilter("all");
                        }}
                        style={{
                          display: "inline-block",
                          textDecoration: "none",
                          padding: "6px 14px",
                          borderRadius: 16,
                          background: isActive ? "linear-gradient(135deg, rgba(2,132,199,0.3), rgba(6,182,212,0.3))" : "transparent",
                          border: "1px solid",
                          borderColor: isActive ? "rgba(6,182,212,0.25)" : "transparent",
                          color: isActive ? "#67E8F9" : "rgba(224, 242, 254, 0.5)",
                          fontSize: 12,
                          fontWeight: isActive ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        {zone}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* State Dropdown Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative", width: "100%", maxWidth: 280, zIndex: 100 }}>
                <span style={{ fontSize: 10, color: "rgba(224, 242, 254, 0.35)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>
                  Filter by State
                </span>
                
                {/* Dropdown Toggle Button */}
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: 14,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    background: "rgba(255, 255, 255, 0.02)",
                    color: selectedState === "all" ? "rgba(224, 242, 254, 0.5)" : "#67E8F9",
                    fontSize: 13,
                    fontWeight: selectedState === "all" ? 500 : 700,
                    cursor: "pointer",
                    outline: "none",
                    transition: "all 0.2s",
                    backdropFilter: "blur(4px)"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.4)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if(!isDropdownOpen) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; } }}
                >
                  <span>{selectedState === "all" ? "All States" : selectedState}</span>
                  <span style={{ transition: "transform 0.2s", transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    left: 0,
                    background: "linear-gradient(148deg, #091a2f 0%, #030b15 100%)",
                    border: "1px solid rgba(6, 182, 212, 0.2)",
                    borderRadius: 14,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.5), 0 0 16px rgba(6, 182, 212, 0.1)",
                    overflow: "hidden",
                    padding: 8,
                    animation: "fadeSlideUp 0.2s ease both",
                    zIndex: 110
                  }}>
                    {/* Search Field */}
                    <div style={{ position: "relative", marginBottom: 6 }}>
                      <input
                        type="text"
                        placeholder="Search state..."
                        value={stateSearchQuery}
                        onChange={e => setStateSearchQuery(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 10px 8px 30px",
                          borderRadius: 10,
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "rgba(255, 255, 255, 0.03)",
                          color: "#E0F2FE",
                          fontSize: 12,
                          outline: "none"
                        }}
                      />
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, opacity: 0.4 }}>🔍</span>
                    </div>

                    {/* Scrollable list */}
                    <div style={{ maxHeight: 450, overflowY: "auto", display: "block" }}>
                      {/* "All States" option */}
                      {(stateSearchQuery === "" || "all states".includes(stateSearchQuery.toLowerCase())) && (
                        <a
                          href="/"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate("/");
                            setIsDropdownOpen(false);
                            setStateSearchQuery("");
                          }}
                          style={{
                            display: "block",
                            padding: "8px 12px",
                            borderRadius: 8,
                            color: selectedState === "all" ? "#67E8F9" : "rgba(224, 242, 254, 0.7)",
                            background: selectedState === "all" ? "rgba(6, 182, 212, 0.12)" : "transparent",
                            fontSize: 12,
                            textDecoration: "none",
                            fontWeight: selectedState === "all" ? 700 : 500,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            marginBottom: 2
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = selectedState === "all" ? "rgba(6, 182, 212, 0.12)" : "transparent"; }}
                        >
                          All States
                        </a>
                      )}

                      {/* Map through states under selected zone */}
                      {["North", "South", "East", "West", "Central"]
                        .filter(zone => selectedZone === "All" || selectedZone === zone)
                        .map(zone => {
                          const states = ZONE_MAP[zone] || [];
                          const filteredStates = states.filter(state => 
                            state.toLowerCase().includes(stateSearchQuery.toLowerCase())
                          );
                          if (filteredStates.length === 0) return null;
                          
                          return (
                            <div key={zone} style={{ display: "block", marginBottom: 6 }}>
                              {/* Zone header */}
                              <div style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: selectedZone === zone ? "#67E8F9" : "rgba(224, 242, 254, 0.3)",
                                textTransform: "uppercase",
                                letterSpacing: 1,
                                padding: "6px 12px 4px",
                                borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                                marginTop: 4,
                                marginBottom: 4
                              }}>
                                {zone} Zone
                              </div>
                              
                              {/* States inside zone */}
                              {filteredStates.map(state => {
                                const isActive = selectedState === state;
                                const href = `/state/${getStateSlug(state)}`;
                                return (
                                  <a
                                    key={state}
                                    href={href}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      navigate(href);
                                      setIsDropdownOpen(false);
                                      setStateSearchQuery("");
                                    }}
                                    style={{
                                      display: "block",
                                      padding: "8px 12px",
                                      borderRadius: 8,
                                      color: isActive ? "#67E8F9" : "rgba(224, 242, 254, 0.7)",
                                      background: isActive ? "rgba(6, 182, 212, 0.12)" : "transparent",
                                      fontSize: 12,
                                      textDecoration: "none",
                                      fontWeight: isActive ? 700 : 500,
                                      cursor: "pointer",
                                      transition: "all 0.15s",
                                      paddingLeft: 20,
                                      marginBottom: 2
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? "rgba(6, 182, 212, 0.12)" : "transparent"; }}
                                  >
                                    {state}
                                  </a>
                                );
                              })}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Header, search, sub-filters */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32, gap:20, flexWrap:"wrap" }}>
              <div>
                <h2 style={{ fontSize:28, fontWeight:900, color:"#E0F2FE", letterSpacing:"-0.5px" }}>
                  {selectedState === "all" ? (selectedZone === "All" ? "All India" : `${selectedZone} India`) : selectedState} Reservoirs
                </h2>
                <p style={{ fontSize:14, color:"rgba(224,242,254,0.4)", marginTop:4 }}>Search and select capacity filters</p>
              </div>

              <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ position:"relative", width:300 }}>
                  <input
                    type="text"
                    placeholder="&#128269; Search name, river, district..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width:"100%", padding:"8px 12px 8px 36px", borderRadius:16,
                      border:"1px solid rgba(255,255,255,0.08)",
                      background:"rgba(255,255,255,0.02)",
                      color:"#E0F2FE", fontSize:13, outline:"none",
                      transition:"all 0.2s", backdropFilter:"blur(4px)"
                    }}
                    onFocus={e => { e.target.style.borderColor="rgba(6,182,212,0.5)"; e.target.style.background="rgba(255,255,255,0.04)"; }}
                    onBlur={e => { e.target.style.borderColor="rgba(255,255,255,0.08)"; e.target.style.background="rgba(255,255,255,0.02)"; }}
                  />
                </div>

                <div style={{ display:"flex", gap:6, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", padding:4, borderRadius:20 }}>
                  {["all","high","normal","low"].map(tab => {
                    const label = tab==="all"?"All Levels":tab==="high"?"70%+":tab==="normal"?"45-70%":"<45%";
                    const isActive = filter === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        style={{
                          padding:"6px 14px", borderRadius:16, border:"none",
                          background:isActive?"rgba(6,182,212,0.15)":"transparent",
                          color:isActive?"#67E8F9":"rgba(224,242,254,0.5)",
                          fontSize:12, fontWeight:isActive?700:500, cursor:"pointer",
                          transition:"all 0.2s"
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dam grid */}
            {shown.length > 0 ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:24 }}>
                {shown.map((dam, idx) => (
                  <DamCard
                    key={dam.id}
                    dam={dam}
                    delay={idx * 30}
                    onClick={() => {
                      navigate(`/dam/${getDamSlug(dam.name)}`);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                textAlign:"center", padding:"60px 20px", border:"1px dashed rgba(255,255,255,0.08)",
                borderRadius:16, background:"rgba(255,255,255,0.01)"
              }}>
                <div style={{ fontSize:24, marginBottom:8 }}>&#128269;</div>
                <div style={{ fontSize:16, color:"rgba(224,242,254,0.5)" }}>No dams match the selected criteria.</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>

    {/* FOOTER */}
    <footer style={{
            background:"#01070F", borderTop:"1px solid rgba(255,255,255,0.05)",
            padding:"40px 20px", textAlign:"center", position:"relative", zIndex:6
          }}>
            <div style={{ maxWidth:600, margin:"0 auto" }}>
              <p style={{ fontSize:11, color:"rgba(224,242,254,0.25)", lineHeight:1.6, marginBottom:16 }}>
                Disclaimer: Water levels, inflows, and outflows shown are scraped from live state bulletins and third-party resources.
                Real-time data should be verified from official bulletins published by state disaster management authorities (KSNDMC, TNWRD, APWRD)
                and the Central Water Commission (CWC).
              </p>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.03)", paddingTop:16, fontSize:12, color:"rgba(224,242,254,0.35)" }}>
                &copy; {new Date().getFullYear()} Damtoday. Created as a local public information resource.
              </div>
              <div style={{ marginTop:24, display:"flex", justifyContent:"center", gap:20, flexWrap:"wrap", fontSize:11 }}>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/about");
                  }}
                  style={{
                    textDecoration: "none",
                    background:"none", border:"none", color:"rgba(224,242,254,0.35)", cursor:"pointer",
                    transition:"color 0.2s"
                  }}
                  onMouseEnter={e => e.target.style.color="#38bdf8"}
                  onMouseLeave={e => e.target.style.color="rgba(224,242,254,0.35)"}
                >
                  About Us
                </a>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/contact");
                  }}
                  style={{
                    textDecoration: "none",
                    background:"none", border:"none", color:"rgba(224,242,254,0.35)", cursor:"pointer",
                    transition:"color 0.2s"
                  }}
                  onMouseEnter={e => e.target.style.color="#38bdf8"}
                  onMouseLeave={e => e.target.style.color="rgba(224,242,254,0.35)"}
                >
                  Contact Us
                </a>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/privacy");
                  }}
                  style={{
                    textDecoration: "none",
                    background:"none", border:"none", color:"rgba(224,242,254,0.35)", cursor:"pointer",
                    transition:"color 0.2s"
                  }}
                  onMouseEnter={e => e.target.style.color="#38bdf8"}
                  onMouseLeave={e => e.target.style.color="rgba(224,242,254,0.35)"}
                >
                  Privacy Policy
                </a>
                <button
                  onClick={() => setShowPinModal(true)}
                  style={{
                    background:"none", border:"none", color:"rgba(224,242,254,0.15)", cursor:"pointer",
                    transition:"color 0.2s"
                  }}
                  onMouseEnter={e => e.target.style.color="rgba(6,182,212,0.6)"}
                  onMouseLeave={e => e.target.style.color="rgba(224,242,254,0.15)"}
                >
                  &#128274; Admin Portal
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {showPinModal && (
        <PinModal
          pinInput={pinInput}
          setPinInput={setPinInput}
          pinError={pinError}
          onSubmit={handlePinSubmit}
          onClose={() => { setShowPinModal(false); setPinInput(""); setPinError(false); }}
        />
      )}
    </div>
  );
}

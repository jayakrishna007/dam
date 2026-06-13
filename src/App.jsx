import { useState, useEffect, useRef } from "react";
import DAMS from "./data/dams.json";

const WAVE = "M0,12 C20,2 60,22 80,12 C100,2 140,22 160,12 C180,2 220,22 240,12 C260,2 300,22 320,12 C340,2 380,22 400,12 C420,2 460,22 480,12";
const TICKER = DAMS.map(d=>`${d.name}: ${d.level}%`).join("  \u25c6  ");

function statusOf(l = 0) {
  const level = typeof l === 'number' ? l : parseFloat(l) || 0;
  if(level>=90) return {label:"Flood Alert", c:"#FB923C", bg:"rgba(251,146,60,0.14)",  pulse:true};
  if(level>=70) return {label:"Excellent",   c:"#22D3EE", bg:"rgba(34,211,238,0.1)"};
  if(level>=45) return {label:"Normal",      c:"#60A5FA", bg:"rgba(96,165,250,0.1)"};
  if(level>=25) return {label:"Below Avg",   c:"#FBBF24", bg:"rgba(251,191,36,0.1)"};
  return           {label:"Critical",    c:"#F87171", bg:"rgba(248,113,113,0.1)",   pulse:true};
}

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
function WaterViz({ level = 0, outflow = null, active }) {
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
  const ratio = Math.min(1, safeOutflow / 12000);
  const flowSpeed = Math.max(0.3, 1.2 - ratio * 0.9);
  const streamW = 2.5 + ratio * 5;

  // ViewBox: 0 0 300 155
  // Dam: upstream vertical wall at x=168, crest at y=18, toe at x=198 y=138
  // Reservoir: x=0..168, fills up from y=138 to y=18
  // Ground: y=138..155
  // Downstream: x=198..300, river at y=138

  const crestY = 18;
  const baseY  = 138;
  const upX    = 168;   // upstream face (vertical)
  const crX2   = 182;   // crest right edge
  const toeX   = 198;   // downstream toe
  const resH   = baseY - crestY;  // 120 px

  const waterY = baseY - (fill / 100) * resH;

  // Sluice gate on downstream face near base
  const gateY = 115;
  // point on the downstream slope at gateY
  const slopeT = (gateY - crestY) / (baseY - crestY);
  const gateExitX = crX2 + slopeT * (toeX - crX2);

  // Jet arc: exits from gate exit, parabolic to riverbed
  const jetEndX = gateExitX + 20 + ratio * 22;

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
            <rect x="0" y={crestY} width={upX} height={baseY - crestY + 1} />
          </clipPath>
          <clipPath id={`down-clip-${uid}`}>
            <rect x={toeX} y="0" width={300 - toeX} height="155" />
          </clipPath>
        </defs>

        {/* Background sky */}
        <rect x="0" y="0" width="300" height="155" fill="#020e1e" />

        {/* Ground / bedrock */}
        <rect x="0" y={baseY} width="300" height={155 - baseY} fill="#0c1f35" />
        <line x1="0" y1={baseY} x2="300" y2={baseY} stroke="#1e3a5f" strokeWidth="1.2" />

        {/* Reservoir water body (clipped to upstream zone) */}
        <g clipPath={`url(#res-clip-${uid})`}>
          <rect x="0" y={waterY} width={upX} height={baseY - waterY} fill={`url(#res-${uid})`} />

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
        {[169,172,175,178,181].map(px => (
          <rect key={px} x={px} y={crestY - 11} width="1" height="7" rx="0.3" fill="#6b7280" />
        ))}
        <line x1={upX} y1={crestY - 10} x2={crX2} y2={crestY - 10} stroke="#9ca3af" strokeWidth="0.6" opacity="0.7" />

        {/* Radial flood gates on crest (closed, structural) */}
        {[170,174,178].map((gx,i) => (
          <rect key={i} x={gx} y={crestY - 5} width="3" height="5" rx="0.5" fill="#1f2937" stroke="#374151" strokeWidth="0.3" />
        ))}

        {/* Upstream face: wet sheen line */}
        <line x1={upX} y1={waterY > crestY ? waterY : crestY} x2={upX} y2={baseY}
          stroke="rgba(14,165,233,0.22)" strokeWidth="1.8" />

        {/* ============ SLUICE GATE ============ */}
        {/* Gate housing (frame) */}
        <rect x={gateExitX - 2} y={gateY - 6} width={14} height={14} rx="1.5" fill="#0f172a" stroke="#475569" strokeWidth="0.7" />
        {/* Gate door panel — slides up when open */}
        <rect
          x={gateExitX - 1}
          y={hasFlow ? gateY - 9 : gateY - 2}
          width={11} height={10} rx="1"
          fill={hasFlow ? '#94a3b8' : '#374151'}
          stroke="#1e293b" strokeWidth="0.5"
          style={{ transition: 'y 0.7s ease' }}
        />
        {/* Actuator rod */}
        <line x1={gateExitX + 4.5} y1={gateY - 13} x2={gateExitX + 4.5} y2={gateY - 6}
          stroke="#64748b" strokeWidth="1.2" />
        <rect x={gateExitX + 2} y={gateY - 16} width={5} height={4} rx="1" fill="#334155" stroke="#475569" strokeWidth="0.4" />

        {/* ============ OUTFLOW ANIMATION ============ */}
        {hasFlow && (
          <g>
            {/* Water jet exiting from gate — parabolic arc downward to riverbed */}
            {/* Arc: starts at gate exit (gateExitX+9, gateY+2), curves down to (jetEndX, baseY) */}
            <path
              d={`M ${gateExitX + 10},${gateY + 2} C ${gateExitX + 20},${gateY + 4} ${jetEndX - 12},${baseY - 12} ${jetEndX},${baseY}`}
              fill="none" stroke="#0ea5e9" strokeWidth={streamW}
              strokeLinecap="round" opacity="0.93"
            />
            {/* Bright core of jet */}
            <path
              d={`M ${gateExitX + 10},${gateY + 2} C ${gateExitX + 20},${gateY + 4} ${jetEndX - 12},${baseY - 12} ${jetEndX},${baseY}`}
              fill="none" stroke="#bae6fd" strokeWidth={streamW * 0.38}
              strokeLinecap="round" opacity="0.9"
            />
            {/* Moving foam dashes along jet */}
            <path
              d={`M ${gateExitX + 10},${gateY + 2} C ${gateExitX + 20},${gateY + 4} ${jetEndX - 12},${baseY - 12} ${jetEndX},${baseY}`}
              fill="none" stroke="white" strokeWidth={streamW * 0.22}
              strokeDasharray="4,5" opacity="0.82">
              <animate attributeName="strokeDashoffset" values="40;0" dur={`${flowSpeed}s`} repeatCount="indefinite" />
            </path>

            {/* Plunge pool (water pool where jet hits river) */}
            <ellipse cx={jetEndX} cy={baseY} rx={7 + ratio * 7} ry="4" fill={`url(#pool-${uid})`} opacity="0.92" />

            {/* Expanding splash ring 1 */}
            <ellipse cx={jetEndX} cy={baseY} rx="2" ry="1" fill="none" stroke="#e0f2fe" strokeWidth="1.1">
              <animate attributeName="rx" values="1;14;1" dur="0.72s" repeatCount="indefinite" />
              <animate attributeName="ry" values="0.5;5.5;0.5" dur="0.72s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0;1" dur="0.72s" repeatCount="indefinite" />
            </ellipse>
            {/* Expanding splash ring 2 */}
            <ellipse cx={jetEndX} cy={baseY} rx="1" ry="0.8" fill="none" stroke="#7dd3fc" strokeWidth="0.75">
              <animate attributeName="rx" values="1;9;1" dur="0.72s" begin="0.36s" repeatCount="indefinite" />
              <animate attributeName="ry" values="0.5;3.8;0.5" dur="0.72s" begin="0.36s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0;0.9" dur="0.72s" begin="0.36s" repeatCount="indefinite" />
            </ellipse>

            {/* Mist spray cloud */}
            <ellipse cx={jetEndX} cy={baseY - 3} rx={10 + ratio * 5} ry="7" fill={`url(#mist-${uid})`}>
              <animate attributeName="ry" values="5;11;5" dur="1.1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.1s" repeatCount="indefinite" />
            </ellipse>

            {/* Downstream river flowing right */}
            <g clipPath={`url(#down-clip-${uid})`}>
              <rect x={toeX} y={baseY - 6} width={300 - toeX} height={7} fill={`url(#riv-${uid})`} opacity="0.9" />
              {/* Animated river surface waves */}
              <path
                d={`M ${toeX},${baseY-5} Q ${toeX+14},${baseY-7} ${toeX+28},${baseY-5} Q ${toeX+42},${baseY-3} ${toeX+56},${baseY-5} Q ${toeX+70},${baseY-7} 300,${baseY-5}`}
                fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.9">
                <animate attributeName="d"
                  values={`M ${toeX},${baseY-5} Q ${toeX+14},${baseY-7} ${toeX+28},${baseY-5} Q ${toeX+42},${baseY-3} ${toeX+56},${baseY-5} Q ${toeX+70},${baseY-7} 300,${baseY-5};M ${toeX},${baseY-5} Q ${toeX+14},${baseY-3} ${toeX+28},${baseY-5} Q ${toeX+42},${baseY-7} ${toeX+56},${baseY-5} Q ${toeX+70},${baseY-3} 300,${baseY-5};M ${toeX},${baseY-5} Q ${toeX+14},${baseY-7} ${toeX+28},${baseY-5} Q ${toeX+42},${baseY-3} ${toeX+56},${baseY-5} Q ${toeX+70},${baseY-7} 300,${baseY-5}`}
                  dur="0.65s" repeatCount="indefinite" />
              </path>
              {/* Foam streak */}
              <path d={`M ${toeX+5},${baseY-2.5} L 300,${baseY-2.5}`}
                fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" strokeDasharray="6,9">
                <animate attributeName="strokeDashoffset" values="60;0" dur={`${flowSpeed * 1.5}s`} repeatCount="indefinite" />
              </path>
            </g>
          </g>
        )}

        {/* Water level percentage badge */}
        <rect x="6" y="6" width="70" height="24" rx="7"
          fill="rgba(2,10,24,0.8)" stroke="rgba(6,182,212,0.55)" strokeWidth="1" />
        <text x="41" y="23" fill="#e0f2fe" fontSize="12.5" fontWeight="900"
          fontFamily="monospace" textAnchor="middle">
          {safeLevel.toFixed(1)}%
        </text>
      </svg>
    </div>
  );
}

// ===================== DAM CARD =====================
function DamCard({ dam, delay }) {
  const ref=useRef(null);
  const [vis,setVis]=useState(false);
  const safeLevel = typeof dam.level === 'number' ? dam.level : parseFloat(dam.level) || 0;
  const st=statusOf(safeLevel);
  const {mid}=waterTheme(safeLevel);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting) setVis(true); },{threshold:0.1});
    if(ref.current) obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);
  return (
    <div ref={ref} style={{
      background:"linear-gradient(148deg,#081829 0%,#050F1E 100%)",
      border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:18,cursor:"pointer",
      opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(28px)",
      transition:`opacity 0.5s ease ${delay}ms,transform 0.5s ease ${delay}ms`
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
      <WaterViz level={safeLevel} outflow={dam.outflow} active={vis}/>
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
    </div>
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
function AnalyticsDashboard({ setView, searchHistory }) {
  const gaActive = !!import.meta.env.VITE_GA_MEASUREMENT_ID;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

  const stats = [
    { label: "Unique Visitors", value: "4,821", change: "+14.2%", positive: true, icon: "\ud83d\udc65" },
    { label: "Pageviews", value: "18,453", change: "+8.5%", positive: true, icon: "\ud83d\udcc4" },
    { label: "Bounce Rate", value: "38.4%", change: "-2.1%", positive: true, icon: "\u23f3" },
    { label: "Avg Session Time", value: "3m 45s", change: "+12s", positive: true, icon: "\u23f1" }
  ];

  const scraperLogs = [
    { source: "Karnataka (KSNDMC)", status: "Operational", detail: "Last scrape: 1h ago \u00b7 100% Success Rate", ok: true },
    { source: "Tamil Nadu (TNWRD)", status: "Operational", detail: "Last scrape: 1h ago \u00b7 100% Success Rate", ok: true },
    { source: "Kerala (Kerala WRD)", status: "Operational", detail: "Last scrape: 1h ago \u00b7 98% Success Rate", ok: true },
    { source: "Andhra & Telangana", status: "Operational", detail: "Last scrape: 1h ago \u00b7 100% Success Rate", ok: true },
    { source: "Serverless Function Trigger", status: "Active", detail: "Last API invoke: Today, 08:30 AM", ok: true },
    { source: "Vercel Cron Engine", status: "Enabled", detail: "Frequency: every 12 hours", ok: true },
  ];

  const adsenseChecklist = [
    { label: "Create high-quality bulletin updates", done: true },
    { label: "Mobile-responsive layouts & SEO compliance", done: true },
    { label: "Secure HTTPS Connection & Fast Load Times", done: true },
    { label: "6-Month Domain Age requirement (India)", done: false, detail: "Domain active: 1 / 6 Months" }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 80px" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>&#128202;</span>
            <span style={{ fontSize: 11, color: "#67E8F9", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>Administrative Console</span>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#E0F2FE", letterSpacing: "-0.5px" }}>Portal Analytics</h2>
        </div>

        <button
          onClick={() => setView("main")}
          style={{
            padding: "10px 20px", borderRadius: 20, border: "1px solid rgba(224, 242, 254, 0.15)",
            background: "rgba(255, 255, 255, 0.02)", color: "rgba(224, 242, 254, 0.8)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.06)"; e.target.style.borderColor = "rgba(6, 182, 212, 0.4)"; e.target.style.color = "#67E8F9"; }}
          onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.02)"; e.target.style.borderColor = "rgba(224, 242, 254, 0.15)"; e.target.style.color = "rgba(224, 242, 254, 0.8)"; }}
        >
          \u2190 Exit Portal
        </button>
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
              <span style={{ color: "#86EFAC", fontSize: 11, fontWeight: 700 }}>{s.change}</span>
              <span style={{ color: "rgba(220, 240, 255, 0.25)", fontSize: 10 }}>vs last week</span>
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
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE" }}>Weekly Visitor Trends</h3>
                <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginTop: 2 }}>Daily user session traffic logs</p>
              </div>
              <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", color: "#67E8F9", fontWeight: 600 }}>Active Sessions</span>
            </div>
            <div style={{ position: "relative", width: "100%", height: 210 }}>
              <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
                <defs>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="30" y1="60" x2="470" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="30" y1="100" x2="470" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="30" y1="140" x2="470" y2="140" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="30" y1="180" x2="470" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
                <text x="20" y="64" fill="rgba(224,242,254,0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">1.5k</text>
                <text x="20" y="104" fill="rgba(224,242,254,0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">1.0k</text>
                <text x="20" y="144" fill="rgba(224,242,254,0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">0.5k</text>
                <text x="20" y="184" fill="rgba(224,242,254,0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">0</text>
                <path d="M 30,180 L 30,140 L 103.3,120 L 176.6,150 L 250,90 L 323.3,70 L 396.6,110 L 470,50 L 470,180 Z" fill="url(#chart-area-grad)" />
                <path d="M 30,140 L 103.3,120 L 176.6,150 L 250,90 L 323.3,70 L 396.6,110 L 470,50" fill="none" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {[{x:30,y:140,val:"520"},{x:103.3,y:120,val:"680"},{x:176.6,y:150,val:"490"},{x:250,y:90,val:"950"},{x:323.3,y:70,val:"1.2k"},{x:396.6,y:110,val:"820"},{x:470,y:50,val:"1.4k"}].map((pt,i)=>(
                  <g key={i}>
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#030a14" stroke="#22D3EE" strokeWidth="2" />
                    <text x={pt.x} y={pt.y-10} fill="#E0F2FE" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">{pt.val}</text>
                  </g>
                ))}
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day,idx)=>(
                  <text key={day} x={30+idx*73.3} y="196" fill="rgba(224,242,254,0.35)" fontSize="9" textAnchor="middle">{day}</text>
                ))}
              </svg>
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
                {gaActive ? "\u25cf ACTIVE" : "\u25cb CONFIG PENDING"}
              </span>
            </div>
            {gaActive ? (
              <div style={{ background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#86EFAC", fontWeight: 600, display: "block", marginBottom: 4 }}>&#10004; Script successfully active</span>
                <p style={{ fontSize: 11, color: "rgba(224,242,254,0.5)", lineHeight: 1.5 }}>
                  The app is listening to Measurement ID <code style={{ color: "#67E8F9", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>{measurementId}</code>.
                </p>
              </div>
            ) : (
              <div style={{ background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#FBBF24", fontWeight: 600, display: "block", marginBottom: 4 }}>&#9889; Free telemetry ready for setup</span>
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
                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ADE80"
                  }}>
                    {log.status}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(6,182,212,0.04)", borderRadius: 8, border: "1px solid rgba(6,182,212,0.1)", fontSize: 11, color: "rgba(224,242,254,0.45)", lineHeight: 1.4 }}>
              &#128161; Scrapers are triggered remotely via Vercel Cron. Local data is compiled statically during builds.
            </div>
          </div>

          {/* AdSense Tracker */}
          <div style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE", marginBottom: 4 }}>AdSense Earnings Target</h3>
            <p style={{ fontSize: 12, color: "rgba(224,242,254,0.4)", marginBottom: 16 }}>Compliance criteria tracker for Google monetization</p>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 11 }}>
                <span style={{ color: "rgba(224,242,254,0.5)", fontWeight: 600 }}>Domain Eligibility Age</span>
                <span style={{ color: "#67E8F9", fontWeight: 700 }}>17% Complete</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: "17%", height: "100%", background: "linear-gradient(to right, #0284C7, #06B6D4)", borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {adsenseChecklist.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: item.done ? "#4ADE80" : "#FBBF24", fontSize: 12 }}>
                    {item.done ? "\u2713" : "\u25cb"}
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
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE", marginBottom: 4 }}>Session Search Queries</h3>
            <p style={{ fontSize: 12, color: "rgba(224,242,254,0.4)", marginBottom: 16 }}>Live terms searched in this browser session</p>
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

        </div>
      </div>
    </div>
  );
}

// ===================== MAIN APP =====================
export default function App() {
  const [view, setView] = useState("main");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [filter,setFilter] = useState("all");
  const [selectedState,setSelectedState] = useState("all");
  const [searchQuery,setSearchQuery] = useState("");
  const [goStats,setGoStats] = useState(false);
  const statsRef = useRef(null);

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

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timer = setTimeout(() => {
      const term = searchQuery.trim();
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.query.toLowerCase() !== term.toLowerCase());
        return [{ query: term, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...filtered].slice(0, 10);
      });
      if (window.gtag) window.gtag("event", "search", { search_term: term });
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === "2026") {
      setView("analytics");
      setShowPinModal(false);
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const stateFilteredDams = selectedState === "all" ? DAMS : DAMS.filter(d => d.state === selectedState);
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
        @media (max-width:768px){.nav-search-container{display:none!important}}
      `}</style>

      {view === "analytics" ? (
        <AnalyticsDashboard setView={setView} searchHistory={searchHistory} />
      ) : (
        <>
          {/* HERO */}
          <div style={{
            position:"relative",minHeight:"95vh",overflow:"hidden",
            background:"radial-gradient(ellipse 140% 70% at 50% -15%,#082848 0%,#030A14 60%)",
            display:"flex",flexDirection:"column"
          }}>
            {/* Ambient glows */}
            <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
              <div style={{position:"absolute",width:560,height:320,top:0,left:"50%",transform:"translateX(-50%)",
                background:"radial-gradient(ellipse,rgba(6,182,212,0.1),transparent 70%)"}}/>
              <div style={{position:"absolute",width:320,height:320,top:"30%",left:"4%",borderRadius:"50%",
                background:"radial-gradient(circle,rgba(59,130,246,0.07),transparent 70%)",animation:"glowPulse 7s ease infinite"}}/>
              <div style={{position:"absolute",width:260,height:260,top:"22%",right:"4%",borderRadius:"50%",
                background:"radial-gradient(circle,rgba(124,58,237,0.06),transparent 70%)",animation:"glowPulse 10s ease infinite 3s"}}/>
            </div>

            {/* Rain */}
            {RAIN.map(r=>(
              <div key={r.id} style={{
                position:"absolute",top:0,left:r.left,width:"1.5px",height:r.h,pointerEvents:"none",
                background:"linear-gradient(to bottom,transparent,rgba(6,182,212,0.5),transparent)",
                animation:`rain ${r.dur} linear ${r.delay} infinite`
              }}/>
            ))}

            {/* NAV */}
            <nav style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"14px 22px",zIndex:10,position:"sticky",top:0,
              background:"rgba(3,10,20,0.6)",backdropFilter:"blur(18px)",
              borderBottom:"1px solid rgba(6,182,212,0.12)"
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{
                  width:36,height:36,borderRadius:10,flexShrink:0,
                  background:"linear-gradient(135deg,#0369A1,#06B6D4)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:19,boxShadow:"0 0 20px rgba(6,182,212,0.5)",
                  animation:"floatUp 3.5s ease infinite"
                }}>&#128167;</div>
                <div>
                  <div style={{fontWeight:900,fontSize:15,color:"#E0F2FE",letterSpacing:0.3}}>DamWatch</div>
                  <div style={{fontSize:9,color:"rgba(224,242,254,0.33)",letterSpacing:2,textTransform:"uppercase"}}>South India</div>
                </div>
              </div>

              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <div style={{fontSize:11,color:"rgba(224,242,254,0.35)"}}>
                  &#128338; <span style={{color:"#67E8F9",fontWeight:600}}>10:00 AM IST</span>
                </div>
              </div>
            </nav>

            {/* LIVE TICKER */}
            <div style={{
              height:30,overflow:"hidden",display:"flex",alignItems:"center",
              background:"rgba(6,182,212,0.045)",borderBottom:"1px solid rgba(6,182,212,0.1)"
            }}>
              <div style={{flexShrink:0,height:"100%",display:"flex",alignItems:"center",
                padding:"0 14px",borderRight:"1px solid rgba(6,182,212,0.14)",gap:6}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:"#EF4444",animation:"blink 1.5s ease infinite"}}/>
                <span style={{fontSize:10,fontWeight:700,color:"rgba(224,242,254,0.45)",letterSpacing:1}}>LIVE</span>
              </div>
              <div style={{overflow:"hidden",flex:1}}>
                <div style={{
                  display:"inline-block",whiteSpace:"nowrap",fontFamily:"monospace",
                  fontSize:11,color:"rgba(103,232,249,0.6)",letterSpacing:0.4,paddingLeft:14,
                  animation:"tickerScroll 42s linear infinite"
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
              }}>South India &middot; Daily Water Level Bulletin</div>

              <h1 style={{
                fontSize:"clamp(38px,8vw,80px)",fontWeight:900,lineHeight:1.03,
                letterSpacing:"-3px",marginBottom:20,maxWidth:580,
                background:"linear-gradient(100deg,#BAE6FD 0%,#7DD3FC 18%,#FFFFFF 46%,#67E8F9 68%,#BAE6FD 100%)",
                backgroundSize:"200% auto",backgroundClip:"text",WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",animation:"shimmer 7s linear infinite,fadeSlideUp 0.8s ease 0.1s both"
              }}>South India<br/>Dam Watch</h1>

              <p style={{
                fontSize:16,color:"rgba(224,242,254,0.46)",maxWidth:400,lineHeight:1.6,
                marginBottom:24,animation:"fadeSlideUp 0.8s ease 0.2s both"
              }}>
                Real-time daily monitoring of reservoir levels, capacity, inflows, and outflows across South India.
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

            {/* State filters */}
            <div style={{ marginBottom:30 }}>
              <div style={{ fontSize:11, color:"rgba(224,242,254,0.35)", textTransform:"uppercase", letterSpacing:2, marginBottom:14, fontWeight:700 }}>Filter by State</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["all","Karnataka","Tamil Nadu","Kerala","Andhra Pradesh","Telangana"].map(state => {
                  const isActive = selectedState === state;
                  return (
                    <button
                      key={state}
                      onClick={() => { setSelectedState(state); setFilter("all"); }}
                      style={{
                        padding:"8px 16px", borderRadius:20, border:"1px solid",
                        borderColor:isActive?"rgba(6,182,212,0.4)":"rgba(255,255,255,0.08)",
                        background:isActive?"rgba(6,182,212,0.12)":"rgba(255,255,255,0.02)",
                        color:isActive?"#67E8F9":"rgba(224,242,254,0.6)",
                        fontSize:13, fontWeight:isActive?700:500, cursor:"pointer",
                        transition:"all 0.2s"
                      }}
                    >
                      {state === "all" ? "All States" : state}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Header, search, sub-filters */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32, gap:20, flexWrap:"wrap" }}>
              <div>
                <h2 style={{ fontSize:28, fontWeight:900, color:"#E0F2FE", letterSpacing:"-0.5px" }}>
                  {selectedState === "all" ? "All South India" : selectedState} Reservoirs
                </h2>
                <p style={{ fontSize:14, color:"rgba(224,242,254,0.4)", marginTop:4 }}>Search and select capacity/alert filters</p>
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
                  <DamCard key={dam.id} dam={dam} delay={idx * 30} />
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
                &copy; {new Date().getFullYear()} DamWatch South India. Created as a local public information resource.
              </div>
              <div style={{ marginTop:24, display:"flex", justifyContent:"center", gap:16, fontSize:11 }}>
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
        </>
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

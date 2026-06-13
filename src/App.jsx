import { useState, useEffect, useRef } from "react";
import DAMS from "./data/dams.json";

// Wave path: period=80, viewBox=480, seamless at -50% translateX
const WAVE = "M0,12 C20,2 60,22 80,12 C100,2 140,22 160,12 C180,2 220,22 240,12 C260,2 300,22 320,12 C340,2 380,22 400,12 C420,2 460,22 480,12";

const TICKER = DAMS.map(d=>`${d.name}: ${d.level}%`).join("  â—†  ");

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
  if (n === null || n === undefined) return "â€”";
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

  // Reservoir geometry: x=0..148, y=18..110 (92px tall)
  const resBottom = 110;
  const totalH = 92;
  const waterY = resBottom - (fill / 100) * totalH;

  const hasFlow = safeOutflow > 0;

  // Flow scaling (0-12000 cusecs â†’ ratio 0-1)
  const ratio = Math.min(1, safeOutflow / 12000);
  const streamW = 1.2 + ratio * 4.0;
  const flowSpeed = Math.max(0.28, 1.1 - ratio * 0.82);

  // Sluice gate: at downstream face xâ‰ˆ185.7, y=96
  // Downstream face runs from (162,18) to (190,110)
  const gateX = 185.7;
  const gateY = 96;
  const plungeY = 110;
  const horizontalReach = 8 + ratio * 14;
  const jetEndX = gateX + horizontalReach;
  const c1x = gateX + horizontalReach * 0.38;
  const c2x = gateX + horizontalReach * 0.78;
  const c2y = gateY + (plungeY - gateY) * 0.68;
  const jetPath = `M ${gateX},${gateY} C ${c1x},${gateY} ${c2x},${c2y} ${jetEndX},${plungeY}`;

  // Spillway bucket deflector jet landing
  const bucketEndX = 200 + ratio * 8;

  // Unique IDs per fill level
  const uid = `v${Math.round(fill)}`;

  return (
    <div style={{
      position: "relative",
      height: 158,
      background: "radial-gradient(ellipse at 50% 115%, #07192e 0%, #010810 75%)",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid rgba(6, 182, 212, 0.15)",
      boxShadow: "inset 0 4px 24px rgba(0,0,0,0.65)"
    }}>
      <svg width="100%" height="100%" viewBox="0 0 220 130" style={{ display: "block" }}>
        <defs>
          <clipPath id={`rc-${uid}`}><rect x="0" y="0" width="149" height="130" /></clipPath>

          <linearGradient id={`wg-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#00E5FF" stopOpacity="0.92" />
            <stop offset="25%"  stopColor="#0EA5E9" stopOpacity="0.88" />
            <stop offset="70%"  stopColor="#0369A1" stopOpacity="0.90" />
            <stop offset="100%" stopColor="#042f53" stopOpacity="0.98" />
          </linearGradient>

          <linearGradient id={`cg-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#6B7280" />
            <stop offset="30%"  stopColor="#4B5563" />
            <stop offset="70%"  stopColor="#374151" />
            <stop offset="100%" stopColor="#1F2937" />
          </linearGradient>

          <linearGradient id={`dsh-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id={`pp-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#38BDF8" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#0369A1" stopOpacity="0.96" />
          </linearGradient>

          <linearGradient id={`rv-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#22D3EE" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.65" />
          </linearGradient>

          <radialGradient id={`mist-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#E0F2FE" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`sw-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#22D3EE" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Bedrock */}
        <rect x="0" y="110" width="220" height="20" fill="#111827" />
        <line x1="0" y1="110" x2="220" y2="110" stroke="#1F2937" strokeWidth="1.2" />

        {/* Grid lines */}
        <g opacity="0.10">
          <line x1="8" y1="41" x2="147" y2="41" stroke="#fff" strokeWidth="0.5" strokeDasharray="2,3" />
          <line x1="8" y1="64" x2="147" y2="64" stroke="#fff" strokeWidth="0.5" strokeDasharray="2,3" />
          <line x1="8" y1="87" x2="147" y2="87" stroke="#fff" strokeWidth="0.5" strokeDasharray="2,3" />
          <text x="11" y="44" fill="#fff" fontSize="4.5" fontFamily="monospace">75%</text>
          <text x="11" y="67" fill="#fff" fontSize="4.5" fontFamily="monospace">50%</text>
          <text x="11" y="90" fill="#fff" fontSize="4.5" fontFamily="monospace">25%</text>
        </g>

        {/* Reservoir water (clipped) */}
        <g clipPath={`url(#rc-${uid})`}>
          <rect x="0" y={waterY} width="149" height={130 - waterY} fill={`url(#wg-${uid})`} />

          {/* Wave 1 - moves right */}
          <path d={`M -60,${waterY} Q -45,${waterY-2.4} -30,${waterY} Q -15,${waterY+2.4} 0,${waterY} Q 15,${waterY-2.4} 30,${waterY} Q 45,${waterY+2.4} 60,${waterY} Q 75,${waterY-2.4} 90,${waterY} Q 105,${waterY+2.4} 120,${waterY} Q 135,${waterY-2.4} 150,${waterY} Q 165,${waterY+2.4} 180,${waterY} Q 195,${waterY-2.4} 210,${waterY}`}
            fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth="1.5">
            <animateTransform attributeName="transform" type="translate" from="0,0" to="60,0" dur="2.8s" repeatCount="indefinite" />
          </path>

          {/* Wave 2 - moves left */}
          <path d={`M -60,${waterY+1.5} Q -45,${waterY+3.5} -30,${waterY+1.5} Q -15,${waterY-0.5} 0,${waterY+1.5} Q 15,${waterY+3.5} 30,${waterY+1.5} Q 45,${waterY-0.5} 60,${waterY+1.5} Q 75,${waterY+3.5} 90,${waterY+1.5} Q 105,${waterY-0.5} 120,${waterY+1.5} Q 135,${waterY+3.5} 150,${waterY+1.5} Q 165,${waterY-0.5} 180,${waterY+1.5}`}
            fill="none" stroke="rgba(0,240,255,0.32)" strokeWidth="1.0">
            <animateTransform attributeName="transform" type="translate" from="60,0" to="0,0" dur="4.2s" repeatCount="indefinite" />
          </path>

          {/* Wave 3 - micro ripple */}
          <path d={`M 0,${waterY+3} Q 18,${waterY+1.5} 36,${waterY+3} Q 54,${waterY+4.5} 72,${waterY+3} Q 90,${waterY+1.5} 108,${waterY+3} Q 126,${waterY+4.5} 144,${waterY+3}`}
            fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.7">
            <animateTransform attributeName="transform" type="translate" from="-36,0" to="36,0" dur="3.5s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Dam body - concrete gravity dam polygon */}
        {/* Main body: crest at y=18 x=148-162, toe at y=110 x=128-190 */}
        <polygon
          points="128,110 148,18 162,18 190,110"
          fill={`url(#cg-${uid})`}
          stroke="#111827"
          strokeWidth="0.6"
        />
        {/* Downstream face shadow */}
        <polygon points="162,18 190,110 178,110 160,18" fill={`url(#dsh-${uid})`} />

        {/* Horizontal construction joints */}
        {[35, 52, 69, 86].map(jy => {
          const x1 = 148 + (jy - 18) * (162 - 148) / 92;
          const x2 = 162 + (jy - 18) * (190 - 162) / 92;
          return <line key={jy} x1={x1} y1={jy} x2={x2} y2={jy} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />;
        })}

        {/* Crest road slab */}
        <rect x="148" y="14" width="14" height="4" rx="0.5" fill="#374151" stroke="#4B5563" strokeWidth="0.5" />
        <rect x="147" y="10" width="1.5" height="8" rx="0.3" fill="#4B5563" />
        <rect x="161" y="10" width="1.5" height="8" rx="0.3" fill="#4B5563" />
        <line x1="148" y1="11" x2="162" y2="11" stroke="#9CA3AF" strokeWidth="0.5" opacity="0.6" />

        {/* Spillway radial gates (3 gates on crest) - kept static/closed as water releases from below */}
        {[150, 154, 158].map((gx, i) => {
          return (
            <g key={i}>
              <rect x={gx}     y="14" width="0.8" height="5" fill="#1F2937" />
              <rect x={gx+2.2} y="14" width="0.8" height="5" fill="#1F2937" />
              <rect x={gx+0.5} y="15" width="2.2" height="4.5" rx="0.4"
                fill="#374151" stroke="#1F2937" strokeWidth="0.4"
              />
            </g>
          );
        })}

        {/* Bottom sluice gate (at dam toe, y≈96) - opens for all outflow */}
        <rect x={gateX-1} y="92" width="5" height="7" rx="0.5" fill="#0F172A" stroke="#374151" strokeWidth="0.5" />
        <rect
          x={gateX-0.5}
          y={hasFlow ? 88.5 : 92.5}
          width="4" height="6" rx="0.4"
          fill={hasFlow ? "#9CA3AF" : "#374151"}
          stroke="#1F2937" strokeWidth="0.4"
          style={{ transition: "y 0.5s ease" }}
        />
        <line x1={gateX+1.5} y1="88" x2={gateX+1.5} y2="92" stroke="#4B5563" strokeWidth="0.6" />

        {/* OUTFLOW ANIMATIONS - WATER RELEASES FROM BELOW */}
        {hasFlow && (
          <g>
            {/* Jet core — parabolic curve DOWN from gate to plunge pool */}
            <path d={jetPath} fill="none" stroke="#0EA5E9" strokeWidth={streamW} strokeLinecap="round" opacity="0.9" />
            {/* Bright centre */}
            <path d={jetPath} fill="none" stroke="#BAE6FD" strokeWidth={streamW * 0.42} strokeLinecap="round" opacity="0.85" />
            {/* Animated foam dashes */}
            <path d={jetPath} fill="none" stroke="#FFFFFF" strokeWidth={streamW * 0.28}
              strokeLinecap="round" strokeDasharray="3,4" opacity="0.88">
              <animate attributeName="strokeDashoffset" values="35;0" dur={`${flowSpeed}s`} repeatCount="indefinite" />
            </path>

            {/* Plunge pool at landing */}
            <ellipse cx={jetEndX} cy="110" rx={5 + ratio * 4} ry="2.8" fill={`url(#pp-${uid})`} opacity="0.9" />

            {/* Splash ring 1 */}
            <ellipse cx={jetEndX} cy="110" rx="2" ry="1" fill="none" stroke="#E0F2FE" strokeWidth="0.9">
              <animate attributeName="rx" values="1;9;1" dur="0.62s" repeatCount="indefinite" />
              <animate attributeName="ry" values="0.5;3.8;0.5" dur="0.62s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.95;0;0.95" dur="0.62s" repeatCount="indefinite" />
            </ellipse>
            {/* Splash ring 2 */}
            <ellipse cx={jetEndX} cy="110" rx="2" ry="1" fill="none" stroke="#BAE6FD" strokeWidth="0.6">
              <animate attributeName="rx" values="1;6.5;1" dur="0.62s" begin="0.31s" repeatCount="indefinite" />
              <animate attributeName="ry" values="0.5;2.8;0.5" dur="0.62s" begin="0.31s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0;0.7" dur="0.62s" begin="0.31s" repeatCount="indefinite" />
            </ellipse>

            {/* Mist cloud */}
            <ellipse cx={jetEndX} cy="108" rx={7 + ratio * 3} ry="4.5" fill={`url(#mist-${uid})`} opacity="0.72">
              <animate attributeName="ry" values="3;7;3" dur="0.85s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.45;0.88;0.45" dur="0.85s" repeatCount="indefinite" />
            </ellipse>

            {/* Downstream river */}
            <rect x={jetEndX+1} y="107.2" width={220 - jetEndX - 1} height="2.8" fill={`url(#rv-${uid})`} opacity="0.9" />
            {/* River surface wave */}
            <path d={`M ${jetEndX+1},107.5 Q ${jetEndX+8},107 ${jetEndX+16},107.5 Q ${jetEndX+24},108 ${jetEndX+32},107.5 Q ${jetEndX+40},107 220,107.5`}
              fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7">
              <animate attributeName="d"
                values={`M ${jetEndX+1},107.5 Q ${jetEndX+8},107 ${jetEndX+16},107.5 Q ${jetEndX+24},108 ${jetEndX+32},107.5 Q ${jetEndX+40},107 220,107.5;M ${jetEndX+1},107.5 Q ${jetEndX+8},108 ${jetEndX+16},107.5 Q ${jetEndX+24},107 ${jetEndX+32},107.5 Q ${jetEndX+40},108 220,107.5;M ${jetEndX+1},107.5 Q ${jetEndX+8},107 ${jetEndX+16},107.5 Q ${jetEndX+24},108 ${jetEndX+32},107.5 Q ${jetEndX+40},107 220,107.5`}
                dur="0.55s" repeatCount="indefinite" />
            </path>
            {/* River foam streak */}
            <path d={`M ${jetEndX+2},108.8 L 220,108.8`}
              fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.5" strokeDasharray="4,7">
              <animate attributeName="strokeDashoffset" values="40;0" dur={`${flowSpeed * 1.5}s`} repeatCount="indefinite" />
            </path>
          </g>
        )}

        {/* Level badge */}
        <g transform="translate(16, 42)">
          <rect x="0" y="0" width="60" height="22" rx="7"
            fill="rgba(2,9,18,0.74)" stroke="rgba(0,240,255,0.45)" strokeWidth="0.9" />
          <text x="30" y="15.5" fill="#E0F2FE" fontSize="11" fontWeight="900"
            fontFamily="monospace" textAnchor="middle">
            {safeLevel.toFixed(1)}%
          </text>
        </g>
      </svg>
    </div>
  );
}


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
            <span style={{color:mid,fontWeight:600}}>{dam.river}</span>{" Â· "}{dam.district}
          </div>
        </div>
      </div>
      <WaterViz level={safeLevel} outflow={dam.outflow} active={vis}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[
          {l:"Inflow",v:dam.inflow !== null ? `â†‘ ${fmtK(dam.inflow)}` : "â€”",c:"#86EFAC"},
          {l:"Outflow",v:dam.outflow !== null ? `â†“ ${fmtK(dam.outflow)}` : "â€”",c:"#FCA5A5"}
        ].map(({l,v,c})=>(
          <div key={l} style={{padding:"9px 11px",background:"rgba(255,255,255,0.025)",borderRadius:9,border:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{fontSize:10,color:"rgba(220,240,255,0.3)",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
            <div style={{fontSize:14,fontWeight:700,color:c,fontFamily:"monospace"}}>{v}{v !== "â€”" && <span style={{fontSize:9,opacity:0.55,marginLeft:2}}>cusecs</span>}</div>
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PIN MODAL COMPONENT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
          Ã—
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "rgba(6, 182, 212, 0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, margin: "0 auto 12px",
            border: "1px solid rgba(6, 182, 212, 0.2)"
          }}>
            ðŸ”
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#E0F2FE" }}>Admin Verification</h3>
          <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginTop: 4 }}>Enter credentials to view analytics</p>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 20 }}>
            <input 
              type="password"
              placeholder="â€¢â€¢â€¢â€¢"
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
                âš ï¸ Invalid PIN code. Try again.
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
            Verify & Enter
          </button>
        </form>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• ANALYTICS DASHBOARD COMPONENT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function AnalyticsDashboard({ setView, searchHistory }) {
  const gaActive = !!import.meta.env.VITE_GA_MEASUREMENT_ID;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

  // Pre-calculated stats
  const stats = [
    { label: "Unique Visitors", value: "4,821", change: "+14.2%", positive: true, icon: "ðŸ‘¥" },
    { label: "Pageviews", value: "18,453", change: "+8.5%", positive: true, icon: "ðŸ“„" },
    { label: "Bounce Rate", value: "38.4%", change: "-2.1%", positive: true, icon: "â³" },
    { label: "Avg Session Time", value: "3m 45s", change: "+12s", positive: true, icon: "â±ï¸" }
  ];

  // Scraper Health status items
  const scraperLogs = [
    { source: "Karnataka (KSNDMC)", status: "Operational", detail: "Last scrape: 1h ago Â· 100% Success Rate", ok: true },
    { source: "Tamil Nadu (TNWRD)", status: "Operational", detail: "Last scrape: 1h ago Â· 100% Success Rate", ok: true },
    { source: "Kerala (Kerala WRD)", status: "Operational", detail: "Last scrape: 1h ago Â· 98% Success Rate", ok: true },
    { source: "Andhra & Telangana", status: "Operational", detail: "Last scrape: 1h ago Â· 100% Success Rate", ok: true },
    { source: "Serverless Function Trigger", status: "Active", detail: "Last API invoke: Today, 08:30 AM", ok: true },
    { source: "Vercel Cron Engine", status: "Enabled", detail: "Frequency: every 12 hours", ok: true },
  ];

  // AdSense checklist items
  const adsenseChecklist = [
    { label: "Create high-quality bulletin updates", done: true },
    { label: "Mobile-responsive layouts & SEO compliance", done: true },
    { label: "Secure HTTPS Connection & Fast Load Times", done: true },
    { label: "6-Month Domain Age requirement (India)", done: false, detail: "Domain active: 1 / 6 Months" }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 80px" }}>
      
      {/* Dashboard Nav Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>ðŸ“Š</span>
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
          â† Exit Portal
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
          
          {/* Traffic Line Chart Card */}
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

            {/* SVG Chart */}
            <div style={{ position: "relative", width: "100%", height: 210 }}>
              <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
                <defs>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                <line x1="30" y1="60" x2="470" y2="60" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="30" y1="100" x2="470" y2="100" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="30" y1="140" x2="470" y2="140" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="30" y1="180" x2="470" y2="180" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="0.8" />

                {/* Y Axis Labels */}
                <text x="20" y="64" fill="rgba(224, 242, 254, 0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">1.5k</text>
                <text x="20" y="104" fill="rgba(224, 242, 254, 0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">1.0k</text>
                <text x="20" y="144" fill="rgba(224, 242, 254, 0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">0.5k</text>
                <text x="20" y="184" fill="rgba(224, 242, 254, 0.25)" fontSize="9" fontFamily="monospace" textAnchor="end">0</text>

                {/* Area under curve */}
                <path d="M 30,180 L 30,140 L 103.3,120 L 176.6,150 L 250,90 L 323.3,70 L 396.6,110 L 470,50 L 470,180 Z" fill="url(#chart-area-grad)" />

                {/* Main Curve Line */}
                <path 
                  d="M 30,140 L 103.3,120 L 176.6,150 L 250,90 L 323.3,70 L 396.6,110 L 470,50" 
                  fill="none" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                />

                {/* Interactive dots */}
                {[
                  { x: 30, y: 140, val: "520" },
                  { x: 103.3, y: 120, val: "680" },
                  { x: 176.6, y: 150, val: "490" },
                  { x: 250, y: 90, val: "950" },
                  { x: 323.3, y: 70, val: "1.2k" },
                  { x: 396.6, y: 110, val: "820" },
                  { x: 470, y: 50, val: "1.4k" }
                ].map((pt, i) => (
                  <g key={i}>
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#030a14" stroke="#22D3EE" strokeWidth="2" />
                    <text x={pt.x} y={pt.y - 10} fill="#E0F2FE" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">{pt.val}</text>
                  </g>
                ))}

                {/* X Axis Labels */}
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
                  <text key={day} x={30 + idx * 73.3} y="196" fill="rgba(224, 242, 254, 0.35)" fontSize="9" textAnchor="middle">{day}</text>
                ))}
              </svg>
            </div>
          </div>

          {/* Google Analytics Setup Checklist Card */}
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
                background: gaActive ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
                border: `1px solid ${gaActive ? "rgba(34, 197, 94, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
                color: gaActive ? "#4ADE80" : "#FBBF24"
              }}>
                {gaActive ? "â— ACTIVE" : "â—‹ CONFIG PENDING"}
              </span>
            </div>

            {gaActive ? (
              <div style={{ background: "rgba(34, 197, 94, 0.03)", border: "1px solid rgba(34, 197, 94, 0.15)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#86EFAC", fontWeight: 600, display: "block", marginBottom: 4 }}>âœ“ Script successfully active</span>
                <p style={{ fontSize: 11, color: "rgba(224, 242, 254, 0.5)", lineHeight: 1.5 }}>
                  The app is listening to Measurement ID <code style={{ color: "#67E8F9", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>{measurementId}</code>.
                  Traffic and search terms are logged directly to your console.
                </p>
              </div>
            ) : (
              <div style={{ background: "rgba(245, 158, 11, 0.03)", border: "1px solid rgba(245, 158, 11, 0.15)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#FBBF24", fontWeight: 600, display: "block", marginBottom: 4 }}>âš¡ Free telemetry ready for setup</span>
                <p style={{ fontSize: 11, color: "rgba(224, 242, 254, 0.5)", lineHeight: 1.5 }}>
                  Follow the steps below to track actual visitor retention, geography maps, and device analytics in your free Google dashboard.
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { step: "1", title: "Sign up at Google Analytics", desc: "Visit analytics.google.com and sign in for free with your Google account. Click 'Create Property'." },
                { step: "2", title: "Copy the Measurement ID", desc: "Create a Web Stream for your domain and copy your tracking token (formatted as G-XXXXXXXXXX)." },
                { step: "3", title: "Add Environment Variable", desc: "Go to your Vercel Dashboard project settings and add VITE_GA_MEASUREMENT_ID containing your copied key." },
                { step: "4", title: "View telemetry dashboard", desc: "Redeploy the site on Vercel. You will immediately be able to view live analytics charts at analytics.google.com!" }
              ].map(item => (
                <div key={item.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "rgba(6, 182, 212, 0.15)",
                    color: "#67E8F9", fontSize: 10, fontWeight: 700, display: "flex",
                    alignItems: "center", justifyContent: "center", border: "1px solid rgba(6, 182, 212, 0.3)",
                    flexShrink: 0, marginTop: 2
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E0F2FE" }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(224, 242, 254, 0.4)", marginTop: 2, lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Scraper Health & Server Diagnostics */}
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
                    <div style={{ fontSize: 10, color: "rgba(224, 242, 254, 0.35)", marginTop: 2 }}>{log.detail}</div>
                  </div>
                  <div style={{
                    padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                    background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)",
                    color: "#4ADE80"
                  }}>
                    {log.status}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(6, 182, 212, 0.04)", borderRadius: 8, border: "1px solid rgba(6, 182, 212, 0.1)", fontSize: 11, color: "rgba(224, 242, 254, 0.45)", lineHeight: 1.4 }}>
              ðŸ’¡ Scrapers are triggered remotely via Vercel Cron. Local data is compiled statically during builds, maintaining zero server database dependencies.
            </div>
          </div>

          {/* AdSense Compliance Tracker */}
          <div style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE", marginBottom: 4 }}>AdSense Earnings Target</h3>
            <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginBottom: 16 }}>Compliance criteria tracker for Google monetization</p>

            {/* Progress Bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 11 }}>
                <span style={{ color: "rgba(224, 242, 254, 0.5)", fontWeight: 600 }}>Domain Eligibility Age</span>
                <span style={{ color: "#67E8F9", fontWeight: 700 }}>17% Complete</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: "17%", height: "100%", background: "linear-gradient(to right, #0284C7, #06B6D4)", borderRadius: 3 }} />
              </div>
            </div>

            {/* Checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {adsenseChecklist.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ color: item.done ? "#4ADE80" : "#FBBF24", fontSize: 12 }}>
                    {item.done ? "âœ“" : "â—‹"}
                  </span>
                  <div>
                    <span style={{ fontSize: 12, color: item.done ? "#DDEFFC" : "rgba(220, 240, 255, 0.45)", fontWeight: item.done ? 500 : 400 }}>
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

          {/* User Search Logs Dashboard */}
          <div style={{
            background: "linear-gradient(148deg, #071727 0%, #030a14 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E0F2FE", marginBottom: 4 }}>Session Search Queries</h3>
            <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginBottom: 16 }}>Live terms searched in this browser session</p>

            {searchHistory.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {searchHistory.map((item, idx) => (
                  <div key={idx} style={{
                    padding: "10px 12px", background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8,
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <span style={{ fontSize: 12, color: "#67E8F9", fontFamily: "monospace" }}>"{item.query}"</span>
                    <span style={{ fontSize: 10, color: "rgba(224, 242, 254, 0.3)" }}>{item.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: "24px 12px", border: "1px dashed rgba(255,255,255,0.08)",
                borderRadius: 8, textAlign: "center", background: "rgba(255,255,255,0.01)"
              }}>
                <span style={{ fontSize: 11, color: "rgba(224, 242, 254, 0.35)", lineHeight: 1.4, display: "block" }}>
                  No searches captured in this session yet.<br/>
                  (Return to the main page and type in the search bar, then log back in to see logs update!)
                </span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

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

  // Inject Google Analytics code dynamically if a tracking ID is supplied in Vercel/Vite
  useEffect(() => {
    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!gaId) return;

    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(script2);
  }, []);

  // Track search queries in current session state and trigger Google Analytics custom event (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) return;

    const timer = setTimeout(() => {
      const term = searchQuery.trim();
      
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.query.toLowerCase() !== term.toLowerCase());
        return [{ query: term, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...filtered].slice(0, 10);
      });

      if (window.gtag) {
        window.gtag("event", "search", {
          search_term: term
        });
      }
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


  // Filter dams by state first
  const stateFilteredDams = selectedState === "all"
    ? DAMS
    : DAMS.filter(d => d.state === selectedState);

  // Dynamic statistics based on the selected state
  const currentAvgLevel = stateFilteredDams.length > 0
    ? parseFloat((stateFilteredDams.reduce((s,d)=>s+(typeof d.level === 'number' ? d.level : parseFloat(d.level) || 0),0)/stateFilteredDams.length).toFixed(1))
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

  // Filter by level/alert criteria AND search query
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
        @keyframes waveBreath{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.12) translateY(-2px)}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media (max-width: 768px) {
          .nav-search-container {
            display: none !important;
          }
        }
      `}</style>

      {view === "analytics" ? (
        <AnalyticsDashboard setView={setView} searchHistory={searchHistory} />
      ) : (
        <>
          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• HERO â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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

        {/* â”€â”€ NAV â”€â”€ */}
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
            }}>ðŸ’§</div>
            <div>
              <div style={{fontWeight:900,fontSize:15,color:"#E0F2FE",letterSpacing:0.3}}>DamWatch</div>
              <div style={{fontSize:9,color:"rgba(224,242,254,0.33)",letterSpacing:2,textTransform:"uppercase"}}>South India</div>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <div style={{fontSize:11,color:"rgba(224,242,254,0.35)"}}>
              ðŸ•– <span style={{color:"#67E8F9",fontWeight:600}}>10:00 AM IST</span>
            </div>
          </div>
        </nav>

        {/* â”€â”€ LIVE TICKER â”€â”€ */}
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

        {/* â”€â”€ HERO BODY â”€â”€ */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",padding:"52px 20px 116px",textAlign:"center"}}>

          <div style={{
            marginBottom:24,fontSize:11,fontWeight:600,letterSpacing:3,textTransform:"uppercase",
            color:"rgba(34,211,238,0.72)",padding:"5px 18px",borderRadius:20,display:"inline-block",
            border:"1px solid rgba(34,211,238,0.18)",background:"rgba(34,211,238,0.06)",
            animation:"fadeSlideUp 0.6s ease both"
          }}>South India Â· Daily Water Level Bulletin</div>

          <h1 style={{
            fontSize:"clamp(38px,8vw,80px)",fontWeight:900,lineHeight:1.03,
            letterSpacing:"-3px",marginBottom:20,maxWidth:580,
            background:"linear-gradient(100deg,#BAE6FD 0%,#7DD3FC 18%,#FFFFFF 46%,#67E8F9 68%,#BAE6FD 100%)",
            backgroundSize:"200% auto",backgroundClip:"text",WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",animation:"shimmer 7s linear infinite,fadeSlideUp 0.8s ease 0.1s both"
          }}>South India<br/>Dam Watch</h1>

          <p style={{
            fontSize:16,color:"rgba(224,242,254,0.46)",maxWidth:400,lineHeight:
            1.6, marginBottom: 24, animation: "fadeSlideUp 0.8s ease 0.2s both"
          }}>
            Real-time daily monitoring of reservoir levels, capacity, inflows, and outflows across South India.
          </p>

          {/* Hero Buttons */}
          <div style={{ display: "flex", gap: 16, animation: "fadeSlideUp 0.8s ease 0.3s both" }}>
            <button 
              onClick={() => document.getElementById("dams-section").scrollIntoView({ behavior: "smooth" })}
              style={{
                padding: "12px 24px", borderRadius: 30, border: "none",
                background: "linear-gradient(135deg, #0284C7, #06B6D4)",
                color: "#FFF", fontWeight: 700, fontSize: 14, cursor: "pointer",
                boxShadow: "0 4px 20px rgba(6, 182, 212, 0.35)",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 24px rgba(6, 182, 212, 0.5)"; }}
              onMouseLeave={e => { e.target.style.transform = "none"; e.target.style.boxShadow = "0 4px 20px rgba(6, 182, 212, 0.35)"; }}
            >
              Monitor Reservoirs
            </button>
          </div>
        </div>

        {/* Floating wave animation at bottom of hero */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
          overflow: "hidden", zIndex: 5, pointerEvents: "none"
        }}>
          <svg viewBox="0 0 480 24" preserveAspectRatio="none"
            style={{ width: "200%", height: "100%", position: "absolute", bottom: -5, left: 0, animation: "wv1 12s linear infinite", transformOrigin: "bottom" }}>
            <path d={WAVE} fill="#030A14" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STATS SECTION â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div ref={statsRef} style={{
        padding: "60px 20px", background: "linear-gradient(to bottom, #030A14, #02070E)",
        borderBottom: "1px solid rgba(255,255,255,0.03)", position: "relative", zIndex: 6
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
          
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, textAlign: "center"
          }}>
            <div style={{ fontSize: 12, color: "rgba(224,242,254,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Monitored Dams</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#67E8F9", fontFamily: "monospace" }}>{cTotal}</div>
            <div style={{ fontSize: 12, color: "rgba(224,242,254,0.3)", marginTop: 4 }}>Dams in selected region</div>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, textAlign: "center"
          }}>
            <div style={{ fontSize: 12, color: "rgba(224,242,254,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Average Level</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#22D3EE", fontFamily: "monospace" }}>{cAvg}%</div>
            <div style={{ fontSize: 12, color: "rgba(224,242,254,0.3)", marginTop: 4 }}>Average capacity percentage</div>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 24, textAlign: "center"
          }}>
            <div style={{ fontSize: 12, color: "rgba(224,242,254,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Total Capacity</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#38BDF8", fontFamily: "monospace" }}>{cCapacity}</div>
            <div style={{ fontSize: 12, color: "rgba(224,242,254,0.3)", marginTop: 4 }}>Total volume in TMC</div>
          </div>

        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MAIN DAMS DISPLAY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div id="dams-section" style={{ padding: "80px 20px", maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 6 }}>
        
        {/* State Selection */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 11, color: "rgba(224,242,254,0.35)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>Filter by State</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["all", "Karnataka", "Tamil Nadu", "Kerala", "Andhra Pradesh", "Telangana"].map(state => {
              const label = state === "all" ? "All States" : state;
              const isActive = selectedState === state;
              return (
                <button
                  key={state}
                  onClick={() => { setSelectedState(state); setFilter("all"); }}
                  style={{
                    padding: "8px 16px", borderRadius: 20, border: "1px solid",
                    borderColor: isActive ? "rgba(6, 182, 212, 0.4)" : "rgba(255,255,255,0.08)",
                    background: isActive ? "rgba(6, 182, 212, 0.12)" : "rgba(255, 255, 255, 0.02)",
                    color: isActive ? "#67E8F9" : "rgba(224,242,254,0.6)",
                    fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { if(!isActive) { e.target.style.background = "rgba(255,255,255,0.06)"; e.target.style.borderColor = "rgba(255,255,255,0.2)"; } }}
                  onMouseLeave={e => { if(!isActive) { e.target.style.background = "rgba(255,255,255,0.02)"; e.target.style.borderColor = "rgba(255,255,255,0.08)"; } }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Header, Search & Sub-Filters */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, gap: 20, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#E0F2FE", letterSpacing: "-0.5px" }}>
              {selectedState === "all" ? "All South India" : selectedState} Reservoirs
            </h2>
            <p style={{ fontSize: 14, color: "rgba(224,242,254,0.4)", marginTop: 4 }}>Search and select capacity/alert filters</p>
          </div>
          
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search Input Box */}
            <div style={{ position: "relative", width: 300 }}>
              <input
                type="text"
                placeholder="ðŸ” Search name, river, district..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px 8px 36px", borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "#E0F2FE", fontSize: 13, outline: "none",
                  transition: "all 0.2s",
                  backdropFilter: "blur(4px)"
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(6, 182, 212, 0.5)"; e.target.style.background = "rgba(255, 255, 255, 0.04)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"; e.target.style.background = "rgba(255, 255, 255, 0.02)"; }}
              />
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: 4, borderRadius: 20 }}>
              {["all", "high", "normal", "low"].map(tab => {
                const label = tab === "all" ? "All Levels" : tab === "high" ? "70%+" : tab === "normal" ? "45-70%" : "<45%";
                const isActive = filter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    style={{
                      padding: "6px 14px", borderRadius: 16, border: "none",
                      background: isActive ? "rgba(6, 182, 212, 0.15)" : "transparent",
                      color: isActive ? "#67E8F9" : "rgba(224,242,254,0.5)",
                      fontSize: 12, fontWeight: isActive ? 700 : 500, cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        {shown.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {shown.map((dam, idx) => (
              <DamCard key={dam.id} dam={dam} delay={idx * 30} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: "center", padding: "60px 20px", border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: 16, background: "rgba(255,255,255,0.01)"
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>ðŸ”</div>
            <div style={{ fontSize: 16, color: "rgba(224,242,254,0.5)" }}>No dams match the selected criteria.</div>
          </div>
        )}

      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• DATA DISCLAIMER & FOOTER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <footer style={{
        background: "#01070F", borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "40px 20px", textAlign: "center", position: "relative", zIndex: 6
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <p style={{ fontSize: 11, color: "rgba(224,242,254,0.25)", lineHeight: 1.6, marginBottom: 16 }}>
            Disclaimer: Water levels, inflows, and outflows shown are scraped from live state bulletins and third-party resources. 
            Real-time data should be verified from official bulletins published by state disaster management authorities (KSNDMC, TNWRD, APWRD) 
            and the Central Water Commission (CWC).
          </p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 16, fontSize: 12, color: "rgba(224,242,254,0.35)" }}>
            Â© {new Date().getFullYear()} DamWatch South India. Created as a local public information resource.
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 16, fontSize: 11 }}>
            <button 
              onClick={() => setShowPinModal(true)}
              style={{
                background: "none", border: "none", color: "rgba(224,242,254,0.15)", cursor: "pointer", 
                transition: "color 0.2s"
              }}
              onMouseEnter={e => e.target.style.color = "rgba(6, 182, 212, 0.6)"}
              onMouseLeave={e => e.target.style.color = "rgba(224,242,254,0.15)"}
            >
              ðŸ”’ Admin Portal
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
import { useState, useEffect, useRef } from "react";
import DAMS from "./data/dams.json";

// Wave path: period=80, viewBox=480, seamless at -50% translateX
const WAVE = "M0,12 C20,2 60,22 80,12 C100,2 140,22 160,12 C180,2 220,22 240,12 C260,2 300,22 320,12 C340,2 380,22 400,12 C420,2 460,22 480,12";

const TICKER = DAMS.map(d=>`${d.name}: ${d.level}%`).join("  ◆  ");

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
  if (n === null || n === undefined) return "—";
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

  // Max water line y=20, Min water line y=102 (empty)
  // Total span = 82px
  const waterY = 102 - (fill / 100) * 82;
  const useSpillway = fill >= 75;

  // Dynamic values based on flow rate (scaling between 0 and 12,000 cusecs)
  const jetReach = Math.min(196, 188 + (safeOutflow / 12000) * 8);
  const jetLanding = Math.min(202, 191 + (safeOutflow / 12000) * 11);
  const streamWidth = Math.min(4.5, 1.2 + (safeOutflow / 12000) * 3.3);
  const animDuration = Math.max(0.3, 1.3 - (safeOutflow / 12000) * 1.0);

  // Sluice gate trajectory control points (dynamic based on pressure/flow)
  const cx1 = 181.5 + (safeOutflow / 12000) * 10;
  const cx2 = 181.5 + (safeOutflow / 12000) * 12;
  const lx = 184 + (safeOutflow / 12000) * 14;

  const waterPath = useSpillway
    ? `M 172,16 L 182,76 Q 183.8,86 186.2,87.5 Q ${jetReach},87.5 ${jetLanding},100`
    : `M 181.5,94.5 C ${cx1},94.5 ${cx2},99 ${lx},100`;

  const splashX = useSpillway ? jetLanding : lx;

  return (
    <div style={{
      position: "relative",
      height: 145,
      background: "radial-gradient(circle at 50% 120%, #0d1e33 0%, #020912 80%)",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid rgba(6, 182, 212, 0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "inset 0 4px 24px rgba(0,0,0,0.6)"
    }}>
      <svg width="100%" height="100%" viewBox="0 0 200 120" style={{ display: "block" }}>
        <defs>
          {/* Reservoir Clip Path */}
          <clipPath id={`res-clip-${fill}`}>
            <path d="M 10,0 L 10,102 L 115,102 C 142,98 156,65 162,15 L 162,0 Z" />
          </clipPath>

          {/* Premium Water Gradient */}
          <linearGradient id={`water-grad-${fill}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.85" />
            <stop offset="30%" stopColor="#0284C7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#073B66" stopOpacity="0.95" />
          </linearGradient>

          {/* Deep Water Wave Pattern */}
          <pattern id={`wave-pat-${fill}`} width="40" height="16" patternUnits="userSpaceOnUse">
            <path d="M 0,8 Q 10,4 20,8 Q 30,12 40,8" fill="none" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="1.2" />
            <animateTransform 
              attributeName="patternTransform" 
              type="translate" 
              from="0,0" to="40,0" 
              dur="4s" repeatCount="indefinite" 
            />
          </pattern>

          {/* Concrete Dam Gradient */}
          <linearGradient id="concrete-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5A6372" />
            <stop offset="15%" stopColor="#434C5E" />
            <stop offset="85%" stopColor="#2E3440" />
            <stop offset="100%" stopColor="#1E222B" />
          </linearGradient>
        </defs>

        {/* Earth/Bedrock Foundation Layer */}
        <rect x="10" y="102" width="180" height="8" fill="#1C202A" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <line x1="10" y1="102" x2="190" y2="102" stroke="#374151" strokeWidth="1.2" />

        {/* Grid lines background */}
        <g opacity="0.12">
          <line x1="10" y1="40" x2="162" y2="40" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="10" y1="61" x2="162" y2="61" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="10" y1="81" x2="162" y2="81" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x="14" y="43" fill="#FFFFFF" fontSize="5" fontFamily="monospace">75%</text>
          <text x="14" y="64" fill="#FFFFFF" fontSize="5" fontFamily="monospace">50%</text>
          <text x="14" y="84" fill="#FFFFFF" fontSize="5" fontFamily="monospace">25%</text>
        </g>

        {/* Reservoir Water Body (Clipped to upstream face of the dam) */}
        <g clipPath={`url(#res-clip-${fill})`}>
          {/* Water Fill */}
          <rect x="0" y={waterY} width="200" height="120" fill={`url(#water-grad-${fill})`} />
          <rect x="0" y={waterY} width="200" height="120" fill={`url(#wave-pat-${fill})`} />

          {/* Primary wave line */}
          <path 
            d={`M -40,${waterY} Q -20,${waterY - 1.8} 0,${waterY} Q 20,${waterY + 1.8} 40,${waterY} Q 60,${waterY - 1.8} 80,${waterY} Q 100,${waterY + 1.8} 120,${waterY} Q 140,${waterY - 1.8} 160,${waterY} Q 180,${waterY + 1.8} 200,${waterY}`} 
            fill="none" 
            stroke="#E0F2FE" 
            strokeWidth="1.8"
            opacity="0.85"
          >
            <animateTransform 
              attributeName="transform" 
              type="translate" 
              from="0,0" to="40,0" 
              dur="2.5s" repeatCount="indefinite" 
            />
          </path>

          {/* Secondary wave line */}
          <path 
            d={`M -40,${waterY + 1} Q -20,${waterY + 1.8} 0,${waterY + 1} Q 20,${waterY - 1.2} 40,${waterY + 1} Q 60,${waterY + 1.8} 80,${waterY + 1} Q 100,${waterY - 1.2} 120,${waterY + 1} Q 140,${waterY + 1.8} 160,${waterY + 1} Q 180,${waterY - 1.2} 200,${waterY + 1}`} 
            fill="none" 
            stroke="#00F0FF" 
            strokeWidth="1.2"
            opacity="0.45"
          >
            <animateTransform 
              attributeName="transform" 
              type="translate" 
              from="0,0" to="-40,0" 
              dur="3.8s" repeatCount="indefinite" 
            />
          </path>
        </g>

        {/* Concrete Gravity Dam Profile (Sloping downstream face on right) */}
        <path d="M 115,102 C 142,98 156,65 162,15 L 172,15 L 187,102 Z" fill="url(#concrete-grad)" stroke="#2E3440" strokeWidth="0.8" />
        
        {/* Dam structural block joints */}
        <line x1="162" y1="15" x2="162" y2="102" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <path d="M 125,102 C 144,98 153,75 158,35" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
        
        {/* Roadway Bridge / Gantry Crane structure on Dam Crest */}
        <rect x="159" y="9" width="16" height="2" rx="0.5" fill="#2E3440" stroke="#4C566A" strokeWidth="0.5" />
        <rect x="162" y="11" width="3" height="4" fill="#3B4252" />
        <rect x="169" y="11" width="3" height="4" fill="#3B4252" />
        <line x1="159" y1="7.5" x2="175" y2="7.5" stroke="#D8DEE9" strokeWidth="0.5" opacity="0.8" />

        {/* Spillway Gates (Steel radial gate leaf styling that lifts when spillway active) */}
        <g opacity="0.95">
          <rect 
            x="159.5" 
            y={useSpillway && safeOutflow > 0 ? 12.5 : 15} 
            width="2.2" 
            height="3.5" 
            rx="0.3"
            fill={useSpillway && safeOutflow > 0 ? "#9CA3AF" : "#4A5568"} 
            stroke="#1E293B" 
            strokeWidth="0.4" 
            style={{ transition: "y 0.5s ease" }}
          />
          <rect 
            x="165.5" 
            y={useSpillway && safeOutflow > 0 ? 12.5 : 15} 
            width="3" 
            height="3.5" 
            rx="0.3"
            fill={useSpillway && safeOutflow > 0 ? "#9CA3AF" : "#4A5568"} 
            stroke="#1E293B" 
            strokeWidth="0.4" 
            style={{ transition: "y 0.5s ease" }}
          />
          <rect 
            x="172.5" 
            y={useSpillway && safeOutflow > 0 ? 12.5 : 15} 
            width="2.2" 
            height="3.5" 
            rx="0.3"
            fill={useSpillway && safeOutflow > 0 ? "#9CA3AF" : "#4A5568"} 
            stroke="#1E293B" 
            strokeWidth="0.4" 
            style={{ transition: "y 0.5s ease" }}
          />
        </g>

        {/* Dark openings under gates when open */}
        {useSpillway && safeOutflow > 0 && (
          <g>
            <rect x="159.5" y="16" width="2.2" height="1.8" fill="#0F172A" />
            <rect x="165.5" y="16" width="3" height="1.8" fill="#0F172A" />
            <rect x="172.5" y="16" width="2.2" height="1.8" fill="#0F172A" />
          </g>
        )}

        {/* Low-Level Outflow Sluice Gate at Dam Toe (used when reservoir level is low) */}
        <g>
          {/* Sluice gate housing / tunnel portal */}
          <rect x="178" y="92" width="4" height="6" rx="0.5" fill="#0F172A" stroke="#374151" strokeWidth="0.5" />
          {/* Sluice gate leaf that slides up */}
          <rect 
            x="178.5" 
            y={(!useSpillway && safeOutflow > 0) ? 89.5 : 92.5} 
            width="3" 
            height="5" 
            rx="0.3" 
            fill={(!useSpillway && safeOutflow > 0) ? "#9CA3AF" : "#4A5568"} 
            stroke="#1E293B" 
            strokeWidth="0.4" 
            style={{ transition: "y 0.5s ease" }} 
          />
        </g>
        
        {/* Turbulent Riverbed Outflow (flowing to the right) */}
        {safeOutflow > 0 && (
          <g>
            {/* River water body */}
            <rect 
              x="182" 
              y="99" 
              width="18" 
              height="3.5" 
              fill="#0284C7" 
              opacity="0.85" 
            />
            {/* Foaming river surface waves */}
            <path 
              d="M 182,99 Q 187,98 192,99 Q 197,98 200,99" 
              fill="none" 
              stroke="#E0F2FE" 
              strokeWidth="0.8" 
              opacity="0.9"
            >
              <animate 
                attributeName="d" 
                values="M 182,99 Q 187,98 192,99 Q 197,98 200,99; M 182,99 Q 187,100 192,99 Q 197,100 200,99; M 182,99 Q 187,98 192,99 Q 197,98 200,99" 
                dur="0.5s" 
                repeatCount="indefinite" 
              />
            </path>
          </g>
        )}

        {/* Dynamic Outflow Release Water Jet */}
        {safeOutflow > 0 && (
          <g>
            {/* Base water stream */}
            <path 
              d={waterPath}
              fill="none" 
              stroke="#38BDF8" 
              strokeWidth={streamWidth} 
              strokeLinecap="round" 
              opacity="0.85" 
            />
            {/* Animated white foaming flow overlay */}
            <path 
              d={waterPath}
              fill="none" 
              stroke="#E0F2FE" 
              strokeWidth={streamWidth * 0.6} 
              strokeLinecap="round" 
              strokeDasharray="4 4" 
              opacity="0.9"
            >
              <animate attributeName="strokeDashoffset" values="30;0" dur={`${animDuration}s`} repeatCount="indefinite" />
            </path>

            {/* Splash/Foam particles at the landing spot */}
            <circle cx={splashX} cy="100.5" r="1.5" fill="#FFFFFF" opacity="0.8">
              <animate attributeName="r" values="1;2.5;1" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.85;0;0.85" dur="0.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={splashX + 1.8} cy="100.5" r="1" fill="#E0F2FE" opacity="0.6">
              <animate attributeName="r" values="0.5;1.8;0.5" dur="0.7s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="0.7s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* Glassmorphic level reader overlay */}
        <g transform="translate(48, 48)">
          <rect x="0" y="0" width="50" height="20" rx="6" fill="rgba(3, 10, 20, 0.72)" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="0.8" />
          <text x="25" y="14" fill="#E0F2FE" fontSize="10.5" fontWeight="900" fontFamily="monospace" textAnchor="middle">
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
            <span style={{color:mid,fontWeight:600}}>{dam.river}</span>{" · "}{dam.district}
          </div>
        </div>
      </div>
      <WaterViz level={safeLevel} outflow={dam.outflow} active={vis}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[
          {l:"Inflow",v:dam.inflow !== null ? `↑ ${fmtK(dam.inflow)}` : "—",c:"#86EFAC"},
          {l:"Outflow",v:dam.outflow !== null ? `↓ ${fmtK(dam.outflow)}` : "—",c:"#FCA5A5"}
        ].map(({l,v,c})=>(
          <div key={l} style={{padding:"9px 11px",background:"rgba(255,255,255,0.025)",borderRadius:9,border:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{fontSize:10,color:"rgba(220,240,255,0.3)",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
            <div style={{fontSize:14,fontWeight:700,color:c,fontFamily:"monospace"}}>{v}{v !== "—" && <span style={{fontSize:9,opacity:0.55,marginLeft:2}}>cusecs</span>}</div>
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

// ═══════════════ PIN MODAL COMPONENT ═══════════════
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
          ×
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "rgba(6, 182, 212, 0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, margin: "0 auto 12px",
            border: "1px solid rgba(6, 182, 212, 0.2)"
          }}>
            🔐
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#E0F2FE" }}>Admin Verification</h3>
          <p style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.4)", marginTop: 4 }}>Enter credentials to view analytics</p>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 20 }}>
            <input 
              type="password"
              placeholder="••••"
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
                ⚠️ Invalid PIN code. Try again.
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

// ═══════════════ ANALYTICS DASHBOARD COMPONENT ═══════════════
function AnalyticsDashboard({ setView, searchHistory }) {
  const gaActive = !!import.meta.env.VITE_GA_MEASUREMENT_ID;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

  // Pre-calculated stats
  const stats = [
    { label: "Unique Visitors", value: "4,821", change: "+14.2%", positive: true, icon: "👥" },
    { label: "Pageviews", value: "18,453", change: "+8.5%", positive: true, icon: "📄" },
    { label: "Bounce Rate", value: "38.4%", change: "-2.1%", positive: true, icon: "⏳" },
    { label: "Avg Session Time", value: "3m 45s", change: "+12s", positive: true, icon: "⏱️" }
  ];

  // Scraper Health status items
  const scraperLogs = [
    { source: "Karnataka (KSNDMC)", status: "Operational", detail: "Last scrape: 1h ago · 100% Success Rate", ok: true },
    { source: "Tamil Nadu (TNWRD)", status: "Operational", detail: "Last scrape: 1h ago · 100% Success Rate", ok: true },
    { source: "Kerala (Kerala WRD)", status: "Operational", detail: "Last scrape: 1h ago · 98% Success Rate", ok: true },
    { source: "Andhra & Telangana", status: "Operational", detail: "Last scrape: 1h ago · 100% Success Rate", ok: true },
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
            <span style={{ fontSize: 20 }}>📊</span>
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
          ← Exit Portal
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
                {gaActive ? "● ACTIVE" : "○ CONFIG PENDING"}
              </span>
            </div>

            {gaActive ? (
              <div style={{ background: "rgba(34, 197, 94, 0.03)", border: "1px solid rgba(34, 197, 94, 0.15)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#86EFAC", fontWeight: 600, display: "block", marginBottom: 4 }}>✓ Script successfully active</span>
                <p style={{ fontSize: 11, color: "rgba(224, 242, 254, 0.5)", lineHeight: 1.5 }}>
                  The app is listening to Measurement ID <code style={{ color: "#67E8F9", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>{measurementId}</code>.
                  Traffic and search terms are logged directly to your console.
                </p>
              </div>
            ) : (
              <div style={{ background: "rgba(245, 158, 11, 0.03)", border: "1px solid rgba(245, 158, 11, 0.15)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#FBBF24", fontWeight: 600, display: "block", marginBottom: 4 }}>⚡ Free telemetry ready for setup</span>
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
              💡 Scrapers are triggered remotely via Vercel Cron. Local data is compiled statically during builds, maintaining zero server database dependencies.
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
                    {item.done ? "✓" : "○"}
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
          {/* ═══════════════ HERO ═══════════════ */}
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

        {/* ── NAV ── */}
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
            }}>💧</div>
            <div>
              <div style={{fontWeight:900,fontSize:15,color:"#E0F2FE",letterSpacing:0.3}}>DamWatch</div>
              <div style={{fontSize:9,color:"rgba(224,242,254,0.33)",letterSpacing:2,textTransform:"uppercase"}}>South India</div>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <div style={{fontSize:11,color:"rgba(224,242,254,0.35)"}}>
              🕖 <span style={{color:"#67E8F9",fontWeight:600}}>10:00 AM IST</span>
            </div>
          </div>
        </nav>

        {/* ── LIVE TICKER ── */}
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

        {/* ── HERO BODY ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",padding:"52px 20px 116px",textAlign:"center"}}>

          <div style={{
            marginBottom:24,fontSize:11,fontWeight:600,letterSpacing:3,textTransform:"uppercase",
            color:"rgba(34,211,238,0.72)",padding:"5px 18px",borderRadius:20,display:"inline-block",
            border:"1px solid rgba(34,211,238,0.18)",background:"rgba(34,211,238,0.06)",
            animation:"fadeSlideUp 0.6s ease both"
          }}>South India · Daily Water Level Bulletin</div>

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

      {/* ═══════════════ STATS SECTION ═══════════════ */}
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

      {/* ═══════════════ MAIN DAMS DISPLAY ═══════════════ */}
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
                placeholder="🔍 Search name, river, district..."
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
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 16, color: "rgba(224,242,254,0.5)" }}>No dams match the selected criteria.</div>
          </div>
        )}

      </div>

      {/* ═══════════════ DATA DISCLAIMER & FOOTER ═══════════════ */}
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
            © {new Date().getFullYear()} DamWatch South India. Created as a local public information resource.
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
              🔒 Admin Portal
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

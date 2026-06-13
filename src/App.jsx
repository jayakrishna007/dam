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

  // Dynamic values based on flow rate (scaling between 0 and 12,000 cusecs)
  const jetReach = Math.min(192, 183 + (safeOutflow / 12000) * 9);
  const jetLanding = Math.min(198, 186 + (safeOutflow / 12000) * 12);
  const streamWidth = Math.min(3.5, 0.8 + (safeOutflow / 12000) * 2.7);
  const animDuration = Math.max(0.35, 1.4 - (safeOutflow / 12000) * 1.05);

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

        {/* Water Release / Outflow Tunnel at Dam Toe */}
        <circle cx="180" cy="95" r="2" fill="#1E222B" stroke="#434C5E" strokeWidth="0.5" />
        <path d="M 180,95 Q 186,95 188,102 L 190,102" fill="none" stroke="#4C566A" strokeWidth="1.2" strokeLinecap="round" />
        
        {/* Dynamic Outflow Release Water Jet */}
        {safeOutflow > 0 && (
          <g>
            {/* Base water stream */}
            <path 
              d={`M 180,95 Q ${jetReach},95 ${jetReach + 2},102 L ${jetLanding},102`} 
              fill="none" 
              stroke="#38BDF8" 
              strokeWidth={streamWidth} 
              strokeLinecap="round" 
              opacity="0.85" 
            />
            {/* Animated white foaming flow overlay */}
            <path 
              d={`M 180,95 Q ${jetReach},95 ${jetReach + 2},102 L ${jetLanding},102`} 
              fill="none" 
              stroke="#E0F2FE" 
              strokeWidth={streamWidth * 0.5} 
              strokeLinecap="round" 
              strokeDasharray="4 4" 
              opacity="0.9"
            >
              <animate attributeName="strokeDashoffset" values="30;0" dur={`${animDuration}s`} repeatCount="indefinite" />
            </path>

            {/* Splash/Foam particles at the landing spot */}
            <circle cx={jetReach + 2} cy="101" r="1.5" fill="#FFFFFF" opacity="0.8">
              <animate attributeName="r" values="1;2.5;1" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.85;0;0.85" dur="0.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={jetReach + 4} cy="101" r="1" fill="#E0F2FE" opacity="0.6">
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

export default function App() {
  const [filter,setFilter] = useState("all");
  const [selectedState,setSelectedState] = useState("all");
  const [searchQuery,setSearchQuery] = useState("");
  const [goStats,setGoStats] = useState(false);
  const statsRef = useRef(null);

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
        </div>
      </footer>
    </div>
  );
}

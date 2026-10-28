import { useState, useEffect, useRef } from "react";
import "./styles.css";

// ═══════════════════════════════════════════════════════
// TOKENS (runtime, para SVG e estilos inline)
// ═══════════════════════════════════════════════════════
const C = {
  bg:"#080B0D", bg1:"#0D1114", card:"#111518", cardH:"#171C20",
  gold:"#C9973E", goldL:"#E1B75F", goldD:"#8F6424",
  t1:"#F5F5F2", t2:"#A5A9AC", t3:"#5A6066",
  ok:"#4CAF72", warn:"#E0A43B", err:"#D65C5C", info:"#4A9ECC",
  border:"#1E2529",
};

// ═══════════════════════════════════════════════════════
// DADOS
// ═══════════════════════════════════════════════════════
const UNIDADES = [
  { id:"U1", nome:"Luanda Centro",  cidade:"Luanda",     alunos:248, receita:"4.2M", presenca:87 },
  { id:"U2", nome:"Talatona",       cidade:"Luanda Sul",  alunos:184, receita:"3.1M", presenca:79 },
  { id:"U3", nome:"Viana",          cidade:"Viana",       alunos:132, receita:"2.4M", presenca:72 },
  { id:"U4", nome:"Benguela",       cidade:"Benguela",    alunos:96,  receita:"1.8M", presenca:68 },
];

const ANIVERSARIOS = [
  { nome:"Ana Moreira",   email:"ana@fitcore.ao",    dob:"1995-09-07", plano:"Premium"  },
  { nome:"Carlos Lopes",  email:"carlos@fitcore.ao", dob:"1988-09-07", plano:"Standard" },
  { nome:"Lena Cardoso",  email:"lena@fitcore.ao",   dob:"1992-09-07", plano:"Standard" },
];

const BASE_CREDS = {
  "admin@fitcore.ao":   { senha:"admin123",   perfil:"gestor",  nome:"Miguel Guerreiro",    unidade:"U1", plano:null,       avatar:"MG" },
  "trainer@fitcore.ao": { senha:"trainer123", perfil:"trainer", nome:"Prof. Mário Santos",  unidade:"U1", plano:null,       avatar:"MS" },
  "ana@fitcore.ao":     { senha:"ana123",     perfil:"aluno",   nome:"Ana Moreira",         unidade:"U1", plano:"Premium",  avatar:"AM", aguaHoje:1.8, treinos:24, codigo:"FC1-AM2024" },
  "bruno@fitcore.ao":   { senha:"bruno123",   perfil:"aluno",   nome:"Bruno Silva",         unidade:"U1", plano:"Elite",    avatar:"BS", aguaHoje:2.9, treinos:38, codigo:"FC1-BS2024" },
  "carlos@fitcore.ao":  { senha:"carlos123",  perfil:"aluno",   nome:"Carlos Lopes",        unidade:"U1", plano:"Standard", avatar:"CL", aguaHoje:0.8, treinos:12, codigo:"FC1-CL2024" },
};

const initMensalidades = [
  { id:"M001", nome:"Ana Moreira",  email:"ana@fitcore.ao",    plano:"Premium",  valor:18000, vencimento:"2026-08-05", pago:true,  dataPag:"2026-08-04", metodo:"Transferência" },
  { id:"M002", nome:"Carlos Lopes", email:"carlos@fitcore.ao", plano:"Standard", valor:12000, vencimento:"2026-08-10", pago:false, dataPag:null, metodo:null },
  { id:"M003", nome:"Fátima Neto",  email:"fatima@fitcore.ao", plano:"Premium",  valor:18000, vencimento:"2026-07-05", pago:false, dataPag:null, metodo:null },
  { id:"M004", nome:"Bruno Silva",  email:"bruno@fitcore.ao",  plano:"Elite",    valor:28000, vencimento:"2026-08-01", pago:true,  dataPag:"2026-08-01", metodo:"Multicaixa" },
  { id:"M005", nome:"Lena Cardoso", email:"lena@fitcore.ao",   plano:"Standard", valor:12000, vencimento:"2026-06-10", pago:false, dataPag:null, metodo:null },
];

const initPosts = [
  { id:1, autor:"Bruno Silva",  avatar:"BS", tipo:"conquista", conteudo:"Novo recorde pessoal! 120kg no supino hoje 💪", hora:"08:42", likes:14, comentarios:["Incrível! 🔥"],  unidade:"U1" },
  { id:2, autor:"FitCore",      avatar:"FC", tipo:"academia",  conteudo:"🏋️ Aula de HIIT às 18h com o professor Mário. Venham todos!", hora:"09:15", likes:31, comentarios:[], unidade:"U1" },
  { id:3, autor:"Ana Moreira",  avatar:"AM", tipo:"progresso", conteudo:"30 dias consecutivos de treino! Obrigada FitCore 🙌",          hora:"10:03", likes:22, comentarios:["Incrível!"], unidade:"U1" },
];

const SEMANA = [
  { dia:"Seg", foco:"Peito & Tríceps", icon:"🏋️", exercicios:[
    { nome:"Supino plano",    maquina:"Banco + barra",   series:4, reps:"10–12", descanso:"90s", musculo:"Peito",    dica:"Omoplatas retraídas, pés no chão." },
    { nome:"Crucifixo",       maquina:"Banco + halteres",series:3, reps:"12–15", descanso:"60s", musculo:"Peito",    dica:"Arco suave, sinta o alongamento." },
    { nome:"Tríceps polia",   maquina:"Polia alta",      series:3, reps:"12–15", descanso:"60s", musculo:"Tríceps",  dica:"Cotovelos junto ao corpo." },
  ]},
  { dia:"Ter", foco:"Costas & Bíceps", icon:"💪", exercicios:[
    { nome:"Lat Pulldown",    maquina:"Máquina polia",   series:4, reps:"10–12", descanso:"90s", musculo:"Costas",   dica:"Puxe até ao queixo." },
    { nome:"Remada curvada",  maquina:"Barra olímpica",  series:4, reps:"10–12", descanso:"90s", musculo:"Costas",   dica:"Tronco a 45°." },
    { nome:"Rosca direta",    maquina:"Halteres livres", series:3, reps:"12–15", descanso:"60s", musculo:"Bíceps",   dica:"Gire o pulso no topo." },
  ]},
  { dia:"Qua", foco:"Pernas", icon:"🦵", exercicios:[
    { nome:"Agachamento",     maquina:"Rack + barra",    series:4, reps:"10–12", descanso:"120s",musculo:"Quadricípites", dica:"Coxas paralelas ao chão." },
    { nome:"Leg press",       maquina:"Máquina 45°",     series:3, reps:"12–15", descanso:"90s", musculo:"Pernas",   dica:"Não bloqueie os joelhos." },
    { nome:"Extensão",        maquina:"Máquina extensão",series:3, reps:"15",    descanso:"60s", musculo:"Quadricípites", dica:"Contraia no topo." },
  ]},
  { dia:"Qui", foco:"Ombros & Core", icon:"🔄", exercicios:[
    { nome:"Desenvolvimento", maquina:"Banco + halteres",series:4, reps:"10–12", descanso:"90s", musculo:"Deltóide", dica:"Não arquear as costas." },
    { nome:"Elevação lateral",maquina:"Halteres livres", series:3, reps:"15",    descanso:"60s", musculo:"Deltóide", dica:"Até ao nível dos ombros." },
    { nome:"Prancha",         maquina:"Tapete",          series:3, reps:"30–45s",descanso:"45s", musculo:"Core",     dica:"Abdómen contraído." },
  ]},
  { dia:"Sex", foco:"Full Body", icon:"⚡", exercicios:[
    { nome:"Supino inclinado",maquina:"Banco inclinado", series:3, reps:"10–12", descanso:"90s", musculo:"Peito sup.", dica:"Banco a 30–45°." },
    { nome:"Agachamento sumô",maquina:"Haltere",         series:3, reps:"12",    descanso:"90s", musculo:"Adutores",  dica:"Pés apontados para fora." },
    { nome:"Rosca martelo",   maquina:"Halteres",        series:3, reps:"12",    descanso:"60s", musculo:"Bíceps",    dica:"Polegar para cima." },
  ]},
  { dia:"Sáb", foco:"Cardio HIIT", icon:"🏃", exercicios:[] },
  { dia:"Dom", foco:"Descanso",    icon:"😴", exercicios:[] },
];

const EXERCICIOS = [
  { nome:"Supino plano",  grupo:"Peito",  series:[{s:1,c:80,r:10},{s:2,c:82.5,r:10},{s:3,c:85,r:10},{s:4,c:87.5,r:8},{s:5,c:90,r:8},{s:6,c:92.5,r:8}] },
  { nome:"Agachamento",   grupo:"Pernas", series:[{s:1,c:100,r:10},{s:2,c:105,r:10},{s:3,c:110,r:8},{s:4,c:112.5,r:8},{s:5,c:115,r:8},{s:6,c:120,r:6}] },
  { nome:"Remada",        grupo:"Costas", series:[{s:1,c:70,r:12},{s:2,c:72.5,r:12},{s:3,c:75,r:10},{s:4,c:77.5,r:10},{s:5,c:80,r:10},{s:6,c:82.5,r:8}] },
];

const MOTIVOS = [
  { icon:"🤖", t:"Planos gerados por IA",      d:"Treino e nutrição personalizados automaticamente com base nos seus objectivos reais." },
  { icon:"📊", t:"Acompanhamento total",        d:"Progressão de peso, cargas, presença e hidratação num só lugar." },
  { icon:"💧", t:"Lembretes inteligentes",      d:"Hidratação calculada para o seu plano, enviada ao longo do dia." },
  { icon:"👥", t:"Comunidade activa",           d:"Partilhe conquistas e motivação com outros membros FitCore." },
  { icon:"📱", t:"Check-in com QR Code",        d:"Entrada rápida e digital com o seu código de membro pessoal." },
];

const PLANOS = [
  { nome:"Standard", preco:"KZ 12 000", cor:C.t2,   items:["Acesso ilimitado","Plano de treino IA","Lembretes de água","Comunidade","Check-in digital"] },
  { nome:"Premium",  preco:"KZ 18 000", cor:C.gold, destaque:true, items:["Tudo do Standard","Plano nutricional","Relatórios mensais","Acompanhamento IA","Suporte prioritário"] },
  { nome:"Elite",    preco:"KZ 28 000", cor:C.goldL,items:["Tudo do Premium","Personal Trainer","Análise avançada","Todas as unidades","Plano de competição"] },
];

const aguaPorPlano = { Elite:3.5, Premium:3.0, Standard:2.5 };
const planoCor     = { Elite:C.goldL, Premium:C.gold, Standard:C.t2 };

// ═══════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════
const fmt      = v  => "KZ " + Number(v).toLocaleString("pt-AO");
const nowTime  = () => new Date().toLocaleTimeString("pt-AO", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
const hhmm     = () => new Date().toLocaleTimeString("pt-AO", { hour:"2-digit", minute:"2-digit" });
const todayStr = () => new Date().toLocaleDateString("pt-AO", { weekday:"long", day:"2-digit", month:"long" });
const diasAt   = v  => { const h=new Date();h.setHours(0,0,0,0);const d=new Date(v);d.setHours(0,0,0,0);return Math.max(0,Math.floor((h-d)/86400000)); };
const initials = n  => n.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();

// ═══════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════

function Av({ nome, foto, size=36 }) {
  const fs = Math.round(size * 0.32);
  return (
    <div className="av" style={{ width:size, height:size, fontSize:fs }}>
      {foto ? <img src={foto} alt={nome}/> : initials(nome||"?")}
    </div>
  );
}

function Badge({ children, cor=C.gold }) {
  return (
    <span className="badge" style={{
      background: cor + "20",
      color: cor,
      border: `1px solid ${cor}35`,
    }}>{children}</span>
  );
}

function Chip({ label, valor, cor }) {
  return (
    <div className="chip">
      <div className="chip-label">{label}</div>
      <div className="chip-value" style={{ color: cor || C.t1 }}>{valor}</div>
    </div>
  );
}

function Btn({ children, onClick, variant="gold", full, small, disabled }) {
  return (
    <button
      className={`btn btn-${variant}${full?" btn-full":""}${small?" btn-sm":""}`}
      onClick={onClick}
      disabled={disabled}
    >{children}</button>
  );
}

function GoldLine() {
  return <div className="gold-line"/>;
}

function Bar({ valor, max=100, height=5, cor }) {
  const pct  = Math.min((valor / max) * 100, 100);
  const fill = cor || (pct >= 80 ? C.ok : pct >= 50 ? C.gold : C.err);
  return (
    <div className="bar-track" style={{ height }}>
      <div className="bar-fill" style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${fill}99,${fill})` }}/>
    </div>
  );
}

// ── QR Code SVG ────────────────────────────────────────
function QRCode({ id, size=150 }) {
  const seed  = id.split("").reduce((a,c) => a + c.charCodeAt(0), 0);
  const cells = 21, cell = size / cells;
  const bits  = [];
  for (let r = 0; r < cells; r++) {
    bits[r] = [];
    for (let c2 = 0; c2 < cells; c2++) {
      if ((r<8&&c2<8)||(r<8&&c2>=cells-8)||(r>=cells-8&&c2<8)) { bits[r][c2]=2; continue; }
      if (r===6||c2===6) { bits[r][c2]=(r+c2)%2===0?1:0; continue; }
      bits[r][c2] = (seed*(r*31+c2*17+7))%100 < 45 ? 1 : 0;
    }
  }
  const rects = [];
  for (let r=0;r<cells;r++) for (let c2=0;c2<cells;c2++) if (bits[r][c2]===1) rects.push(<rect key={`${r}-${c2}`} x={c2*cell} y={r*cell} width={cell} height={cell} fill={C.gold}/>);
  const F = ({ x, y }) => (
    <g>
      <rect x={x} y={y} width={cell*7} height={cell*7} fill={C.gold}/>
      <rect x={x+cell} y={y+cell} width={cell*5} height={cell*5} fill={C.bg}/>
      <rect x={x+cell*2} y={y+cell*2} width={cell*3} height={cell*3} fill={C.gold}/>
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:"block" }}>
      <rect width={size} height={size} fill={C.bg}/>
      {rects}
      <F x={0} y={0}/><F x={(cells-7)*cell} y={0}/><F x={0} y={(cells-7)*cell}/>
    </svg>
  );
}

// ── Line Chart ─────────────────────────────────────────
function LineChart({ series }) {
  const w=300, h=80, pad=12;
  const maxC = Math.max(...series.map(s=>s.c));
  const minC = Math.min(...series.map(s=>s.c)) - 5;
  const pts  = series.map((s,i) => ({
    x: pad + (i/(series.length-1))*(w-pad*2),
    y: h - pad - (((s.c-minC)/(maxC-minC+2))*(h-pad*2)),
  }));
  const path = pts.map((p,i) => `${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gold} stopOpacity=".25"/>
          <stop offset="100%" stopColor={C.gold} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${path} L${pts[pts.length-1].x},${h} L${pts[0].x},${h} Z`} fill="url(#lg)"/>
      <path d={path} fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={C.gold}/>
          <text x={p.x} y={p.y-7} textAnchor="middle" fontSize="8" fill={C.gold}>{series[i].c}</text>
          <text x={p.x} y={h-1}   textAnchor="middle" fontSize="7" fill={C.t3}>S{series[i].s}</text>
        </g>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// NOTA DE COBRANÇA
// ═══════════════════════════════════════════════════════
function NotaCobranca({ m, onClose, enviarNotifAluno }) {
  const atraso = diasAt(m.vencimento);
  const multa  = atraso > 0 ? Math.round(m.valor * .05) : 0;
  const total  = m.valor + multa;
  const ref    = `FTC-${m.id}-2026`;
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16 }}>
      <div className="card" style={{ maxWidth:400,width:"100%",maxHeight:"88vh",overflowY:"auto",border:`1px solid ${C.border}` }}>
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-10">
            <div style={{ width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${C.goldD},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🏋️</div>
            <div>
              <div style={{ fontWeight:800,fontSize:14,color:C.t1 }}>FitCore Enterprise</div>
              <div style={{ fontSize:10,color:C.t3 }}>Nota de Cobrança</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.t3 }}>✕</button>
        </div>
        <GoldLine/>
        <div style={{ background:C.cardH,borderRadius:8,padding:"6px 12px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:10,color:C.t3 }}>Referência</span>
          <span style={{ fontSize:11,color:C.gold,fontWeight:700,fontFamily:"monospace" }}>{ref}</span>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:10 }}>
          {[["Nome",m.nome],["Plano",m.plano],["Vencimento",new Date(m.vencimento).toLocaleDateString("pt-AO")]].map(([l,v]) => (
            <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:11,color:C.t3 }}>{l}</span>
              <span style={{ fontSize:11,color:C.t1,fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background:C.cardH,borderRadius:10,padding:"12px",marginBottom:10 }}>
          <div style={{ display:"flex",justifyContent:"space-between",padding:"3px 0" }}><span style={{ fontSize:12,color:C.t3 }}>Mensalidade</span><span style={{ fontSize:12,color:C.t1 }}>{fmt(m.valor)}</span></div>
          {multa>0 && <div style={{ display:"flex",justifyContent:"space-between",padding:"3px 0" }}><span style={{ fontSize:12,color:C.err }}>Multa {atraso}d (5%)</span><span style={{ fontSize:12,color:C.err }}>+{fmt(multa)}</span></div>}
          <GoldLine/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:13,fontWeight:700,color:C.t1 }}>TOTAL</span>
            <span style={{ fontSize:18,fontWeight:800,color:C.gold }}>{fmt(total)}</span>
          </div>
        </div>
        {atraso>0 && <div className="alert alert-err mb-12">⚠️ Pagamento em atraso há {atraso} dias.</div>}
        <div className="flex gap-8">
          <Btn full variant="gold" onClick={() => {
            enviarNotifAluno?.(m.email, { tipo:"cobranca", titulo:"Nota de cobrança", msg:`Pagamento de ${fmt(total)} pendente. Ref: ${ref}.`, ref, valor:total });
            onClose();
          }}>📨 Enviar notificação</Btn>
          <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MÓDULO FINANCEIRO
// ═══════════════════════════════════════════════════════
function ModFinanceiro({ mensalidades, setMensalidades, enviarNotifAluno }) {
  const [filtro,  setFiltro]  = useState("todos");
  const [busca,   setBusca]   = useState("");
  const [nota,    setNota]    = useState(null);
  const [regPag,  setRegPag]  = useState(null);
  const [metodo,  setMetodo]  = useState("Multicaixa");

  const emAtraso   = mensalidades.filter(m => !m.pago && diasAt(m.vencimento) > 0);
  const totalRec   = mensalidades.filter(m => m.pago).reduce((a,m) => a+m.valor, 0);
  const totalPend  = mensalidades.filter(m => !m.pago).reduce((a,m) => a+m.valor, 0);
  const taxa       = Math.round(mensalidades.filter(m=>m.pago).length / mensalidades.length * 100);

  const lista = mensalidades.filter(m => {
    const at = !m.pago ? diasAt(m.vencimento) : -1;
    const ok = filtro==="todos" || (filtro==="pagos"&&m.pago) || (filtro==="atraso"&&!m.pago&&at>0) || (filtro==="pendente"&&!m.pago&&at<=0);
    return ok && m.nome.toLowerCase().includes(busca.toLowerCase());
  });

  const registarPag = id => { setMensalidades(p => p.map(m => m.id===id ? {...m,pago:true,dataPag:new Date().toISOString().slice(0,10),metodo} : m)); setRegPag(null); };

  return (
    <div className="stack">
      {nota && <NotaCobranca m={nota} onClose={()=>setNota(null)} enviarNotifAluno={enviarNotifAluno}/>}

      {/* KPIs */}
      <div className="kpi-grid">
        {[[fmt(totalRec),"Recebido",C.ok,"↑"],[fmt(totalPend),"Pendente",C.warn,"⏳"],[emAtraso.length+" alunos","Em atraso",C.err,"🔴"],[taxa+"%","Taxa de recuperação",C.gold,"📈"]].map(([v,l,cor,ic])=>(
          <div key={l} className="kpi-card">
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color:cor }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Alertas de atraso */}
      {emAtraso.length > 0 && (
        <div style={{ background:"rgba(214,92,92,.08)",borderRadius:10,padding:14,border:`1px solid rgba(214,92,92,.25)` }}>
          <div style={{ fontWeight:700,fontSize:12,color:C.err,marginBottom:10 }}>🚨 {emAtraso.length} aluno(s) com pagamento em atraso</div>
          {emAtraso.map(m => (
            <div key={m.id} className="flex justify-between items-center" style={{ padding:"6px 0",borderBottom:`1px solid rgba(214,92,92,.15)` }}>
              <div>
                <div style={{ fontWeight:600,fontSize:12,color:C.t1 }}>{m.nome}</div>
                <div style={{ fontSize:11,color:C.err }}>{diasAt(m.vencimento)} dias · {fmt(m.valor)}</div>
              </div>
              <Btn small variant="danger" onClick={()=>setNota(m)}>📨 Cobrar</Btn>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <input className="input" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Pesquisar aluno…"/>
      <div className="flex gap-6" style={{ flexWrap:"wrap" }}>
        {[["todos","Todos"],["pagos","✅ Pagos"],["pendente","⏳ Pendente"],["atraso","🔴 Em atraso"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFiltro(k)} style={{ background:filtro===k?"rgba(201,151,62,.15)":"transparent",color:filtro===k?C.gold:C.t3,border:`1px solid ${filtro===k?"rgba(201,151,62,.4)":C.border}`,borderRadius:99,padding:"4px 13px",fontSize:11,cursor:"pointer",fontWeight:filtro===k?600:400,fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      {/* Lista */}
      {lista.map(m => {
        const at    = !m.pago ? diasAt(m.vencimento) : 0;
        const st    = m.pago ? "pago" : at>0 ? "atraso" : "pendente";
        const stCfg = { pago:{cor:C.ok,label:"✅ Pago"}, pendente:{cor:C.warn,label:"⏳ Pendente"}, atraso:{cor:C.err,label:"🔴 Em atraso"} }[st];
        return (
          <div key={m.id} className="card" style={{ borderLeft:`3px solid ${stCfg.cor}`,padding:14 }}>
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-10">
                <Av nome={m.nome} size={36}/>
                <div>
                  <div style={{ fontWeight:600,fontSize:13,color:C.t1 }}>{m.nome}</div>
                  <div style={{ fontSize:11,color:C.t3 }}>Plano {m.plano}</div>
                </div>
              </div>
              <Badge cor={stCfg.cor}>{stCfg.label}</Badge>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10 }}>
              <Chip label="Valor"      valor={fmt(m.valor)}       cor={C.gold}/>
              <Chip label="Vencimento" valor={new Date(m.vencimento).toLocaleDateString("pt-AO")} cor={st==="atraso"?C.err:C.t2}/>
              <Chip label={m.pago?"Pago em":"Atraso"} valor={m.pago?new Date(m.dataPag).toLocaleDateString("pt-AO"):at>0?at+"d":"—"} cor={m.pago?C.ok:at>0?C.err:C.t3}/>
            </div>
            <div className="flex gap-6">
              {!m.pago && <><Btn small variant="success" onClick={()=>{setRegPag(m);setMetodo("Multicaixa");}}>✅ Registar</Btn><Btn small variant="danger" onClick={()=>setNota(m)}>📨 Cobrar</Btn></>}
              {m.pago  && <Btn small variant="ghost" onClick={()=>setNota(m)}>🧾 Recibo</Btn>}
            </div>
            {regPag?.id === m.id && (
              <div style={{ marginTop:12,background:C.cardH,borderRadius:10,padding:12,border:`1px solid rgba(201,151,62,.25)` }}>
                <div style={{ fontWeight:600,fontSize:11,color:C.gold,marginBottom:8 }}>Método de pagamento</div>
                <div className="flex gap-6" style={{ flexWrap:"wrap",marginBottom:10 }}>
                  {["Multicaixa","Transferência","Conta Express","Numerário"].map(mt => (
                    <button key={mt} onClick={()=>setMetodo(mt)} style={{ background:metodo===mt?"rgba(201,151,62,.15)":"transparent",color:metodo===mt?C.gold:C.t3,border:`1px solid ${metodo===mt?"rgba(201,151,62,.4)":C.border}`,borderRadius:99,padding:"4px 11px",fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>{mt}</button>
                  ))}
                </div>
                <div className="flex gap-8">
                  <Btn small full variant="gold" onClick={()=>registarPag(m.id)}>Confirmar — {fmt(m.valor)}</Btn>
                  <Btn small variant="ghost" onClick={()=>setRegPag(null)}>Cancelar</Btn>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NOTIFICAÇÕES
// ═══════════════════════════════════════════════════════
const NOTIF_CFG = {
  cobranca: { icon:"💰", cor:C.err  },
  academia: { icon:"📢", cor:C.gold },
  agua:     { icon:"💧", cor:C.info },
  ausencia: { icon:"📵", cor:C.warn },
  default:  { icon:"🔔", cor:C.gold },
};

function PainelNotifs({ notifs, marcarLida }) {
  const naoLidas = notifs.filter(n => !n.lida).length;
  if (!notifs.length) return (
    <div className="text-center" style={{ padding:"48px 0" }}>
      <div style={{ fontSize:40,marginBottom:12 }}>🔔</div>
      <div style={{ fontWeight:600,color:C.t1 }}>Sem notificações</div>
      <div style={{ fontSize:12,color:C.t3,marginTop:4 }}>As mensagens da academia aparecem aqui.</div>
    </div>
  );
  return (
    <div className="stack">
      <div className="flex justify-between items-center">
        <span style={{ fontSize:12,color:C.t3 }}>{notifs.length} notificação(ões) · <span style={{ color:C.err }}>{naoLidas} por ler</span></span>
        {naoLidas > 0 && <button onClick={()=>notifs.filter(n=>!n.lida).forEach(n=>marcarLida(n.id))} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"3px 10px",fontSize:10,cursor:"pointer",color:C.t3,fontFamily:"inherit" }}>Marcar todas lidas</button>}
      </div>
      {notifs.map(n => {
        const cfg = NOTIF_CFG[n.tipo] || NOTIF_CFG.default;
        return (
          <div key={n.id} onClick={()=>!n.lida&&marcarLida(n.id)} className="card" style={{ cursor:n.lida?"default":"pointer",border:`1px solid ${n.lida?C.border:cfg.cor+"44"}`,padding:14 }}>
            <div className="flex gap-10 items-start">
              <div style={{ width:36,height:36,borderRadius:9,background:cfg.cor+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>{cfg.icon}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div className="flex justify-between items-center mb-8" style={{ gap:8 }}>
                  <div style={{ fontWeight:700,fontSize:12,color:n.lida?C.t2:cfg.cor,flex:1 }}>{n.titulo}</div>
                  {!n.lida && <div className="notif-dot" style={{ background:cfg.cor }}/>}
                </div>
                <div style={{ fontSize:11,color:C.t3,lineHeight:1.5 }}>{n.msg}</div>
                <div style={{ fontSize:10,color:C.t3,marginTop:6 }}>{n.hora}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHECK-IN
// ═══════════════════════════════════════════════════════
function CheckinCard({ user, codigo, presencaHoje, onPresenca, isProf }) {
  const [scanning,  setScanning]  = useState(false);
  const [scanOk,    setScanOk]    = useState(false);
  const [scanMsg,   setScanMsg]   = useState("");
  const cor = isProf ? C.info : C.gold;

  const hoje     = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  const diasMes  = new Date(anoAtual, mesAtual+1, 0).getDate();
  const diasArr  = Array.from({length:diasMes}, (_,i) => i+1);
  const hoje_d   = hoje.getDate();

  const simularScan = () => {
    setScanning(true); setScanOk(false); setScanMsg("");
    setTimeout(() => {
      setScanning(false); setScanOk(true);
      setScanMsg("✅ Acesso confirmado — " + (isProf ? "Professor" : user.nome.split(" ")[0]));
      onPresenca();
    }, 2200);
  };

  return (
    <div className="stack">
      {/* QR pessoal */}
      <div className="qr-card">
        <div style={{ display:"inline-block",padding:12,background:C.bg,borderRadius:10,marginBottom:12,border:`1px solid rgba(201,151,62,.2)` }}>
          <QRCode id={codigo} size={140}/>
        </div>
        <div style={{ fontWeight:800,fontSize:16,color:C.t1,marginBottom:2 }}>{user.nome}</div>
        <div style={{ fontFamily:"monospace",fontSize:12,color:cor,letterSpacing:2 }}>{codigo}</div>
        {user.plano && <div style={{ marginTop:8 }}><Badge cor={planoCor[user.plano]||C.gold}>{user.plano}</Badge></div>}
        {isProf && <div style={{ marginTop:8 }}><Badge cor={C.info}>Corpo Docente</Badge></div>}
      </div>

      {/* Scanner */}
      <div className="card text-center">
        <div style={{ fontWeight:600,fontSize:13,color:C.t1,marginBottom:14 }}>Scanner de entrada</div>
        {presencaHoje
          ? <div className="alert alert-ok" style={{ textAlign:"center",marginBottom:12 }}>✅ Presença registada hoje</div>
          : scanning
            ? <div className="scanner-frame"><div className="scanner-line"/></div>
            : scanOk
              ? <div className="alert alert-ok" style={{ textAlign:"center" }}>{scanMsg}</div>
              : <div style={{ width:180,height:180,borderRadius:12,background:C.cardH,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",border:`2px dashed ${C.border}`,flexDirection:"column",gap:8 }}>
                  <span style={{ fontSize:32 }}>📷</span>
                  <span style={{ fontSize:11,color:C.t3 }}>Aguarda leitura</span>
                </div>
        }
        {!presencaHoje && !scanning && !scanOk && (
          <div style={{ marginTop:14 }}>
            <Btn full variant={isProf?"outline":"gold"} onClick={simularScan}>Simular check-in</Btn>
          </div>
        )}
      </div>

      {/* Calendário de presenças */}
      <div className="card">
        <div style={{ fontWeight:600,fontSize:12,color:C.t1,marginBottom:12 }}>
          {hoje.toLocaleString("pt-AO",{month:"long",year:"numeric"})}
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4 }}>
          {["D","S","T","Q","Q","S","S"].map((d,i)=>(
            <div key={i} style={{ textAlign:"center",fontSize:9,color:C.t3,fontWeight:600,padding:"0 0 4px" }}>{d}</div>
          ))}
        </div>
        <div className="cal-grid">
          {diasArr.map(d => {
            const isToday   = d === hoje_d;
            const isPast    = d <= hoje_d;
            const hasPresenca = isPast && (d % 3 !== 0) && d < hoje_d; // simulado
            return (
              <div key={d} className={`cal-day ${isToday&&presencaHoje?"present":hasPresenca?"present":"empty"}${isToday?" today":""}`}>
                {d}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLANO DE TREINO
// ═══════════════════════════════════════════════════════
function PlanoDeTreino({ plano }) {
  const [diaAberto, setDiaAberto] = useState("Seg");
  const [exAberto,  setExAberto]  = useState(null);
  const diaAtual = SEMANA.find(d => d.dia===diaAberto);

  return (
    <div className="stack">
      {/* Tabs de dia */}
      <div className="flex gap-4" style={{ overflowX:"auto" }}>
        {SEMANA.map(d => (
          <button key={d.dia} onClick={()=>setDiaAberto(d.dia)} style={{ padding:"8px 10px",background:diaAberto===d.dia?"rgba(201,151,62,.15)":"transparent",color:diaAberto===d.dia?C.gold:C.t3,border:`1px solid ${diaAberto===d.dia?"rgba(201,151,62,.4)":C.border}`,borderRadius:8,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontFamily:"inherit",fontSize:11,fontWeight:diaAberto===d.dia?700:400 }}>
            <div>{d.icon}</div>
            <div style={{ fontSize:9,marginTop:2 }}>{d.dia}</div>
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ fontWeight:700,fontSize:14,color:C.t1,marginBottom:4 }}>{diaAtual.icon} {diaAtual.foco}</div>
        <div style={{ fontSize:11,color:C.t3 }}>{diaAtual.exercicios.length} exercícios · {plano}</div>
      </div>

      {diaAtual.exercicios.length === 0
        ? <div className="card text-center" style={{ padding:"32px 0" }}>
            <div style={{ fontSize:36 }}>{diaAtual.icon}</div>
            <div style={{ marginTop:8,color:C.t2 }}>{diaAtual.foco}</div>
          </div>
        : diaAtual.exercicios.map((ex,i) => (
          <div key={i} className="card" style={{ padding:0,overflow:"hidden" }}>
            <div className="flex justify-between items-center" style={{ padding:"12px 14px",cursor:"pointer" }} onClick={()=>setExAberto(exAberto===i?null:i)}>
              <div>
                <div style={{ fontWeight:600,fontSize:13,color:C.t1 }}>{ex.nome}</div>
                <div style={{ fontSize:11,color:C.t3 }}>{ex.musculo} · {ex.series}×{ex.reps}</div>
              </div>
              <div style={{ fontSize:12,color:C.gold }}>{exAberto===i?"▲":"▼"}</div>
            </div>
            {exAberto === i && (
              <div style={{ padding:"0 14px 14px",borderTop:`1px solid ${C.border}` }}>
                <div className="flex gap-6" style={{ flexWrap:"wrap",margin:"12px 0" }}>
                  {[["Séries",ex.series],["Reps",ex.reps],["Descanso",ex.descanso],["Músculo",ex.musculo]].map(([l,v])=>(
                    <div key={l} className="chip" style={{ padding:"6px 10px" }}>
                      <div className="chip-label">{l}</div>
                      <div className="chip-value" style={{ color:C.gold,fontSize:12 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:"rgba(201,151,62,.08)",borderRadius:8,padding:"8px 12px",borderLeft:`3px solid ${C.gold}` }}>
                  <div style={{ fontSize:10,color:C.gold,fontWeight:600,marginBottom:2 }}>💡 DICA</div>
                  <div style={{ fontSize:11,color:C.t2 }}>{ex.dica}</div>
                </div>
                <div style={{ fontSize:11,color:C.t3,marginTop:10 }}>🏋️ {ex.maquina}</div>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HIDRATAÇÃO
// ═══════════════════════════════════════════════════════
function PainelAgua({ user, agua, setAgua }) {
  const meta = aguaPorPlano[user.plano] || 3;
  const pct  = Math.min((agua/meta)*100, 100);
  const cor  = pct >= 100 ? C.ok : pct >= 60 ? C.info : C.warn;

  return (
    <div className="stack">
      <div className="card text-center" style={{ padding:24 }}>
        <div style={{ fontSize:48,marginBottom:8 }}>💧</div>
        <div style={{ fontSize:42,fontWeight:800,color:cor,lineHeight:1 }}>{agua.toFixed(1)}<span style={{ fontSize:18,fontWeight:400,color:C.t3 }}>L</span></div>
        <div style={{ fontSize:12,color:C.t3,marginTop:4,marginBottom:20 }}>de {meta}L · Meta diária {user.plano}</div>
        <Bar valor={agua} max={meta} height={8} cor={cor}/>
        <div style={{ fontSize:11,color:C.t3,marginTop:6 }}>{Math.round(pct)}% da meta</div>
        {pct >= 100 && <div className="alert alert-ok" style={{ marginTop:12,textAlign:"center" }}>🎉 Meta atingida! Excelente hidratação.</div>}
      </div>
      <div className="card">
        <div style={{ fontWeight:600,fontSize:12,color:C.t1,marginBottom:12 }}>Adicionar água</div>
        <div className="flex gap-8">
          {[0.25, 0.5, 1].map(q => (
            <Btn key={q} full variant="outline" onClick={()=>setAgua(a=>Math.min(a+q,meta))}>+{q}L</Btn>
          ))}
        </div>
      </div>
      <div className="card">
        <div style={{ fontWeight:600,fontSize:12,color:C.t1,marginBottom:10 }}>Lembretes do dia</div>
        {[["07:00","☀️ Beba 0.5L ao acordar"],["10:00","💧 Hora de hidratar"],["13:00","🥤 Água antes do almoço"],["16:00","💧 A meio da tarde"],["19:00","🏋️ Hidratação pós-treino"],["22:00","🌙 Último copo do dia"]].map(([h,t])=>(
          <div key={h} className="flex items-center gap-10" style={{ padding:"6px 0",borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontFamily:"monospace",fontSize:11,color:C.gold,flexShrink:0 }}>{h}</span>
            <span style={{ fontSize:12,color:C.t2 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// COMUNIDADE
// ═══════════════════════════════════════════════════════
function PainelComunidade({ user, posts, setPosts, unidadeId }) {
  const [texto, setTexto] = useState("");
  const [tipo,  setTipo]  = useState("progresso");
  const tipoCfg = { progresso:{icon:"📈",label:"Progresso"}, dica:{icon:"💡",label:"Dica"}, conquista:{icon:"🏆",label:"Conquista"}, academia:{icon:"📢",label:"Aviso"} };
  const filteredPosts = posts.filter(p => !unidadeId || p.unidade===unidadeId);

  const publicar = () => {
    if (!texto.trim()) return;
    setPosts(p => [{ id:Date.now(),autor:user.nome,avatar:user.avatar,tipo,conteudo:texto,hora:hhmm(),likes:0,comentarios:[],unidade:unidadeId||"U1" }, ...p]);
    setTexto("");
  };

  return (
    <div className="stack">
      <div className="card">
        <textarea value={texto} onChange={e=>setTexto(e.target.value)} placeholder="Partilhe o seu progresso ou dica…" style={{ width:"100%",background:"transparent",border:"none",color:C.t1,fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",minHeight:60 }}/>
        <GoldLine/>
        <div className="flex justify-between items-center" style={{ gap:8 }}>
          <div className="flex gap-6" style={{ flexWrap:"wrap" }}>
            {Object.entries(tipoCfg).map(([k,v])=>(
              <button key={k} onClick={()=>setTipo(k)} style={{ background:tipo===k?"rgba(201,151,62,.15)":"transparent",color:tipo===k?C.gold:C.t3,border:`1px solid ${tipo===k?"rgba(201,151,62,.4)":C.border}`,borderRadius:99,padding:"3px 10px",fontSize:10,cursor:"pointer",fontFamily:"inherit" }}>{v.icon} {v.label}</button>
            ))}
          </div>
          <Btn small variant="gold" onClick={publicar}>Publicar</Btn>
        </div>
      </div>
      {filteredPosts.map(p => (
        <PostCard key={p.id} p={p} setPosts={setPosts} tipoCfg={tipoCfg}/>
      ))}
    </div>
  );
}

function PostCard({ p, setPosts, tipoCfg }) {
  const [exp,  setExp]  = useState(false);
  const cfg = tipoCfg[p.tipo] || tipoCfg.progresso;
  return (
    <div className="post-card">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-10">
          <Av nome={p.autor} size={32}/>
          <div>
            <div style={{ fontWeight:600,fontSize:12,color:C.t1 }}>{p.autor}</div>
            <div style={{ fontSize:10,color:C.t3 }}>{p.hora}</div>
          </div>
        </div>
        <span style={{ fontSize:10,color:C.gold,background:"rgba(201,151,62,.1)",padding:"2px 8px",borderRadius:99,border:"1px solid rgba(201,151,62,.2)" }}>{cfg.icon} {cfg.label}</span>
      </div>
      <div style={{ fontSize:13,color:C.t2,lineHeight:1.55,marginBottom:10 }}>{p.conteudo}</div>
      <div className="flex gap-12 items-center">
        <button onClick={()=>setPosts(ps=>ps.map(x=>x.id===p.id?{...x,likes:x.likes+1}:x))} style={{ background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4 }}>❤️ {p.likes}</button>
        <button onClick={()=>setExp(e=>!e)} style={{ background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:12,fontFamily:"inherit" }}>💬 {p.comentarios.length}</button>
      </div>
      {exp && (
        <div style={{ marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}` }}>
          {p.comentarios.map((c,i)=><div key={i} style={{ fontSize:11,color:C.t3,padding:"4px 0" }}>↳ {c}</div>)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// WIDGET ANIVERSARIANTES
// ═══════════════════════════════════════════════════════
function WidgetAniversariantes({ enviarNotifAluno, notifEnviadas, setNotifEnviadas }) {
  const hoje = new Date();
  const dd = String(hoje.getDate()).padStart(2,"0");
  const mm = String(hoje.getMonth()+1).padStart(2,"0");
  const aniv = ANIVERSARIOS.filter(a => { const [,am,ad]=a.dob.split("-"); return am===mm&&ad===dd; });
  const anos = dob => hoje.getFullYear() - parseInt(dob.split("-")[0]);

  const enviar = a => {
    if (notifEnviadas.includes(a.email)) return;
    enviarNotifAluno(a.email, { tipo:"academia", titulo:`🎂 Feliz Aniversário, ${a.nome.split(" ")[0]}!`, msg:`Toda a equipa FitCore deseja-lhe um Feliz Aniversário! 🎉 Hoje o treino é por nossa conta! 💪` });
    setNotifEnviadas(p => [...p, a.email]);
  };

  useEffect(() => { aniv.forEach(a => { if (!notifEnviadas.includes(a.email)) enviar(a); }); }, []);

  if (!aniv.length) return null;
  return (
    <div className="alert alert-gold" style={{ padding:14,borderRadius:12 }}>
      <div className="flex items-center gap-10" style={{ marginBottom:12 }}>
        <span style={{ fontSize:22 }}>🎂</span>
        <div>
          <div style={{ fontWeight:700,fontSize:13,color:C.gold }}>Aniversariantes de hoje</div>
          <div style={{ fontSize:10,color:C.t3 }}>Mensagem automática enviada</div>
        </div>
      </div>
      {aniv.map(a => (
        <div key={a.email} className="flex items-center gap-10" style={{ background:C.cardH,borderRadius:9,padding:"9px 12px",marginBottom:6 }}>
          <Av nome={a.nome} size={34}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600,fontSize:12,color:C.t1 }}>{a.nome}</div>
            <div style={{ fontSize:10,color:C.t3 }}>{anos(a.dob)} anos · Plano {a.plano}</div>
          </div>
          {notifEnviadas.includes(a.email) ? <Badge cor={C.ok}>✅ Enviado</Badge> : <Btn small variant="gold" onClick={()=>enviar(a)}>🎉 Enviar</Btn>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// INSCRIÇÃO
// ═══════════════════════════════════════════════════════
function Inscricao({ credenciais, setCredenciais, onLogin, onVoltar }) {
  const [form, setForm] = useState({ nome:"",bi:"",dob:"",genero:"",telefone:"",email:"",objetivo:"",plano:"",unidade:"",foto:null });
  const [erros, setErros] = useState({});
  const [ok,    setOk]    = useState(null);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const gerarCodigo = n => {
    const nome = (n||"XX").split(" ");
    const ini  = (nome[0]?.[0]||"X") + (nome[1]?.[0]||"X");
    return `FC1-${ini.toUpperCase()}${new Date().getFullYear()}`;
  };

  const inscrever = () => {
    const req = ["nome","bi","dob","genero","telefone","email","objetivo","plano","unidade"];
    const e   = {};
    req.forEach(k => { if (!form[k]) e[k] = "Obrigatório"; });
    if (credenciais[form.email]) e.email = "E-mail já existe";
    if (Object.keys(e).length) { setErros(e); return; }
    const senha  = Math.random().toString(36).slice(2,8).toUpperCase();
    const codigo = gerarCodigo(form.nome);
    const novoUser = { senha, perfil:"aluno", nome:form.nome, unidade:form.unidade, plano:form.plano, avatar:initials(form.nome), aguaHoje:0, treinos:0, codigo, foto:form.foto };
    setCredenciais(p => ({...p,[form.email]:novoUser}));
    setOk({ email:form.email, senha, codigo });
  };

  const inpSt = err => ({ border:`1px solid ${err?C.err:C.border}` });
  const Campo = ({ label, err, children }) => (
    <div>
      <div style={{ fontSize:11,color:err?C.err:C.t3,fontWeight:600,marginBottom:4 }}>{label}</div>
      {children}
      {err && <div style={{ fontSize:10,color:C.err,marginTop:2 }}>{err}</div>}
    </div>
  );

  if (ok) return (
    <div className="stack">
      <div style={{ textAlign:"center",padding:"24px 0" }}>
        <div style={{ fontSize:48,marginBottom:12 }}>✅</div>
        <div style={{ fontWeight:800,fontSize:18,color:C.t1,marginBottom:4 }}>Aluno inscrito!</div>
        <div style={{ fontSize:13,color:C.t3 }}>{form.nome}</div>
      </div>
      <div className="member-card">
        <div className="flex justify-between items-center" style={{ marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10,color:C.gold,letterSpacing:2,textTransform:"uppercase",fontWeight:600 }}>FitCore Enterprise</div>
            <div style={{ fontWeight:800,fontSize:18,color:C.t1,marginTop:4 }}>{form.nome}</div>
          </div>
          <div style={{ width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${C.goldD},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>🏋️</div>
        </div>
        <GoldLine/>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12 }}>
          <Chip label="Código"  valor={ok.codigo}     cor={C.gold}/>
          <Chip label="Plano"   valor={form.plano}    cor={planoCor[form.plano]||C.gold}/>
          <Chip label="E-mail"  valor={ok.email}      cor={C.t2}/>
          <Chip label="Senha"   valor={ok.senha}      cor={C.warn}/>
        </div>
        <div style={{ marginTop:14,textAlign:"center" }}>
          <QRCode id={ok.codigo} size={110}/>
        </div>
      </div>
      <Btn full variant="outline" onClick={()=>onLogin({email:ok.email,...credenciais[ok.email]})}>Entrar como este aluno</Btn>
      <Btn full variant="ghost" onClick={onVoltar}>← Voltar</Btn>
    </div>
  );

  return (
    <div className="stack">
      <div className="flex items-center gap-10" style={{ marginBottom:4 }}>
        <button onClick={onVoltar} style={{ background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:18,fontFamily:"inherit" }}>←</button>
        <div style={{ fontWeight:700,fontSize:16,color:C.t1 }}>Inscrever novo aluno</div>
      </div>
      <GoldLine/>

      {/* Foto */}
      <div style={{ textAlign:"center",padding:"10px 0" }}>
        {form.foto
          ? <img src={form.foto} alt="foto" style={{ width:72,height:72,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.gold}` }}/>
          : <div style={{ width:72,height:72,borderRadius:"50%",background:C.cardH,border:`2px dashed ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",fontSize:28 }}>👤</div>
        }
        <label style={{ display:"block",marginTop:8,fontSize:11,color:C.gold,cursor:"pointer" }}>
          + Adicionar foto
          <input type="file" accept="image/*" hidden onChange={e=>{ const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>f("foto",ev.target.result);r.readAsDataURL(file); }}/>
        </label>
      </div>

      {/* Dados pessoais */}
      <div style={{ fontWeight:700,fontSize:12,color:C.gold,marginBottom:8 }}>📋 Dados pessoais</div>
      <Campo label="Nome completo *" err={erros.nome}><input className={`input${erros.nome?" err":""}`} value={form.nome} onChange={e=>{f("nome",e.target.value);setErros(p=>({...p,nome:""}))}}/></Campo>
      <Campo label="Nº do BI *" err={erros.bi}><input className={`input${erros.bi?" err":""}`} value={form.bi} onChange={e=>{f("bi",e.target.value);setErros(p=>({...p,bi:""}))}}/></Campo>
      <Campo label="Data de nascimento *" err={erros.dob}><input type="date" className={`input${erros.dob?" err":""}`} value={form.dob} onChange={e=>{f("dob",e.target.value);setErros(p=>({...p,dob:""}))}}/></Campo>
      <Campo label="Género *" err={erros.genero}>
        <div className="flex gap-6">
          {["Masculino","Feminino","Outro"].map(g=>(
            <button key={g} onClick={()=>{f("genero",g);setErros(p=>({...p,genero:""}));}} style={{ flex:1,background:form.genero===g?"rgba(201,151,62,.15)":"transparent",color:form.genero===g?C.gold:C.t3,border:`1px solid ${form.genero===g?"rgba(201,151,62,.4)":C.border}`,borderRadius:8,padding:"8px 4px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:form.genero===g?600:400 }}>{g}</button>
          ))}
        </div>
      </Campo>
      <Campo label="Telefone *" err={erros.telefone}><input className={`input${erros.telefone?" err":""}`} value={form.telefone} placeholder="+244 9XX XXX XXX" onChange={e=>{f("telefone",e.target.value);setErros(p=>({...p,telefone:""}));}}/></Campo>
      <Campo label="E-mail *" err={erros.email}><input className={`input${erros.email?" err":""}`} value={form.email} placeholder="nome@email.com" onChange={e=>{f("email",e.target.value);setErros(p=>({...p,email:""}));}}/></Campo>

      <div style={{ fontWeight:700,fontSize:12,color:C.gold,marginTop:4,marginBottom:8 }}>🏋️ Plano & Objectivo</div>
      <Campo label="Objectivo *" err={erros.objetivo}>
        <div className="flex gap-6" style={{ flexWrap:"wrap" }}>
          {["Perda de gordura","Ganho muscular","Condicionamento","Performance","Saúde geral"].map(o=>(
            <button key={o} onClick={()=>{f("objetivo",o);setErros(p=>({...p,objetivo:""}));}} style={{ background:form.objetivo===o?"rgba(201,151,62,.15)":"transparent",color:form.objetivo===o?C.gold:C.t3,border:`1px solid ${form.objetivo===o?"rgba(201,151,62,.4)":C.border}`,borderRadius:99,padding:"5px 11px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:form.objetivo===o?600:400 }}>{o}</button>
          ))}
        </div>
      </Campo>
      <Campo label="Plano *" err={erros.plano}>
        <div className="flex gap-8">
          {[["Standard","KZ 12k",C.t2],["Premium","KZ 18k",C.gold],["Elite","KZ 28k",C.goldL]].map(([p,pr,cor])=>(
            <button key={p} onClick={()=>{f("plano",p);setErros(q=>({...q,plano:""}));}} style={{ flex:1,background:form.plano===p?cor+"20":"transparent",color:form.plano===p?cor:C.t3,border:`2px solid ${form.plano===p?cor:C.border}`,borderRadius:9,padding:"10px 4px",fontSize:11,cursor:"pointer",textAlign:"center",fontFamily:"inherit" }}>
              <div style={{ fontWeight:700,fontSize:12 }}>{p}</div>
              <div style={{ fontSize:10,opacity:.8,marginTop:2 }}>{pr}/mês</div>
            </button>
          ))}
        </div>
      </Campo>
      <Campo label="Unidade *" err={erros.unidade}>
        {UNIDADES.map(u=>(
          <button key={u.id} onClick={()=>{f("unidade",u.id);setErros(p=>({...p,unidade:""}));}} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:form.unidade===u.id?"rgba(201,151,62,.12)":"transparent",border:`1px solid ${form.unidade===u.id?"rgba(201,151,62,.4)":C.border}`,borderRadius:9,padding:"9px 12px",marginBottom:6,cursor:"pointer",width:"100%",fontFamily:"inherit" }}>
            <span style={{ fontSize:12,color:form.unidade===u.id?C.gold:C.t2,fontWeight:form.unidade===u.id?600:400 }}>{u.nome}</span>
            <span style={{ fontSize:10,color:C.t3 }}>{u.cidade}</span>
          </button>
        ))}
      </Campo>

      {Object.keys(erros).length > 0 && <div className="alert alert-err">⚠️ Corrija os campos assinalados.</div>}
      <Btn full variant="gold" onClick={inscrever}>✨ Inscrever e gerar credenciais</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PERSONAL TRAINER PANEL
// ═══════════════════════════════════════════════════════
function PainelPersonal({ user }) {
  const [exSel,    setExSel]    = useState(EXERCICIOS[0]);
  const [histEx,   setHistEx]   = useState(EXERCICIOS);
  const [alunoSel, setAlunoSel] = useState({ id:"A001", nome:"Ana Moreira",  avatar:"AM" });
  const [novaC,    setNovaC]    = useState("");
  const [novasR,   setNovasR]   = useState("");
  const [msg,      setMsg]      = useState(null);

  const exA    = histEx.find(e => e.nome===exSel.nome) || exSel;
  const ultima = exA.series[exA.series.length-1];
  const evo    = ((ultima.c - exA.series[0].c) / exA.series[0].c * 100).toFixed(1);

  const registar = () => {
    const c=parseFloat(novaC), r=parseInt(novasR);
    if (!c||!r) return;
    setHistEx(prev => prev.map(e => e.nome===exA.nome?{...e,series:[...e.series,{s:ultima.s+1,c,r}]}:e));
    setMsg(`✅ ${c}kg × ${r} reps registados`);
    setNovaC(""); setNovasR("");
    setTimeout(()=>setMsg(null),3000);
  };

  return (
    <div className="stack">
      <div className="flex gap-6" style={{ flexWrap:"wrap" }}>
        {[{id:"A001",nome:"Ana Moreira",avatar:"AM"},{id:"A004",nome:"Bruno Silva",avatar:"BS"},{id:"A002",nome:"Carlos Lopes",avatar:"CL"}].map(a=>(
          <div key={a.id} onClick={()=>setAlunoSel(a)} className="flex items-center gap-8" style={{ padding:"6px 12px",borderRadius:99,border:`1px solid ${alunoSel.id===a.id?"rgba(201,151,62,.5)":C.border}`,background:alunoSel.id===a.id?"rgba(201,151,62,.1)":C.card,cursor:"pointer" }}>
            <Av nome={a.nome} size={24}/><span style={{ fontSize:12,color:alunoSel.id===a.id?C.gold:C.t2,fontWeight:alunoSel.id===a.id?600:400 }}>{a.nome.split(" ")[0]}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-6" style={{ flexWrap:"wrap" }}>
        {histEx.map(e=>(
          <button key={e.nome} onClick={()=>setExSel(e)} style={{ background:exSel.nome===e.nome?"rgba(201,151,62,.15)":"transparent",color:exSel.nome===e.nome?C.gold:C.t3,border:`1px solid ${exSel.nome===e.nome?"rgba(201,151,62,.4)":C.border}`,borderRadius:99,padding:"4px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:exSel.nome===e.nome?600:400 }}>{e.nome}</button>
        ))}
      </div>
      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom:12 }}>
          <div>
            <div style={{ fontWeight:700,fontSize:14,color:C.t1 }}>{exA.nome}</div>
            <div style={{ fontSize:11,color:C.t3 }}>{exA.grupo} · {alunoSel.nome.split(" ")[0]}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:22,fontWeight:800,color:C.ok }}>+{evo}%</div>
            <div style={{ fontSize:9,color:C.t3 }}>evolução</div>
          </div>
        </div>
        <LineChart series={exA.series}/>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12 }}>
          <Chip label="Inicial" valor={exA.series[0].c+"kg"} cor={C.t3}/>
          <Chip label="Actual"  valor={ultima.c+"kg"}         cor={C.gold}/>
          <Chip label="Recorde" valor={Math.max(...exA.series.map(s=>s.c))+"kg"} cor={C.ok}/>
        </div>
      </div>
      <div className="card">
        <div style={{ fontWeight:600,fontSize:12,color:C.t1,marginBottom:10 }}>Registar sessão</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10 }}>
          <div>
            <div style={{ fontSize:10,color:C.t3,marginBottom:4 }}>Carga (kg)</div>
            <input type="number" className="input" value={novaC} onChange={e=>setNovaC(e.target.value)} placeholder={`Ex: ${ultima.c+2.5}`}/>
          </div>
          <div>
            <div style={{ fontSize:10,color:C.t3,marginBottom:4 }}>Repetições</div>
            <input type="number" className="input" value={novasR} onChange={e=>setNovasR(e.target.value)} placeholder={`Ex: ${ultima.r}`}/>
          </div>
        </div>
        <Btn full variant="gold" onClick={registar}>+ Registar sessão</Btn>
        {msg && <div className="alert alert-ok" style={{ marginTop:8 }}>{msg}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD GESTOR
// ═══════════════════════════════════════════════════════
function DashboardGestor({ unidades, unidadeAtual, enviarNotifAluno }) {
  const [notifAnivEnviadas, setNotifAnivEnviadas] = useState([]);
  const emAtrasoCount = initMensalidades.filter(m => !m.pago && diasAt(m.vencimento) > 0).length;

  return (
    <div className="stack">
      <WidgetAniversariantes enviarNotifAluno={enviarNotifAluno} notifEnviadas={notifAnivEnviadas} setNotifEnviadas={setNotifAnivEnviadas}/>
      <div className="kpi-grid-4">
        {[["248","Alunos activos",C.gold],["84%","Retenção",C.ok],["KZ 11.5M","Receita total",C.goldL],[emAtrasoCount+" em atraso","Cobranças",C.err]].map(([v,l,cor])=>(
          <div key={l} className="kpi-card">
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color:cor, fontSize:"1.2rem" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontWeight:700,fontSize:13,color:C.t1,marginTop:4 }}>Unidades</div>
      {unidades.map(u => {
        const sel = unidadeAtual.id===u.id;
        return (
          <div key={u.id} className="card" style={{ borderLeft:`3px solid ${sel?C.gold:C.border}` }}>
            <div className="flex justify-between items-center" style={{ marginBottom:10 }}>
              <div>
                <div style={{ fontWeight:600,fontSize:13,color:sel?C.gold:C.t1 }}>FitCore {u.nome}</div>
                <div style={{ fontSize:11,color:C.t3 }}>{u.cidade}</div>
              </div>
              {sel && <Badge cor={C.gold}>Activa</Badge>}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8 }}>
              <Chip label="Alunos"   valor={u.alunos}        cor={C.t1}/>
              <Chip label="Receita"  valor={"KZ "+u.receita}  cor={C.t1}/>
              <Chip label="Presença" valor={u.presenca+"%"}   cor={u.presenca>=80?C.ok:u.presenca>=70?C.gold:C.err}/>
            </div>
            <Bar valor={u.presenca} max={100} height={4}/>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════
function LoginScreen({ credenciais, onLogin }) {
  const [email,   setEmail]   = useState("");
  const [senha,   setSenha]   = useState("");
  const [showS,   setShowS]   = useState(false);
  const [erro,    setErro]    = useState("");
  const [loading, setLoading] = useState(false);

  const tentar = () => {
    setErro(""); setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const u = credenciais[email.trim().toLowerCase()];
      if (!u) { setErro("E-mail não encontrado."); return; }
      if (u.senha !== senha) { setErro("Senha incorrecta."); return; }
      onLogin({ email:email.trim().toLowerCase(), ...u });
    }, 800);
  };

  const demo = e => { setEmail(e); setSenha(credenciais[e]?.senha||""); setErro(""); };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div style={{ width:72,height:72,borderRadius:18,background:`linear-gradient(135deg,${C.goldD},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px",boxShadow:`0 8px 32px rgba(201,151,62,.35)` }}>🏋️</div>
        <h1 style={{ fontSize:"2rem",letterSpacing:"-.04em",marginBottom:6 }}>FitCore</h1>
        <p style={{ fontSize:13,color:C.t3,letterSpacing:.3,marginBottom:0 }}>A academia mais inteligente de Angola</p>
        <GoldLine/>
      </div>

      <div className="login-body">
        {/* 5 motivos */}
        <div style={{ margin:"20px 0" }}>
          <p style={{ fontWeight:700,fontSize:13,color:C.gold,marginBottom:12,textAlign:"center",letterSpacing:.3 }}>5 razões para treinar connosco</p>
          {MOTIVOS.map((m,i)=>(
            <div key={i} className="flex items-start gap-12" style={{ background:C.card,borderRadius:10,padding:"11px 13px",border:`1px solid ${C.border}`,marginBottom:6 }}>
              <div style={{ width:36,height:36,borderRadius:8,background:"rgba(201,151,62,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{m.icon}</div>
              <div>
                <div style={{ fontWeight:600,fontSize:12,color:C.t1,marginBottom:2 }}>{m.t}</div>
                <div style={{ fontSize:11,color:C.t3,lineHeight:1.5 }}>{m.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Planos */}
        <p style={{ fontWeight:700,fontSize:13,color:C.gold,marginBottom:12,textAlign:"center",letterSpacing:.3 }}>Planos de adesão</p>
        <div className="stack" style={{ marginBottom:24 }}>
          {PLANOS.map((p,i)=>(
            <div key={i} style={{ borderRadius:12,border:`1.5px solid ${p.destaque?C.gold:C.border}`,padding:"13px 16px",background:p.destaque?"rgba(201,151,62,.05)":C.card,position:"relative" }}>
              {p.destaque && <div style={{ position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${C.goldD},${C.gold})`,color:C.bg,fontSize:8,padding:"2px 14px",borderRadius:99,fontWeight:800,letterSpacing:.5,whiteSpace:"nowrap" }}>MAIS POPULAR</div>}
              <div className="flex justify-between items-center" style={{ marginBottom:8 }}>
                <div style={{ fontWeight:800,fontSize:14,color:p.cor }}>{p.nome}</div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:800,fontSize:16,color:p.cor }}>{p.preco}</div>
                  <div style={{ fontSize:9,color:C.t3 }}>/mês</div>
                </div>
              </div>
              <GoldLine/>
              {p.items.map((it,j)=>(
                <div key={j} className="flex gap-8 items-center" style={{ padding:"2px 0" }}>
                  <span style={{ color:p.cor,fontSize:10 }}>✓</span>
                  <span style={{ fontSize:11,color:C.t3 }}>{it}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Login card */}
        <div className="login-card">
          <h3 style={{ marginBottom:4 }}>Entrar na plataforma</h3>
          <GoldLine/>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11,color:C.t3,fontWeight:600 }}>E-mail</label>
            <input className={`input${erro?" err":""}`} style={{ marginTop:4 }} value={email} onChange={e=>{setEmail(e.target.value);setErro("");}} onKeyDown={e=>e.key==="Enter"&&tentar()} placeholder="seunome@fitcore.ao"/>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11,color:C.t3,fontWeight:600 }}>Senha</label>
            <div style={{ position:"relative",marginTop:4 }}>
              <input className={`input${erro?" err":""}`} type={showS?"text":"password"} value={senha} onChange={e=>{setSenha(e.target.value);setErro("");}} onKeyDown={e=>e.key==="Enter"&&tentar()} placeholder="••••••••" style={{ paddingRight:40 }}/>
              <button onClick={()=>setShowS(s=>!s)} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16 }}>{showS?"🙈":"👁️"}</button>
            </div>
          </div>
          {erro && <div className="alert alert-err" style={{ marginBottom:10 }}>⚠️ {erro}</div>}
          <Btn full variant="gold" onClick={tentar} disabled={loading}>{loading?"A verificar…":"Entrar"}</Btn>
          <GoldLine/>
          <div style={{ fontSize:10,color:C.t3,textAlign:"center",letterSpacing:.3,marginBottom:8 }}>ACESSO RÁPIDO — DEMONSTRAÇÃO</div>
          <div className="stack" style={{ gap:4 }}>
            {[["admin@fitcore.ao","🏢 Gestor Geral"],["trainer@fitcore.ao","💪 Personal Trainer"],["ana@fitcore.ao","👤 Aluno — Ana Moreira"],["bruno@fitcore.ao","👤 Aluno — Bruno Silva"]].map(([e,l])=>(
              <button key={e} onClick={()=>demo(e)} style={{ background:email===e?"rgba(201,151,62,.1)":"transparent",border:`1px solid ${email===e?"rgba(201,151,62,.35)":C.border}`,borderRadius:8,padding:"7px 12px",fontSize:11,cursor:"pointer",color:email===e?C.gold:C.t3,textAlign:"left",fontWeight:email===e?600:400,fontFamily:"inherit" }}>
                {l}<span style={{ opacity:.4,fontSize:9,marginLeft:6 }}>{e}</span>
              </button>
            ))}
          </div>
        </div>
        <p style={{ textAlign:"center",marginTop:24,fontSize:10,color:C.t3,letterSpacing:.3 }}>FITCORE © 2026 · VERSÃO ENTERPRISE</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NAV ITEMS por perfil
// ═══════════════════════════════════════════════════════
const NAV_GESTOR  = [
  { id:"dashboard",  icon:"📊", label:"Dashboard"       },
  { id:"financeiro", icon:"💰", label:"Finanças"         },
  { id:"comunidade", icon:"👥", label:"Comunidade"       },
  { id:"inscricao",  icon:"➕", label:"Novo aluno"       },
];
const NAV_TRAINER = [
  { id:"checkin",    icon:"📷", label:"Check-in"        },
  { id:"personal",   icon:"💪", label:"Personal"        },
  { id:"comunidade", icon:"👥", label:"Comunidade"      },
];
const NAV_ALUNO = [
  { id:"inicio",     icon:"🏠", label:"Início"          },
  { id:"checkin",    icon:"📷", label:"Check-in"        },
  { id:"notifs",     icon:"🔔", label:"Notificações"    },
  { id:"treino",     icon:"🏋️", label:"Plano de treino" },
  { id:"agua",       icon:"💧", label:"Hidratação"      },
  { id:"comunidade", icon:"👥", label:"Comunidade"      },
];

// ═══════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════
export default function App() {
  const [tela,         setTela]         = useState("login");
  const [user,         setUser]         = useState(null);
  const [credenciais,  setCredenciais]  = useState(BASE_CREDS);
  const [unidadeAtual, setUnidadeAtual] = useState(UNIDADES[0]);
  const [posts,        setPosts]        = useState(initPosts);
  const [mensalidades, setMensalidades] = useState(initMensalidades);
  const [hora,         setHora]         = useState(nowTime());
  const [presencas,    setPresencas]    = useState({});
  const [notifPerfil,  setNotifPerfil]  = useState({});
  const [aba,          setAba]          = useState("inicio");
  const [mostrarInsc,  setMostrarInsc]  = useState(false);

  useEffect(() => { const t = setInterval(()=>setHora(nowTime()), 1000); return ()=>clearInterval(t); }, []);

  const hoje       = new Date().toLocaleDateString("pt-AO");
  const presHoje   = user ? (presencas[user.email]||[]).includes(hoje) : false;
  const marcarPres = () => { if (!user||presHoje) return; setPresencas(p=>({...p,[user.email]:[...(p[user.email]||[]),hoje]})); };
  const enviarNotif= (email, notif) => setNotifPerfil(prev=>({...prev,[email]:[{id:Date.now(),...notif,hora:hhmm(),lida:false},...(prev[email]||[])]}));
  const naoLidas   = user ? (notifPerfil[user.email]||[]).filter(n=>!n.lida).length : 0;
  const emAtrasoN  = mensalidades.filter(m=>!m.pago&&diasAt(m.vencimento)>0).length;

  const handleLogin = u => { setUser(u); setTela("app"); setAba(u.perfil==="trainer"?"checkin":u.perfil==="gestor"?"dashboard":"inicio"); };
  const handleLogout= () => { setUser(null); setTela("login"); setMostrarInsc(false); };

  if (tela==="login"||!user) return <LoginScreen credenciais={credenciais} onLogin={handleLogin}/>;

  const navItems = user.perfil==="gestor" ? NAV_GESTOR : user.perfil==="trainer" ? NAV_TRAINER : NAV_ALUNO;
  const perfilLabel = { gestor:"Gestor Geral", trainer:"Personal Trainer", aluno:"Membro" }[user.perfil];
  const perfilCor   = { gestor:C.gold, trainer:C.ok, aluno:C.goldL }[user.perfil];
  const codigo      = user.codigo || `FC-${user.avatar}`;

  const renderContent = () => {
    if (mostrarInsc) return <Inscricao credenciais={credenciais} setCredenciais={setCredenciais} onLogin={u=>{handleLogin(u);setMostrarInsc(false);}} onVoltar={()=>setMostrarInsc(false)}/>;
    switch (aba) {
      case "dashboard":   return <DashboardGestor unidades={UNIDADES} unidadeAtual={unidadeAtual} enviarNotifAluno={enviarNotif}/>;
      case "financeiro":  return <ModFinanceiro mensalidades={mensalidades} setMensalidades={setMensalidades} enviarNotifAluno={enviarNotif}/>;
      case "comunidade":  return <PainelComunidade user={user} posts={posts} setPosts={setPosts} unidadeId={user.perfil==="gestor"?unidadeAtual.id:user.unidade}/>;
      case "inscricao":   return <Inscricao credenciais={credenciais} setCredenciais={setCredenciais} onLogin={u=>{handleLogin(u);}} onVoltar={()=>setAba("dashboard")}/>;
      case "checkin":     return <CheckinCard user={user} codigo={codigo} presencaHoje={presHoje} onPresenca={marcarPres} isProf={user.perfil==="trainer"}/>;
      case "personal":    return <PainelPersonal user={user}/>;
      case "notifs":      return <PainelNotifs notifs={notifPerfil[user.email]||[]} marcarLida={id=>setNotifPerfil(prev=>({...prev,[user.email]:(prev[user.email]||[]).map(n=>n.id===id?{...n,lida:true}:n)}))}/>;
      case "treino":      return <PlanoDeTreino plano={user.plano}/>;
      case "agua":        return <PainelAgua user={user} agua={user.aguaHoje||0} setAgua={a=>{}}/>;
      case "inicio": default: return (
        <div className="stack">
          {naoLidas > 0 && (
            <div onClick={()=>setAba("notifs")} className="flex items-center gap-12" style={{ background:"rgba(214,92,92,.08)",borderRadius:10,padding:"11px 14px",border:`1px solid rgba(214,92,92,.25)`,cursor:"pointer" }}>
              <div style={{ width:32,height:32,borderRadius:"50%",background:C.err,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:700,flexShrink:0 }}>{naoLidas}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700,fontSize:13,color:C.err }}>{naoLidas} notificação(ões) por ler</div>
                <div style={{ fontSize:11,color:C.err,opacity:.7 }}>Pode incluir cobranças pendentes.</div>
              </div>
              <span style={{ color:C.err }}>›</span>
            </div>
          )}
          <div className="member-card">
            <div className="flex justify-between items-center" style={{ marginBottom:16 }}>
              <div>
                <div style={{ fontSize:9,color:C.gold,letterSpacing:2,textTransform:"uppercase",fontWeight:700 }}>FitCore Enterprise</div>
                <div style={{ fontWeight:800,fontSize:20,color:C.t1,marginTop:4 }}>{user.nome}</div>
                <div style={{ marginTop:6,display:"flex",gap:6 }}>
                  <Badge cor={planoCor[user.plano]||C.gold}>{user.plano}</Badge>
                  <Badge cor={C.ok}>● Activo</Badge>
                </div>
              </div>
              <Av nome={user.nome} foto={user.foto} size={52}/>
            </div>
            <GoldLine/>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12 }}>
              <Chip label="Código membro" valor={codigo}       cor={C.gold}/>
              <Chip label="Treinos/mês"   valor={user.treinos||0} cor={C.ok}/>
            </div>
          </div>
          <div className="card">
            <div style={{ fontWeight:600,fontSize:12,color:C.t1,marginBottom:10 }}>💧 Hidratação hoje</div>
            <Bar valor={user.aguaHoje||0} max={aguaPorPlano[user.plano]||3} height={6}/>
            <div className="flex justify-between" style={{ fontSize:10,color:C.t3,marginTop:4 }}>
              <span>{(user.aguaHoje||0).toFixed(1)}L</span>
              <span>Meta: {aguaPorPlano[user.plano]||3}L</span>
            </div>
          </div>
          <div className="card">
            <div style={{ fontWeight:600,fontSize:12,color:C.t1,marginBottom:10 }}>Actividade recente</div>
            {[{i:"🏋️",t:"Treino: Peito & Tríceps",h:"Hoje, 07:30"},{i:"💧",t:"Meta de água a 60%",h:"Hoje, 10:00"},{i:"📢",t:"HIIT às 18h com Prof. Mário",h:"Academia"},{i:"🔔",t:"Mensalidade do mês de Agosto",h:"Finanças"}].map((n,i)=>(
              <div key={i} className="flex items-center gap-10" style={{ padding:"7px 0",borderBottom:i<3?`1px solid ${C.border}`:"none" }}>
                <span style={{ fontSize:16,width:24,textAlign:"center",flexShrink:0 }}>{n.i}</span>
                <span style={{ fontSize:12,color:C.t2,flex:1 }}>{n.t}</span>
                <span style={{ fontSize:10,color:C.t3,flexShrink:0 }}>{n.h}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  const pageTitle = { dashboard:"Dashboard", financeiro:"Finanças", comunidade:"Comunidade", inscricao:"Inscrição", checkin:"Check-in QR", personal:"Personal Trainer", notifs:"Notificações", treino:"Plano de Treino", agua:"Hidratação", inicio:"Início" }[aba] || "FitCore";

  return (
    <div className="shell">
      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">🏋️</div>
          <div>
            <div className="sidebar-brand-name">FitCore</div>
            <div className="sidebar-brand-sub">Enterprise</div>
          </div>
        </div>
        <div className="sidebar-user">
          <Av nome={user.nome} foto={user.foto} size={32}/>
          <div>
            <div className="sidebar-user-name">{user.nome}</div>
            <div className="sidebar-user-role" style={{ color:perfilCor }}>{perfilLabel}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {user.perfil==="gestor" && (
            <>
              <div className="nav-section-label">Unidade activa</div>
              {UNIDADES.map(u => (
                <button key={u.id} className={`nav-item${unidadeAtual.id===u.id?" active":""}`} onClick={()=>setUnidadeAtual(u)}>
                  <span className="nav-icon">🏢</span>{u.nome}
                </button>
              ))}
            </>
          )}
          <div className="nav-section-label">Menu</div>
          {navItems.map(item => (
            <button key={item.id} className={`nav-item${aba===item.id&&!mostrarInsc?" active":""}`} onClick={()=>{setAba(item.id);setMostrarInsc(false);}}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id==="notifs" && naoLidas > 0 && <span className="nav-badge">{naoLidas}</span>}
              {item.id==="financeiro" && emAtrasoN > 0 && <span className="nav-badge">{emAtrasoN}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} style={{ width:"100%",background:"rgba(214,92,92,.1)",border:"1px solid rgba(214,92,92,.25)",borderRadius:8,padding:"7px 12px",color:C.err,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>Terminar sessão</button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────── */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-title">{mostrarInsc?"Nova inscrição":pageTitle}</div>
          <div style={{ textAlign:"right" }}>
            <div className="topbar-time">{hora}</div>
            <div className="topbar-date">{todayStr()}</div>
          </div>
        </header>

        {/* Content */}
        <div className="content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

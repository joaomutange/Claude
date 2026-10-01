import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════════════════════
const DS = {
  bg0:"#080B0D", bg1:"#0D1114", card:"#12171B", cardH:"#181E22",
  gold:"#C9973E", goldL:"#E1B75F", goldD:"#8F6424",
  t1:"#F5F5F2", t2:"#A5A9AC", t3:"#6F7579",
  ok:"#4CAF72", warn:"#E0A43B", err:"#D65C5C",
  border:"#1E2529", borderG:"#C9973E44",
};

const planoCor = { Elite:DS.gold, Premium:DS.ok, Standard:DS.t2 };
const aguaPorPlano = { Elite:3.5, Premium:3.0, Standard:2.5 };

function formatKz(v){ return "KZ "+v.toLocaleString("pt-AO"); }
function now(){ return new Date().toLocaleTimeString("pt-AO",{hour:"2-digit",minute:"2-digit",second:"2-digit"}); }
function hhmm(){ return new Date().toLocaleTimeString("pt-AO",{hour:"2-digit",minute:"2-digit"}); }
function today(){ return new Date().toLocaleDateString("pt-AO",{weekday:"long",day:"2-digit",month:"long"}); }
function diasAtraso(v){ const h=new Date();h.setHours(0,0,0,0);const d=new Date(v);d.setHours(0,0,0,0);return Math.floor((h-d)/86400000); }

// ── ATOMS ──────────────────────────────────────────────
function GoldLine(){ return <div style={{height:1,background:`linear-gradient(90deg,transparent,${DS.gold}88,transparent)`,margin:"10px 0"}}/>; }

function Badge({children,cor}){
  return <span style={{background:(cor||DS.gold)+"22",color:cor||DS.gold,fontSize:10,padding:"2px 9px",borderRadius:20,fontWeight:600,letterSpacing:.3,border:`1px solid ${(cor||DS.gold)}33`}}>{children}</span>;
}

function Chip({label,valor,cor}){
  return(
    <div style={{background:DS.cardH,borderRadius:8,padding:"8px 10px",border:`0.5px solid ${DS.border}`}}>
      <p style={{margin:"0 0 2px",fontSize:9,color:DS.t3,textTransform:"uppercase",letterSpacing:.5}}>{label}</p>
      <p style={{margin:0,fontSize:13,fontWeight:600,color:cor||DS.t1}}>{valor}</p>
    </div>
  );
}

function Av({nome,foto,size=38}){
  if(foto) return <img src={foto} alt={nome} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:`1.5px solid ${DS.borderG}`}}/>;
  return(
    <div style={{width:size,height:size,borderRadius:"50%",background:DS.cardH,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*.3,color:DS.gold,flexShrink:0,border:`1.5px solid ${DS.gold}44`}}>
      {nome.split(" ").map(n=>n[0]).join("").slice(0,2)}
    </div>
  );
}

function GoldBar({valor,max=100,height=5}){
  const pct=Math.min((valor/max)*100,100);
  const cor=pct>=80?DS.ok:pct>=50?DS.gold:DS.err;
  return(
    <div style={{background:DS.bg0,borderRadius:4,height,overflow:"hidden"}}>
      <div style={{width:`${pct}%`,height:"100%",background:pct>=80?`linear-gradient(90deg,${DS.ok},${DS.goldL})`:`linear-gradient(90deg,${cor}88,${cor})`,borderRadius:4,transition:"width .5s"}}/>
    </div>
  );
}

function MiniBar({valor,max,cor}){
  return <div style={{background:DS.bg0,borderRadius:3,height:4,flex:1}}><div style={{width:`${Math.min((valor/max)*100,100)}%`,background:cor||DS.gold,height:"100%",borderRadius:3}}/></div>;
}

function Btn({children,onClick,variant="gold",full,small,disabled}){
  const st={
    gold:{background:`linear-gradient(135deg,${DS.gold},${DS.goldL})`,color:DS.bg0,border:"none"},
    outline:{background:"transparent",color:DS.gold,border:`1px solid ${DS.gold}66`},
    ghost:{background:DS.cardH,color:DS.t2,border:`0.5px solid ${DS.border}`},
    danger:{background:DS.err+"22",color:DS.err,border:`0.5px solid ${DS.err}66`},
    success:{background:DS.ok+"22",color:DS.ok,border:`0.5px solid ${DS.ok}44`},
  }[variant]||{};
  return(
    <button onClick={onClick} disabled={disabled} style={{...st,width:full?"100%":"auto",padding:small?"5px 12px":"9px 16px",borderRadius:9,fontSize:small?11:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,letterSpacing:.2,transition:"opacity .2s"}}>
      {children}
    </button>
  );
}

// ── QR CODE ────────────────────────────────────────────
function QRCode({id,size=140}){
  const seed=id.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const cells=21, cell=size/cells;
  const bits=[];
  for(let r=0;r<cells;r++){
    bits[r]=[];
    for(let c2=0;c2<cells;c2++){
      if((r<8&&c2<8)||(r<8&&c2>=cells-8)||(r>=cells-8&&c2<8)){bits[r][c2]=2;continue;}
      if(r===6||c2===6){bits[r][c2]=(r+c2)%2===0?1:0;continue;}
      bits[r][c2]=(seed*(r*31+c2*17+7))%100<45?1:0;
    }
  }
  const rects=[];
  for(let r=0;r<cells;r++) for(let c2=0;c2<cells;c2++) if(bits[r][c2]===1) rects.push(<rect key={`${r}-${c2}`} x={c2*cell} y={r*cell} width={cell} height={cell} fill={DS.gold}/>);
  const F=({x,y})=>(
    <g><rect x={x} y={y} width={cell*7} height={cell*7} fill={DS.gold}/><rect x={x+cell} y={y+cell} width={cell*5} height={cell*5} fill={DS.bg0}/><rect x={x+cell*2} y={y+cell*2} width={cell*3} height={cell*3} fill={DS.gold}/></g>
  );
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:"block"}}>
      <rect width={size} height={size} fill={DS.bg0}/>
      {rects}
      <F x={0} y={0}/><F x={(cells-7)*cell} y={0}/><F x={0} y={(cells-7)*cell}/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// DADOS
// ═══════════════════════════════════════════════════════
const UNIDADES=[
  {id:"U1",nome:"FitCore Luanda Centro",cidade:"Luanda",     alunos:248,receita:"4.2M",presenca:87},
  {id:"U2",nome:"FitCore Talatona",     cidade:"Luanda Sul", alunos:184,receita:"3.1M",presenca:79},
  {id:"U3",nome:"FitCore Viana",        cidade:"Viana",      alunos:132,receita:"2.4M",presenca:72},
  {id:"U4",nome:"FitCore Benguela",     cidade:"Benguela",   alunos:96, receita:"1.8M",presenca:68},
];

const ANIVERSARIOS=[
  {nome:"Ana Moreira",  email:"ana@fitcore.ao",  dob:"1995-09-07",plano:"Premium", avatar:"AM"},
  {nome:"Carlos Lopes", email:"carlos@fitcore.ao",dob:"1988-09-07",plano:"Standard",avatar:"CL"},
  {nome:"Lena Cardoso", email:"lena@fitcore.ao",  dob:"1992-09-07",plano:"Standard",avatar:"LC"},
];

const BASE_CREDS={
  "admin@fitcore.ao":   {senha:"admin123",  perfil:"gestor",  nome:"Gestor Geral",       unidade:"U1",plano:null,      avatar:"GG"},
  "trainer@fitcore.ao": {senha:"trainer123",perfil:"trainer", nome:"Prof. Mário Santos", unidade:"U1",plano:null,      avatar:"MS"},
  "ana@fitcore.ao":     {senha:"ana123",    perfil:"aluno",   nome:"Ana Moreira",        unidade:"U1",plano:"Premium", avatar:"AM",aguaHoje:1.8,treinos:24,ausencias:0,status:"Ativo",codigo:"FC1-AM2024"},
  "bruno@fitcore.ao":   {senha:"bruno123",  perfil:"aluno",   nome:"Bruno Silva",        unidade:"U1",plano:"Elite",   avatar:"BS",aguaHoje:2.9,treinos:38,ausencias:0,status:"Ativo",codigo:"FC1-BS2024"},
  "carlos@fitcore.ao":  {senha:"carlos123", perfil:"aluno",   nome:"Carlos Lopes",       unidade:"U1",plano:"Standard",avatar:"CL",aguaHoje:0.8,treinos:12,ausencias:2,status:"Ativo",codigo:"FC1-CL2024"},
};

const initMensalidades=[
  {id:"M001",nome:"Ana Moreira",  email:"ana@fitcore.ao",  plano:"Premium", valor:18000,vencimento:"2026-08-05",pago:true, dataPag:"2026-08-04",metodo:"Transferência"},
  {id:"M002",nome:"Carlos Lopes", email:"carlos@fitcore.ao",plano:"Standard",valor:12000,vencimento:"2026-08-10",pago:false,dataPag:null,metodo:null},
  {id:"M003",nome:"Fátima Neto",  email:"fatima@fitcore.ao",plano:"Premium", valor:18000,vencimento:"2026-07-05",pago:false,dataPag:null,metodo:null},
  {id:"M004",nome:"Bruno Silva",  email:"bruno@fitcore.ao", plano:"Elite",   valor:28000,vencimento:"2026-08-01",pago:true, dataPag:"2026-08-01",metodo:"Multicaixa"},
  {id:"M005",nome:"Lena Cardoso", email:"lena@fitcore.ao",  plano:"Standard",valor:12000,vencimento:"2026-06-10",pago:false,dataPag:null,metodo:null},
];

const initPosts=[
  {id:1,autor:"Bruno Silva",avatar:"BS",tipo:"conquista",conteudo:"Novo recorde pessoal! 120kg no supino hoje 💪",hora:"08:42",likes:14,comentarios:["Incrível! 🔥"],unidade:"U1"},
  {id:2,autor:"FitCore",avatar:"FC",tipo:"academia",conteudo:"🏋️ Aula de HIIT às 18h com o professor Mário. Venham todos!",hora:"09:15",likes:31,comentarios:[],unidade:"U1"},
  {id:3,autor:"Ana Moreira",avatar:"AM",tipo:"progresso",conteudo:"30 dias consecutivos de treino! Obrigada FitCore 🙌",hora:"10:03",likes:22,comentarios:["Incrível!"],unidade:"U1"},
];

const MOTIVOS=[
  {icon:"🤖",t:"Planos gerados por IA",d:"Treino e nutrição personalizados automaticamente com base nos seus objectivos reais."},
  {icon:"📊",t:"Acompanhamento total",d:"Veja progressão de peso, cargas, presença e hidratação num só lugar."},
  {icon:"💧",t:"Lembretes inteligentes",d:"Hidratação calculada para o seu plano, enviada ao longo do dia."},
  {icon:"👥",t:"Comunidade activa",d:"Partilhe conquistas e motivação com outros membros FitCore."},
  {icon:"📱",t:"Check-in com QR Code",d:"Entrada rápida e digital com o seu código de membro pessoal."},
];

const PLANOS_DISPLAY=[
  {nome:"Standard",preco:"KZ 12 000",cor:DS.t2,  items:["Acesso ilimitado","Plano de treino IA","Lembretes de água","Comunidade","Check-in digital"]},
  {nome:"Premium", preco:"KZ 18 000",cor:DS.gold,destaque:true,items:["Tudo do Standard","Plano nutricional","Relatórios mensais","Acompanhamento IA","Suporte prioritário"]},
  {nome:"Elite",   preco:"KZ 28 000",cor:DS.goldL,items:["Tudo do Premium","Personal Trainer","Análise avançada","Todas as unidades","Plano de competição"]},
];

const EXERCICIOS=[
  {nome:"Supino plano",grupo:"Peito",series:[{s:1,c:80,r:10},{s:2,c:82.5,r:10},{s:3,c:85,r:10},{s:4,c:87.5,r:8},{s:5,c:90,r:8},{s:6,c:92.5,r:8}]},
  {nome:"Agachamento",grupo:"Pernas",series:[{s:1,c:100,r:10},{s:2,c:105,r:10},{s:3,c:110,r:8},{s:4,c:112.5,r:8},{s:5,c:115,r:8},{s:6,c:120,r:6}]},
  {nome:"Remada",grupo:"Costas",series:[{s:1,c:70,r:12},{s:2,c:72.5,r:12},{s:3,c:75,r:10},{s:4,c:77.5,r:10},{s:5,c:80,r:10},{s:6,c:82.5,r:8}]},
];

const SEMANA=[
  {dia:"Seg",foco:"Peito & Tríceps",icon:"🏋️",exercicios:[
    {nome:"Supino plano",maquina:"Banco + barra",series:4,reps:"10–12",descanso:"90s",musculo:"Peito",dica:"Omoplatas retraídas, pés no chão."},
    {nome:"Crucifixo",maquina:"Banco + halteres",series:3,reps:"12–15",descanso:"60s",musculo:"Peito",dica:"Arco suave, sinta o alongamento."},
    {nome:"Tríceps polia",maquina:"Polia alta",series:3,reps:"12–15",descanso:"60s",musculo:"Tríceps",dica:"Cotovelos junto ao corpo."},
  ]},
  {dia:"Ter",foco:"Costas & Bíceps",icon:"💪",exercicios:[
    {nome:"Lat Pulldown",maquina:"Máquina polia",series:4,reps:"10–12",descanso:"90s",musculo:"Costas",dica:"Puxe até ao queixo."},
    {nome:"Remada curvada",maquina:"Barra olímpica",series:4,reps:"10–12",descanso:"90s",musculo:"Costas",dica:"Tronco a 45°."},
    {nome:"Rosca direta",maquina:"Halteres livres",series:3,reps:"12–15",descanso:"60s",musculo:"Bíceps",dica:"Gire o pulso no topo."},
  ]},
  {dia:"Qua",foco:"Pernas",icon:"🦵",exercicios:[
    {nome:"Agachamento",maquina:"Rack + barra",series:4,reps:"10–12",descanso:"120s",musculo:"Quadricípites",dica:"Coxas paralelas ao chão."},
    {nome:"Leg press",maquina:"Máquina 45°",series:3,reps:"12–15",descanso:"90s",musculo:"Pernas",dica:"Não bloqueie os joelhos."},
    {nome:"Extensão",maquina:"Máquina extensão",series:3,reps:"15",descanso:"60s",musculo:"Quadricípites",dica:"Contraia no topo."},
  ]},
  {dia:"Qui",foco:"Ombros & Core",icon:"🔄",exercicios:[
    {nome:"Desenvolvimento",maquina:"Banco + halteres",series:4,reps:"10–12",descanso:"90s",musculo:"Deltóide",dica:"Não arquear as costas."},
    {nome:"Elevação lateral",maquina:"Halteres livres",series:3,reps:"15",descanso:"60s",musculo:"Deltóide lat.",dica:"Até ao nível dos ombros."},
    {nome:"Prancha",maquina:"Tapete",series:3,reps:"30–45s",descanso:"45s",musculo:"Core",dica:"Abdómen contraído."},
  ]},
  {dia:"Sex",foco:"Full Body",icon:"⚡",exercicios:[
    {nome:"Supino inclinado",maquina:"Banco inclinado",series:3,reps:"10–12",descanso:"90s",musculo:"Peito sup.",dica:"Banco a 30–45°."},
    {nome:"Agachamento sumô",maquina:"Haltere",series:3,reps:"12",descanso:"90s",musculo:"Adutores",dica:"Pés apontados para fora."},
    {nome:"Rosca martelo",maquina:"Halteres",series:3,reps:"12",descanso:"60s",musculo:"Bíceps",dica:"Polegar para cima."},
  ]},
  {dia:"Sáb",foco:"Cardio HIIT",icon:"🏃",exercicios:[]},
  {dia:"Dom",foco:"Descanso",icon:"😴",exercicios:[]},
];

// ═══════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════

function LineChart({series}){
  const w=280,h=70,pad=10;
  const maxC=Math.max(...series.map(s=>s.c)), minC=Math.min(...series.map(s=>s.c))-5;
  const pts=series.map((s,i)=>({
    x:pad+(i/(series.length-1))*(w-pad*2),
    y:h-pad-(((s.c-minC)/(maxC-minC+2))*(h-pad*2))
  }));
  return(
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{display:"block"}}>
      {pts.slice(0,-1).map((p,i)=>(
        <line key={i} x1={p.x} y1={p.y} x2={pts[i+1].x} y2={pts[i+1].y} stroke={DS.gold} strokeWidth="2" strokeLinecap="round"/>
      ))}
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={DS.gold}/>
          <text x={p.x} y={p.y-7} textAnchor="middle" fontSize="8" fill={DS.gold}>{series[i].c}</text>
          <text x={p.x} y={h-1} textAnchor="middle" fontSize="7" fill={DS.t3}>S{series[i].s}</text>
        </g>
      ))}
    </svg>
  );
}

// ── NOTA DE COBRANÇA ──────────────────────────────────
function NotaCobranca({m,onClose,enviarNotifAluno}){
  const atraso=diasAtraso(m.vencimento);
  const multa=atraso>0?Math.round(m.valor*.05):0;
  const total=m.valor+multa;
  const ref="FTC-"+m.id+"-2026";
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
      <div style={{background:DS.card,border:`1px solid ${DS.border}`,borderRadius:16,padding:"1.5rem",maxWidth:400,width:"100%",maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:34,height:34,borderRadius:8,background:`linear-gradient(135deg,${DS.goldD},${DS.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🏋️</div>
            <div><p style={{margin:0,fontWeight:700,fontSize:13,color:DS.t1}}>FitCore</p><p style={{margin:0,fontSize:9,color:DS.t3}}>Nota de cobrança</p></div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:DS.t3}}>✕</button>
        </div>
        <GoldLine/>
        <div style={{background:DS.cardH,borderRadius:8,padding:"6px 12px",marginBottom:10,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:10,color:DS.t3}}>Ref.</span>
          <span style={{fontSize:11,color:DS.gold,fontWeight:700,fontFamily:"monospace"}}>{ref}</span>
        </div>
        <div style={{background:DS.cardH,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
          <p style={{margin:"0 0 6px",fontWeight:600,fontSize:11,color:DS.gold}}>Dados do aluno</p>
          {[["Nome",m.nome],["Plano",m.plano],["Vencimento",new Date(m.vencimento).toLocaleDateString("pt-AO")]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`0.5px solid ${DS.border}`}}>
              <span style={{fontSize:11,color:DS.t3}}>{l}</span><span style={{fontSize:11,color:DS.t1,fontWeight:500}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{background:DS.cardH,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
          <p style={{margin:"0 0 6px",fontWeight:600,fontSize:11,color:DS.gold}}>Valores</p>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{fontSize:11,color:DS.t3}}>Mensalidade</span><span style={{fontSize:11,color:DS.t1}}>{formatKz(m.valor)}</span></div>
          {multa>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{fontSize:11,color:DS.err}}>Multa {atraso}d (5%)</span><span style={{fontSize:11,color:DS.err}}>+{formatKz(multa)}</span></div>}
          <GoldLine/>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:700,color:DS.t1}}>TOTAL</span><span style={{fontSize:15,fontWeight:800,color:DS.gold}}>{formatKz(total)}</span></div>
        </div>
        {atraso>0&&<div style={{background:DS.err+"18",borderRadius:8,padding:"8px 12px",marginBottom:10,borderLeft:`2px solid ${DS.err}`}}><p style={{margin:0,fontSize:11,color:DS.err}}>⚠️ Pagamento em atraso há {atraso} dias.</p></div>}
        <div style={{display:"flex",gap:8}}>
          <Btn full variant="gold" onClick={()=>{
            if(enviarNotifAluno) enviarNotifAluno(m.email,{tipo:"cobranca",titulo:"Nota de cobrança",msg:`O seu pagamento de ${formatKz(total)} está pendente. Ref: ${ref}. Regularize para manter o acesso.`,ref,valor:total});
            onClose();
          }}>📨 Enviar (e-mail + perfil)</Btn>
          <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
        </div>
      </div>
    </div>
  );
}

// ── FINANCEIRO ────────────────────────────────────────
function ModFinanceiro({mensalidades,setMensalidades,enviarNotifAluno}){
  const [filtro,setFiltro]=useState("todos");
  const [notaAberta,setNotaAberta]=useState(null);
  const [regPag,setRegPag]=useState(null);
  const [metodo,setMetodo]=useState("Multicaixa");
  const [busca,setBusca]=useState("");
  const emAtraso=mensalidades.filter(m=>!m.pago&&diasAtraso(m.vencimento)>0);
  const totalRec=mensalidades.filter(m=>m.pago).reduce((a,m)=>a+m.valor,0);
  const totalPend=mensalidades.filter(m=>!m.pago).reduce((a,m)=>a+m.valor,0);
  const taxa=Math.round(mensalidades.filter(m=>m.pago).length/mensalidades.length*100);
  const lista=mensalidades.filter(m=>{
    const at=!m.pago?diasAtraso(m.vencimento):-1;
    const mf=filtro==="todos"||(filtro==="pagos"&&m.pago)||(filtro==="atraso"&&!m.pago&&at>0)||(filtro==="pendente"&&!m.pago&&at<=0);
    return mf&&m.nome.toLowerCase().includes(busca.toLowerCase());
  });
  const registarPag=id=>{setMensalidades(p=>p.map(m=>m.id===id?{...m,pago:true,dataPag:new Date().toISOString().slice(0,10),metodo}:m));setRegPag(null);};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {notaAberta&&<NotaCobranca m={notaAberta} onClose={()=>setNotaAberta(null)} enviarNotifAluno={enviarNotifAluno}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
        {[[formatKz(totalRec),"Recebido",DS.ok],[formatKz(totalPend),"Pendente",DS.warn],[emAtraso.length+" alunos","Em atraso",DS.err],[taxa+"%","Recuperação",DS.gold]].map(([v,l,c])=>(
          <div key={l} style={{background:DS.card,border:`0.5px solid ${DS.border}`,borderRadius:10,padding:"10px 12px"}}>
            <p style={{margin:"0 0 2px",fontSize:9,color:DS.t3,textTransform:"uppercase",letterSpacing:.5}}>{l}</p>
            <p style={{margin:0,fontSize:15,fontWeight:700,color:c}}>{v}</p>
          </div>
        ))}
      </div>
      {emAtraso.length>0&&(
        <div style={{background:DS.err+"14",borderRadius:10,padding:"12px",border:`1px solid ${DS.err}44`}}>
          <p style={{margin:"0 0 8px",fontWeight:600,fontSize:11,color:DS.err}}>🚨 {emAtraso.length} aluno(s) com pagamento em atraso</p>
          {emAtraso.map(m=>(
            <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`0.5px solid ${DS.err}22`}}>
              <div>
                <p style={{margin:0,fontSize:12,fontWeight:600,color:DS.t1}}>{m.nome}</p>
                <p style={{margin:0,fontSize:10,color:DS.err}}>{diasAtraso(m.vencimento)} dias · {formatKz(m.valor)}</p>
              </div>
              <Btn small variant="danger" onClick={()=>setNotaAberta(m)}>📨 Cobrar</Btn>
            </div>
          ))}
        </div>
      )}
      <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Pesquisar aluno…" style={{padding:"8px 12px",borderRadius:8,border:`0.5px solid ${DS.border}`,background:DS.cardH,color:DS.t1,fontSize:12,outline:"none"}}/>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {[["todos","Todos"],["pagos","Pagos ✅"],["pendente","Pendente ⏳"],["atraso","Em atraso 🔴"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFiltro(k)} style={{background:filtro===k?DS.gold+"22":"transparent",color:filtro===k?DS.gold:DS.t3,border:`0.5px solid ${filtro===k?DS.gold:DS.border}`,borderRadius:20,padding:"4px 12px",fontSize:11,cursor:"pointer",fontWeight:filtro===k?600:400}}>
            {l}
          </button>
        ))}
      </div>
      {lista.map(m=>{
        const at=!m.pago?diasAtraso(m.vencimento):0;
        const st=m.pago?"pago":at>0?"atraso":"pendente";
        const stC={pago:{cor:DS.ok,label:"✅ Pago"},pendente:{cor:DS.warn,label:"⏳ Pendente"},atraso:{cor:DS.err,label:"🔴 Em atraso"}}[st];
        return(
          <div key={m.id} style={{background:DS.card,border:`0.5px solid ${st==="atraso"?DS.err+"66":DS.border}`,borderRadius:12,padding:"12px",borderLeft:`2px solid ${stC.cor}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Av nome={m.nome} size={34}/>
                <div><p style={{margin:0,fontWeight:600,fontSize:12,color:DS.t1}}>{m.nome}</p><p style={{margin:0,fontSize:10,color:DS.t3}}>Plano {m.plano}</p></div>
              </div>
              <Badge cor={stC.cor}>{stC.label}</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
              <Chip label="Valor" valor={formatKz(m.valor)} cor={DS.gold}/>
              <Chip label="Vencimento" valor={new Date(m.vencimento).toLocaleDateString("pt-AO")} cor={st==="atraso"?DS.err:DS.t2}/>
              <Chip label={m.pago?"Pago em":"Atraso"} valor={m.pago?new Date(m.dataPag).toLocaleDateString("pt-AO"):at>0?at+"d":"—"} cor={m.pago?DS.ok:at>0?DS.err:DS.t3}/>
            </div>
            <div style={{display:"flex",gap:6}}>
              {!m.pago&&<><Btn small variant="success" onClick={()=>{setRegPag(m);setMetodo("Multicaixa");}}>✅ Registar</Btn><Btn small variant="danger" onClick={()=>setNotaAberta(m)}>📨 Cobrar</Btn></>}
              {m.pago&&<Btn small variant="ghost" onClick={()=>setNotaAberta(m)}>🧾 Recibo</Btn>}
            </div>
            {regPag?.id===m.id&&(
              <div style={{marginTop:10,background:DS.cardH,borderRadius:10,padding:"12px",border:`0.5px solid ${DS.gold}44`}}>
                <p style={{margin:"0 0 8px",fontWeight:600,fontSize:11,color:DS.gold}}>Método de pagamento</p>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                  {["Multicaixa","Transferência","Conta Express","Numerário"].map(mt=>(
                    <button key={mt} onClick={()=>setMetodo(mt)} style={{background:metodo===mt?DS.gold+"22":"transparent",color:metodo===mt?DS.gold:DS.t3,border:`0.5px solid ${metodo===mt?DS.gold:DS.border}`,borderRadius:20,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>{mt}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn small full variant="gold" onClick={()=>registarPag(m.id)}>Confirmar — {formatKz(m.valor)}</Btn>
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

// ── ANIVERSARIANTES ───────────────────────────────────
function WidgetAniversariantes({enviarNotifAluno,notifEnviadas,setNotifEnviadas}){
  const hoje=new Date();
  const dd=String(hoje.getDate()).padStart(2,"0");
  const mm=String(hoje.getMonth()+1).padStart(2,"0");
  const aniv=ANIVERSARIOS.filter(a=>{const[,am,ad]=a.dob.split("-");return am===mm&&ad===dd;});
  const anos=dob=>hoje.getFullYear()-parseInt(dob.split("-")[0]);
  const enviar=a=>{
    if(notifEnviadas.includes(a.email))return;
    enviarNotifAluno(a.email,{tipo:"academia",titulo:`🎂 Feliz Aniversário, ${a.nome.split(" ")[0]}!`,msg:`Toda a equipa FitCore deseja-lhe um Feliz Aniversário! 🎉 Saúde, força e conquistas. Hoje o treino é por nossa conta! 💪`});
    setNotifEnviadas(p=>[...p,a.email]);
  };
  useEffect(()=>{aniv.forEach(a=>{if(!notifEnviadas.includes(a.email))enviar(a);});},[]);
  if(!aniv.length)return null;
  return(
    <div style={{background:DS.card,borderRadius:14,padding:"14px",border:`1px solid ${DS.gold}55`,marginBottom:4}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:22}}>🎂</span>
        <div>
          <p style={{margin:0,fontWeight:700,fontSize:13,color:DS.gold}}>Aniversariantes de hoje</p>
          <p style={{margin:0,fontSize:10,color:DS.t3}}>Mensagem automática enviada</p>
        </div>
      </div>
      {aniv.map(a=>(
        <div key={a.email} style={{display:"flex",alignItems:"center",gap:10,background:DS.cardH,borderRadius:10,padding:"8px 12px",marginBottom:6}}>
          <Av nome={a.nome} size={36}/>
          <div style={{flex:1}}>
            <p style={{margin:0,fontWeight:600,fontSize:12,color:DS.t1}}>{a.nome}</p>
            <p style={{margin:0,fontSize:10,color:DS.t3}}>{anos(a.dob)} anos · Plano {a.plano}</p>
          </div>
          {notifEnviadas.includes(a.email)?<Badge cor={DS.ok}>✅ Enviado</Badge>:<Btn small variant="gold" onClick={()=>enviar(a)}>🎉 Enviar</Btn>}
        </div>
      ))}
    </div>
  );
}

// ── NOTIFICAÇÕES ──────────────────────────────────────
const NOTIF_CFG={cobranca:{icon:"💰",cor:DS.err},academia:{icon:"📢",cor:DS.gold},agua:{icon:"💧",cor:"#4A9ECC"},ausencia:{icon:"📵",cor:DS.warn},default:{icon:"🔔",cor:DS.gold}};

function PainelNotifs({notifs,marcarLida}){
  const naoLidas=notifs.filter(n=>!n.lida).length;
  if(!notifs.length)return(
    <div style={{textAlign:"center",padding:"3rem 1rem"}}>
      <p style={{fontSize:36,margin:"0 0 10px"}}>🔔</p>
      <p style={{margin:0,fontWeight:600,fontSize:14,color:DS.t1}}>Sem notificações</p>
      <p style={{margin:"4px 0 0",fontSize:12,color:DS.t3}}>As mensagens da academia aparecem aqui.</p>
    </div>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <p style={{margin:0,fontSize:11,color:DS.t3}}>{notifs.length} notificação(ões) · <span style={{color:DS.err}}>{naoLidas} por ler</span></p>
        {naoLidas>0&&<button onClick={()=>notifs.filter(n=>!n.lida).forEach(n=>marcarLida(n.id))} style={{background:"none",border:`0.5px solid ${DS.border}`,borderRadius:8,padding:"3px 10px",fontSize:10,cursor:"pointer",color:DS.t3}}>Marcar todas lidas</button>}
      </div>
      {notifs.map(n=>{
        const c=NOTIF_CFG[n.tipo]||NOTIF_CFG.default;
        return(
          <div key={n.id} onClick={()=>!n.lida&&marcarLida(n.id)} style={{background:n.lida?DS.card:DS.cardH,borderRadius:12,padding:"12px",border:`1px solid ${n.lida?DS.border:c.cor+"55"}`,cursor:n.lida?"default":"pointer",position:"relative"}}>
            {!n.lida&&<div style={{position:"absolute",top:12,right:12,width:7,height:7,borderRadius:"50%",background:c.cor}}/>}
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:34,height:34,borderRadius:8,background:c.cor+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{c.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <p style={{margin:0,fontWeight:700,fontSize:12,color:n.lida?DS.t2:c.cor}}>{n.titulo}</p>
                  <span style={{fontSize:10,color:DS.t3}}>{n.hora}</span>
                </div>
                <p style={{margin:0,fontSize:11,color:n.lida?DS.t3:DS.t2,lineHeight:1.5}}>{n.msg}</p>
                {n.ref&&<p style={{margin:"4px 0 0",fontSize:9,fontFamily:"monospace",color:DS.t3}}>Ref: {n.ref}</p>}
                {n.valor&&!n.lida&&<p style={{margin:"6px 0 0",fontSize:13,fontWeight:700,color:c.cor}}>{formatKz(n.valor)}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CHECK-IN ──────────────────────────────────────────
function CheckinCard({user,codigo,onPresenca,presencaHoje,isProf}){
  const [scanning,setScanning]=useState(false);
  const [line,setLine]=useState(0);
  const [confirmado,setConfirmado]=useState(presencaHoje);
  const hojeStr=new Date().toLocaleDateString("pt-AO",{weekday:"long",day:"2-digit",month:"long"});
  useEffect(()=>{setConfirmado(presencaHoje);},[presencaHoje]);
  useEffect(()=>{if(!scanning||confirmado)return;const t=setInterval(()=>setLine(l=>(l+3)%180),14);return()=>clearInterval(t);},[scanning,confirmado]);
  useEffect(()=>{
    if(!scanning||confirmado)return;
    const t=setTimeout(()=>{setScanning(false);onPresenca();setConfirmado(true);},2200);
    return()=>clearTimeout(t);
  },[scanning,confirmado]);
  const acor=isProf?"#378ADD":DS.gold;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{background:confirmado?DS.ok+"18":acor+"18",borderRadius:12,padding:"12px 16px",border:`1px solid ${confirmado?DS.ok:acor}55`,display:"flex",gap:12,alignItems:"center"}}>
        <span style={{fontSize:26}}>{confirmado?"✅":isProf?"🏫":"📷"}</span>
        <div>
          <p style={{margin:0,fontWeight:700,fontSize:13,color:confirmado?DS.ok:acor}}>{confirmado?"Presença registada!":"Marcar presença"}</p>
          <p style={{margin:0,fontSize:11,color:DS.t3}}>{confirmado?`Check-in — ${hojeStr}`:"Digitalize o seu QR Code na entrada."}</p>
        </div>
      </div>
      <div style={{background:DS.card,borderRadius:14,padding:"1.25rem",border:`1px solid ${acor}44`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:acor+"08"}}/>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <div><p style={{margin:0,fontSize:9,color:DS.t3,letterSpacing:1}}>FITCORE</p><p style={{margin:0,fontSize:8,color:DS.t3}}>{isProf?"Corpo docente":"Cartão de membro"}</p></div>
          {user.plano?<Badge cor={planoCor[user.plano]||acor}>{user.plano}</Badge>:<Badge cor={acor}>Personal Trainer</Badge>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <Av nome={user.nome} foto={user.foto} size={46}/>
          <div><p style={{margin:0,fontWeight:700,fontSize:15,color:DS.t1}}>{user.nome}</p><p style={{margin:0,fontSize:10,color:DS.t3}}>{UNIDADES.find(u=>u.id===user.unidade)?.nome||"FitCore"}</p></div>
        </div>
        <div style={{background:DS.bg0,borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`0.5px solid ${acor}33`}}>
          <div>
            <p style={{margin:"0 0 2px",fontSize:9,color:DS.t3,textTransform:"uppercase",letterSpacing:.5}}>Código</p>
            <p style={{margin:0,fontWeight:800,fontSize:17,color:acor,letterSpacing:2}}>{codigo}</p>
          </div>
          <div style={{background:DS.bg0,borderRadius:8,padding:6,border:`1px solid ${acor}44`,position:"relative"}}>
            {confirmado&&<div style={{position:"absolute",inset:0,borderRadius:7,background:DS.ok+"44",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2,fontSize:20}}>✅</div>}
            <QRCode id={codigo} size={56}/>
          </div>
        </div>
      </div>
      {!confirmado&&(
        <div style={{background:DS.card,borderRadius:14,padding:"1.25rem",border:`0.5px solid ${DS.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <p style={{margin:0,fontSize:11,color:DS.t3}}>Simulador de leitura — portão</p>
          <div style={{position:"relative",width:180,height:180,borderRadius:12,overflow:"hidden",border:`2px solid ${scanning?acor:DS.border}`,background:DS.bg0}}>
            {[[0,0],[1,0],[0,1],[1,1]].map(([r,cc],i)=>(
              <div key={i} style={{position:"absolute",top:r===0?10:"auto",bottom:r===1?10:"auto",left:cc===0?10:"auto",right:cc===1?10:"auto",width:18,height:18,borderTop:r===0?`3px solid ${scanning?acor:DS.border}`:"none",borderBottom:r===1?`3px solid ${scanning?acor:DS.border}`:"none",borderLeft:cc===0?`3px solid ${scanning?acor:DS.border}`:"none",borderRight:cc===1?`3px solid ${scanning?acor:DS.border}`:"none"}}/>
            ))}
            {scanning&&<div style={{position:"absolute",left:14,right:14,top:line+10,height:2,background:`linear-gradient(90deg,transparent,${acor},transparent)`,boxShadow:`0 0 8px ${acor}`}}/>}
            {!scanning&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}><span style={{fontSize:30,opacity:.2}}>📷</span><p style={{margin:0,fontSize:10,color:DS.t3,textAlign:"center",padding:"0 16px"}}>Prima para simular leitura</p></div>}
          </div>
          <Btn full variant={isProf?"outline":"gold"} onClick={()=>setScanning(true)} disabled={scanning}>
            {scanning?"A ler QR Code…":"📷 Simular leitura"}
          </Btn>
        </div>
      )}
      {confirmado&&(
        <div style={{background:DS.ok+"14",borderRadius:12,padding:"12px",border:`0.5px solid ${DS.ok}44`}}>
          <p style={{margin:"0 0 8px",fontWeight:600,fontSize:12,color:DS.ok}}>✅ Entrada confirmada</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["Data",new Date().toLocaleDateString("pt-AO")],["Hora",hhmm()],["Função",isProf?"Personal Trainer":"Membro"],["Unidade","Luanda Centro"]].map(([l,v])=>(
              <div key={l} style={{background:DS.ok+"0A",borderRadius:8,padding:"6px 10px"}}>
                <p style={{margin:0,fontSize:9,color:DS.ok,opacity:.7}}>{l}</p>
                <p style={{margin:0,fontSize:12,fontWeight:600,color:DS.ok}}>{v}</p>
              </div>
            ))}
          </div>
          <p style={{margin:"8px 0 0",fontSize:11,color:DS.ok,textAlign:"center"}}>{isProf?`Boa aula, ${user.nome.split(" ")[0]}! 🏋️`:`Bom treino, ${user.nome.split(" ")[0]}! 💪`}</p>
        </div>
      )}
      <div style={{background:DS.card,borderRadius:12,padding:"12px",border:`0.5px solid ${DS.border}`}}>
        <p style={{margin:"0 0 8px",fontWeight:600,fontSize:11,color:DS.t2}}>Presenças — {new Date().toLocaleDateString("pt-AO",{month:"long",year:"numeric"})}</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {["D","S","T","Q","Q","S","S"].map((d,i)=><p key={i} style={{margin:0,fontSize:9,color:DS.t3,textAlign:"center"}}>{d}</p>)}
          {Array(new Date(new Date().getFullYear(),new Date().getMonth(),1).getDay()).fill(null).map((_,i)=><div key={"o"+i}/>)}
          {Array(new Date().getDate()).fill(null).map((_,i)=>{
            const d=i+1,isH=d===new Date().getDate();
            const dow=new Date(new Date().getFullYear(),new Date().getMonth(),d).getDay();
            const tp=(dow>=1&&dow<=5&&d<new Date().getDate())||(confirmado&&isH);
            return(
              <div key={d} style={{aspectRatio:"1",borderRadius:5,background:isH&&confirmado?DS.gold:tp?DS.gold+"22":isH?DS.cardH:DS.bg0,display:"flex",alignItems:"center",justifyContent:"center",border:`0.5px solid ${isH?DS.gold+"66":"transparent"}`}}>
                <p style={{margin:0,fontSize:9,fontWeight:isH?700:400,color:isH&&confirmado?DS.bg0:tp?DS.gold:isH?DS.gold:DS.t3}}>{d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── TREINO ────────────────────────────────────────────
function PlanoDeTreino({plano}){
  const [diaAtivo,setDiaAtivo]=useState(0);
  const [exAberto,setExAberto]=useState(null);
  const dia=SEMANA[diaAtivo];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:DS.card,borderRadius:12,padding:"12px",border:`0.5px solid ${DS.border}`}}>
        <p style={{margin:"0 0 2px",fontWeight:700,fontSize:13,color:DS.t1}}>Plano Semanal</p>
        <p style={{margin:0,fontSize:10,color:DS.t3}}>IA · Plano <span style={{color:planoCor[plano]||DS.gold,fontWeight:600}}>{plano}</span></p>
      </div>
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
        {SEMANA.map((s,i)=>(
          <button key={i} onClick={()=>{setDiaAtivo(i);setExAberto(null);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"7px 10px",borderRadius:10,border:`1px solid ${diaAtivo===i?DS.gold:DS.border}`,background:diaAtivo===i?DS.gold+"18":DS.card,cursor:"pointer",flexShrink:0,minWidth:44}}>
            <span style={{fontSize:13}}>{s.icon}</span>
            <span style={{fontSize:9,fontWeight:diaAtivo===i?700:400,color:diaAtivo===i?DS.gold:DS.t3}}>{s.dia}</span>
          </button>
        ))}
      </div>
      <div style={{background:DS.card,borderRadius:12,padding:"12px",border:`0.5px solid ${DS.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:18}}>{dia.icon}</span>
          <div><p style={{margin:0,fontWeight:700,fontSize:13,color:DS.t1}}>{dia.foco}</p><p style={{margin:0,fontSize:10,color:DS.t3}}>{dia.exercicios.length>0?`${dia.exercicios.length} exercícios`:"Sem treino"}</p></div>
        </div>
        {dia.exercicios.length===0&&<p style={{margin:0,fontSize:11,color:DS.t3,textAlign:"center",padding:"1rem 0"}}>{dia.foco==="Cardio HIIT"?"30–45 min cardio moderado.":"Descanse e recupere!"}</p>}
        {dia.exercicios.map((ex,idx)=>{
          const ab=exAberto===idx;
          return(
            <div key={idx} style={{marginBottom:7,border:`0.5px solid ${ab?DS.gold:DS.border}`,borderRadius:10,overflow:"hidden"}}>
              <div onClick={()=>setExAberto(ab?null:idx)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",cursor:"pointer",background:ab?DS.gold+"12":DS.cardH}}>
                <div style={{width:32,height:32,borderRadius:7,background:DS.gold+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>💪</div>
                <div style={{flex:1}}><p style={{margin:0,fontWeight:600,fontSize:12,color:ab?DS.gold:DS.t1}}>{ex.nome}</p><p style={{margin:0,fontSize:10,color:DS.t3}}>{ex.maquina}</p></div>
                <div style={{textAlign:"right",flexShrink:0}}><Badge cor={DS.gold}>{ex.series}×{ex.reps}</Badge><p style={{margin:"3px 0 0",fontSize:9,color:DS.t3}}>⏱ {ex.descanso}</p></div>
                <span style={{color:DS.t3,fontSize:11,marginLeft:4}}>{ab?"▲":"▼"}</span>
              </div>
              {ab&&(
                <div style={{padding:"10px 12px",background:DS.card,borderTop:`0.5px solid ${DS.gold}33`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:5,marginBottom:8}}>
                    {[["Séries",ex.series,DS.gold],["Reps",ex.reps,DS.ok],["Descanso",ex.descanso,DS.warn],["Músculo",ex.musculo,DS.t2]].map(([l,v,c])=>(
                      <div key={l} style={{background:DS.bg0,borderRadius:6,padding:"5px 7px",textAlign:"center"}}>
                        <p style={{margin:"0 0 1px",fontSize:8,color:DS.t3,textTransform:"uppercase"}}>{l}</p>
                        <p style={{margin:0,fontSize:10,fontWeight:700,color:c}}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{background:DS.gold+"14",borderRadius:8,padding:"6px 10px",marginBottom:5,display:"flex",gap:6}}><span style={{fontSize:12}}>🏋️</span><p style={{margin:0,fontSize:11,color:DS.gold}}>{ex.maquina}</p></div>
                  <div style={{background:DS.warn+"14",borderRadius:8,padding:"6px 10px",display:"flex",gap:6}}><span style={{fontSize:12}}>💡</span><p style={{margin:0,fontSize:11,color:DS.warn}}>{ex.dica}</p></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{background:DS.card,borderRadius:12,padding:"12px",border:`0.5px solid ${DS.border}`}}>
        <p style={{margin:"0 0 8px",fontWeight:600,fontSize:11,color:DS.t2}}>Evolução de carga — Supino</p>
        <LineChart series={EXERCICIOS[0].series}/>
      </div>
    </div>
  );
}

// ── HIDRATAÇÃO ────────────────────────────────────────
function PainelAgua({user,agua,setAgua}){
  const meta=aguaPorPlano[user.plano]||3.0;
  const pct=Math.min((agua/meta)*100,100);
  const cor=pct>=80?DS.ok:pct>=50?DS.gold:DS.err;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:DS.card,borderRadius:14,padding:"1.5rem",border:`0.5px solid ${DS.gold}33`,textAlign:"center"}}>
        <p style={{margin:"0 0 4px",fontSize:40}}>💧</p>
        <p style={{margin:"0 0 4px",fontSize:34,fontWeight:800,color:cor}}>{agua.toFixed(1)}L</p>
        <p style={{margin:"0 0 14px",fontSize:11,color:DS.t3}}>de {meta}L diários — Plano {user.plano}</p>
        <div style={{background:DS.bg0,borderRadius:8,height:8,marginBottom:14,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${cor}88,${cor})`,borderRadius:8,transition:"width .5s"}}/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          {[0.25,0.5,1].map(q=><Btn key={q} variant="gold" onClick={()=>setAgua(a=>Math.min(a+q,meta))}>+{q}L</Btn>)}
        </div>
      </div>
      <div style={{background:DS.card,borderRadius:12,padding:"12px",border:`0.5px solid ${DS.border}`}}>
        <p style={{margin:"0 0 8px",fontWeight:600,fontSize:11,color:DS.t2}}>Lembretes de hoje</p>
        {["06:00","08:00","10:00","12:00","14:00","16:00","18:00","20:00"].map((h,i)=>(
          <div key={h} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`0.5px solid ${DS.border}`}}>
            <span style={{fontSize:12,opacity:i<4?1:.3}}>💧</span>
            <span style={{fontSize:11,flex:1,color:i<4?DS.t1:DS.t3}}>{h} — Beber 0.5L</span>
            <span style={{fontSize:10,color:i<4?DS.ok:DS.t3,fontWeight:500}}>{i<4?"✓ Feito":"Pendente"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── COMUNIDADE ────────────────────────────────────────
function PainelComunidade({user,posts,setPosts,unidadeId}){
  const [novoP,setNovoP]=useState("");
  const [tipoP,setTipoP]=useState("progresso");
  const [liked,setLiked]=useState([]);
  const [expAberto,setExpAberto]=useState(null);
  const [novoC,setNovoC]=useState("");
  const tipoCfg={conquista:{icon:"🏆",cor:DS.gold},academia:{icon:"📢",cor:DS.ok},progresso:{icon:"📈",cor:"#D4537E"},dica:{icon:"💡",cor:"#378ADD"}};
  const uid=unidadeId||user.unidade;
  const like=id=>{if(liked.includes(id)){setLiked(l=>l.filter(x=>x!==id));setPosts(p=>p.map(x=>x.id===id?{...x,likes:x.likes-1}:x));}else{setLiked(l=>[...l,id]);setPosts(p=>p.map(x=>x.id===id?{...x,likes:x.likes+1}:x));}};
  const comentar=id=>{if(!novoC.trim())return;setPosts(p=>p.map(x=>x.id===id?{...x,comentarios:[...x.comentarios,novoC]}:x));setNovoC("");};
  const publicar=()=>{if(!novoP.trim())return;const tC={progresso:"#D4537E",dica:"#378ADD",conquista:DS.gold,academia:DS.ok};setPosts(p=>[{id:Date.now(),autor:user.nome,avatar:user.avatar,tipo:tipoP,conteudo:novoP,hora:hhmm(),likes:0,comentarios:[],unidade:uid,cor:tC[tipoP]||DS.gold},...p]);setNovoP("");};
  const feed=posts.filter(p=>p.unidade===uid);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{background:DS.card,border:`0.5px solid ${DS.border}`,borderRadius:12,padding:"12px"}}>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <Av nome={user.nome} size={32}/>
          <textarea value={novoP} onChange={e=>setNovoP(e.target.value)} placeholder="Partilhe conquista, dica ou progresso…" rows={2} style={{flex:1,resize:"none",border:`0.5px solid ${DS.border}`,borderRadius:8,padding:"7px 10px",fontSize:11,background:DS.cardH,color:DS.t1,fontFamily:"inherit",outline:"none"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:5}}>
            {[["progresso","📈"],["dica","💡"],["conquista","🏆"],["academia","📢"]].map(([t,ic])=>{
              const cor=tipoCfg[t]?.cor||DS.gold;
              return <button key={t} onClick={()=>setTipoP(t)} style={{background:tipoP===t?cor+"22":"transparent",color:tipoP===t?cor:DS.t3,border:`0.5px solid ${tipoP===t?cor:DS.border}`,borderRadius:20,padding:"3px 9px",fontSize:11,cursor:"pointer"}}>{ic}</button>;
            })}
          </div>
          <Btn small variant="gold" onClick={publicar}>Publicar</Btn>
        </div>
      </div>
      {feed.map(post=>{
        const cfg=tipoCfg[post.tipo]||{icon:"🔔",cor:DS.gold};
        const lk=liked.includes(post.id);
        const ab=expAberto===post.id;
        return(
          <div key={post.id} style={{background:DS.card,border:`0.5px solid ${DS.border}`,borderRadius:12,padding:"12px"}}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
              <Av nome={post.autor} size={32}/>
              <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:5}}><p style={{margin:0,fontWeight:600,fontSize:12,color:DS.t1}}>{post.autor}</p><Badge cor={cfg.cor}>{cfg.icon}</Badge></div></div>
              <span style={{fontSize:9,color:DS.t3}}>{post.hora}</span>
            </div>
            <p style={{margin:"0 0 8px",fontSize:11,color:DS.t2,lineHeight:1.6}}>{post.conteudo}</p>
            <div style={{display:"flex",gap:12,borderTop:`0.5px solid ${DS.border}`,paddingTop:7}}>
              <button onClick={()=>like(post.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:lk?"#D4537E":DS.t3,padding:0}}>{lk?"❤️":"🤍"} {post.likes}</button>
              <button onClick={()=>setExpAberto(ab?null:post.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:DS.t3,padding:0}}>💬 {post.comentarios.length}</button>
            </div>
            {ab&&(
              <div style={{marginTop:8,paddingTop:8,borderTop:`0.5px solid ${DS.border}`}}>
                {post.comentarios.map((c,i)=><div key={i} style={{background:DS.cardH,borderRadius:7,padding:"5px 9px",marginBottom:5}}><p style={{margin:0,fontSize:11,color:DS.t2}}>{c}</p></div>)}
                <div style={{display:"flex",gap:6,marginTop:6}}>
                  <input value={novoC} onChange={e=>setNovoC(e.target.value)} onKeyDown={e=>e.key==="Enter"&&comentar(post.id)} placeholder="Comentar…" style={{flex:1,border:`0.5px solid ${DS.border}`,borderRadius:7,padding:"5px 9px",fontSize:11,background:DS.cardH,color:DS.t1,outline:"none"}}/>
                  <Btn small variant="outline" onClick={()=>comentar(post.id)}>→</Btn>
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
// INSCRIÇÃO
// ═══════════════════════════════════════════════════════
function gerarCodigo(nome,unidade){
  const ini=nome.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2);
  const num=Math.floor(1000+Math.random()*9000);
  return `FC${unidade.replace("U","")}-${ini}${num}`;
}
function gerarSenha(){
  const c="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({length:10},()=>c[Math.floor(Math.random()*c.length)]).join("");
}

function Inscricao({credenciais,setCredenciais,onLogin,onVoltar}){
  const [passo,setPasso]=useState(1);
  const [foto,setFoto]=useState(null);
  const fileRef=useRef();
  const [form,setForm]=useState({nome:"",bi:"",telefone:"",email:"",dob:"",genero:"",objetivo:"",plano:"Premium",unidade:"U1"});
  const [erros,setErros]=useState({});
  const [gerado,setGerado]=useState(null);
  const [copiado,setCopiado]=useState(null);
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const validar=()=>{
    const e={};
    ["nome","bi","telefone","email","dob","genero","objetivo","plano","unidade"].forEach(k=>{if(!form[k].trim())e[k]="Obrigatório";});
    if(form.email&&!form.email.includes("@"))e.email="E-mail inválido";
    setErros(e);
    return !Object.keys(e).length;
  };
  const inscrever=()=>{
    if(!validar())return;
    const codigo=gerarCodigo(form.nome,form.unidade);
    const senha=gerarSenha();
    const email=form.email.trim().toLowerCase();
    const avatar=form.nome.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
    const novoAluno={senha,perfil:"aluno",nome:form.nome,unidade:form.unidade,plano:form.plano,avatar,aguaHoje:0,treinos:0,ausencias:0,status:"Ativo",codigo,foto:foto||null,bi:form.bi,telefone:form.telefone,dob:form.dob,genero:form.genero,objetivo:form.objetivo};
    setCredenciais(prev=>({...prev,[email]:novoAluno}));
    setGerado({...novoAluno,email});
    setPasso(2);
  };
  const copiar=(texto,chave)=>{navigator.clipboard?.writeText(texto).catch(()=>{});setCopiado(chave);setTimeout(()=>setCopiado(null),2000);};
  const inpSt=(err)=>({display:"block",width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${err?DS.err:DS.border}`,background:DS.cardH,color:DS.t1,fontSize:12,boxSizing:"border-box",outline:"none"});
  const Campo=({label,err,children})=>(
    <div><label style={{fontSize:10,fontWeight:500,color:err?DS.err:DS.t3,display:"block",marginBottom:4}}>{label}{err&&<span style={{marginLeft:5,fontSize:9}}>— {err}</span>}</label>{children}</div>
  );
  const Secao=({titulo,children})=>(
    <div style={{background:DS.card,borderRadius:12,padding:"1rem",border:`0.5px solid ${DS.border}`}}>
      <p style={{margin:"0 0 10px",fontWeight:700,fontSize:10,color:DS.gold,textTransform:"uppercase",letterSpacing:.5}}>{titulo}</p>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>{children}</div>
    </div>
  );
  if(passo===2&&gerado){
    const un=UNIDADES.find(u=>u.id===gerado.unidade)||UNIDADES[0];
    return(
      <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:440,margin:"0 auto"}}>
        <div style={{textAlign:"center",padding:"1rem 0"}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:DS.ok+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 8px",border:`1px solid ${DS.ok}44`}}>✅</div>
          <p style={{margin:0,fontWeight:800,fontSize:16,color:DS.t1}}>Inscrição concluída!</p>
          <p style={{margin:"3px 0 0",fontSize:11,color:DS.t3}}>Credenciais geradas com sucesso.</p>
        </div>
        <div style={{background:DS.card,borderRadius:16,padding:"1.25rem",border:`1px solid ${DS.gold}55`,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-20,width:70,height:70,borderRadius:"50%",background:DS.gold+"08"}}/>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <div><p style={{margin:0,fontSize:9,color:DS.t3,letterSpacing:1}}>FITCORE</p><p style={{margin:0,fontSize:8,color:DS.t3}}>Cartão de membro</p></div>
            <Badge cor={planoCor[gerado.plano]||DS.gold}>{gerado.plano}</Badge>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            {gerado.foto?<img src={gerado.foto} alt={gerado.nome} style={{width:46,height:46,borderRadius:"50%",objectFit:"cover",border:`1.5px solid ${DS.gold}66`}}/>:<Av nome={gerado.nome} size={46}/>}
            <div><p style={{margin:0,fontWeight:700,fontSize:14,color:DS.t1}}>{gerado.nome}</p><p style={{margin:"2px 0",fontSize:10,color:DS.t3}}>{gerado.objetivo}</p><p style={{margin:0,fontSize:9,color:DS.t3}}>{un.nome}</p></div>
          </div>
          <div style={{background:DS.bg0,borderRadius:10,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`0.5px solid ${DS.gold}33`}}>
            <div><p style={{margin:"0 0 2px",fontSize:8,color:DS.t3,textTransform:"uppercase",letterSpacing:.5}}>Código</p><p style={{margin:0,fontWeight:800,fontSize:17,color:DS.gold,letterSpacing:2}}>{gerado.codigo}</p></div>
            <div style={{background:DS.bg0,borderRadius:7,padding:5,border:`0.5px solid ${DS.gold}33`}}><QRCode id={gerado.codigo} size={52}/></div>
          </div>
        </div>
        <div style={{background:DS.card,borderRadius:12,padding:"12px",border:`0.5px solid ${DS.border}`}}>
          <p style={{margin:"0 0 8px",fontWeight:700,fontSize:10,color:DS.gold,textTransform:"uppercase",letterSpacing:.5}}>🔐 Credenciais</p>
          {[["E-mail",gerado.email,"email"],["Senha",gerado.senha,"senha"],["Código",gerado.codigo,"codigo"]].map(([label,valor,chave])=>(
            <div key={chave} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:DS.cardH,borderRadius:8,padding:"8px 10px",marginBottom:5}}>
              <div><p style={{margin:"0 0 1px",fontSize:9,color:DS.t3}}>{label}</p><p style={{margin:0,fontSize:11,fontWeight:700,fontFamily:"monospace",color:DS.t1}}>{valor}</p></div>
              <Btn small variant={copiado===chave?"success":"outline"} onClick={()=>copiar(valor,chave)}>{copiado===chave?"✓":"Copiar"}</Btn>
            </div>
          ))}
        </div>
        <Btn full variant="gold" onClick={()=>onLogin({email:gerado.email,...gerado})}>Entrar na plataforma →</Btn>
        <Btn full variant="ghost" onClick={()=>{setPasso(1);setGerado(null);setFoto(null);setForm({nome:"",bi:"",telefone:"",email:"",dob:"",genero:"",objetivo:"",plano:"Premium",unidade:"U1"});}}>+ Inscrever outro aluno</Btn>
        {onVoltar&&<Btn full variant="ghost" onClick={onVoltar}>← Voltar ao painel</Btn>}
      </div>
    );
  }
  return(
    <div style={{maxWidth:460,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"0.5rem 0"}}>
        {onVoltar&&<Btn small variant="ghost" onClick={onVoltar}>← Voltar</Btn>}
        <div><p style={{margin:0,fontWeight:700,fontSize:15,color:DS.t1}}>Nova inscrição</p><p style={{margin:0,fontSize:10,color:DS.t3}}>Preencha os dados do novo membro</p></div>
      </div>
      <div style={{background:DS.card,borderRadius:12,padding:"1rem",border:`0.5px solid ${DS.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
        <div style={{position:"relative",cursor:"pointer"}} onClick={()=>fileRef.current.click()}>
          {foto?<img src={foto} alt="foto" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:`2px solid ${DS.gold}66`}}/>
            :<div style={{width:72,height:72,borderRadius:"50%",background:DS.cardH,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:`2px dashed ${DS.gold}44`,gap:3}}><span style={{fontSize:20}}>📷</span><span style={{fontSize:9,color:DS.gold}}>Foto</span></div>}
          <div style={{position:"absolute",bottom:2,right:2,width:20,height:20,borderRadius:"50%",background:DS.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:DS.bg0}}>✏️</div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setFoto(ev.target.result);r.readAsDataURL(f);}}/>
        <p style={{margin:0,fontSize:9,color:DS.t3}}>Foto opcional para o cartão de acesso</p>
      </div>
      <Secao titulo="👤 Dados pessoais">
        <Campo label="Nome completo *" err={erros.nome}><input value={form.nome} onChange={e=>{f("nome",e.target.value);setErros(p=>({...p,nome:""}));}} placeholder="Ex: Maria João Silva" style={inpSt(erros.nome)}/></Campo>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Campo label="Nº do BI *" err={erros.bi}><input value={form.bi} onChange={e=>{f("bi",e.target.value);setErros(p=>({...p,bi:""}));}} placeholder="000000000LA000" style={inpSt(erros.bi)}/></Campo>
          <Campo label="Data de nascimento *" err={erros.dob}><input type="date" value={form.dob} onChange={e=>{f("dob",e.target.value);setErros(p=>({...p,dob:""}));}} style={inpSt(erros.dob)}/></Campo>
        </div>
        <Campo label="Género *" err={erros.genero}>
          <div style={{display:"flex",gap:6}}>
            {["Masculino","Feminino","Outro"].map(g=>(
              <button key={g} onClick={()=>{f("genero",g);setErros(p=>({...p,genero:""}));}} style={{flex:1,background:form.genero===g?DS.gold+"22":"transparent",color:form.genero===g?DS.gold:DS.t3,border:`1px solid ${form.genero===g?DS.gold:DS.border}`,borderRadius:7,padding:"7px 0",fontSize:11,cursor:"pointer",fontWeight:form.genero===g?600:400}}>{g}</button>
            ))}
          </div>
        </Campo>
        <Campo label="Telefone *" err={erros.telefone}><input value={form.telefone} onChange={e=>{f("telefone",e.target.value);setErros(p=>({...p,telefone:""}));}} placeholder="+244 9XX XXX XXX" style={inpSt(erros.telefone)}/></Campo>
        <Campo label="E-mail *" err={erros.email}><input value={form.email} onChange={e=>{f("email",e.target.value);setErros(p=>({...p,email:""}));}} placeholder="nome@email.com" style={inpSt(erros.email)}/></Campo>
      </Secao>
      <Secao titulo="🏋️ Plano & Objectivo">
        <Campo label="Objectivo *" err={erros.objetivo}>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {["Perda de gordura","Ganho muscular","Condicionamento","Performance","Saúde geral"].map(o=>(
              <button key={o} onClick={()=>{f("objetivo",o);setErros(p=>({...p,objetivo:""}));}} style={{background:form.objetivo===o?DS.gold+"22":"transparent",color:form.objetivo===o?DS.gold:DS.t3,border:`0.5px solid ${form.objetivo===o?DS.gold:DS.border}`,borderRadius:20,padding:"5px 11px",fontSize:11,cursor:"pointer",fontWeight:form.objetivo===o?600:400}}>{o}</button>
            ))}
          </div>
        </Campo>
        <Campo label="Plano *" err={erros.plano}>
          <div style={{display:"flex",gap:6}}>
            {[["Standard","KZ 12k",DS.t2],["Premium","KZ 18k",DS.gold],["Elite","KZ 28k",DS.goldL]].map(([p,pr,c])=>(
              <button key={p} onClick={()=>{f("plano",p);setErros(q=>({...q,plano:""}));}} style={{flex:1,background:form.plano===p?c+"22":"transparent",color:form.plano===p?c:DS.t3,border:`1px solid ${form.plano===p?c:DS.border}`,borderRadius:9,padding:"8px 4px",fontSize:11,cursor:"pointer",textAlign:"center"}}>
                <p style={{margin:"0 0 2px",fontWeight:700,fontSize:12}}>{p}</p>
                <p style={{margin:0,fontSize:10,opacity:.8}}>{pr}/mês</p>
              </button>
            ))}
          </div>
        </Campo>
        <Campo label="Unidade *" err={erros.unidade}>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {UNIDADES.map(u=>(
              <button key={u.id} onClick={()=>{f("unidade",u.id);setErros(p=>({...p,unidade:""}));}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:form.unidade===u.id?DS.gold+"18":"transparent",border:`1px solid ${form.unidade===u.id?DS.gold:DS.border}`,borderRadius:9,padding:"8px 12px",cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:6,height:6,borderRadius:"50%",background:form.unidade===u.id?DS.gold:DS.t3}}/><span style={{fontSize:11,color:form.unidade===u.id?DS.gold:DS.t2,fontWeight:form.unidade===u.id?600:400}}>{u.nome}</span></div>
                <span style={{fontSize:9,color:DS.t3}}>{u.cidade}</span>
              </button>
            ))}
          </div>
        </Campo>
      </Secao>
      {Object.keys(erros).length>0&&<div style={{background:DS.err+"14",borderRadius:8,padding:"8px 12px",border:`0.5px solid ${DS.err}44`}}><p style={{margin:0,fontSize:11,color:DS.err}}>⚠️ Corrija os campos assinalados.</p></div>}
      <Btn full variant="gold" onClick={inscrever}>Inscrever e gerar credenciais ✨</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PAINÉIS
// ═══════════════════════════════════════════════════════
function PainelAluno({user,posts,setPosts,presencaHoje,onPresenca,notifPerfil,marcarLida}){
  const naoLidas=(notifPerfil||[]).filter(n=>!n.lida).length;
  const [aba,setAba]=useState("inicio");
  const [agua,setAgua]=useState(user.aguaHoje||0);
  const codigo=user.codigo||("FC1-"+user.avatar);
  const abas=[{id:"inicio",l:"Início"},{id:"checkin",l:"Check-in"},{id:"notifs",l:`🔔${naoLidas>0?` (${naoLidas})`:""}`},{id:"treino",l:"Treino"},{id:"agua",l:"Água"},{id:"comunidade",l:"Feed"}];
  return(
    <div>
      <div style={{background:DS.card,borderRadius:12,padding:"12px",marginBottom:12,border:`0.5px solid ${DS.gold}33`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Av nome={user.nome} foto={user.foto} size={44}/>
          <div style={{flex:1}}>
            <p style={{margin:0,fontWeight:700,fontSize:15,color:DS.t1}}>Olá, {user.nome.split(" ")[0]} 👋</p>
            <div style={{display:"flex",gap:5,marginTop:3}}><Badge cor={planoCor[user.plano]||DS.gold}>{user.plano}</Badge><Badge cor={DS.ok}>● Activo</Badge></div>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${DS.border}`,marginBottom:12,overflowX:"auto"}}>
        {abas.map(a=><button key={a.id} onClick={()=>setAba(a.id)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px 11px",fontSize:11,fontWeight:aba===a.id?700:400,color:aba===a.id?DS.gold:DS.t3,borderBottom:aba===a.id?`2px solid ${DS.gold}`:"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap"}}>{a.l}</button>)}
      </div>
      {aba==="inicio"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {naoLidas>0&&(
            <div onClick={()=>setAba("notifs")} style={{background:DS.err+"14",borderRadius:10,padding:"10px 12px",border:`1px solid ${DS.err}44`,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:DS.err,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:700,flexShrink:0}}>{naoLidas}</div>
              <div style={{flex:1}}><p style={{margin:0,fontWeight:700,fontSize:12,color:DS.err}}>{naoLidas} notificação(ões) por ler</p><p style={{margin:0,fontSize:10,color:DS.err,opacity:.7}}>Pode incluir cobranças da academia.</p></div>
              <span style={{color:DS.err,fontSize:14}}>›</span>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Chip label="Código" valor={codigo} cor={DS.gold}/>
            <Chip label="Treinos/mês" valor={user.treinos||0} cor={DS.ok}/>
          </div>
          <div style={{background:DS.card,borderRadius:10,padding:"12px",border:`0.5px solid ${DS.border}`}}>
            <p style={{margin:"0 0 5px",fontWeight:600,fontSize:11,color:DS.t2}}>💧 Hidratação hoje</p>
            <GoldBar valor={agua} max={aguaPorPlano[user.plano]||3} height={6}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:DS.t3,marginTop:3,marginBottom:8}}><span>{agua.toFixed(1)}L</span><span>{aguaPorPlano[user.plano]||3}L</span></div>
            <div style={{display:"flex",gap:5}}>
              {[0.25,0.5,1].map(q=><Btn key={q} small full variant="outline" onClick={()=>setAgua(a=>Math.min(a+q,aguaPorPlano[user.plano]||3))}>+{q}L</Btn>)}
            </div>
          </div>
          <div style={{background:DS.card,borderRadius:10,padding:"12px",border:`0.5px solid ${DS.border}`}}>
            <p style={{margin:"0 0 7px",fontWeight:600,fontSize:11,color:DS.t2}}>Notificações recentes</p>
            {[{i:"💧",t:"Beba 0.5L de água agora",h:"10:00"},{i:"🏋️",t:"Treino hoje: Peito & Tríceps",h:"07:30"},{i:"📢",t:"Academia fecha às 21h hoje",h:"06:00"}].map((n,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:`0.5px solid ${DS.border}`,alignItems:"center"}}>
                <span style={{fontSize:13}}>{n.i}</span><p style={{margin:0,fontSize:11,color:DS.t2,flex:1}}>{n.t}</p><span style={{fontSize:9,color:DS.t3}}>{n.h}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {aba==="checkin"&&<CheckinCard user={user} codigo={codigo} onPresenca={onPresenca} presencaHoje={presencaHoje} isProf={false}/>}
      {aba==="notifs"&&<PainelNotifs notifs={notifPerfil||[]} marcarLida={marcarLida}/>}
      {aba==="treino"&&<PlanoDeTreino plano={user.plano}/>}
      {aba==="agua"&&<PainelAgua user={user} agua={agua} setAgua={setAgua}/>}
      {aba==="comunidade"&&<PainelComunidade user={user} posts={posts} setPosts={setPosts}/>}
    </div>
  );
}

function PainelGestor({user,unidades,unidadeAtual,setUnidadeAtual,posts,setPosts,credenciais,setCredenciais,onNovoAluno,presencaHoje,onPresenca,mensalidades,setMensalidades,enviarNotifAluno}){
  const isTrainer=user.perfil==="trainer";
  const [aba,setAba]=useState(isTrainer?"checkin":"unidades");
  const [mostrarInscricao,setMostrarInscricao]=useState(false);
  const [notifAnivEnviadas,setNotifAnivEnviadas]=useState([]);
  const [exSel,setExSel]=useState(EXERCICIOS[0]);
  const [histEx,setHistEx]=useState(EXERCICIOS);
  const [alunoSel,setAlunoSel]=useState({id:"A001",nome:"Ana Moreira",avatar:"AM"});
  const [novaC,setNovaC]=useState("");
  const [novasR,setNovasR]=useState("");
  const [msg,setMsg]=useState(null);
  const emAtrasoCount=mensalidades.filter(m=>!m.pago&&diasAtraso(m.vencimento)>0).length;
  const abas=isTrainer
    ?[{id:"checkin",l:"Check-in"},{id:"treino",l:"Personal"},{id:"comunidade",l:"Feed"}]
    :[{id:"unidades",l:"Dashboard"},{id:"financeiro",l:`Finanças${emAtrasoCount>0?" 🔴":""}`},{id:"comunidade",l:"Feed"}];
  const exA=histEx.find(e=>e.nome===exSel.nome)||exSel;
  const ultima=exA.series[exA.series.length-1];
  const primeira=exA.series[0];
  const evo=((ultima.c-primeira.c)/primeira.c*100).toFixed(1);
  const registar=()=>{
    const c=parseFloat(novaC),r=parseInt(novasR);
    if(!c||!r)return;
    setHistEx(prev=>prev.map(e=>e.nome===exA.nome?{...e,series:[...e.series,{s:ultima.s+1,c,r}]}:e));
    setMsg(`✅ ${c}kg × ${r} reps`);setNovaC("");setNovasR("");
    setTimeout(()=>setMsg(null),3000);
  };
  const codigo=user.codigo||`FC-PT-${user.avatar}`;
  if(mostrarInscricao) return <Inscricao credenciais={credenciais} setCredenciais={setCredenciais} onLogin={u=>{onNovoAluno(u);setMostrarInscricao(false);}} onVoltar={()=>setMostrarInscricao(false)}/>;
  return(
    <div>
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${DS.border}`,marginBottom:12}}>
        {abas.map(a=><button key={a.id} onClick={()=>setAba(a.id)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px 14px",fontSize:11,fontWeight:aba===a.id?700:400,color:aba===a.id?DS.gold:DS.t3,borderBottom:aba===a.id?`2px solid ${DS.gold}`:"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap"}}>{a.l}</button>)}
      </div>
      {aba==="unidades"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <WidgetAniversariantes enviarNotifAluno={enviarNotifAluno} notifEnviadas={notifAnivEnviadas} setNotifEnviadas={setNotifAnivEnviadas}/>
          <Btn full variant="gold" onClick={()=>setMostrarInscricao(true)}>✨ Inscrever novo aluno</Btn>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
            {[["248","Alunos activos",DS.gold],["84%","Retenção",DS.ok],["KZ 4.2M","Receita mensal",DS.gold],[emAtrasoCount+"","Em atraso",DS.err]].map(([v,l,c])=>(
              <div key={l} style={{background:DS.card,border:`0.5px solid ${DS.border}`,borderRadius:10,padding:"10px 12px"}}>
                <p style={{margin:"0 0 2px",fontSize:9,color:DS.t3,textTransform:"uppercase",letterSpacing:.5}}>{l}</p>
                <p style={{margin:0,fontSize:18,fontWeight:700,color:c}}>{v}</p>
              </div>
            ))}
          </div>
          {unidades.map(u=>{
            const sel=unidadeAtual.id===u.id;
            return(
              <div key={u.id} onClick={()=>setUnidadeAtual(u)} style={{background:DS.card,border:`1px solid ${sel?DS.gold:DS.border}`,borderRadius:12,padding:"12px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:7,height:7,borderRadius:"50%",background:sel?DS.gold:DS.t3}}/><p style={{margin:0,fontWeight:600,fontSize:12,color:sel?DS.gold:DS.t1}}>{u.nome}</p></div>
                  {sel&&<Badge cor={DS.gold}>Activa</Badge>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {[["Alunos",u.alunos,DS.t1],["KZ "+u.receita,"Receita",DS.t1],[u.presenca+"%","Presença",u.presenca>=80?DS.ok:u.presenca>=70?DS.gold:DS.err]].map(([v,l,c])=>(
                    <div key={l} style={{background:DS.cardH,borderRadius:7,padding:"6px 8px"}}><p style={{margin:0,fontSize:9,color:DS.t3}}>{l}</p><p style={{margin:0,fontSize:12,fontWeight:600,color:c}}>{v}</p></div>
                  ))}
                </div>
                <div style={{marginTop:7}}><MiniBar valor={u.presenca} max={100} cor={u.presenca>=80?DS.ok:u.presenca>=70?DS.gold:DS.err}/></div>
              </div>
            );
          })}
        </div>
      )}
      {aba==="financeiro"&&<ModFinanceiro mensalidades={mensalidades} setMensalidades={setMensalidades} enviarNotifAluno={enviarNotifAluno}/>}
      {aba==="checkin"&&<CheckinCard user={user} codigo={codigo} onPresenca={onPresenca} presencaHoje={presencaHoje} isProf={isTrainer}/>}
      {aba==="treino"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {[{id:"A001",nome:"Ana Moreira",avatar:"AM"},{id:"A004",nome:"Bruno Silva",avatar:"BS"},{id:"A002",nome:"Carlos Lopes",avatar:"CL"}].map(a=>(
              <div key={a.id} onClick={()=>setAlunoSel(a)} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 12px",borderRadius:20,border:`1px solid ${alunoSel.id===a.id?DS.gold:DS.border}`,background:alunoSel.id===a.id?DS.gold+"18":DS.card,cursor:"pointer"}}>
                <Av nome={a.nome} size={22}/><p style={{margin:0,fontSize:11,color:alunoSel.id===a.id?DS.gold:DS.t2,fontWeight:alunoSel.id===a.id?600:400}}>{a.nome.split(" ")[0]}</p>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {histEx.map(e=><button key={e.nome} onClick={()=>setExSel(e)} style={{background:exSel.nome===e.nome?DS.gold+"22":"transparent",color:exSel.nome===e.nome?DS.gold:DS.t3,border:`0.5px solid ${exSel.nome===e.nome?DS.gold:DS.border}`,borderRadius:20,padding:"4px 12px",fontSize:11,cursor:"pointer",fontWeight:exSel.nome===e.nome?600:400}}>{e.nome}</button>)}
          </div>
          <div style={{background:DS.card,borderRadius:12,padding:"12px",border:`0.5px solid ${DS.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div><p style={{margin:0,fontWeight:700,fontSize:13,color:DS.t1}}>{exA.nome}</p><p style={{margin:0,fontSize:10,color:DS.t3}}>{exA.grupo} · {alunoSel.nome.split(" ")[0]}</p></div>
              <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:19,fontWeight:800,color:DS.gold}}>+{evo}%</p><p style={{margin:0,fontSize:9,color:DS.t3}}>evolução</p></div>
            </div>
            <LineChart series={exA.series}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10}}>
              {[["Inicial",primeira.c+"kg",DS.t3],["Actual",ultima.c+"kg",DS.gold],["Recorde",Math.max(...exA.series.map(s=>s.c))+"kg",DS.ok]].map(([l,v,c])=><Chip key={l} label={l} valor={v} cor={c}/>)}
            </div>
          </div>
          <div style={{background:DS.card,borderRadius:12,padding:"12px",border:`0.5px solid ${DS.border}`}}>
            <p style={{margin:"0 0 8px",fontWeight:600,fontSize:11,color:DS.t2}}>Registar sessão</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><p style={{margin:"0 0 3px",fontSize:9,color:DS.t3}}>Carga (kg)</p><input type="number" value={novaC} onChange={e=>setNovaC(e.target.value)} placeholder={`Ex: ${ultima.c+2.5}`} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`0.5px solid ${DS.border}`,background:DS.cardH,color:DS.t1,fontSize:12,boxSizing:"border-box",outline:"none"}}/></div>
              <div><p style={{margin:"0 0 3px",fontSize:9,color:DS.t3}}>Repetições</p><input type="number" value={novasR} onChange={e=>setNovasR(e.target.value)} placeholder={`Ex: ${ultima.r}`} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`0.5px solid ${DS.border}`,background:DS.cardH,color:DS.t1,fontSize:12,boxSizing:"border-box",outline:"none"}}/></div>
            </div>
            <Btn full variant="gold" onClick={registar}>+ Registar sessão</Btn>
            {msg&&<p style={{margin:"6px 0 0",fontSize:11,color:DS.ok,fontWeight:500}}>{msg}</p>}
          </div>
        </div>
      )}
      {aba==="comunidade"&&<PainelComunidade user={user} posts={posts} setPosts={setPosts} unidadeId={unidadeAtual.id}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════
function LoginScreen({credenciais,onLogin}){
  const [email,setEmail]=useState("");
  const [senha,setSenha]=useState("");
  const [showS,setShowS]=useState(false);
  const [erro,setErro]=useState("");
  const [loading,setLoading]=useState(false);
  const tentar=()=>{
    setErro("");setLoading(true);
    setTimeout(()=>{
      setLoading(false);
      const u=credenciais[email.trim().toLowerCase()];
      if(!u){setErro("E-mail não encontrado.");return;}
      if(u.senha!==senha){setErro("Senha incorrecta.");return;}
      onLogin({email:email.trim().toLowerCase(),...u});
    },900);
  };
  const demo=e=>{setEmail(e);setSenha(credenciais[e]?.senha||"");setErro("");};
  return(
    <div style={{minHeight:"100vh",background:DS.bg0,color:DS.t1,padding:"1rem 1rem 3rem"}}>
      {/* hero */}
      <div style={{textAlign:"center",padding:"2.5rem 0 2rem"}}>
        <div style={{width:70,height:70,borderRadius:18,background:`linear-gradient(135deg,${DS.goldD},${DS.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 12px",boxShadow:`0 6px 28px ${DS.gold}44`}}>🏋️</div>
        <p style={{margin:"0 0 4px",fontWeight:800,fontSize:28,letterSpacing:-1,color:DS.t1}}>FitCore</p>
        <p style={{margin:0,fontSize:12,color:DS.t3,letterSpacing:.3}}>A academia mais inteligente de Angola</p>
        <GoldLine/>
      </div>
      {/* 5 motivos */}
      <div style={{maxWidth:460,margin:"0 auto 2rem"}}>
        <p style={{fontWeight:700,fontSize:14,textAlign:"center",margin:"0 0 12px",color:DS.gold,letterSpacing:.3}}>5 razões para treinar connosco</p>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {MOTIVOS.map((m,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",background:DS.card,borderRadius:10,padding:"10px 12px",border:`0.5px solid ${DS.border}`}}>
              <div style={{width:36,height:36,borderRadius:8,background:DS.gold+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,border:`0.5px solid ${DS.gold}22`}}>{m.icon}</div>
              <div><p style={{margin:"0 0 2px",fontWeight:600,fontSize:12,color:DS.t1}}>{m.t}</p><p style={{margin:0,fontSize:11,color:DS.t3,lineHeight:1.4}}>{m.d}</p></div>
            </div>
          ))}
        </div>
      </div>
      {/* planos */}
      <div style={{maxWidth:460,margin:"0 auto 2rem"}}>
        <p style={{fontWeight:700,fontSize:14,textAlign:"center",margin:"0 0 12px",color:DS.gold,letterSpacing:.3}}>Planos de adesão</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {PLANOS_DISPLAY.map((p,i)=>(
            <div key={i} style={{borderRadius:12,border:`1.5px solid ${p.destaque?DS.gold:DS.border}`,padding:"12px 16px",background:p.destaque?DS.gold+"0A":DS.card,position:"relative"}}>
              {p.destaque&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${DS.goldD},${DS.gold})`,color:DS.bg0,fontSize:8,padding:"2px 12px",borderRadius:20,fontWeight:800,letterSpacing:.5,whiteSpace:"nowrap"}}>MAIS POPULAR</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <p style={{margin:0,fontWeight:800,fontSize:14,color:p.cor}}>{p.nome}</p>
                <div style={{textAlign:"right"}}><p style={{margin:0,fontWeight:800,fontSize:17,color:p.cor}}>{p.preco}</p><p style={{margin:0,fontSize:8,color:DS.t3}}>/mês</p></div>
              </div>
              <GoldLine/>
              {p.items.map((it,j)=>(
                <div key={j} style={{display:"flex",gap:7,alignItems:"center",padding:"2px 0"}}>
                  <span style={{fontSize:10,color:p.cor,flexShrink:0}}>✓</span>
                  <span style={{fontSize:11,color:DS.t3}}>{it}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p style={{textAlign:"center",fontSize:9,color:DS.t3,marginTop:8}}>A inscrição é feita na recepção ou pelo administrador da academia.</p>
      </div>
      {/* login card */}
      <div style={{maxWidth:360,margin:"0 auto",background:DS.card,borderRadius:14,border:`1px solid ${DS.border}`,padding:"1.5rem",boxShadow:`0 8px 40px rgba(0,0,0,.7)`}}>
        <p style={{margin:"0 0 2px",fontWeight:700,fontSize:15,color:DS.t1}}>Entrar na plataforma</p>
        <GoldLine/>
        <label style={{fontSize:10,color:DS.t3,fontWeight:500}}>E-mail</label>
        <input value={email} onChange={e=>{setEmail(e.target.value);setErro("");}} onKeyDown={e=>e.key==="Enter"&&tentar()} placeholder="seunome@fitcore.ao" style={{display:"block",width:"100%",marginTop:3,marginBottom:10,padding:"9px 12px",borderRadius:8,border:`1px solid ${erro?DS.err:DS.border}`,background:DS.cardH,color:DS.t1,fontSize:12,boxSizing:"border-box",outline:"none"}}/>
        <label style={{fontSize:10,color:DS.t3,fontWeight:500}}>Senha</label>
        <div style={{position:"relative",marginTop:3,marginBottom:10}}>
          <input value={senha} onChange={e=>{setSenha(e.target.value);setErro("");}} onKeyDown={e=>e.key==="Enter"&&tentar()} type={showS?"text":"password"} placeholder="••••••••" style={{display:"block",width:"100%",padding:"9px 36px 9px 12px",borderRadius:8,border:`1px solid ${erro?DS.err:DS.border}`,background:DS.cardH,color:DS.t1,fontSize:12,boxSizing:"border-box",outline:"none"}}/>
          <button onClick={()=>setShowS(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,padding:0,color:DS.t3}}>{showS?"🙈":"👁️"}</button>
        </div>
        {erro&&<div style={{background:DS.err+"18",borderRadius:7,padding:"6px 10px",marginBottom:8,border:`0.5px solid ${DS.err}44`}}><p style={{margin:0,fontSize:11,color:DS.err}}>⚠️ {erro}</p></div>}
        <Btn full variant="gold" onClick={tentar} disabled={loading}>{loading?"A verificar…":"Entrar"}</Btn>
        <GoldLine/>
        <p style={{margin:"0 0 6px",fontSize:9,color:DS.t3,textAlign:"center",letterSpacing:.3}}>ACESSO RÁPIDO — DEMONSTRAÇÃO</p>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {[["admin@fitcore.ao","🏢 Gestor"],["trainer@fitcore.ao","💪 Personal Trainer"],["ana@fitcore.ao","👤 Aluno — Ana"],["bruno@fitcore.ao","👤 Aluno — Bruno"]].map(([e,l])=>(
            <button key={e} onClick={()=>demo(e)} style={{background:email===e?DS.gold+"14":"transparent",border:`0.5px solid ${email===e?DS.gold:DS.border}`,borderRadius:7,padding:"6px 10px",fontSize:11,cursor:"pointer",color:email===e?DS.gold:DS.t3,textAlign:"left",fontWeight:email===e?600:400}}>
              {l} <span style={{opacity:.4,fontSize:9}}>— {e}</span>
            </button>
          ))}
        </div>
      </div>
      <p style={{textAlign:"center",marginTop:"1.5rem",fontSize:9,color:DS.t3,letterSpacing:.3}}>FITCORE © 2026 · VERSÃO ENTERPRISE</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════
export default function App(){
  const [tela,setTela]=useState("login");
  const [user,setUser]=useState(null);
  const [credenciais,setCredenciais]=useState(BASE_CREDS);
  const [unidadeAtual,setUnidadeAtual]=useState(UNIDADES[0]);
  const [posts,setPosts]=useState(initPosts);
  const [mensalidades,setMensalidades]=useState(initMensalidades);
  const [hora,setHora]=useState(now());
  const [presencas,setPresencas]=useState({});
  const [notifPerfil,setNotifPerfil]=useState({});
  useEffect(()=>{const t=setInterval(()=>setHora(now()),1000);return()=>clearInterval(t);},[]);
  const hoje=new Date().toLocaleDateString("pt-AO");
  const presencaHoje=user?(presencas[user.email]||[]).includes(hoje):false;
  const marcarPresenca=()=>{if(!user||presencaHoje)return;setPresencas(p=>({...p,[user.email]:[...(p[user.email]||[]),hoje]}));};
  const enviarNotifAluno=(email,notif)=>{setNotifPerfil(prev=>({...prev,[email]:[{id:Date.now(),...notif,hora:hhmm(),lida:false},...(prev[email]||[])]}));};
  if(tela==="login"||!user) return <LoginScreen credenciais={credenciais} onLogin={u=>{setUser(u);setTela("app");}}/>;
  const perfilLabel={gestor:"Gestor Geral",trainer:"Personal Trainer",aluno:"Membro"}[user.perfil];
  const perfilCor={gestor:DS.gold,trainer:DS.ok,aluno:DS.goldL}[user.perfil];
  return(
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",color:DS.t1,background:DS.bg0,minHeight:"100vh",padding:"1rem",maxWidth:660,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${DS.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Av nome={user.nome} foto={user.foto} size={34}/>
          <div>
            <p style={{margin:0,fontWeight:700,fontSize:13,color:DS.t1}}>{user.nome}</p>
            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}><Badge cor={perfilCor}>{perfilLabel}</Badge>{user.codigo&&<span style={{fontSize:8,color:DS.t3,fontFamily:"monospace"}}>{user.codigo}</span>}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:13,fontVariantNumeric:"tabular-nums",fontWeight:600,color:DS.t1}}>{hora}</p><p style={{margin:0,fontSize:9,color:DS.t3,textTransform:"capitalize"}}>{today()}</p></div>
          <button onClick={()=>{setUser(null);setTela("login");}} style={{background:DS.err+"18",color:DS.err,border:`0.5px solid ${DS.err}44`,borderRadius:7,padding:"4px 9px",fontSize:10,fontWeight:600,cursor:"pointer"}}>Sair</button>
        </div>
      </div>
      {user.perfil==="gestor"&&(
        <div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
          {UNIDADES.map(u=>(
            <button key={u.id} onClick={()=>setUnidadeAtual(u)} style={{background:unidadeAtual.id===u.id?DS.gold+"18":"transparent",color:unidadeAtual.id===u.id?DS.gold:DS.t3,border:`1px solid ${unidadeAtual.id===u.id?DS.gold:DS.border}`,borderRadius:20,padding:"4px 11px",fontSize:10,cursor:"pointer",whiteSpace:"nowrap",fontWeight:unidadeAtual.id===u.id?700:400}}>{u.nome.replace("FitCore ","")}</button>
          ))}
        </div>
      )}
      {user.perfil==="aluno"
        ?<PainelAluno user={user} posts={posts} setPosts={setPosts} presencaHoje={presencaHoje} onPresenca={marcarPresenca} notifPerfil={notifPerfil[user?.email]||[]} marcarLida={id=>setNotifPerfil(prev=>({...prev,[user.email]:(prev[user.email]||[]).map(n=>n.id===id?{...n,lida:true}:n)}))}/>
        :<PainelGestor user={user} unidades={UNIDADES} unidadeAtual={unidadeAtual} setUnidadeAtual={setUnidadeAtual} posts={posts} setPosts={setPosts} credenciais={credenciais} setCredenciais={setCredenciais} onNovoAluno={()=>{}} presencaHoje={presencaHoje} onPresenca={marcarPresenca} mensalidades={mensalidades} setMensalidades={setMensalidades} enviarNotifAluno={enviarNotifAluno}/>
      }
    </div>
  );
}

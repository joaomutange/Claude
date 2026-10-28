import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Dashboard from "./Dashboard";
import "./styles.css";

// ═══════════════════════════════════════════════════════
// TOKENS
// ═══════════════════════════════════════════════════════
const C = {
  bg:"#080B0D", bg1:"#0D1114", card:"#111518", cardH:"#171C20",
  gold:"#C9973E", goldL:"#E1B75F", goldD:"#8F6424",
  t1:"#F5F5F2", t2:"#A5A9AC", t3:"#5A6066",
  ok:"#4CAF72", warn:"#E0A43B", err:"#D65C5C", info:"#4A9ECC",
  border:"#1E2529",
};

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

// ═══════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════
function GoldLine() {
  return <div className="gold-line"/>;
}

function Btn({ children, onClick, variant="gold", full, disabled }) {
  return (
    <button
      className={`btn btn-${variant}${full?" btn-full":""}`}
      onClick={onClick}
      disabled={disabled}
    >{children}</button>
  );
}

// ═══════════════════════════════════════════════════════
// RECUPERAR SENHA (via Supabase resetPasswordForEmail)
// ═══════════════════════════════════════════════════════
function RecuperarSenha({ onVoltar }) {
  const [email,   setEmail]   = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro,    setErro]    = useState("");
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    setErro(""); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) { setErro(error.message); return; }
    setEnviado(true);
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div style={{ width:72,height:72,borderRadius:18,background:`linear-gradient(135deg,${C.goldD},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px",boxShadow:`0 8px 32px rgba(201,151,62,.35)` }}>🔑</div>
        <h1 style={{ fontSize:"2rem",letterSpacing:"-.04em",marginBottom:6 }}>FitCore</h1>
        <p style={{ fontSize:13,color:C.t3,letterSpacing:.3 }}>Recuperação de senha</p>
        <GoldLine/>
      </div>
      <div className="login-body">
        <div className="login-card">
          {enviado ? (
            <div style={{ textAlign:"center",padding:"12px 0" }}>
              <div style={{ fontSize:40,marginBottom:12 }}>📧</div>
              <h3 style={{ color:C.ok,marginBottom:8 }}>E-mail enviado!</h3>
              <p style={{ fontSize:12,color:C.t3,lineHeight:1.6,marginBottom:16 }}>
                Verifique a sua caixa de entrada em <strong style={{ color:C.t1 }}>{email}</strong> e siga as instruções para redefinir a sua senha.
              </p>
              <Btn full onClick={onVoltar}>Voltar ao login</Btn>
            </div>
          ) : (
            <>
              <h3 style={{ marginBottom:4 }}>Esqueceu a senha?</h3>
              <p style={{ fontSize:12,color:C.t3,marginBottom:12,lineHeight:1.6 }}>
                Introduza o seu e-mail e enviaremos um link para redefinir a sua senha.
              </p>
              <GoldLine/>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11,color:C.t3,fontWeight:600 }}>E-mail</label>
                <input
                  className="input"
                  style={{ marginTop:4 }}
                  type="email"
                  value={email}
                  onChange={e=>{setEmail(e.target.value);setErro("");}}
                  onKeyDown={e=>e.key==="Enter"&&enviar()}
                  placeholder="seunome@exemplo.com"
                  autoFocus
                />
              </div>
              {erro && <div className="alert alert-err" style={{ marginBottom:10 }}>⚠️ {erro}</div>}
              <Btn full onClick={enviar} disabled={loading||!email.trim()}>
                {loading ? "A enviar…" : "Enviar link de recuperação"}
              </Btn>
              <GoldLine/>
              <button
                onClick={onVoltar}
                style={{ background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:12,fontFamily:"inherit",width:"100%",textAlign:"center",padding:"4px 0" }}
              >← Voltar ao login</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [email,     setEmail]     = useState("");
  const [senha,     setSenha]     = useState("");
  const [showS,     setShowS]     = useState(false);
  const [erro,      setErro]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [recuperar, setRecuperar] = useState(false);

  if (recuperar) return <RecuperarSenha onVoltar={()=>setRecuperar(false)}/>;

  const tentar = async () => {
    setErro(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("Invalid login")) setErro("E-mail ou senha incorrectos.");
      else if (error.message.includes("Email not confirmed")) setErro("Confirme o seu e-mail antes de entrar.");
      else setErro(error.message);
    }
    // onLogin é chamado via onAuthStateChange no componente App
  };

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
            <input
              className={`input${erro?" err":""}`}
              style={{ marginTop:4 }}
              type="email"
              value={email}
              onChange={e=>{setEmail(e.target.value);setErro("");}}
              onKeyDown={e=>e.key==="Enter"&&tentar()}
              placeholder="seunome@fitcore.ao"
              autoComplete="email"
            />
          </div>
          <div style={{ marginBottom:4 }}>
            <div className="flex justify-between items-center" style={{ marginBottom:4 }}>
              <label style={{ fontSize:11,color:C.t3,fontWeight:600 }}>Senha</label>
              <button onClick={()=>setRecuperar(true)} style={{ background:"none",border:"none",cursor:"pointer",color:C.gold,fontSize:11,fontFamily:"inherit",fontWeight:600 }}>Esqueceu a senha?</button>
            </div>
            <div style={{ position:"relative" }}>
              <input
                className={`input${erro?" err":""}`}
                type={showS?"text":"password"}
                value={senha}
                onChange={e=>{setSenha(e.target.value);setErro("");}}
                onKeyDown={e=>e.key==="Enter"&&tentar()}
                placeholder="••••••••"
                style={{ paddingRight:40 }}
                autoComplete="current-password"
              />
              <button onClick={()=>setShowS(s=>!s)} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16 }}>{showS?"🙈":"👁️"}</button>
            </div>
          </div>
          {erro && <div className="alert alert-err" style={{ marginBottom:10 }}>⚠️ {erro}</div>}
          <div style={{ marginTop:14 }}>
            <Btn full variant="gold" onClick={tentar} disabled={loading}>
              {loading ? "A verificar…" : "Entrar"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LOADING SCREEN
// ═══════════════════════════════════════════════════════
function LoadingScreen({ msg="A carregar…" }) {
  return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:C.bg,gap:16 }}>
      <div style={{ width:56,height:56,borderRadius:14,background:`linear-gradient(135deg,${C.goldD},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>🏋️</div>
      <div style={{ fontSize:13,color:C.t3 }}>{msg}</div>
      <div style={{ width:32,height:3,borderRadius:99,background:C.border,overflow:"hidden" }}>
        <div style={{ width:"50%",height:"100%",background:C.gold,animation:"slide 1s infinite ease-in-out",borderRadius:99 }}/>
      </div>
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ERRO DE ACESSO (sem ginásio associado)
// ═══════════════════════════════════════════════════════
function SemAcesso({ onLogout }) {
  return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:C.bg,padding:24,textAlign:"center" }}>
      <div style={{ fontSize:48,marginBottom:16 }}>🔒</div>
      <h2 style={{ color:C.t1,marginBottom:8 }}>Sem acesso</h2>
      <p style={{ color:C.t3,fontSize:13,lineHeight:1.7,maxWidth:300,marginBottom:24 }}>
        A sua conta não está associada a nenhum ginásio. Contacte o administrador para obter acesso.
      </p>
      <Btn onClick={onLogout}>Terminar sessão</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// APP ROOT — Autenticação Supabase
// ═══════════════════════════════════════════════════════
export default function App() {
  const [session,    setSession]    = useState(undefined); // undefined = ainda a carregar
  const [gyms,       setGyms]       = useState([]);
  const [gym,        setGym]        = useState(null);
  const [membership, setMembership] = useState(null);
  const [authError,  setAuthError]  = useState("");
  const [dataLoading,setDataLoading]= useState(false);

  // ── 1. Escutar mudanças de sessão ──────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── 2. Carregar ginásios do utilizador quando há sessão ──
  useEffect(() => {
    if (!session) { setGyms([]); setGym(null); setMembership(null); return; }
    loadUserGyms(session.user);
  }, [session]);

  async function loadUserGyms(user) {
    setDataLoading(true); setAuthError("");
    try {
      // Buscar todos os vínculos do utilizador com ginásios
      const { data: memberships, error: mErr } = await supabase
        .from("membros_ginasio")
        .select("*, ginasios(*)")
        .eq("utilizador_id", user.id)
        .eq("ativo", true);

      if (mErr) throw mErr;
      if (!memberships || memberships.length === 0) {
        setGyms([]); setGym(null); setMembership(null);
        setDataLoading(false); return;
      }

      const gymList = memberships.map(m => m.ginasios).filter(Boolean);
      setGyms(gymList);
      setGym(gymList[0]);
      setMembership(memberships[0]);
    } catch (err) {
      setAuthError("Erro ao carregar dados: " + (err.message || "tente novamente."));
    }
    setDataLoading(false);
  }

  // Quando muda de ginásio seleccionado
  const handleSelectGym = (gymId) => {
    const g = gyms.find(x => x.id === gymId);
    if (!g) return;
    setGym(g);
    // Actualizar membership para o ginásio seleccionado
    loadMembershipForGym(session?.user?.id, gymId);
  };

  async function loadMembershipForGym(userId, gymId) {
    const { data } = await supabase
      .from("membros_ginasio")
      .select("*")
      .eq("utilizador_id", userId)
      .eq("ginasio_id", gymId)
      .eq("ativo", true)
      .single();
    if (data) setMembership(data);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange vai limpar a session automaticamente
  };

  const handleSaved = (updatedGym) => {
    setGym(updatedGym);
    setGyms(prev => prev.map(g => g.id === updatedGym.id ? updatedGym : g));
  };

  // ── Estados de renderização ─────────────────────────
  // Ainda a verificar sessão inicial
  if (session === undefined) return <LoadingScreen msg="A verificar sessão…"/>;

  // Sem sessão — mostrar login
  if (!session) return <LoginScreen onLogin={()=>{}} />;

  // Com sessão, mas ainda a carregar dados
  if (dataLoading) return <LoadingScreen msg="A carregar o seu espaço…"/>;

  // Com sessão, mas sem ginásio associado
  if (!gym || !membership) return <SemAcesso onLogout={handleLogout}/>;

  // Tudo pronto — mostrar Dashboard
  return (
    <Dashboard
      gym={gym}
      gyms={gyms}
      membership={membership}
      user={session.user}
      onSelectGym={handleSelectGym}
      onSaved={handleSaved}
      onLogout={handleLogout}
      authError={authError}
    />
  );
}

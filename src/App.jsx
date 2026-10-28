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
// SUPERADMIN PANEL
// ═══════════════════════════════════════════════════════
function SuperadminPanel({ user, superadmin, onLogout }) {
  const [gyms,      setGyms]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [notice,    setNotice]    = useState("");
  const [error,     setError]     = useState("");
  const [modal,     setModal]     = useState(null); // 'gym' | 'admin'
  const [form,      setForm]      = useState({});
  const [busy,      setBusy]      = useState(false);

  useEffect(() => { fetchGyms(); }, []);

  async function fetchGyms() {
    setLoading(true); setError("");
    const { data, error: err } = await supabase
      .from("ginasios")
      .select("*")
      .order("criado_em", { ascending: false });
    if (err) { setError("Erro ao carregar ginásios: " + err.message); }
    else { setGyms(data || []); }
    setLoading(false);
  }

  async function criarGinasio(e) {
    e.preventDefault(); setBusy(true); setNotice(""); setError("");
    const slug = form.nome?.trim().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g,"")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const { data, error: err } = await supabase
      .from("ginasios")
      .insert({ nome: form.nome?.trim(), slug, morada: form.morada?.trim()||null, telefone: form.telefone?.trim()||null })
      .select("id,nome")
      .single();
    if (err) { setError("Erro ao criar ginásio: " + err.message); setBusy(false); return; }
    setNotice(`Ginásio "${data.nome}" criado com sucesso.`);
    setModal(null); setForm({});
    fetchGyms();
    setBusy(false);
  }

  async function criarAdmin(e) {
    e.preventDefault(); setBusy(true); setNotice(""); setError("");

    const emailNorm = form.email?.trim().toLowerCase();

    // Verificar se já existe convite/membro com este email no ginásio
    const { data: existingUser } = await supabase
      .from("membros_ginasio")
      .select("utilizador_id")
      .eq("ginasio_id", form.ginasio_id)
      .eq("email_convite", emailNorm)
      .maybeSingle();

    if (existingUser) {
      setError("Já existe um admin com este e-mail neste ginásio.");
      setBusy(false); return;
    }

    // Gerar UUID placeholder — será substituído pelo UUID real quando o utilizador
    // criar conta com este email (via trigger on_new_member_login ou manualmente)
    const placeholderUid = crypto.randomUUID();

    const { error: err } = await supabase
      .from("membros_ginasio")
      .insert({
        utilizador_id: placeholderUid,   // placeholder; actualizado no primeiro login
        ginasio_id:    form.ginasio_id,
        nome:          form.nome_admin?.trim(),
        email_convite: emailNorm,        // usado para matching no login
        funcao:        "admin",
        ativo:         false,            // inactivo até o utilizador criar conta
        conta_pendente: true,
      });

    if (err) { setError("Erro ao criar admin: " + err.message); setBusy(false); return; }
    setNotice(`Convite criado para "${form.nome_admin}" (${emailNorm}). A conta ficará activa após o primeiro login.`);
    setModal(null); setForm({});
    setBusy(false);
  }

  const initial = n => n?.split(' ').filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase() || 'SA';

  return (
    <div className="workspace">
      {/* Sidebar */}
      <aside className="sidebar">
        <a className="wordmark" href="#" onClick={e=>e.preventDefault()}>
          <span className="brand-symbol">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8v8 M6 5v14 M18 5v14 M21 8v8 M6 12h12"/>
            </svg>
          </span>
          fitcore<span className="wordmark-dot">.</span>
        </a>
        <small className="nav-label">PLATAFORMA</small>
        <nav>
          <button className="active" aria-current="page">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"/></svg>
            Ginásios
            <span className="nav-dot"/>
          </button>
        </nav>
        <div className="sidebar-note"><span className="live-dot"/><span>Painel Superadmin.<br/><small>Gestão global da plataforma.</small></span></div>
        <div className="account">
          <span className="avatar">{initial(superadmin?.nome)}</span>
          <div>
            <strong>{superadmin?.nome || user.email}</strong>
            <small>Superadmin</small>
          </div>
          <button type="button" onClick={onLogout} aria-label="Sair da conta">Terminar sessão</button>
        </div>
      </aside>

      {/* Body */}
      <div className="workspace-body">
        <header className="topbar">
          <span>FitCore <b>/</b> Painel de Administração Global</span>
          <div>
            <span className="topbar-status"><i/> Superadmin</span>
            <span className="avatar small">{initial(superadmin?.nome)}</span>
            <button className="icon-button mobile-logout" onClick={onLogout} aria-label="Sair da conta">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4"/></svg>
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">FITCORE / SUPERADMIN</div>
              <h1>Gestão global da plataforma.</h1>
              <p>Todos os ginásios registados, num só lugar.</p>
            </div>
            <button className="icon-button" onClick={fetchGyms} disabled={loading} aria-label="Atualizar dados">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M18 18A8 8 0 0 1 4 12"/></svg>
            </button>
          </div>

          {error && <div className="alert" role="alert">{error}</div>}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={()=>setNotice("")} aria-label="Fechar aviso">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12 M6 18L18 6"/></svg>
              </button>
            </div>
          )}

          {/* Métricas */}
          <section className="metrics">
            <article className="metric">
              <div className="metric-top"><span>Ginásios registados</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"/></svg>
              </div>
              <strong>{gyms.length}</strong>
              <small>Total de espaços na plataforma</small>
            </article>
            <article className="metric">
              <div className="metric-top"><span>Ginásios activos</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>
              </div>
              <strong>{gyms.filter(g=>g.ativo).length}</strong>
              <small>Com subscrição activa</small>
            </article>
          </section>

          {/* Acções rápidas */}
          <div style={{ display:"flex",gap:12,marginBottom:24,flexWrap:"wrap" }}>
            <button className="primary" onClick={()=>{setModal("gym");setForm({});}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14 M5 12h14"/></svg>
              Novo ginásio
            </button>
            {gyms.length > 0 && (
              <button className="primary" style={{ background:"rgba(201,151,62,.15)",color:"#C9973E",border:"1px solid rgba(201,151,62,.3)" }} onClick={()=>{setModal("admin");setForm({ginasio_id:gyms[0].id});}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0"/></svg>
                Registar admin de ginásio
              </button>
            )}
          </div>

          {/* Lista de ginásios */}
          <section className="panel">
            <div className="panel-heading">
              <div><h2>Todos os ginásios</h2><p>{gyms.length} espaços registados na plataforma</p></div>
            </div>
            {loading ? (
              <div className="loading-state" role="status"><span className="spinner"/>A carregar ginásios…</div>
            ) : gyms.length === 0 ? (
              <div className="empty">
                <span className="empty-icon">🏟️</span>
                <h3>Nenhum ginásio registado</h3>
                <p>Crie o primeiro ginásio da plataforma.</p>
                <button className="primary" onClick={()=>{setModal("gym");setForm({});}}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14 M5 12h14"/></svg>
                  Criar ginásio
                </button>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Nome</th><th>Slug</th><th>Morada</th><th>Telefone</th><th>Criado em</th></tr></thead>
                  <tbody>
                    {gyms.map(g => (
                      <tr key={g.id}>
                        <td><strong>{g.nome}</strong></td>
                        <td><code style={{fontSize:11,color:C.t3}}>{g.slug}</code></td>
                        <td>{g.morada||"—"}</td>
                        <td>{g.telefone||"—"}</td>
                        <td>{g.criado_em ? new Date(g.criado_em).toLocaleDateString("pt-AO") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <footer className="workspace-footer">
          <span>fitcore<span>.</span> <small>Painel de administração global.</small></span>
          <small>Superadmin · {user.email}</small>
        </footer>
      </div>

      {/* Modal: Novo ginásio */}
      {modal === "gym" && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div><span className="eyebrow">PLATAFORMA / NOVO ESPAÇO</span><h2 id="modal-title">Criar ginásio</h2></div>
              <button className="icon-button" disabled={busy} onClick={()=>setModal(null)} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12 M6 18L18 6"/></svg>
              </button>
            </div>
            <form onSubmit={criarGinasio}>
              <div className="form-grid">
                <label className="full">Nome do ginásio<span className="required"> *</span>
                  <input className="input" required maxLength={120} value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex.: FitCore Luanda"/>
                </label>
                <label>Morada
                  <input className="input" maxLength={200} value={form.morada||""} onChange={e=>setForm(f=>({...f,morada:e.target.value}))} placeholder="Rua, cidade"/>
                </label>
                <label>Telefone
                  <input className="input" maxLength={30} value={form.telefone||""} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} placeholder="+244 …"/>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" disabled={busy} onClick={()=>setModal(null)}>Cancelar</button>
                <button className="primary" disabled={busy}>{busy?"A criar…":"Criar ginásio"}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Registar admin */}
      {modal === "admin" && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title-admin">
            <div className="modal-heading">
              <div><span className="eyebrow">PLATAFORMA / NOVO ADMIN</span><h2 id="modal-title-admin">Registar administrador de ginásio</h2></div>
              <button className="icon-button" disabled={busy} onClick={()=>setModal(null)} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12 M6 18L18 6"/></svg>
              </button>
            </div>
            <form onSubmit={criarAdmin}>
              <div className="form-grid">
                <label className="full">Ginásio<span className="required"> *</span>
                  <select className="input" required value={form.ginasio_id||""} onChange={e=>setForm(f=>({...f,ginasio_id:e.target.value}))}>
                    <option value="">Selecionar ginásio…</option>
                    {gyms.map(g=><option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </label>
                <label>Nome do admin<span className="required"> *</span>
                  <input className="input" required maxLength={120} value={form.nome_admin||""} onChange={e=>setForm(f=>({...f,nome_admin:e.target.value}))} placeholder="Nome completo"/>
                </label>
                <label>E-mail<span className="required"> *</span>
                  <input className="input" required type="email" maxLength={254} value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="admin@ginasio.ao"/>
                </label>
              </div>
              <p style={{fontSize:11,color:C.t3,margin:"8px 0 0",lineHeight:1.5}}>
                ⚠️ O administrador deverá criar a conta na plataforma com este e-mail. O vínculo será activado automaticamente.
              </p>
              <div className="modal-actions">
                <button type="button" disabled={busy} onClick={()=>setModal(null)}>Cancelar</button>
                <button className="primary" disabled={busy}>{busy?"A registar…":"Registar admin"}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// APP ROOT — Autenticação Supabase
// ═══════════════════════════════════════════════════════
export default function App() {
  const [session,      setSession]      = useState(undefined); // undefined = ainda a carregar
  const [superadmin,   setSuperadmin]   = useState(null);      // dados da tabela superadmins
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [gyms,         setGyms]         = useState([]);
  const [gym,          setGym]          = useState(null);
  const [membership,   setMembership]   = useState(null);
  const [authError,    setAuthError]    = useState("");
  const [dataLoading,  setDataLoading]  = useState(false);

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

  // ── 2. Carregar dados quando há sessão ──────────────
  useEffect(() => {
    if (!session) {
      setGyms([]); setGym(null); setMembership(null);
      setSuperadmin(null); setIsSuperadmin(false);
      return;
    }
    loadUserData(session.user);
  }, [session]);

  async function loadUserData(user) {
    setDataLoading(true); setAuthError("");
    try {
      // Lista de emails superadmin (fallback imediato enquanto RLS é depurada)
      const SUPERADMIN_EMAILS = ["joaomutange@gmail.com"];
      if (SUPERADMIN_EMAILS.includes(user.email)) {
        setSuperadmin({ nome: "Miguel Mutange", email: user.email, utilizador_id: user.id, ativo: true });
        setIsSuperadmin(true);
        setDataLoading(false);
        return;
      }

      // Verificar superadmin via função RPC (SECURITY DEFINER, ignora RLS)
      const [saFnResult, memberResult] = await Promise.all([
        supabase.rpc("is_superadmin"),
        supabase.from("membros_ginasio").select("*, ginasios(*)").eq("utilizador_id", user.id).eq("ativo", true),
      ]);

      if (saFnResult.error) {
        console.warn("[FitCore] Erro is_superadmin():", saFnResult.error.message);
      }

      if (saFnResult.data === true) {
        const { data: saData } = await supabase
          .from("superadmins").select("*").eq("email", user.email).maybeSingle();
        setSuperadmin(saData || { nome: user.email, email: user.email, utilizador_id: user.id, ativo: true });
        setIsSuperadmin(true);
        setDataLoading(false);
        return;
      }

      // Utilizador normal — verificar ginásios
      const { data: memberships, error: mErr } = memberResult;
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
    setSuperadmin(null); setIsSuperadmin(false);
    // onAuthStateChange limpa a sessão automaticamente
  };

  const handleSaved = (updatedGym) => {
    setGym(updatedGym);
    setGyms(prev => prev.map(g => g.id === updatedGym.id ? updatedGym : g));
  };

  // ── Estados de renderização ─────────────────────────
  if (session === undefined) return <LoadingScreen msg="A verificar sessão…"/>;
  if (!session)              return <LoginScreen onLogin={()=>{}} />;
  if (dataLoading)           return <LoadingScreen msg="A carregar o seu espaço…"/>;

  // Superadmin → painel dedicado
  if (isSuperadmin) {
    return <SuperadminPanel user={session.user} superadmin={superadmin} onLogout={handleLogout}/>;
  }

  // Sem ginásio associado
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

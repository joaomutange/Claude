import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import Dashboard from './Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gyms, setGyms] = useState([]);
  const [links, setLinks] = useState([]);
  const [gymId, setGymId] = useState('');
  const [accessMode, setAccessMode] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return new URLSearchParams(window.location.search).get('reset') === '1' || hash.get('type') === 'recovery' || hash.get('type') === 'invite' ? 'password' : 'login';
  });
  const [linkError] = useState(() => new URLSearchParams(window.location.hash.slice(1)).has('error') ? 'Este link é inválido ou expirou. Peça um novo email de recuperação.' : '');

  useEffect(() => {
    let live = true;
    let revision = 0;
    async function refresh() {
      const current = ++revision;
      setLoading(true); setError(''); setGyms([]); setLinks([]); setGymId('');
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (!live || current !== revision) return;
        if (authError || !data.user) { setUser(null); return; }
        setUser(data.user);
        const [g, m] = await Promise.all([
          supabase.from('ginasios').select('id,nome,slug,logo_url').order('nome'),
          supabase.from('membros_ginasio').select('ginasio_id,utilizador_id,nome,funcao,ativo').eq('utilizador_id', data.user.id).eq('ativo', true)
        ]);
        if (g.error || m.error) throw g.error || m.error;
        if (!live || current !== revision) return;
        setGyms(g.data); setLinks(m.data);
        setGymId(g.data[0]?.id || '');
      } catch { if (live && current === revision) setError('Não foi possível carregar os ginásios. Verifique a ligação e as permissões.'); }
      finally { if (live && current === revision) setLoading(false); }
    }
    // Callback síncrono; chamadas de autenticação fora do callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setAccessMode('password');
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
        if (event === 'SIGNED_OUT') { setUser(null); setGyms([]); setLinks([]); setGymId(''); }
        setTimeout(() => { if (live) refresh(); }, 0);
      }
    });
    return () => { live = false; revision++; subscription.unsubscribe(); };
  }, []);

  async function login(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError('Não foi possível entrar. Verifique o email, a palavra-passe e a confirmação da conta.');
      else setPassword('');
    } catch { setError('Não foi possível ligar ao serviço. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) setError('Não foi possível terminar a sessão. Tente novamente.');
    } catch { setError('Não foi possível terminar a sessão.'); }
    finally { setBusy(false); }
  }
  const gym = gyms.find(g => g.id === gymId);
  const membership = links.find(m => m.ginasio_id === gymId);

  if (accessMode !== 'login') return <AccessForm mode={accessMode} user={user} loading={loading} linkError={linkError} onBack={() => {
    window.history.replaceState({}, '', window.location.pathname);
    setAccessMode('login');
  }} />;

  if (!loading && user && gym && membership) return <Dashboard
    key={`${user.id}:${gym.id}`}
    gym={gym} gyms={gyms} membership={membership} user={user} authError={error}
    onSelectGym={setGymId} onLogout={logout}
    onSaved={updated => setGyms(list => list.map(g => g.id === updated.id ? updated : g))}
  />;

  return <main className="auth-page">
    <header><span className="brand">🏋️ FitCore</span>{user && <button disabled={busy} onClick={logout}>Sair</button>}</header>
    {error && <p className="error" role="alert">{error}</p>}
    {linkError && <p className="error" role="alert">{linkError}</p>}
    {loading ? <p role="status">A carregar a sua conta…</p> : !user ? <section className="card login">
      <h1>Bem-vindo ao FitCore</h1><p>Entre com a conta do seu ginásio.</p>
      <form onSubmit={login}>
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Palavra-passe<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="gold" disabled={busy}>{busy ? 'A entrar…' : 'Entrar'}</button>
      </form><p><button type="button" onClick={() => setAccessMode('request')}>Esqueci a palavra-passe</button></p>
    </section> : <>
      <p>{user.email}</p>
      {!gym ? <section className="card"><h1>Sem ginásio disponível</h1><p>A sua conta ainda não tem um vínculo ativo. Contacte o administrador.</p></section> : <>
        <label>Ginásio<select value={gymId} onChange={e => setGymId(e.target.value)}>{gyms.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}</select></label>
        <Gym key={`${user.id}:${gym.id}`} gym={gym} membership={membership} onSaved={updated => setGyms(list => list.map(g => g.id === updated.id ? updated : g))} />
      </>}
    </>}
  </main>;
}

function AccessForm({ mode, user, loading, linkError, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [done, setDone] = useState(false);
  const [requestInstead, setRequestInstead] = useState(false);
  const request = mode === 'request' || requestInstead;
  async function submit(e) {
    e.preventDefault(); setError(''); setNotice('');
    if (!request && (password.length < 12 || password !== confirm)) {
      setError('Use pelo menos 12 caracteres e confirme a mesma palavra-passe.'); return;
    }
    setBusy(true);
    try {
      if (request) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/?reset=1`
        });
        if (error) throw error;
        setNotice('Se existir uma conta com esse email, receberá um link de recuperação. Verifique também o spam e use o email mais recente.');
      } else {
        // Confirmar a sessão com o serviço antes de alterar a palavra-passe.
        const { data, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !data.user) { setError('A sessão expirou. Peça um novo email de recuperação.'); return; }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword(''); setConfirm(''); setDone(true);
        setNotice('Palavra-passe atualizada. Pode continuar para o seu ginásio.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err) {
      if (!request && err?.code === 'weak_password') setError('A palavra-passe não cumpre os requisitos de segurança do projeto. Escolha outra.');
      else if (!request && err?.code === 'same_password') setError('Escolha uma palavra-passe diferente da anterior.');
      else setError(request ? 'Não foi possível enviar o email. Aguarde antes de repetir; se persistir, verifique a configuração de envio do Supabase.' : 'Não foi possível alterar a palavra-passe. Peça um novo link ou tente novamente.');
    } finally { setBusy(false); }
  }
  return <main className="auth-page"><header><span className="brand">🏋️ FitCore</span></header><section className="card login">
    <h1>{request ? 'Recuperar acesso' : 'Definir palavra-passe'}</h1>
    {linkError && !done && <p className="error" role="alert">{linkError}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!done && (request ? <form onSubmit={submit}>
      <label>Email da conta<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <button className="gold" disabled={busy}>{busy ? 'A enviar…' : 'Enviar link de recuperação'}</button>
    </form> : loading ? <p role="status">A verificar o link…</p> : user && !linkError ? <form onSubmit={submit}>
      <label>Nova palavra-passe<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label>Confirmar palavra-passe<input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      <p>Use pelo menos 12 caracteres.</p>
      <button className="gold" disabled={busy}>{busy ? 'A guardar…' : 'Guardar nova palavra-passe'}</button>
    </form> : <><p>Precisa de um link de recuperação válido para continuar.</p><button onClick={() => setRequestInstead(true)}>Pedir novo link</button></>)}
    <p><button disabled={busy} onClick={onBack}>{done ? 'Continuar' : 'Voltar'}</button></p>
  </section></main>;
}

function Gym({ gym, membership, onSaved }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState(gym.nome);
  const [logo, setLogo] = useState(gym.logo_url || '');
  const [busy, setBusy] = useState(false);
  const manager = membership?.funcao === 'gestor';
  useEffect(() => {
    let live = true;
    supabase.from('membros_ginasio').select('utilizador_id,nome,funcao,ativo').eq('ginasio_id', gym.id).order('nome').then(({ data, error }) => {
      if (!live) return;
      if (error) setError('Não foi possível carregar os membros.');
      else setMembers(data || []);
      setLoading(false);
    }).catch(() => { if (live) { setError('Não foi possível carregar os membros.'); setLoading(false); } });
    return () => { live = false; };
  }, [gym.id]);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const { data, error } = await supabase.from('ginasios').update({ nome: name.trim(), logo_url: logo.trim() || null }).eq('id', gym.id).select('id,nome,slug,logo_url').single();
      if (error) throw error;
      onSaved(data); setNotice('Alterações guardadas.');
    } catch { setError('Não foi possível guardar. Verifique a sua autorização e os campos.'); }
    finally { setBusy(false); }
  }
  return <>
    <section className="card">
      {gym.logo_url && <img className="logo" src={gym.logo_url} alt={`Logótipo de ${gym.nome}`} referrerPolicy="no-referrer" />}
      <h1>{gym.nome}</h1><p>O seu perfil: {membership?.funcao || 'membro'}</p>
      {manager && <form onSubmit={save}>
        <label>Nome do ginásio<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Endereço HTTPS do logótipo<input type="url" pattern="https://.*" maxLength={500} value={logo} onChange={e => setLogo(e.target.value)} placeholder="https://…" /></label>
        <button className="gold" disabled={busy}>{busy ? 'A guardar…' : 'Guardar nome e logótipo'}</button>
      </form>}
      {error && <p className="error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    </section>
    <section className="card"><h2>{manager ? 'Membros do ginásio' : 'O seu vínculo'}</h2>
      {loading ? <p>A carregar…</p> : <ul>{members.map(m => <li key={m.utilizador_id}><strong>{m.nome}</strong><span>{m.funcao} · {m.ativo ? 'Ativo' : 'Inativo'}</span></li>)}</ul>}
    </section>
    <p className="footnote">Mensalidades, presenças e treinos estarão disponíveis numa próxima etapa.</p>
  </>;
}

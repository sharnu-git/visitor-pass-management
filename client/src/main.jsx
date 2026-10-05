import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, Users, Ticket, ScanLine, CalendarClock, LogOut, Search, Plus, X,
  ShieldCheck, Clock3, ArrowUpRight, Camera, Download, CheckCircle2, UserRound
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuth() {
  try { return JSON.parse(localStorage.getItem('visitflow_auth') || 'null'); } catch { return null; }
}
function saveAuth(data) { localStorage.setItem('visitflow_auth', JSON.stringify(data)); }
function clearAuth() { localStorage.removeItem('visitflow_auth'); }
async function api(path, options = {}) {
  const auth = getAuth();
  const headers = { ...(options.headers || {}) };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  if (!(options.body instanceof FormData) && options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json() : await response.blob();
  if (!response.ok) throw new Error(data?.message || 'Request failed');
  return data;
}
const nav = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: Users, label: 'Visitors' },
  { icon: CalendarClock, label: 'Appointments' },
  { icon: Ticket, label: 'Passes' },
  { icon: ScanLine, label: 'Scan pass' }
];

function App() {
  const [auth, setAuth] = useState(getAuth());
  const [publicPortal, setPublicPortal] = useState(window.location.search.includes('visitor=1'));
  useEffect(() => { const handler=()=>setPublicPortal(window.location.search.includes('visitor=1')); window.addEventListener('popstate',handler); return()=>window.removeEventListener('popstate',handler); },[]);
  if (!auth && publicPortal) return <PublicVisitorRegister onLogin={data=>{saveAuth(data);setAuth(data);}} back={()=>{window.history.pushState({},'',window.location.pathname);setPublicPortal(false);}} />;
  if (!auth) return <Login onLogin={data => { saveAuth(data); setAuth(data); }} />;
  if (auth.user.role === 'visitor') return <VisitorPortal auth={auth} logout={() => { clearAuth(); setAuth(null); }} />;
  return <AdminApp auth={auth} logout={() => { clearAuth(); setAuth(null); }} />;
}

function PublicVisitorRegister({onLogin,back}) {
  const [form,setForm]=useState({name:'',email:'',password:'',phone:'',company:'',purpose:'',host:'',scheduledFor:''});
  const [hosts,setHosts]=useState([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  useEffect(()=>{fetch(`${API}/public/hosts`).then(r=>r.json()).then(setHosts).catch(()=>{});},[]);
  const change=e=>setForm({...form,[e.target.name]:e.target.value});
  const submit=async e=>{e.preventDefault();setLoading(true);setError('');
    try{onLogin(await api('/public/visitor-register',{method:'POST',body:JSON.stringify(form)}));}
    catch(err){setError(err.message);} finally{setLoading(false);}
  };
  return <div className="auth-page"><form className="auth-card wide-auth" onSubmit={submit}>
    <div className="brand auth-brand"><span className="brand-mark"><ShieldCheck size={20}/></span><span>visitflow</span></div>
    <p className="eyebrow">PUBLIC VISITOR PORTAL</p><h1>Register your visit</h1><p className="sub">Create a visitor account and submit your visit for host approval.</p>
    {error&&<div className="error">{error}</div>}
    <div className="form-grid"><label>Full name<input name="name" required value={form.name} onChange={change}/></label><label>Email<input type="email" name="email" required value={form.email} onChange={change}/></label>
    <label>Password<input type="password" name="password" required minLength="6" value={form.password} onChange={change}/></label><label>Phone<input name="phone" value={form.phone} onChange={change}/></label>
    <label>Company<input name="company" value={form.company} onChange={change}/></label><label>Host<select name="host" value={form.host} onChange={change}><option value="">Select host</option>{hosts.map(h=><option key={h._id} value={h._id}>{h.name}</option>)}</select></label>
    <label>Purpose<input name="purpose" value={form.purpose} onChange={change}/></label><label>Scheduled time<input type="datetime-local" name="scheduledFor" value={form.scheduledFor} onChange={change}/></label></div>
    <button className="primary full" disabled={loading}>{loading?'Creating account...':'Create visitor account'}</button>
    <button type="button" className="back-btn" onClick={back}>← Back to staff login</button>
  </form></div>;
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: 'admin@visitflow.test', password: 'Pass@123' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try { onLogin(await api('/auth/login', { method: 'POST', body: JSON.stringify(form) })); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  return <div className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="brand auth-brand"><span className="brand-mark"><ShieldCheck size={20}/></span><span>visitflow</span></div>
    <p className="eyebrow">SECURE VISITOR MANAGEMENT</p><h1>Welcome back</h1>
    <p className="sub">Sign in to manage visitors, passes and access events.</p>
    {error && <div className="error">{error}</div>}
    <label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>Password<input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
    <button className="primary full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
    <a className="visitor-link" href="?visitor=1" onClick={e=>{e.preventDefault(); window.history.pushState({},'', '?visitor=1'); window.dispatchEvent(new PopStateEvent('popstate'));}}>Public visitor portal →</a>
  </form></div>;
}

function AdminApp({ auth, logout }) {
  const [page, setPage] = useState('Overview');
  const [dashboard, setDashboard] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [passes, setPasses] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const notify = msg => { setToast(msg); setTimeout(() => setToast(''), 2800); };
  const load = async () => {
    try {
      const [d,v,a,p] = await Promise.all([api('/dashboard'), api('/visitors'), api('/appointments'), api('/passes')]);
      setDashboard(d); setVisitors(v); setAppointments(a); setPasses(p);
    } catch (e) { if (e.message.includes('Authentication')) logout(); else notify(e.message); }
  };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => visitors.filter(v => {
    const matches = `${v.name} ${v.company || ''} ${v.email || ''}`.toLowerCase().includes(query.toLowerCase());
    const current = passes.find(p => (p.visitor?._id || p.visitor) === v._id);
    const s = current?.status === 'checked-in' ? 'checked-in' : current?.status === 'checked-out' ? 'checked-out' : 'expected';
    return matches && (status === 'all' || s === status) ? {...v, displayStatus:s} : null;
  }).filter(Boolean), [visitors, passes, query, status]);
  const register = async form => {
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
      const visitor = await api('/visitors', { method:'POST', body: fd });
      setModal(false); await load(); notify(`${visitor.name} was registered successfully.`);
    } catch(e) { notify(e.message); }
  };
  return <div className="app">
    <aside><div className="brand"><span className="brand-mark"><ShieldCheck size={20}/></span><span>visitflow</span></div>
      <div className="workspace">WORKSPACE</div>
      {nav.map(({icon:Icon,label}) => <button className={page===label?'active':''} onClick={()=>setPage(label)} key={label}><Icon size={18}/>{label}</button>)}
      <div className="sidebar-bottom"><div className="user-avatar">{auth.user.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><div><b>{auth.user.name}</b><small>{auth.user.role}</small></div><button className="logout" onClick={logout}><LogOut size={17}/></button></div>
    </aside>
    <main><header><div><p className="eyebrow">{new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}).toUpperCase()}</p><h1>{page==='Overview'?`Good morning, ${auth.user.name.split(' ')[0]}.`:page}</h1><p className="sub">{page==='Overview'?'Live data from your visitor management API.':'Manage your visitor experience with confidence.'}</p></div>
      <button className="primary" onClick={()=>setModal(true)}><Plus size={18}/> New visitor</button></header>
      {page==='Overview' && <Overview dashboard={dashboard} visitors={visitors} appointments={appointments} setPage={setPage}/>}
      {page==='Visitors' && <Visitors visitors={filtered} query={query} setQuery={setQuery} status={status} setStatus={setStatus} notify={notify}/>}
      {page==='Appointments' && <Appointments appointments={appointments} reload={load} notify={notify}/>}
      {page==='Passes' && <Passes passes={passes} reload={load} notify={notify} role={auth.user.role}/>}
      {page==='Scan pass' && <Scanner notify={notify} reload={load}/>}
    </main>
    {modal && <VisitorModal onClose={()=>setModal(false)} onSave={register}/>}
    {toast && <div className="toast"><ShieldCheck size={18}/>{toast}</div>}
  </div>;
}

function Overview({dashboard,visitors,appointments,setPage}) {
  if (!dashboard) return <Loading/>;
  return <><section className="metrics">
    <Metric icon={Users} value={dashboard.visitors} label="Total visitors" note="From MongoDB"/>
    <Metric icon={ScanLine} value={dashboard.active} label="Currently on-site" note="Live occupancy"/>
    <Metric icon={CalendarClock} value={dashboard.todayVisits} label="Expected today" note={`${dashboard.pending} pending approval`}/>
  </section><section className="grid"><div className="card wide"><div className="card-title"><div><h2>Today’s visitors</h2><p>Loaded from the Express API.</p></div><button className="text-btn" onClick={()=>setPage('Visitors')}>View all <ArrowUpRight size={16}/></button></div><VisitorTable visitors={visitors.slice(0,8)}/></div>
  <div className="card activity"><div className="card-title"><div><h2>Recent activity</h2><p>Latest access events</p></div></div>{dashboard.logs?.map((l,i)=><Activity key={l._id||i} name={l.pass?.visitor?.name||'Visitor'} text={l.action==='check-in'?'checked in':'checked out'} time={new Date(l.at).toLocaleString()}/>)}</div></section></>;
}
function Metric({icon:Icon,value,label,note}) { return <div className="metric"><div className="metric-icon"><Icon size={21}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>; }
function Visitors({visitors,query,setQuery,status,setStatus,notify}) { return <section className="card"><div className="toolbar"><div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by visitor, company or email"/></div><select className="secondary" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="expected">Expected</option><option value="checked-in">Checked in</option><option value="checked-out">Checked out</option></select></div><VisitorTable visitors={visitors} onAction={v=>notify(`${v.name} is connected to the live visitor record.`)}/></section>; }

function Appointments({appointments,reload,notify}) {
  const update = async (id,status) => { try { await api(`/appointments/${id}`,{method:'PATCH',body:JSON.stringify({status})}); await reload(); notify(`Appointment ${status}.`); } catch(e){notify(e.message);} };
  return <section className="card"><div className="card-title"><div><h2>Pre-registrations</h2><p>Approve or cancel visits through the API.</p></div></div>
    <div className="table-wrap"><table><thead><tr><th>VISITOR</th><th>HOST</th><th>DATE</th><th>STATUS</th><th></th></tr></thead><tbody>{appointments.map(a=><tr key={a._id}><td><b>{a.visitor?.name}</b><small>{a.visitor?.company}</small></td><td>{a.host?.name}</td><td>{a.scheduledFor?new Date(a.scheduledFor).toLocaleString():'-'}</td><td><em className={a.status}>{a.status}</em></td><td>{a.status==='pending'&&<><button className="small-btn" onClick={()=>update(a._id,'approved')}>Approve</button><button className="small-btn danger" onClick={()=>update(a._id,'cancelled')}>Cancel</button></>}</td></tr>)}</tbody></table></div></section>;
}

function Passes({passes,reload,notify,role}) {
  const issue = async visitorId => { try { const p=await api('/passes',{method:'POST',body:JSON.stringify({visitor:visitorId})}); await reload(); notify(`Pass ${p.code} issued.`); } catch(e){notify(e.message);} };
  const download = async code => { try { const blob=await api(`/passes/${code}/badge.pdf`); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${code}-badge.pdf`; a.click(); URL.revokeObjectURL(url); } catch(e){notify(e.message);} };
  return <section className="card"><div className="card-title"><div><h2>Digital passes</h2><p>QR credentials and printable PDF badges from Express.</p></div><a className="secondary link-btn" href={`${API}/reports/check-logs.csv`} onClick={async e=>{e.preventDefault();try{const blob=await api('/reports/check-logs.csv');const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='visitor-check-logs.csv';a.click();URL.revokeObjectURL(u);}catch(err){notify(err.message);}}}><Download size={15}/> Export CSV</a></div>
    <div className="table-wrap"><table><thead><tr><th>PASS</th><th>VISITOR</th><th>VALID UNTIL</th><th>STATUS</th><th></th></tr></thead><tbody>{passes.map(p=><tr key={p._id}><td><b>{p.code}</b></td><td>{p.visitor?.name}</td><td>{new Date(p.validUntil).toLocaleString()}</td><td><em className={p.status}>{p.status}</em></td><td><button className="small-btn" onClick={()=>download(p.code)}>PDF</button>{(role==='admin'||role==='security')&&<button className="small-btn" onClick={()=>navigator.clipboard?.writeText(p.code).then(()=>notify('Pass code copied.'))}>Copy QR code</button>}</td></tr>)}</tbody></table></div></section>;
}

function Scanner({notify,reload}) {
  const [code,setCode]=useState(''); const [camera,setCamera]=useState(false); const videoRef=useRef(null); const controls=useRef(null);
  const process = async value => { if(!value) return; try { const r=await api(`/passes/${encodeURIComponent(value.trim())}/scan`,{method:'POST'}); notify(`${r.action === 'check-in'?'Checked in':'Checked out'} ${r.pass.visitor?.name || 'visitor'}.`); setCode(''); await reload(); } catch(e){notify(e.message);} };
  useEffect(()=>()=>{controls.current?.stop?.();},[]);
  const startCamera = async () => {
    if (!('BarcodeDetector' in window)) { notify('This browser does not support QR camera scanning. Use Chrome/Edge with BarcodeDetector enabled or enter the pass code.'); return; }
    try {
      setCamera(true);
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
      videoRef.current.srcObject=stream; await videoRef.current.play();
      const detector=new window.BarcodeDetector({formats:['qr_code']});
      const scan=async()=>{ if(!videoRef.current||!camera) return; try {
        const codes=await detector.detect(videoRef.current);
        if(codes[0]?.rawValue){ stream.getTracks().forEach(t=>t.stop()); setCamera(false); process(codes[0].rawValue); return; }
      } catch(e){} requestAnimationFrame(scan); };
      requestAnimationFrame(scan); controls.current={stop:()=>stream.getTracks().forEach(t=>t.stop())};
    } catch(e){setCamera(false);notify(`Camera could not start: ${e.message}`);}
  };
  return <section className="card scanner"><ScanLine size={38}/><h2>Scan visitor pass</h2><p className="sub">Use the camera to read a QR code or enter the pass code manually.</p>
    {camera?<div className="camera-wrap"><video ref={videoRef} muted autoPlay playsInline/><button className="secondary" onClick={()=>{controls.current?.stop?.();setCamera(false);}}>Stop camera</button></div>:<button className="primary" onClick={startCamera}><Camera size={17}/> Start camera scanner</button>}
    <div className="scan-entry"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="VP-DEMO2026"/><button className="primary" onClick={()=>process(code)}>Process pass</button></div>
  </section>;
}

function VisitorTable({visitors,onAction}) { return <div className="table-wrap"><table><thead><tr><th>VISITOR</th><th>HOST</th><th>PURPOSE</th><th>STATUS</th><th>CREATED</th><th></th></tr></thead><tbody>{visitors.map(v=><tr key={v._id}><td><div className="person">{v.photo?<img src={v.photo} alt=""/>:<span>{v.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span>}<div><b>{v.name}</b><small>{v.company||v.email}</small></div></div></td><td>{v.host?.name||'—'}</td><td>{v.purpose||'—'}</td><td><em className={String(v.displayStatus||'expected').replace(' ','-')}>{v.displayStatus||'expected'}</em></td><td>{new Date(v.createdAt).toLocaleDateString()}</td><td>{onAction&&<button className="dots" onClick={()=>onAction(v)}>•••</button>}</td></tr>)}</tbody></table></div>; }
function Activity({name,text,time}) { return <div className="activity-row"><span className="activity-icon"><Clock3 size={16}/></span><div><b>{name}</b> {text}<small>{time}</small></div></div>; }
function VisitorModal({onClose,onSave}) {
  const [form,setForm]=useState({name:'',email:'',phone:'',company:'',purpose:'',host:'',photo:null});
  const [hosts,setHosts]=useState([]);
  useEffect(()=>{api('/users/hosts').then(setHosts).catch(()=>{});},[]);
  const change=e=>setForm({...form,[e.target.name]:e.target.type==='file'?e.target.files[0]:e.target.value});
  return <div className="overlay"><form className="modal" onSubmit={e=>{e.preventDefault();onSave(form)}}><button type="button" className="close" onClick={onClose}><X/></button><p className="eyebrow">REGISTER VISITOR</p><h2>Create a visitor record</h2>
    <label>Full name<input autoFocus name="name" required value={form.name} onChange={change}/></label>
    <label>Email<input type="email" name="email" value={form.email} onChange={change}/></label>
    <label>Phone<input name="phone" value={form.phone} onChange={change}/></label>
    <label>Company<input name="company" value={form.company} onChange={change}/></label>
    <label>Host<select name="host" required value={form.host} onChange={change}><option value="">Select host</option>{hosts.map(h=><option key={h._id} value={h._id}>{h.name}</option>)}</select></label>
    <label>Purpose<input name="purpose" required value={form.purpose} onChange={change}/></label>
    <label>Visitor photo<input type="file" name="photo" accept="image/*" onChange={change}/></label>
    <button className="primary full" type="submit">Register visitor</button>
  </form></div>;
}

function VisitorPortal({auth,logout}) {
  const [visitors,setVisitors]=useState([]); const [message,setMessage]=useState('');
  useEffect(()=>{api('/my-visits').then(setVisitors).catch(e=>setMessage(e.message));},[]);
  return <div className="portal"><div className="portal-card"><div className="portal-head"><div className="brand"><span className="brand-mark"><ShieldCheck size={20}/></span><span>visitflow</span></div><button className="secondary" onClick={logout}><LogOut size={15}/> Sign out</button></div>
    <p className="eyebrow">VISITOR PORTAL</p><h1>Hello, {auth.user.name}</h1><p className="sub">Your appointments and visitor records.</p>{message&&<div className="error">{message}</div>}
    {visitors.map(v=><div className="portal-item" key={v._id}><div><b>{v.name}</b><small>{v.company||'Guest'} · {v.purpose||'Visit'}</small></div><span>{v.createdAt?new Date(v.createdAt).toLocaleDateString():''}</span></div>)}{!visitors.length&&!message&&<div className="empty">No visits found yet.</div>}
  </div></div>;
}
function Loading(){return <div className="card empty">Loading live data…</div>;}
createRoot(document.getElementById('root')).render(<App/>);

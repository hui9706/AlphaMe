import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import * as api from './api';
import type { AdminApiKey, AdminCoinAccount, AdminGeneration, AdminRiskEvent, AdminReward, AdminStats, AdminStorage, AdminTemplate, AdminUser } from './api';

const BRAND_ASSET_URL = `${import.meta.env.BASE_URL}brand.svg`;
type Lang = 'zh' | 'vi';
type Page = 'dashboard' | 'templates' | 'generations' | 'users' | 'coinRisk' | 'apiKeys' | 'storage';
const copy = { zh: {
  dashboard: '运营总览', templates: '模板管理', generations: '生成任务', users: '用户管理', coinRisk: 'Coin / 风控', apiKeys: 'API Key 管理', storage: '图片存储', title: '今天的运营情况', subtitle: '统一管理模板、生成任务和基础设施。', usersToday: '累计用户', requests: '生成请求', success: '成功任务', spent: 'Coin 消耗', processing: '处理中', recent: '最近生成任务', loading: '正在加载…', active: '已启用', paused: '已暂停', pause: '暂停使用', resume: '恢复使用', edit: '编辑', editTemplate: '编辑模板', login: '登录运营后台', username: '管理员账号', password: '登录密码', signIn: '进入工作台', logout: '退出登录', language: '中文', nameVi: '越南文名称', nameZh: '中文名称', slug: '唯一标识 Slug', prompt: '模板提示词', cost: 'Coin 成本', create: '创建模板', label: 'Key 名称', value: 'API Key', priority: '优先级', addKey: '新增 Key', all: '全部', enabled: '启用中', disabled: '已停用', search: '搜索', fixed: '模板配置', records: '条记录', viewAll: '查看全部', promptHelp: '创建模板时由你填写提示词。保存后，前台只选择模板，服务端会自动使用该模板绑定的提示词生成。', choosePreset: '选择提示词方案', save: '保存配置', cancel: '取消', connected: '服务正常', live: '实时状态', operator: '运营管理员', secure: '服务端加密保存', fixedPrompt: '模板提示词预览', keyCount: '可用 Key', enabledCount: '启用模板', taskCount: '处理中任务', newTemplate: '新建模板', newKey: '添加 Key', status: '状态', created: '创建时间', user: '用户', template: '模板', costShort: '消耗', failures: '失败次数', priorityLabel: '调用优先级', statusSuccess: '成功', statusFailed: '失败', statusProcessing: '处理中', statusQueued: '排队中', noTemplates: '还没有模板', noTemplatesHint: '先创建一个固定风格模板，用户就可以在小程序中使用。', noKeys: '还没有 API Key', noKeysHint: '添加服务商 Key 后，生成任务才能正常调用模型。', noTasks: '还没有生成任务', noUsers: '还没有用户数据', balance: '可用余额', languageLabel: '语言', createdAt: '注册时间', hint: '查看并管理当前模块的详细数据。', presetDefault: '请输入该模板的提示词',
}, vi: {
  dashboard: 'Tổng quan', templates: 'Mẫu AI', generations: 'Tác vụ tạo ảnh', users: 'Người dùng', coinRisk: 'Coin / Rủi ro', apiKeys: 'API Key', storage: 'Lưu trữ ảnh', title: 'Tình hình vận hành hôm nay', subtitle: 'Quản lý mẫu, tác vụ và hạ tầng tập trung.', usersToday: 'Tổng người dùng', requests: 'Lượt tạo ảnh', success: 'Tác vụ thành công', spent: 'Coin đã dùng', processing: 'Đang xử lý', recent: 'Tác vụ gần đây', loading: 'Đang tải…', active: 'Đang dùng', paused: 'Tạm dừng', pause: 'Tạm dừng', resume: 'Tiếp tục', edit: 'Chỉnh sửa', editTemplate: 'Chỉnh sửa mẫu', login: 'Đăng nhập quản trị', username: 'Tài khoản', password: 'Mật khẩu', signIn: 'Vào trang quản trị', logout: 'Đăng xuất', language: 'VI', nameVi: 'Tên tiếng Việt', nameZh: 'Tên tiếng Trung', slug: 'Slug duy nhất', prompt: 'Prompt cố định', cost: 'Coin', create: 'Tạo mẫu', label: 'Tên Key', value: 'API Key', priority: 'Ưu tiên', addKey: 'Thêm Key', all: 'Tất cả', enabled: 'Đang dùng', disabled: 'Đã tắt', search: 'Tìm kiếm', fixed: 'Cấu hình cố định', records: 'bản ghi', viewAll: 'Xem tất cả', promptHelp: 'Prompt được cố định theo preset và không chỉnh tự do sau khi tạo để giữ chất lượng đồng nhất.', choosePreset: 'Chọn preset prompt', save: 'Lưu cấu hình', cancel: 'Hủy', connected: 'Dịch vụ bình thường', live: 'Trạng thái trực tiếp', operator: 'Quản trị viên', secure: 'Mã hóa tại server', fixedPrompt: 'Xem prompt cố định', keyCount: 'Key khả dụng', enabledCount: 'Mẫu đang dùng', taskCount: 'Tác vụ đang xử lý', newTemplate: 'Tạo mẫu', newKey: 'Thêm Key', status: 'Trạng thái', created: 'Ngày tạo', user: 'Người dùng', template: 'Mẫu', costShort: 'Chi phí', failures: 'Lỗi', priorityLabel: 'Ưu tiên gọi', statusSuccess: 'Thành công', statusFailed: 'Thất bại', statusProcessing: 'Đang xử lý', statusQueued: 'Đang chờ', noTemplates: 'Chưa có mẫu', noTemplatesHint: 'Tạo một mẫu cố định để người dùng bắt đầu sử dụng.', noKeys: 'Chưa có API Key', noKeysHint: 'Thêm Key nhà cung cấp để tác vụ có thể gọi model.', noTasks: 'Chưa có tác vụ', noUsers: 'Chưa có người dùng', balance: 'Số dư', languageLabel: 'Ngôn ngữ', createdAt: 'Ngày tham gia', hint: 'Xem và quản lý dữ liệu chi tiết của khu vực này.', presetDefault: 'Chọn một preset prompt',
} };

function App() { const [lang, setLang] = useState<Lang>('zh'); const [loggedIn, setLoggedIn] = useState(Boolean(api.getAdminToken())); if (!loggedIn) return <Login lang={lang} onLogin={() => setLoggedIn(true)} onLanguage={() => setLang(lang === 'zh' ? 'vi' : 'zh')} />; return <Workspace lang={lang} onLogout={() => { api.clearAdminToken(); setLoggedIn(false); }} onLanguage={() => setLang(lang === 'zh' ? 'vi' : 'zh')} />; }
function Login({ lang, onLogin, onLanguage }: { lang: Lang; onLogin: () => void; onLanguage: () => void }) { const t = copy[lang]; const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await api.login(username, password); onLogin(); } catch { setError(lang === 'zh' ? '登录失败，请检查账号和密码。' : 'Đăng nhập thất bại.'); } finally { setBusy(false); } }; return <main className="admin-login"><div className="login-aside"><span className="login-mark">A</span><p>AlphaMe<br /><b>运营控制台</b></p><div className="login-aside-note">模板化生成 · 统一效果<br />Template-driven AI creation</div></div><form className="login-card" onSubmit={(event) => void submit(event)}><div className="admin-brand"><img src={BRAND_ASSET_URL} /><div><strong>AlphaMe</strong><span>OPERATIONS</span></div></div><div className="login-kicker">SECURE WORKSPACE</div><h1>{t.login}</h1><p>管理模板、生成任务、用户和基础设施。</p><label>{t.username}<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label><label>{t.password}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" /></label>{error && <div className="login-error">{error}</div>}<button className="primary-button" disabled={busy}>{busy ? t.loading : t.signIn}</button><button type="button" className="login-language" onClick={onLanguage}>◐ {t.language}</button></form></main>; }

function Workspace({ lang, onLogout, onLanguage }: { lang: Lang; onLogout: () => void; onLanguage: () => void }) { const t = copy[lang]; const [page, setPage] = useState<Page>('dashboard'); const menu: Array<[Page, string, string, string]> = [['dashboard', '◈', t.dashboard, '运营'], ['templates', '✧', t.templates, '内容'], ['generations', '◫', t.generations, '内容'], ['users', '◎', t.users, '用户'], ['coinRisk', '₡', t.coinRisk, '运营'], ['apiKeys', '⌘', t.apiKeys, '系统'], ['storage', '▣', t.storage, '系统']]; return <div className="admin-shell"><aside><div className="admin-brand"><img src={BRAND_ASSET_URL} /><div><strong>AlphaMe</strong><span>OPERATIONS</span></div></div><div className="menu-label">WORKSPACE</div><nav>{menu.map(([id, icon, label, group]) => <button className={page === id ? 'selected' : ''} onClick={() => setPage(id)} key={id}><i>{icon}</i><span>{label}</span><em>{group}</em></button>)}</nav><div className="aside-foot"><div className="server-status"><span /> {t.connected}<small>API · Database · Queue</small></div><div className="profile"><div className="profile-avatar">A</div><div><b>{t.operator}</b><small>admin@alphame</small></div></div><button className="logout-button" onClick={onLogout}>{t.logout}</button></div></aside><main><header className="admin-topbar"><div className="breadcrumbs"><span>AlphaMe</span><b>/</b><strong>{menu.find((item) => item[0] === page)?.[2]}</strong></div><div className="header-actions"><span className="topbar-status"><i /> {t.connected}</span><button className="language" onClick={onLanguage}>◐ {t.language}</button></div></header>{page === 'dashboard' && <Dashboard t={t} onNavigate={setPage} />}{page === 'templates' && <Templates t={t} />}{page === 'generations' && <Generations t={t} />}{page === 'users' && <Users t={t} />}{page === 'coinRisk' && <CoinRisk t={t} />}{page === 'apiKeys' && <ApiKeys t={t} />}{page === 'storage' && <StorageSettings t={t} />}</main></div>; }
function PageHeader({ kicker, title, hint, action }: { kicker: string; title: string; hint: string; action?: React.ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{hint}</p></div>{action}</div>; }
function Dashboard({ t, onNavigate }: { t: typeof copy.zh; onNavigate: (page: Page) => void }) { const [stats, setStats] = useState<AdminStats | null>(null); const [generations, setGenerations] = useState<AdminGeneration[]>([]); const [templates, setTemplates] = useState<AdminTemplate[]>([]); const [keys, setKeys] = useState<AdminApiKey[]>([]); useEffect(() => { void Promise.all([api.getStats(), api.getGenerations(), api.getTemplates(), api.getApiKeys()]).then(([s, g, tm, k]) => { setStats(s); setGenerations(g); setTemplates(tm); setKeys(k); }); }, []); const metrics = [[t.usersToday, stats?.users ?? '—', 'people', 'cyan'], [t.requests, stats?.generations ?? '—', 'requests', 'blue'], [t.success, stats?.succeeded ?? '—', 'completed', 'green'], [t.spent, stats?.coinCharged ?? '—', 'coins', 'orange']]; return <div className="content"><PageHeader kicker="ALPHAME OPERATIONS" title={t.title} hint={t.subtitle} action={<button className="secondary-button" onClick={() => onNavigate('templates')}>＋ {t.newTemplate}</button>} /><section className="metric-grid">{metrics.map(([label, value, note, tone]) => <article className={`metric ${tone}`} key={String(label)}><div className="metric-top"><span>{label}</span><i>↗</i></div><strong>{value}</strong><small>{note} · {t.live}</small><div className="metric-line"><span style={{ width: tone === 'green' ? '78%' : tone === 'orange' ? '48%' : '64%' }} /></div></article>)}</section><section className="dashboard-grid"><div className="panel activity-panel"><div className="panel-title"><div><span className="eyebrow">ACTIVITY STREAM</span><h2>{t.recent}</h2></div><button className="text-button" onClick={() => onNavigate('generations')}>{t.viewAll} →</button></div><div className="table-head"><span>{t.user}</span><span>{t.template}</span><span>{t.costShort}</span><span>{t.status}</span></div>{generations.slice(0, 5).map((item) => <div className="table-row" key={item.id}><div className="user-cell"><i>{(item.user.displayName || 'Z').slice(0, 1).toUpperCase()}</i><span><b>{item.user.displayName || 'Zalo User'}</b><small>{item.user.zaloOpenId ? `${item.user.zaloOpenId.slice(0, 16)}…` : 'AlphaMe account'}</small></span></div><span>{item.template.nameZh || item.template.nameVi}</span><span>{item.coinCost} Coin</span><span className={`status ${item.status.toLowerCase()}`}>{statusLabel(item.status, t)}</span></div>)}{!generations.length && <EmptyState title={t.noTasks} hint={t.noTasks} />}</div><div className="side-stack"><div className="panel insight-panel"><div className="panel-title"><div><span className="eyebrow">WORKSPACE HEALTH</span><h2>{t.live}</h2></div><span className="health-dot">●</span></div><div className="health-list"><HealthRow label={t.enabledCount} value={`${templates.filter((x) => x.enabled).length} / ${templates.length}`} /><HealthRow label={t.keyCount} value={`${keys.filter((x) => x.status === 'ACTIVE').length} / ${keys.length}`} /><HealthRow label={t.taskCount} value={String(stats?.processing ?? 0)} /></div></div><div className="panel quick-panel"><span className="eyebrow">QUICK ACTIONS</span><button onClick={() => onNavigate('templates')}><span>✧</span>{t.newTemplate}<b>→</b></button><button onClick={() => onNavigate('apiKeys')}><span>⌘</span>{t.newKey}<b>→</b></button></div></div></section></div>; }
function HealthRow({ label, value }: { label: string; value: string }) { return <div className="health-row"><span>{label}</span><b>{value}</b></div>; }
function statusLabel(status: string, t: typeof copy.zh) { return status === 'SUCCEEDED' ? t.statusSuccess : status === 'FAILED' ? t.statusFailed : status === 'PROCESSING' ? t.statusProcessing : t.statusQueued; }
function EmptyState({ title, hint }: { title: string; hint: string }) { return <div className="empty-state"><span>○</span><b>{title}</b><small>{hint}</small></div>; }

function Templates({ t }: { t: typeof copy.zh }) {
  const emptyForm = { slug: '', nameVi: '', nameZh: '', prompt: '', coverUrl: '', coinCost: 10 };
  const [items, setItems] = useState<AdminTemplate[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const load = () => api.getTemplates().then(setItems).catch((err) => setError(err.message));
  useEffect(() => { void load(); }, []);
  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (item: AdminTemplate) => {
    setEditingId(item.id);
    setForm({ slug: item.slug, nameVi: item.nameVi, nameZh: item.nameZh, prompt: item.prompt, coverUrl: item.coverUrl ?? '', coinCost: item.coinCost });
    setError('');
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };
  const uploadCover = async (file: File) => {
    setCoverBusy(true);
    setError('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('图片读取失败')); reader.readAsDataURL(file); });
      const asset = await api.uploadTemplateCover(dataUrl);
      setForm((current) => ({ ...current, coverUrl: asset.publicUrl }));
    } catch (err) { setError(err instanceof Error ? err.message : '图片上传失败'); }
    finally { setCoverBusy(false); }
  };
  const moveTemplate = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length || reordering) return;
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setReordering(true);
    setError('');
    try { await api.reorderTemplates(next.map((item) => item.id)); setItems(next); }
    catch (err) { setError(err instanceof Error ? err.message : '排序保存失败'); }
    finally { setReordering(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api.updateTemplate(editingId, { nameVi: form.nameVi, nameZh: form.nameZh, prompt: form.prompt, coverUrl: form.coverUrl, coinCost: form.coinCost });
      } else {
        await api.createTemplate(form);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };
  const filtered = items.filter((item) => filter === 'all' || (filter === 'enabled' ? item.enabled : !item.enabled));
  return <div className="content">
    <PageHeader kicker="CONTENT WORKSPACE" title={t.templates} hint={t.promptHelp} action={<button className="primary-button" onClick={openCreate}>＋ {t.newTemplate}</button>} />
    {showForm && <section className="config-panel">
      <div className="config-heading"><div><span className="eyebrow">{editingId ? 'EDIT TEMPLATE' : 'NEW TEMPLATE'}</span><h2>{editingId ? t.editTemplate : t.create}</h2><p>{t.promptHelp}</p></div><button className="icon-button" onClick={closeForm}>×</button></div>
      <form onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <label>{t.slug}<input value={form.slug} readOnly={Boolean(editingId)} onChange={(event) => setForm({ ...form, slug: event.target.value })} required placeholder="portrait-studio" /></label>
          <label>{t.nameVi}<input value={form.nameVi} onChange={(event) => setForm({ ...form, nameVi: event.target.value })} required /></label>
          <label>{t.nameZh}<input value={form.nameZh} onChange={(event) => setForm({ ...form, nameZh: event.target.value })} required /></label>
          <label>风格显示图<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); }} />{coverBusy && <small>正在上传图片…</small>}{form.coverUrl && <img className="cover-preview" src={form.coverUrl} alt="风格显示图预览" />}</label>
          <label>{t.cost}<input type="number" min="0" value={form.coinCost} onChange={(event) => setForm({ ...form, coinCost: Number(event.target.value) })} required /></label>
        </div>
        <label className="prompt-field">{t.prompt}<textarea value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} required placeholder="Describe the exact style and constraints that should be used for this template…" /></label>
        <div className="prompt-preview"><div><span className="eyebrow">{t.fixedPrompt}</span><b>{form.prompt ? '已填写，保存后绑定到此模板' : t.presetDefault}</b></div><p>{form.prompt || t.promptHelp}</p></div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={closeForm}>{t.cancel}</button><button className="primary-button" disabled={!form.prompt.trim() || coverBusy}>{t.save}</button></div>
      </form>
    </section>}
    {error && <div className="admin-error">{error}</div>}
    <div className="list-toolbar"><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t.all} <b>{items.length}</b></button><button className={filter === 'enabled' ? 'active' : ''} onClick={() => setFilter('enabled')}>{t.enabled} <b>{items.filter((x) => x.enabled).length}</b></button><button className={filter === 'disabled' ? 'active' : ''} onClick={() => setFilter('disabled')}>{t.disabled} <b>{items.filter((x) => !x.enabled).length}</b></button></div><span className="list-count">{filtered.length} {t.records}</span></div>
    <section className="panel data-list">{filtered.length ? filtered.map((item) => { const index = items.findIndex((entry) => entry.id === item.id); return <div className="template-row" key={item.id}><div className="template-cover">{item.coverUrl ? <img src={item.coverUrl} /> : <span>✧</span>}</div><div className="template-main"><div><strong>{item.nameZh}</strong><span className="slug-chip">{item.slug}</span></div><small>{item.nameVi}</small><p><span>模板提示词</span> · {item.prompt.slice(0, 72)}{item.prompt.length > 72 ? '…' : ''}</p></div><div className="template-meta"><b>{item.coinCost} <small>Coin</small></b><span>排序 {index + 1} · {item.enabled ? t.active : t.paused}</span></div><div className="template-actions"><button className="sort-button" disabled={index === 0 || reordering} onClick={() => void moveTemplate(index, -1)}>↑</button><button className="sort-button" disabled={index === items.length - 1 || reordering} onClick={() => void moveTemplate(index, 1)}>↓</button><button className="edit-button" onClick={() => openEdit(item)}>{t.edit}</button><button className={`status-button ${item.enabled ? 'enabled' : 'disabled'}`} onClick={() => api.toggleTemplate(item.id, !item.enabled).then(load)}>{item.enabled ? t.pause : t.resume}</button></div></div>; }) : <EmptyState title={t.noTemplates} hint={t.noTemplatesHint} />}</section>
  </div>;
}
function Generations({ t }: { t: typeof copy.zh }) { const [items, setItems] = useState<AdminGeneration[]>([]); const [query, setQuery] = useState(''); useEffect(() => { void api.getGenerations().then(setItems); }, []); const filtered = useMemo(() => items.filter((item) => `${item.id} ${item.user.displayName ?? ''} ${item.template.nameZh}`.toLowerCase().includes(query.toLowerCase())), [items, query]); return <div className="content"><PageHeader kicker="AI PIPELINE" title={t.generations} hint={t.hint} /><div className="search-row"><div className="search-box">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`${t.search} ${t.generations}`} /></div><span>{filtered.length} {t.records}</span></div><section className="panel data-list wide-list"><div className="table-head"><span>{t.user}</span><span>{t.template}</span><span>{t.created}</span><span>{t.costShort}</span><span>{t.status}</span></div>{filtered.map((item) => <div className="table-row" key={item.id}><div className="user-cell"><i>{(item.user.displayName || 'Z').slice(0, 1).toUpperCase()}</i><span><b>{item.user.displayName || 'Zalo User'}</b><small>{item.id.slice(0, 18)}…</small></span></div><span>{item.template.nameZh}<small>{item.template.nameVi}</small></span><span>{new Date(item.createdAt).toLocaleString()}</span><span>{item.coinCost} Coin</span><span className={`status ${item.status.toLowerCase()}`}>{statusLabel(item.status, t)}</span></div>)}{!filtered.length && <EmptyState title={t.noTasks} hint={t.noTasks} />}</section></div>; }
function Users({ t }: { t: typeof copy.zh }) { const [items, setItems] = useState<AdminUser[]>([]); const [query, setQuery] = useState(''); useEffect(() => { void api.getUsers().then(setItems); }, []); const filtered = items.filter((item) => `${item.displayName ?? ''} ${item.zaloOpenId}`.toLowerCase().includes(query.toLowerCase())); return <div className="content"><PageHeader kicker="USER DIRECTORY" title={t.users} hint={t.hint} /><div className="search-row"><div className="search-box">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`${t.search} ${t.users}`} /></div><span>{filtered.length} {t.records}</span></div><section className="panel data-list user-list"><div className="table-head"><span>{t.user}</span><span>{t.languageLabel}</span><span>{t.balance}</span><span>{t.createdAt}</span></div>{filtered.map((item) => <div className="table-row" key={item.id}><div className="user-cell"><i>{(item.displayName || 'Z').slice(0, 1).toUpperCase()}</i><span><b>{item.displayName || 'Zalo User'}</b><small>{item.zaloOpenId}</small></span></div><span className="lang-chip">{item.language.toUpperCase()}</span><span><b>{item.coinAccount?.available ?? 0}</b> Coin</span><span>{new Date(item.createdAt).toLocaleDateString()}</span></div>)}{!filtered.length && <EmptyState title={t.noUsers} hint={t.noUsers} />}</section></div>; }
function CoinRisk({ t }: { t: typeof copy.zh }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [account, setAccount] = useState<AdminCoinAccount | null>(null);
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [riskEvents, setRiskEvents] = useState<AdminRiskEvent[]>([]);
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState(10);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async (userId = selectedUserId) => {
    try {
      const [nextUsers, nextRewards, nextRisk] = await Promise.all([api.getUsers(), api.getRewards(userId || undefined), api.getRiskEvents()]);
      setUsers(nextUsers); setRewards(nextRewards); setRiskEvents(nextRisk);
      if (!selectedUserId && nextUsers[0]) setSelectedUserId(nextUsers[0].id);
      if (userId) setAccount(await api.getCoinAccount(userId));
    } catch (err) { setError(err instanceof Error ? err.message : '数据加载失败'); }
  };
  useEffect(() => { void load(''); }, []);
  useEffect(() => { if (selectedUserId) void Promise.all([api.getCoinAccount(selectedUserId), api.getRewards(selectedUserId)]).then(([nextAccount, nextRewards]) => { setAccount(nextAccount); setRewards(nextRewards); }).catch((err) => setError(err instanceof Error ? err.message : '用户账务加载失败')); }, [selectedUserId]);

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUserId || !amount || !note.trim()) return;
    setBusy(true); setError('');
    try { await api.adjustCoin(selectedUserId, { amount, note: note.trim(), idempotencyKey: `admin-adjust:${crypto.randomUUID()}` }); setNote(''); await load(selectedUserId); }
    catch (err) { setError(err instanceof Error ? err.message : 'Coin 调整失败'); }
    finally { setBusy(false); }
  };
  const revoke = async (reward: AdminReward) => {
    const reason = window.prompt('请输入撤销原因', '确认该奖励属于异常行为');
    if (!reason?.trim()) return;
    setError('');
    try { await api.revokeReward(reward.id, reason.trim()); await load(selectedUserId); }
    catch (err) { setError(err instanceof Error ? err.message : '奖励撤销失败'); }
  };
  const reviewRisk = async (event: AdminRiskEvent, status: 'REVIEWED' | 'CLEARED') => {
    try { await api.reviewRiskEvent(event.id, status); setRiskEvents((current) => current.map((item) => item.id === event.id ? { ...item, status, reviewedAt: new Date().toISOString() } : item)); }
    catch (err) { setError(err instanceof Error ? err.message : '风险事件处理失败'); }
  };
  const filteredUsers = users.filter((item) => `${item.displayName ?? ''} ${item.zaloOpenId ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const selectedUser = users.find((item) => item.id === selectedUserId);
  const sourceLabel = (sourceType: string) => ({ DAILY_CHECK_IN: '每日签到', SHARE_OPEN: '好友分享', PLAZA_LIKE: '作品获赞', ADMIN_ADJUSTMENT: '后台调整', REWARD_REVERSAL: '奖励撤销' }[sourceType] ?? sourceType);
  const riskLabel = (type: string) => type === 'PLAZA_LIKE_RATE' ? '刷赞频率' : type === 'SHARE_OPEN_RATE' ? '刷分享频率' : type;
  return <div className="content coin-risk-page">
    <PageHeader kicker="COIN CONTROL · RISK OPS" title={t.coinRisk} hint="处理 Coin 账户、奖励来源与异常刷赞 / 刷分享事件，所有操作都会写入账务审计。" />
    {error && <div className="admin-error">{error}</div>}
    <section className="coin-ops-grid">
      <div className="panel user-picker-panel"><div className="panel-title"><div><span className="eyebrow">ACCOUNT TARGET</span><h2>选择用户</h2></div><span className="list-count">{filteredUsers.length} 人</span></div><div className="search-box coin-search">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索昵称 / Zalo Open ID" /></div><div className="coin-user-list">{filteredUsers.map((item) => <button className={`coin-user-row ${item.id === selectedUserId ? 'selected' : ''}`} key={item.id} onClick={() => setSelectedUserId(item.id)}><i>{(item.displayName || 'Z').slice(0, 1).toUpperCase()}</i><span><b>{item.displayName || 'Zalo User'}</b><small>{item.zaloOpenId || item.id}</small></span><strong>{item.coinAccount?.available ?? 0}</strong></button>)}{!filteredUsers.length && <EmptyState title="没有匹配用户" hint="尝试昵称或 Zalo Open ID" />}</div></div>
      <div className="coin-detail-stack">
        <div className="panel coin-balance-panel"><div><span className="eyebrow">SELECTED ACCOUNT</span><h2>{selectedUser?.displayName || '请选择用户'}</h2><p>{selectedUser?.zaloOpenId || '选择左侧用户后查看账户明细'}</p></div><div className="coin-balance-values"><div><strong>{account?.coinAccount?.available ?? selectedUser?.coinAccount?.available ?? 0}</strong><small>可用 Coin</small></div><div><strong>{account?.coinAccount?.frozen ?? selectedUser?.coinAccount?.frozen ?? 0}</strong><small>冻结 Coin</small></div></div></div>
        <div className="config-panel coin-adjust-panel"><div className="config-heading"><div><span className="eyebrow">MANUAL ADJUSTMENT</span><h2>手动增减 Coin</h2><p>正数增加，负数减少；需要填写原因，操作人和账单会一并记录。</p></div></div><form onSubmit={(event) => void submitAdjustment(event)}><div className="form-grid compact-adjust"><label>调整数量<input type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} disabled={!selectedUserId} /></label><label>操作原因<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：活动补发 / 误发扣回" disabled={!selectedUserId} /></label></div><div className="form-actions"><button className="primary-button" disabled={busy || !selectedUserId || !amount || !note.trim()}>{busy ? '提交中…' : '确认调整'}</button></div></form></div>
      </div>
    </section>
    <section className="panel coin-section"><div className="panel-title"><div><span className="eyebrow">REWARD LEDGER</span><h2>奖励来源与异常奖励</h2><p>按用户查看奖励来源；撤销后会生成反向账单，不会直接删除原记录。</p></div><span className="list-count">{rewards.length} 条奖励</span></div><div className="table-head coin-table-head"><span>用户</span><span>奖励来源</span><span>Coin</span><span>状态</span><span>操作</span></div>{rewards.map((reward) => <div className="table-row coin-table-row" key={reward.id}><div className="user-cell"><i>{(reward.user.displayName || 'Z').slice(0, 1).toUpperCase()}</i><span><b>{reward.user.displayName || 'Zalo User'}</b><small>{reward.user.zaloOpenId || reward.user.id.slice(0, 12)}</small></span></div><span><b>{sourceLabel(reward.sourceType)}</b><small>{reward.note || reward.sourceId.slice(0, 18)}</small></span><span className={reward.amount < 0 ? 'coin-negative' : 'coin-positive'}>{reward.amount > 0 ? '+' : ''}{reward.amount}</span><span className={`status ${reward.status.toLowerCase()}`}>{reward.status === 'GRANTED' ? '已发放' : reward.status === 'REVOKED' ? '已撤销' : reward.status}</span><span>{reward.status === 'GRANTED' ? <button className="danger-button" onClick={() => void revoke(reward)}>撤销奖励</button> : <small className="muted-note">不可重复撤销</small>}</span></div>)}{!rewards.length && <EmptyState title="暂无奖励记录" hint="选择用户后查看奖励来源" />}</section>
    <section className="panel coin-section risk-section"><div className="panel-title"><div><span className="eyebrow">RISK EVENTS</span><h2>刷赞 / 刷分享风险事件</h2><p>当前展示后端规则拦截记录，便于运营定位用户与来源对象。</p></div><span className="risk-summary">{riskEvents.filter((event) => event.status === 'BLOCKED' || event.status === 'OPEN').length} 条待处理</span></div><div className="table-head risk-table-head"><span>用户</span><span>规则</span><span>风险分</span><span>来源对象</span><span>状态 / 处理</span></div>{riskEvents.map((event) => <div className="table-row risk-table-row" key={event.id}><div className="user-cell"><i className="risk-avatar">!</i><span><b>{event.user.displayName || 'Zalo User'}</b><small>{event.user.zaloOpenId || event.user.id.slice(0, 12)}</small></span></div><span><b>{riskLabel(event.type)}</b><small>{event.detail || '命中风控限制'}</small></span><span className="risk-score">{event.score}</span><span>{event.sourceType || '—'}<small>{event.sourceId ? event.sourceId.slice(0, 16) : '—'}</small></span><span className="risk-actions"><b className={`risk-status ${event.status.toLowerCase()}`}>{event.status === 'REVIEWED' ? '已确认' : event.status === 'CLEARED' ? '已忽略' : '待处理'}</b>{(event.status === 'OPEN' || event.status === 'BLOCKED') && <><button className="risk-review-button" onClick={() => void reviewRisk(event, 'REVIEWED')}>确认</button><button className="risk-clear-button" onClick={() => void reviewRisk(event, 'CLEARED')}>忽略</button></>}</span></div>)}{!riskEvents.length && <EmptyState title="暂无风险事件" hint="当前没有被规则拦截的刷赞或刷分享行为" />}</section>
  </div>;
}

function ApiKeys({ t }: { t: typeof copy.zh }) {
  const [items, setItems] = useState<AdminApiKey[]>([]);
  const [form, setForm] = useState({ label: '', value: '', priority: 100 });
  const [volcConfig, setVolcConfig] = useState({ configured: false, region: 'cn-beijing' });
  const [volcForm, setVolcForm] = useState({ accessKey: '', secretKey: '', region: 'cn-beijing' });
  const [volcSaved, setVolcSaved] = useState('');
  const [volcTest, setVolcTest] = useState('');
  const [usage, setUsage] = useState<api.AdminVolcengineUsage | null>(null);
  const [usageRange, setUsageRange] = useState({ startDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) });
  const [showForm, setShowForm] = useState(false);
  const load = () => api.getApiKeys().then(setItems);
  useEffect(() => { void load(); void api.getVolcengineConfig().then((value) => { setVolcConfig(value); setVolcForm((current) => ({ ...current, region: value.region })); }); }, []);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); await api.createApiKey(form); setForm({ label: '', value: '', priority: 100 }); setShowForm(false); await load(); };
  const saveVolcConfig = async (event: React.FormEvent) => { event.preventDefault(); const value = await api.updateVolcengineConfig(volcForm); setVolcConfig(value); setVolcForm((current) => ({ ...current, accessKey: '', secretKey: '' })); setVolcSaved('已保存，密钥已加密'); setVolcTest(''); };
  const testVolc = async () => { setVolcTest('测试中…'); try { const result = await api.testVolcengine(); setVolcTest(result.message); } catch (error) { setVolcTest(error instanceof Error ? error.message : '测试失败'); } };
  const loadUsage = async () => { setVolcTest(''); try { setUsage(await api.getVolcengineUsage(usageRange.startDate, usageRange.endDate)); } catch (error) { setVolcTest(error instanceof Error ? error.message : '用量查询失败'); } };
  return <div className="content">
    <PageHeader kicker="INFRASTRUCTURE" title={t.apiKeys} hint={t.hint} action={<button className="primary-button" onClick={() => setShowForm(true)}>＋ {t.newKey}</button>} />
    <section className="config-panel">
      <div className="config-heading"><div><span className="eyebrow">VOLCENGINE ARK CONTROL PLANE</span><h2>火山引擎 AK/SK 签名</h2><p>用于查询方舟账号级模型用量；AK/SK 仅服务端加密保存，前端不会回显原值。</p></div><span className={`status ${volcConfig.configured ? 'succeeded' : 'paused'}`}>{volcConfig.configured ? '已配置' : '未配置'}</span></div>
      <form onSubmit={(event) => void saveVolcConfig(event)}><div className="form-grid"><label>Access Key<input value={volcForm.accessKey} placeholder={volcConfig.configured ? '已配置，留空保持不变' : ''} onChange={(event) => setVolcForm({ ...volcForm, accessKey: event.target.value })} /></label><label>Secret Key<input type="password" value={volcForm.secretKey} placeholder={volcConfig.configured ? '已配置，留空保持不变' : ''} onChange={(event) => setVolcForm({ ...volcForm, secretKey: event.target.value })} /></label><label>区域<select value={volcForm.region} onChange={(event) => setVolcForm({ ...volcForm, region: event.target.value })}><option value="cn-beijing">cn-beijing</option></select></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => void testVolc()}>测试连通性</button><button className="primary-button">保存 AK/SK 配置</button>{volcSaved && <small>{volcSaved}</small>}{volcTest && <small>{volcTest}</small>}</div></form>
    </section>
    <section className="panel usage-panel"><div className="panel-title"><div><span className="eyebrow">VOLCENGINE USAGE</span><h2>方舟用量明细</h2><p>按账号、模型和日期聚合，不能拆分到单个 API Key。</p></div><div className="usage-filters"><input type="date" value={usageRange.startDate} onChange={(event) => setUsageRange({ ...usageRange, startDate: event.target.value })} /><span>至</span><input type="date" value={usageRange.endDate} onChange={(event) => setUsageRange({ ...usageRange, endDate: event.target.value })} /><button className="secondary-button" onClick={() => void loadUsage()}>查询用量</button></div></div>{usage ? <div className="usage-summary">{Object.entries(usage.totals).map(([label, value]) => <div key={label}><b>{value.toLocaleString()}</b><small>{label}</small></div>)}{!Object.keys(usage.totals).length && <small>该时间范围暂无用量记录</small>}</div> : <div className="usage-empty">配置 AK/SK 后，选择日期范围查询火山方舟实际用量。</div>}</section>
    {showForm && <section className="config-panel compact"><div className="config-heading"><div><span className="eyebrow">SECURE CREDENTIAL</span><h2>{t.addKey}</h2><p>{t.secure}</p></div><button className="icon-button" onClick={() => setShowForm(false)}>×</button></div><form onSubmit={(event) => void submit(event)}><div className="form-grid"><label>{t.label}<input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} required /></label><label>{t.value}<input value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required /></label><label>{t.priority}<input type="number" min="0" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>{t.cancel}</button><button className="primary-button">{t.save}</button></div></form></section>}
    <section className="panel key-overview"><div><span className="eyebrow">KEY POOL</span><h2>{t.live}</h2><p>{t.secure}</p></div><div className="key-overview-stats"><b>{items.filter((x) => x.status === 'ACTIVE').length}<small>{t.keyCount}</small></b><b>{items.reduce((sum, x) => sum + x.failureCount, 0)}<small>{t.failures}</small></b></div></section><section className="panel data-list">{items.length ? items.map((item) => <div className="key-row" key={item.id}><div className="key-icon">⌘</div><div><strong>{item.label}</strong><small>{t.priorityLabel} {item.priority} · {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : '—'}</small></div><span className={`status ${item.status.toLowerCase()}`}>{item.status === 'ACTIVE' ? t.active : t.paused}</span><button className={`status-button ${item.status === 'ACTIVE' ? 'enabled' : 'disabled'}`} onClick={() => api.updateApiKey(item.id, item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE').then(load)}>{item.status === 'ACTIVE' ? t.pause : t.resume}</button></div>) : <EmptyState title={t.noKeys} hint={t.noKeysHint} />}</section>
  </div>;
}

function StorageSettings({ t }: { t: typeof copy.zh }) {
  const [storage, setStorage] = useState<AdminStorage | null>(null);
  const [form, setForm] = useState({ provider: 'qiniu', enabled: true, qiniuAccessKey: '', qiniuSecretKey: '', qiniuBucket: 'picalphavn', qiniuRegion: 'as0', qiniuDomain: 'https://oss.alphavn.tech', qiniuPrivate: true, qiniuUrlTtlSeconds: 2592000, fallbackLocal: true });
  const [saved, setSaved] = useState('');
  const [testResult, setTestResult] = useState('');
  useEffect(() => { void api.getStorage().then((value) => { setStorage(value); setForm((current) => ({ ...current, ...value, qiniuAccessKey: '', qiniuSecretKey: '' })); }); }, []);
  const save = async (event: React.FormEvent) => { event.preventDefault(); const value = await api.updateStorage(form); setStorage(value); setSaved('已保存'); setTestResult(''); setForm((current) => ({ ...current, qiniuAccessKey: '', qiniuSecretKey: '' })); };
  const test = async () => { setTestResult('测试中…'); try { const result = await api.testStorage(form); setTestResult(result.message); } catch (error) { setTestResult(error instanceof Error ? error.message : '测试失败'); } };
  return <div className="content">
    <PageHeader kicker="INFRASTRUCTURE / OBJECT STORAGE" title={t.storage} hint="专门管理七牛云图片存储。API Key 凭据与图片存储凭据分开维护，降低误操作风险。" />
    <section className="config-panel">
      <div className="config-heading"><div><span className="eyebrow">QINIU OBJECT STORAGE</span><h2>七牛云图片存储</h2><p>私有空间使用临时签名 URL；七牛云上传失败时自动回退本地存储。</p></div><span className={`status ${storage?.enabled ? 'succeeded' : 'paused'}`}>{storage?.enabled ? '已启用' : '未启用'}</span></div>
      <form onSubmit={(event) => void save(event)}><div className="form-grid">
        <label>启用七牛云<select value={form.enabled ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, enabled: event.target.value === 'yes' })}><option value="yes">启用</option><option value="no">停用</option></select></label>
        <label>AccessKey<input value={form.qiniuAccessKey} placeholder={storage?.qiniuAccessKey ? '已配置，留空保持不变' : ''} onChange={(event) => setForm({ ...form, qiniuAccessKey: event.target.value })} /></label>
        <label>SecretKey<input type="password" value={form.qiniuSecretKey} placeholder={storage?.qiniuSecretKey ? '已配置，留空保持不变' : ''} onChange={(event) => setForm({ ...form, qiniuSecretKey: event.target.value })} /></label>
        <label>Bucket<input value={form.qiniuBucket} onChange={(event) => setForm({ ...form, qiniuBucket: event.target.value })} required /></label>
        <label>区域代码<input value={form.qiniuRegion} onChange={(event) => setForm({ ...form, qiniuRegion: event.target.value })} required /></label>
        <label>访问域名<input value={form.qiniuDomain} onChange={(event) => setForm({ ...form, qiniuDomain: event.target.value })} required /></label>
      </div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => void test()}>测试连通性</button><button className="primary-button">保存对象存储配置</button>{saved && <small>{saved}</small>}{testResult && <small>{testResult}</small>}</div></form>
    </section>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

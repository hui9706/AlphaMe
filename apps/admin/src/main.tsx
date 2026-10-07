import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import * as api from './api';
import type { AdminApiKey, AdminCoinAccount, AdminGeneration, AdminRiskEvent, AdminReward, AdminStats, AdminStorage, AdminTemplate, AdminUser, AdminWebpImage, AdminCoinRewardConfig } from './api';

const BRAND_ASSET_URL = `${import.meta.env.BASE_URL}brand.svg`;
type Lang = 'zh' | 'vi';
type Page = 'dashboard' | 'homeImages' | 'templates' | 'generations' | 'users' | 'coinRisk' | 'coinRewards' | 'apiKeys' | 'storage' | 'account';
const copy = { zh: {
  dashboard: '运营总览', templates: '模板管理', generations: '生成任务', users: '用户管理', coinRisk: 'Coin / 风控', apiKeys: 'API Key 管理', storage: '图片存储', account: '账号安全', title: '今天的运营情况', subtitle: '统一管理模板、生成任务和基础设施。', usersToday: '累计用户', requests: '生成请求', success: '成功任务', spent: 'Coin 消耗', processing: '处理中', recent: '最近生成任务', loading: '正在加载…', active: '已启用', paused: '已暂停', pause: '暂停使用', resume: '恢复使用', edit: '编辑', editTemplate: '编辑模板', login: '登录运营后台', username: '管理员账号', password: '登录密码', signIn: '进入工作台', logout: '退出登录', language: '中文', nameVi: '越南文名称', nameZh: '中文名称', categoryVi: '越南语分类', categoryZh: '中文分类', slug: '唯一标识 Slug', prompt: '模板提示词', cost: 'Coin 成本', create: '创建模板', label: 'Key 名称', value: 'API Key', priority: '优先级', addKey: '新增 Key', all: '全部', enabled: '启用中', disabled: '已停用', search: '搜索', fixed: '模板配置', records: '条记录', viewAll: '查看全部', promptHelp: '创建模板时由你填写提示词。保存后，前台只选择模板，服务端会自动使用该模板绑定的提示词生成。', choosePreset: '选择提示词方案', save: '保存配置', cancel: '取消', connected: '服务正常', live: '实时状态', operator: '运营管理员', secure: '服务端加密保存', fixedPrompt: '模板提示词预览', keyCount: '可用 Key', enabledCount: '启用模板', taskCount: '处理中任务', newTemplate: '新建模板', newKey: '添加 Key', status: '状态', created: '创建时间', user: '用户', template: '模板', costShort: '消耗', failures: '失败次数', priorityLabel: '调用优先级', statusSuccess: '成功', statusFailed: '失败', failureReason: '失败原因', statusProcessing: '处理中', statusQueued: '排队中', noTemplates: '还没有模板', noTemplatesHint: '先创建一个固定风格模板，用户就可以在小程序中使用。', noKeys: '还没有 API Key', noKeysHint: '添加服务商 Key 后，生成任务才能正常调用模型。', noTasks: '还没有生成任务', noUsers: '还没有用户数据', balance: '可用余额', languageLabel: '语言', createdAt: '注册时间', hint: '查看并管理当前模块的详细数据。', presetDefault: '请输入该模板的提示词',
}, vi: {
  dashboard: 'Tổng quan', templates: 'Mẫu AI', generations: 'Tác vụ tạo ảnh', users: 'Người dùng', coinRisk: 'Coin / Rủi ro', apiKeys: 'API Key', storage: 'Lưu trữ ảnh', account: 'Bảo mật tài khoản', title: 'Tình hình vận hành hôm nay', subtitle: 'Quản lý mẫu, tác vụ và hạ tầng tập trung.', usersToday: 'Tổng người dùng', requests: 'Lượt tạo ảnh', success: 'Tác vụ thành công', spent: 'Coin đã dùng', processing: 'Đang xử lý', recent: 'Tác vụ gần đây', loading: 'Đang tải…', active: 'Đang dùng', paused: 'Tạm dừng', pause: 'Tạm dừng', resume: 'Tiếp tục', edit: 'Chỉnh sửa', editTemplate: 'Chỉnh sửa mẫu', login: 'Đăng nhập quản trị', username: 'Tài khoản', password: 'Mật khẩu', signIn: 'Vào trang quản trị', logout: 'Đăng xuất', language: 'VI', nameVi: 'Tên tiếng Việt', nameZh: 'Tên tiếng Trung', categoryVi: 'Danh mục tiếng Việt', categoryZh: 'Danh mục tiếng Trung', slug: 'Slug duy nhất', prompt: 'Prompt cố định', cost: 'Coin', create: 'Tạo mẫu', label: 'Tên Key', value: 'API Key', priority: 'Ưu tiên', addKey: 'Thêm Key', all: 'Tất cả', enabled: 'Đang dùng', disabled: 'Đã tắt', search: 'Tìm kiếm', fixed: 'Cấu hình cố định', records: 'bản ghi', viewAll: 'Xem tất cả', promptHelp: 'Prompt được cố định theo preset và không chỉnh tự do sau khi tạo để giữ chất lượng đồng nhất.', choosePreset: 'Chọn preset prompt', save: 'Lưu cấu hình', cancel: 'Hủy', connected: 'Dịch vụ bình thường', live: 'Trạng thái trực tiếp', operator: 'Quản trị viên', secure: 'Mã hóa tại server', fixedPrompt: 'Xem prompt cố định', keyCount: 'Key khả dụng', enabledCount: 'Mẫu đang dùng', taskCount: 'Tác vụ đang xử lý', newTemplate: 'Tạo mẫu', newKey: 'Thêm Key', status: 'Trạng thái', created: 'Ngày tạo', user: 'Người dùng', template: 'Mẫu', costShort: 'Chi phí', failures: 'Lỗi', priorityLabel: 'Ưu tiên gọi', statusSuccess: 'Thành công', statusFailed: 'Thất bại', failureReason: 'Lý do thất bại', statusProcessing: 'Đang xử lý', statusQueued: 'Đang chờ', noTemplates: 'Chưa có mẫu', noTemplatesHint: 'Tạo một mẫu cố định để người dùng bắt đầu sử dụng.', noKeys: 'Chưa có API Key', noKeysHint: 'Thêm Key nhà cung cấp để tác vụ có thể gọi model.', noTasks: 'Chưa có tác vụ', noUsers: 'Chưa có người dùng', balance: 'Số dư', languageLabel: 'Ngôn ngữ', createdAt: 'Ngày tham gia', hint: 'Xem và quản lý dữ liệu chi tiết của khu vực này.', presetDefault: 'Chọn một preset prompt',
} };

function App() { const [lang, setLang] = useState<Lang>('zh'); const [loggedIn, setLoggedIn] = useState(Boolean(api.getAdminToken())); if (!loggedIn) return <Login lang={lang} onLogin={() => setLoggedIn(true)} onLanguage={() => setLang(lang === 'zh' ? 'vi' : 'zh')} />; return <Workspace lang={lang} onLogout={() => { api.clearAdminToken(); setLoggedIn(false); }} onLanguage={() => setLang(lang === 'zh' ? 'vi' : 'zh')} />; }
function Login({ lang, onLogin, onLanguage }: { lang: Lang; onLogin: () => void; onLanguage: () => void }) { const t = copy[lang]; const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await api.login(username, password); onLogin(); } catch { setError(lang === 'zh' ? '登录失败，请检查账号和密码。' : 'Đăng nhập thất bại.'); } finally { setBusy(false); } }; return <main className="admin-login"><div className="login-aside"><span className="login-mark">A</span><p>AlphaMe<br /><b>运营控制台</b></p><div className="login-aside-note">模板化生成 · 统一效果<br />Template-driven AI creation</div></div><form className="login-card" onSubmit={(event) => void submit(event)}><div className="admin-brand"><img src={BRAND_ASSET_URL} /><div><strong>AlphaMe</strong><span>OPERATIONS</span></div></div><div className="login-kicker">SECURE WORKSPACE</div><h1>{t.login}</h1><p>管理模板、生成任务、用户和基础设施。</p><label>{t.username}<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label><label>{t.password}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" /></label>{error && <div className="login-error">{error}</div>}<button className="primary-button" disabled={busy}>{busy ? t.loading : t.signIn}</button><button type="button" className="login-language" onClick={onLanguage}>◐ {t.language}</button></form></main>; }

function Workspace({ lang, onLogout, onLanguage }: { lang: Lang; onLogout: () => void; onLanguage: () => void }) { const t = copy[lang]; const [page, setPage] = useState<Page>('dashboard'); const menu: Array<[Page, string, string, string]> = [['dashboard', '◈', t.dashboard, '运营'], ['homeImages', '▧', '首页轮播图', '内容'], ['templates', '✧', t.templates, '内容'], ['generations', '◫', t.generations, '内容'], ['users', '◎', t.users, '用户'], ['coinRisk', '₡', t.coinRisk, '运营'], ['coinRewards', '✦', lang === 'zh' ? 'Coin 奖励配置' : 'Cấu hình thưởng Coin', '运营'], ['apiKeys', '⌘', t.apiKeys, '系统'], ['storage', '▣', t.storage, '系统'], ['account', '♙', t.account, '系统']]; return <div className="admin-shell"><aside><div className="admin-brand"><img src={BRAND_ASSET_URL} /><div><strong>AlphaMe</strong><span>OPERATIONS</span></div></div><div className="menu-label">WORKSPACE</div><nav>{menu.map(([id, icon, label, group]) => <button className={page === id ? 'selected' : ''} onClick={() => setPage(id)} key={id}><i>{icon}</i><span>{label}</span><em>{group}</em></button>)}</nav><div className="aside-foot"><div className="server-status"><span /> {t.connected}<small>API · Database · Queue</small></div><div className="profile"><div className="profile-avatar">A</div><div><b>{t.operator}</b><small>admin@alphame</small></div></div><button className="logout-button" onClick={onLogout}>{t.logout}</button></div></aside><main><header className="admin-topbar"><div className="breadcrumbs"><span>AlphaMe</span><b>/</b><strong>{menu.find((item) => item[0] === page)?.[2]}</strong></div><div className="header-actions"><span className="topbar-status"><i /> {t.connected}</span><button className="language" onClick={onLanguage}>◐ {t.language}</button></div></header>{page === 'dashboard' && <Dashboard t={t} onNavigate={setPage} />}{page === 'homeImages' && <HomeHeroSettings />}{page === 'templates' && <Templates t={t} />}{page === 'generations' && <Generations t={t} />}{page === 'users' && <Users t={t} />}{page === 'coinRisk' && <CoinRisk t={t} />}{page === 'coinRewards' && <CoinRewards lang={lang} />}{page === 'apiKeys' && <ApiKeys t={t} />}{page === 'storage' && <StorageSettings t={t} />}{page === 'account' && <AccountSecurity t={t} />}</main></div>; }

function CoinRewards({ lang }: { lang: Lang }) {
  const zh = lang === 'zh';
  const [form, setForm] = useState<AdminCoinRewardConfig>({ newUserAmount: 10, inviteeBonusAmount: 10, inviterAmount: 10 });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { void api.getCoinRewardConfig().then(setForm).catch((err) => setError(err instanceof Error ? err.message : '加载失败')); }, []);
  const save = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setMessage(''); setError(''); try { setForm(await api.updateCoinRewardConfig(form)); setMessage(zh ? '奖励配置已保存' : 'Đã lưu cấu hình thưởng'); } catch (err) { setError(err instanceof Error ? err.message : '保存失败'); } finally { setBusy(false); } };
  const fields: Array<[keyof AdminCoinRewardConfig, string, string]> = zh ? [['newUserAmount', '新用户基础奖励', '所有首次注册的新用户获得'], ['inviteeBonusAmount', '受邀注册额外奖励', '通过好友邀请链接注册时额外获得'], ['inviterAmount', '邀请人奖励', '新用户通过邀请链接注册后，邀请人获得']] : [['newUserAmount', 'Thưởng cơ bản cho người mới', 'Áp dụng cho mọi tài khoản đăng ký lần đầu'], ['inviteeBonusAmount', 'Thưởng thêm cho người được mời', 'Cộng thêm khi đăng ký qua liên kết mời'], ['inviterAmount', 'Thưởng cho người mời', 'Người mời nhận khi tài khoản mới đăng ký qua liên kết']];
  return <div className="content"><PageHeader kicker="COIN GROWTH" title={zh ? 'Coin 奖励配置' : 'Cấu hình thưởng Coin'} hint={zh ? '配置新用户注册奖励和邀请注册双方的奖励数量。设置只影响之后创建的账号。' : 'Thiết lập phần thưởng đăng ký mới và mời bạn bè. Cấu hình chỉ áp dụng cho tài khoản tạo sau này.'} /><section className="config-panel"><form onSubmit={(event) => void save(event)}><div className="form-grid">{fields.map(([key, label, help]) => <label key={key}>{label}<input type="number" min={0} max={1000000} step={1} required value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} /><small>{help}</small></label>)}</div>{message && <p className="success-message">{message}</p>}{error && <div className="admin-error">{error}</div>}<div className="form-actions"><button className="primary-button" disabled={busy}>{busy ? (zh ? '保存中…' : 'Đang lưu…') : (zh ? '保存配置' : 'Lưu cấu hình')}</button></div></form></section></div>;
}

function HomeHeroSettings() {
  const [images, setImages] = useState({ leftUrl: '', centerUrl: '', rightUrl: '' });
  const [library, setLibrary] = useState<AdminWebpImage[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<keyof typeof images | null>(null);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { void api.getHomeHeroImages().then((value) => setImages({ leftUrl: value.leftUrl ?? '', centerUrl: value.centerUrl ?? '', rightUrl: value.rightUrl ?? '' })).catch((err) => setError(err.message)); }, []);
  const openLibrary = async (field: keyof typeof images) => { setSelectedSlot(field); setLibraryBusy(true); setError(''); try { setLibrary(await api.getWebpImageLibrary()); } catch (err) { setError(err instanceof Error ? err.message : '图片库读取失败'); setSelectedSlot(null); } finally { setLibraryBusy(false); } };
  const upload = async (field: keyof typeof images, file?: File) => { if (!file) return; setBusy(true); setError(''); setMessage(''); try { const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('图片读取失败')); reader.readAsDataURL(file); }); const asset = await api.uploadTemplateCover(dataUrl); setImages((current) => ({ ...current, [field]: asset.publicUrl })); setLibrary((current) => [{ id: asset.id, publicUrl: asset.publicUrl, byteSize: asset.byteSize, createdAt: new Date().toISOString() }, ...current.filter((item) => item.id !== asset.id)]); } catch (err) { setError(err instanceof Error ? err.message : '上传失败'); } finally { setBusy(false); } };
  const save = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); setMessage(''); try { const value = await api.updateHomeHeroImages(images); setImages({ leftUrl: value.leftUrl ?? '', centerUrl: value.centerUrl ?? '', rightUrl: value.rightUrl ?? '' }); setMessage('首页图片配置已保存。'); } catch (err) { setError(err instanceof Error ? err.message : '保存失败'); } finally { setBusy(false); } };
  const fields: Array<[keyof typeof images, string]> = [['leftUrl', '轮播图片 1'], ['centerUrl', '轮播图片 2'], ['rightUrl', '轮播图片 3']];
  return <div className="content"><PageHeader kicker="HOME CAROUSEL" title="首页轮播图" hint="选择已上传的 WebP 图片；需要时也可上传新图，系统会自动转换为 WebP。留空时使用默认风格封面。" /><form onSubmit={(event) => void save(event)}><section className="config-panel"><div className="home-image-grid">{fields.map(([key, label]) => <div className="home-image-field" key={key}><strong>{label}</strong>{images[key] ? <img className="home-image-preview" src={images[key]} alt={label} /> : <div className="home-image-empty">未选择图片</div>}<div className="home-image-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => void openLibrary(key)}>选择已上传 WebP</button><label className="upload-image-button">上传新图片<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void upload(key, event.target.files?.[0]); event.currentTarget.value = ''; }} /></label></div></div>)}</div>{error && <div className="admin-error">{error}</div>}{message && <div className="admin-success">{message}</div>}<div className="form-actions"><button className="primary-button" disabled={busy}>{busy ? '保存中…' : '保存轮播图'}</button></div></section></form>{selectedSlot && <div className="image-library-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSlot(null); }}><section className="image-library-dialog" role="dialog" aria-modal="true" aria-label="选择 WebP 图片"><div className="panel-title"><div><span className="eyebrow">WEBP IMAGE LIBRARY</span><h2>选择图片</h2><p>仅显示已上传且格式为 WebP 的图片</p></div><button type="button" className="icon-button" onClick={() => setSelectedSlot(null)}>×</button></div>{libraryBusy ? <div className="empty-state">正在读取图片库…</div> : library.length ? <div className="image-library-grid">{library.map((item) => <button type="button" className={`image-library-item${images[selectedSlot] === item.publicUrl ? ' selected' : ''}`} key={item.id} onClick={() => { const field = selectedSlot; if (!field) return; setImages((current) => ({ ...current, [field]: item.publicUrl })); setSelectedSlot(null); }}><img src={item.publicUrl} alt="WebP 图片" /><span>{(item.byteSize / 1024).toFixed(0)} KB · {new Date(item.createdAt).toLocaleDateString()}</span></button>)}</div> : <div className="empty-state"><span>▧</span><b>还没有可选的 WebP 图片</b><small>先上传一张图片，系统会自动转换为 WebP。</small></div>}</section></div>}</div>;
}
function PageHeader({ kicker, title, hint, action }: { kicker: string; title: string; hint: string; action?: React.ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{hint}</p></div>{action}</div>; }
function Dashboard({ t, onNavigate }: { t: typeof copy.zh; onNavigate: (page: Page) => void }) { const [stats, setStats] = useState<AdminStats | null>(null); const [generations, setGenerations] = useState<AdminGeneration[]>([]); const [templates, setTemplates] = useState<AdminTemplate[]>([]); const [keys, setKeys] = useState<AdminApiKey[]>([]); useEffect(() => { void Promise.all([api.getStats(), api.getGenerations(), api.getTemplates(), api.getApiKeys()]).then(([s, g, tm, k]) => { setStats(s); setGenerations(g); setTemplates(tm); setKeys(k); }); }, []); const metrics = [[t.usersToday, stats?.users ?? '—', 'people', 'cyan'], [t.requests, stats?.generations ?? '—', 'requests', 'blue'], [t.success, stats?.succeeded ?? '—', 'completed', 'green'], [t.spent, stats?.coinCharged ?? '—', 'coins', 'orange']]; return <div className="content"><PageHeader kicker="ALPHAME OPERATIONS" title={t.title} hint={t.subtitle} action={<button className="secondary-button" onClick={() => onNavigate('templates')}>＋ {t.newTemplate}</button>} /><section className="metric-grid">{metrics.map(([label, value, note, tone]) => <article className={`metric ${tone}`} key={String(label)}><div className="metric-top"><span>{label}</span><i>↗</i></div><strong>{value}</strong><small>{note} · {t.live}</small><div className="metric-line"><span style={{ width: tone === 'green' ? '78%' : tone === 'orange' ? '48%' : '64%' }} /></div></article>)}</section><section className="dashboard-grid"><div className="panel activity-panel"><div className="panel-title"><div><span className="eyebrow">ACTIVITY STREAM</span><h2>{t.recent}</h2></div><button className="text-button" onClick={() => onNavigate('generations')}>{t.viewAll} →</button></div><div className="table-head"><span>{t.user}</span><span>{t.template}</span><span>{t.costShort}</span><span>{t.status}</span></div>{generations.slice(0, 5).map((item) => <div className="table-row" key={item.id}><div className="user-cell"><i>{(item.user.displayName || 'Z').slice(0, 1).toUpperCase()}</i><span><b>{item.user.displayName || 'Zalo User'}</b><small>{item.user.zaloOpenId ? `${item.user.zaloOpenId.slice(0, 16)}…` : 'AlphaMe account'}</small></span></div><span>{item.template.nameZh || item.template.nameVi}</span><span>{item.coinCost} Coin</span><span className={`status ${item.status.toLowerCase()}`}>{statusLabel(item.status, t)}</span></div>)}{!generations.length && <EmptyState title={t.noTasks} hint={t.noTasks} />}</div><div className="side-stack"><div className="panel insight-panel"><div className="panel-title"><div><span className="eyebrow">WORKSPACE HEALTH</span><h2>{t.live}</h2></div><span className="health-dot">●</span></div><div className="health-list"><HealthRow label={t.enabledCount} value={`${templates.filter((x) => x.enabled).length} / ${templates.length}`} /><HealthRow label={t.keyCount} value={`${keys.filter((x) => x.status === 'ACTIVE').length} / ${keys.length}`} /><HealthRow label={t.taskCount} value={String(stats?.processing ?? 0)} /></div></div><div className="panel quick-panel"><span className="eyebrow">QUICK ACTIONS</span><button onClick={() => onNavigate('templates')}><span>✧</span>{t.newTemplate}<b>→</b></button><button onClick={() => onNavigate('apiKeys')}><span>⌘</span>{t.newKey}<b>→</b></button></div></div></section></div>; }
function HealthRow({ label, value }: { label: string; value: string }) { return <div className="health-row"><span>{label}</span><b>{value}</b></div>; }
function statusLabel(status: string, t: typeof copy.zh) { return status === 'SUCCEEDED' ? t.statusSuccess : status === 'FAILED' ? t.statusFailed : status === 'PROCESSING' ? t.statusProcessing : t.statusQueued; }
function formatBytes(value: number) { return value < 1024 * 1024 ? `${(value / 1024).toFixed(0)} KB` : `${(value / 1024 / 1024).toFixed(2)} MB`; }
function EmptyState({ title, hint }: { title: string; hint: string }) { return <div className="empty-state"><span>○</span><b>{title}</b><small>{hint}</small></div>; }

function AccountSecurity({ t }: { t: typeof copy.zh }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setSaved(false);
    if (newPassword !== confirmPassword) { setError(langMessage('两次输入的新密码不一致。', 'Mật khẩu mới nhập lại không khớp.')); return; }
    setBusy(true);
    try {
      await api.changeAdminPassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : langMessage('密码修改失败，请重试。', 'Không thể đổi mật khẩu.')); }
    finally { setBusy(false); }
  };
  const langMessage = (zh: string, vi: string) => t === copy.zh ? zh : vi;
  return <div className="content"><PageHeader kicker="ACCOUNT SECURITY" title={t.account} hint={langMessage('定期更新管理员密码，确保后台账号安全。修改前需要验证当前密码。', 'Cập nhật mật khẩu quản trị thường xuyên. Cần xác minh mật khẩu hiện tại trước khi đổi.')} /><section className="config-panel account-security-panel"><div className="config-heading"><div><span className="eyebrow">ADMINISTRATOR</span><h2>{langMessage('修改登录密码', 'Đổi mật khẩu đăng nhập')}</h2><p>{langMessage('新密码长度需为 8–128 位。', 'Mật khẩu mới cần có từ 8 đến 128 ký tự.')}</p></div></div><form onSubmit={(event) => void submit(event)}><div className="form-grid"><label>{langMessage('当前密码', 'Mật khẩu hiện tại')}<input type="password" autoComplete="current-password" minLength={8} maxLength={128} required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label>{langMessage('新密码', 'Mật khẩu mới')}<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label>{langMessage('确认新密码', 'Nhập lại mật khẩu mới')}<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label></div>{error && <div className="admin-error">{error}</div>}{saved && <div className="admin-success">{langMessage('密码已更新。', 'Đã cập nhật mật khẩu.')}</div>}<div className="form-actions"><button className="primary-button" disabled={busy}>{busy ? langMessage('保存中…', 'Đang lưu…') : langMessage('更新密码', 'Cập nhật mật khẩu')}</button></div></form></section></div>;
}

function Templates({ t }: { t: typeof copy.zh }) {
  const emptyForm = { slug: '', nameVi: '', nameZh: '', categoryVi: 'Chân dung', categoryZh: '人像风格', prompt: '', coverUrl: '', coinCost: 10, isCouple: false };
  const [items, setItems] = useState<AdminTemplate[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState('');
  const [dropTargetId, setDropTargetId] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [coverScan, setCoverScan] = useState<Awaited<ReturnType<typeof api.scanTemplateCovers>> | null>(null);
  const [coverOperationBusy, setCoverOperationBusy] = useState(false);
  const [coverOperationMessage, setCoverOperationMessage] = useState('');
  const load = () => api.getTemplates().then(setItems).catch((err) => setError(err.message));
  useEffect(() => { void load(); }, []);
  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (item: AdminTemplate) => {
    setEditingId(item.id);
    setForm({ slug: item.slug, nameVi: item.nameVi, nameZh: item.nameZh, categoryVi: item.categoryVi, categoryZh: item.categoryZh, prompt: item.prompt, coverUrl: item.coverUrl ?? '', coinCost: item.coinCost, isCouple: item.isCouple });
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
  const saveOrder = async (next: AdminTemplate[]) => {
    if (reordering) return;
    const previous = items;
    setReordering(true);
    setError('');
    setItems(next);
    try { await api.reorderTemplates(next.map((item) => item.id)); }
    catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : '排序保存失败');
    }
    finally { setReordering(false); setDraggedId(''); setDropTargetId(''); }
  };
  const moveTemplate = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length || reordering) return;
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    await saveOrder(next);
  };
  const dropTemplate = (event: React.DragEvent, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggedId;
    const from = items.findIndex((item) => item.id === sourceId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0 || from === to || reordering) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(from < to ? to - 1 : to, 0, moved);
    void saveOrder(next);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api.updateTemplate(editingId, { nameVi: form.nameVi, nameZh: form.nameZh, categoryVi: form.categoryVi, categoryZh: form.categoryZh, prompt: form.prompt, coverUrl: form.coverUrl, coinCost: form.coinCost, isCouple: form.isCouple });
      } else {
        await api.createTemplate(form);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };
  const scanCovers = async () => {
    setCoverOperationBusy(true); setCoverOperationMessage(''); setError('');
    try { setCoverScan(await api.scanTemplateCovers()); }
    catch (err) { setError(err instanceof Error ? err.message : '扫描失败'); }
    finally { setCoverOperationBusy(false); }
  };
  const optimizeCovers = async () => {
    const ids = coverScan?.templates.filter((item) => item.status === 'ready').map((item) => item.id) ?? [];
    if (!ids.length || !window.confirm(`将优化 ${ids.length} 张模板图，成功后切换引用并保留原图备份。继续吗？`)) return;
    setCoverOperationBusy(true); setError('');
    try {
      const result = await api.optimizeTemplateCovers(ids);
      const succeeded = result.results.filter((item) => item.ok).length;
      const failed = result.results.length - succeeded;
      const failures = result.results.filter((item) => !item.ok).map((item) => `${coverScan?.templates.find((cover) => cover.id === item.id)?.nameZh ?? item.id}：${item.error ?? '未转换'}`);
      setCoverOperationMessage(`转换完成：成功 ${succeeded} 张，未转换 ${failed} 张。${failures.length ? `未转换原因：${failures.join('；')}。` : ''}成功项的原图已保留，可在对应模板行恢复。`);
      await load(); setCoverScan(await api.scanTemplateCovers());
    } catch (err) { setError(err instanceof Error ? err.message : '转换失败'); }
    finally { setCoverOperationBusy(false); }
  };
  const rollbackCover = async (item: AdminTemplate) => {
    if (!window.confirm(`将「${item.nameZh}」恢复为原图，继续吗？`)) return;
    setCoverOperationBusy(true); setError('');
    try { await api.rollbackTemplateCover(item.id); setCoverOperationMessage(`「${item.nameZh}」已恢复原图。`); await load(); if (coverScan) setCoverScan(await api.scanTemplateCovers()); }
    catch (err) { setError(err instanceof Error ? err.message : '恢复失败'); }
    finally { setCoverOperationBusy(false); }
  };
  const filtered = items.filter((item) => filter === 'all' || (filter === 'enabled' ? item.enabled : !item.enabled));
  return <div className="content">
    <PageHeader kicker="CONTENT WORKSPACE" title={t.templates} hint={t.promptHelp} action={<div className="template-header-actions"><button className="secondary-button" disabled={coverOperationBusy} onClick={() => void scanCovers()}>{coverOperationBusy ? '处理中…' : '检查并压缩旧图片'}</button><button className="primary-button" onClick={openCreate}>＋ {t.newTemplate}</button></div>} />
    {coverScan && <section className="config-panel cover-migration-panel"><div className="config-heading"><div><span className="eyebrow">TEMPLATE COVER OPTIMIZATION</span><h2>现有模板图片</h2><p>目标最长边 1200px，WebP 质量 80。只替换成功且确实变小的图片，原图保留用于恢复。</p></div><button className="icon-button" onClick={() => setCoverScan(null)}>×</button></div><div className="cover-scan-summary"><span>可优化 <b>{coverScan.templates.filter((item) => item.status === 'ready').length}</b> 张</span><span>已识别资源预计 {formatBytes(coverScan.totalBeforeBytes)} → {formatBytes(coverScan.estimatedAfterBytes)}</span><button className="primary-button" disabled={coverOperationBusy || !coverScan.templates.some((item) => item.status === 'ready')} onClick={() => void optimizeCovers()}>{coverOperationBusy ? '处理中…' : '一键转换可优化图片'}</button></div><div className="cover-scan-list">{coverScan.templates.map((item) => <div key={item.id}><strong>{item.nameZh}</strong><span>{item.status === 'ready' ? '可优化' : item.status === 'optimized' ? '已优化（原图可恢复）' : item.status === 'already-small' ? '已足够小' : item.status === 'missing' ? '未设置图片' : item.status === 'unsupported' ? '非系统图片资源，跳过' : '读取失败'}</span><small>{item.beforeBytes == null ? '—' : `${formatBytes(item.beforeBytes)}${item.afterBytes != null && item.status === 'ready' ? ` → ${formatBytes(item.afterBytes)}` : ''}`}{item.error ? ` · ${item.error}` : ''}</small></div>)}</div></section>}
    {coverOperationMessage && <div className="admin-success">{coverOperationMessage}</div>}
    {showForm && <section className="config-panel">
      <div className="config-heading"><div><span className="eyebrow">{editingId ? 'EDIT TEMPLATE' : 'NEW TEMPLATE'}</span><h2>{editingId ? t.editTemplate : t.create}</h2><p>{t.promptHelp}</p></div><button className="icon-button" onClick={closeForm}>×</button></div>
      <form onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <label>{t.slug}<input value={form.slug} readOnly={Boolean(editingId)} onChange={(event) => setForm({ ...form, slug: event.target.value })} required placeholder="portrait-studio" /></label>
          <label>{t.nameVi}<input value={form.nameVi} onChange={(event) => setForm({ ...form, nameVi: event.target.value })} required /></label>
          <label>{t.nameZh}<input value={form.nameZh} onChange={(event) => setForm({ ...form, nameZh: event.target.value })} required /></label>
          <label>{t.categoryVi}<input value={form.categoryVi} onChange={(event) => setForm({ ...form, categoryVi: event.target.value })} required placeholder="Chân dung" /></label>
          <label>{t.categoryZh}<input value={form.categoryZh} onChange={(event) => setForm({ ...form, categoryZh: event.target.value })} required placeholder="人像风格" /></label>
          <label>风格显示图<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); }} />{coverBusy && <small>正在上传图片…</small>}{form.coverUrl && <img className="cover-preview" src={form.coverUrl} alt="风格显示图预览" />}</label>
          <label>{t.cost}<input type="number" min="0" value={form.coinCost} onChange={(event) => setForm({ ...form, coinCost: Number(event.target.value) })} required /></label>
          <label className="template-couple-toggle"><input type="checkbox" checked={form.isCouple} onChange={(event) => setForm({ ...form, isCouple: event.target.checked, coinCost: event.target.checked ? 20 : form.coinCost })} /> 双人模式（用户上传两张照片，固定扣费 20 Coin）</label>
        </div>
        <label className="prompt-field">{t.prompt}<textarea value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} required placeholder="Describe the exact style and constraints that should be used for this template…" /></label>
        <div className="prompt-preview"><div><span className="eyebrow">{t.fixedPrompt}</span><b>{form.prompt ? '已填写，保存后绑定到此模板' : t.presetDefault}</b></div><p>{form.prompt || t.promptHelp}</p></div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={closeForm}>{t.cancel}</button><button className="primary-button" disabled={!form.prompt.trim() || coverBusy}>{t.save}</button></div>
      </form>
    </section>}
    {error && <div className="admin-error">{error}</div>}
    <div className="list-toolbar"><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t.all} <b>{items.length}</b></button><button className={filter === 'enabled' ? 'active' : ''} onClick={() => setFilter('enabled')}>{t.enabled} <b>{items.filter((x) => x.enabled).length}</b></button><button className={filter === 'disabled' ? 'active' : ''} onClick={() => setFilter('disabled')}>{t.disabled} <b>{items.filter((x) => !x.enabled).length}</b></button></div><span className="list-count">{filter === 'all' ? '拖动左侧手柄调整顺序 · ' : ''}{filtered.length} {t.records}</span></div>
    <section className="panel data-list">{filtered.length ? filtered.map((item) => { const index = items.findIndex((entry) => entry.id === item.id); return <div className={`template-row${draggedId === item.id ? ' dragging' : ''}${dropTargetId === item.id ? ' drop-target' : ''}`} key={item.id} onDragOver={(event) => { if (draggedId) event.preventDefault(); }} onDragEnter={() => { if (draggedId && draggedId !== item.id) setDropTargetId(item.id); }} onDrop={(event) => dropTemplate(event, item.id)}><button type="button" className="drag-handle" draggable={!reordering && filter === 'all'} aria-label={`拖动调整${item.nameZh}排序，也可用上下方向键调整`} title="拖动排序" onDragStart={(event) => { setDraggedId(item.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); }} onDragEnd={() => { setDraggedId(''); setDropTargetId(''); }} onKeyDown={(event) => { if (event.key === 'ArrowUp') { event.preventDefault(); void moveTemplate(index, -1); } else if (event.key === 'ArrowDown') { event.preventDefault(); void moveTemplate(index, 1); } }}>⠿</button><div className="template-cover">{item.coverUrl ? <img src={item.coverUrl} /> : <span>✧</span>}</div><div className="template-main"><div><strong>{item.nameZh}</strong><span className="slug-chip">{item.slug}</span></div><small>{item.nameVi} · 分类：{item.categoryZh} / {item.categoryVi}</small><p><span>模板提示词</span> · {item.prompt.slice(0, 72)}{item.prompt.length > 72 ? '…' : ''}</p></div><div className="template-meta"><b>{item.coinCost} <small>Coin</small></b><span>排序 {index + 1} · {item.enabled ? t.active : t.paused}</span></div><div className="template-actions"><button className="edit-button" onClick={() => openEdit(item)}>{t.edit}</button>{item.coverOriginalUrl && <button className="edit-button" disabled={coverOperationBusy} onClick={() => void rollbackCover(item)}>恢复原图</button>}<button className={`status-button ${item.enabled ? 'enabled' : 'disabled'}`} onClick={() => api.toggleTemplate(item.id, !item.enabled).then(load)}>{item.enabled ? t.pause : t.resume}</button></div></div>; }) : <EmptyState title={t.noTemplates} hint={t.noTemplatesHint} />}</section>
  </div>;
}
function Generations({ t }: { t: typeof copy.zh }) { const [items, setItems] = useState<AdminGeneration[]>([]); const [query, setQuery] = useState(''); useEffect(() => { void api.getGenerations().then(setItems); }, []); const filtered = useMemo(() => items.filter((item) => `${item.id} ${item.user.displayName ?? ''} ${item.template.nameZh} ${item.errorCode ?? ''} ${item.errorMessage ?? ''}`.toLowerCase().includes(query.toLowerCase())), [items, query]); return <div className="content"><PageHeader kicker="AI PIPELINE" title={t.generations} hint={t.hint} /><div className="search-row"><div className="search-box">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`${t.search} ${t.generations}`} /></div><span>{filtered.length} {t.records}</span></div><section className="panel data-list wide-list"><div className="table-head"><span>{t.user}</span><span>{t.template}</span><span>{t.created}</span><span>{t.costShort}</span><span>{t.status}</span></div>{filtered.map((item) => <div className="table-row" key={item.id}><div className="user-cell"><i>{(item.user.displayName || 'Z').slice(0, 1).toUpperCase()}</i><span><b>{item.user.displayName || 'Zalo User'}</b><small>{item.id.slice(0, 18)}…</small></span></div><span>{item.template.nameZh}<small>{item.template.nameVi}</small></span><span>{new Date(item.createdAt).toLocaleString()}</span><span>{item.coinCost} Coin</span><span className={`status ${item.status.toLowerCase()}`}>{statusLabel(item.status, t)}{item.status === 'FAILED' && <small className="failure-reason" title={item.errorMessage || item.errorCode || ''}>{t.failureReason}: {item.errorMessage || item.errorCode || '—'}{item.errorCode ? ` · ${item.errorCode}` : ''}</small>}</span></div>)}{!filtered.length && <EmptyState title={t.noTasks} hint={t.noTasks} />}</section></div>; }
function Users({ t }: { t: typeof copy.zh }) {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '', language: 'vi' as 'vi' | 'zh', initialCoin: 10 });
  const load = () => api.getUsers().then(setItems).catch((err) => setError(err instanceof Error ? err.message : '用户加载失败'));
  useEffect(() => { void load(); }, []);
  const filtered = items.filter((item) => `${item.displayName ?? ''} ${item.username ?? ''} ${item.zaloOpenId ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const toggleAdmin = async (item: AdminUser) => { setBusyId(item.id); setError(''); try { const updated = await api.setUserAdminStatus(item.id, !item.isAdmin); setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry)); } catch (err) { setError(err instanceof Error ? err.message : '管理员权限更新失败'); } finally { setBusyId(''); } };
  const resetPasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetTarget) return;
    if (resetPassword !== confirmResetPassword) { setError('两次输入的新密码不一致。'); return; }
    setResettingPassword(true); setError(''); setResetMessage('');
    try {
      await api.resetUserPassword(resetTarget.id, resetPassword);
      setResetTarget(null); setResetPassword(''); setConfirmResetPassword('');
      setResetMessage(`用户 ${resetTarget.username} 的密码已重置。`);
    } catch (err) { setError(err instanceof Error ? err.message : '密码重置失败'); }
    finally { setResettingPassword(false); }
  };
  const deleteUserSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deleteTarget || deleteConfirmation !== (deleteTarget.username || deleteTarget.zaloOpenId || deleteTarget.id)) return;
    setBusyId(deleteTarget.id); setError('');
    try {
      await api.deleteUser(deleteTarget.id);
      setItems((current) => current.filter((entry) => entry.id !== deleteTarget.id));
      setResetMessage(`用户 ${deleteTarget.displayName || deleteTarget.username || deleteTarget.zaloOpenId || deleteTarget.id} 及其数据已删除。`);
      setDeleteTarget(null); setDeleteConfirmation('');
    } catch (err) { setError(err instanceof Error ? err.message : '删除用户失败'); }
    finally { setBusyId(''); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setCreating(true); setError('');
    try {
      const created = await api.createUser({ ...form, username: form.username.trim().toLowerCase(), ...(form.displayName.trim() ? { displayName: form.displayName.trim() } : {}) });
      setItems((current) => [created, ...current]); setQuery(''); setShowCreate(false); setForm({ username: '', password: '', displayName: '', language: 'vi', initialCoin: 10 });
    } catch (err) { setError(err instanceof Error ? err.message : '新增用户失败'); }
    finally { setCreating(false); }
  };
  return <div className="content">
    <PageHeader kicker="USER DIRECTORY" title={t.users} hint={t.hint} action={<button className="primary-button" onClick={() => { setShowCreate((value) => !value); setError(''); }}>＋ 新增用户</button>} />
    {showCreate && <section className="config-panel user-create-panel"><div className="config-heading"><div><span className="eyebrow">NEW ACCOUNT</span><h2>新增 AlphaMe 用户</h2><p>创建后，用户可使用用户名和密码登录小程序。初始 Coin 会记入账单。</p></div></div><form onSubmit={(event) => void submit(event)}><div className="form-grid"><label>用户名<input required minLength={3} maxLength={24} pattern="[A-Za-z0-9._-]+" autoComplete="off" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="3–24 位字母、数字或 . _ -" /></label><label>初始密码<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="至少 8 位" /></label><label>显示昵称<input maxLength={80} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="默认使用用户名" /></label><label>初始 Coin<input type="number" min={0} max={1000000} required value={form.initialCoin} onChange={(event) => setForm({ ...form, initialCoin: Number(event.target.value) })} /></label><label>语言<select value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value as 'vi' | 'zh' })}><option value="vi">越南语</option><option value="zh">中文</option></select></label></div>{error && <div className="admin-error">{error}</div>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>取消</button><button className="primary-button" disabled={creating}>{creating ? '创建中…' : '创建用户'}</button></div></form></section>}
    {resetMessage && <div className="admin-success">{resetMessage}</div>}
    {resetTarget && <section className="config-panel reset-password-panel"><div className="config-heading"><div><span className="eyebrow">FORCE PASSWORD RESET</span><h2>重置小程序用户密码</h2><p>账号：<b>{resetTarget.username}</b>。不需要用户提供原密码，保存后新密码立即生效。</p></div><button className="icon-button" onClick={() => { setResetTarget(null); setResetPassword(''); setConfirmResetPassword(''); }}>×</button></div><form onSubmit={(event) => void resetPasswordSubmit(event)}><div className="form-grid"><label>新密码<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="8–128 位" /></label><label>确认新密码<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmResetPassword} onChange={(event) => setConfirmResetPassword(event.target.value)} placeholder="再次输入新密码" /></label></div>{error && <div className="admin-error">{error}</div>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setResetTarget(null); setResetPassword(''); setConfirmResetPassword(''); }}>取消</button><button className="primary-button" disabled={resettingPassword}>{resettingPassword ? '正在重置…' : '确认重置密码'}</button></div></form></section>}
    {deleteTarget && <section className="config-panel delete-user-panel"><div className="config-heading"><div><span className="eyebrow">PERMANENTLY DELETE USER</span><h2>删除用户及全部数据</h2><p>将永久删除该用户的 Coin 账户与账单、生成记录、作品、点赞、奖励、风险记录和个人资源，无法恢复。请输入 <b>{deleteTarget.username || deleteTarget.zaloOpenId || deleteTarget.id}</b> 以确认。</p></div><button className="icon-button" onClick={() => { setDeleteTarget(null); setDeleteConfirmation(''); }}>×</button></div><form onSubmit={(event) => void deleteUserSubmit(event)}><label>确认用户标识<input required autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label>{error && <div className="admin-error">{error}</div>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setDeleteTarget(null); setDeleteConfirmation(''); }}>取消</button><button className="delete-user-button" disabled={busyId === deleteTarget.id || deleteConfirmation !== (deleteTarget.username || deleteTarget.zaloOpenId || deleteTarget.id)}>{busyId === deleteTarget.id ? '正在删除…' : '确认永久删除'}</button></div></form></section>}
    <div className="search-row"><div className="search-box">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`${t.search} ${t.users}`} /></div><span>{filtered.length} {t.records}</span></div>
    {!showCreate && error && <div className="admin-error">{error}</div>}
    <section className="panel data-list user-list"><div className="table-head"><span>{t.user}</span><span>{t.languageLabel}</span><span>{t.balance}</span><span>{t.createdAt}</span><span>操作</span></div>{filtered.map((item) => <div className="table-row" key={item.id}><div className="user-cell"><i>{(item.displayName || item.username || 'Z').slice(0, 1).toUpperCase()}</i><span><b>{item.displayName || item.username || 'Zalo User'}</b><small>{item.zaloOpenId || (item.username ? `账号 ${item.username}` : item.id)}</small></span></div><span className="lang-chip">{item.language.toUpperCase()}</span><span><b>{item.coinAccount?.available ?? 0}</b> Coin</span><span>{new Date(item.createdAt).toLocaleDateString()}</span><div className="user-actions"><button className={`status-button ${item.isAdmin ? 'enabled' : ''}`} disabled={busyId === item.id} onClick={() => void toggleAdmin(item)}>{busyId === item.id ? '保存中…' : item.isAdmin ? '取消管理员' : '设为管理员'}</button>{item.username ? <button className="reset-user-password" onClick={() => { setResetTarget(item); setResetPassword(''); setConfirmResetPassword(''); setError(''); setResetMessage(''); }}>重置密码</button> : <span className="muted-note" title="该账号未设置用户名，当前仅支持 Zalo 授权登录">无密码账号</span>}<button className="reset-user-password" onClick={() => { setDeleteTarget(item); setDeleteConfirmation(''); setError(''); setResetMessage(''); }}>删除用户</button></div></div>)}{!filtered.length && <EmptyState title={t.noUsers} hint={t.noUsers} />}</section>
  </div>;
}
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
  const sourceLabel = (sourceType: string) => ({ NEW_USER: '新用户注册', INVITEE_BONUS: '受邀注册奖励', DAILY_CHECK_IN: '每日签到', SHARE_OPEN: '好友分享', PLAZA_LIKE: '作品获赞', ADMIN_ADJUSTMENT: '后台调整', REWARD_REVERSAL: '奖励撤销' }[sourceType] ?? sourceType);
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
  const [form, setForm] = useState({ provider: 'qiniu', enabled: true, qiniuAccessKey: '', qiniuSecretKey: '', qiniuBucket: 'picalphavn', qiniuRegion: 'as0', qiniuDomain: 'https://oss.alphavn.tech', qiniuPrivate: true, qiniuUrlTtlSeconds: 2592000 });
  const [saved, setSaved] = useState('');
  const [testResult, setTestResult] = useState('');
  useEffect(() => { void api.getStorage().then((value) => { setStorage(value); setForm((current) => ({ ...current, ...value, qiniuAccessKey: '', qiniuSecretKey: '' })); }); }, []);
  const save = async (event: React.FormEvent) => { event.preventDefault(); const value = await api.updateStorage(form); setStorage(value); setSaved('已保存'); setTestResult(''); setForm((current) => ({ ...current, qiniuAccessKey: '', qiniuSecretKey: '' })); };
  const test = async () => { setTestResult('测试中…'); try { const result = await api.testStorage(form); setTestResult(result.message); } catch (error) { setTestResult(error instanceof Error ? error.message : '测试失败'); } };
  return <div className="content">
    <PageHeader kicker="INFRASTRUCTURE / OBJECT STORAGE" title={t.storage} hint="专门管理七牛云图片存储。API Key 凭据与图片存储凭据分开维护，降低误操作风险。" />
    <section className="config-panel">
      <div className="config-heading"><div><span className="eyebrow">QINIU OBJECT STORAGE</span><h2>七牛云图片存储</h2><p>选择七牛云作为存储服务后，上传失败会返回明确错误，不会保存到服务器本地。</p></div><span className={`status ${storage?.provider === 'qiniu' && storage.enabled ? 'succeeded' : 'paused'}`}>{storage?.provider === 'qiniu' && storage.enabled ? '七牛云已启用' : '当前未使用七牛云'}</span></div>
      <form onSubmit={(event) => void save(event)}><div className="form-grid">
        <label>存储服务<select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}><option value="qiniu">七牛云</option><option value="local">服务器本地</option></select></label>
        <label>启用七牛云<select value={form.enabled ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, enabled: event.target.value === 'yes' })}><option value="yes">启用</option><option value="no">停用</option></select></label>
        <label>AccessKey<input value={form.qiniuAccessKey} placeholder={storage?.qiniuAccessKey ? '已配置，留空保持不变' : ''} onChange={(event) => setForm({ ...form, qiniuAccessKey: event.target.value })} /></label>
        <label>SecretKey<input type="password" value={form.qiniuSecretKey} placeholder={storage?.qiniuSecretKey ? '已配置，留空保持不变' : ''} onChange={(event) => setForm({ ...form, qiniuSecretKey: event.target.value })} /></label>
        <label>Bucket<input value={form.qiniuBucket} onChange={(event) => setForm({ ...form, qiniuBucket: event.target.value })} required={form.provider === 'qiniu'} /></label>
        <label>区域<select value={form.qiniuRegion} onChange={(event) => setForm({ ...form, qiniuRegion: event.target.value })} required={form.provider === 'qiniu'}><option value="z0">z0 · 华东-浙江</option><option value="cn-east-2">cn-east-2 · 华东-浙江2</option><option value="z1">z1 · 华北-河北</option><option value="z2">z2 · 华南-广东</option><option value="as0">as0 · 亚太-新加坡</option><option value="na0">na0 · 北美-洛杉矶</option></select></label>
        <label>访问域名<input value={form.qiniuDomain} onChange={(event) => setForm({ ...form, qiniuDomain: event.target.value })} required={form.provider === 'qiniu'} /></label>
      </div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => void test()}>测试连通性</button><button className="primary-button">保存对象存储配置</button>{saved && <small>{saved}</small>}{testResult && <small>{testResult}</small>}</div></form>
    </section>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

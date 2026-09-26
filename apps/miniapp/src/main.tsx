import { StrictMode, useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { getRouteParams, getShareableLink, openShareSheet, saveImageToGallery } from 'zmp-sdk';
import './styles.css';
import { checkIn, clearAccessToken, createGeneration, createShare, getCheckInStatus, getCoinBalance, getCoinLedger, getGenerations, getMe, getPlazaWorks, getStoredAccessToken, getTemplates, isRealAuthEnabled, likePlazaWork, loginWithCredentials, loginWithZalo, openShare, publishPlazaWork, resolveTemplateCoverUrl, unlikePlazaWork, uploadImage, type CoinLedgerEntry, type Generation, type PlazaWork, type Session, type Template } from './api';

type Lang = 'vi' | 'zh';
const copy = {
  vi: { greeting: 'Xin chào, Isaac', title: 'Biến khoảnh khắc\nthành phiên bản AI', subtitle: 'Chọn phong cách. Tải ảnh lên. Để AlphaMe tạo nên điều đặc biệt.', coin: 'Coin', featured: 'Phong cách nổi bật', all: 'Tất cả phong cách', friends: 'Quảng trường', challenge: 'Thử thách hôm nay', works: 'Tác phẩm của tôi', navHome: 'Trang chủ', navFriends: 'Quảng trường', navWorks: 'Tác phẩm', navMe: 'Cá nhân', create: 'Tạo ảnh', explore: 'Khám phá' },
  zh: { greeting: '你好，Isaac', title: '把每个瞬间\n变成 AI 版本', subtitle: '选择风格，上传照片，让 AlphaMe 创造特别的你。', coin: '金币', featured: '精选风格', all: '全部风格', friends: '广场', challenge: '今日挑战', works: '我的作品', navHome: '首页', navFriends: '广场', navWorks: '作品', navMe: '我的', create: '生成图片', explore: '探索' }
};
const defaultStyles: Array<{ id: string; name: string; zh: string; meta: string; tone: string; icon: string; coverUrl?: string }> = [
  { id: 'ao-dai', name: 'Áo Dài', zh: '越南奥黛', meta: 'Editorial · 10 Coin', tone: 'cyan', icon: '✦' },
  { id: 'dream-portrait', name: 'Dream Portrait', zh: '梦幻肖像', meta: 'Studio light · 10 Coin', tone: 'violet', icon: '◌' },
  { id: 'movie-poster', name: 'Movie Poster', zh: '电影海报', meta: 'Cinematic · 10 Coin', tone: 'pink', icon: '◆' }
];

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'preview';
function App() {
  const [lang, setLang] = useState<Lang>('vi');
  const [active, setActive] = useState('home');
  const [styles, setStyles] = useState<typeof defaultStyles>(defaultStyles);
  const [selectedStyleId, setSelectedStyleId] = useState('');
  const [authState, setAuthState] = useState<AuthState>('preview');
  const [session, setSession] = useState<Session['user']>();
  const [authError, setAuthError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [pendingShareToken] = useState(() => getRouteParams().shareToken || '');
  const t = copy[lang];
  useEffect(() => {
    void getTemplates().then((templates) => {
      if (templates.length > 0) { setStyles(templates.map((template: Template, index) => ({ id: template.id, name: template.nameVi, zh: template.nameZh, meta: `AI · ${template.coinCost} Coin`, tone: ['cyan', 'violet', 'pink'][index % 3], icon: ['✦', '◌', '◆'][index % 3], coverUrl: resolveTemplateCoverUrl(template.coverUrl, template.updatedAt) }))); setSelectedStyleId(templates[0].id); }
    }).catch(() => undefined);
    if (isRealAuthEnabled()) void restoreStoredSession();
  }, []);
  useEffect(() => {
    if (authState !== 'authenticated' || !pendingShareToken) return;
    void openShare(pendingShareToken).catch(() => undefined);
  }, [authState, pendingShareToken]);
  const restoreStoredSession = async () => {
    if (!getStoredAccessToken()) return;
    try {
      setSession(await getMe()); setAuthState('authenticated');
    } catch {
      clearAccessToken(); setSession(undefined); setAuthState('preview');
    }
  };
  const beginLogin = async () => {
    setShowLogin(true); setAuthState('loading'); setAuthError('');
    try {
      const next = await loginWithZalo();
      setSession(next.user); setAuthState('authenticated'); setShowLogin(false);
    } catch (error) {
      setSession(undefined); setAuthState('unauthenticated');
      setAuthError(error instanceof Error && error.message === 'ZALO_ACCESS_TOKEN_EMPTY'
        ? (lang === 'zh' ? 'Zalo 没有返回登录凭证，请重试或检查小程序登录权限。' : 'Zalo không trả về thông tin đăng nhập, vui lòng thử lại.')
        : (lang === 'zh' ? '登录失败，请重试。' : 'Đăng nhập thất bại, vui lòng thử lại.'));
    }
  };
  const beginAccountAuth = async (username: string, password: string, register: boolean) => {
    setAuthError('');
    try {
      const next = await loginWithCredentials(username, password, register);
      setSession(next.user); setAuthState('authenticated'); setShowLogin(false);
    } catch (error) {
      const status = error instanceof Error ? error.message : '';
      setAuthError(status === 'API_409'
        ? (lang === 'zh' ? '用户名已被注册，请直接登录。' : 'Tên đăng nhập đã được sử dụng, vui lòng đăng nhập.')
        : status === 'API_401'
          ? (lang === 'zh' ? '用户名或密码不正确。' : 'Tên đăng nhập hoặc mật khẩu không chính xác.')
          : status === 'API_400'
            ? (lang === 'zh' ? '用户名需为 3–24 位字母、数字、下划线或连字符，密码至少 8 位。' : 'Tên đăng nhập gồm 3–24 chữ cái, số, _ hoặc -; mật khẩu cần ít nhất 8 ký tự.')
            : (lang === 'zh' ? '暂时无法登录，请稍后重试。' : 'Đăng nhập tạm thời không khả dụng, vui lòng thử lại.'));
    }
  };
  const openLogin = () => {
    if (authState === 'authenticated') return;
    setShowLogin(true); setAuthState('unauthenticated'); setAuthError('');
  };
  const refreshSession = async () => {
    if (authState !== 'authenticated') return;
    try { setSession(await getMe()); } catch { /* Keep the current session if a background refresh fails. */ }
  };
  const logout = () => {
    clearAccessToken(); setSession(undefined); setAuthState('preview'); setShowLogin(false);
  };
  if (showLogin && authState === 'loading') return <main className="phone-shell"><section className="app-canvas auth-screen"><div className="auth-card"><div className="brand-lockup"><img src="/alphame-logo.png" /><span>AlphaMe</span></div><div className="auth-spinner" /><p>{lang === 'zh' ? '正在登录…' : 'Đang đăng nhập…'}</p></div></section></main>;
  if (showLogin && authState === 'unauthenticated') return <main className="phone-shell"><section className="app-canvas auth-screen"><AuthView lang={lang} error={authError} onZaloLogin={() => void beginLogin()} onCredentials={(username, password, register) => beginAccountAuth(username, password, register)} /></section></main>;
  return <main className="phone-shell">
    <section className="app-canvas">
      <header className="topbar"><div className="brand-lockup"><img src="/alphame-logo.png" /><span>AlphaMe</span></div><div className="top-actions"><button className="lang-switch" onClick={() => setLang(lang === 'vi' ? 'zh' : 'vi')}>{lang === 'vi' ? '中' : 'VI'}</button><button className="coin-pill" onClick={() => authState === 'authenticated' ? setActive('coins') : openLogin()}><span>✦</span> {session?.coinAccount?.available ?? 0} Coin</button><div className="avatar" aria-label={t.navMe}><span className="profile-icon" /></div></div></header>
      {active === 'home' ? <>
        <section className="hero"><div className="hero-copy"><div className="eyebrow">ALPHAME STUDIO <span>✦</span></div><h1>{t.title.split('\n').map((line, i) => <span key={line}>{line}{i === 0 && <br />}</span>)}</h1><p>{t.subtitle}</p><button className="primary-cta" onClick={() => setActive('styles')}>{t.create}<span>→</span></button></div><div className="hero-card"><img src="/hero-portrait.png" alt="" /><span className="hero-caption">AlphaMe<br /><em>portrait studio</em></span></div></section>
        <section className="section-block"><div className="section-heading"><div><h2>{t.featured}</h2></div><button className="text-button" onClick={() => setActive('styles')}>{t.all} <span>→</span></button></div><div className="style-grid">{styles.slice(0, 3).map(style => <article className={`style-card ${style.tone}`} key={style.id} onClick={() => { setSelectedStyleId(style.id); setActive('create'); }}><div className="style-art">{style.coverUrl ? <img className="style-cover" src={style.coverUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span>{style.icon}</span>}<div className="art-glow" /></div><div className="style-info"><h3>{lang === 'vi' ? style.name : style.zh}</h3><p>{style.meta}</p></div></article>)}</div></section>
        <button className="social-strip" onClick={() => setActive('friends')}><div className="social-mark">✦</div><div><span className="kicker">02 / SOCIAL AI</span><h2>{t.friends}</h2><p>{lang === 'vi' ? 'Chia sẻ AI của bạn với cộng đồng.' : '把你的 AI 作品分享给广场里的大家。'}</p></div><span className="strip-arrow">→</span></button>
        <section className="challenge-row"><div><span className="kicker">03 / DAILY</span><h2>{t.challenge}</h2></div><div className="challenge-badge">NEW<br /><strong>24H</strong></div></section>
      </> : active === 'styles' ? <StylePicker lang={lang} styles={styles} onBack={() => setActive('home')} onSelect={(styleId) => { setSelectedStyleId(styleId); setActive('create'); }} /> : active === 'create' ? <CreateView lang={lang} templateId={selectedStyleId} authenticated={authState === 'authenticated'} onRequireLogin={openLogin} onGenerationCreated={() => void refreshSession()} onBack={() => setActive('styles')} /> : active === 'works' ? <WorksView lang={lang} authenticated={authState === 'authenticated'} /> : active === 'me' ? <PersonalView lang={lang} user={session} onLogin={openLogin} onLogout={logout} onWorks={() => setActive('works')} onCoins={() => setActive('coins')} /> : active === 'coins' ? <CoinView lang={lang} authenticated={authState === 'authenticated'} onBack={() => setActive('me')} onRequireLogin={openLogin} onBalanceChanged={() => void refreshSession()} onWorks={() => setActive('works')} onPlaza={() => setActive('friends')} /> : <PlazaView lang={lang} authenticated={authState === 'authenticated'} onRequireLogin={openLogin} />}
      <nav className="bottom-nav">{[["home", t.navHome, '⌂'], ['friends', t.navFriends, '◉'], ['works', t.navWorks, '▧'], ['me', t.navMe, '◎']].map(([id, label, icon]) => <button className={active === id ? 'active' : ''} onClick={() => setActive(id)} key={id}><span>{icon}</span>{label}</button>)}</nav>
    </section>
  </main>;
}

function PersonalView({ lang, user, onLogin, onLogout, onWorks, onCoins }: { lang: Lang; user?: Session['user']; onLogin: () => void; onLogout: () => void; onWorks: () => void; onCoins: () => void }) {
  const zh = lang === 'zh';
  const username = user?.username;
  const displayName = user?.displayName || username || (zh ? 'Zalo 用户' : 'Người dùng Zalo');
  const accountLabel = username ? (zh ? 'AlphaMe 账号' : 'Tài khoản AlphaMe') : (zh ? 'Zalo 授权账号' : 'Tài khoản Zalo');
  const initial = displayName.slice(0, 1).toUpperCase();
  return <section className="create-view personal-view">
    <div className="create-heading"><span className="kicker">ALPHAME ACCOUNT</span><h1>{zh ? '我的' : 'Cá nhân'}</h1><p>{zh ? '管理你的账户、Coin 和创作记录。' : 'Quản lý tài khoản, Coin và các tác phẩm của bạn.'}</p></div>
    <div className={`account-profile ${user ? 'signed-in' : 'signed-out'}`}>
      <div className="account-avatar">{user ? initial : <span className="profile-icon" />}</div>
      <div className="account-identity"><strong>{user ? displayName : (zh ? '暂未登录' : 'Chưa đăng nhập')}</strong><span>{user ? accountLabel : (zh ? '登录后保存 Coin 和作品' : 'Đăng nhập để lưu Coin và tác phẩm')}</span></div>
      <span className={`account-state ${user ? 'online' : ''}`}>{user ? (zh ? '已登录' : 'Đã đăng nhập') : (zh ? '访客' : 'Khách')}</span>
    </div>
    {user && <button className="account-summary account-summary-button" onClick={onCoins}><div><span>{zh ? '可用 Coin' : 'Coin khả dụng'}</span><strong><i>✦</i>{user.coinAccount?.available ?? 0}</strong></div><div><span>{zh ? '获取更多' : 'Nhận thêm'}</span><strong className="account-method">{zh ? '签到 / 分享 / 获赞 →' : 'Điểm danh / Chia sẻ / Lượt thích →'}</strong></div></button>}
    <button className="account-link-row" onClick={onWorks}><span><b>{zh ? '我的作品' : 'Tác phẩm của tôi'}</b><small>{zh ? '查看生成记录和结果' : 'Xem lịch sử tạo ảnh và kết quả'}</small></span><span className="account-chevron">→</span></button>
    {user ? <button className="account-logout" onClick={onLogout}>{zh ? '退出登录' : 'Đăng xuất'}</button> : <button className="primary-cta account-login" onClick={onLogin}>{zh ? '登录 / 注册' : 'Đăng nhập / Đăng ký'}<span>→</span></button>}
  </section>;
}

function AuthView({ lang, error, onZaloLogin, onCredentials }: { lang: Lang; error: string; onZaloLogin: () => void; onCredentials: (username: string, password: string, register: boolean) => Promise<void> }) {
  const zh = lang === 'zh';
  const [register, setRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault(); setFormError('');
    if (username.trim().length < 3 || password.length < 8) {
      setFormError(zh ? '用户名至少 3 位，密码至少 8 位。' : 'Tên đăng nhập cần ít nhất 3 ký tự, mật khẩu ít nhất 8 ký tự.');
      return;
    }
    setSubmitting(true);
    void onCredentials(username.trim(), password, register).finally(() => setSubmitting(false));
  };
  return <div className="auth-card"><div className="brand-lockup"><img src="/alphame-logo.png" /><span>AlphaMe</span></div><div className="auth-copy"><span className="kicker">ALPHAME STUDIO</span><h1>{zh ? '登录后开始创作' : 'Đăng nhập để bắt đầu'}</h1><p>{zh ? '使用 Zalo 或 AlphaMe 账号登录，保存你的作品和 Coin。' : 'Đăng nhập bằng Zalo hoặc tài khoản AlphaMe để lưu tác phẩm và Coin.'}</p></div><button className="primary-cta full" onClick={onZaloLogin} disabled={submitting}>{zh ? '使用 Zalo 授权登录' : 'Đăng nhập bằng Zalo'} <span>→</span></button><div className="auth-divider"><span>{zh ? '或使用账号' : 'HOẶC DÙNG TÀI KHOẢN'}</span></div><form className="auth-form" onSubmit={submit}><label>{zh ? '用户名' : 'Tên đăng nhập'}<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={24} required /></label><label>{zh ? '密码' : 'Mật khẩu'}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required /></label>{(formError || error) && <p className="auth-error">{formError || error}</p>}<button className="account-submit" type="submit" disabled={submitting}>{submitting ? (zh ? '请稍候…' : 'Đang xử lý…') : register ? (zh ? '注册并登录' : 'Đăng ký và đăng nhập') : (zh ? '用户名密码登录' : 'Đăng nhập')}</button></form><button className="auth-mode-toggle" disabled={submitting} onClick={() => { setRegister(!register); setFormError(''); }}>{register ? (zh ? '已有账号？返回登录' : 'Đã có tài khoản? Đăng nhập') : (zh ? '还没有账号？立即注册' : 'Chưa có tài khoản? Đăng ký ngay')}</button></div>;
}

function WorksView({ lang, authenticated }: { lang: Lang; authenticated: boolean }) {
  const zh = lang === 'zh';
  const [items, setItems] = useState<Generation[]>([]);
  const [savingId, setSavingId] = useState('');
  const [savedId, setSavedId] = useState('');
  const [saveErrorId, setSaveErrorId] = useState('');
  const [publishedIds, setPublishedIds] = useState<string[]>([]);
  const [sharingId, setSharingId] = useState('');
  const [shareErrorId, setShareErrorId] = useState('');
  useEffect(() => {
    if (!authenticated || !isRealAuthEnabled()) return;
    void Promise.all([getGenerations(), getPlazaWorks()]).then(([generations, plaza]) => {
      setItems(generations);
      setPublishedIds(plaza.map((work) => work.generation.id));
    }).catch(() => undefined);
  }, [authenticated]);
  const saveToGallery = async (item: Generation) => {
    if (!item.resultAssetUrl) return;
    setSavingId(item.id); setSavedId(''); setSaveErrorId('');
    try {
      if (isRealAuthEnabled()) {
        await saveImageToGallery({ imageUrl: item.resultAssetUrl });
      } else {
        const link = document.createElement('a');
        link.href = item.resultAssetUrl;
        link.download = `alphame-${item.id}.jpg`;
        link.click();
      }
      setSavedId(item.id);
    } catch {
      setSaveErrorId(item.id);
    } finally {
      setSavingId('');
    }
  };
  const publish = async (item: Generation) => { try { await publishPlazaWork(item.id); setPublishedIds((ids) => ids.includes(item.id) ? ids : [...ids, item.id]); } catch { /* keep the action retryable */ } };
  const share = async (item: Generation) => {
    if (!item.resultAssetUrl) return;
    setSharingId(item.id); setShareErrorId('');
    try {
      const { shareToken } = await createShare(item.id);
      const link = await getShareableLink({ title: lang === 'zh' ? '看看我的 AlphaMe 作品' : 'Xem tác phẩm AlphaMe của tôi', description: lang === 'zh' ? '打开作品，帮助作者获得 Coin。' : 'Mở tác phẩm để giúp tác giả nhận Coin.', thumbnail: item.resultAssetUrl, path: `?shareToken=${encodeURIComponent(shareToken)}` });
      await openShareSheet({ type: 'link', data: { link, chatOnly: true } });
    } catch { setShareErrorId(item.id); }
    finally { setSharingId(''); }
  };
  return <section className="create-view works-view"><div className="create-heading"><span className="kicker">MY WORKS</span><h1>{zh ? '我的作品' : 'Tác phẩm của tôi'}</h1>{authenticated && <p>{zh ? '把喜欢的作品发布到广场，和更多人分享。' : 'Đăng tác phẩm bạn thích lên quảng trường để chia sẻ cùng mọi người.'}</p>}</div><div className="works-grid">{items.map((item) => <article className="work-card" key={item.id}>{item.resultAssetUrl ? <div className="work-image-frame"><img className="work-image" src={item.resultAssetUrl} alt="" /></div> : <div className="style-art work-placeholder"><span>{item.status === 'PROCESSING' || item.status === 'QUEUED' ? '…' : '!'}</span><div className="art-glow" /></div>}<div className="style-info"><div><h3>{item.status}</h3><p>{new Date(item.createdAt).toLocaleString()}</p></div>{item.resultAssetUrl && <><button className="download-button" type="button" onClick={() => void saveToGallery(item)} disabled={savingId === item.id}>{savingId === item.id ? (zh ? '保存中…' : 'Đang lưu…') : savedId === item.id ? (zh ? '已保存' : 'Đã lưu') : saveErrorId === item.id ? (zh ? '重试下载' : 'Thử lại') : (zh ? '下载到相册' : 'Lưu vào thư viện')}</button><button className={`publish-button ${publishedIds.includes(item.id) ? 'published' : ''}`} type="button" onClick={() => void publish(item)} disabled={publishedIds.includes(item.id)}>{publishedIds.includes(item.id) ? (zh ? '已发布到广场' : 'Đã đăng lên quảng trường') : (zh ? '发布到广场' : 'Đăng lên quảng trường')}</button><button className="share-button" type="button" onClick={() => void share(item)} disabled={sharingId === item.id}>{sharingId === item.id ? (zh ? '打开分享…' : 'Đang mở chia sẻ…') : shareErrorId === item.id ? (zh ? '重试分享' : 'Thử lại chia sẻ') : (zh ? '分享给 Zalo 好友' : 'Chia sẻ cho bạn Zalo')}</button></>}</div></article>)}</div>{items.length === 0 && <p className="auth-error">{authenticated ? (zh ? '暂无作品。' : 'Chưa có tác phẩm.') : (zh ? '请登录后查看作品' : 'Vui lòng đăng nhập để xem tác phẩm.')}</p>}</section>;
}

function PlazaView({ lang, authenticated, onRequireLogin }: { lang: Lang; authenticated: boolean; onRequireLogin: () => void }) {
  const zh = lang === 'zh';
  const [items, setItems] = useState<PlazaWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState('');
  useEffect(() => { setLoading(true); void getPlazaWorks().then(setItems).catch(() => setError(true)).finally(() => setLoading(false)); }, [authenticated]);
  const toggleLike = async (item: PlazaWork) => {
    if (!authenticated) { onRequireLogin(); return; }
    setBusyId(item.id);
    try {
      const result = item.liked ? await unlikePlazaWork(item.id) : await likePlazaWork(item.id);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, liked: result.liked, likes: result.likes } : entry));
    } catch { /* leave server state visible and allow retry */ }
    finally { setBusyId(''); }
  };
  return <section className="create-view plaza-view"><div className="plaza-heading"><div><span className="kicker">SOCIAL AI / 02</span><h1>{zh ? '广场' : 'Quảng trường'}</h1><p>{zh ? '发现大家生成的 AI，也把你的灵感分享出来。' : 'Khám phá AI của cộng đồng và chia sẻ cảm hứng của bạn.'}</p></div><span className="plaza-count">{items.length}<small>{zh ? '件作品' : 'tác phẩm'}</small></span></div>{loading ? <p className="plaza-state">{zh ? '正在加载作品…' : 'Đang tải tác phẩm…'}</p> : error ? <p className="plaza-state">{zh ? '暂时无法加载广场，请重试。' : 'Không thể tải quảng trường, hãy thử lại.'}</p> : items.length === 0 ? <p className="plaza-state">{zh ? '还没有公开作品，成为第一个分享的人吧。' : 'Chưa có tác phẩm công khai. Hãy là người đầu tiên chia sẻ.'}</p> : <div className="plaza-feed">{items.filter((item) => item.generation.resultAssetUrl).map((item) => { const author = item.user.displayName || (zh ? 'AlphaMe 用户' : 'Người dùng AlphaMe'); return <article className="plaza-card" key={item.id}><div className="plaza-image-wrap"><img src={item.generation.resultAssetUrl!} alt={author} /><span className="plaza-chip">{item.liked ? (zh ? '已点赞' : 'Đã thích') : 'AI'}</span></div><div className="plaza-meta"><div className="plaza-author"><span className="author-avatar">{author.slice(0, 1).toUpperCase()}</span><span><strong>{author}</strong><small>{new Date(item.publishedAt).toLocaleDateString()}</small></span></div><button className={`like-button ${item.liked ? 'liked' : ''}`} disabled={busyId === item.id} onClick={() => void toggleLike(item)}>♡ <span>{item.likes}</span></button></div></article>; })}</div>}<p className="plaza-footnote">{zh ? '你的下一幅作品，也可以出现在这里。' : 'Tác phẩm tiếp theo của bạn cũng có thể xuất hiện ở đây.'}</p></section>;
}

function CoinView({ lang, authenticated, onBack, onRequireLogin, onBalanceChanged, onWorks, onPlaza }: { lang: Lang; authenticated: boolean; onBack: () => void; onRequireLogin: () => void; onBalanceChanged: () => void; onWorks: () => void; onPlaza: () => void }) {
  const zh = lang === 'zh';
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState<{ checkedIn: boolean; rewardAmount: number }>();
  const [ledger, setLedger] = useState<CoinLedgerEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = () => { if (!authenticated) return; void Promise.all([getCoinBalance(), getCheckInStatus(), getCoinLedger()]).then(([nextBalance, nextStatus, nextLedger]) => { setBalance(nextBalance.available); setStatus(nextStatus); setLedger(nextLedger); }).catch(() => undefined); };
  useEffect(() => { load(); }, [authenticated]);
  const doCheckIn = async () => {
    if (!authenticated) { onRequireLogin(); return; }
    setBusy(true); setMessage('');
    try { const result = await checkIn(); setMessage(result.alreadyCheckedIn ? (zh ? '今天已经签到过了。' : 'Hôm nay bạn đã điểm danh rồi.') : (zh ? `签到成功，获得 ${result.rewardAmount} Coin。` : `Điểm danh thành công, nhận ${result.rewardAmount} Coin.`)); load(); onBalanceChanged(); } catch { setMessage(zh ? '签到暂时不可用，请稍后重试。' : 'Không thể điểm danh lúc này, hãy thử lại sau.'); }
    finally { setBusy(false); }
  };
  const label = (entry: CoinLedgerEntry) => {
    if (entry.rewardType === 'DAILY_CHECK_IN') return zh ? '每日签到奖励' : 'Thưởng điểm danh';
    if (entry.rewardType === 'SHARE_OPEN') return zh ? '好友打开分享奖励' : 'Thưởng bạn mở chia sẻ';
    if (entry.rewardType === 'PLAZA_LIKE') return zh ? '作品获赞奖励' : 'Thưởng lượt thích';
    if (entry.rewardType === 'ADMIN_REVERSAL') return zh ? '奖励撤销' : 'Thu hồi phần thưởng';
    return entry.type === 'GENERATION_CHARGE' ? (zh ? '生成图片' : 'Tạo ảnh') : entry.type === 'REFUND' ? (zh ? '生成退款' : 'Hoàn Coin') : entry.note || (zh ? 'Coin 变动' : 'Biến động Coin');
  };
  const statusLabel = (entry: CoinLedgerEntry) => entry.rewardStatus === 'REVOKED' ? (zh ? '已撤销' : 'Đã thu hồi') : entry.rewardType ? (zh ? '奖励已发放' : 'Đã phát thưởng') : '';
  return <section className="create-view coin-view"><button className="back-button" onClick={onBack}>← {zh ? '返回我的' : 'Về cá nhân'}</button><div className="coin-hero"><span className="kicker">ALPHAME COIN</span><h1>{zh ? '获取 Coin' : 'Nhận Coin'}</h1><p>{zh ? '完成真实互动，持续获得创作额度。' : 'Hoàn thành tương tác thật để tiếp tục sáng tạo.'}</p><strong><i>✦</i>{balance}</strong><small>{zh ? '当前可用' : 'Đang khả dụng'}</small></div><div className="reward-list"><article className="reward-card"><div><span className="reward-icon">◷</span><strong>{zh ? '每日签到' : 'Điểm danh mỗi ngày'}</strong><p>{zh ? `每天首次签到 +${status?.rewardAmount ?? 10} Coin` : `Lần đầu mỗi ngày +${status?.rewardAmount ?? 10} Coin`}</p></div><button onClick={() => void doCheckIn()} disabled={busy || status?.checkedIn}>{status?.checkedIn ? (zh ? '已签到' : 'Đã nhận') : busy ? '…' : (zh ? '签到' : 'Nhận')}</button></article><button className="reward-card reward-card-link" onClick={onWorks}><div><span className="reward-icon">↗</span><strong>{zh ? '分享作品' : 'Chia sẻ tác phẩm'}</strong><p>{zh ? '分享给 Zalo 好友，好友打开后 +10 Coin' : 'Chia sẻ cho bạn Zalo, nhận +10 Coin khi họ mở'}</p></div><span className="reward-hint">{zh ? '去作品' : 'Tác phẩm'} →</span></button><button className="reward-card reward-card-link" onClick={onPlaza}><div><span className="reward-icon">♡</span><strong>{zh ? '作品获赞' : 'Nhận lượt thích'}</strong><p>{zh ? '作品每获得一个有效赞 +10 Coin' : 'Mỗi lượt thích hợp lệ cho tác phẩm +10 Coin'}</p></div><span className="reward-hint">{zh ? '去广场' : 'Quảng trường'} →</span></button></div>{message && <p className="coin-message">{message}</p>}<div className="ledger-heading"><div><span className="kicker">COIN LEDGER</span><h2>{zh ? 'Coin 明细' : 'Lịch sử Coin'}</h2></div><button className="text-button" onClick={load}>{zh ? '刷新' : 'Làm mới'} ↻</button></div><div className="ledger-list">{ledger.map((entry) => <div className="ledger-row" key={entry.id}><span className={entry.amount >= 0 ? 'ledger-plus' : 'ledger-minus'}>{entry.amount >= 0 ? '+' : ''}{entry.amount}</span><span><strong>{label(entry)}</strong><small>{new Date(entry.createdAt).toLocaleString()} {statusLabel(entry)}</small></span><em>{entry.availableAfter} Coin</em></div>)}{ledger.length === 0 && <p className="plaza-state">{zh ? '暂无 Coin 明细。' : 'Chưa có lịch sử Coin.'}</p>}</div></section>;
}

function StylePicker({ lang, styles, onBack, onSelect }: { lang: Lang; styles: typeof defaultStyles; onBack: () => void; onSelect: (styleId: string) => void }) {
  const zh = lang === 'zh';
  return <section className="create-view style-picker"><button className="back-button" onClick={onBack}>← {zh ? '返回首页' : 'Về trang chủ'}</button><div className="create-heading"><h1>{zh ? '先选一个风格' : 'Chọn một phong cách'}</h1><p>{zh ? '选择你想要的 AI 版本，下一步再上传照片。' : 'Chọn phiên bản AI bạn muốn, sau đó tải ảnh lên.'}</p></div><div className="picker-grid">{styles.map(style => <button className={`picker-card ${style.tone}`} key={style.id} onClick={() => onSelect(style.id)}><div className="style-art">{style.coverUrl ? <img className="style-cover" src={style.coverUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span>{style.icon}</span>}<div className="art-glow" /></div><div className="picker-info"><h3>{zh ? style.zh : style.name}</h3><p>{style.meta}</p></div></button>)}</div></section>;
}

function CreateView({ lang, templateId, authenticated, onRequireLogin, onGenerationCreated, onBack }: { lang: Lang; templateId: string; authenticated: boolean; onRequireLogin: () => void; onGenerationCreated: () => void; onBack: () => void }) {
  const zh = lang === 'zh';
  const [dataUrl, setDataUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDataUrl(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };
  const generate = async () => {
    if (!authenticated) { onRequireLogin(); return; }
    if (!dataUrl) { setError(zh ? '请先选择照片。' : 'Vui lòng chọn ảnh trước.'); return; }
    setBusy(true); setError('');
    try {
      const asset = await uploadImage(dataUrl);
      await createGeneration(templateId, asset.publicUrl);
      onGenerationCreated();
      setError(zh ? '任务已提交，请稍后在作品中查看。' : 'Đã gửi tác vụ, hãy xem kết quả trong Tác phẩm.');
    } catch { setError(zh ? '生成暂时不可用，请稍后重试。' : 'Tạo ảnh tạm thời chưa khả dụng, hãy thử lại sau.'); }
    finally { setBusy(false); }
  };
  return <section className="create-view"><button className="back-button" onClick={onBack}>← {zh ? '返回风格' : 'Quay lại phong cách'}</button><div className="create-heading"><span className="kicker">SELECTED STYLE</span><h1>{zh ? '上传一张清晰的脸部照片' : 'Tải lên một ảnh rõ khuôn mặt'}</h1><p>{zh ? '光线自然、正面清晰的照片会带来更好的结果。' : 'Ảnh rõ mặt, ánh sáng tự nhiên sẽ cho kết quả tốt hơn.'}</p></div><label className="upload-zone" onClick={(event) => { if (!authenticated) { event.preventDefault(); onRequireLogin(); } }}><div className="upload-icon">{dataUrl ? '✓' : '＋'}</div><strong>{dataUrl ? (zh ? '照片已选择' : 'Đã chọn ảnh') : (zh ? '选择照片' : 'Chọn ảnh')}</strong><span>JPG · PNG · WEBP · max 15MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} /></label><div className="cost-row"><span>{zh ? '生成成本' : 'Chi phí tạo ảnh'}</span><strong>✦ 10 Coin</strong></div>{error && <p className="auth-error">{error}</p>}<button className="primary-cta full" disabled={busy} onClick={() => void generate()}>{busy ? (zh ? '提交中…' : 'Đang gửi…') : (zh ? '开始生成' : 'Bắt đầu tạo')} <span>↗</span></button></section>;
}

createRoot(document.getElementById('app')!).render(<StrictMode><App /></StrictMode>);

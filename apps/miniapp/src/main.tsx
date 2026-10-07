import { StrictMode, useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { getAccessToken, getRouteParams, getShareableLink, openShareSheet, saveImageToGallery } from 'zmp-sdk';
import './styles.css';
import { checkIn, clearAccessToken, createGeneration, createShare, getCheckInStatus, getCoinBalance, getCoinLedger, getGenerations, getHomeHeroImages, getMe, getMyPlazaWorks, getPlazaWorks, getStoredAccessToken, getTemplateCategories, getTemplates, isRealAuthEnabled, likePlazaWork, linkZaloAccount, loginWithCredentials, loginWithZalo, openShare, publishPlazaWork, resolveTemplateCoverUrl, unlikePlazaWork, unpublishPlazaWork, updateProfile, uploadImage, type CoinLedgerEntry, type Generation, type HomeHeroImages, type PlazaWork, type Session, type Template, type TemplateCategory } from './api';

type Lang = 'vi' | 'zh';
const copy = {
  vi: { greeting: 'Xin chào, Isaac', title: 'Biến khoảnh khắc\nthành phiên bản AI', subtitle: 'Chọn phong cách. Tải ảnh lên. Để AlphaMe tạo nên điều đặc biệt.', coin: 'Coin', featured: 'Phong cách nổi bật', all: 'Tất cả phong cách', friends: 'Quảng trường', challenge: 'Thử thách hôm nay', works: 'Tác phẩm của tôi', navHome: 'Trang chủ', navCreate: 'Tạo ảnh', navWorks: 'Tác phẩm', navMe: 'Cá nhân', create: 'Tạo ảnh', explore: 'Khám phá' },
  zh: { greeting: '你好，Isaac', title: '把每个瞬间\n变成 AI 版本', subtitle: '选择风格，上传照片，让 AlphaMe 创造特别的你。', coin: '金币', featured: '精选风格', all: '全部风格', friends: '广场', challenge: '今日挑战', works: '我的作品', navHome: '首页', navCreate: '创作', navWorks: '作品', navMe: '我的', create: '生成图片', explore: '探索' }
};
const defaultStyles: Array<{ id: string; name: string; zh: string; categoryVi?: string; categoryZh?: string; meta: string; tone: string; icon: string; coverUrl?: string; isCouple?: boolean; coinCost?: number }> = [
  { id: 'ao-dai', name: 'Áo Dài', zh: '越南奥黛', meta: 'Editorial · 10 Coin', tone: 'cyan', icon: '✦' },
  { id: 'dream-portrait', name: 'Dream Portrait', zh: '梦幻肖像', meta: 'Studio light · 10 Coin', tone: 'violet', icon: '◌' },
  { id: 'movie-poster', name: 'Movie Poster', zh: '电影海报', meta: 'Cinematic · 10 Coin', tone: 'pink', icon: '◆' }
];

function NavIcon({ name }: { name: 'home' | 'create' | 'works' | 'me' }) {
  const common = { width: 23, height: 23, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  if (name === 'home') return <svg {...common}><path d="m3.5 10.5 8.5-7 8.5 7v9a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19.5z" /><path d="M9 21v-6h6v6" /></svg>;
  if (name === 'create') return <svg {...common}><path d="m12 2.8 2.15 6.15L20.3 11l-6.15 2.05L12 19.2l-2.15-6.15L3.7 11l6.15-2.05z" /><path d="m19 16 .95 2.55L22.5 19.5l-2.55.95L19 23l-.95-2.55-2.55-.95 2.55-.95z" /></svg>;
  if (name === 'works') return <svg {...common}><rect x="3.5" y="4" width="17" height="16" rx="2.2" /><circle cx="9" cy="9" r="1.5" /><path d="m5 17 4.5-4 3.2 2.7 2.2-1.8 4.1 3.1" /></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="3.4" /><path d="M4.8 20c.35-3.2 3.25-5.3 7.2-5.3s6.85 2.1 7.2 5.3" /></svg>;
}

function AccountLoginView({ lang, error, onBack, onSubmit }: { lang: Lang; error: string; onBack: () => void; onSubmit: (username: string, password: string, register: boolean) => Promise<void> }) {
  const zh = lang === 'zh';
  const [register, setRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault(); setFormError('');
    if (username.trim().length < 3 || password.length < 8) {
      setFormError(zh ? '用户名至少 3 位，密码至少 8 位。' : 'Tên đăng nhập cần ít nhất 3 ký tự, mật khẩu ít nhất 8 ký tự.');
      return;
    }
    setSubmitting(true);
    void onSubmit(username.trim(), password, register).finally(() => setSubmitting(false));
  };
  return <div className="auth-card account-login-card"><button className="auth-back" onClick={onBack}><span aria-hidden="true">←</span>{zh ? '返回' : 'Quay lại'}</button><div className="brand-lockup"><img src="/alphame-logo.png" /><span>AlphaMe</span></div><div className="auth-copy"><span className="kicker">ALPHAME STUDIO</span><h1>{register ? (zh ? '创建账号' : 'Tạo tài khoản') : (zh ? '账号密码登录' : 'Đăng nhập tài khoản')}</h1><p>{zh ? '使用 AlphaMe 账号继续。' : 'Tiếp tục với tài khoản AlphaMe.'}</p></div><form className="auth-form" onSubmit={submit}><label>{zh ? '用户名' : 'Tên đăng nhập'}<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={24} required /></label><label>{zh ? '密码' : 'Mật khẩu'}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required /></label>{formError && <p className="auth-error">{formError}</p>}<button className="account-submit" type="submit" disabled={submitting}>{submitting ? (zh ? '请稍候…' : 'Đang xử lý…') : register ? (zh ? '创建账号' : 'Tạo tài khoản') : (zh ? '登录' : 'Đăng nhập')}</button></form>{error && <p className="auth-error">{error}</p>}<button className="auth-mode-toggle" disabled={submitting} onClick={() => { setRegister(!register); setFormError(''); }}>{register ? (zh ? '已有账号？登录' : 'Đã có tài khoản? Đăng nhập') : (zh ? '还没有账号？立即注册' : 'Chưa có tài khoản? Đăng ký')}</button></div>;
}

type AuthState = 'loading' | 'authenticated' | 'preview';
function App() {
  const [lang, setLang] = useState<Lang>('vi');
  const [active, setActive] = useState('home');
  const [styles, setStyles] = useState<typeof defaultStyles>(isRealAuthEnabled() ? [] : defaultStyles);
  const [templateCategories, setTemplateCategories] = useState<TemplateCategory[]>([]);
  const [homeHeroImages, setHomeHeroImages] = useState<HomeHeroImages>({});
  const [homeSlide, setHomeSlide] = useState(0);
  const [selectedStyleId, setSelectedStyleId] = useState('');
  const [authState, setAuthState] = useState<AuthState>('preview');
  const [session, setSession] = useState<Session['user']>();
  const [authError, setAuthError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [showAccountLogin, setShowAccountLogin] = useState(false);
  const [pendingShareToken] = useState(() => getRouteParams().shareToken || '');
  const t = copy[lang];
  const homeSlides = [
    { image: homeHeroImages.leftUrl || styles[0]?.coverUrl || '/hero-portrait.png', vi: ['Biến ảnh của bạn', 'thành tác phẩm AI'], zh: ['把你的照片', '变成 AI 作品'] },
    { image: homeHeroImages.centerUrl || styles[1]?.coverUrl || '/hero-portrait.png', vi: ['Khám phá phiên bản', 'đầy cảm hứng'], zh: ['探索更多', '灵感风格'] },
    { image: homeHeroImages.rightUrl || styles[2]?.coverUrl || '/hero-portrait.png', vi: ['Tạo nên dấu ấn', 'riêng của bạn'], zh: ['创作专属于你', '独特的影像'] }
  ];
  const currentHomeSlide = homeSlides[homeSlide % homeSlides.length];
  const selectedNav = active === 'styles' || active === 'create' ? 'create' : active === 'coins' ? 'me' : active === 'friends' ? 'home' : active;
  useEffect(() => {
    void getHomeHeroImages().then(setHomeHeroImages).catch(() => undefined);
    void getTemplateCategories().then(setTemplateCategories).catch(() => undefined);
    void getTemplates().then((templates) => {
      if (templates.length > 0) { setStyles(templates.map((template: Template, index) => ({ id: template.id, name: template.nameVi, zh: template.nameZh, categoryVi: template.categoryVi || 'Chân dung', categoryZh: template.categoryZh || '人像风格', meta: `AI · ${template.isCouple ? 20 : template.coinCost} Coin`, tone: ['cyan', 'violet', 'pink'][index % 3], icon: ['✦', '◌', '◆'][index % 3], coverUrl: resolveTemplateCoverUrl(template.coverUrl, template.updatedAt), isCouple: template.isCouple, coinCost: template.isCouple ? 20 : template.coinCost }))); setSelectedStyleId(templates[0].id); }
    }).catch(() => undefined);
    if (isRealAuthEnabled()) void restoreStoredSession();
  }, []);
  useEffect(() => {
    if (active !== 'home') return;
    const timer = window.setInterval(() => setHomeSlide((slide) => (slide + 1) % homeSlides.length), 5000);
    return () => window.clearInterval(timer);
  }, [active, homeSlides.length]);
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
  const beginZaloLink = async () => {
    try { setSession(await linkZaloAccount()); setAuthError(''); }
    catch (error) {
      const status = error instanceof Error ? error.message : '';
      setAuthError(status === 'API_409'
        ? (lang === 'zh' ? '这个 Zalo 账号已关联其他 AlphaMe 账号。' : 'Tài khoản Zalo này đã được liên kết với một tài khoản AlphaMe khác.')
        : status === 'ZALO_ACCESS_TOKEN_EMPTY'
          ? (lang === 'zh' ? '无法获取 Zalo 授权，请重试。' : 'Không thể xác thực Zalo, vui lòng thử lại.')
          : (lang === 'zh' ? '关联失败，请稍后重试。' : 'Không thể liên kết tài khoản, vui lòng thử lại.'));
    }
  };
  const beginZaloLogin = async () => {
    if (authState === 'authenticated') return;
    setShowLogin(true); setAuthState('loading'); setAuthError('');
    try {
      const next = await loginWithZalo(pendingShareToken);
      setSession(next.user); setAuthState('authenticated'); setShowLogin(false);
    } catch (error) {
      const status = error instanceof Error ? error.message : '';
      setShowLogin(false); setAuthState('preview');
      setAuthError(status === 'ZALO_ACCESS_TOKEN_EMPTY'
        ? (lang === 'zh' ? '无法获取 Zalo 授权，请重试。' : 'Không thể lấy quyền truy cập Zalo, vui lòng thử lại.')
        : (lang === 'zh' ? 'Zalo 登录失败，请稍后重试。' : 'Đăng nhập Zalo thất bại, vui lòng thử lại sau.'));
    }
  };
  const beginAccountAuth = async (username: string, password: string, register: boolean) => {
    setAuthError('');
    try {
      const next = await loginWithCredentials(username, password, register, pendingShareToken);
      setSession(next.user); setAuthState('authenticated'); setShowAccountLogin(false);
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
    void beginZaloLogin();
  };
  const refreshSession = async () => {
    if (authState !== 'authenticated') return;
    try { setSession(await getMe()); } catch { /* Keep the current session if a background refresh fails. */ }
  };
  const logout = () => {
    clearAccessToken(); setSession(undefined); setAuthState('preview'); setShowLogin(false);
  };
  if (showLogin && authState === 'loading') return <main className="phone-shell"><section className="app-canvas auth-screen"><div className="auth-card"><div className="brand-lockup"><img src="/alphame-logo.png" /><span>AlphaMe</span></div><div className="auth-spinner" /><p>{lang === 'zh' ? '正在登录 Zalo…' : 'Đang đăng nhập bằng Zalo…'}</p></div></section></main>;
  if (showAccountLogin) return <main className="phone-shell"><section className="app-canvas auth-screen"><AccountLoginView lang={lang} error={authError} onBack={() => { setShowAccountLogin(false); setAuthError(''); }} onSubmit={beginAccountAuth} /></section></main>;
  return <main className="phone-shell">
    <section className={`app-canvas ${active === 'home' ? 'home-canvas' : ''} ${active === 'me' && !session ? 'guest-canvas' : ''}`}>
      <header className={`topbar ${active === 'home' ? 'home-topbar' : ''}`}><div className="brand-lockup"><img src="/alphame-logo.png" /><span>AlphaMe</span><b className="brand-spark">✦</b></div>{active !== 'home' && active !== 'styles' && active !== 'create' && active !== 'works' && active !== 'friends' && active !== 'me' && active !== 'coins' && <div className="top-actions"><button className="coin-pill" onClick={() => authState === 'authenticated' ? setActive('coins') : openLogin()}><span>✦</span> {session?.coinAccount?.available ?? 0}<i>›</i></button><button className="avatar" aria-label={t.navMe} onClick={() => setActive('me')}>{session?.avatarUrl ? <img src={session.avatarUrl} alt="" /> : <span className="profile-icon" />}</button></div>}</header>
      {active === 'home' ? <>
        <div className="home-content">
          <section className="hero home-hero"><div className="home-carousel" key={homeSlide} style={{ backgroundImage: `linear-gradient(0deg, rgba(2,25,67,.98) 0%, rgba(2,31,77,.88) 24%, rgba(3,34,83,.15) 64%, rgba(3,34,83,.02) 100%), url("${currentHomeSlide.image}")` }}><div className="home-carousel-copy"><h1><span>{lang === 'vi' ? currentHomeSlide.vi[0] : currentHomeSlide.zh[0]}</span><span>{lang === 'vi' ? currentHomeSlide.vi[1] : currentHomeSlide.zh[1]}</span></h1><p>{lang === 'vi' ? 'Chọn phong cách · Tải ảnh · Tạo ngay' : '选择风格 · 上传照片 · 即刻生成'}</p><button className="primary-cta" onClick={() => setActive('styles')}>{lang === 'vi' ? 'Khám phá phong cách' : '探索创作风格'}<span>→</span></button></div><div className="home-carousel-dots" aria-label={lang === 'vi' ? 'Ảnh trình chiếu' : '轮播图'}>{homeSlides.map((_, index) => <button key={index} className={index === homeSlide ? 'active' : ''} aria-label={`${index + 1}`} onClick={() => setHomeSlide(index)} />)}</div></div></section>
          <section className="section-block home-featured"><div className="section-heading"><div><h2>{t.featured}</h2></div><button className="text-button" onClick={() => setActive('styles')}>{t.all} <span>→</span></button></div><div className="style-grid">{styles.slice(0, 3).map(style => <article className={`style-card ${style.tone}`} key={style.id} onClick={() => { setSelectedStyleId(style.id); setActive('create'); }}><div className="style-art">{style.coverUrl ? <img className="style-cover" src={style.coverUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <img className="style-cover" src="/hero-portrait.png" alt="" />}<div className="art-glow" /></div><div className="style-info"><h3>{lang === 'vi' ? style.name : style.zh}</h3><p>{style.meta}</p></div></article>)}</div><button className="home-plaza-link" onClick={() => setActive('friends')}><span className="home-plaza-icon">✦</span><span className="home-plaza-copy"><strong>{lang === 'vi' ? 'Khám phá Quảng trường' : '逛逛灵感广场'}</strong><small>{lang === 'vi' ? 'Ngắm tác phẩm và truyền cảm hứng' : '看看大家的 AI 作品，点赞与分享'}</small></span><span className="home-plaza-arrow">›</span></button></section>
        </div>
      </> : active === 'styles' ? <StylePicker lang={lang} styles={styles} categories={templateCategories} selectedStyleId={selectedStyleId} onSelect={(styleId) => { setSelectedStyleId(styleId); setActive('create'); }} /> : active === 'create' ? <CreateView lang={lang} templateId={selectedStyleId} isCouple={Boolean(styles.find((style) => style.id === selectedStyleId)?.isCouple)} coinCost={styles.find((style) => style.id === selectedStyleId)?.coinCost ?? 10} authenticated={authState === 'authenticated'} onRequireLogin={openLogin} onGenerationCreated={() => void refreshSession()} onBack={() => setActive('styles')} /> : active === 'works' ? <WorksView lang={lang} authenticated={authState === 'authenticated'} onRequireLogin={() => { setAuthError(''); setActive('me'); }} onCreate={() => setActive('styles')} /> : active === 'me' ? <PersonalView lang={lang} user={session} error={authError} onLinkZalo={() => void beginZaloLink()} onLogin={() => void beginZaloLogin()} onAccountLogin={() => { setAuthError(''); setShowAccountLogin(true); }} onLogout={logout} onWorks={() => setActive('works')} onCoins={() => setActive('coins')} onLanguage={() => setLang(lang === 'vi' ? 'zh' : 'vi')} onProfileUpdated={(next) => setSession(next)} /> : active === 'coins' ? <CoinView lang={lang} authenticated={authState === 'authenticated'} onBack={() => setActive('me')} onRequireLogin={openLogin} onBalanceChanged={() => void refreshSession()} onWorks={() => setActive('works')} onPlaza={() => setActive('friends')} /> : <PlazaView lang={lang} authenticated={authState === 'authenticated'} onRequireLogin={openLogin} />}
      <nav className="bottom-nav" aria-label={lang === 'zh' ? '主导航' : 'Điều hướng chính'}>{([['home', t.navHome], ['create', t.navCreate], ['works', t.navWorks], ['me', t.navMe]] as const).map(([id, label]) => <button className={selectedNav === id ? 'active' : ''} onClick={() => setActive(id === 'create' ? 'styles' : id)} key={id} aria-current={selectedNav === id ? 'page' : undefined}><span className="nav-icon"><NavIcon name={id} /></span><span className="nav-label">{label}</span></button>)}</nav>
    </section>
  </main>;
}

function PersonalView({ lang, user, error, onLinkZalo, onLogin, onAccountLogin, onLogout, onWorks, onCoins, onLanguage, onProfileUpdated }: { lang: Lang; user?: Session['user']; error: string; onLinkZalo: () => void; onLogin: () => void; onAccountLogin: () => void; onLogout: () => void; onWorks: () => void; onCoins: () => void; onLanguage: () => void; onProfileUpdated: (user: Session['user']) => void }) {
  const [editing, setEditing] = useState(false);
  const zh = lang === 'zh';
  const username = user?.username;
  const displayName = user?.displayName || username || (zh ? 'Zalo 用户' : 'Người dùng Zalo');
  const accountLabel = username ? (zh ? 'AlphaMe 账号' : 'Tài khoản AlphaMe') : (zh ? '已关联 Zalo 的账号' : 'Tài khoản đã liên kết Zalo');
  const initial = displayName.slice(0, 1).toUpperCase();
  if (editing && user) return <ProfileEditor lang={lang} user={user} onBack={() => setEditing(false)} onSaved={(next) => { onProfileUpdated(next); setEditing(false); }} />;
  if (!user) return <section className="create-view personal-view guest-view">
    <div className="guest-profile">
      <div className="guest-profile-art"><img src="/alphame-guest-welcome-fullscreen.png" alt="" /></div>
      <div className="guest-profile-copy"><p className="guest-greeting">{zh ? '你好，' : 'Xin chào,'}</p><h1>{zh ? '新的创作者！' : 'nhà sáng tạo mới!'}</h1><p className="guest-description">{zh ? '登录后即可保存作品、同步数据，探索更多有趣功能。' : 'Đăng nhập để lưu tác phẩm, đồng bộ dữ liệu và khám phá thêm nhiều tính năng thú vị.'}</p></div>
      <button className="guest-login" onClick={onLogin}>{zh ? '登录' : 'Đăng nhập'}<span>→</span></button>
      <button className="guest-account-login" onClick={onAccountLogin}>{zh ? '通过账号密码登录' : 'Đăng nhập bằng tài khoản và mật khẩu'}</button>
      {error && <p className="auth-error guest-error">{error}</p>}
    </div>
  </section>;
  return <section className="create-view personal-view">
    <div className="account-intro"><h1>{zh ? '我的' : 'Cá nhân'}</h1><p>{zh ? '你的创作身份与灵感资产。' : 'Danh tính sáng tạo và tài sản cảm hứng của bạn.'}</p></div>
    <div className={`account-hero-card ${user ? 'signed-in' : 'signed-out'}`}>
      <div className="account-hero-top"><div className="account-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user ? initial : <span className="profile-icon" />}</div><div className="account-identity"><span className="account-label">{user ? accountLabel : (zh ? '访客模式' : 'Chế độ khách')}</span><strong>{user ? displayName : (zh ? '暂未登录' : 'Chưa đăng nhập')}</strong></div><span className={`account-state ${user ? 'online' : ''}`}><i />{user ? (zh ? '在线' : 'Online') : (zh ? '访客' : 'Khách')}</span></div>
      <div className="account-hero-bottom"><div><span>{zh ? '创作额度' : 'Hạn mức sáng tạo'}</span><strong><i>✦</i>{user?.coinAccount?.available ?? 0}<small> Coin</small></strong></div><div className="account-progress"><span>{zh ? '可用于生成新作品' : 'Sẵn sàng cho tác phẩm mới'}</span><b><em /></b></div></div>
    </div>
    <div className="account-actions"><button className="account-action primary" onClick={() => setEditing(true)}><span className="action-symbol">✎</span><span><b>{zh ? '编辑资料' : 'Chỉnh sửa hồ sơ'}</b><small>{zh ? '昵称与头像' : 'Tên và ảnh đại diện'}</small></span><strong>↗</strong></button><button className="account-action" onClick={onWorks}><span className="action-symbol">▧</span><span><b>{zh ? '我的作品' : 'Tác phẩm của tôi'}</b><small>{zh ? '查看创作记录' : 'Xem lịch sử sáng tạo'}</small></span><strong>↗</strong></button></div>{!user.zaloLinked && <button className="account-link-row" onClick={onLinkZalo}><span><b>{zh ? '关联 Zalo 账号' : 'Liên kết tài khoản Zalo'}</b><small>{zh ? '可选：将 Zalo 身份绑定到此 AlphaMe 账号' : 'Tùy chọn: liên kết Zalo với tài khoản AlphaMe này'}</small></span><strong>→</strong></button>}{error && <p className="auth-error">{error}</p>}
    {user && <button className="account-coin-link" onClick={onCoins}><span><i>✦</i>{zh ? '获取更多 Coin' : 'Nhận thêm Coin'}</span><small>{zh ? '签到 / 分享 / 获赞' : 'Điểm danh / Chia sẻ / Lượt thích'} <b>→</b></small></button>}
    {user?.isAdmin && <button className="account-action account-language" onClick={onLanguage}><span className="action-symbol">◐</span><span><b>{zh ? '切换语言' : 'Đổi ngôn ngữ'}</b><small>{zh ? '仅管理员可见 · 当前为中文' : 'Chỉ admin nhìn thấy · Hiện tại: Tiếng Việt'}</small></span><strong>{zh ? 'VI' : '中'}</strong></button>}
    {user && <button className="account-logout" onClick={onLogout}><span>↪</span>{zh ? '退出当前账号' : 'Đăng xuất tài khoản'}</button>}
  </section>;
}

function ProfileEditor({ lang, user, onBack, onSaved }: { lang: Lang; user: Session['user']; onBack: () => void; onSaved: (user: Session['user']) => void }) {
  const zh = lang === 'zh';
  const [displayName, setDisplayName] = useState(user.displayName || user.username || '');
  const [avatar, setAvatar] = useState(user.avatarUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const onFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(zh ? '请选择图片文件。' : 'Vui lòng chọn tệp hình ảnh.'); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };
  const save = async () => {
    const name = displayName.trim();
    if (!name) { setError(zh ? '请输入昵称。' : 'Vui lòng nhập tên hiển thị.'); return; }
    setBusy(true); setError('');
    try {
      const uploadedAvatar = avatar.startsWith('data:') ? (await uploadImage(avatar, 'avatar')).publicUrl : avatar || undefined;
      onSaved(await updateProfile(name, uploadedAvatar));
    } catch { setError(zh ? '保存失败，请稍后重试。' : 'Không thể lưu, vui lòng thử lại sau.'); }
    finally { setBusy(false); }
  };
  return <section className="create-view personal-view profile-editor"><button className="back-button" onClick={onBack}>← {zh ? '返回我的' : 'Về cá nhân'}</button><div className="create-heading"><h1>{zh ? '编辑资料' : 'Chỉnh sửa hồ sơ'}</h1><p>{zh ? '设置你在 AlphaMe 中展示的昵称和头像。' : 'Đặt tên và ảnh đại diện hiển thị trên AlphaMe.'}</p></div><label className="profile-avatar-picker"><div className="profile-avatar-preview">{avatar ? <img src={avatar} alt="" /> : <span className="profile-icon" />}</div><strong>{zh ? '更换头像' : 'Đổi ảnh đại diện'}</strong><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} /></label><label className="profile-name-field"><span>{zh ? '昵称' : 'Tên hiển thị'}</span><input value={displayName} maxLength={40} onChange={(event) => setDisplayName(event.target.value)} placeholder={zh ? '输入你的昵称' : 'Nhập tên hiển thị'} /></label>{error && <p className="auth-error">{error}</p>}<button className="primary-cta full" disabled={busy} onClick={() => void save()}>{busy ? (zh ? '保存中…' : 'Đang lưu…') : (zh ? '保存修改' : 'Lưu thay đổi')} <span>→</span></button></section>;
}

function WorksView({ lang, authenticated, onRequireLogin, onCreate }: { lang: Lang; authenticated: boolean; onRequireLogin: () => void; onCreate: () => void }) {
  const zh = lang === 'zh';
  const [items, setItems] = useState<Generation[]>([]);
  const [savingId, setSavingId] = useState('');
  const [savedId, setSavedId] = useState('');
  const [saveErrorId, setSaveErrorId] = useState('');
  const [publishedIds, setPublishedIds] = useState<string[]>([]);
  const [publishedWorkIds, setPublishedWorkIds] = useState<Record<string, string>>({});
  const [publishingId, setPublishingId] = useState('');
  const [sharingId, setSharingId] = useState('');
  const [shareErrorId, setShareErrorId] = useState('');
  useEffect(() => {
    if (!authenticated || !isRealAuthEnabled()) return;
    void Promise.all([getGenerations(), getMyPlazaWorks()]).then(([generations, plaza]) => {
      setItems(generations);
      setPublishedIds(plaza.map((work) => work.generationId));
      setPublishedWorkIds(Object.fromEntries(plaza.map((work) => [work.generationId, work.id])));
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
  const togglePublished = async (item: Generation) => {
    setPublishingId(item.id);
    try {
      const plazaWorkId = publishedWorkIds[item.id];
      if (plazaWorkId) {
        await unpublishPlazaWork(plazaWorkId);
        setPublishedIds((ids) => ids.filter((id) => id !== item.id));
        setPublishedWorkIds((ids) => { const next = { ...ids }; delete next[item.id]; return next; });
      } else {
        const published = await publishPlazaWork(item.id);
        setPublishedIds((ids) => ids.includes(item.id) ? ids : [...ids, item.id]);
        setPublishedWorkIds((ids) => ({ ...ids, [item.id]: published.id }));
      }
    } catch { /* keep the action retryable */ }
    finally { setPublishingId(''); }
  };
  const share = async (item: Generation) => {
    if (!item.resultAssetUrl) return;
    setSharingId(item.id); setShareErrorId('');
    try {
      const { shareToken } = await createShare();
      const link = await getShareableLink({ title: lang === 'zh' ? '加入 AlphaMe' : 'Tham gia AlphaMe', description: lang === 'zh' ? '打开小程序，帮助好友获得 Coin。' : 'Mở mini app để giúp bạn bè nhận Coin.', path: `?shareToken=${encodeURIComponent(shareToken)}` });
      await openShareSheet({ type: 'link', data: { link, chatOnly: true } });
    } catch { setShareErrorId(item.id); }
    finally { setSharingId(''); }
  };
  return <section className={`create-view works-view ${items.length === 0 ? 'works-empty' : ''}`}>
    <div className="create-heading"><span className="works-kicker">{zh ? '创作档案' : 'ALPHAME STUDIO'}</span><div className="works-title-row"><h1>{zh ? '我的作品' : 'Tác phẩm của tôi'}</h1>{authenticated && items.length > 0 && <span className="works-count">{items.length} {zh ? '件' : 'tác phẩm'}</span>}</div>{authenticated && items.length > 0 && <p>{zh ? '把喜欢的作品发布到广场，和更多人分享。' : 'Đăng tác phẩm bạn thích lên quảng trường để chia sẻ cùng mọi người.'}</p>}</div>
    {!authenticated && <div className="works-gate"><div className="works-gate-art"><span className="works-art-orbit orbit-one"/><span className="works-art-orbit orbit-two"/><span className="works-art-star">✦</span><span className="works-art-spark">✧</span><span className="works-art-caption">ALPHAME · YOUR AI STORY</span></div><div className="works-gate-copy"><span>{zh ? '专属创作空间' : 'KHÔNG GIAN SÁNG TẠO RIÊNG'}</span><h2>{zh ? '登录，找回你的每一份灵感。' : 'Đăng nhập để gặp lại những khoảnh khắc AI của bạn.'}</h2><p>{zh ? '生成结果会保存在这里，随时下载或分享给朋友。' : 'Tác phẩm của bạn sẽ được lưu tại đây để tải xuống hoặc chia sẻ cùng bạn bè.'}</p><button className="works-primary" onClick={onRequireLogin}>{zh ? '登录' : 'Đăng nhập'}<b>→</b></button></div></div>}
    <div className="works-grid">{items.map((item) => <article className="work-card" key={item.id}>{item.resultAssetUrl ? <div className="work-image-frame"><img className="work-image" src={item.resultPreviewAssetUrl || item.resultAssetUrl} alt="" /></div> : <div className="style-art work-placeholder"><span>{item.status === 'PROCESSING' || item.status === 'QUEUED' ? '…' : '!'}</span><div className="art-glow" /></div>}<div className="style-info"><div><h3>{item.status}</h3><p>{new Date(item.createdAt).toLocaleString()}</p></div>{item.resultAssetUrl && <><button className="download-button" type="button" onClick={() => void saveToGallery(item)} disabled={savingId === item.id}>{savingId === item.id ? (zh ? '保存中…' : 'Đang lưu…') : savedId === item.id ? (zh ? '已保存' : 'Đã lưu') : saveErrorId === item.id ? (zh ? '重试下载' : 'Thử lại') : (zh ? '下载到相册' : 'Lưu vào thư viện')}</button><button className={`publish-button ${publishedIds.includes(item.id) ? 'published' : ''}`} type="button" onClick={() => void togglePublished(item)} disabled={publishingId === item.id}>{publishingId === item.id ? (zh ? '处理中…' : 'Đang xử lý…') : publishedIds.includes(item.id) ? (zh ? '从广场撤回' : 'Gỡ khỏi quảng trường') : (zh ? '发布到广场' : 'Đăng lên quảng trường')}</button><button className="share-button" type="button" onClick={() => void share(item)} disabled={sharingId === item.id}>{sharingId === item.id ? (zh ? '打开分享…' : 'Đang mở chia sẻ…') : shareErrorId === item.id ? (zh ? '重试分享' : 'Thử lại chia sẻ') : (zh ? '邀请好友得 Coin' : 'Mời bạn nhận Coin')}</button></>}</div></article>)}</div>
    {authenticated && items.length === 0 && <div className="works-empty-state"><div className="empty-art"><span>✦</span><i>✧</i></div><span className="empty-eyebrow">{zh ? '这里即将有新故事' : 'CÂU CHUYỆN MỚI SẮP BẮT ĐẦU'}</span><h2>{zh ? '你的第一幅 AI 作品，准备好了吗？' : 'Tác phẩm AI đầu tiên của bạn đã sẵn sàng chưa?'}</h2><p>{zh ? '选一个喜欢的风格，上传照片，开启创作。' : 'Chọn phong cách yêu thích, tải ảnh lên và bắt đầu sáng tạo.'}</p><button className="works-primary" onClick={onCreate}>{zh ? '开始创作' : 'Bắt đầu sáng tạo'}<b>→</b></button></div>}
  </section>;
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
  return <section className="create-view plaza-view"><div className="plaza-heading"><div><h1>{zh ? '广场' : 'Quảng trường'}</h1><p>{zh ? '发现大家生成的 AI，也把你的灵感分享出来。' : 'Khám phá AI của cộng đồng và chia sẻ cảm hứng của bạn.'}</p></div><span className="plaza-count">{items.length}<small>{zh ? '件作品' : 'tác phẩm'}</small></span></div>{loading ? <p className="plaza-state">{zh ? '正在加载作品…' : 'Đang tải tác phẩm…'}</p> : error ? <p className="plaza-state">{zh ? '暂时无法加载广场，请重试。' : 'Không thể tải quảng trường, hãy thử lại.'}</p> : items.length === 0 ? <p className="plaza-state">{zh ? '还没有公开作品，成为第一个分享的人吧。' : 'Chưa có tác phẩm công khai. Hãy là người đầu tiên chia sẻ.'}</p> : <div className="plaza-feed">{items.filter((item) => item.generation.resultAssetUrl).map((item) => { const author = item.user.displayName || (zh ? 'AlphaMe 用户' : 'Người dùng AlphaMe'); return <article className="plaza-card" key={item.id}><div className="plaza-image-wrap"><img src={item.generation.resultPreviewAssetUrl || item.generation.resultAssetUrl!} alt={author} /><span className="plaza-chip">{item.liked ? (zh ? '已点赞' : 'Đã thích') : 'AI'}</span></div><div className="plaza-meta"><div className="plaza-author"><span className="author-avatar">{author.slice(0, 1).toUpperCase()}{item.user.avatarUrl && <img src={item.user.avatarUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}</span><span><strong>{author}</strong><small>{new Date(item.publishedAt).toLocaleDateString()}</small></span></div><button className={`like-button ${item.liked ? 'liked' : ''}`} disabled={busyId === item.id} onClick={() => void toggleLike(item)}>♡ <span>{item.likes}</span></button></div></article>; })}</div>}<p className="plaza-footnote">{zh ? '你的下一幅作品，也可以出现在这里。' : 'Tác phẩm tiếp theo của bạn cũng có thể xuất hiện ở đây.'}</p></section>;
}

function CoinView({ lang, authenticated, onBack, onRequireLogin, onBalanceChanged, onWorks, onPlaza }: { lang: Lang; authenticated: boolean; onBack: () => void; onRequireLogin: () => void; onBalanceChanged: () => void; onWorks: () => void; onPlaza: () => void }) {
  const zh = lang === 'zh';
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState<{ checkedIn: boolean; rewardAmount: number }>();
  const [ledger, setLedger] = useState<CoinLedgerEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const load = () => { if (!authenticated) return; void Promise.all([getCoinBalance(), getCheckInStatus(), getCoinLedger()]).then(([nextBalance, nextStatus, nextLedger]) => { setBalance(nextBalance.available); setStatus(nextStatus); setLedger(nextLedger); }).catch(() => undefined); };
  useEffect(() => { load(); }, [authenticated]);
  const doCheckIn = async () => {
    if (!authenticated) { onRequireLogin(); return; }
    setBusy(true); setMessage('');
    try { const result = await checkIn(); setMessage(result.alreadyCheckedIn ? (zh ? '今天已经签到过了。' : 'Hôm nay bạn đã điểm danh rồi.') : (zh ? `签到成功，获得 ${result.rewardAmount} Coin。` : `Điểm danh thành công, nhận ${result.rewardAmount} Coin.`)); load(); onBalanceChanged(); } catch { setMessage(zh ? '签到暂时不可用，请稍后重试。' : 'Không thể điểm danh lúc này, hãy thử lại sau.'); }
    finally { setBusy(false); }
  };
  const shareInvite = async () => {
    if (!authenticated) { onRequireLogin(); return; }
    setSharing(true); setMessage('');
    try {
      const { shareToken } = await createShare();
      const link = await getShareableLink({ title: zh ? '加入 AlphaMe' : 'Tham gia AlphaMe', description: zh ? '邀请好友注册，好友和你都能获得 Coin。' : 'Mời bạn bè đăng ký để cả hai cùng nhận Coin.', path: `?shareToken=${encodeURIComponent(shareToken)}` });
      await openShareSheet({ type: 'link', data: { link, chatOnly: true } });
    } catch { setMessage(zh ? '暂时无法分享，请稍后重试。' : 'Không thể chia sẻ lúc này, vui lòng thử lại.'); }
    finally { setSharing(false); }
  };
  const label = (entry: CoinLedgerEntry) => {
    if (entry.rewardType === 'NEW_USER') return zh ? '新用户注册奖励' : 'Thưởng đăng ký mới';
    if (entry.rewardType === 'INVITEE_BONUS') return zh ? '受邀注册额外奖励' : 'Thưởng thêm khi được mời';
    if (entry.rewardType === 'DAILY_CHECK_IN') return zh ? '每日签到奖励' : 'Thưởng điểm danh';
    if (entry.rewardType === 'SHARE_OPEN') return zh ? '好友打开分享奖励' : 'Thưởng bạn mở chia sẻ';
    if (entry.rewardType === 'PLAZA_LIKE') return zh ? '作品获赞奖励' : 'Thưởng lượt thích';
    if (entry.rewardType === 'ADMIN_REVERSAL') return zh ? '奖励撤销' : 'Thu hồi phần thưởng';
    return entry.type === 'GENERATION_CHARGE' ? (zh ? '生成图片' : 'Tạo ảnh') : entry.type === 'REFUND' ? (zh ? '生成退款' : 'Hoàn Coin') : entry.note || (zh ? 'Coin 变动' : 'Biến động Coin');
  };
  const statusLabel = (entry: CoinLedgerEntry) => entry.rewardStatus === 'REVOKED' ? (zh ? '已撤销' : 'Đã thu hồi') : entry.rewardType ? (zh ? '奖励已发放' : 'Đã phát thưởng') : '';
  return <section className="create-view coin-view"><button className="back-button" onClick={onBack}>← {zh ? '返回我的' : 'Về cá nhân'}</button><div className="coin-hero"><span className="kicker">ALPHAME COIN</span><h1>{zh ? '获取 Coin' : 'Nhận Coin'}</h1><p>{zh ? '完成真实互动，持续获得创作额度。' : 'Hoàn thành tương tác thật để tiếp tục sáng tạo.'}</p><strong><i>✦</i>{balance}</strong><small>{zh ? '当前可用' : 'Đang khả dụng'}</small></div><div className="reward-list"><article className="reward-card"><div><span className="reward-icon">◷</span><strong>{zh ? '每日签到' : 'Điểm danh mỗi ngày'}</strong><p>{zh ? `每天首次签到 +${status?.rewardAmount ?? 10} Coin` : `Lần đầu mỗi ngày +${status?.rewardAmount ?? 10} Coin`}</p></div><button onClick={() => void doCheckIn()} disabled={busy || status?.checkedIn}>{status?.checkedIn ? (zh ? '已签到' : 'Đã nhận') : busy ? '…' : (zh ? '签到' : 'Nhận')}</button></article><button className="reward-card reward-card-link" onClick={() => void shareInvite()} disabled={sharing}><div><span className="reward-icon">↗</span><strong>{zh ? '邀请好友' : 'Mời bạn bè'}</strong><p>{zh ? '好友注册后，你和好友都可获得 Coin' : 'Cả hai cùng nhận Coin khi bạn bè đăng ký'}</p></div><span className="reward-hint">{sharing ? '…' : (zh ? '立即分享' : 'Chia sẻ')} →</span></button><button className="reward-card reward-card-link" onClick={onPlaza}><div><span className="reward-icon">♡</span><strong>{zh ? '作品获赞' : 'Nhận lượt thích'}</strong><p>{zh ? '作品每获得一个有效赞 +10 Coin' : 'Mỗi lượt thích hợp lệ cho tác phẩm +10 Coin'}</p></div><span className="reward-hint">{zh ? '去广场' : 'Quảng trường'} →</span></button></div>{message && <p className="coin-message">{message}</p>}<div className="ledger-heading"><div><span className="kicker">COIN LEDGER</span><h2>{zh ? 'Coin 明细' : 'Lịch sử Coin'}</h2></div><button className="text-button" onClick={load}>{zh ? '刷新' : 'Làm mới'} ↻</button></div><div className="ledger-list">{ledger.map((entry) => <div className="ledger-row" key={entry.id}><span className={entry.amount >= 0 ? 'ledger-plus' : 'ledger-minus'}>{entry.amount >= 0 ? '+' : ''}{entry.amount}</span><span><strong>{label(entry)}</strong><small>{new Date(entry.createdAt).toLocaleString()} {statusLabel(entry)}</small></span><em>{entry.availableAfter} Coin</em></div>)}{ledger.length === 0 && <p className="plaza-state">{zh ? '暂无 Coin 明细。' : 'Chưa có lịch sử Coin.'}</p>}</div></section>;
}

function StylePicker({ lang, styles, categories, selectedStyleId, onSelect }: { lang: Lang; styles: typeof defaultStyles; categories: TemplateCategory[]; selectedStyleId: string; onSelect: (styleId: string) => void }) {
  const zh = lang === 'zh';
  const [categoryId, setCategoryId] = useState('');
  const categoryOptions = categories.length ? categories : [...new Map(styles.map((style) => {
    const nameZh = style.categoryZh || '人像风格'; const nameVi = style.categoryVi || 'Chân dung';
    return [`${nameZh}:${nameVi}`, { id: `${nameZh}:${nameVi}`, nameZh, nameVi }];
  })).values()];
  const activeCategory = categoryOptions.find((item) => item.id === categoryId);
  const visibleStyles = activeCategory ? styles.filter((style) => (style.categoryZh || '人像风格') === activeCategory.nameZh && (style.categoryVi || 'Chân dung') === activeCategory.nameVi) : styles;
  return <section className="create-view style-picker">
    <div className="create-heading"><h1>{zh ? '选一种你的新模样' : 'Chọn phiên bản của bạn'}</h1><p>{zh ? '先选 AI 风格，下一步上传一张清晰的照片。' : 'Chọn phong cách AI, rồi tải lên một ảnh rõ khuôn mặt.'}</p></div>
    <div className="picker-section-heading"><strong>{zh ? '分类' : 'Danh mục'}</strong><span>{visibleStyles.length} {zh ? '种灵感' : 'lựa chọn'}</span></div>
    <div className="picker-category-tabs" role="tablist" aria-label={zh ? '风格分类' : 'Danh mục phong cách'}>
      <button className={!categoryId ? 'active' : ''} onClick={() => setCategoryId('')}>{zh ? '全部' : 'Tất cả'}</button>
      {categoryOptions.map((item) => <button key={item.id} className={categoryId === item.id ? 'active' : ''} onClick={() => setCategoryId(item.id)}>{zh ? item.nameZh : item.nameVi}</button>)}
    </div>
    <div className="picker-grid">{visibleStyles.map(style => {
      const selected = selectedStyleId === style.id;
      return <button className={`picker-card ${style.tone} ${selected ? 'selected' : ''}`} key={style.id} aria-pressed={selected} onClick={() => onSelect(style.id)}><div className="style-art">{style.coverUrl ? <img className="style-cover" src={style.coverUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span>{style.icon}</span>}<div className="art-glow" /></div><div className="picker-info"><h3>{zh ? style.zh : style.name}</h3><p>{style.meta}</p></div></button>;
    })}</div>
  </section>;
}

function CreateView({ lang, templateId, isCouple, coinCost, authenticated, onRequireLogin, onGenerationCreated, onBack }: { lang: Lang; templateId: string; isCouple: boolean; coinCost: number; authenticated: boolean; onRequireLogin: () => void; onGenerationCreated: () => void; onBack: () => void }) {
  const zh = lang === 'zh';
  const [dataUrl, setDataUrl] = useState('');
  const [dataUrl2, setDataUrl2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const onFile = (file: File | undefined, second = false) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const value = typeof reader.result === 'string' ? reader.result : ''; second ? setDataUrl2(value) : setDataUrl(value); };
    reader.readAsDataURL(file);
  };
  const generate = async () => {
    if (!authenticated) { onRequireLogin(); return; }
    if (!templateId) { setError(zh ? '风格还在加载，请稍后重试。' : 'Phong cách đang tải, vui lòng thử lại sau.'); return; }
    if (!dataUrl || (isCouple && !dataUrl2)) { setError(zh ? (isCouple ? '请上传两张照片。' : '请先选择照片。') : (isCouple ? 'Vui lòng tải lên đủ hai ảnh.' : 'Vui lòng chọn ảnh trước.')); return; }
    setBusy(true); setError('');
    try {
      const asset = await uploadImage(dataUrl);
      const asset2 = isCouple ? await uploadImage(dataUrl2) : undefined;
      await createGeneration(templateId, asset.publicUrl, asset2?.publicUrl);
      onGenerationCreated();
      setError(zh ? '任务已提交，请稍后在作品中查看。' : 'Đã gửi tác vụ, hãy xem kết quả trong Tác phẩm.');
    } catch { setError(zh ? '生成暂时不可用，请稍后重试。' : 'Tạo ảnh tạm thời chưa khả dụng, hãy thử lại sau.'); }
    finally { setBusy(false); }
  };
  const uploadTile = (second: boolean) => { const value = second ? dataUrl2 : dataUrl; const index = second ? 2 : 1; return <label className="upload-zone" key={index} onClick={(event) => { if (!authenticated) { event.preventDefault(); onRequireLogin(); } }}><div className="upload-icon">{value ? '✓' : '＋'}</div><strong>{value ? (zh ? `第${index}张已选择` : `Ảnh ${index} đã chọn`) : (zh ? `选择第${index}张照片` : `Chọn ảnh ${index}`)}</strong><span>JPG · PNG · WEBP · max 15MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0], second)} /></label>; };
  return <section className="create-view"><button className="back-button" onClick={onBack}>← {zh ? '返回风格' : 'Quay lại phong cách'}</button><div className="create-heading"><h1>{zh ? (isCouple ? '上传两张清晰的脸部照片' : '上传一张清晰的脸部照片') : (isCouple ? 'Tải lên hai ảnh rõ khuôn mặt' : 'Tải lên một ảnh rõ khuôn mặt')}</h1><p>{zh ? (isCouple ? '按提示词中的图1、图2顺序上传两位人物照片。' : '光线自然、正面清晰的照片会带来更好的结果。') : (isCouple ? 'Tải ảnh theo đúng thứ tự Hình 1 và Hình 2 trong mô tả.' : 'Ảnh rõ mặt, ánh sáng tự nhiên sẽ cho kết quả tốt hơn.')}</p></div>{isCouple ? <div className="couple-upload-grid">{uploadTile(false)}{uploadTile(true)}</div> : uploadTile(false)}<div className="cost-row"><span>{zh ? '生成成本' : 'Chi phí tạo ảnh'}</span><strong>✦ {coinCost} Coin</strong></div>{error && <p className="auth-error">{error}</p>}<button className="primary-cta full" disabled={busy} onClick={() => void generate()}>{busy ? (zh ? '提交中…' : 'Đang gửi…') : (zh ? '开始生成' : 'Bắt đầu tạo')} <span>↗</span></button></section>;
}

createRoot(document.getElementById('app')!).render(<StrictMode><App /></StrictMode>);

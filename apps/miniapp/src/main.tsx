import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { createGeneration, getGenerations, getTemplates, isRealAuthEnabled, loginWithZalo, uploadImage, type Generation, type Template } from './api';

type Lang = 'vi' | 'zh';
const copy = {
  vi: { greeting: 'Xin chào, Isaac', title: 'Biến khoảnh khắc\nthành phiên bản AI', subtitle: 'Chọn phong cách. Tải ảnh lên. Để AlphaMe tạo nên điều đặc biệt.', coin: 'Coin', featured: 'Phong cách nổi bật', all: 'Tất cả phong cách', friends: 'AI cùng bạn bè', challenge: 'Thử thách hôm nay', works: 'Tác phẩm của tôi', navHome: 'Trang chủ', navFriends: 'Bạn bè', navWorks: 'Tác phẩm', navMe: 'Cá nhân', create: 'Tạo ảnh', explore: 'Khám phá' },
  zh: { greeting: '你好，Isaac', title: '把每个瞬间\n变成 AI 版本', subtitle: '选择风格，上传照片，让 AlphaMe 创造特别的你。', coin: '金币', featured: '精选风格', all: '全部风格', friends: '好友 AI', challenge: '今日挑战', works: '我的作品', navHome: '首页', navFriends: '好友', navWorks: '作品', navMe: '我的', create: '生成图片', explore: '探索' }
};
const defaultStyles: Array<{ id: string; name: string; zh: string; meta: string; tone: string; icon: string; coverUrl?: string }> = [
  { id: 'ao-dai', name: 'Áo Dài', zh: '越南奥黛', meta: 'Editorial · 10 Coin', tone: 'cyan', icon: '✦' },
  { id: 'dream-portrait', name: 'Dream Portrait', zh: '梦幻肖像', meta: 'Studio light · 10 Coin', tone: 'violet', icon: '◌' },
  { id: 'movie-poster', name: 'Movie Poster', zh: '电影海报', meta: 'Cinematic · 10 Coin', tone: 'pink', icon: '◆' }
];

function App() {
  const [lang, setLang] = useState<Lang>('vi');
  const [active, setActive] = useState('home');
  const [authError, setAuthError] = useState(false);
  const [styles, setStyles] = useState(defaultStyles);
  const [selectedStyleId, setSelectedStyleId] = useState(defaultStyles[0].id);
  const t = copy[lang];
  useEffect(() => {
    if (!isRealAuthEnabled()) return;
    void loginWithZalo().then(() => getTemplates()).then((templates) => {
      if (templates.length > 0) setStyles(templates.map((template: Template, index) => ({ id: template.id, name: template.nameVi, zh: template.nameZh, meta: `AI · ${template.coinCost} Coin`, tone: ['cyan', 'violet', 'pink'][index % 3], icon: ['✦', '◌', '◆'][index % 3], coverUrl: template.coverUrl })));
    }).catch(() => setAuthError(true));
  }, []);
  return <main className="phone-shell">
    <section className="app-canvas">
      <header className="topbar"><div className="brand-lockup"><img src="/alphame-logo.png" /><span>AlphaMe</span></div><div className="top-actions"><button className="lang-switch" onClick={() => setLang(lang === 'vi' ? 'zh' : 'vi')}>{lang === 'vi' ? '中' : 'VI'}</button><div className="coin-pill"><span>✦</span> 10</div><div className="avatar">I</div></div></header>
      {authError && <div role="alert" className="auth-error">Unable to sign in to AlphaMe. Please reopen the Mini App and try again.</div>}
      {active === 'home' ? <>
        <section className="hero"><div className="eyebrow">ALPHAME STUDIO <span>✦</span></div><h1>{t.title.split('\n').map((line, i) => <span key={line}>{line}{i === 0 && <br />}</span>)}</h1><p>{t.subtitle}</p><button className="primary-cta" onClick={() => setActive('styles')}>{t.create}<span>↗</span></button><div className="orb orb-a" /><div className="orb orb-b" /></section>
        <section className="section-block"><div className="section-heading"><div><span className="kicker">01 / {t.explore}</span><h2>{t.featured}</h2></div><button className="text-button" onClick={() => setActive('styles')}>{t.all} <span>→</span></button></div><div className="style-grid">{styles.map(style => <article className={`style-card ${style.tone}`} key={style.id} onClick={() => { setSelectedStyleId(style.id); setActive('create'); }}><div className="style-art">{style.coverUrl ? <img className="style-cover" src={style.coverUrl} alt="" /> : <span>{style.icon}</span>}<div className="art-glow" /></div><div className="style-info"><div><h3>{lang === 'vi' ? style.name : style.zh}</h3><p>{style.meta}</p></div><button className="circle-arrow">↗</button></div></article>)}</div></section>
        <section className="social-strip"><div className="social-mark">◎</div><div><span className="kicker">02 / SOCIAL AI</span><h2>{t.friends}</h2><p>{lang === 'vi' ? 'Tạo nên một câu chuyện cùng người bạn.' : '和朋友一起，创造属于你们的故事。'}</p></div><span className="strip-arrow">↗</span></section>
        <section className="challenge-row"><div><span className="kicker">03 / DAILY</span><h2>{t.challenge}</h2></div><div className="challenge-badge">NEW<br /><strong>24H</strong></div></section>
      </> : active === 'styles' ? <StylePicker lang={lang} styles={styles} onBack={() => setActive('home')} onSelect={(styleId) => { setSelectedStyleId(styleId); setActive('create'); }} /> : active === 'create' ? <CreateView lang={lang} templateId={selectedStyleId} onBack={() => setActive('styles')} /> : active === 'works' ? <WorksView lang={lang} /> : <section className="create-view"><div className="create-heading"><span className="kicker">ALPHAME</span><h1>{active === 'friends' ? t.friends : t.navMe}</h1><p>{lang === 'zh' ? '该模块将在下一阶段接入真实数据。' : 'Tính năng này sẽ được kết nối dữ liệu thật ở giai đoạn tiếp theo.'}</p></div></section>}
      <nav className="bottom-nav">{[["home", t.navHome, '⌂'], ['friends', t.navFriends, '◉'], ['works', t.navWorks, '▧'], ['me', t.navMe, '◎']].map(([id, label, icon]) => <button className={active === id ? 'active' : ''} onClick={() => setActive(id)} key={id}><span>{icon}</span>{label}</button>)}</nav>
    </section>
  </main>;
}

function WorksView({ lang }: { lang: Lang }) {
  const zh = lang === 'zh';
  const [items, setItems] = useState<Generation[]>([]);
  useEffect(() => { if (isRealAuthEnabled()) void getGenerations().then(setItems).catch(() => undefined); }, []);
  return <section className="create-view"><div className="create-heading"><span className="kicker">MY WORKS</span><h1>{zh ? '我的作品' : 'Tác phẩm của tôi'}</h1><p>{zh ? '生成完成后，结果会保存在这里。' : 'Kết quả sau khi tạo sẽ được lưu ở đây.'}</p></div><div className="style-grid">{items.map((item) => <article className="style-card cyan" key={item.id}>{item.resultAssetUrl ? <img src={item.resultAssetUrl} alt="" /> : <div className="style-art"><span>{item.status === 'PROCESSING' || item.status === 'QUEUED' ? '…' : '!'}</span><div className="art-glow" /></div>}<div className="style-info"><div><h3>{item.status}</h3><p>{new Date(item.createdAt).toLocaleString()}</p></div></div></article>)}</div>{items.length === 0 && <p className="auth-error">{zh ? '暂无作品。' : 'Chưa có tác phẩm.'}</p>}</section>;
}

function StylePicker({ lang, styles, onBack, onSelect }: { lang: Lang; styles: typeof defaultStyles; onBack: () => void; onSelect: (styleId: string) => void }) {
  const zh = lang === 'zh';
  return <section className="create-view style-picker"><button className="back-button" onClick={onBack}>← {zh ? '返回首页' : 'Về trang chủ'}</button><div className="create-heading"><span className="kicker">01 / STYLE</span><h1>{zh ? '先选一个风格' : 'Chọn một phong cách'}</h1><p>{zh ? '选择你想要的 AI 版本，下一步再上传照片。' : 'Chọn phiên bản AI bạn muốn, sau đó tải ảnh lên.'}</p></div><div className="picker-grid">{styles.map(style => <button className={`picker-card ${style.tone}`} key={style.id} onClick={() => onSelect(style.id)}><div className="style-art">{style.coverUrl ? <img className="style-cover" src={style.coverUrl} alt="" /> : <span>{style.icon}</span>}<div className="art-glow" /></div><div className="picker-info"><div><h3>{zh ? style.zh : style.name}</h3><p>{style.meta}</p></div><span className="circle-arrow">↗</span></div></button>)}</div></section>;
}

function CreateView({ lang, templateId, onBack }: { lang: Lang; templateId: string; onBack: () => void }) {
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
    if (!dataUrl) { setError(zh ? '请先选择照片。' : 'Vui lòng chọn ảnh trước.'); return; }
    setBusy(true); setError('');
    try {
      const asset = await uploadImage(dataUrl);
      await createGeneration(templateId, asset.publicUrl);
      setError(zh ? '任务已提交，请稍后在作品中查看。' : 'Đã gửi tác vụ, hãy xem kết quả trong Tác phẩm.');
    } catch { setError(zh ? '生成暂时不可用，请稍后重试。' : 'Tạo ảnh tạm thời chưa khả dụng, hãy thử lại sau.'); }
    finally { setBusy(false); }
  };
  return <section className="create-view"><button className="back-button" onClick={onBack}>← {zh ? '返回风格' : 'Quay lại phong cách'}</button><div className="create-heading"><span className="kicker">SELECTED STYLE</span><h1>{zh ? '上传一张清晰的脸部照片' : 'Tải lên một ảnh rõ khuôn mặt'}</h1><p>{zh ? '光线自然、正面清晰的照片会带来更好的结果。' : 'Ảnh rõ mặt, ánh sáng tự nhiên sẽ cho kết quả tốt hơn.'}</p></div><label className="upload-zone"><div className="upload-icon">{dataUrl ? '✓' : '＋'}</div><strong>{dataUrl ? (zh ? '照片已选择' : 'Đã chọn ảnh') : (zh ? '选择照片' : 'Chọn ảnh')}</strong><span>JPG · PNG · WEBP · max 15MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} /></label><div className="cost-row"><span>{zh ? '生成成本' : 'Chi phí tạo ảnh'}</span><strong>✦ 10 Coin</strong></div>{error && <p className="auth-error">{error}</p>}<button className="primary-cta full" disabled={busy} onClick={() => void generate()}>{busy ? (zh ? '提交中…' : 'Đang gửi…') : (zh ? '开始生成' : 'Bắt đầu tạo')} <span>↗</span></button></section>;
}

createRoot(document.getElementById('app')!).render(<StrictMode><App /></StrictMode>);

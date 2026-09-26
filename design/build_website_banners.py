from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path('/Users/isaac/Desktop/zalo小程序合集/AlphaMe')
BG = Path('/Users/isaac/.codex/generated_images/01a0def8-3999-7ce3-8e97-c29499d052d5/exec-4cdb1463-2916-4151-832e-af16a270c79f.png')
OUT = ROOT / 'design'
W, H = 1250, 644

FONT_REG = '/System/Library/AssetsV2/com_apple_MobileAsset_Font8/86ba2c91f017a3749571a82f2c6d890ac7ffb2fb.asset/AssetData/PingFang.ttc'
FONT_MED = '/System/Library/Fonts/STHeiti Medium.ttc'
FONT_LATIN = '/System/Library/Fonts/Helvetica.ttc'
ACTIVE_REG = FONT_REG
ACTIVE_MED = FONT_MED

def font(size, medium=False):
    return ImageFont.truetype(ACTIVE_MED if medium else ACTIVE_REG, size)

def fit_cover(img, size):
    ratio = max(size[0] / img.width, size[1] / img.height)
    img = img.resize((round(img.width * ratio), round(img.height * ratio)), Image.Resampling.LANCZOS)
    left = (img.width - size[0]) // 2
    top = (img.height - size[1]) // 2
    return img.crop((left, top, left + size[0], top + size[1]))

def draw_round_logo(draw, xy, size=54):
    x, y = xy
    r = round(size * .28)
    draw.rounded_rectangle((x, y, x + size, y + size), radius=r, fill='#0b1040')
    # Small simplified luminous A mark, matching the project brand SVG.
    pts = [(x + size*.23, y + size*.78), (x + size*.43, y + size*.20),
           (x + size*.56, y + size*.20), (x + size*.80, y + size*.78),
           (x + size*.66, y + size*.78), (x + size*.50, y + size*.37),
           (x + size*.36, y + size*.78)]
    draw.polygon(pts, fill='#5deaff')
    draw.line((x + size*.35, y + size*.61, x + size*.66, y + size*.61), fill='#ff73d6', width=max(2, size//16))

def make(lang):
    global ACTIVE_REG, ACTIVE_MED
    ACTIVE_REG = FONT_LATIN if lang == 'vi' else FONT_REG
    ACTIVE_MED = FONT_LATIN if lang == 'vi' else FONT_MED
    bg = fit_cover(Image.open(BG).convert('RGB'), (W, H))
    canvas = bg.convert('RGBA')
    # Make the left copy area calm and readable without hiding the generated light trails.
    veil = Image.new('RGBA', (W, H), (255, 255, 255, 0))
    vd = ImageDraw.Draw(veil)
    vd.rectangle((0, 0, 585, H), fill=(249, 251, 255, 222))
    veil = veil.filter(ImageFilter.GaussianBlur(4))
    canvas.alpha_composite(veil)
    draw = ImageDraw.Draw(canvas)

    draw_round_logo(draw, (54, 42), 48)
    draw.text((116, 49), 'AlphaMe', font=font(27, True), fill='#111735')
    draw.text((117, 83), 'AI PORTRAIT STUDIO', font=font(10, True), fill='#1bbede')

    if lang == 'zh':
        eyebrow = 'ALPHAME 影像工作室'
        title = ['把你的照片，', '变成更好的自己']
        body = ['选择风格，上传一张照片。', '让 AI 为你生成独一无二的肖像。']
        cta = '立即创作'
        steps = [('01', '选择风格'), ('02', '上传照片'), ('03', '生成肖像')]
        outfile = OUT / 'alphame-website-banner-zh.png'
    else:
        eyebrow = 'ALPHAME STUDIO'
        title = ['Biến ảnh của bạn', 'thành phiên bản AI']
        body = ['Chọn phong cách, tải ảnh lên.', 'AlphaMe tạo nên điều đặc biệt dành cho bạn.']
        cta = 'Tạo ảnh ngay'
        steps = [('01', 'Chọn phong cách'), ('02', 'Tải ảnh lên'), ('03', 'Tạo chân dung')]
        outfile = OUT / 'alphame-website-banner-vi.png'

    draw.text((58, 173), eyebrow, font=font(15, True), fill='#15b8da')
    y = 211
    for line in title:
        draw.text((54, y), line, font=font(46, True), fill='#111735')
        y += 56
    y += 12
    for line in body:
        draw.text((58, y), line, font=font(18), fill='#5f6880')
        y += 29

    # CTA pill.
    bx, by, bw, bh = 56, 395, 216 if lang == 'zh' else 238, 58
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=29, fill='#15192b')
    draw.text((bx + 24, by + 17), cta, font=font(19, True), fill='#ffffff')
    ax, ay = bx + bw - 43, by + bh // 2
    draw.line((ax - 11, ay, ax + 11, ay), fill='#ffffff', width=3)
    draw.line((ax + 11, ay, ax + 2, ay - 8), fill='#ffffff', width=3)
    draw.line((ax + 11, ay, ax + 2, ay + 8), fill='#ffffff', width=3)

    # Tiny process legend, useful in a website hero and consistent with the product flow.
    sx = 58
    for i, (num, label) in enumerate(steps):
        draw.text((sx, 510), num, font=font(12, True), fill='#13badc')
        draw.text((sx + 29, 507), label, font=font(13, True), fill='#303a57')
        if i < 2:
            draw.text((sx + (112 if lang == 'zh' else 144), 505), '·', font=font(20, True), fill='#a7b3c7')
        sx += 126 if lang == 'zh' else 160

    # Subtle border for predictable placement on white webpages.
    draw.rounded_rectangle((2, 2, W - 3, H - 3), radius=24, outline=(255,255,255,170), width=2)
    canvas.convert('RGB').save(outfile, 'PNG', optimize=True)
    print(outfile)

for language in ('zh', 'vi'):
    make(language)

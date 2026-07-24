#!/usr/bin/env python3
"""生成 PWA / 桌面软件图标：Catppuccin Mocha 暗色渐变 + 发光「306」。

输出：
  icons/icon-192.png   (192x192, 标准)
  icons/icon-512.png   (512x512, 标准, 满铺背景)
  icons/icon-maskable-512.png (512x512, 满铺 + 安全区内缩)
  icons/icon.ico       (Windows, 多尺寸)
  icons/icon.svg       (矢量源, 用于文档/ favicon 备选)
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(OUT, exist_ok=True)

# ---- Catppuccin Mocha 调色板 ----
CRUST = (17, 17, 27)       # #11111b
BASE = (30, 30, 46)        # #1e1e2e
BLUE = (137, 180, 250)     # #89b4fa
LAVENDER = (180, 190, 254) # #b4befe
MAUVE = (203, 166, 247)    # #cba6f7
PINK = (245, 194, 231)     # #f5c2e7
TEAL = (148, 226, 213)     # #94e2d5


def radial_bg(size):
    """满铺暗色径向渐变：crust(外) -> base(内偏蓝)"""
    img = Image.new("RGBA", (size, size), CRUST + (255,))
    px = img.load()
    cx = cy = size / 2.0
    maxd = math.hypot(cx, cy)
    # 内圈色：base 偏蓝一点
    inner = (38, 42, 66)
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy) / maxd
            # 0..1
            t = min(1.0, d)
            # 缓动，让中心更亮
            t = t * t * (3 - 2 * t)
            r = int(CRUST[0] + (inner[0] - CRUST[0]) * (1 - t))
            g = int(CRUST[1] + (inner[1] - CRUST[1]) * (1 - t))
            b = int(CRUST[2] + (inner[2] - CRUST[2]) * (1 - t))
            px[x, y] = (r, g, b, 255)
    return img


def text_size_for(size):
    return int(size * 0.46)


def draw_306(img, size, glow=LAVENDER, fill=BLUE, scale=1.0):
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            int(text_size_for(size) * scale),
        )
    except Exception:
        font = ImageFont.load_default()

    text = "306"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]

    # 发光：多层模糊描边
    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    gd.text((x, y), text, font=font, fill=glow + (255,))
    for r in (18, 10, 4):
        blurred = glow_layer.filter(ImageFilter.GaussianBlur(r * (size / 512)))
        img.alpha_composite(blurred)

    # 主体：竖向渐变蓝->薰衣草 用叠加
    main = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    md = ImageDraw.Draw(main)
    md.text((x, y), text, font=font, fill=fill + (255,))
    # 顶部叠加一点点 mauve 高光
    hi = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.text((x, y), text, font=font, fill=MAUVE + (60,))
    img.alpha_composite(hi)
    img.alpha_composite(main)
    return img


def make_standard(size):
    img = radial_bg(size)
    draw_306(img, size, glow=LAVENDER, fill=BLUE, scale=1.0)
    return img


def make_maskable(size):
    # 满铺背景 + 内容缩进到安全区（中心 80% 半径内）
    img = radial_bg(size)
    # 安全区：文字缩放 0.78，确保任何遮罩下不被裁
    draw_306(img, size, glow=LAVENDER, fill=BLUE, scale=0.78)
    return img


def make_ico(path):
    sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = [make_standard(s) for s in sizes]
    frames[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=frames[1:],
    )


def make_svg(path, size=512):
    # 矢量源：径向渐变 + 发光 306（用于文档 / favicon 备选）
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#262a42"/>
      <stop offset="100%" stop-color="#11111b"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="14" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="{size}" height="{size}" rx="96" fill="url(#bg)"/>
  <text x="50%" y="50%" dy=".36em" text-anchor="middle"
        font-family="DejaVu Sans, Arial, sans-serif" font-weight="700"
        font-size="{int(size*0.46)}" fill="#89b4fa" filter="url(#glow)">306</text>
</svg>'''
    with open(path, "w") as f:
        f.write(svg)


def main():
    p192 = os.path.join(OUT, "icon-192.png")
    p512 = os.path.join(OUT, "icon-512.png")
    pmsk = os.path.join(OUT, "icon-maskable-512.png")
    pico = os.path.join(OUT, "icon.ico")
    psvg = os.path.join(OUT, "icon.svg")

    make_standard(192).save(p192)
    make_standard(512).save(p512)
    make_maskable(512).save(pmsk)
    make_ico(pico)
    make_svg(psvg)

    for p in (p192, p512, pmsk, pico, psvg):
        print("wrote", p, os.path.getsize(p), "bytes")


if __name__ == "__main__":
    main()

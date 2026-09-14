import os
from PIL import Image, ImageDraw, ImageFilter

SOURCE_IMG = "/Users/jotapelessa/.gemini/antigravity-ide/brain/8bae35b8-2915-44d0-b148-d822081e65a8/downloaded_app_icon.png"
RES_DIR = "/Users/jotapelessa/Documents/DEV45/SentinelaFrigate/android/app/src/main/res"

im = Image.open(SOURCE_IMG).convert("RGBA")

# Densitities and sizes
DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# 1. Generate Legacy / Standard mipmap icons
for folder, size in DENSITIES.items():
    out_dir = os.path.join(RES_DIR, folder)
    os.makedirs(out_dir, exist_ok=True)
    
    # Standard square/shaped icon
    standard_icon = im.resize((size, size), Image.Resampling.LANCZOS)
    standard_icon.save(os.path.join(out_dir, "ic_launcher.png"), "PNG")
    
    # Round icon (circle mask with anti-aliasing)
    # Generate mask at 4x for smooth anti-aliased edges
    scale = 4
    mask_size = (size * scale, size * scale)
    mask = Image.new("L", mask_size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, mask_size[0] - 1, mask_size[1] - 1), fill=255)
    mask = mask.resize((size, size), Image.Resampling.LANCZOS)
    
    round_icon = standard_icon.copy()
    # Apply circular mask to alpha channel
    r, g, b, a = round_icon.split()
    combined_alpha = Image.composite(a, Image.new("L", (size, size), 0), mask)
    round_icon.putalpha(combined_alpha)
    round_icon.save(os.path.join(out_dir, "ic_launcher_round.png"), "PNG")
    print(f"Generated {folder}/ic_launcher.png and ic_launcher_round.png ({size}x{size})")

# 2. Generate Adaptive Icon Foreground (432x432 px)
# The adaptive icon canvas is 108dp x 108dp. Safe zone is 66dp diameter circle.
# In xxxhdpi (4x), 108dp = 432px, safe zone = ~264px to 288px.
# We resize the icon to 300x300 to fit generously within safe zone without being cut off.
fg_size = 432
inner_size = 308
resized_im = im.resize((inner_size, inner_size), Image.Resampling.LANCZOS)

fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
offset = ((fg_size - inner_size) // 2, (fg_size - inner_size) // 2)
fg_canvas.paste(resized_im, offset, resized_im)

drawable_dir = os.path.join(RES_DIR, "drawable")
os.makedirs(drawable_dir, exist_ok=True)
fg_canvas.save(os.path.join(drawable_dir, "ic_launcher_foreground.png"), "PNG")
print(f"Generated drawable/ic_launcher_foreground.png ({fg_size}x{fg_size})")

# Also generate drawable-xxxhdpi/ic_launcher_foreground.png for high density specificity
xxxhdpi_drawable = os.path.join(RES_DIR, "drawable-xxxhdpi")
os.makedirs(xxxhdpi_drawable, exist_ok=True)
fg_canvas.save(os.path.join(xxxhdpi_drawable, "ic_launcher_foreground.png"), "PNG")

# 3. Generate Android TV Banner (320x180 px - 16:9 Leanback Banner)
banner_w, banner_h = 320, 180
banner = Image.new("RGBA", (banner_w, banner_h), (6, 8, 20, 255))

# Let's add a subtle obsidian gradient / vignette
for y in range(banner_h):
    for x in range(banner_w):
        dx = (x - banner_w / 2) / (banner_w / 2)
        dy = (y - banner_h / 2) / (banner_h / 2)
        dist = (dx*dx + dy*dy) ** 0.5
        # darker at edges
        dim = max(0.0, min(1.0, 1.0 - dist * 0.45))
        r = int(6 * dim)
        g = int(8 * dim)
        b = int(22 * dim)
        banner.putpixel((x, y), (r, g, b, 255))

# Center the emblem on the banner (height ~144px)
emblem_h = 144
emblem_w = int(im.width * (emblem_h / im.height))
emblem_resized = im.resize((emblem_w, emblem_h), Image.Resampling.LANCZOS)
emblem_x = (banner_w - emblem_w) // 2
emblem_y = (banner_h - emblem_h) // 2
banner.paste(emblem_resized, (emblem_x, emblem_y), emblem_resized)

banner.save(os.path.join(drawable_dir, "ic_banner.png"), "PNG")
# also save to drawable-xhdpi (default TV density)
xhdpi_drawable = os.path.join(RES_DIR, "drawable-xhdpi")
os.makedirs(xhdpi_drawable, exist_ok=True)
banner.save(os.path.join(xhdpi_drawable, "ic_banner.png"), "PNG")
print("Generated drawable/ic_banner.png and drawable-xhdpi/ic_banner.png (320x180)")

print("ALL ICONS GENERATED SUCCESSFULLY!")

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "store-assets"
RAW_SCREENSHOTS = ASSETS / "screenshots" / "raw"
SCREENSHOTS = ASSETS / "screenshots"
SOURCE = ASSETS / "source" / "generated"
PROMO = ASSETS / "promo"
ICON_PATH = ROOT / "extension" / "icons" / "icon96.png"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def save_rgb(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, "PNG", optimize=True)


def cover(image: Image.Image, size: tuple[int, int], focus_x: float = 0.5) -> Image.Image:
    target_width, target_height = size
    scale = max(target_width / image.width, target_height / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = round((resized.width - target_width) * focus_x)
    left = min(max(left, 0), resized.width - target_width)
    top = max(0, (resized.height - target_height) // 2)
    return resized.crop((left, top, left + target_width, top + target_height))


def rounded_panel(image: Image.Image, size: tuple[int, int], radius: int = 22) -> Image.Image:
    fitted = cover(image, size)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    fitted.putalpha(mask)
    return fitted


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(size[1]):
        amount = y / max(1, size[1] - 1)
        color = tuple(round(a + (b - a) * amount) for a, b in zip(top, bottom))
        for x in range(size[0]):
            pixels[x, y] = color
    return image


def make_screenshots() -> None:
    names = {
        "01-library-overview.png": "screenshot-01-library-overview.png",
        "02-pinned-sessions.png": "screenshot-02-pinned-sessions.png",
        "03-automatic-recovery.png": "screenshot-03-automatic-recovery.png",
        "04-settings.png": "screenshot-04-settings.png",
    }
    for source_name, final_name in names.items():
        source = Image.open(RAW_SCREENSHOTS / source_name)
        if source.size != (1280, 800):
            raise ValueError(f"Unexpected screenshot size for {source_name}: {source.size}")
        save_rgb(source, SCREENSHOTS / final_name)

    canvas = vertical_gradient((1280, 800), (240, 246, 255), (230, 235, 252))
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.ellipse((920, -180, 1330, 230), fill=(91, 113, 255, 32))
    draw.ellipse((690, 560, 1080, 950), fill=(132, 76, 255, 26))
    draw.rounded_rectangle((62, 62, 518, 738), radius=38, fill=(21, 35, 74, 22))

    popup = Image.open(RAW_SCREENSHOTS / "popup-raw.png").convert("RGB")
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((91, 91, 489, 709), radius=22, fill=(25, 41, 86, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow)
    canvas.paste(popup, (100, 100))

    icon = Image.open(ICON_PATH).convert("RGBA").resize((92, 92), Image.Resampling.LANCZOS)
    canvas.alpha_composite(icon, (650, 112))
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.text((650, 230), "Save now.\nRecover later.", font=font(54, True), fill=(24, 39, 82, 255), spacing=4)
    draw.text(
        (654, 370),
        "Automatic restore points, manual snapshots,\nand selective tab recovery — stored locally.",
        font=font(22),
        fill=(63, 78, 118, 255),
        spacing=8,
    )
    features = ["No account", "No cloud", "Works offline"]
    x = 650
    for feature in features:
        width = round(draw.textlength(feature, font=font(18, True))) + 38
        draw.rounded_rectangle((x, 486, x + width, 532), radius=23, fill=(255, 255, 255, 215), outline=(193, 207, 235, 255))
        draw.text((x + 19, 497), feature, font=font(18, True), fill=(42, 76, 155, 255))
        x += width + 12
    draw.text((650, 602), "SESSION SAVER", font=font(18, True), fill=(55, 105, 230, 255))
    draw.text((650, 638), "Your browser workspace, protected.", font=font(28, True), fill=(24, 39, 82, 255))
    save_rgb(canvas, SCREENSHOTS / "screenshot-05-popup-quick-save.png")


def make_small_promo() -> None:
    background = cover(Image.open(SOURCE / "small-promo-background.png").convert("RGB"), (440, 280), 0.65)
    overlay = Image.new("RGBA", background.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    for x in range(300):
        alpha = round(185 * (1 - x / 300))
        overlay_draw.line((x, 0, x, 280), fill=(9, 20, 54, alpha))
    image = Image.alpha_composite(background.convert("RGBA"), overlay)
    icon = Image.open(ICON_PATH).convert("RGBA").resize((64, 64), Image.Resampling.LANCZOS)
    image.alpha_composite(icon, (28, 28))
    draw = ImageDraw.Draw(image, "RGBA")
    draw.text((28, 112), "Session Saver", font=font(34, True), fill="white")
    draw.text((31, 160), "Recover every tab.", font=font(20), fill=(217, 229, 255, 255))
    draw.rounded_rectangle((28, 213, 174, 250), radius=18, fill=(104, 136, 255, 230))
    draw.text((49, 221), "LOCAL • PRIVATE", font=font(13, True), fill="white")
    save_rgb(image, PROMO / "small-promo-tile-440x280.png")


def make_marquee() -> None:
    background = cover(Image.open(SOURCE / "marquee-promo-background.png").convert("RGB"), (1400, 560), 0.65)
    image = background.convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    for x in range(900):
        alpha = round(215 * (1 - x / 900))
        overlay_draw.line((x, 0, x, 560), fill=(7, 17, 47, alpha))
    image = Image.alpha_composite(image, overlay)

    library = Image.open(SCREENSHOTS / "screenshot-01-library-overview.png").convert("RGB")
    panel = rounded_panel(library, (580, 363), radius=22)
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((785, 97, 1390, 485), radius=30, fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    image = Image.alpha_composite(image, shadow)
    image.alpha_composite(panel, (780, 92))

    icon = Image.open(ICON_PATH).convert("RGBA").resize((76, 76), Image.Resampling.LANCZOS)
    image.alpha_composite(icon, (62, 54))
    draw = ImageDraw.Draw(image, "RGBA")
    draw.text((158, 67), "Session Saver", font=font(36, True), fill="white")
    draw.text((62, 166), "Close the window.\nKeep the work.", font=font(55, True), fill="white", spacing=3)
    draw.text(
        (66, 316),
        "Automatic recovery points for every browser workspace.",
        font=font(21),
        fill=(213, 225, 255, 255),
    )
    pills = ["Automatic backups", "Selective restore", "Private by design"]
    x = 62
    for item in pills:
        width = round(draw.textlength(item, font=font(15, True))) + 34
        draw.rounded_rectangle(
            (x, 390, x + width, 430),
            radius=20,
            fill=(38, 75, 153, 255),
            outline=(132, 165, 239, 255),
        )
        draw.text((x + 17, 399), item, font=font(15, True), fill="white")
        x += width + 12
    save_rgb(image, PROMO / "marquee-promo-tile-1400x560.png")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--screenshots", action="store_true")
    parser.add_argument("--promos", action="store_true")
    args = parser.parse_args()
    if not args.screenshots and not args.promos:
        args.screenshots = args.promos = True
    if args.screenshots:
        make_screenshots()
    if args.promos:
        make_small_promo()
        make_marquee()


if __name__ == "__main__":
    main()

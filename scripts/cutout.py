# قص خلفية المنتج (طلب المالك: المنتج الحقيقي يتحط في مشاهد T004/T005 بدل لقطات فيها منتجات تانية)
#   - الموديل: rembg + BiRefNet (رخصة MIT — شوف studio/RULES.md: ممنوع RMBG-1.4 لأنه مش تجاري)
#   - الصور من farahegypt.com/api/store-data (المنتجات المنشورة). لكل منتج بنجرب أول 3 صور ونختار أنضف قصّة:
#     جسم واحد واضح، مش لازق في كل الحواف، ومساحته معقولة (مش فاضي ومش الصورة كلها).
#   - النتيجة في R2 farah-media: cutouts/<code>/<sig>.png + cutouts/index.json + cutouts/sheet.jpg (لوحة مراجعة بالعين).
#   - مفيش حاجة بتتنشر من هنا: Claude بيبص على اللوحة الأول، والمرفوض بيتعلّم في الفهرس (ok: false).
# التشغيل: triggers/cutout.txt → سطر codes=all أو codes=code0001,code0022 (و limit=N اختياري)
import hashlib, io, json, os, re, sys, time
import requests
from PIL import Image, ImageDraw, ImageFont

SITE = 'https://farahegypt.com'
BUCKET = os.environ.get('MEDIA_BUCKET', 'farah-media').strip()
OUT = 'out/cutouts'
os.makedirs(OUT, exist_ok=True)


def read_trigger():
    codes, limit = 'all', 0
    try:
        for line in open('triggers/cutout.txt', encoding='utf-8'):
            line = line.strip()
            if line.startswith('codes='): codes = line[6:].strip()
            if line.startswith('limit='): limit = int(line[6:].strip() or 0)
    except FileNotFoundError:
        pass
    return codes, limit


def s3():
    import boto3
    return boto3.client('s3', region_name='auto',
                        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID'].strip()}.r2.cloudflarestorage.com",
                        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'].strip(),
                        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'].strip())


def get_json(client, key):
    try:
        return json.loads(client.get_object(Bucket=BUCKET, Key=key)['Body'].read())
    except Exception:
        return None


def abs_url(u):
    if re.match(r'^https?://', u): return u
    return SITE + '/' + u.lstrip('./').lstrip('/')


def quality(rgba):
    """درجة القصّة: جسم واحد واضح في النص. بترجع (score, note)."""
    a = rgba.getchannel('A')
    w, h = a.size
    small = a.resize((128, max(1, int(128 * h / w))))
    px = small.load(); sw, sh = small.size
    solid = sum(1 for y in range(sh) for x in range(sw) if px[x, y] > 128)
    cover = solid / (sw * sh)
    if cover < 0.04: return 0, 'فاضية تقريباً'
    if cover > 0.93: return 0, 'الخلفية ماتشالتش'
    # لازق في كام حافة؟ (منتج مقصوص من الصورة الأصلية أو خلفية فاضلة)
    edges = 0
    if any(px[x, 0] > 128 for x in range(sw)): edges += 1
    if any(px[x, sh - 1] > 128 for x in range(sw)): edges += 1
    if any(px[0, y] > 128 for y in range(sh)): edges += 1
    if any(px[sw - 1, y] > 128 for y in range(sh)): edges += 1
    # حواف نص-شفافة كتير = قص مهزوز
    soft = sum(1 for y in range(sh) for x in range(sw) if 30 < px[x, y] < 220) / max(1, solid)
    score = 1.0 - 0.22 * edges - min(0.4, soft) - (0.3 if cover < 0.1 else 0)
    note = f'مساحة {cover:.0%} · حواف {edges} · طراوة {soft:.0%}'
    return max(0.0, score), note


def trim(rgba, pad=0.03, max_side=1600):
    bbox = rgba.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    if not bbox: return rgba
    im = rgba.crop(bbox)
    w, h = im.size
    p = int(max(w, h) * pad)
    canvas = Image.new('RGBA', (w + 2 * p, h + 2 * p), (0, 0, 0, 0))
    canvas.paste(im, (p, p))
    canvas.thumbnail((max_side, max_side), Image.LANCZOS)
    return canvas


def checker(w, h, s=16):
    bg = Image.new('RGB', (w, h), (245, 240, 230))
    d = ImageDraw.Draw(bg)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2: d.rectangle([x, y, x + s - 1, y + s - 1], fill=(228, 221, 208))
    return bg


def main():
    from rembg import new_session, remove
    codes, limit = read_trigger()
    sd = requests.get(SITE + '/api/store-data', timeout=60).json()
    prods = [p for p in sd['products'] if p.get('status', 'active') == 'active' and p.get('isActive') is not False]
    if codes != 'all':
        want = set(c.strip() for c in codes.split(',') if c.strip())
        prods = [p for p in prods if p['id'] in want]
    if limit: prods = prods[:limit]
    print(f'▶ {len(prods)} منتج')
    session = new_session('birefnet-general-lite')
    client = s3()
    index = get_json(client, 'cutouts/index.json') or {'items': {}}
    tiles = []
    for p in prods:
        code = p['id']
        metas = {m.get('url'): m for m in (p.get('imagesMeta') or [])}
        cands = [u for u in (p.get('images') or []) if not (metas.get(u) or {}).get('textOnImage')][:3]
        best = None
        for u in cands:
            try:
                raw = requests.get(abs_url(u), timeout=60).content
                src = Image.open(io.BytesIO(raw)).convert('RGB')
                src.thumbnail((1600, 1600), Image.LANCZOS)
                cut = remove(src, session=session, post_process_mask=True)
                score, note = quality(cut)
                print(f'  {code} {u[-40:]} → {score:.2f} ({note})')
                if not best or score > best[0]: best = (score, note, cut, u)
            except Exception as e:
                print(f'  {code} {u[-40:]} ✗ {e}')
        if not best:
            continue
        score, note, cut, u = best
        im = trim(cut)
        buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True); data = buf.getvalue()
        sig = hashlib.sha1(data).hexdigest()[:10]
        key = f'cutouts/{code}/{sig}.png'
        client.put_object(Bucket=BUCKET, Key=key, Body=data, ContentType='image/png', CacheControl='public, max-age=31536000, immutable')
        index['items'][code] = {'code': code, 'name': p.get('name', ''), 'category': p.get('category', ''), 'url': '/media/' + key,
                                'src': u, 'w': im.size[0], 'h': im.size[1], 'score': round(score, 2), 'note': note,
                                'ok': None, 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
        tiles.append((code, score, im))
    index['at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    client.put_object(Bucket=BUCKET, Key='cutouts/index.json', Body=json.dumps(index, ensure_ascii=False, indent=1).encode(),
                      ContentType='application/json', CacheControl='no-cache')
    # لوحة المراجعة: كل قصّة على مربعات عشان الشفاف يبان
    if tiles:
        T, cols = 300, 6
        rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * T, rows * (T + 34)), (255, 255, 255))
        try: font = ImageFont.truetype('DejaVuSans.ttf', 18)
        except Exception: font = ImageFont.load_default()
        for i, (code, score, im) in enumerate(tiles):
            x, y = (i % cols) * T, (i // cols) * (T + 34)
            tile = checker(T - 8, T - 8)
            t = im.copy(); t.thumbnail((T - 24, T - 24), Image.LANCZOS)
            tile.paste(t, ((T - 8 - t.size[0]) // 2, (T - 8 - t.size[1]) // 2), t)
            sheet.paste(tile, (x + 4, y + 4))
            ImageDraw.Draw(sheet).text((x + 8, y + T), f'{code}  {score:.2f}', fill=(20, 22, 58), font=font)
        buf = io.BytesIO(); sheet.save(buf, 'JPEG', quality=85)
        client.put_object(Bucket=BUCKET, Key='cutouts/sheet.jpg', Body=buf.getvalue(), ContentType='image/jpeg', CacheControl='no-cache')
    print(f'✅ {len(tiles)} قصّة → cutouts/ (اللوحة: {SITE}/media/cutouts/sheet.jpg)')


if __name__ == '__main__':
    sys.exit(main())

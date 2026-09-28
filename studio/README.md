# استوديو فرح (تجريبي)

لوحة وأدوات منفصلة تماماً عن متجر فرح ولوحة التحكم بتاعته، بتعمل:
- **صور المنتجات** مكتوب عليها الاسم واللوجو والسعر (5 أشكال)
- **صور الخصومات والعروض** (6 أشكال) و**الكوبونات** (4 أشكال)
- **كروت المتجر** وفيديوهات دعائية للمتجر نفسه (7 كروت + 6 أنواع فيديو)
- كل ده بـ **12 موسم** و**3 مقاسات**، ومن غير توكن.

القواعد كاملة في [RULES.md](RULES.md)، والبرومبتات الثابتة في [ai/PROMPTS.md](ai/PROMPTS.md).

## التشغيل على الجهاز

```bash
cd studio
npm install
npm start
```
وافتح: http://localhost:4455

محتاج Node 22 أو أحدث، وكروم أو إيدج متسطبين (الاستوديو بيلاقيهم لوحده).

## الأوامر (نفسها اللي بتشتغل على الكمبيوتر السحابي)

| الأمر | بيعمل إيه |
|---|---|
| `node cli.mjs data` | يحدّث نسخة بيانات المتجر (قراية بس) |
| `node cli.mjs render jobs/white-friday.json` | يرسم أوامر التصميم اللي في الملف |
| `node cli.mjs sheet --type sale --product code0005 --skin white-friday` | كل أشكال الخصم في صورة مجمّعة |
| `node cli.mjs skins --template coupon-ticket --data '{"code":"FARAH50","value":50}'` | قالب واحد بكل المواسم |
| `node cli.mjs video --preset why-farah --skin farah` | فيديو «ليه فرح؟» |
| `node cli.mjs video storyboards/example.json` | فيديو من سيناريو مكتوب |
| `node cli.mjs video --preset coupon-drop --voice none` | فيديو من غير صوت |
| `node cli.mjs video storyboards/sample-joy-brush.json` | **فيديو العينة الحي** (فرشاة جوي) |
| `node tools/kit-videos.mjs --plan` | يجهّز سيناريوهات فيديوهات منتجاتنا من ملفات التسويق (3 لكل منتج بزوايا مختلفة) + قايمة التصوير — **مابيرسمش** |
| `node tools/kit-videos.mjs --render --only code0009` | يرسم فيديوهات منتج معيّن من السيناريوهات الجاهزة |
| `node tools/make-sfx.mjs` | يعيد توليد المؤثرات الصوتية |
| `node tools/selftest.mjs --quick` | اختبار الاستوديو كله (من غير فيديو) |

**على الكمبيوتر السحابي:** GitHub → Actions → «استوديو فرح — فيديوهات المنتجات» → Run workflow (مقسوم على 4 أجهزة في نفس الوقت، والفيديوهات بتتنزل من Artifacts). محتاج الاستوديو والسيناريوهات يترفعوا على GitHub الأول.

الناتج كله في `out/` (الصور بالتاريخ، والفيديوهات في `out/videos`).

## مكنة الريلز والنشر المجدول (`tools/factory.mjs` — على السحابة كل ساعة)

`.github/workflows/studio-factory.yml` بيلف كل ساعة (دقيقة 7). أول خطوة `--plan` بتشوف فيه حاجة اتغيرت ولا لأ — لو مفيش، مفيش أجهزة بتقوم.
الشغل بيتقسم على 4 أجهزة: الريلز بالترتيب، ومحتوى النشر بالمفتاح (مفيش حاجة بتتعمل مرتين)، والدمج في الآخر.

| النوع | إيه | الملف على R2 (farah-media) |
|---|---|---|
| ريل المنتج | ≈17 ث طولي لكل منتج منشور | `videos/reels/<code>/<sig>.mp4` (+ `.jpg` + `-sheet.jpg`) — الفهرس `videos/reels/index.json` |
| `product-image` | صورة إعلان 4:5 بسعر المنتج الحالي زي الموقع (ومعاه عرض اليوم): قالب الخصم `sale-ribbon` لو عليه خصم، وإلا `product-bar` | `promo/product-image/<code>/<sig>.jpg` |
| `offer-reel` / `offer-image` | لكل منتج (6 بالكتير) في عرض سعر شغّال أو هيبدأ خلال يومين: العرض يخبط + السعر قبل/بعد + «العرض لحد …» (`sale-burst` للصورة) | `promo/offer-reel/<offerId>/<code>/<sig>.mp4` · `promo/offer-image/…/<sig>.jpg` |
| `coupon-reel` / `coupon-image` | لكل كوبون في `promoCoupons` (من `/api/store-data`، لو موجودة): الكود كبير + القيمة + أقل طلب + آخر يوم (`coupon-ticket` للصورة) | `promo/coupon-reel/<couponId>/<sig>.mp4` · `promo/coupon-image/<couponId>/<sig>.jpg` |

- **البصمة (sig):** من اللي بيظهر في الصورة/الفيديو بالظبط. السعر أو العرض أو الصورة يتغيروا → صورة وريل جداد لوحدهم في خلال ساعة.
- **فهرس النشر** `promo/index.json` (عام على `https://farahegypt.com/media/promo/index.json?t=…`):
  `{ at, items: { "<type>:<id>": { key, type, code?, offerId?, couponId?, title, caption, url, poster?, sheet?, sig, at, window?, products?, slug? } } }`
  المفتاح: `product-image:<code>` · `offer-reel:<offerId>:<code>` · `offer-image:<offerId>:<code>` · `coupon-reel:<couponId>` · `coupon-image:<couponId>`.
  في الدمج الفهرس بيبقى = اللي المفروض يتنشر دلوقتي بس: العرض/الكوبون اللي خلص أو اتشال، والمنتج اللي اتشال، والنسخة اللي سعرها اتغير — بيتشالوا.
- **كلام البوست:** هوك + 2–3 مميزات ✔️ + السعر + الشحن والاستبدال + اللينك + `#فرح_مصر #FarahEgypt` — من `copy/reels.json` لو موجود. مفيش «الدفع عند الاستلام» ولا الكلمات الممنوعة في `copy/phrases.json`.
- **الفيديو الدعائي** (`videoKind: 'promo'` = `/media/reel/<code>.mp4`) هو ريل المكنة نفسه، فمابيدخلش كلقطة حقيقية في ريل جديد.
- **تجربة على الجهاز** (من غير رفع): `node tools/factory.mjs --dry` (الخطة بس) · `node tools/factory.mjs --only code0013 --skip-reels --types product-image` (صورة واحدة في `out/promo/`).

## «أمر التصميم» (اللي بيتبعت للكمبيوتر السحابي)

```json
{ "template": "sale-ribbon", "skin": "white-friday", "formats": ["portrait", "story"],
  "product": "code0005", "offer": "<id عرض من المتجر — اختياري>",
  "data": { "headline": "وفّر **200 جنيه**", "endsAt": "2026-11-30" } }
```
الاسم والسعر والصورة بيتسحبوا من المتجر لوحدهم. أي حاجة في `data` بتكسب.
من اللوحة: زرار «📋 انسخ أمر التصميم» بيطلّعه جاهز.

## المفاتيح (اختياري)

انسخ `.env.example` باسم `.env` وحط المفاتيح بنفسك. من غير مفاتيح كل حاجة شغالة، والجمل بتيجي من ملفات التسويق وبنك الجمل.
على GitHub: Settings → Secrets and variables → Actions بنفس الأسماء.

## الكمبيوتر السحابي

GitHub → Actions → «استوديو فرح — رسم صور وفيديو» → Run workflow.
اختار: فيديو (نوعه والموسم) أو صور (ملف أوامر من `jobs/`). الناتج بيتنزل من صفحة التشغيل (Artifacts).

## الملفات

| المكان | إيه |
|---|---|
| `engine/` | القوالب والمواسم والمسرح (بيشتغلوا في المتصفح) |
| `lib/` | الرسم، الفيديو، الصوت، بيانات المتجر، الذكاء الاصطناعي |
| `web/` | اللوحة التجريبية |
| `brand/` | اللوجو و`brand.json` (الاسم والموقع وسطور الثقة) |
| `copy/phrases.json` | بنك الجمل والكلمات الممنوعة |
| `jobs/` · `storyboards/` | أمثلة أوامر تصميم وسيناريوهات فيديو |

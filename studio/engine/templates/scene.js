// المنتج الحقيقي (مقصوص من غير خلفية) واقف في مشهد من مكتبة المشاهد (T004/T005) — طلب المالك:
// الصورة يبقى فيها منتجنا وبس، من غير أي منتج أو أداة تانية (شوف product-visuals-exact-match).
// الداتا: cutout (PNG شفاف من cutouts/index.json)، scene (vanity | kitchen | living | desk | bedroom | car، أو فاضي = حسب الفئة)،
//         size (اختياري: طول المنتج من طول الصورة، 0.15–0.6)، category/name (لاختيار المشهد).
// القالب من غير كلام: صورة نضيفة تدخل في الريلز والبوسترات زي أي صورة منتج.
import { esc, num } from '../parts.js';

// مكان السطح في كل مشهد (نسبة من العرض والطول) وطول المنتج الطبيعي عليه — اتقاسوا بالعين على شبكة 10%
export const SCENES = {
  vanity:  { src: '/assets/scenes/vanity.jpg',  x: 50, y: 76, h: 0.40 },
  kitchen: { src: '/assets/scenes/kitchen.jpg', x: 46, y: 70, h: 0.38 },
  living:  { src: '/assets/scenes/living.jpg',  x: 47, y: 69, h: 0.33 },
  desk:    { src: '/assets/scenes/desk.jpg',    x: 46, y: 67, h: 0.34 },
  bedroom: { src: '/assets/scenes/bedroom.jpg', x: 63, y: 58, h: 0.22 },
  car:     { src: '/assets/scenes/car.jpg',     x: 50, y: 53, h: 0.20 },
};

// الفئة (والاسم) → المشهد المناسب
export function sceneFor(category = '', name = '') {
  const c = String(category), n = String(name);
  if (/السيارات|عربي/.test(c + n)) return 'car';
  if (/مطبخ|قهوة|خلاط|طبخ|شاي/.test(n)) return 'kitchen';
  if (/نوم|مخدة|وسادة|ليل/.test(n)) return 'bedroom';
  if (/إلكترونيات|راديو|سماعة|شاحن|كشاف/.test(c + n)) return 'desk';
  if (/أدوات منزلية|الصحة والرياضة|مساج|رياض/.test(c + n)) return 'living';
  return 'vanity'; // العناية (بشرة/شعر/أسنان/جسم/شخصية)
}

export const scene = [
  {
    id: 'scene-product', type: 'scene', name: 'المنتج في مشهد', desc: 'المنتج المقصوص واقف على سطح في مشهد حقيقي (حمام، مطبخ، صالة، مكتب، كومودينو، عربية) — من غير كلام', noDecor: true, noFooter: true,
    render(ctx) {
      const d = ctx.data;
      const key = SCENES[d.scene] ? d.scene : sceneFor(d.category, d.name);
      const s = SCENES[key];
      const bg = d.sceneSrc || s.src;
      const h = Math.min(0.6, Math.max(0.15, num(d.size) || s.h));
      return {
        css: `
.t-scene { position: absolute; inset: 0; overflow: hidden; background: #ddd; }
.t-scene .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.t-scene .prod { position: absolute; left: ${s.x}%; bottom: ${100 - s.y}%; width: 74%; height: ${(h * 100).toFixed(1)}%; transform: translateX(-50%); }
.t-scene .prod img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%;
  filter: drop-shadow(0 ${Math.round(14 * h / 0.4)}px ${Math.round(16 * h / 0.4)}px rgba(30,20,10,.32)) saturate(1.02); }
.t-scene .contact { position: absolute; left: 50%; bottom: -1.2%; width: 46%; height: 4.5%; transform: translateX(-50%);
  background: radial-gradient(ellipse at center, rgba(25,18,10,.42) 0%, rgba(25,18,10,.18) 45%, rgba(25,18,10,0) 72%); filter: blur(6px); }
.t-scene .warm { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 30%, rgba(255,236,205,.10), rgba(0,0,0,0) 60%); pointer-events: none; }`,
        html: `<div class="cv t-scene" data-scene="${esc(key)}">
  <img class="bg" src="${esc(bg)}" alt="">
  <div class="prod"><div class="contact"></div><img src="${esc(d.cutout || d.image || '')}" alt=""></div>
  <div class="warm"></div>
</div>`,
      };
    },
  },
];

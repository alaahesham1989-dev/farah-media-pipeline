// كل القوالب في مكان واحد. قالب جديد = ملف جديد هنا + سطر في القايمة.
import { product } from './product.js';
import { sale } from './sale.js';
import { coupon } from './coupon.js';
import { brand } from './brand.js';
import { video } from './video.js';
import { poster } from './poster.js';
import { scene } from './scene.js';

export const TYPES = [
  { id: 'product', name: 'صورة المنتج' },
  { id: 'sale', name: 'صورة الخصم' },
  { id: 'coupon', name: 'الكوبون' },
  { id: 'brand', name: 'كروت المتجر والفيديو' },
  { id: 'video', name: 'مشاهد الفيديو الحية' },
  { id: 'poster', name: 'بوسترات الإعلان (أشكال كتير)' },
  { id: 'scene', name: 'المنتج في مشهد (مقصوص)' },
];
export const TEMPLATES = [...product, ...sale, ...coupon, ...brand, ...video, ...poster, ...scene];
export const templateById = id => TEMPLATES.find(t => t.id === id);

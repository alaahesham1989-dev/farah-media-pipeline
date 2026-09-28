// كل القوالب في مكان واحد. قالب جديد = ملف جديد هنا + سطر في القايمة.
import { product } from './product.js';
import { sale } from './sale.js';
import { coupon } from './coupon.js';
import { brand } from './brand.js';
import { video } from './video.js';

export const TYPES = [
  { id: 'product', name: 'صورة المنتج' },
  { id: 'sale', name: 'صورة الخصم' },
  { id: 'coupon', name: 'الكوبون' },
  { id: 'brand', name: 'كروت المتجر والفيديو' },
  { id: 'video', name: 'مشاهد الفيديو الحية' },
];
export const TEMPLATES = [...product, ...sale, ...coupon, ...brand, ...video];
export const templateById = id => TEMPLATES.find(t => t.id === id);

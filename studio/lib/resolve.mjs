// «أمر التصميم» ممكن يقول product: "code0005" بس، وإحنا نكمّل الباقي من بيانات المتجر (صفر توكن).
// اللي مكتوب صراحة في data بيكسب دايماً.

export function offerPrice(offer, regular) {
  const v = Number(offer?.value) || 0;
  if (!offer || !regular) return null;
  if (offer.discountType === 'percent') return Math.round(regular * (1 - Math.min(v, 90) / 100));
  if (offer.discountType === 'amount') return Math.max(0, Math.round(regular - v));
  if (offer.discountType === 'price') return Math.round(v);
  return null;
}

export function productData(p, { imageIndex = 0 } = {}) {
  if (!p) return {};
  return { id: p.id, name: p.name, sub: p.sub || '', price: p.price, oldPrice: p.oldPrice || null, image: p.images?.[imageIndex] || p.images?.[0] || '' };
}

export function resolveJob(job, store) {
  const products = store?.products || [];
  const find = id => products.find(p => p.id === id);
  let data = {};
  if (job.product) data = productData(find(job.product), job);
  if (Array.isArray(job.products)) data.items = job.products.map(id => productData(find(id)));
  if (job.offer) {
    const o = (store?.offers || []).find(x => x.id === job.offer);
    if (o) {
      data.endsAt = o.endsAt;
      if (o.kind !== 'cart' && data.price) {
        const regular = data.oldPrice && data.oldPrice > data.price ? data.oldPrice : data.price;
        const np = offerPrice(o, data.price);
        if (np != null && np < data.price) { data.oldPrice = data.price; data.price = np; }
        else data.oldPrice = regular;
      }
      if (o.kind === 'cart') Object.assign(data, { minQty: o.minQty, reward: o.reward, value: o.value });
    }
  }
  return { ...job, data: { ...data, ...(job.data || {}) } };
}

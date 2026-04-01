// public/js/store.js — localStorage 数据层（替代后端 API）
const Store = (() => {
  const KEY_SPOTS   = 'jxy_user_spots';
  const KEY_REVIEWS = 'jxy_reviews';
  const KEY_HELPFUL = 'jxy_helpful';

  function _load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  function _save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ── Spots ─────────────────────────────────────────────────────
  function getAllSpots() {
    return [...SEED_SPOTS, ..._load(KEY_SPOTS)];
  }

  function getSpotById(id) {
    return getAllSpots().find(s => s.id === id) || null;
  }

  function querySpots({ category, city, q } = {}) {
    let spots = getAllSpots();
    if (category) spots = spots.filter(s => s.category === category);
    if (city)     spots = spots.filter(s => s.city === city);
    if (q) {
      const kw = q.toLowerCase();
      spots = spots.filter(s =>
        s.name.includes(kw) || s.desc.includes(kw) ||
        s.city.includes(kw) || (s.tags || []).some(t => t.includes(kw))
      );
    }
    return spots;
  }

  function addSpot(data) {
    const list = _load(KEY_SPOTS);
    const spot = {
      ...data,
      id: 'u' + Date.now(),
      rating: 0, reviewCount: 0,
      imgs: data.imgs || (data.img ? [data.img] : []),
      createdAt: new Date().toISOString()
    };
    list.push(spot);
    _save(KEY_SPOTS, list);
    return spot;
  }

  // ── Reviews ───────────────────────────────────────────────────
  function getReviews(spotId) {
    return _load(KEY_REVIEWS)
      .filter(r => r.spotId === spotId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function addReview({ spotId, author, rating, content }) {
    const reviews = _load(KEY_REVIEWS);
    const review = {
      id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6),
      spotId,
      author: (author || '游客').trim() || '游客',
      rating: Number(rating),
      content,
      createdAt: new Date().toISOString(),
      helpful: 0
    };
    reviews.push(review);
    _save(KEY_REVIEWS, reviews);

    // 更新用户添加的景点评分（种子数据保持原有评分）
    const userSpots = _load(KEY_SPOTS);
    const spot = userSpots.find(s => s.id === spotId);
    if (spot) {
      const spotRevs = reviews.filter(r => r.spotId === spotId);
      spot.rating = Math.round(spotRevs.reduce((s, r) => s + r.rating, 0) / spotRevs.length * 10) / 10;
      spot.reviewCount = spotRevs.length;
      _save(KEY_SPOTS, userSpots);
    }
    return review;
  }

  function markHelpful(reviewId) {
    const helped = _load(KEY_HELPFUL);
    if (helped.includes(reviewId)) return null; // 已点过
    const reviews = _load(KEY_REVIEWS);
    const r = reviews.find(r => r.id === reviewId);
    if (r) {
      r.helpful = (r.helpful || 0) + 1;
      _save(KEY_REVIEWS, reviews);
      helped.push(reviewId);
      _save(KEY_HELPFUL, helped);
    }
    return r;
  }

  function isHelpfulLiked(reviewId) {
    return _load(KEY_HELPFUL).includes(reviewId);
  }

  // ── Stats ─────────────────────────────────────────────────────
  function getStats() {
    const spots   = getAllSpots();
    const reviews = _load(KEY_REVIEWS);
    const cities  = [...new Set(spots.map(s => s.city))];
    return {
      totalSpots:   spots.length,
      totalReviews: reviews.length,
      totalCities:  cities.length
    };
  }

  return { getAllSpots, getSpotById, querySpots, addSpot, getReviews, addReview, markHelpful, isHelpfulLiked, getStats };
})();

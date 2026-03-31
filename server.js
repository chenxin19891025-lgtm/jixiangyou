// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 文件上传配置
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'public/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只支持图片文件'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ─── API Routes ──────────────────────────────────────────────────────────────

// 统计数据
app.get('/api/stats', (req, res) => {
  res.json(db.getStats());
});

// 景点列表
app.get('/api/spots', (req, res) => {
  const { category, city, q } = req.query;
  const spots = db.getSpots({ category, city, q });
  res.json({ success: true, data: spots, total: spots.length });
});

// 景点详情
app.get('/api/spots/:id', (req, res) => {
  const spot = db.getSpotById(req.params.id);
  if (!spot) return res.status(404).json({ success: false, message: '景点不存在' });
  res.json({ success: true, data: spot });
});

// 新增景点（带图片上传）
app.post('/api/spots', upload.array('images', 5), (req, res) => {
  try {
    const { name, category, city, address, desc, lat, lng, tags, price, openHours, phone } = req.body;
    if (!name || !category || !city) {
      return res.status(400).json({ success: false, message: '名称、分类、城市为必填项' });
    }
    const imgs = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
    const spot = db.createSpot({
      name, category, city, address, desc,
      lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      price, openHours, phone,
      img: imgs[0] || `https://picsum.photos/seed/${Date.now()}/600/400`,
      imgs
    });
    res.json({ success: true, data: spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取评价
app.get('/api/spots/:id/reviews', (req, res) => {
  const reviews = db.getReviews(req.params.id);
  res.json({ success: true, data: reviews, total: reviews.length });
});

// 发表评价
app.post('/api/spots/:id/reviews', upload.single('avatar'), (req, res) => {
  try {
    const { author, rating, content } = req.body;
    if (!rating || !content) {
      return res.status(400).json({ success: false, message: '评分和内容为必填项' });
    }
    if (content.length < 5) {
      return res.status(400).json({ success: false, message: '评价内容不能少于5个字' });
    }
    const avatar = req.file ? '/uploads/' + req.file.filename : null;
    const review = db.addReview({ spotId: req.params.id, author, rating, content, avatar });
    res.json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 标记评价有用
app.post('/api/reviews/:id/helpful', (req, res) => {
  const review = db.helpfulReview(req.params.id);
  if (!review) return res.status(404).json({ success: false, message: '评价不存在' });
  res.json({ success: true, data: review });
});

// SPA fallback（其他路径返回对应HTML）
app.get('/map', (req, res) => res.sendFile(path.join(__dirname, 'public/map.html')));
app.get('/spot/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/spot.html')));
app.get('/add', (req, res) => res.sendFile(path.join(__dirname, 'public/add.html')));

app.listen(PORT, () => {
  console.log(`\n🌿 吉乡游 JiVillage 已启动`);
  console.log(`   ➜  http://localhost:${PORT}\n`);
});

const express = require("express");
const router = express.Router();
const db = require("../db"); // knex or mysql2

// GET /api/public/pages/anasayfa
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  const locale = req.query.locale || "tr"; // default locale: tr

  try {
    const [[page]] = await db.query(
      `SELECT id FROM pages WHERE slug = ? AND is_visible = 1 LIMIT 1`,
      [slug]
    );
    if (!page) return res.status(404).json({ error: "Sayfa bulunamadı" });

    const [posts] = await db.query(
      `SELECT p.id, pt.title, pt.body_md, p.created_at
       FROM posts p
       JOIN post_translations pt ON pt.post_id = p.id
       WHERE p.page_id = ? AND p.status = 'published' AND p.is_visible = 1 AND pt.locale = ?
       ORDER BY p.created_at DESC`,
      [page.id, locale]
    );

    res.json({ page: slug, items: posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;

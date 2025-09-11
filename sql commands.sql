-- =========================
-- BUDU • Full Re-Init DDL
-- =========================

-- NOT: Üretimde DROP DATABASE kullanma. Geliştirmede istersen aç:
-- DROP DATABASE IF EXISTS BUDU;
CREATE DATABASE IF NOT EXISTS BUDU CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE BUDU;

-- 1) Temizlik: FK kapat, tablolari dogru sirayla dusur
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS post_pages;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS auth_refresh_tokens;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 2) USERS
-- server.js tarafındaki login/select uyumu icin create_at alanı da eklendi.
CREATE TABLE users (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  username           VARCHAR(100) NOT NULL UNIQUE,
  email              VARCHAR(255) NOT NULL UNIQUE,
  password           VARCHAR(255) NOT NULL,            -- bcrypt hash
  role               ENUM('admin','editor','user') NOT NULL DEFAULT 'user',
  phone              VARCHAR(32) NULL,
  membership_notify  TINYINT(1) NOT NULL DEFAULT 0,
  create_at          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, -- legacy beklenen alan
  created_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3) PAGES
-- key_slug ile sabit sayfaları (home, handbook, projects, courses, products) benzersiz tut.
CREATE TABLE pages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  slug            VARCHAR(150) NOT NULL,
  locale          VARCHAR(10)  NOT NULL DEFAULT 'tr',
  title           VARCHAR(255) NOT NULL,
  body_md         MEDIUMTEXT   NOT NULL,
  body_html_safe  MEDIUMTEXT       NULL,          -- opsiyonel basit sanitizasyon içerigi
  key_slug        VARCHAR(64)       NULL,         -- 'home','handbook','projects','courses','products'
  path            VARCHAR(255) NOT NULL DEFAULT '/',
  sort            INT NOT NULL DEFAULT 100,
  created_at      TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pages_key_slug (key_slug),
  UNIQUE KEY uq_pages_slug_locale (slug, locale),
  KEY         idx_pages_title (title),
  KEY         idx_pages_sort  (sort)
) ENGINE=InnoDB;

-- 4) MESSAGES (iletişim/geri bildirim)
CREATE TABLE messages (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100),
  email        VARCHAR(255),
  subject      VARCHAR(255),
  message      TEXT,
  is_read      TINYINT(1) NOT NULL DEFAULT 0,
  is_archived  TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP  NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_messages_flags (is_read, is_archived, created_at)
) ENGINE=InnoDB;

-- FULLTEXT (InnoDB 5.6+)
ALTER TABLE messages ADD FULLTEXT KEY ft_messages_text (name, email, subject, message);

-- 5) POSTS
CREATE TABLE posts (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  title             VARCHAR(255) NOT NULL,
  slug              VARCHAR(200) NOT NULL UNIQUE,         -- public detay /:slug
  cover_url         VARCHAR(500) NULL,
  excerpt           TEXT NULL,
  content_md        MEDIUMTEXT NOT NULL,
  content_html_safe MEDIUMTEXT NULL,                      -- opsiyonel basit sanitizasyon içerigi
  status            ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
  visibility        ENUM('public','private') NOT NULL DEFAULT 'public',
  author_id         INT NULL,                             -- users.id (yazar)
  pinned            TINYINT(1) NOT NULL DEFAULT 0,
  published_at      DATETIME NULL,                        -- planlı/yayın tarihi
  created_by        INT NULL,                             -- legacy uyum (gerekirse)
  created_at        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_posts_status_vis (status, visibility),
  KEY idx_posts_pubat      (published_at),
  KEY idx_posts_pinned     (pinned),
  KEY idx_posts_author     (author_id),
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_posts_user   FOREIGN KEY (created_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- FULLTEXT arama (q=)
ALTER TABLE posts ADD FULLTEXT KEY ft_posts (title, excerpt, content_md);

-- 6) POST <-> PAGES (çok-çok)
CREATE TABLE post_pages (
  post_id INT NOT NULL,
  page_id INT NOT NULL,
  PRIMARY KEY (post_id, page_id),
  CONSTRAINT fk_pp_post FOREIGN KEY (post_id) REFERENCES posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_pp_page FOREIGN KEY (page_id) REFERENCES pages(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7) Refresh token takibi (kullanıyorsan)
CREATE TABLE auth_refresh_tokens (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  CHAR(60) NOT NULL,       -- sadece hash sakla
  user_agent  VARCHAR(255) NULL,
  ip_addr     VARCHAR(64)  NULL,
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_art_user (user_id),
  KEY idx_art_exp  (expires_at),
  CONSTRAINT fk_art_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8) Basit XSS nötralizasyon tetikleyicileri (esas sanitizasyon uygulamada yapılmalı)
DELIMITER //
CREATE TRIGGER trg_pages_bi BEFORE INSERT ON pages
FOR EACH ROW
BEGIN
  SET NEW.body_html_safe = REPLACE(NEW.body_md, '<script', '&lt;script');
  SET NEW.body_html_safe = REPLACE(NEW.body_html_safe, '</script', '&lt;/script');
  SET NEW.body_html_safe = REPLACE(NEW.body_html_safe, 'javascript:', 'blocked:');
END//
CREATE TRIGGER trg_pages_bu BEFORE UPDATE ON pages
FOR EACH ROW
BEGIN
  SET NEW.body_html_safe = REPLACE(NEW.body_md, '<script', '&lt;script');
  SET NEW.body_html_safe = REPLACE(NEW.body_html_safe, '</script', '&lt;/script');
  SET NEW.body_html_safe = REPLACE(NEW.body_html_safe, 'javascript:', 'blocked:');
END//
CREATE TRIGGER trg_posts_bi BEFORE INSERT ON posts
FOR EACH ROW
BEGIN
  SET NEW.content_html_safe = REPLACE(NEW.content_md, '<script', '&lt;script');
  SET NEW.content_html_safe = REPLACE(NEW.content_html_safe, '</script', '&lt;/script');
  SET NEW.content_html_safe = REPLACE(NEW.content_html_safe, 'javascript:', 'blocked:');
END//
CREATE TRIGGER trg_posts_bu BEFORE UPDATE ON posts
FOR EACH ROW
BEGIN
  SET NEW.content_html_safe = REPLACE(NEW.content_md, '<script', '&lt;script');
  SET NEW.content_html_safe = REPLACE(NEW.content_html_safe, '</script', '&lt;/script');
  SET NEW.content_html_safe = REPLACE(NEW.content_html_safe, 'javascript:', 'blocked:');
END//
DELIMITER ;

-- 9) Seed • Pages (tam senin istediğin sıra & path)
INSERT INTO pages (slug, locale, title, body_md, key_slug, path, sort) VALUES
  ('home','tr','Anasayfa','',      'home','/',         10),
  ('handbook','tr','Handbook','',  'handbook','/handbook', 20),
  ('projects','tr','Projeler','',  'projects','/projects', 30),
  ('courses','tr','Dersler','',    'courses','/courses', 40),
  ('products','tr','Ürünler','',   'products','/products', 50)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  path  = VALUES(path),
  sort  = VALUES(sort);

-- 10) Seed • Admin kullanıcı (bcrypt hash: 'admin1234')
INSERT INTO users (username, email, password, role)
VALUES ('admin', 'admin@budu.local', '$2b$10$Ui8FwXrt/wW/aJG2PcYSh.E/2iMCiCTKg0phLRCTXF/df6QuOKQMe', 'admin')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role     = VALUES(role);


CREATE TABLE IF NOT EXISTS customers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(191) NOT NULL,
  phone VARCHAR(32) NULL,
  country_dial VARCHAR(8) NULL,
  membership_notify TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT * FROM customers;
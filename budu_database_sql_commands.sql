-- =========================================================
-- CLEAN RE-RUN: DROP ALL (ORDER-INSENSITIVE)
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS menu_item_translations;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS menus;

DROP TABLE IF EXISTS post_translations;
DROP TABLE IF EXISTS posts;

DROP TABLE IF EXISTS page_translations;
DROP TABLE IF EXISTS pages;

DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS auth_sessions;

DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS settings;

DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- GLOBAL CHARSET/COLLATION (MySQL 8)
-- =========================================================
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- =========================================================
-- 1) USERS
-- =========================================================
CREATE TABLE users (
  id                    BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username              VARCHAR(64)     NULL,
  email                 VARCHAR(191)    NULL,
  name                  VARCHAR(191)    NOT NULL,
  role                  ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer',
  is_active             TINYINT(1)      NOT NULL DEFAULT 1,
  password_hash         VARCHAR(255)    NOT NULL,
  must_change_password  TINYINT(1)      NOT NULL DEFAULT 0,
  token_version         INT UNSIGNED    NOT NULL DEFAULT 0,
  last_login_at         DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 2) AUTH SESSIONS (device-based refresh)
-- =========================================================
CREATE TABLE auth_sessions (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  refresh_hash  CHAR(64)       NOT NULL,
  user_agent    VARCHAR(255)   NULL,
  ip_address    VARBINARY(16)  NULL,
  created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME       NOT NULL,
  revoked_at    DATETIME       NULL,
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_auth_refresh (refresh_hash),
  KEY idx_auth_user (user_id),
  KEY idx_auth_valid (user_id, revoked_at, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 3) PAGES
-- =========================================================
CREATE TABLE pages (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug        VARCHAR(191) NOT NULL,
  is_visible  TINYINT(1)   NOT NULL DEFAULT 1,
  created_by  BIGINT UNSIGNED NULL,
  updated_by  BIGINT UNSIGNED NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pages_slug (slug),
  CONSTRAINT fk_pages_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pages_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 4) MEDIA (binary in DB)
-- =========================================================
CREATE TABLE media (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  filename    VARCHAR(255)  NOT NULL,
  mime_type   VARCHAR(100)  NOT NULL,
  byte_size   BIGINT UNSIGNED NOT NULL,
  sha256_hex  CHAR(64)      NOT NULL,
  width       INT UNSIGNED  NULL,
  height      INT UNSIGNED  NULL,
  data        LONGBLOB      NOT NULL,
  created_by  BIGINT UNSIGNED NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_sha (sha256_hex),
  CONSTRAINT fk_media_cby FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 5) MENUS
-- =========================================================
CREATE TABLE menus (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code        VARCHAR(64)   NOT NULL,
  name        VARCHAR(191)  NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_menus_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 6) MENU ITEMS (FK: menus, pages)
-- =========================================================
CREATE TABLE menu_items (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  menu_id        BIGINT UNSIGNED NOT NULL,
  parent_id      BIGINT UNSIGNED NULL,
  order_index    INT NOT NULL DEFAULT 0,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  link_type      ENUM('page','url') NOT NULL DEFAULT 'page',
  target_page_id BIGINT UNSIGNED NULL,
  url            VARCHAR(1024) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_menu_items_menu   FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_items_parent FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_items_page   FOREIGN KEY (target_page_id) REFERENCES pages(id) ON DELETE SET NULL,
  KEY idx_menu_items_menu (menu_id, parent_id, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 7) MENU ITEM TRANSLATIONS (FK: menu_items)
-- =========================================================
CREATE TABLE menu_item_translations (
  id       BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  item_id  BIGINT UNSIGNED NOT NULL,
  locale   CHAR(2)        NOT NULL,
  label    VARCHAR(255)   NOT NULL,
  CONSTRAINT fk_mit_item FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  UNIQUE KEY uq_mit_item_locale (item_id, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 8) POSTS (FK: pages, media, users)
-- =========================================================
CREATE TABLE posts (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  page_id       BIGINT UNSIGNED NOT NULL,
  media_id      BIGINT UNSIGNED NULL,
  is_visible    TINYINT(1)   NOT NULL DEFAULT 1,
  status        ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at  DATETIME     NULL,
  created_by    BIGINT UNSIGNED NULL,
  updated_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_posts_page (page_id),
  KEY idx_posts_pub  (page_id, is_visible, published_at DESC),
  CONSTRAINT fk_posts_page  FOREIGN KEY (page_id)  REFERENCES pages(id) ON DELETE CASCADE,
  CONSTRAINT fk_posts_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL,
  CONSTRAINT fk_posts_cby   FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_posts_uby   FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 9) POST TRANSLATIONS (FK: posts)
-- =========================================================
CREATE TABLE post_translations (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  post_id     BIGINT UNSIGNED NOT NULL,
  locale      CHAR(2)         NOT NULL,
  title       VARCHAR(255)    NOT NULL,
  body_md     LONGTEXT        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_post_tr_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE KEY uq_post_locale (post_id, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 10) PAGE TRANSLATIONS (FK: pages)
-- =========================================================
CREATE TABLE page_translations (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  page_id     BIGINT UNSIGNED NOT NULL,
  locale      CHAR(2)         NOT NULL,
  title       VARCHAR(255)    NOT NULL,
  body_md     LONGTEXT        NULL,
  meta_title       VARCHAR(255)  NULL,
  meta_description VARCHAR(255)  NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_page_tr_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  UNIQUE KEY uq_page_locale (page_id, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 11) CONTACT MESSAGES
-- =========================================================
CREATE TABLE contact_messages (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(191)  NOT NULL,
  email       VARCHAR(191)  NOT NULL,
  subject     VARCHAR(255)  NULL,
  content     TEXT          NOT NULL,
  is_read     TINYINT(1)    NOT NULL DEFAULT 0,
  is_archived TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_created (created_at),
  INDEX idx_contact_arch (is_archived, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 12) SETTINGS (KV)
-- =========================================================
CREATE TABLE settings (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `key`       VARCHAR(191) NOT NULL,
  `value`     JSON         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_settings_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ! 
SELECT * FROM budu.users;
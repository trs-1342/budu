-- SIFIRDAN KUR
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- FK çakışmalarına karşı (ihtiyaç olursa aç)
SET FOREIGN_KEY_CHECKS = 0;

-- Tetikleyici varsa önce kaldır (tabloyu drop’layınca da silinir ama güvenli olsun)
DROP TRIGGER IF EXISTS trg_customers_bi_fullname;

-- Tabloyu tamamen sil
DROP TABLE IF EXISTS customers;

-- Baştan oluştur
CREATE TABLE customers (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username          VARCHAR(50)     NOT NULL,
  email             VARCHAR(255)    NOT NULL,
  password          VARCHAR(255)    NOT NULL,
  fname             VARCHAR(80)     NULL,
  sname             VARCHAR(80)     NULL,
  full_name         VARCHAR(180)    NULL,
  phone             VARCHAR(24)     NULL,        -- E.164 (+905xxxxxxxxx)
  country_dial      VARCHAR(8)      NULL,        -- "+90"
  membership_notify TINYINT(1)      NOT NULL DEFAULT 0,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_email(email),
  UNIQUE KEY uq_customers_username(username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- İsteğe bağlı: full_name’i otomatik doldur
DELIMITER //
CREATE TRIGGER trg_customers_bi_fullname
BEFORE INSERT ON customers
FOR EACH ROW
BEGIN
  IF NEW.full_name IS NULL THEN
    SET NEW.full_name = CONCAT(COALESCE(NEW.fname,''), ' ', COALESCE(NEW.sname,''));
  END IF;
END//
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

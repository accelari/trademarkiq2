-- Script zum Setzen eines Users als Admin
-- Verwendung: Führe dieses Script in deiner PostgreSQL-Datenbank aus

-- User info@accelari.com als Admin markieren
UPDATE users 
SET is_admin = true, updated_at = NOW()
WHERE email = 'info@accelari.com';

-- Prüfen ob Update erfolgreich war
SELECT id, email, name, is_admin, created_at 
FROM users 
WHERE email = 'info@accelari.com';

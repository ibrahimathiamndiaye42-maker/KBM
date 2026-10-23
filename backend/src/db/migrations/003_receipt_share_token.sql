-- Lien de téléchargement non devinable, envoyé à la cliente par WhatsApp
ALTER TABLE receipts ADD COLUMN share_token TEXT;
UPDATE receipts SET share_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') WHERE share_token IS NULL;
ALTER TABLE receipts ALTER COLUMN share_token SET NOT NULL;
CREATE UNIQUE INDEX idx_receipts_share_token ON receipts(share_token);

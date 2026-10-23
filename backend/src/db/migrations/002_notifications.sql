-- Historique des notifications envoyées à l'institut (une ligne par tentative)
CREATE TABLE notifications (
  id             SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  canal          TEXT NOT NULL DEFAULT 'WHATSAPP',
  statut         TEXT NOT NULL CHECK (statut IN ('ENVOYEE', 'ECHEC', 'NON_CONFIGUREE')),
  erreur         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_reservation ON notifications(reservation_id, id DESC);

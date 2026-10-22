CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  nom           TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  telephone     TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id         SERIAL PRIMARY KEY,
  nom        TEXT NOT NULL,
  telephone  TEXT NOT NULL UNIQUE,   -- numéro normalisé (chiffres uniquement)
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE services (
  id          SERIAL PRIMARY KEY,
  nom         TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prix        INTEGER NOT NULL CHECK (prix >= 0),
  ordre       INTEGER NOT NULL DEFAULT 0,
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE packs (
  id          SERIAL PRIMARY KEY,
  nom         TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prix        INTEGER NOT NULL CHECK (prix >= 0),
  ordre       INTEGER NOT NULL DEFAULT 0,
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reservations (
  id           SERIAL PRIMARY KEY,
  client_id    INTEGER NOT NULL REFERENCES clients(id),
  service_id   INTEGER REFERENCES services(id),
  pack_id      INTEGER REFERENCES packs(id),
  item_label   TEXT NOT NULL,                 -- nom du service/pack au moment de la réservation
  date         DATE NOT NULL,
  heure        TIME NOT NULL,
  montant      INTEGER NOT NULL CHECK (montant >= 0),
  statut       TEXT NOT NULL DEFAULT 'EN_ATTENTE'
               CHECK (statut IN ('EN_ATTENTE', 'CONFIRMEE', 'ANNULEE', 'TERMINEE')),
  source       TEXT NOT NULL DEFAULT 'EN_LIGNE' CHECK (source IN ('EN_LIGNE', 'SUR_PLACE')),
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id),  -- NULL = réservation en ligne
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((service_id IS NOT NULL AND pack_id IS NULL) OR (service_id IS NULL AND pack_id IS NOT NULL))
);
CREATE INDEX idx_reservations_date ON reservations(date, heure);
CREATE INDEX idx_reservations_client ON reservations(client_id);
CREATE INDEX idx_reservations_statut ON reservations(statut);

CREATE TABLE payments (
  id             SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
  montant        INTEGER NOT NULL CHECK (montant >= 0),
  moyen          TEXT CHECK (moyen IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'AUTRE')),
  statut         TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'CONFIRME', 'REFUSE')),
  confirmed_by   INTEGER REFERENCES users(id),
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compteur annuel : garantit des numéros de reçu uniques et séquentiels
CREATE TABLE receipt_counters (
  year      INTEGER PRIMARY KEY,
  last_seq  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE receipts (
  id             SERIAL PRIMARY KEY,
  numero         TEXT NOT NULL UNIQUE,
  client_id      INTEGER NOT NULL REFERENCES clients(id),
  reservation_id INTEGER NOT NULL UNIQUE REFERENCES reservations(id),
  payment_id     INTEGER NOT NULL UNIQUE REFERENCES payments(id),
  montant        INTEGER NOT NULL,
  moyen          TEXT,
  paid_at        TIMESTAMPTZ NOT NULL,
  generated_by   INTEGER REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configuration du site (clé / valeur), modifiable depuis l'administration
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Images stockées en base : aucune dépendance à un disque local (hébergeurs éphémères)
CREATE TABLE gallery (
  id         SERIAL PRIMARY KEY,
  mime       TEXT NOT NULL,
  data       BYTEA NOT NULL,
  legende    TEXT NOT NULL DEFAULT '',
  ordre      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assets (
  key        TEXT PRIMARY KEY,       -- ex. 'logo'
  mime       TEXT NOT NULL,
  data       BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

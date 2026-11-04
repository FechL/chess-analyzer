CREATE TABLE users (
  id uuid PRIMARY KEY,
  username varchar(24) NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  password_hash text NOT NULL,
  display_name varchar(60) NOT NULL DEFAULT '',
  bio varchar(500) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_unique ON users (lower(username));
CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id ON sessions(user_id);
CREATE INDEX sessions_expires_at ON sessions(expires_at);
CREATE TABLE user_state (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key varchar(120) NOT NULL CHECK (key ~ '^kuda-[a-zA-Z0-9_.:*+-]+$'),
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, key)
);
CREATE TABLE user_imports (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, kind)
);

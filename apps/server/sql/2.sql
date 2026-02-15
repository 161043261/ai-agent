CREATE TABLE documents
(
  id         INTEGER PRIMARY KEY
    AUTOINCREMENT,
  content    TEXT NOT NULL,
  metadata   TEXT,
  embedding  TEXT NOT NULL,
  created_at DATETIME DEFAULT
                          CURRENT_TIMESTAMP
);

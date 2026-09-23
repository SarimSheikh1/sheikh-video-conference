const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbFile = path.resolve(process.env.DATABASE_FILE || 'database/sheikh.db');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new Database(dbFile);
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
 email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, profile_image TEXT, bio TEXT DEFAULT '',
 status TEXT DEFAULT 'available', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS meetings (
 id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_code TEXT NOT NULL UNIQUE, host_id INTEGER NOT NULL,
 title TEXT NOT NULL, password TEXT, scheduled_at TEXT, duration INTEGER DEFAULT 60,
 waiting_room INTEGER DEFAULT 0, locked INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(host_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS calls (
 id INTEGER PRIMARY KEY AUTOINCREMENT, caller_id INTEGER NOT NULL, receiver_id INTEGER,
 call_type TEXT CHECK(call_type IN ('voice','video','meeting')) NOT NULL, status TEXT NOT NULL,
 started_at TEXT, ended_at TEXT, duration INTEGER DEFAULT 0,
 FOREIGN KEY(caller_id) REFERENCES users(id), FOREIGN KEY(receiver_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER NOT NULL, meeting_id INTEGER NOT NULL,
 message TEXT, file_path TEXT, file_name TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(sender_id) REFERENCES users(id), FOREIGN KEY(meeting_id) REFERENCES meetings(id)
);`);
module.exports = db;

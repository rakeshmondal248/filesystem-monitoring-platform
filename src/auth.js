const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./database");

function hashPassword(password) {
    return bcrypt.hashSync(password, 12);
}

function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

function createUser(username, password) {
    const existing = db.prepare(
        "SELECT id FROM users WHERE username = ?"
    ).get(username);

    if (existing) {
        throw new Error("User already exists");
    }

    const hash = hashPassword(password);

    const result = db.prepare(`
        INSERT INTO users(username, password_hash, created_at)
        VALUES (?, ?, ?)
    `).run(
        username,
        hash,
        new Date().toISOString()
    );

    return result.lastInsertRowid;
}

function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

module.exports = {
    hashPassword,
    verifyPassword,
    createUser,
    generateToken,
    hashToken
};

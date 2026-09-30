require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const crypto = require("crypto");

const db = require("./database");

const {
    verifyPassword,
    createUser,
    generateToken,
    hashToken
} = require("./auth");

const {
    getGrowthFromHistory,
    getDirectoryGrowth,
    getPrediction,
    getHealthStatus
} = require("./intelligence");

const app = express();

const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(
  helmet({
    strictTransportSecurity: false,
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: null
      }
    }
  })
);

app.use(express.json({
    limit: "256kb"
}));

app.use(express.urlencoded({
    extended: false
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000
    }
}));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false
});

app.use("/api/auth", authLimiter);

app.use(express.static(
    path.join(__dirname, "..", "public")
));

function requireLogin(req, res, next) {

    if (!req.session.userId) {

        return res.status(401).json({
            error: "Authentication required"
        });
    }

    next();
}

function userOwnsInstance(userId, instanceId) {

    return db.prepare(`
        SELECT 1
        FROM user_instances
        WHERE user_id = ?
        AND instance_id = ?
    `).get(
        userId,
        instanceId
    );
}


/* ---------------- AUTH ---------------- */

app.post(
    "/api/auth/register",
    (req, res) => {

        const {
            username,
            password
        } = req.body;

        if (
            typeof username !== "string" ||
            typeof password !== "string"
        ) {

            return res.status(400).json({
                error: "Username and password are required"
            });
        }

        if (
            username.length < 3 ||
            password.length < 8
        ) {

            return res.status(400).json({
                error:
                    "Username must be at least 3 characters and password at least 8 characters"
            });
        }

        try {

            const userId = createUser(
                username.trim(),
                password
            );

            req.session.userId =
                Number(userId);

            res.json({
                success: true
            });

        } catch (error) {

            res.status(409).json({
                error: error.message
            });
        }
    }
);


app.post(
    "/api/auth/login",
    (req, res) => {

        const {
            username,
            password
        } = req.body;

        const user = db.prepare(`
            SELECT
                id,
                username,
                password_hash
            FROM users
            WHERE username = ?
        `).get(username);

        if (
            !user ||
            !verifyPassword(
                password,
                user.password_hash
            )
        ) {

            return res.status(401).json({
                error: "Invalid username or password"
            });
        }

        req.session.userId =
            user.id;

        res.json({
            success: true,
            username: user.username
        });
    }
);


app.post(
    "/api/auth/logout",
    (req, res) => {

        req.session.destroy(() => {

            res.json({
                success: true
            });
        });
    }
);


app.get(
    "/api/auth/me",
    requireLogin,
    (req, res) => {

        const user = db.prepare(`
            SELECT
                id,
                username
            FROM users
            WHERE id = ?
        `).get(req.session.userId);

        res.json(user);
    }
);


/* ---------------- INSTANCE CREATION ---------------- */

app.post(
    "/api/instances",
    requireLogin,
    (req, res) => {

        const {
            instanceId,
            name
        } = req.body;

        if (
            typeof instanceId !== "string" ||
            !/^i-[a-zA-Z0-9]+$/.test(instanceId)
        ) {

            return res.status(400).json({
                error: "Invalid EC2 Instance ID"
            });
        }

        const token =
            generateToken();

        const tokenHash =
            hashToken(token);

        const now =
            new Date().toISOString();

        try {

            const result = db.prepare(`
                INSERT INTO instances(
                    instance_id,
                    name,
                    expected_instance_id,
                    status,
                    created_at
                )
                VALUES (?, ?, ?, 'pending', ?)
            `).run(
                instanceId,
                name || instanceId,
                instanceId,
                now
            );

            const internalId =
                Number(
                    result.lastInsertRowid
                );

            db.prepare(`
                INSERT INTO user_instances(
                    user_id,
                    instance_id
                )
                VALUES (?, ?)
            `).run(
                req.session.userId,
                internalId
            );

            db.prepare(`
                INSERT INTO agent_tokens(
                    instance_id,
                    token_hash,
                    created_at
                )
                VALUES (?, ?, ?)
            `).run(
                internalId,
                tokenHash,
                now
            );

            res.json({
                success: true,
                instanceId,
                enrollmentToken: token
            });

        } catch (error) {

            res.status(409).json({
                error:
                    "Instance already exists or could not be created"
            });
        }
    }
);


/* ---------------- AGENT TOKEN REGENERATION ---------------- */

app.post(
    "/api/instances/:id/token",
    requireLogin,
    (req, res) => {

        const internalId =
            Number(req.params.id);

        if (
            !userOwnsInstance(
                req.session.userId,
                internalId
            )
        ) {

            return res.status(403).json({
                error: "Access denied"
            });
        }

        const instance =
            db.prepare(`
                SELECT
                    id,
                    instance_id,
                    name
                FROM instances
                WHERE id = ?
            `).get(internalId);

        if (!instance) {

            return res.status(404).json({
                error: "Instance not found"
            });
        }

        const token =
            generateToken();

        const tokenHash =
            hashToken(token);

        const now =
            new Date().toISOString();

        db.prepare(`
            UPDATE agent_tokens
            SET revoked_at = ?
            WHERE instance_id = ?
            AND revoked_at IS NULL
        `).run(
            now,
            internalId
        );

        db.prepare(`
            INSERT INTO agent_tokens(
                instance_id,
                token_hash,
                created_at
            )
            VALUES (?, ?, ?)
        `).run(
            internalId,
            tokenHash,
            now
        );

        res.json({
            success: true,
            instanceId:
                instance.instance_id,
            name:
                instance.name,
            enrollmentToken:
                token
        });
    }
);


/* ---------------- AGENT API ---------------- */

app.post(
    "/api/agent/metrics",
    (req, res) => {

        const authHeader =
            req.headers.authorization || "";

        if (
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                error: "Missing agent token"
            });
        }

        const token =
            authHeader.substring(7);

        const tokenHash =
            hashToken(token);

        const agent = db.prepare(`
            SELECT
                agent_tokens.id AS token_id,
                agent_tokens.instance_id AS internal_instance_id,
                instances.instance_id AS aws_instance_id,
                instances.expected_instance_id
            FROM agent_tokens
            JOIN instances
            ON instances.id =
                agent_tokens.instance_id
            WHERE agent_tokens.token_hash = ?
            AND agent_tokens.revoked_at IS NULL
        `).get(tokenHash);

        if (!agent) {

            return res.status(401).json({
                error: "Invalid agent token"
            });
        }

        const payload =
            req.body;

        if (
            payload.instanceId !==
            agent.expected_instance_id
        ) {

            return res.status(403).json({
                error:
                    "Instance identity verification failed"
            });
        }

        if (
            !Array.isArray(
                payload.filesystems
            ) ||
            !Array.isArray(
                payload.directories
            )
        ) {

            return res.status(400).json({
                error:
                    "Invalid metrics payload"
            });
        }

        const collectedAt =
            new Date().toISOString();

        const fsInsert = db.prepare(`
            INSERT INTO filesystem_metrics(
                instance_id,
                collected_at,
                mount,
                used_bytes,
                capacity_bytes,
                free_bytes,
                usage_percent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const dirInsert = db.prepare(`
            INSERT INTO directory_metrics(
                instance_id,
                collected_at,
                mount,
                directory_path,
                used_bytes
            )
            VALUES (?, ?, ?, ?, ?)
        `);

        const transaction =
            db.transaction(() => {

                for (
                    const fs
                    of payload.filesystems
                ) {

                    fsInsert.run(
                        agent.internal_instance_id,
                        collectedAt,
                        fs.mount,
                        Number(
                            fs.usedBytes
                        ),
                        Number(
                            fs.capacityBytes
                        ),
                        Number(
                            fs.freeBytes
                        ),
                        Number(
                            fs.usagePercent
                        )
                    );
                }

                for (
                    const dir
                    of payload.directories
                ) {

                    dirInsert.run(
                        agent.internal_instance_id,
                        collectedAt,
                        dir.mount,
                        dir.path,
                        Number(
                            dir.usedBytes
                        )
                    );
                }

                db.prepare(`
                    UPDATE instances
                    SET
                        region = ?,
                        hostname = ?,
                        status = 'online',
                        last_seen_at = ?
                    WHERE id = ?
                `).run(
                    payload.region || null,
                    payload.hostname || null,
                    collectedAt,
                    agent.internal_instance_id
                );
            });

        transaction();

        res.json({
            success: true,
            collectedAt
        });
    }
);


/* ---------------- INSTANCE LIST ---------------- */

app.get(
    "/api/instances",
    requireLogin,
    (req, res) => {

        const instances = db.prepare(`
            SELECT
                i.id,
                i.instance_id,
                i.name,
                i.region,
                i.hostname,
                i.status,
                i.last_seen_at,
                i.created_at
            FROM instances i
            JOIN user_instances ui
            ON ui.instance_id = i.id
            WHERE ui.user_id = ?

            ORDER BY
                CASE
                    WHEN i.status = 'online'
                    THEN 0
                    ELSE 1
                END,
                i.id ASC
        `).all(
            req.session.userId
        );

        res.json(instances);
    }
);


/* ---------------- DASHBOARD SUMMARY ---------------- */

app.get(
    "/api/instances/:id/summary",
    requireLogin,
    (req, res) => {

        const instanceId =
            Number(req.params.id);

        if (
            !userOwnsInstance(
                req.session.userId,
                instanceId
            )
        ) {

            return res.status(403).json({
                error: "Access denied"
            });
        }

        const instance =
            db.prepare(`
                SELECT *
                FROM instances
                WHERE id = ?
            `).get(instanceId);

        const latest =
            db.prepare(`
                SELECT *
                FROM filesystem_metrics
                WHERE instance_id = ?
                ORDER BY collected_at DESC
                LIMIT 1
            `).get(instanceId);

        const directories =
            db.prepare(`
                SELECT
                    directory_path,
                    used_bytes
                FROM directory_metrics
                WHERE instance_id = ?
                AND collected_at = (
                    SELECT MAX(collected_at)
                    FROM directory_metrics
                    WHERE instance_id = ?
                )
                ORDER BY used_bytes DESC
                LIMIT 10
            `).all(
                instanceId,
                instanceId
            );

        res.json({

            instance,

            latest,

            directories,

            name:
                instance?.name ||
                instanceId,

            capacity_gb:
                latest
                    ? Number(
                        latest.capacity_bytes || 0
                    ) / 1000000000
                    : 0,

            used_gb:
                latest
                    ? Number(
                        latest.used_bytes || 0
                    ) / 1000000000
                    : 0,

            utilization:
                latest
                    ? Number(
                        latest.usage_percent || 0
                    )
                    : 0,

            agentStatus:
                instance?.status ||
                "pending",

            lastCollection:
                latest?.collected_at ||
                instance?.last_seen_at ||
                null
        });
    }
);


/* ---------------- HISTORY ---------------- */

app.get(
    "/api/instances/:id/history",
    requireLogin,
    (req, res) => {

        const instanceId =
            Number(req.params.id);

        if (
            !userOwnsInstance(
                req.session.userId,
                instanceId
            )
        ) {

            return res.status(403).json({
                error: "Access denied"
            });
        }

        const rows =
            db.prepare(`
                SELECT
                    collected_at,
                    used_bytes,
                    capacity_bytes,
                    free_bytes,
                    usage_percent
		FROM filesystem_metrics
		WHERE instance_id = ?
		ORDER BY collected_at ASC
            `).all(instanceId);

        const history =
            rows.map(
                row => ({

                    ...row,

                    date:
                        row.collected_at,

                    used_gb:
                        Number(
                            row.used_bytes || 0
                        ) / 1000000000,

                    capacity_gb:
                        Number(
                            row.capacity_bytes || 0
                        ) / 1000000000,

                    free_gb:
                        Number(
                            row.free_bytes || 0
                        ) / 1000000000,

                    utilization:
                        Number(
                            row.usage_percent || 0
                        )
                })
            );

        res.json(history);
    }
);


/* ---------------- DIRECTORIES ---------------- */

app.get(
    "/api/instances/:id/directories",
    requireLogin,
    (req, res) => {

        const instanceId =
            Number(req.params.id);

        if (
            !userOwnsInstance(
                req.session.userId,
                instanceId
            )
        ) {

            return res.status(403).json({
                error: "Access denied"
            });
        }

        const rows =
            db.prepare(`
                SELECT
                    directory_path,
                    used_bytes
                FROM directory_metrics
                WHERE instance_id = ?
                AND collected_at = (
                    SELECT MAX(collected_at)
                    FROM directory_metrics
                    WHERE instance_id = ?
                )
                ORDER BY used_bytes DESC
                LIMIT 10
            `).all(
                instanceId,
                instanceId
            );

        const directories =
            rows.map(
                row => ({

                    path:
                        row.directory_path,

                    directory:
                        row.directory_path,

                    used_gb:
                        Number(
                            row.used_bytes || 0
                        ) / 1000000000,

                    size_gb:
                        Number(
                            row.used_bytes || 0
                        ) / 1000000000
                })
            );

        res.json(directories);
    }
);

/* ---------------- INTELLIGENCE ---------------- */

app.get(
    "/api/instances/:id/intelligence",
    requireLogin,
    (req, res) => {

        const instanceId =
            Number(req.params.id);

        if (
            !userOwnsInstance(
                req.session.userId,
                instanceId
            )
        ) {

            return res.status(403).json({
                error: "Access denied"
            });
        }

        const instance =
            db.prepare(`
                SELECT *
                FROM instances
                WHERE id = ?
            `).get(instanceId);

        if (!instance) {

            return res.status(404).json({
                error: "Instance not found"
            });
        }

        const history =
            db.prepare(`
                SELECT
                    collected_at,
                    used_bytes,
                    capacity_bytes,
                    free_bytes,
                    usage_percent
                FROM filesystem_metrics
                WHERE instance_id = ?
                ORDER BY collected_at ASC
            `).all(instanceId);

        const latest =
            history.length > 0
                ? history[history.length - 1]
                : null;

        if (!latest) {

            return res.json({

                instance: {
                    id: instance.id,
                    instance_id:
                        instance.instance_id,
                    name: instance.name,
                    hostname:
                        instance.hostname,
                    region:
                        instance.region,
                    status:
                        instance.status
                },

                current: {
                    usedGB: 0,
                    capacityGB: 0,
                    freeGB: 0,
                    utilization: 0
                },

                growth: {
                    sevenDay: {
                        available: false
                    },
                    fourteenDay: {
                        available: false
                    },
                    averageDailyGB: null
                },

                fastestGrowing: null,

                prediction: {
                    eightyPercent: {
                        available: false,
                        days: null
                    },
                    ninetyPercent: {
                        available: false,
                        days: null
                    },
                    ninetyFivePercent: {
                        available: false,
                        days: null
                    }
                },

                health: {
                    status: "UNKNOWN",
                    level: "unknown"
                },

                lastCollection: null
            });
        }

        const usedGB =
            Number(
                latest.used_bytes || 0
            ) / 1000000000;

        const capacityGB =
            Number(
                latest.capacity_bytes || 0
            ) / 1000000000;

        const freeGB =
            Number(
                latest.free_bytes || 0
            ) / 1000000000;

        const utilization =
            Number(
                latest.usage_percent || 0
            );

        const sevenDay =
            getGrowthFromHistory(
                history,
                7
            );

        const fourteenDay =
            getGrowthFromHistory(
                history,
                14
            );

        let averageDailyGB = null;

        if (
            fourteenDay.available &&
            Number.isFinite(
                fourteenDay.averageDailyGB
            )
        ) {

            averageDailyGB =
                fourteenDay.averageDailyGB;

        } else if (
            sevenDay.available &&
            Number.isFinite(
                sevenDay.averageDailyGB
            )
        ) {

            averageDailyGB =
                sevenDay.averageDailyGB;
        }

        const directoryRows =
            db.prepare(`
                SELECT
                    collected_at,
                    directory_path,
                    used_bytes
                FROM directory_metrics
                WHERE instance_id = ?
                AND mount = '/u01'
                ORDER BY
                    directory_path ASC,
                    collected_at ASC
            `).all(instanceId);

        const directoryGrowth =
            getDirectoryGrowth(
                directoryRows
            );

        const childDirectoryGrowth =
            directoryGrowth.filter(
                item =>
                    item.directory !== "/u01"
            );

        const fastestGrowing =
            childDirectoryGrowth.length > 0
                ? childDirectoryGrowth[0]
                : null;

        const prediction80 =
            getPrediction(
                usedGB,
                capacityGB,
                averageDailyGB,
                80
            );

        const prediction90 =
            getPrediction(
                usedGB,
                capacityGB,
                averageDailyGB,
                90
            );

        const prediction95 =
            getPrediction(
                usedGB,
                capacityGB,
                averageDailyGB,
                95
            );

        const health =
            getHealthStatus(
                utilization
            );

        res.json({

            instance: {
                id: instance.id,

                instance_id:
                    instance.instance_id,

                name:
                    instance.name,

                hostname:
                    instance.hostname,

                region:
                    instance.region,

                status:
                    instance.status
            },

            current: {

                usedGB:
                    Number(
                        usedGB.toFixed(2)
                    ),

                capacityGB:
                    Number(
                        capacityGB.toFixed(2)
                    ),

                freeGB:
                    Number(
                        freeGB.toFixed(2)
                    ),

                utilization:
                    Number(
                        utilization.toFixed(2)
                    )
            },

            growth: {

                sevenDay,

                fourteenDay,

                averageDailyGB
            },

            fastestGrowing,

            prediction: {

                eightyPercent:
                    prediction80,

                ninetyPercent:
                    prediction90,

                ninetyFivePercent:
                    prediction95
            },

            health,

            lastCollection:
                latest.collected_at
        });
    }
);

/* ---------------- HEALTH ---------------- */

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            status: "ok",
            service:
                "filesystem-monitor-platform",
            time:
                new Date().toISOString()
        });
    }
);


/* ---------------- FRONTEND ---------------- */

app.use(
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "..",
                "public",
                "index.html"
            )
        );
    }
);


app.listen(
    PORT,
    "127.0.0.1",
    () => {

        console.log(
            `Filesystem Monitor Platform running on 127.0.0.1:${PORT}`
        );
    }
);

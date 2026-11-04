/**
 * Host half of the Delete chat capability.
 *
 * Registers one authenticated HTTP endpoint (`POST /session-delete/delete`)
 * that permanently removes a Session's durable artifacts from this device:
 *
 * - the session directory under the JSONL persistence root
 *   (`<DSH_HOME>/sessions/--<project>--/<session-id>/`),
 * - the derived projection-cache records for that Session,
 * and then announces `api-session/removed` so every connected Client drops the
 * row immediately.
 *
 * Authentication reuses the Connection carrier's browser Peer admission, and
 * the request/response envelopes are the same `client-request` /
 * `server-response` shape the Client's generic RPC caller uses, so the Client
 * half can call it through `ctx.connection.rpc.call('/session-delete', ...)`
 * on every carrier (Web fetch or a desktop shell bridge).
 *
 * The Client half (`client.js`) is the only caller: this operation is
 * destructive and stays user-only (no agent tool).
 */

import { readdir, rm, stat, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, sep } from 'node:path';

/** HTTP route prefix owned by this plugin; the endpoint is `<prefix>/delete`. */
export const ROUTE_PATH = '/session-delete';
/** Session id path safety: ids are encoded path segments, never nested paths. */
const SESSION_ID_MAX = 512;
/** The deletion request is one small JSON object. */
const MAX_BODY_BYTES = 64 * 1024;

/** Required Host services. */
export const inject = ['connection', 'webServer', 'sessionPersistence'];

/** Resolve the persistence and storage roots this Host serves. */
export function resolveRoots(env = process.env) {
    const home = typeof env.DSH_HOME === 'string' && isAbsolute(env.DSH_HOME)
        ? env.DSH_HOME
        : join(homedir(), '.dsh');
    return {
        home,
        sessionRoot: join(home, 'sessions'),
        storagesRoot: join(home, 'storages'),
    };
}

/**
 * Encode one arbitrary session id to one safe path segment. Mirrors the JSONL
 * backend's `encodeSegment`; ids produced by the Harness (`session-<uuid>`)
 * encode to themselves.
 */
export function encodeSegment(raw) {
    if (typeof raw !== 'string' || raw.length === 0) return undefined;
    if (raw === '.') return '~002E';
    if (raw === '..') return '~002E~002E';
    let out = '';
    for (let i = 0; i < raw.length; i += 1) {
        const code = raw.charCodeAt(i);
        const ch = String.fromCharCode(code);
        if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) out += ch;
        else out += '~' + code.toString(16).toUpperCase().padStart(4, '0');
    }
    return out;
}

/**
 * Readable project directory key for one Session cwd. Mirrors the JSONL
 * backend's `projectKey`; separators collapse to `-`, unsafe code units use the
 * same `~XXXX` escape, and the segment is bounded for filesystem limits.
 */
export function projectKey(cwd) {
    if (typeof cwd !== 'string' || cwd.length === 0) return '_no-cwd';
    let readable = '';
    let separatorRun = false;
    for (let i = 0; i < cwd.length; i += 1) {
        const code = cwd.charCodeAt(i);
        const ch = String.fromCharCode(code);
        if (ch === '/' || ch === '\\' || ch === ':') {
            if (!separatorRun) readable += '-';
            separatorRun = true;
        } else if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) {
            readable += ch;
            separatorRun = false;
        } else {
            readable += '~' + code.toString(16).toUpperCase().padStart(4, '0');
            separatorRun = false;
        }
    }
    return `--${(readable.replace(/^-+/, '') || 'root').slice(0, 251)}--`;
}

/** Primary on-disk session directory for one Session. */
export function sessionDirectory(sessionRoot, cwd, sessionId) {
    const segment = encodeSegment(sessionId);
    if (segment === undefined) return undefined;
    return join(sessionRoot, projectKey(cwd), segment);
}

async function directoryExists(path) {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

/** Whether `target` stays inside `root` (defense in depth for path building). */
export function isWithin(root, target) {
    const rel = relative(root, target);
    return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel) && !rel.split(sep).includes('..');
}

/**
 * Locate one Session's directory. The deterministic path derived from the
 * stored header is authoritative; a bounded scan of the project directories is
 * a fallback for ids encoded by a different backend generation.
 */
export async function findSessionDirectory(sessionRoot, cwd, sessionId) {
    const expected = sessionDirectory(sessionRoot, cwd, sessionId);
    if (expected !== undefined) {
        if (!isWithin(sessionRoot, expected)) throw new Error(`refusing a session path outside ${sessionRoot}`);
        if (await directoryExists(expected)) return expected;
    }
    const segment = encodeSegment(sessionId);
    if (segment === undefined) return undefined;
    let entries;
    try {
        entries = await readdir(sessionRoot, { withFileTypes: true });
    } catch (error) {
        if (error?.code === 'ENOENT') return undefined;
        throw error;
    }
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const candidate = join(sessionRoot, entry.name, segment);
        if (!isWithin(sessionRoot, candidate)) continue;
        if (await directoryExists(candidate)) return candidate;
    }
    return undefined;
}

/**
 * Remove the projection-cache records for one Session. Cache records are
 * derived state: a leftover record can never resurrect a deleted Session, but
 * removing it keeps "delete" honest on disk. Best-effort by design.
 */
export async function removeProjectionCache(storagesRoot, sessionId) {
    const dir = join(storagesRoot, 'session_projcache', 'sessions');
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return [];
    }
    const removed = [];
    for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.startsWith(`${sessionId}.json`)) continue;
        try {
            await unlink(join(dir, entry.name));
            removed.push(entry.name);
        } catch {
            // Best effort: a failed cache cleanup never fails the deletion.
        }
    }
    return removed;
}

/**
 * Delete one Session's durable artifacts. Exported for direct testing.
 * @param input - roots, the Session identity, its stored cwd, and an optional logger.
 * @returns what was removed.
 */
export async function deleteChatData(input) {
    const { sessionRoot, storagesRoot, sessionId, cwd } = input;
    const logger = input.logger;
    const sessionDir = await findSessionDirectory(sessionRoot, cwd, sessionId);
    let directoryRemoved = false;
    if (sessionDir !== undefined) {
        await rm(sessionDir, { recursive: true, force: true });
        directoryRemoved = true;
    }
    const cacheFilesRemoved = await removeProjectionCache(storagesRoot, sessionId);
    logger?.info?.(`delete-chat: removed session "${sessionId}" (directory=${String(directoryRemoved)}, cacheRecords=${String(cacheFilesRemoved.length)})`);
    return { directoryRemoved, cacheFilesRemoved, sessionDir };
}

function failure(code, message, details = {}) {
    return { ok: false, error: { code, message, details } };
}

/** Validate the wire payload; returns the bare Session id or an error result. */
export function readSessionId(payload) {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        return failure('session-delete/bad-request', 'the request body must be a JSON object', {});
    }
    const raw = payload.sessionId;
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > SESSION_ID_MAX) {
        return failure('session-delete/bad-request', 'sessionId must be a non-empty string', {});
    }
    if (raw.includes('/') || raw.includes('\\') || raw === '.' || raw === '..' || raw.includes('\0')) {
        return failure('session-delete/bad-request', 'sessionId is not a valid Session identity', {});
    }
    return raw;
}

/** Read a bounded JSON body; rejects oversized or malformed requests. */
function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('request body is too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch {
                reject(new Error('request body is not JSON'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Perform one deletion for an already-admitted owner Peer. Shared by the HTTP
 * endpoint and by tests; returns the RPC result union.
 */
export async function deleteChat(ctx, sessionId, options = {}) {
    const logger = options.logger ?? ctx.logger;
    const roots = options.roots ?? resolveRoots(process.env);
    const signal = options.signal;

    let snapshot;
    let statFailure;
    try {
        snapshot = await ctx.sessionPersistence.stat(sessionId, signal === undefined ? undefined : { signal });
    } catch (error) {
        // A corrupt or unreadable log must stay deletable: fall through to the
        // directory scan instead of refusing cleanup.
        statFailure = error;
        logger?.warn?.(`delete-chat: could not read session "${sessionId}": ${String(error)}`);
    }
    if (snapshot === undefined && statFailure === undefined) {
        return failure('session/not-found', `session "${sessionId}" is not stored on this device`, { sessionId });
    }
    const header = snapshot?.header ?? {};
    if (header.origin === 'subagent') {
        return failure('session/subagent', `session "${sessionId}" is a subagent chat and is removed with its parent chat`, { sessionId });
    }

    // Stop any running work before its storage disappears. Activity providers
    // are the same seam the shipped archive flow uses; a provider failure never
    // blocks the deletion itself.
    let activity = [];
    try {
        activity = await ctx.waterfall('workspace/session-activity', { sessionId }, () => Promise.resolve([]));
    } catch (error) {
        logger?.warn?.(`delete-chat: activity probe failed for "${sessionId}": ${String(error)}`);
    }
    if (Array.isArray(activity) && activity.length > 0) {
        try {
            await ctx.parallel('workspace/session-stop', { sessionId });
        } catch (error) {
            logger?.warn?.(`delete-chat: stopping work failed for "${sessionId}": ${String(error)}`);
        }
    }

    let outcome;
    try {
        outcome = await deleteChatData({
            sessionRoot: roots.sessionRoot,
            storagesRoot: roots.storagesRoot,
            sessionId,
            cwd: header.cwd,
            logger,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger?.warn?.(`delete-chat: deletion failed for "${sessionId}": ${message}`);
        return failure('session-delete/failed', message, { sessionId });
    }

    if (snapshot === undefined && !outcome.directoryRemoved) {
        return failure('session/not-found', `session "${sessionId}" is not stored on this device`, { sessionId });
    }

    ctx.emit('api-session/removed', sessionId);
    return {
        ok: true,
        value: {
            sessionId,
            directoryRemoved: outcome.directoryRemoved,
            cacheRecordsRemoved: outcome.cacheFilesRemoved.length,
            stoppedActivities: Array.isArray(activity) ? activity.length : 0,
        },
    };
}

/** Shape one `server-response` envelope for the Client's generic RPC caller. */
function sendResult(res, status, rpcId, result) {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ type: 'server-response', rpcId, result }));
}

/**
 * Install the Host half: one authenticated HTTP route owned by this plugin
 * fiber. The Client half calls `POST /session-delete/delete` through
 * `ctx.connection.rpc.call('/session-delete', 'delete', { sessionId })`.
 */
export function apply(ctx) {
    const logger = ctx.logger;
    const route = {
        kind: 'prefix',
        path: ROUTE_PATH,
        async handler(req, res) {
            // Same admission the shipped /api carrier uses: Host/Origin trust
            // plus the signed browser (or API) credential.
            let admission;
            try {
                admission = ctx.connection.admit(req);
            } catch (error) {
                res.writeHead(403);
                res.end('forbidden');
                return;
            }
            if ('rejection' in admission) {
                res.writeHead(admission.rejection);
                res.end(admission.rejection === 401 ? 'unauthorized' : 'forbidden');
                return;
            }
            if (req.method !== 'POST') {
                res.writeHead(405);
                res.end();
                return;
            }
            let pathname;
            try {
                pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
            } catch {
                res.writeHead(400);
                res.end();
                return;
            }
            if (pathname !== `${ROUTE_PATH}/delete`) {
                res.writeHead(404);
                res.end();
                return;
            }
            if (admission.peer.principal.kind !== 'owner') {
                sendResult(res, 200, 'refused', failure('session-delete/forbidden', 'only the owner of this Harness may delete chats', {}));
                return;
            }
            let body;
            try {
                body = await readJsonBody(req);
            } catch (error) {
                sendResult(res, 200, 'invalid-request', failure('gateway/bad-request', error instanceof Error ? error.message : String(error), {}));
                return;
            }
            const rpcId = typeof body?.rpcId === 'string' ? body.rpcId : 'invalid-request';
            if (body?.type !== 'client-request' || body?.method !== 'delete') {
                sendResult(res, 200, rpcId, failure('gateway/bad-request', 'invalid client-request envelope', {}));
                return;
            }
            const sessionId = readSessionId(body.payload);
            if (typeof sessionId !== 'string') {
                sendResult(res, 200, rpcId, sessionId);
                return;
            }
            try {
                const result = await deleteChat(ctx, sessionId, { logger });
                sendResult(res, 200, rpcId, result);
            } catch (error) {
                sendResult(res, 200, rpcId, failure('session-delete/failed', error instanceof Error ? error.message : String(error), { sessionId }));
            }
        },
    };
    ctx.effect(() => ctx.webServer.register(route), 'delete-chat: session-delete route');
}

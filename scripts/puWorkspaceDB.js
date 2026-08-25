/* ── Enhanced-mode workspace storage (IndexedDB) ────────────────────────
   Workspaces are auto-saved here with a rendered thumbnail so the
   Workspaces tab can show a visual gallery. All externally added images
   already live inside the payload as base64 data URLs, so a record is a
   fully portable JSON document. */

const DB_NAME = 'draw-a-squan-pu';
const DB_VERSION = 1;
const WS_STORE = 'workspaces';

let dbPromise = null;

function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(WS_STORE)) {
                const store = db.createObjectStore(WS_STORE, { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

/* Runs fn(store) inside a short-lived transaction.
   - If fn returns an IDBRequest, we resolve with that request's result.
   - Otherwise (aggregating reads like listWorkspaces) we resolve with
     fn's return value once the whole transaction completes. */
function runStore(mode, fn) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(WS_STORE, mode);
        const req = fn(tx.objectStore(WS_STORE));
        if (req && typeof req.addEventListener === 'function') {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        } else {
            tx.oncomplete = () => resolve(req);
        }
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    }));
}

export function listWorkspaces() {
    return runStore('readonly', store => {
        const rows = [];
        const cur = store.openCursor();
        cur.onsuccess = () => {
            const c = cur.result;
            if (c) { rows.push(c.value); c.continue(); }
        };
        return rows;
    }).then(rows => rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
}

export function getWorkspace(id) {
    return runStore('readonly', store => store.get(id));
}

export function putWorkspace(record) {
    return runStore('readwrite', store => store.put(record));
}

export function deleteWorkspace(id) {
    return runStore('readwrite', store => store.delete(id));
}

export function clearWorkspaces() {
    return runStore('readwrite', store => store.clear());
}

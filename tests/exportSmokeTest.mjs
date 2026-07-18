import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';

const PORT = Number(process.env.EXPORT_SMOKE_PORT || 4197);
const DEBUG_PORT = Number(process.env.EXPORT_SMOKE_DEBUG_PORT || 9237);
const CHROME = process.env.CHROME_BIN || 'google-chrome';
const TIMEOUT_MS = 120000;
const PERSIST = process.argv.includes('--persist') || process.argv.includes('-persist');
const ARTIFACT_DIR = process.env.EXPORT_SMOKE_ARTIFACT_DIR || join(tmpdir(), `sq1-export-smoke-artifacts-${Date.now()}`);
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const liveReportState = { style: '', section: '' };

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function once(emitter, event) {
    return new Promise(resolve => emitter.once(event, resolve));
}

function createStaticServer(root) {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
            if (req.method === 'POST' && url.pathname === '/__export-smoke-report') {
                let body = '';
                req.setEncoding('utf8');
                for await (const chunk of req) body += chunk;
                printLiveRecord(JSON.parse(body));
                res.writeHead(204);
                res.end();
                return;
            }
            let pathname = decodeURIComponent(url.pathname);
            if (pathname === '/') pathname = '/index.html';
            const filePath = join(root, pathname);
            const data = await import('node:fs/promises').then(fs => fs.readFile(filePath));
            const ext = filePath.split('.').pop();
            const types = {
                css: 'text/css',
                html: 'text/html',
                js: 'text/javascript',
                json: 'application/json',
                svg: 'image/svg+xml',
                ico: 'image/x-icon',
                ttf: 'font/ttf',
            };
            res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
            res.end(data);
        } catch (err) {
            res.writeHead(404, { 'content-type': 'text/plain' });
            res.end(String(err.message || err));
        }
    });
    return new Promise(resolve => {
        server.listen(PORT, '127.0.0.1', () => resolve(server));
    });
}

async function waitForJson(url, timeoutMs = 15000) {
    const start = Date.now();
    let lastError;
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
        } catch (err) {
            lastError = err;
        }
        await sleep(150);
    }
    throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'no response'}`);
}

class CdpSocket {
    constructor(socket) {
        this.socket = socket;
        this.buffer = Buffer.alloc(0);
        this.nextId = 1;
        this.pending = new Map();
        socket.on('data', chunk => this.handleData(chunk));
        socket.on('error', err => {
            for (const { reject } of this.pending.values()) reject(err);
            this.pending.clear();
        });
    }

    static async connect(wsUrl) {
        const url = new URL(wsUrl);
        const socket = net.connect(Number(url.port), url.hostname);
        await once(socket, 'connect');
        const key = randomBytes(16).toString('base64');
        socket.write([
            `GET ${url.pathname}${url.search} HTTP/1.1`,
            `Host: ${url.host}`,
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Key: ${key}`,
            'Sec-WebSocket-Version: 13',
            '',
            '',
        ].join('\r\n'));

        let header = Buffer.alloc(0);
        while (!header.includes('\r\n\r\n')) {
            header = Buffer.concat([header, await once(socket, 'data')]);
        }
        const headerText = header.toString('utf8');
        if (!headerText.startsWith('HTTP/1.1 101')) {
            throw new Error(`WebSocket upgrade failed: ${headerText.split('\r\n')[0]}`);
        }
        const accept = createHash('sha1')
            .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
            .digest('base64');
        if (!headerText.includes(`Sec-WebSocket-Accept: ${accept}`)) {
            throw new Error('WebSocket accept key mismatch');
        }
        const client = new CdpSocket(socket);
        const remainder = header.subarray(header.indexOf('\r\n\r\n') + 4);
        if (remainder.length) client.handleData(remainder);
        return client;
    }

    send(method, params = {}) {
        const id = this.nextId++;
        const payload = JSON.stringify({ id, method, params });
        this.socket.write(encodeClientFrame(Buffer.from(payload)));
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`CDP ${method} timed out`));
            }, TIMEOUT_MS);
            this.pending.set(id, { resolve, reject, timeout });
        });
    }

    close() {
        this.socket.end();
    }

    handleData(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        while (true) {
            const frame = decodeServerFrame(this.buffer);
            if (!frame) return;
            this.buffer = this.buffer.subarray(frame.bytes);
            if (frame.opcode === 8) {
                this.socket.end();
                return;
            }
            if (frame.opcode !== 1) continue;
            const msg = JSON.parse(frame.payload.toString('utf8'));
            if (!msg.id || !this.pending.has(msg.id)) continue;
            const pending = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            clearTimeout(pending.timeout);
            if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
            else pending.resolve(msg.result);
        }
    }
}

function encodeClientFrame(payload) {
    const len = payload.length;
    const mask = randomBytes(4);
    const header = len < 126
        ? Buffer.from([0x81, 0x80 | len])
        : len < 65536
            ? Buffer.from([0x81, 0x80 | 126, len >> 8, len & 0xff])
            : (() => {
                const h = Buffer.alloc(10);
                h[0] = 0x81;
                h[1] = 0x80 | 127;
                h.writeBigUInt64BE(BigInt(len), 2);
                return h;
            })();
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
    return Buffer.concat([header, mask, masked]);
}

function decodeServerFrame(buffer) {
    if (buffer.length < 2) return null;
    const opcode = buffer[0] & 0x0f;
    const masked = Boolean(buffer[1] & 0x80);
    let len = buffer[1] & 0x7f;
    let offset = 2;
    if (len === 126) {
        if (buffer.length < 4) return null;
        len = buffer.readUInt16BE(2);
        offset = 4;
    } else if (len === 127) {
        if (buffer.length < 10) return null;
        len = Number(buffer.readBigUInt64BE(2));
        offset = 10;
    }
    const mask = masked ? buffer.subarray(offset, offset + 4) : null;
    if (masked) offset += 4;
    if (buffer.length < offset + len) return null;
    const payload = Buffer.from(buffer.subarray(offset, offset + len));
    if (masked) {
        for (let i = 0; i < len; i++) payload[i] ^= mask[i % 4];
    }
    return { opcode, payload, bytes: offset + len };
}

async function evaluate(cdp, expression) {
    const result = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
        timeout: TIMEOUT_MS,
    });
    if (result.exceptionDetails) {
        const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
        throw new Error(text);
    }
    return result.result.value;
}

function safeArtifactName(name) {
    return name
        .replace(/[^a-z0-9._-]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120);
}

async function persistArtifacts(result, profileDir) {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    const manifest = {
        createdAt: new Date().toISOString(),
        profileDir,
        results: [],
        skipped: result.skipped,
        failures: result.failures,
    };

    for (const [index, record] of result.results.entries()) {
        if (!record.base64) continue;
        const ext = record.extension || record.filename?.split('.').pop() || 'bin';
        const filename = `${String(index + 1).padStart(3, '0')}-${safeArtifactName(record.name)}.${ext}`;
        const filePath = join(ARTIFACT_DIR, filename);
        await writeFile(filePath, Buffer.from(record.base64, 'base64'));
        manifest.results.push({
            name: record.name,
            kind: record.kind,
            size: record.size,
            type: record.type,
            artifact: filename,
        });
    }

    await writeFile(join(ARTIFACT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Persisted export smoke artifacts in ${ARTIFACT_DIR}`);
}

function lineFor(record) {
    if (record.status === 'passed') {
        return `${GREEN}${record.label}: Passed${RESET}`;
    }
    if (record.status === 'failed') {
        return `${RED}${record.label}: Failed - ${record.error}${RESET}`;
    }
    return `${YELLOW}${record.label}: Skipped - ${record.reason}${RESET}`;
}

function sectionTitle(record) {
    if (record.section === 'normal' && record.kind === 'download') return 'Normal: Export';
    if (record.section === 'normal' && record.kind === 'clipboard') return 'Normal: Clipboard';
    if (record.section === 'bulk') return 'Bulk:';
    return record.section || 'Other:';
}

function printLiveRecord(record) {
    if (record.style !== liveReportState.style) {
        if (liveReportState.style) console.log('');
        liveReportState.style = record.style;
        liveReportState.section = '';
        console.log(`${BOLD}${record.style}:${RESET}`);
    }
    const section = sectionTitle(record);
    if (section !== liveReportState.section) {
        liveReportState.section = section;
        console.log(section);
    }
    console.log(lineFor(record));
}

function printSummary(result) {
    const passed = result.results.length;
    const failed = result.failures.length;
    const skipped = result.skipped.length;
    const summaryColor = failed ? RED : GREEN;
    if (liveReportState.style) console.log('');
    console.log(`${summaryColor}${passed} passed, ${failed} failed, ${skipped} skipped.${RESET}`);
}

async function main() {
    const root = new URL('../public/', import.meta.url).pathname;
    const server = await createStaticServer(root);
    const profileDir = join(tmpdir(), `sq1-export-smoke-${Date.now()}`);
    await mkdir(profileDir, { recursive: true });
    const chrome = spawn(CHROME, [
        '--headless=new',
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${profileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--enable-unsafe-swiftshader',
        `http://127.0.0.1:${PORT}`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let cdp;
    try {
        await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        const pages = await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        const page = pages.find(item => item.type === 'page');
        if (!page) throw new Error('Chrome did not expose a page target');
        cdp = await CdpSocket.connect(page.webSocketDebuggerUrl);
        await cdp.send('Runtime.enable');
        await cdp.send('Page.enable');
        await cdp.send('Page.bringToFront');
        await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
        await sleep(1500);

        const result = await evaluate(cdp, `(${browserSmoke.toString()})(${JSON.stringify({ persist: PERSIST })})`);
        printSummary(result);
        if (result.failures.length) process.exitCode = 1;
        if (PERSIST) await persistArtifacts(result, profileDir);
    } finally {
        cdp?.close();
        if (!chrome.killed) {
            chrome.kill('SIGTERM');
            await Promise.race([
                once(chrome, 'exit'),
                sleep(3000).then(() => {
                    if (!chrome.killed) chrome.kill('SIGKILL');
                }),
            ]);
        }
        server.close();
        if (PERSIST) {
            console.log(`Kept Chrome profile in ${profileDir}`);
        } else {
            for (let i = 0; i < 5; i++) {
                try {
                    await rm(profileDir, { recursive: true, force: true });
                    break;
                } catch (err) {
                    if (i === 4) throw err;
                    await sleep(250);
                }
            }
        }
    }
}

async function browserSmoke(options = {}) {
    const SAMPLE_INPUT = '0,0';
    const BULK_INPUTS = ['0', '10 U4 -10', "10 U' e D -10"];
    const formats = ['svg', 'png', 'jpeg', 'bmp'];
    const layers = ['both', 'top', 'bottom'];
    const results = [];
    const failures = [];
    const skipped = [];

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitFor(predicate, label, timeoutMs = 30000) {
        const start = performance.now();
        while (performance.now() - start < timeoutMs) {
            if (predicate()) return;
            await delay(50);
        }
        throw new Error(`Timed out waiting for ${label}`);
    }

    window.__exportSmokeDownloads = [];
    window.__exportSmokeClipboards = [];

    function bytesToBase64(bytes) {
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
        }
        return btoa(binary);
    }

    async function blobRecord(blob, filename = '') {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const isText = blob.type.includes('svg') || blob.type.startsWith('text/') || filename.endsWith('.svg');
        return {
            filename,
            type: blob.type,
            size: blob.size,
            head: Array.from(bytes.slice(0, 16)),
            textHead: new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 256))),
            text: isText ? new TextDecoder().decode(bytes) : '',
            base64: options.persist ? bytesToBase64(bytes) : '',
        };
    }

    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function patchedClick() {
        if (this.download && this.href) {
            const filename = this.download;
            const href = this.href;
            window.__exportSmokeDownloads.push((async () => {
                const blob = await fetch(href).then(r => r.blob());
                return blobRecord(blob, filename);
            })());
            return;
        }
        return originalClick.call(this);
    };

    class SmokeClipboardItem {
        constructor(items) {
            this.items = items;
            this.types = Object.keys(items);
        }

        async getType(type) {
            const value = this.items[type];
            return await value;
        }
    }

    window.ClipboardItem = SmokeClipboardItem;
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
            async writeText(text) {
                const blob = new Blob([text], { type: 'text/plain' });
                const record = await blobRecord(blob, 'clipboard.svg');
                window.__exportSmokeClipboards.push({
                    method: 'writeText',
                    types: ['text/plain'],
                    ...record,
                });
            },
            async write(items) {
                const itemRecords = [];
                for (const item of items) {
                    const types = item.types || Object.keys(item.items || {});
                    for (const type of types) {
                        const blob = await item.getType(type);
                        itemRecords.push(await blobRecord(blob, `clipboard.${type.split('/').pop() || 'bin'}`));
                    }
                }
                const primary = itemRecords[0] || { size: 0, head: [], type: '', base64: '' };
                window.__exportSmokeClipboards.push({
                    method: 'write',
                    types: itemRecords.map(record => record.type),
                    itemRecords,
                    ...primary,
                });
            },
        },
    });

    window.__exportSmokeErrors = [];
    const originalError = console.error;
    console.error = (...args) => {
        window.__exportSmokeErrors.push(args.map(arg => String(arg?.stack || arg?.message || arg)).join(' '));
        originalError(...args);
    };

    await waitFor(() => document.getElementById('svg-style-select')?.options.length >= 3, 'app init');

    const styleSelect = document.getElementById('svg-style-select');
    const styles = [...styleSelect.options].map(option => ({
        index: option.value,
        name: option.textContent.trim(),
    }));

    async function setStyle(style) {
        styleSelect.value = style.index;
        styleSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await delay(250);
    }

    function setInput(value) {
        const input = document.getElementById('scramble-input');
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    async function setFormat(format) {
        const btn = document.querySelector(`.export-tab[data-group="fmt"][data-val="${format}"]`);
        if (!btn || btn.offsetParent === null || btn.disabled) return false;
        btn.click();
        await delay(80);
        return true;
    }

    async function setLayer(layer) {
        const btn = document.querySelector(`.export-tab[data-group="layer"][data-val="${layer}"]`);
        if (!btn || btn.offsetParent === null || btn.disabled) return false;
        btn.click();
        await delay(80);
        return true;
    }

    async function takeDownload(action) {
        const before = window.__exportSmokeDownloads.length;
        const beforeErrors = window.__exportSmokeErrors.length;
        await action();
        await waitFor(() => {
            const warnOpen = document.getElementById('bulk-warn-overlay')?.classList.contains('open');
            return warnOpen || window.__exportSmokeDownloads.length > before || window.__exportSmokeErrors.length > beforeErrors;
        }, 'download');
        if (document.getElementById('bulk-warn-overlay')?.classList.contains('open')) {
            document.getElementById('bulk-warn-proceed').click();
            await waitFor(() => window.__exportSmokeDownloads.length > before || window.__exportSmokeErrors.length > beforeErrors, 'download after warning');
        }
        if (window.__exportSmokeErrors.length > beforeErrors && window.__exportSmokeDownloads.length === before) {
            throw new Error(window.__exportSmokeErrors.at(-1));
        }
        return await window.__exportSmokeDownloads.at(-1);
    }

    async function takeClipboard(action) {
        const before = window.__exportSmokeClipboards.length;
        const beforeErrors = window.__exportSmokeErrors.length;
        await action();
        await waitFor(() => window.__exportSmokeClipboards.length > before || window.__exportSmokeErrors.length > beforeErrors, 'clipboard');
        if (window.__exportSmokeErrors.length > beforeErrors && window.__exportSmokeClipboards.length === before) {
            throw new Error(window.__exportSmokeErrors.at(-1));
        }
        return window.__exportSmokeClipboards.at(-1);
    }

    async function assertRenderableSvg(record) {
        const parsed = new DOMParser().parseFromString(record.text, 'image/svg+xml');
        const parserError = parsed.querySelector('parsererror');
        if (parserError) {
            throw new Error(`SVG XML parse failed: ${parserError.textContent.trim().replace(/\s+/g, ' ').slice(0, 180)}`);
        }

        await new Promise((resolve, reject) => {
            const url = URL.createObjectURL(new Blob([record.text], { type: 'image/svg+xml;charset=utf-8' }));
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                if (!(img.naturalWidth || img.width) || !(img.naturalHeight || img.height)) {
                    reject(new Error('SVG image loaded with empty dimensions'));
                } else {
                    resolve();
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('SVG image failed to load'));
            };
            img.src = url;
        });
    }

    async function assertBlob(record, expected) {
        if (!record) throw new Error('No output blob was captured');
        if (!record.size) throw new Error('Output blob is empty');
        if (expected === 'svg') {
            if (!record.textHead.includes('<svg')) throw new Error(`SVG output does not start like SVG: ${record.textHead.slice(0, 40)}`);
            await assertRenderableSvg(record);
        } else if (expected === 'png') {
            if (record.head[0] !== 0x89 || record.head[1] !== 0x50 || record.head[2] !== 0x4e || record.head[3] !== 0x47) {
                throw new Error(`PNG magic missing in ${record.filename}`);
            }
        } else if (expected === 'jpeg') {
            if (record.head[0] !== 0xff || record.head[1] !== 0xd8) throw new Error(`JPEG magic missing in ${record.filename}`);
        } else if (expected === 'bmp') {
            if (record.head[0] !== 0x42 || record.head[1] !== 0x4d) throw new Error(`BMP magic missing in ${record.filename}`);
        } else if (expected === 'zip' || expected === 'xlsx') {
            if (record.head[0] !== 0x50 || record.head[1] !== 0x4b) throw new Error(`ZIP/XLSX magic missing in ${record.filename}`);
        }
    }

    async function assertClipboard(record, expected) {
        await assertBlob(record, expected);
        if (expected === 'svg') {
            if (record.method !== 'writeText') throw new Error(`SVG clipboard used ${record.method}, expected writeText`);
            if (!record.text.includes('<svg')) throw new Error('SVG clipboard text is missing SVG markup');
        } else if (expected === 'png') {
            if (record.method !== 'write') throw new Error(`Image clipboard used ${record.method}, expected write`);
            if (!record.types.includes('image/png')) throw new Error(`Clipboard image type missing image/png: ${record.types.join(', ')}`);
        }
    }

    function caseMeta(style, section, kind, label) {
        return { style: style.name, section, kind, label };
    }

    async function emit(record) {
        try {
            await fetch('/__export-smoke-report', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(record),
            });
        } catch {
            // The returned summary still contains the result if live reporting fails.
        }
    }

    async function pass(meta, record, expected, extension = expected === 'jpeg' ? 'jpg' : expected) {
        const result = {
            ...meta,
            status: 'passed',
            name: `${meta.style} ${meta.section} ${meta.kind} ${meta.label}`,
            size: record.size,
            type: record.type,
            filename: record.filename,
            extension,
            base64: record.base64,
        };
        results.push(result);
        await emit(result);
    }

    async function fail(meta, error) {
        const result = {
            ...meta,
            status: 'failed',
            name: `${meta.style} ${meta.section} ${meta.kind} ${meta.label}`,
            error: String(error?.message || error),
        };
        failures.push(result);
        await emit(result);
    }

    async function skip(meta, reason) {
        const result = {
            ...meta,
            status: 'skipped',
            name: `${meta.style} ${meta.section} ${meta.kind} ${meta.label}`,
            reason,
        };
        skipped.push(result);
        await emit(result);
    }

    async function runCase(meta, expected, fn) {
        try {
            const record = await fn();
            await assertBlob(record, expected);
            await pass(meta, record, expected);
        } catch (err) {
            await fail(meta, err);
        }
    }

    async function runClipboardCase(meta, expected, fn) {
        try {
            const record = await fn();
            await assertClipboard(record, expected);
            await pass(meta, record, expected, expected === 'svg' ? 'svg' : 'png');
        } catch (err) {
            await fail(meta, err);
        }
    }

    function copyButtonVisible() {
        const btn = document.getElementById('do-copy');
        return Boolean(btn && btn.style.display !== 'none' && !btn.disabled);
    }

    async function prepareBulkXlsx() {
        const file = new File([BULK_INPUTS.join('\n')], 'export-smoke.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const input = document.getElementById('bulk-xlsx-file');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async function openBulkModal() {
        document.getElementById('bulk-export-btn').click();
        await waitFor(() => document.getElementById('bulk-modal-overlay').classList.contains('open'), 'bulk modal');
    }

    function closeBulkModal() {
        document.getElementById('bulk-modal-overlay').classList.remove('open');
    }

    for (const style of styles) {
        await setStyle(style);
        setInput(SAMPLE_INPUT);
        const is3D = style.name.includes('(3D)');

        for (const format of formats) {
            const available = await setFormat(format);
            if (!available || (is3D && format === 'svg')) {
                await skip(caseMeta(style, 'normal', 'download', format), 'unavailable');
                continue;
            }

            const layerList = is3D ? ['both'] : layers;
            for (const layer of layerList) {
                if (!is3D && !await setLayer(layer)) {
                    await skip(caseMeta(style, 'normal', 'download', `${format} ${layer}`), 'unavailable');
                    continue;
                }
                await runCase(caseMeta(style, 'normal', 'download', `${format} ${layer}`), format, () =>
                    takeDownload(() => {
                        document.getElementById('do-export').click();
                    })
                );
            }
        }

        for (const format of formats) {
            const available = await setFormat(format);
            if (!available || (is3D && format === 'svg')) {
                await skip(caseMeta(style, 'normal', 'clipboard', format), 'unavailable');
                continue;
            }

            const layerList = is3D ? ['both'] : layers;
            for (const layer of layerList) {
                if (!is3D && !await setLayer(layer)) {
                    await skip(caseMeta(style, 'normal', 'clipboard', `${format} ${layer}`), 'unavailable');
                    continue;
                }
                const clipboardExpected = !is3D && format === 'svg'
                    ? 'svg'
                    : format === 'png'
                        ? 'png'
                        : '';
                if (clipboardExpected) {
                    if (!copyButtonVisible()) {
                        await fail(caseMeta(style, 'normal', 'clipboard', `${format} ${layer}`), 'Copy button is not visible');
                    } else {
                        await runClipboardCase(caseMeta(style, 'normal', 'clipboard', `${format} ${layer}`), clipboardExpected, () =>
                            takeClipboard(() => {
                                document.getElementById('do-copy').click();
                            })
                        );
                    }
                } else if (copyButtonVisible()) {
                    await fail(caseMeta(style, 'normal', 'clipboard', `${format} ${layer}`), 'Copy button is visible for an unsupported clipboard format');
                } else {
                    await skip(caseMeta(style, 'normal', 'clipboard', `${format} ${layer}`), 'unsupported');
                }
            }
        }

        if (is3D) {
            const bulkBtn = document.getElementById('bulk-export-btn');
            if (bulkBtn.disabled) await skip(caseMeta(style, 'bulk', 'download', 'disabled'), '3D bulk export disabled');
            else await fail(caseMeta(style, 'bulk', 'download', 'disabled'), '3D bulk export button is unexpectedly enabled');
            continue;
        }

        for (const format of formats) {
            await setFormat(format);
            await openBulkModal();
            document.querySelector('.modal-tab[data-tab="text"]').click();
            document.getElementById('bulk-text-input').value = BULK_INPUTS.join('\n');
            await runCase(caseMeta(style, 'bulk', 'download', `text ${format}`), 'zip', () =>
                takeDownload(() => {
                    document.getElementById('bulk-text-export').click();
                })
            );
            closeBulkModal();

            await openBulkModal();
            document.querySelector('.modal-tab[data-tab="xlsx"]').click();
            await prepareBulkXlsx();
            await runCase(caseMeta(style, 'bulk', 'download', `xlsx zip ${format}`), 'zip', () =>
                takeDownload(() => {
                    document.getElementById('bulk-xlsx-export-zip').click();
                })
            );
            closeBulkModal();

            await openBulkModal();
            document.querySelector('.modal-tab[data-tab="xlsx"]').click();
            await prepareBulkXlsx();
            await runCase(caseMeta(style, 'bulk', 'download', `xlsx workbook ${format}`), 'xlsx', () =>
                takeDownload(() => {
                    document.getElementById('bulk-xlsx-export-xlsx').click();
                })
            );
            closeBulkModal();
        }
    }

    return { results, failures, skipped };
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

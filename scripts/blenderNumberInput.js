const DRAG_SENSITIVITY = 0.1;
const PRECISION_MULTIPLIER = 0.1;
const CLICK_THRESHOLD_PX = 4;
const STEPPER_WIDTH = 18;
const DECIMALS = 6;

function getCursorVariant() {
    if (/Win/i.test(navigator.userAgent)) return 'windows';
    return 'linux';
}

let fakeCursorEl = null;

function ensureFakeCursor() {
    if (fakeCursorEl) return fakeCursorEl;
    fakeCursorEl = document.createElement('div');
    fakeCursorEl.className = 'b3-fake-cursor';
    fakeCursorEl.dataset.os = getCursorVariant();
    const linux = document.createElement('img');
    linux.className = 'b3-cur-linux';
    linux.src = 'img/cursor-ew-linux.svg';
    linux.alt = '';
    linux.draggable = false;
    const windows = document.createElement('img');
    windows.className = 'b3-cur-windows';
    windows.src = 'img/cursor-ew-windows.svg';
    windows.alt = '';
    windows.draggable = false;
    fakeCursorEl.append(linux, windows);
    document.body.appendChild(fakeCursorEl);
    return fakeCursorEl;
}

function formatValue(number) {
    return String(Number(Number(number).toFixed(DECIMALS)));
}

function attrNum(input, name) {
    const v = parseFloat(input.getAttribute(name));
    return Number.isNaN(v) ? null : v;
}

function clampValue(input, v) {
    const min = attrNum(input, 'min');
    const max = attrNum(input, 'max');
    if (min != null && v < min) return min;
    if (max != null && v > max) return max;
    return v;
}

function stepOf(input) {
    const s = attrNum(input, 'step');
    return s == null || s <= 0 ? 1 : s;
}

function upgradeNumberInput(originalInput) {
    const input = originalInput;
    if (input.dataset.b3Upgraded) return;
    input.dataset.b3Upgraded = '1';

    const cs = getComputedStyle(input);
    let width = cs.width;
    if (width === 'auto' || width === '') {
        width = Math.round(input.getBoundingClientRect().width) + 'px';
    }

    const wrap = document.createElement('span');
    wrap.className = 'b3-wrap';
    wrap.style.width = width;
    wrap.style.flexGrow = cs.flexGrow;
    wrap.style.flexShrink = cs.flexShrink;
    wrap.style.flexBasis = cs.flexBasis === 'auto' ? width : cs.flexBasis;
    wrap.style.alignSelf = cs.alignSelf;
    wrap.style.boxSizing = 'border-box';

    const field = document.createElement('span');
    field.className = 'b3-field';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'b3-step b3-minus';
    minus.textContent = '\u2212';
    minus.tabIndex = -1;
    minus.setAttribute('aria-hidden', 'true');

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'b3-step b3-plus';
    plus.textContent = '+';
    plus.tabIndex = -1;
    plus.setAttribute('aria-hidden', 'true');

    const dragArea = document.createElement('span');
    dragArea.className = 'b3-drag';

    input.classList.add('b3-input');
    input.style.paddingLeft = STEPPER_WIDTH + 4 + 'px';
    input.style.paddingRight = STEPPER_WIDTH + 4 + 'px';
    if (!input.style.width) input.style.width = '100%';

    field.append(minus, plus, dragArea);
    wrap.appendChild(field);
    input.replaceWith(wrap);
    field.insertBefore(input, plus);

    const emitChange = () => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const applyValue = (v, { fireChange } = {}) => {
        const next = clampValue(input, Number(v));
        if (Number.isNaN(next)) return false;
        input.value = formatValue(next);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        if (fireChange) emitChange();
        return true;
    };

    const currentValue = () => {
        const parsed = Number(input.value);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const nudge = dir => {
        applyValue(currentValue() + dir * stepOf(input), { fireChange: true });
    };

    minus.addEventListener('click', e => {
        e.preventDefault();
        nudge(-1);
    });
    plus.addEventListener('click', e => {
        e.preventDefault();
        nudge(1);
    });
    const swallow = e => e.preventDefault();
    minus.addEventListener('mousedown', swallow);
    plus.addEventListener('mousedown', swallow);

    wrap.addEventListener('wheel', e => {
        e.preventDefault();
        const amount = stepOf(input) * (e.shiftKey ? PRECISION_MULTIPLIER : 1);
        applyValue(currentValue() + (e.deltaY < 0 ? amount : -amount), { fireChange: true });
    }, { passive: false });

    const fakeCursor = ensureFakeCursor();

    let dragging = false;
    let dragStartValue = 0;
    let dragStartSensitivity = 0;
    let accumulatedPx = 0;
    let movedPx = 0;
    let lockPending = false;

    const setDraggingUI = on => {
        wrap.classList.toggle('dragging', on);
        document.body.classList.toggle('b3-dragging', on);
    };

    let editStartValue = 0;

    const enterEditMode = () => {
        editStartValue = currentValue();
        field.classList.add('b3-editing');
        input.focus();
        input.select();
    };

    const exitEditMode = commit => {
        if (!field.classList.contains('b3-editing')) return;
        field.classList.remove('b3-editing');
        if (commit) {
            const parsed = Number(input.value);
            if (Number.isNaN(parsed)) {
                input.value = formatValue(currentValue());
            } else {
                applyValue(parsed, { fireChange: true });
            }
            emitChange();
        }
    };

    input.addEventListener('keydown', e => {
        if (!field.classList.contains('b3-editing')) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            exitEditMode(true);
            input.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            input.value = formatValue(editStartValue);
            exitEditMode(false);
            input.blur();
        }
    });

    input.addEventListener('blur', () => {
        exitEditMode(true);
    });

    const stopDrag = () => {
        if (!dragging) return;
        dragging = false;
        lockPending = false;
        setDraggingUI(false);
        fakeCursor.classList.remove('active');
        if (document.pointerLockElement === dragArea) document.exitPointerLock();
        if (movedPx <= CLICK_THRESHOLD_PX) {
            enterEditMode();
        } else {
            emitChange();
        }
    };

    dragArea.addEventListener('mousedown', async e => {
        if (e.button !== 0) return;
        e.preventDefault();
        exitEditMode(false);

        dragging = true;
        lockPending = true;
        movedPx = 0;
        accumulatedPx = 0;
        dragStartValue = currentValue();
        dragStartSensitivity = stepOf(input) * DRAG_SENSITIVITY;
        setDraggingUI(true);

        fakeCursor.style.left = e.clientX + 'px';
        fakeCursor.style.top = e.clientY + 'px';
        fakeCursor.classList.add('active');

        try {
            const result = dragArea.requestPointerLock();
            if (result && typeof result.catch === 'function') await result;
        } catch (err) {
            fakeCursor.classList.remove('active');
        }
        lockPending = false;
    });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const dx = e.movementX || 0;
        const dy = e.movementY || 0;
        accumulatedPx += dx;
        movedPx += Math.abs(dx) + Math.abs(dy);
        const precision = e.shiftKey ? PRECISION_MULTIPLIER : 1;
        applyValue(dragStartValue + accumulatedPx * dragStartSensitivity * precision);
    });

    document.addEventListener('mouseup', e => {
        if (e.button !== 0) return;
        stopDrag();
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== dragArea) {
            if (dragging && !lockPending) {
                dragging = false;
                setDraggingUI(false);
                fakeCursor.classList.remove('active');
                if (movedPx <= CLICK_THRESHOLD_PX) enterEditMode();
                else emitChange();
            }
        }
    });
}

function sweep(root) {
    (root || document).querySelectorAll('input[type="number"]:not([data-b3-upgraded])').forEach(upgradeNumberInput);
}

let installed = false;

export function initBlenderNumberInputs() {
    if (installed) return;
    installed = true;
    sweep(document);
    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.matches && node.matches('input[type="number"]:not([data-b3-upgraded])')) {
                    upgradeNumberInput(node);
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('input[type="number"]:not([data-b3-upgraded])').forEach(upgradeNumberInput);
                }
            });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

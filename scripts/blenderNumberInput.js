const DRAG_SENSITIVITY = 0.1;
const PRECISION_MULTIPLIER = 0.1;
const CLICK_THRESHOLD_PX = 4;
const STEPPER_WIDTH = 18;
const DECIMALS = 6;

/* Stepper press-and-hold auto-repeat */
const HOLD_DELAY_MS = 400;
const REPEAT_START_MS = 90;
const REPEAT_MIN_MS = 28;
const REPEAT_ACCEL = 0.92;

/* How long the green +/− feedback lingers after the last change */
const FEEDBACK_CLEAR_MS = 450;

/* input → tracked document/input-level listeners (for clean downgrade) */
const docBindings = new WeakMap();

/* Blender-style inputs are an Enhanced-mode feature. Normal mode keeps the
   plain native number inputs; script.js flips this flag on mode switches. */
let enabled = false;

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

    /* Listeners that outlive the wrapper (on <document> and on the input
       itself) are tracked so a downgrade can remove them cleanly. */
    const bindings = [];
    const on = (target, type, fn, opts) => {
        target.addEventListener(type, fn, opts);
        bindings.push({ target, type, fn, opts });
    };

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
    input.style.textAlign = 'center';
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

    /* Green +/- seam: whenever the value moves, light up the stepper that
       matches the direction of travel, then let it fade after a pause. */
    let feedbackTimer = null;
    const setDirFeedback = dir => {
        wrap.classList.toggle('b3-inc', dir > 0);
        wrap.classList.toggle('b3-dec', dir < 0);
    };

    const applyValue = (v, { fireChange } = {}) => {
        const cur = currentValue();
        const next = clampValue(input, Number(v));
        if (Number.isNaN(next)) return false;
        if (next !== cur) {
            setDirFeedback(next > cur ? 1 : -1);
            clearTimeout(feedbackTimer);
            feedbackTimer = setTimeout(() => setDirFeedback(0), FEEDBACK_CLEAR_MS);
        } else {
            /* Clamped into a no-op (e.g. held at min/max) — don't hammer
               input listeners with repeated identical values. */
            return false;
        }
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

    /* One click = one step; keep pressing past HOLD_DELAY_MS and it
       switches to automatic repeat that accelerates the longer it held. */
    let repeatTimer = null;

    const stopRepeat = () => {
        clearTimeout(repeatTimer);
        repeatTimer = null;
        wrap.classList.remove('b3-stepping');
    };

    const startRepeat = (btn, dir) => {
        stopRepeat();
        nudge(dir);
        wrap.classList.add('b3-stepping');
        let interval = REPEAT_START_MS;
        const tick = () => {
            nudge(dir);
            interval = Math.max(REPEAT_MIN_MS, interval * REPEAT_ACCEL);
            repeatTimer = setTimeout(tick, interval);
        };
        repeatTimer = setTimeout(tick, HOLD_DELAY_MS);
    };

    const bindStepper = (btn, dir) => {
        btn.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            /* Capture so the release is always reported, even if the
               pointer wanders off the button or out of the window. */
            try { btn.setPointerCapture(e.pointerId); } catch (err) {}
            startRepeat(btn, dir);
        });
        btn.addEventListener('pointerup', () => stopRepeat());
        btn.addEventListener('pointercancel', () => stopRepeat());
        btn.addEventListener('lostpointercapture', () => stopRepeat());
    };
    bindStepper(minus, -1);
    bindStepper(plus, 1);

    on(document, 'pointerup', e => {
        if (e.button !== 0) return;
        stopRepeat();
    });

    wrap.addEventListener('wheel', e => {
        e.preventDefault();
        const amount = stepOf(input) * (e.shiftKey ? PRECISION_MULTIPLIER : 1);
        applyValue(currentValue() + (e.deltaY < 0 ? amount : -amount), { fireChange: true });
    }, { passive: false });

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

    on(input, 'keydown', e => {
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

    on(input, 'blur', () => {
        exitEditMode(true);
    });

    const stopDrag = () => {
        if (!dragging) return;
        dragging = false;
        lockPending = false;
        setDraggingUI(false);
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

        try {
            const result = dragArea.requestPointerLock();
            if (result && typeof result.catch === 'function') await result;
        } catch (err) { /* cursor stays hidden via CSS while dragging */ }
        lockPending = false;
    });

    on(document, 'mousemove', e => {
        if (!dragging) return;
        const dx = e.movementX || 0;
        const dy = e.movementY || 0;
        accumulatedPx += dx;
        movedPx += Math.abs(dx) + Math.abs(dy);
        const precision = e.shiftKey ? PRECISION_MULTIPLIER : 1;
        applyValue(dragStartValue + accumulatedPx * dragStartSensitivity * precision);
    });

    on(document, 'mouseup', e => {
        if (e.button !== 0) return;
        stopDrag();
    });

    on(document, 'pointerlockchange', () => {
        if (document.pointerLockElement !== dragArea) {
            if (dragging && !lockPending) {
                dragging = false;
                setDraggingUI(false);
                if (movedPx <= CLICK_THRESHOLD_PX) enterEditMode();
                else emitChange();
            }
        }
    });

    docBindings.set(input, bindings);
}

function downgradeNumberInput(input) {
    const bindings = docBindings.get(input);
    if (!bindings) return;
    const wrap = input.closest('.b3-wrap');

    /* Abort any live interaction state before tearing down. */
    if (wrap) {
        wrap.classList.remove('b3-stepping', 'dragging', 'b3-inc', 'b3-dec');
        if (
            document.pointerLockElement &&
            wrap.contains(document.pointerLockElement)
        ) {
            document.exitPointerLock();
        }
    }
    document.body.classList.remove('b3-dragging');

    for (const b of bindings) b.target.removeEventListener(b.type, b.fn, b.opts);
    docBindings.delete(input);

    input.classList.remove('b3-input');
    input.style.removeProperty('text-align');
    input.style.removeProperty('padding-left');
    input.style.removeProperty('padding-right');
    if (input.style.width === '100%') input.style.removeProperty('width');
    delete input.dataset.b3Upgraded;
    if (wrap) wrap.replaceWith(input);
}

function sweep(root) {
    if (!enabled) return;
    (root || document).querySelectorAll('input[type="number"]:not([data-b3-upgraded])').forEach(upgradeNumberInput);
}

let installed = false;

export function initBlenderNumberInputs() {
    if (installed) return;
    installed = true;
    const observer = new MutationObserver(mutations => {
        if (!enabled) return;
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

/* Enhanced mode ON: upgrade every number input. OFF: restore them to plain
   native number inputs. */
export function setBlenderNumberInputsEnabled(on) {
    on = !!on;
    if (on === enabled) return;
    enabled = on;
    if (on) {
        sweep(document);
    } else {
        document.querySelectorAll('input[data-b3-upgraded]').forEach(downgradeNumberInput);
    }
}

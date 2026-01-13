// content.js - Refactored Version

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================
const CONFIG = {
    SELECTORS: {
        messageInput: 'footer div[contenteditable="true"]',
        sendButton: 'span[data-icon="send"]',
        sendButtonAlt: 'div[aria-label="Send"]',
        chatHeader: '#main header',
        errorPopupOk: 'div[data-testid="popup-controls-ok"]',
        captionInput: 'div[aria-label="Add a caption"]',
        introLogo: 'div[data-testid="intro-md-beta-logo-dark"]',
    },
    TIMEOUTS: {
        navigation: 8000,
        sendVerify: 500,
        errorRecovery: 2000,
        groupExtract: 2000,
        captionWrite: 500,
        afterSend: 3000,
        buttonWaitDelay: 2000,
        captionDelay: 2500,
    },
    LIMITS: {
        maxInputAttempts: 60,
        maxSendAttempts: 180,
        navTimeout: 15000,
    },
    STYLES: {
        dashboard: `position:fixed;top:15px;right:15px;z-index:99999;background:#0f172a;padding:0;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.6);font-family:'Segoe UI',sans-serif;width:280px;overflow:hidden;border:1px solid #334155;color:#e2e8f0;backdrop-filter:blur(10px);`,
        overlay: `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.95);z-index:999999;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#e2e8f0;font-family:'Segoe UI',sans-serif;backdrop-filter:blur(5px);`,
    },
    GRADIENTS: {
        active: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #b91c1c)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    },
};

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    scriptStartTime: Date.now(),
    isPaused: false,
    isStopped: false,
    isShieldActive: false,
    isHandlingError: false,
    lastNavigationTime: 0,
    shieldInterval: null,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const utils = {
    $(selector) {
        return document.querySelector(selector);
    },

    $$(selector) {
        return document.querySelectorAll(selector);
    },

    getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    spinText(text) {
        if (!text) return '';
        return text.replace(/\{(.*?)\}/g, (match, content) => {
            if (content.includes('|')) {
                const options = content.split('|');
                return options[Math.floor(Math.random() * options.length)];
            }
            return match;
        });
    },

    cleanNumber(number) {
        return number.replace(/\D/g, '');
    },

    createHiddenLink(href) {
        const link = document.createElement('a');
        link.href = href;
        link.style.display = 'none';
        document.body.appendChild(link);
        return link;
    },

    navigateToChat(phoneNumber) {
        const link = this.createHiddenLink(`https://web.whatsapp.com/send?phone=${phoneNumber}`);
        link.click();
        state.lastNavigationTime = Date.now();
    },
};

// ============================================
// SMART TIMEOUT (respects stop flag)
// ============================================
function smartTimeout(callback, delay) {
    if (state.isStopped) return null;
    return setTimeout(() => {
        if (!state.isStopped) callback();
    }, delay);
}

// ============================================
// STORAGE HELPERS
// ============================================
const storage = {
    get(keys) {
        return new Promise(resolve => chrome.storage.local.get(keys, resolve));
    },

    set(data) {
        return new Promise(resolve => chrome.storage.local.set(data, resolve));
    },

    async logStatus(name, number, status) {
        if (state.isStopped) return;

        const data = await this.get(['broadcastHistory', 'currentSessionId']);
        const history = data.broadcastHistory || [];
        const sessionIndex = history.findIndex(s => s.id == data.currentSessionId);

        if (sessionIndex !== -1) {
            history[sessionIndex].logs.push({
                name,
                number,
                status,
                time: new Date().toLocaleTimeString(),
            });
            await this.set({ broadcastHistory: history });
            if (!state.isStopped) updateDashboard('Log Saved', 'grey', true);
        }
    },
};

// ============================================
// KEYBOARD EVENT HELPER
// ============================================
function triggerEnter(element) {
    if (!element) return;
    const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: 13,
        which: 13,
        key: 'Enter',
        code: 'Enter',
    });
    element.dispatchEvent(event);
}

// ============================================
// SHIELD (PiP Tab Protection)
// ============================================
const shield = {
    activate() {
        if (state.isShieldActive || state.isStopped) return;

        // Silent audio to prevent tab suspension
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const audioCtx = new AudioContext();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                gainNode.gain.value = 0.0001;
                oscillator.start();
            }
        } catch (e) { /* Ignore audio errors */ }

        // Create PiP canvas
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            if (state.isStopped) return;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 200, 100);
            ctx.fillStyle = '#34d399';
            ctx.font = '20px Segoe UI';
            ctx.fillText('Shield Active', 10, 55);
            if (new Date().getMilliseconds() < 500) {
                ctx.fillStyle = '#10b981';
                ctx.fillRect(180, 10, 10, 10);
            }
        };
        state.shieldInterval = setInterval(draw, 1000);

        // Create PiP video
        const stream = canvas.captureStream(1);
        const video = document.createElement('video');
        video.id = 'pip-video-element';
        video.srcObject = stream;
        video.muted = true;
        video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(video);

        video.play()
            .then(() => video.requestPictureInPicture())
            .then(() => {
                state.isShieldActive = true;
                const btn = utils.$('#btn-shield');
                if (btn) {
                    btn.innerText = '✅ Shield Active';
                    btn.style.background = '#059669';
                }
                overlay.removeResume();
            })
            .catch(() => {
                if (!state.isStopped) overlay.showResume();
            });
    },

    stop() {
        if (state.shieldInterval) clearInterval(state.shieldInterval);
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
        }
        const video = utils.$('#pip-video-element');
        if (video) video.remove();
        state.isShieldActive = false;
    },
};

// ============================================
// OVERLAY MANAGEMENT
// ============================================
const overlay = {
    showResume() {
        if (utils.$('#resume-overlay') || state.isStopped) return;

        const el = document.createElement('div');
        el.id = 'resume-overlay';
        el.style.cssText = CONFIG.STYLES.overlay;
        el.innerHTML = `
            <h1 style="font-size:24px;margin-bottom:20px;color:#ef4444;text-shadow:0 0 10px rgba(239,68,68,0.5);">⚠️ Broadcast Paused</h1>
            <button id="btn-resume-click" style="padding:15px 40px;font-size:16px;background:${CONFIG.GRADIENTS.success};color:white;border:none;border-radius:12px;cursor:pointer;font-weight:bold;box-shadow:0 4px 20px rgba(16,185,129,0.4);transition:transform 0.2s;">RESUME NOW 🚀</button>
        `;
        document.body.appendChild(el);

        utils.$('#btn-resume-click').onclick = () => {
            state.isStopped = false;
            shield.activate();
            storage.get(['status']).then(d => {
                if (d.status === 'active') startProcess();
            });
        };
    },

    removeResume() {
        const el = utils.$('#resume-overlay');
        if (el) el.remove();
    },
};

// ============================================
// DASHBOARD UI
// ============================================
function updateDashboard(statusText, statusColor, forceShow = false) {
    if (state.isStopped && !forceShow) return;

    storage.get(['broadcastHistory', 'currentSessionId', 'pendingData', 'status']).then(data => {
        const validStatuses = ['active', 'complete', 'stopped'];
        if ((!validStatuses.includes(data.status) && !forceShow) || (state.isStopped && !forceShow)) {
            const dash = utils.$('#ext-dashboard');
            if (dash) dash.style.display = 'none';
            return;
        }

        const history = data.broadcastHistory || [];
        const session = history.find(s => s.id == data.currentSessionId);
        const remaining = data.pendingData?.length || 0;
        const total = session?.total || 0;
        const sent = session?.logs.filter(l => l.status.includes('Sent')).length || 0;
        const failed = session?.logs.filter(l => l.status.includes('Failed') || l.status.includes('Invalid')).length || 0;
        const percentage = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

        const isFinished = data.status === 'complete' || (total > 0 && remaining === 0);
        const storageStopped = data.status === 'stopped';
        const isStopped = storageStopped || state.isStopped;

        let dash = utils.$('#ext-dashboard');
        if (!dash) {
            dash = document.createElement('div');
            dash.id = 'ext-dashboard';
            dash.style.cssText = CONFIG.STYLES.dashboard;
            document.body.appendChild(dash);
        }
        dash.style.display = 'block';

        // Determine header style
        let headerColor = CONFIG.GRADIENTS.active;
        let headerTitle = '🚀 Sending...';
        if (isFinished) {
            headerColor = CONFIG.GRADIENTS.success;
            headerTitle = '🎉 Completed';
        } else if (isStopped) {
            headerColor = CONFIG.GRADIENTS.error;
            headerTitle = '⛔ Stopped';
        } else if (state.isPaused) {
            headerColor = CONFIG.GRADIENTS.warning;
            headerTitle = '⏸️ Paused';
        }

        // Build control buttons
        const controlButtons = (isFinished || isStopped)
            ? `<button id="dash-close-btn" style="width:100%;padding:10px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;color:white;background:#1e293b;border:1px solid #334155;transition:0.3s;">❌ Close Dashboard</button>`
            : `<button id="dash-pause-btn" style="flex:1;padding:8px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;color:white;background:${state.isPaused ? CONFIG.GRADIENTS.active : '#334155'};border:1px solid ${state.isPaused ? 'transparent' : '#475569'};margin-right:8px;transition:0.3s;">${state.isPaused ? 'Resume' : 'Pause'}</button>
               <button id="dash-stop-btn" style="flex:1;padding:8px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;color:white;background:${CONFIG.GRADIENTS.error};transition:0.3s;">Stop</button>`;

        // Shield button
        let shieldBtn = '';
        if (!isFinished && !isStopped) {
            shieldBtn = state.isShieldActive
                ? `<div style="background:rgba(16,185,129,0.1);color:#34d399;padding:8px;border-radius:8px;text-align:center;font-size:12px;margin-top:10px;border:1px solid rgba(16,185,129,0.3);font-weight:600;">✅ Safe Mode Active</div>`
                : `<button id="btn-shield" style="width:100%;padding:10px;margin-top:10px;background:${CONFIG.GRADIENTS.success};color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;box-shadow:0 4px 15px rgba(16,185,129,0.2);">🛡️ Enable Safe Mode</button>`;
        }

        const statusMessage = isFinished ? 'All tasks finished.' : (isStopped ? 'Process Terminated.' : (statusText || 'Running...'));

        dash.innerHTML = `
            <div style="background:${headerColor};padding:15px;color:white;font-weight:700;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <span style="font-size:14px;">${headerTitle}</span>
                <span style="font-size:11px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:12px;">${percentage}%</span>
            </div>
            <div style="background:#1e293b;height:4px;width:100%;"><div style="height:100%;width:${percentage}%;background:${headerColor};transition:width 0.5s ease;box-shadow:0 0 10px rgba(59,130,246,0.5);"></div></div>
            <div style="padding:15px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:15px;font-size:13px;border-bottom:1px solid #334155;padding-bottom:10px;color:#94a3b8;">
                    <span>📦 Total: <strong style="color:white;">${total}</strong></span>
                    <span>⏳ Left: <strong style="color:white;">${remaining}</strong></span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:15px;">
                    <span style="color:#34d399;display:flex;align-items:center;">✅ Sent: <strong style="margin-left:5px;">${sent}</strong></span>
                    <span style="color:#ef4444;display:flex;align-items:center;">❌ Fail: <strong style="margin-left:5px;">${failed}</strong></span>
                </div>
                <div style="margin-bottom:15px;font-size:11px;color:#64748b;text-align:center;background:#1e293b;padding:8px;border-radius:6px;border:1px solid #334155;">Status: <strong style="color:#e2e8f0;">${statusMessage}</strong></div>
                <div style="display:flex;justify-content:space-between;">${controlButtons}</div>
                ${shieldBtn}
            </div>
        `;

        // Attach event handlers
        if (isFinished || isStopped) {
            const closeBtn = utils.$('#dash-close-btn');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    dash.style.display = 'none';
                    storage.set({ status: 'inactive' });
                    state.isStopped = true;
                };
            }
        } else {
            const pauseBtn = utils.$('#dash-pause-btn');
            const stopBtn = utils.$('#dash-stop-btn');
            const shieldBtnEl = utils.$('#btn-shield');

            if (pauseBtn) pauseBtn.onclick = togglePause;
            if (stopBtn) stopBtn.onclick = stopBroadcast;
            if (shieldBtnEl && !state.isShieldActive) shieldBtnEl.onclick = () => shield.activate();
        }
    });
}

function showStatus(text, color) {
    if (!state.isStopped) updateDashboard(text, color, true);
}

function togglePause() {
    if (state.isStopped) return;
    state.isPaused = !state.isPaused;

    if (state.isPaused) {
        updateDashboard('Paused', 'orange', true);
    } else {
        updateDashboard('Resuming...', 'green', true);
        storage.get(['pendingData']).then(d => {
            if (d.pendingData?.length > 0) nextNumber(d, true);
        });
    }
}

function stopBroadcast() {
    if (!confirm('Stop?')) return;

    state.isStopped = true;
    storage.set({ status: 'stopped' }).then(() => {
        shield.stop();
        updateDashboard(null, null, true);
    });
}

// ============================================
// ERROR DETECTION
// ============================================
function checkForErrorPopup(user, data) {
    if (state.isHandlingError || state.isStopped) return true;

    const bodyText = document.body.innerText.toLowerCase();
    let popupBtn = utils.$(CONFIG.SELECTORS.errorPopupOk);

    if (!popupBtn) {
        utils.$$('div[role="button"], button').forEach(el => {
            if (el.innerText === 'OK') popupBtn = el;
        });
    }

    const hasInvalidError = bodyText.includes('phone number shared via url is invalid') ||
                           (popupBtn && bodyText.includes('invalid'));

    if (!hasInvalidError) return false;

    state.isHandlingError = true;

    if (popupBtn) {
        popupBtn.click();
        setTimeout(() => popupBtn.click(), 300);
    }

    window.history.pushState({}, null, 'https://web.whatsapp.com/');

    storage.logStatus(user.name, user.number, 'Invalid ❌').then(() => {
        const remaining = data.pendingData.slice(1);
        storage.set({ pendingData: remaining }).then(() => {
            setTimeout(() => {
                state.isHandlingError = false;
                if (remaining.length > 0 && !state.isStopped) {
                    utils.navigateToChat(remaining[0].number);
                    setTimeout(startProcess, 3000);
                } else {
                    shield.stop();
                    if (!state.isStopped) {
                        storage.set({ status: 'complete' });
                        updateDashboard(null, null, true);
                    }
                }
            }, CONFIG.TIMEOUTS.errorRecovery);
        });
    });

    return true;
}

// ============================================
// CHAT DETECTION
// ============================================
function isOnCorrectChat(targetNumber) {
    if (window.location.href.includes(targetNumber)) return true;

    const header = utils.$(CONFIG.SELECTORS.chatHeader);
    if (header) {
        const titleEl = header.querySelector('[title]');
        const title = titleEl?.getAttribute('title') || header.innerText;
        const cleanTitle = utils.cleanNumber(title);
        const cleanTarget = utils.cleanNumber(targetNumber);

        if (cleanTitle.length > 5 && cleanTitle.includes(cleanTarget.slice(-10))) {
            return true;
        }
    }

    const timeSinceNav = Date.now() - state.lastNavigationTime;
    const inputBox = utils.$(CONFIG.SELECTORS.messageInput);

    if (state.lastNavigationTime > 0 && timeSinceNav < CONFIG.LIMITS.navTimeout && inputBox) {
        if (!utils.$(CONFIG.SELECTORS.introLogo)) return true;
    }

    return false;
}

// ============================================
// CLIPBOARD HELPERS
// ============================================
function pasteText(element, text) {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    element.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
    }));
}

async function pasteFile(element, base64Data, fileName, fileType) {
    const blob = await (await fetch(base64Data)).blob();
    const file = new File([blob], fileName || 'file', { type: fileType || 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    element.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
    }));
}

// ============================================
// SEND BUTTON FINDER
// ============================================
function findVisibleSendButton() {
    // Try data-icon first
    for (const icon of utils.$$(CONFIG.SELECTORS.sendButton)) {
        if (icon.offsetParent !== null) return icon;
    }
    // Fallback to aria-label
    for (const btn of utils.$$(CONFIG.SELECTORS.sendButtonAlt)) {
        if (btn.offsetParent !== null) return btn;
    }
    return null;
}

// ============================================
// EVENT LISTENERS
// ============================================
window.addEventListener('load', () => {
    storage.get(['status']).then(d => {
        if (d.status === 'active') {
            state.isStopped = false;
            overlay.showResume();
        }
    });
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'initiate') {
        state.isPaused = false;
        state.isStopped = false;
        updateDashboard('Initializing...', 'blue', true);
        startProcess();
    }

    if (request.action === 'extractGroup') {
        extractGroupMembers();
    }
});

// ============================================
// GROUP EXTRACTION
// ============================================
function extractGroupMembers() {
    try {
        const headerBar = utils.$(CONFIG.SELECTORS.chatHeader);
        if (!headerBar) {
            alert('Please open a Group Chat first!');
            return;
        }

        headerBar.click();

        setTimeout(() => {
            const textData = document.body.innerText;
            const pattern = /\+?\d[\d -]{8,15}\d/g;
            const potentialNumbers = textData.match(pattern) || [];

            const uniqueNumbers = [...new Set(potentialNumbers)].filter(n => {
                const clean = utils.cleanNumber(n);
                return clean.length >= 10 && clean.length <= 15;
            });

            const data = uniqueNumbers.map(n => ({
                name: 'Member',
                number: utils.cleanNumber(n),
            }));

            chrome.runtime.sendMessage({ action: 'groupData', data });
        }, CONFIG.TIMEOUTS.groupExtract);
    } catch (e) {
        alert('Error extracting.');
    }
}

// ============================================
// MAIN PROCESS
// ============================================
async function startProcess() {
    if (state.isPaused || state.isStopped) {
        if (state.isPaused) updateDashboard('Paused', 'orange', true);
        return;
    }
    if (state.isHandlingError) return;

    state.scriptStartTime = Date.now();

    const data = await storage.get(['pendingData', 'message', 'status', 'minGap', 'maxGap', 'imageData', 'fileType', 'fileName']);

    if (state.isStopped) return;

    if (data.status !== 'active' || !data.pendingData?.length) {
        shield.stop();
        if (data.pendingData?.length === 0) storage.set({ status: 'complete' });
        updateDashboard(null, null, true);
        return;
    }

    const user = data.pendingData[0];
    if (checkForErrorPopup(user, data)) return;

    if (isOnCorrectChat(user.number)) {
        showStatus(`Chat: ${user.name || 'User'}...`, 'orange');
        await processCurrentChat(user, data);
    } else {
        showStatus('Navigating...', 'grey');
        utils.navigateToChat(user.number);

        smartTimeout(() => {
            if (state.isStopped) return;
            if (isOnCorrectChat(user.number)) {
                startProcess();
            } else if (!state.isHandlingError && !checkForErrorPopup(user, data)) {
                startProcess();
            }
        }, CONFIG.TIMEOUTS.navigation);
    }
}

async function processCurrentChat(user, data) {
    let attempts = 0;

    const checkLoop = async () => {
        if (state.isPaused || state.isHandlingError || state.isStopped) return;
        attempts++;

        if (checkForErrorPopup(user, data)) return;

        const footer = utils.$('footer');
        const box = footer?.querySelector('div[contenteditable="true"]');

        if (!box) {
            if (attempts > CONFIG.LIMITS.maxInputAttempts) {
                storage.logStatus(user.name, user.number, 'Failed (No Box)').then(() => nextNumber(data));
            } else {
                smartTimeout(checkLoop, 1000);
            }
            return;
        }

        box.focus();
        const spinnedMsg = utils.spinText(data.message);
        const finalMsg = spinnedMsg.replace(/{name}/gi, user.name || '');

        if (data.imageData) {
            await sendWithAttachment(box, user, data, finalMsg);
        } else {
            await sendTextOnly(box, user, data, finalMsg);
        }
    };

    checkLoop();
}

async function sendWithAttachment(box, user, data, message) {
    try {
        showStatus('Uploading...', 'purple');
        await pasteFile(box, data.imageData, data.fileName, data.fileType);
        waitForSendButtonAndClick(data, user, message, box);
    } catch (e) {
        storage.logStatus(user.name, user.number, 'File Failed').then(() => nextNumber(data));
    }
}

async function sendTextOnly(box, user, data, message) {
    pasteText(box, message);
    showStatus('Hitting Enter...', 'blue');

    smartTimeout(() => {
        if (state.isStopped) return;
        triggerEnter(box);

        smartTimeout(() => {
            if (state.isStopped) return;
            if (box.innerText.trim() === '') {
                showStatus('Sent via Enter!', 'orange');
                storage.logStatus(user.name, user.number, 'Sent ✅').then(() => nextNumber(data));
            } else {
                waitForSendButtonAndClick(data, user, null, box);
            }
        }, CONFIG.TIMEOUTS.sendVerify);
    }, CONFIG.TIMEOUTS.sendVerify);
}

// ============================================
// SEND BUTTON HANDLER
// ============================================
function waitForSendButtonAndClick(data, currentUser, messageToWrite, boxElement) {
    let attempts = 0;
    showStatus('Waiting for Send Button...', 'blue');

    const uploadLoop = () => {
        if (state.isPaused || state.isHandlingError || state.isStopped) return;
        attempts++;

        const sendBtn = findVisibleSendButton();

        if (sendBtn) {
            smartTimeout(() => {
                if (state.isStopped) return;

                if (messageToWrite) {
                    showStatus('Writing Caption...', 'blue');
                    let captionBox = utils.$(CONFIG.SELECTORS.captionInput);

                    if (!captionBox) {
                        for (const input of utils.$$('div[contenteditable="true"]')) {
                            if (input.offsetParent !== null && input.innerText.trim() === '') {
                                captionBox = input;
                                break;
                            }
                        }
                    }

                    if (captionBox) {
                        captionBox.click();
                        captionBox.focus();
                        setTimeout(() => pasteText(captionBox, messageToWrite), CONFIG.TIMEOUTS.captionWrite);
                    }
                }

                smartTimeout(() => {
                    if (state.isStopped) return;
                    showStatus('Sending...', 'green');

                    const clickable = sendBtn.closest('div[role="button"]') || sendBtn.closest('button') || sendBtn;
                    clickable.click();

                    showStatus('Sent!', 'orange');
                    smartTimeout(() => {
                        storage.logStatus(currentUser.name, currentUser.number, 'Sent ✅').then(() => nextNumber(data));
                    }, CONFIG.TIMEOUTS.afterSend);
                }, CONFIG.TIMEOUTS.captionDelay);
            }, CONFIG.TIMEOUTS.buttonWaitDelay);
        } else if (attempts > CONFIG.LIMITS.maxSendAttempts) {
            showStatus('Timeout ❌', 'red');
            storage.logStatus(currentUser.name, currentUser.number, 'Failed').then(() => nextNumber(data));
        } else {
            // Trigger activity to help WhatsApp detect input
            if (attempts % 5 === 0 && boxElement) {
                boxElement.focus();
                document.execCommand('insertText', false, ' ');
                setTimeout(() => document.execCommand('delete'), 50);
            }
            smartTimeout(uploadLoop, 1000);
        }
    };

    uploadLoop();
}

// ============================================
// NEXT CONTACT HANDLER
// ============================================
function nextNumber(data, fastSkip = false) {
    if (state.isPaused || state.isStopped) {
        if (state.isPaused) updateDashboard('Paused', 'orange', true);
        return;
    }

    const targetDelay = utils.getRandomDelay(data.minGap || 5, data.maxGap || 10);
    const actualWait = fastSkip ? 2 : targetDelay;
    showStatus(`Waiting ${actualWait}s...`, fastSkip ? 'red' : 'green');

    smartTimeout(() => {
        if (state.isStopped) return;
        const remaining = data.pendingData.slice(1);

        storage.set({ pendingData: remaining }).then(() => {
            if (remaining.length > 0 && !state.isStopped) {
                startProcess();
            } else if (!state.isStopped) {
                shield.stop();
                storage.set({ status: 'complete' });
                updateDashboard(null, null, true);
                setTimeout(() => alert('All Done!'), 500);
            }
        });
    }, actualWait * 1000);
}
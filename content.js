// content.js - FINAL STABLE VERSION (STOP FIX + ENTER KEY) 🚀✅

let scriptStartTime = Date.now();
let isPaused = false;
let isStopped = false; // 🔴 NEW: Global Stop Flag
let isShieldActive = false;
let shieldInterval = null;
let isHandlingError = false;
let lastNavigationTime = 0;

// --- 1. SHIELD ACTIVATION ---
function activateShield() {
    if (isShieldActive || isStopped) return; // Check Stopped
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
    } catch(e) {}

    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 100;
    const ctx = canvas.getContext('2d');

    function draw() {
        if(isStopped) return;
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 200, 100);
        ctx.fillStyle = '#34d399'; ctx.font = '20px Segoe UI';
        ctx.fillText("Shield Active", 10, 55);
        if (new Date().getMilliseconds() < 500) { ctx.fillStyle = '#10b981'; ctx.fillRect(180, 10, 10, 10); }
    }
    shieldInterval = setInterval(draw, 1000); 

    const stream = canvas.captureStream(1);
    const video = document.createElement('video');
    video.id = "pip-video-element";
    video.srcObject = stream;
    video.muted = true;
    video.style.position = 'fixed'; video.style.opacity = '0'; video.style.pointerEvents = 'none';
    document.body.appendChild(video);

    video.play().then(() => {
        video.requestPictureInPicture().then(() => {
            isShieldActive = true;
            let btn = document.getElementById("btn-shield");
            if(btn) { btn.innerText = "✅ Shield Active"; btn.style.background = "#059669"; }
            removeResumeOverlay();
        }).catch(e => {});
    }).catch(e => {
        if(!isStopped) showResumeOverlay();
    });
}

function stopShield() {
    if (shieldInterval) clearInterval(shieldInterval);
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(e => {});
    let v = document.getElementById("pip-video-element");
    if (v) v.remove();
    isShieldActive = false;
}

// --- 2. RESUME OVERLAY ---
function showResumeOverlay() {
    if(document.getElementById("resume-overlay") || isStopped) return;
    let overlay = document.createElement("div");
    overlay.id = "resume-overlay";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.95); z-index:999999; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#e2e8f0; font-family:'Segoe UI', sans-serif;";
    overlay.innerHTML = `<h1 style="font-size:24px; margin-bottom:20px; color:#ef4444;">⚠️ Broadcast Paused</h1><button id="btn-resume-click" style="padding:15px 30px; font-size:16px; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">RESUME NOW 🚀</button>`;
    document.body.appendChild(overlay);
    document.getElementById("btn-resume-click").onclick = () => { 
        isStopped = false; // Reset stop flag
        activateShield(); 
        chrome.storage.local.get(['status'], d => { if(d.status === 'active') startProcess(); }); 
    };
}
function removeResumeOverlay() { let ov = document.getElementById("resume-overlay"); if(ov) ov.remove(); }

// --- 3. SMART DASHBOARD ---
function updateDashboard(statusText, statusColor, forceShow = false) {
    if (isStopped && !forceShow) return; // 🔴 STOP CHECK

    let dash = document.getElementById("ext-dashboard");
    chrome.storage.local.get(['broadcastHistory', 'currentSessionId', 'pendingData', 'status'], (data) => {
        // Double check status from storage to be sure
        if ((data.status !== "active" && data.status !== "complete" && data.status !== "stopped" && !forceShow) || (isStopped && !forceShow)) { 
            if (dash) dash.style.display = 'none'; return; 
        }
        
        let history = data.broadcastHistory || [];
        let session = history.find(s => s.id == data.currentSessionId);
        let remaining = data.pendingData ? data.pendingData.length : 0;
        let total = session ? session.total : 0;
        let sent = session ? session.logs.filter(l => l.status.includes("Sent")).length : 0;
        let failed = session ? session.logs.filter(l => l.status.includes("Failed") || l.status.includes("Invalid")).length : 0;
        let percentage = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

        let isFinished = data.status === "complete" || (total > 0 && remaining === 0);
        let storageStopped = data.status === "stopped";

        if (!dash) {
            dash = document.createElement("div"); dash.id = "ext-dashboard";
            dash.style.cssText = `position: fixed; top: 15px; right: 15px; z-index: 99999; background: #0f172a; padding: 0; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); font-family: 'Segoe UI', sans-serif; width: 280px; overflow: hidden; border: 1px solid #334155; color: #e2e8f0;`;
            document.body.appendChild(dash);
        }
        dash.style.display = 'block';
        
        let headerColor = "#3b82f6"; let headerTitle = "🚀 Sending...";
        if(isFinished) { headerColor = "#10b981"; headerTitle = "🎉 Completed"; }
        else if(storageStopped || isStopped) { headerColor = "#ef4444"; headerTitle = "⛔ Stopped"; }
        else if(isPaused) { headerColor = "#f59e0b"; headerTitle = "⏸️ Paused"; }
        
        let controlButtons = "";
        if (isFinished || storageStopped || isStopped) {
            controlButtons = `<button id="dash-close-btn" style="width:100%; padding:10px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; color:white; background:#334155; border:1px solid #475569;">❌ Close Dashboard</button>`;
        } else {
            controlButtons = `
                <button id="dash-pause-btn" style="flex:1; padding:8px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; color:white; background:${isPaused ? '#3b82f6' : '#f59e0b'}; margin-right:5px;">${isPaused ? "Resume" : "Pause"}</button>
                <button id="dash-stop-btn" style="flex:1; padding:8px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; color:white; background:#ef4444;">Stop</button>
            `;
        }

        let shieldBtn = "";
        if(!isFinished && !storageStopped && !isStopped) {
            shieldBtn = isShieldActive ? 
            `<div style="background:rgba(16, 185, 129, 0.1); color:#34d399; padding:6px; border-radius:6px; text-align:center; font-size:11px; margin-top:8px; border:1px solid #059669;">✅ Shield Active</div>` : 
            `<button id="btn-shield" style="width:100%; padding:8px; margin-top:8px; background:linear-gradient(135deg, #6366f1, #4f46e5); color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">🛡️ Enable Shield</button>`;
        }

        dash.innerHTML = `
            <div style="background:${headerColor}; padding:12px; color:white; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                <span>${headerTitle}</span> <span style="font-size:12px; background:rgba(0,0,0,0.2); padding:2px 8px; border-radius:10px;">${percentage}%</span>
            </div>
            <div style="background:#1e293b; height:4px; width:100%;"><div style="height:100%; width:${percentage}%; background:${headerColor}; transition: width 0.5s ease;"></div></div>
            <div style="padding:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:13px; border-bottom:1px solid #334155; padding-bottom:8px; color:#cbd5e1;">
                    <span>📦 Total: <strong style="color:white;">${total}</strong></span><span>⏳ Left: <strong style="color:white;">${remaining}</strong></span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:12px;">
                    <span style="color:#34d399;">✅ Sent: <strong>${sent}</strong></span><span style="color:#ef4444;">❌ Fail: <strong>${failed}</strong></span>
                </div>
                <div style="margin-bottom:12px; font-size:11px; color:#94a3b8; text-align:center;">Status: <strong style="color:#e2e8f0;">${isFinished ? "All tasks finished." : (storageStopped || isStopped ? "Process Terminated." : (statusText || "Running..."))}</strong></div>
                <div style="display:flex; justify-content:space-between;">${controlButtons}</div>
                ${shieldBtn}
            </div>`;
        
        if (isFinished || storageStopped || isStopped) {
            let closeBtn = document.getElementById("dash-close-btn");
            if(closeBtn) closeBtn.onclick = () => { 
                dash.style.display = 'none'; 
                chrome.storage.local.set({ status: "inactive" }); 
                isStopped = true; // Ensure logic stays dead
            };
        } else {
            document.getElementById("dash-pause-btn").onclick = () => togglePause();
            document.getElementById("dash-stop-btn").onclick = () => stopBroadcast();
            let btn = document.getElementById("btn-shield"); 
            if(btn && !isShieldActive) btn.onclick = () => activateShield();
        }
    });
}

function togglePause() { 
    if(isStopped) return;
    isPaused = !isPaused; 
    if(isPaused) updateDashboard("Paused", "orange", true); 
    else { 
        updateDashboard("Resuming...", "green", true); 
        chrome.storage.local.get(['pendingData'], d => { if(d.pendingData?.length > 0) nextNumber(d, true); }); 
    } 
}

function stopBroadcast() { 
    if(confirm("Stop?")) { 
        isStopped = true; // 🔴 KILL SWITCH
        chrome.storage.local.set({ status: "stopped" }, () => { 
            stopShield(); 
            updateDashboard(null, null, true); 
        }); 
    } 
}

function showStatus(t, c) { if(!isStopped) updateDashboard(t, c, true); }
function getRandomDelay(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function logStatus(n, num, s) { 
    return new Promise((r) => { 
        if(isStopped) { r(); return; } // Don't log if stopped
        chrome.storage.local.get(['broadcastHistory', 'currentSessionId'], (d) => { 
            let h = d.broadcastHistory || []; 
            let i = h.findIndex(x => x.id == d.currentSessionId); 
            if (i !== -1) { 
                h[i].logs.push({ name: n, number: num, status: s, time: new Date().toLocaleTimeString() }); 
                chrome.storage.local.set({ broadcastHistory: h }, () => { 
                    if(!isStopped) updateDashboard("Log Saved", "grey", true); 
                    r(); 
                }); 
            } else r(); 
        }); 
    }); 
}

// --- 4. LISTENER & STARTUP ---
window.addEventListener('load', () => { 
    chrome.storage.local.get(['status'], d => { 
        if(d.status === "active") { 
            isStopped = false;
            showResumeOverlay(); 
        } 
    }); 
});

chrome.runtime.onMessage.addListener((r) => { 
    if (r.action === "initiate") { 
        isPaused = false; 
        isStopped = false; // 🔴 RESET STOP FLAG
        updateDashboard("Initializing...", "blue", true); 
        startProcess(); 
    }
    if (r.action === "extractGroup") {
        // ... (Group extraction code kept same)
        try {
            let headerBar = document.querySelector('#main header');
            if(headerBar) {
                headerBar.click();
                setTimeout(() => {
                   let textData = document.body.innerText; 
                   let pattern = /\+?\d[\d -]{8,15}\d/g;
                   let potentialNumbers = textData.match(pattern) || [];
                   let uniqueNumbers = [...new Set(potentialNumbers)].filter(n => {
                       let clean = n.replace(/\D/g,''); return clean.length >= 10 && clean.length <= 15;
                   });
                   let data = uniqueNumbers.map(n => ({ name: "Member", number: n.replace(/\D/g, '') }));
                   chrome.runtime.sendMessage({ action: "groupData", data: data });
                }, 2000); 
            } else { alert("Please open a Group Chat first!"); }
        } catch(e) { alert("Error extracting."); }
    }
});

// --- 5. HELPERS ---
function smartTimeout(callback, delay) { 
    if(isStopped) return; // 🔴 SECURITY CHECK
    setTimeout(() => {
        if(!isStopped) callback(); // 🔴 DOUBLE CHECK BEFORE EXECUTION
    }, delay); 
}

function spinText(text) { if (!text) return ""; return text.replace(/\{(.*?)\}/g, (m, c) => { if (c.includes('|')) { const o = c.split('|'); return o[Math.floor(Math.random() * o.length)]; } return m; }); }

function triggerEnter(element) {
    if(!element) return;
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, keyCode: 13, which: 13, key: 'Enter', code: 'Enter' });
    element.dispatchEvent(event);
}

// --- 6. ERROR HANDLER ---
function checkForErrorPopup(user, data) {
    if (isHandlingError || isStopped) return true;
    let bodyText = document.body.innerText.toLowerCase();
    let popupBtn = document.querySelector('div[data-testid="popup-controls-ok"]');
    if(!popupBtn) document.querySelectorAll('div[role="button"], button').forEach(el => { if (el.innerText === "OK") popupBtn = el; });

    if (bodyText.includes("phone number shared via url is invalid") || (popupBtn && bodyText.includes("invalid"))) {
        isHandlingError = true;
        if (popupBtn) { popupBtn.click(); setTimeout(() => popupBtn.click(), 300); }
        window.history.pushState({}, null, "https://web.whatsapp.com/");
        
        logStatus(user.name, user.number, "Invalid ❌").then(() => {
            let rem = data.pendingData.slice(1);
            chrome.storage.local.set({ pendingData: rem }, () => {
                setTimeout(() => {
                    isHandlingError = false; 
                    if (rem.length > 0 && !isStopped) {
                        let cleanLink = document.createElement('a'); cleanLink.href = `https://web.whatsapp.com/send?phone=${rem[0].number}`;
                        cleanLink.style.display = 'none'; document.body.appendChild(cleanLink); cleanLink.click();
                        setTimeout(startProcess, 3000);
                    } else { 
                        stopShield(); 
                        if(!isStopped) {
                            chrome.storage.local.set({ status: "complete" }); 
                            updateDashboard(null, null, true); 
                        }
                    }
                }, 2000);
            });
        });
        return true; 
    }
    return false;
}

function isOnCorrectChat(targetNumber) {
    if(window.location.href.includes(targetNumber)) return true;
    let header = document.querySelector('#main header');
    if(header) {
        let title = header.querySelector('[title]')?.getAttribute('title') || header.innerText;
        let cleanTitle = title.replace(/\D/g, ""); let cleanTarget = targetNumber.replace(/\D/g, "");
        if(cleanTitle.length > 5 && cleanTitle.includes(cleanTarget.substring(cleanTarget.length - 10))) return true;
    }
    let timeSinceNav = Date.now() - lastNavigationTime;
    let inputBox = document.querySelector('footer div[contenteditable="true"]');
    if (lastNavigationTime > 0 && timeSinceNav < 15000 && inputBox) {
        if(!document.querySelector('div[data-testid="intro-md-beta-logo-dark"]')) return true; 
    }
    return false;
}

// --- 7. MAIN PROCESS ---
function startProcess() {
    if (isPaused || isStopped) { 
        if(isPaused) updateDashboard("Paused", "orange", true); 
        return; 
    }
    if (isHandlingError) return;
    scriptStartTime = Date.now(); 

    chrome.storage.local.get(['pendingData', 'message', 'status', 'minGap', 'maxGap', 'imageData', 'fileType', 'fileName'], async (data) => {
        if (isStopped) return; // 🔴 STOP CHECK AFTER ASYNC

        if (data.status !== "active" || !data.pendingData || data.pendingData.length === 0) { 
            stopShield(); 
            if(data.pendingData && data.pendingData.length === 0) chrome.storage.local.set({ status: "complete" });
            updateDashboard(null, null, true); return; 
        }

        let user = data.pendingData[0];
        if (checkForErrorPopup(user, data)) return; 

        if (isOnCorrectChat(user.number)) {
            showStatus(`Chat: ${user.name || "User"}...`, "orange");
            let attempts = 0;
            const checkLoop = async () => {
                if(isPaused || isHandlingError || isStopped) return;
                attempts++;
                if (checkForErrorPopup(user, data)) return;

                let footer = document.querySelector('footer');
                let box = footer ? footer.querySelector('div[contenteditable="true"]') : null;

                if (box) {
                    box.focus();
                    let spinnedMsg = spinText(data.message);
                    let finalMsg = spinnedMsg.replace(/{name}/gi, user.name || "");
                    
                    if (data.imageData) {
                        try {
                            const blob = await (await fetch(data.imageData)).blob();
                            const file = new File([blob], data.fileName || "file", { type: data.fileType || "image/png" });
                            showStatus(`Uploading...`, "purple");
                            const dt = new DataTransfer(); dt.items.add(file);
                            box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
                            waitForSendButtonAndClick(data, user, finalMsg, box); 
                        } catch (e) { logStatus(user.name, user.number, "File Failed").then(() => nextNumber(data)); }
                    } else {
                        // TEXT ONLY - PASTE + ENTER
                        const dt = new DataTransfer();
                        dt.setData("text/plain", finalMsg);
                        box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
                        
                        showStatus("Hitting Enter...", "blue");
                        setTimeout(() => {
                            if(isStopped) return;
                            triggerEnter(box); 
                            setTimeout(() => {
                                if(isStopped) return;
                                if(box.innerText.trim() === "") {
                                    showStatus("Sent via Enter!", "orange");
                                    logStatus(user.name, user.number, "Sent ✅").then(() => nextNumber(data));
                                } else {
                                    waitForSendButtonAndClick(data, user, null, box);
                                }
                            }, 500);
                        }, 500);
                    }
                } 
                else if (attempts > 60) { logStatus(user.name, user.number, "Failed (No Box)").then(() => nextNumber(data)); } 
                else { smartTimeout(checkLoop, 1000); }
            };
            checkLoop();
        } else { 
            showStatus(`Navigating...`, "grey"); 
            let link = document.createElement('a');
            link.href = `https://web.whatsapp.com/send?phone=${user.number}`;
            link.style.display = 'none'; document.body.appendChild(link); link.click();
            lastNavigationTime = Date.now();
            smartTimeout(() => {
                if(isStopped) return;
                if (isOnCorrectChat(user.number)) startProcess(); 
                else if (!isHandlingError) { if(!checkForErrorPopup(user, data)) startProcess(); }
            }, 8000);
        }
    });
}

// --- 8. BUTTON HUNTER ---
function waitForSendButtonAndClick(data, currentUser, messageToWrite, boxElement) {
    let attempts = 0; let maxWait = 180; showStatus("Waiting for Send Button...", "blue");
    const uploadLoop = () => {
        if(isPaused || isHandlingError || isStopped) return;
        attempts++;
        
        let sendBtn = null;
        let allIcons = document.querySelectorAll('span[data-icon="send"]');
        for (let icon of allIcons) { if (icon.offsetParent !== null) { sendBtn = icon; break; } }
        if (!sendBtn) {
            let allAria = document.querySelectorAll('div[aria-label="Send"]');
            for (let btn of allAria) { if (btn.offsetParent !== null) { sendBtn = btn; break; } }
        }

        if (sendBtn) {
            smartTimeout(() => {
                if(isStopped) return;
                if (messageToWrite) {
                    showStatus("Writing Caption...", "blue");
                    let captionBox = document.querySelector('div[aria-label="Add a caption"]');
                    if(!captionBox) {
                         let inputable = document.querySelectorAll('div[contenteditable="true"]');
                         for(let i of inputable) {
                             if(i.offsetParent !== null && i.innerText.trim() === "") { captionBox = i; break; }
                         }
                    }
                    if (captionBox) { 
                        captionBox.click(); captionBox.focus(); 
                        setTimeout(() => {
                            const dt = new DataTransfer(); dt.setData("text/plain", messageToWrite);
                            captionBox.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
                        }, 500); 
                    }
                }
                smartTimeout(() => {
                    if(isStopped) return;
                    showStatus("Sending...", "green");
                    let clickable = sendBtn.closest('div[role="button"]') || sendBtn.closest('button') || sendBtn;
                    clickable.click(); 
                    showStatus("Sent!", "orange");
                    smartTimeout(() => { logStatus(currentUser.name, currentUser.number, "Sent ✅").then(() => nextNumber(data)); }, 3000); 
                }, 2500); 
            }, 2000); 
        } 
        else if (attempts > maxWait) {
            showStatus("Timeout ❌", "red"); 
            logStatus(currentUser.name, currentUser.number, "Failed").then(() => nextNumber(data));
        } 
        else {
            if(attempts % 5 === 0 && boxElement) {
                boxElement.focus();
                document.execCommand('insertText', false, ' '); 
                setTimeout(() => { document.execCommand('delete'); }, 50);
            }
            smartTimeout(uploadLoop, 1000);
        }
    };
    uploadLoop();
}

function nextNumber(data, fastSkip = false) {
    if(isPaused || isStopped) { if(isPaused) updateDashboard("Paused", "orange", true); return; }
    let targetDelay = getRandomDelay(data.minGap || 5, data.maxGap || 10);
    let actualWait = fastSkip ? 2 : targetDelay; 
    showStatus(`Waiting ${actualWait}s...`, fastSkip ? "red" : "green");
    
    smartTimeout(() => {
        if(isStopped) return;
        let rem = data.pendingData.slice(1);
        chrome.storage.local.set({ pendingData: rem }, () => {
            if (rem.length > 0 && !isStopped) startProcess();
            else if(!isStopped) { 
                stopShield(); chrome.storage.local.set({ status: "complete" }); 
                updateDashboard(null, null, true); 
                setTimeout(() => alert("All Done!"), 500);
            }
        });
    }, actualWait * 1000);
}
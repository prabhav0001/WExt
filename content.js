// content.js - FINAL DARK THEME DASHBOARD + CLOSE LOGIC ✨✅

let scriptStartTime = Date.now(); 
let isPaused = false;
let isShieldActive = false;
let shieldInterval = null;
let isHandlingError = false; 

// --- 1. SHIELD ACTIVATION (PiP Mode) ---
function activateShield() {
    if (isShieldActive) return;
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
        }).catch(e => console.log("PiP Error: User interaction needed"));
    }).catch(e => showResumeOverlay());
}

function stopShield() {
    if (shieldInterval) clearInterval(shieldInterval);
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(e => {});
    let v = document.getElementById("pip-video-element");
    if (v) v.remove();
    isShieldActive = false;
}

// --- 2. RESUME OVERLAY (Dark Mode) ---
function showResumeOverlay() {
    if(document.getElementById("resume-overlay")) return;
    let overlay = document.createElement("div");
    overlay.id = "resume-overlay";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.95); z-index:999999; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#e2e8f0; font-family:'Segoe UI', sans-serif;";
    overlay.innerHTML = `<h1 style="font-size:24px; margin-bottom:20px; color:#ef4444;">⚠️ Broadcast Paused</h1><button id="btn-resume-click" style="padding:15px 30px; font-size:16px; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">RESUME NOW 🚀</button>`;
    document.body.appendChild(overlay);
    document.getElementById("btn-resume-click").onclick = () => { activateShield(); chrome.storage.local.get(['status'], d => { if(d.status === 'active') startProcess(); }); };
}
function removeResumeOverlay() { let ov = document.getElementById("resume-overlay"); if(ov) ov.remove(); }

// --- 3. SMART DASHBOARD (NEW DARK DESIGN) ---
function updateDashboard(statusText, statusColor, forceShow = false) {
    let dash = document.getElementById("ext-dashboard");
    chrome.storage.local.get(['broadcastHistory', 'currentSessionId', 'pendingData', 'status'], (data) => {
        // Show dashboard if active, complete, OR STOPPED
        if (data.status !== "active" && data.status !== "complete" && data.status !== "stopped" && !forceShow) { 
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
        let isStopped = data.status === "stopped";

        if (!dash) {
            dash = document.createElement("div"); dash.id = "ext-dashboard";
            // Dark Theme Styles matching Popup
            dash.style.cssText = `position: fixed; top: 15px; right: 15px; z-index: 99999; background: #0f172a; padding: 0; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); font-family: 'Segoe UI', sans-serif; width: 280px; overflow: hidden; border: 1px solid #334155; color: #e2e8f0;`;
            document.body.appendChild(dash);
        }
        dash.style.display = 'block';
        
        // Dynamic Header Colors
        let headerColor = "#3b82f6"; // Default Blue
        let headerTitle = "🚀 Sending...";
        
        if(isFinished) { headerColor = "#10b981"; headerTitle = "🎉 Completed"; }
        else if(isStopped) { headerColor = "#ef4444"; headerTitle = "⛔ Stopped"; }
        else if(isPaused) { headerColor = "#f59e0b"; headerTitle = "⏸️ Paused"; }
        
        // Buttons Logic
        let controlButtons = "";
        if (isFinished || isStopped) {
            controlButtons = `<button id="dash-close-btn" style="width:100%; padding:10px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; color:white; background:#334155; border:1px solid #475569;">❌ Close Dashboard</button>`;
        } else {
            controlButtons = `
                <button id="dash-pause-btn" style="flex:1; padding:8px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; color:white; background:${isPaused ? '#3b82f6' : '#f59e0b'}; margin-right:5px;">${isPaused ? "Resume" : "Pause"}</button>
                <button id="dash-stop-btn" style="flex:1; padding:8px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; color:white; background:#ef4444;">Stop</button>
            `;
        }

        let shieldBtn = "";
        if(!isFinished && !isStopped) {
            shieldBtn = isShieldActive ? 
            `<div style="background:rgba(16, 185, 129, 0.1); color:#34d399; padding:6px; border-radius:6px; text-align:center; font-size:11px; margin-top:8px; border:1px solid #059669;">✅ Shield Active</div>` : 
            `<button id="btn-shield" style="width:100%; padding:8px; margin-top:8px; background:linear-gradient(135deg, #6366f1, #4f46e5); color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">🛡️ Enable Shield</button>`;
        }

        dash.innerHTML = `
            <div style="background:${headerColor}; padding:12px; color:white; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                <span>${headerTitle}</span> 
                <span style="font-size:12px; background:rgba(0,0,0,0.2); padding:2px 8px; border-radius:10px;">${percentage}%</span>
            </div>
            <div style="background:#1e293b; height:4px; width:100%;"><div style="height:100%; width:${percentage}%; background:${headerColor}; transition: width 0.5s ease;"></div></div>
            <div style="padding:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:13px; border-bottom:1px solid #334155; padding-bottom:8px; color:#cbd5e1;">
                    <span>📦 Total: <strong style="color:white;">${total}</strong></span><span>⏳ Left: <strong style="color:white;">${remaining}</strong></span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:12px;">
                    <span style="color:#34d399;">✅ Sent: <strong>${sent}</strong></span><span style="color:#ef4444;">❌ Fail: <strong>${failed}</strong></span>
                </div>
                <div style="margin-bottom:12px; font-size:11px; color:#94a3b8; text-align:center;">Status: <strong style="color:#e2e8f0;">${isFinished ? "All tasks finished." : (isStopped ? "Process Terminated." : (statusText || "Running..."))}</strong></div>
                
                <div style="display:flex; justify-content:space-between;">
                    ${controlButtons}
                </div>
                ${shieldBtn}
            </div>`;
        
        // Event Listeners
        if (isFinished || isStopped) {
            let closeBtn = document.getElementById("dash-close-btn");
            if(closeBtn) closeBtn.onclick = () => {
                dash.style.display = 'none';
                chrome.storage.local.set({ status: "inactive" });
            };
        } else {
            document.getElementById("dash-pause-btn").onclick = () => togglePause();
            document.getElementById("dash-stop-btn").onclick = () => stopBroadcast();
            let btn = document.getElementById("btn-shield"); 
            if(btn && !isShieldActive) btn.onclick = () => activateShield();
        }
    });
}

function togglePause() { isPaused = !isPaused; if(isPaused) updateDashboard("Paused", "orange", true); else { updateDashboard("Resuming...", "green", true); chrome.storage.local.get(['pendingData'], d => { if(d.pendingData?.length > 0) nextNumber(d, true); }); } }

// NEW STOP LOGIC: Sets status to 'stopped' so Dashboard stays with Close button
function stopBroadcast() { 
    if(confirm("Are you sure you want to stop?")) {
        chrome.storage.local.set({ status: "stopped" }, () => { 
            stopShield();
            updateDashboard(null, null, true); // Force update to show Close button
        }); 
    }
}

function showStatus(t, c) { updateDashboard(t, c, true); }
function getRandomDelay(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function logStatus(n, num, s) { return new Promise((r) => { chrome.storage.local.get(['broadcastHistory', 'currentSessionId'], (d) => { let h = d.broadcastHistory || []; let i = h.findIndex(x => x.id == d.currentSessionId); if (i !== -1) { h[i].logs.push({ name: n, number: num, status: s, time: new Date().toLocaleTimeString() }); chrome.storage.local.set({ broadcastHistory: h }, () => { updateDashboard("Log Saved", "grey", true); r(); }); } else r(); }); }); }

// --- 4. LISTENER & STARTUP ---
window.addEventListener('load', () => { chrome.storage.local.get(['status'], d => { if(d.status === "active") { showResumeOverlay(); } }); });

chrome.runtime.onMessage.addListener((r, sender, sendResponse) => { 
    if (r.action === "initiate") { 
        isPaused = false; 
        startProcess(); 
    }

    // --- GROUP EXTRACTOR LOGIC ---
    if (r.action === "extractGroup") {
        try {
            let headerBar = document.querySelector('#main header');
            if(headerBar) {
                headerBar.click();
                setTimeout(() => {
                   let textData = document.body.innerText; 
                   let pattern = /\+?\d[\d -]{8,15}\d/g;
                   let potentialNumbers = textData.match(pattern) || [];
                   let uniqueNumbers = [...new Set(potentialNumbers)].filter(n => {
                       let clean = n.replace(/\D/g,'');
                       return clean.length >= 10 && clean.length <= 15;
                   });
                   let data = uniqueNumbers.map(n => ({
                       name: "Member",
                       number: n.replace(/\D/g, '')
                   }));
                   chrome.runtime.sendMessage({ action: "groupData", data: data });
                }, 2000); 
            } else {
                 alert("Please open a Group Chat first!");
            }
        } catch(e) {
            console.log(e);
            alert("Error extracting. Ensure Group Chat is active.");
        }
    }
});

// --- 5. HELPERS ---
function smartTimeout(callback, delay) { setTimeout(callback, delay); }
function spinText(text) { if (!text) return ""; return text.replace(/\{(.*?)\}/g, (m, c) => { if (c.includes('|')) { const o = c.split('|'); return o[Math.floor(Math.random() * o.length)]; } return m; }); }

// --- 6. CRITICAL ERROR HANDLER ---
function checkForErrorPopup(user, data) {
    if (isHandlingError) return true;

    let bodyText = document.body.innerText.toLowerCase();
    let invalidText = bodyText.includes("phone number shared via url is invalid");

    let popupBtn = document.querySelector('div[data-testid="popup-controls-ok"]') ||
                   document.querySelector('button[data-testid="popup-controls-ok"]');
    
    if(!popupBtn) {
        document.querySelectorAll('div[role="button"], button, span').forEach(el => {
            if (el.innerText.trim() === "OK" || el.getAttribute('aria-label') === "OK") { popupBtn = el; }
        });
    }

    let popupContainer = document.querySelector('div[role="dialog"]') || document.querySelector('div[data-animate-modal-body]');

    if (invalidText || (popupContainer && popupContainer.innerText.toLowerCase().includes("invalid"))) {
        isHandlingError = true;
        if (popupBtn) { popupBtn.click(); setTimeout(() => popupBtn.click(), 300); }
        
        window.history.pushState({}, null, "https://web.whatsapp.com/");
        if (popupContainer) { popupContainer.style.display = 'none'; popupContainer.remove(); }

        logStatus(user.name, user.number, "Invalid ❌").then(() => {
            let rem = data.pendingData.slice(1);
            chrome.storage.local.set({ pendingData: rem }, () => {
                setTimeout(() => {
                    isHandlingError = false; 
                    if (rem.length > 0) {
                        let cleanLink = document.createElement('a');
                        cleanLink.href = `https://web.whatsapp.com/send?phone=${rem[0].number}`;
                        cleanLink.style.display = 'none';
                        document.body.appendChild(cleanLink);
                        cleanLink.click();
                        setTimeout(startProcess, 3000);
                    } else {
                        stopShield();
                        chrome.storage.local.set({ status: "complete" }); 
                        updateDashboard(null, null, true);
                        alert("All Done!");
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
    if (!header) header = document.querySelector('div[data-testid="conversation-header"]');
    if(header) {
        let text = header.innerText.replace(/[^0-9]/g, ""); 
        let targetClean = targetNumber.replace(/[^0-9]/g, "");
        if(text.includes(targetClean.substring(targetClean.length - 8))) return true;
    }
    return false;
}

// --- 7. MAIN PROCESS ---
function startProcess() {
    if (isPaused) { updateDashboard("Paused", "orange", true); return; }
    if (isHandlingError) return;

    scriptStartTime = Date.now(); 

    chrome.storage.local.get(['pendingData', 'message', 'status', 'minGap', 'maxGap', 'imageData', 'fileType', 'fileName'], async (data) => {
        if (data.status !== "active" || !data.pendingData || data.pendingData.length === 0) { 
            stopShield(); 
            if(data.pendingData && data.pendingData.length === 0) chrome.storage.local.set({ status: "complete" });
            updateDashboard(null, null, true); 
            return; 
        }

        let user = data.pendingData[0];
        if (checkForErrorPopup(user, data)) return; 

        if (isOnCorrectChat(user.number)) {
            showStatus(`Chat: ${user.name || "User"}...`, "orange");
            let attempts = 0;
            const checkLoop = async () => {
                if(isPaused || isHandlingError) return;
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
                            waitForSendButtonAndClick(data, user, finalMsg);
                        } catch (e) { logStatus(user.name, user.number, "File Failed").then(() => nextNumber(data)); }
                    } else {
                        document.execCommand('insertText', false, finalMsg);
                        box.dispatchEvent(new Event('input', { bubbles: true }));
                        waitForSendButtonAndClick(data, user, null);
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
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            smartTimeout(() => {
                if (isOnCorrectChat(user.number)) {
                     startProcess(); 
                }
                else if (!isHandlingError) {
                    if(!checkForErrorPopup(user, data)) startProcess();
                }
            }, 8000);
        }
    });
}

// --- 8. BUTTON HUNTER (BOLD TEXT + VIDEO CAPTION) ---
function waitForSendButtonAndClick(data, currentUser, messageToWrite) {
    let attempts = 0; 
    let maxWait = 180; 
    showStatus("Waiting for Upload...", "blue");

    const uploadLoop = () => {
        if(isPaused || isHandlingError) return;
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
                if (messageToWrite) {
                    showStatus("Writing Caption...", "blue");
                    
                    let captionBox = document.querySelector('div[aria-label="Add a caption"]');
                    if(!captionBox) {
                         let inputable = document.querySelectorAll('div[contenteditable="true"]');
                         if(inputable.length > 0) {
                             for(let i of inputable) {
                                 if(i.offsetParent !== null && i.innerText.trim() === "") { 
                                     captionBox = i; break; 
                                 }
                             }
                         }
                    }

                    if (captionBox) { 
                        captionBox.click(); 
                        captionBox.focus(); 
                        
                        setTimeout(() => {
                            document.execCommand('insertText', false, messageToWrite); 
                            captionBox.dispatchEvent(new Event('input', { bubbles: true }));
                        }, 500); 
                    }
                }
                
                smartTimeout(() => {
                    showStatus("Sending...", "green");
                    let clickable = sendBtn.closest('div[role="button"]') || sendBtn.closest('button') || sendBtn;
                    clickable.click(); 
                    showStatus("Finishing Up...", "orange");
                    smartTimeout(() => { logStatus(currentUser.name, currentUser.number, "Sent ✅").then(() => nextNumber(data)); }, 3000); 
                }, 2500); 
            }, 2000); 
        } 
        else if (attempts > maxWait) {
            showStatus("Upload Timeout ❌", "red"); 
            logStatus(currentUser.name, currentUser.number, "Upload Failed").then(() => nextNumber(data));
        } 
        else {
            if(attempts % 5 === 0) showStatus(`Uploading... (${attempts}s)`, "purple");
            smartTimeout(uploadLoop, 1000);
        }
    };
    uploadLoop();
}

// --- FIX: PURE DELAY LOGIC ---
function nextNumber(data, fastSkip = false) {
    if(isPaused) { updateDashboard("Paused", "orange", true); return; }

    let targetDelay = getRandomDelay(data.minGap || 5, data.maxGap || 10);
    let actualWait = fastSkip ? 2 : targetDelay; 

    showStatus(`Waiting ${actualWait}s for safety...`, fastSkip ? "red" : "green");
    
    smartTimeout(() => {
        let rem = data.pendingData.slice(1);
        chrome.storage.local.set({ pendingData: rem }, () => {
            if (rem.length > 0) startProcess();
            else { 
                stopShield();
                chrome.storage.local.set({ status: "complete" }); 
                updateDashboard(null, null, true); 
                setTimeout(() => alert("Process Completed!"), 500);
            }
        });
    }, actualWait * 1000);
}
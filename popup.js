// popup.js - FINAL FIXED VERSION (Product ID Logic) 🚀✅

// 🔴 YOUR GUMROAD CONFIGURATION 🔴
const GUMROAD_PERMALINK = "wa-sender-pro"; // Link for Buy Button
const GUMROAD_PRODUCT_ID = "109-J6Ah3WEwoHLKexRNYw=="; // 👈 Secret ID from Error Message

let isProVersion = false; // Default to Free

// --- 1. INITIALIZATION & AUTO-LOGIN ---
document.addEventListener('DOMContentLoaded', () => {
    // Check saved settings AND Login State
    chrome.storage.local.get(['licenseKey', 'isFreeMode', 'savedMinGap', 'savedMaxGap'], (data) => {
        
        // A. If User has a License Key saved
        if (data.licenseKey) {
            verifyGumroadKey(data.licenseKey, true); // Background check
        } 
        // B. If User selected Free Mode previously
        else if (data.isFreeMode) {
            isProVersion = false;
            updateUIForFree();
            showApp();
        } 
        // C. New User -> Show Login Screen
        else {
            showLogin();
        }

        // Load Time Settings
        if(data.savedMinGap) document.getElementById('min-gap').value = data.savedMinGap;
        if(data.savedMaxGap) document.getElementById('max-gap').value = data.savedMaxGap;
    });
});

// --- 2. LOGIN SCREEN ACTIONS ---

// Verify License Button
document.getElementById('btn-verify').addEventListener('click', () => {
    const inputKey = document.getElementById('license-key').value;
    if(!inputKey || !inputKey.trim()) { alert("Please enter a key!"); return; }
    verifyGumroadKey(inputKey, false);
});

// Continue with Free Trial Button
document.getElementById('btn-try-free').addEventListener('click', () => {
    isProVersion = false;
    // Save 'isFreeMode' so it doesn't ask again
    chrome.storage.local.set({ isFreeMode: true }, () => {
        updateUIForFree();
        showApp();
    });
});

// Upgrade / Buy Key Button
const upgradeBtns = document.querySelectorAll('#btn-upgrade, #link-buy-key');
upgradeBtns.forEach(btn => {
    btn?.addEventListener('click', () => {
        window.open(`https://gumroad.com/l/${GUMROAD_PERMALINK}`, "_blank");
    });
});

// --- 3. LICENSE VERIFICATION LOGIC (ID BASED) ---
async function verifyGumroadKey(key, isBackgroundCheck) {
    const btn = document.getElementById('btn-verify');
    if(!isBackgroundCheck) {
        btn.innerText = "Checking...";
        btn.disabled = true;
    }

    try {
        const cleanKey = key.trim();
        
        // 🔥 Using Product ID instead of Permalink (Fixed)
        const cleanProductID = GUMROAD_PRODUCT_ID.trim(); 

        console.log("Verifying Key:", cleanKey); 

        const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            // 👇 Sending 'product_id' as requested by the error
            body: `product_id=${encodeURIComponent(cleanProductID)}&license_key=${encodeURIComponent(cleanKey)}`
        });

        const data = await response.json();
        console.log("Gumroad Response:", data);

        if (data.success && !data.purchase.refunded && !data.purchase.chargebacked && !data.purchase.subscription_cancelled_at) {
            
            // ✅ VALID PRO KEY
            chrome.storage.local.set({ licenseKey: cleanKey, isFreeMode: false }, () => {
                isProVersion = true;
                if(!isBackgroundCheck) alert("✅ License Activated! PRO Features Unlocked.");
                updateUIForPro();
                showApp();
            });

        } else {
            // ❌ INVALID OR ERROR
            if(!isBackgroundCheck) {
                alert("❌ Activation Failed!\nReason: " + (data.message || "Invalid Key"));
            }
            if(isBackgroundCheck) {
                chrome.storage.local.remove('licenseKey');
                showLogin();
            } 
        }

    } catch (error) {
        console.error("Network Error:", error);
        if(isBackgroundCheck) {
            isProVersion = true;
            updateUIForPro();
            showApp(); 
        } else {
            alert("⚠️ Network Error!\nCheck Internet connection.");
        }
    } finally {
        if(!isBackgroundCheck) {
            btn.innerText = "✅ Activate License";
            btn.disabled = false;
        }
    }
}

// Logout / Reset Logic
document.getElementById('btn-logout').addEventListener('click', () => {
    let msg = isProVersion ? 
        "Deactivate PRO License and switch account?" : 
        "Go back to Activation Screen?";

    if(confirm(msg)) {
        chrome.storage.local.remove(['licenseKey', 'isFreeMode'], () => {
            isProVersion = false;
            showLogin();
            document.getElementById('license-key').value = "";
            document.getElementById('btn-verify').innerText = "✅ Activate License";
        });
    }
});

// --- 4. UI MANAGERS ---

function updateUIForPro() {
    const badge = document.getElementById('app-status-badge');
    if(badge) {
        badge.innerText = "PRO VERSION";
        badge.className = "badge-pro";
    }
    const statusText = document.getElementById('setting-status-text');
    if(statusText) {
        statusText.innerText = "✅ PRO License Active";
        statusText.style.color = "#34d399";
    }
    const settingsDesc = document.querySelector('#tab-settings p');
    if(settingsDesc) settingsDesc.innerText = "Unlimited Messaging & Features Enabled.";

    document.getElementById('btn-logout').style.display = "block";
    document.getElementById('btn-logout').innerText = "🔒 Deactivate License";
    const upBtn = document.getElementById('btn-upgrade');
    if(upBtn) upBtn.style.display = "none";
}

function updateUIForFree() {
    const badge = document.getElementById('app-status-badge');
    if(badge) {
        badge.innerText = "FREE PLAN";
        badge.className = "badge-free";
    }
    const statusText = document.getElementById('setting-status-text');
    if(statusText) {
        statusText.innerText = "⚠️ Free Version (Limited)";
        statusText.style.color = "#f59e0b";
    }
    const settingsDesc = document.querySelector('#tab-settings p');
    if(settingsDesc) settingsDesc.innerText = "Plan: Lifetime Free\nLimit: 5 Messages per Batch.";

    document.getElementById('btn-logout').style.display = "block";
    document.getElementById('btn-logout').innerText = "🔑 Enter License Key";
    const upBtn = document.getElementById('btn-upgrade');
    if(upBtn) upBtn.style.display = "block";
}

function showApp() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

// ==========================================
// 🚀 5. MAIN APP LOGIC (Messaging, Tabs, Etc.)
// ==========================================

document.getElementById('min-gap').addEventListener('change', (e) => {
    let val = parseInt(e.target.value);
    if(val < 1) val = 1;
    chrome.storage.local.set({ savedMinGap: val });
});
document.getElementById('max-gap').addEventListener('change', (e) => {
    let val = parseInt(e.target.value);
    if(val < 1) val = 1;
    chrome.storage.local.set({ savedMaxGap: val });
});

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

const msgBox = document.getElementById('message-editor');
const btnBold = document.getElementById('btn-bold');
const btnItalic = document.getElementById('btn-italic');
const btnStrike = document.getElementById('btn-strike');

btnBold.addEventListener('click', () => { document.execCommand('bold'); msgBox.focus(); updateToolbar(); });
btnItalic.addEventListener('click', () => { document.execCommand('italic'); msgBox.focus(); updateToolbar(); });
btnStrike.addEventListener('click', () => { document.execCommand('strikethrough'); msgBox.focus(); updateToolbar(); });
document.getElementById('btn-add-name').addEventListener('click', () => insertTextAtCursor(' {name} '));

const emojiBtn = document.getElementById('btn-emoji');
const emojiPicker = document.getElementById('emoji-picker');
const emojis = ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","❤️","🧡","💛","💚","💙","💜","🖤","💔","❣️","💕","💞","💓","💗","💖","💘","💝","👍","👎","👊","✊","🤛","🤜","🤞","✌️","🤟","🤘","👌","👈","👉","👆","👇","☝️","✋","🤚","🖐","🖖","👋","🤙","💪","🙏","🔥","✨","🌟","💫","💥","💢"];

function setupEmojiPicker() {
    emojiPicker.innerHTML = "";
    emojis.forEach(char => {
        let span = document.createElement("span");
        span.textContent = char;
        span.className = "emoji-item";
        span.addEventListener('click', () => { insertTextAtCursor(char); emojiPicker.style.display = 'none'; });
        emojiPicker.appendChild(span);
    });
}
setupEmojiPicker();

emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.style.display = (emojiPicker.style.display === 'none' || emojiPicker.style.display === '') ? 'grid' : 'none';
});
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) { emojiPicker.style.display = 'none'; }
});

function updateToolbar() {
    if (document.queryCommandState('bold')) btnBold.classList.add('active-tool'); else btnBold.classList.remove('active-tool');
    if (document.queryCommandState('italic')) btnItalic.classList.add('active-tool'); else btnItalic.classList.remove('active-tool');
    if (document.queryCommandState('strikethrough')) btnStrike.classList.add('active-tool'); else btnStrike.classList.remove('active-tool');
}
msgBox.addEventListener('keyup', updateToolbar);
msgBox.addEventListener('mouseup', updateToolbar);

function insertTextAtCursor(text) {
    let sel, range;
    msgBox.focus();
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0); range.deleteContents();
            let textNode = document.createTextNode(text);
            range.insertNode(textNode); range.setStartAfter(textNode); range.setEndAfter(textNode);
            sel.removeAllRanges(); sel.addRange(range);
        }
    }
}

function convertHtmlToWhatsApp(html) {
    let temp = document.createElement("div");
    temp.innerHTML = html;
    function wrap(text, char) { if (!text.trim()) return text; return char + text + char; }
    function traverse(node) {
        if (node.nodeType === 3) return node.textContent.replace(/\u00A0/g, " ");
        if (node.nodeType === 1) {
            let content = "";
            node.childNodes.forEach(c => content += traverse(c));
            let tag = node.tagName.toUpperCase();
            let style = node.style;
            if (tag === "B" || tag === "STRONG" || style.fontWeight === "bold" || parseInt(style.fontWeight) >= 600) content = wrap(content, "*");
            if (tag === "I" || tag === "EM" || style.fontStyle === "italic") content = wrap(content, "_");
            if (tag === "S" || tag === "STRIKE" || style.textDecoration.includes("line-through")) content = wrap(content, "~");
            if (tag === "BR") return "\n";
            if (tag === "DIV" || tag === "P") return "\n" + content + "\n";
            return content;
        }
        return "";
    }
    let text = traverse(temp);
    const fixMultiline = (str, char) => {
        const regex = new RegExp(`\\${char}([\\s\\S]*?)\\${char}`, 'g');
        return str.replace(regex, (match, content) => {
            if (content.includes('\n')) {
                return content.split('\n').map(line => line.trim() ? `${char}${line.trim()}${char}` : '').join('\n');
            }
            return match;
        });
    };
    text = fixMultiline(text, '*'); text = fixMultiline(text, '_'); text = fixMultiline(text, '~');
    return text.replace(/\n\s*\n\s*\n/g, "\n\n").trim();
}

const templateSelect = document.getElementById('templateSelect');
chrome.storage.local.get(['msgTemplates'], (data) => { updateTemplateDropdown(data.msgTemplates || {}); });

document.getElementById('btnSaveTemp').addEventListener('click', () => {
    let htmlContent = msgBox.innerHTML;
    if (!htmlContent.trim()) { alert("Message is empty!"); return; }
    let name = prompt("Template Name:");
    if (name) {
        chrome.storage.local.get(['msgTemplates'], (data) => {
            let templates = data.msgTemplates || {};
            templates[name] = htmlContent;
            chrome.storage.local.set({ msgTemplates: templates }, () => { 
                updateTemplateDropdown(templates); templateSelect.value = name; 
            });
        });
    }
});
templateSelect.addEventListener('change', () => { 
    if (templateSelect.value) {
        chrome.storage.local.get(['msgTemplates'], d => { 
            if (d.msgTemplates[templateSelect.value]) msgBox.innerHTML = d.msgTemplates[templateSelect.value]; 
        }); 
    }
});
document.getElementById('btnDelTemp').addEventListener('click', () => { 
    if (templateSelect.value && confirm("Delete selected template?")) {
        chrome.storage.local.get(['msgTemplates'], d => { 
            delete d.msgTemplates[templateSelect.value]; 
            chrome.storage.local.set({ msgTemplates: d.msgTemplates }, () => { 
                updateTemplateDropdown(d.msgTemplates); msgBox.innerHTML = ""; 
            }); 
        }); 
    }
});
function updateTemplateDropdown(t) { 
    templateSelect.innerHTML = '<option value="">📂 Load Template...</option>'; 
    Object.keys(t).forEach(n => { 
        let o = document.createElement('option'); o.value = n; o.textContent = n; 
        templateSelect.appendChild(o); 
    }); 
}
document.getElementById('downloadTemplate').addEventListener('click', () => {
    const csvContent = "Name,Mobile Number\nJohn Doe,919876543210\nJane Smith,919988776655";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "Contact_Template.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
});

const uploadBox = document.getElementById('upload-box');
const csvInput = document.getElementById('csvFile');
const fileNameDisplay = document.getElementById('file-name');
const manualBox = document.getElementById('manual-numbers');
const statsDisplay = document.getElementById('total-contacts-display');

uploadBox.addEventListener('click', () => csvInput.click());

csvInput.addEventListener('change', async () => {
    if (csvInput.files.length > 0) {
        let file = csvInput.files[0];
        fileNameDisplay.innerText = `📄 ${file.name}`;
        fileNameDisplay.style.color = "#34d399";
        try {
            let text = await file.text();
            let lines = text.split('\n');
            let count = lines.filter(l => l.trim().length > 5).length;
            statsDisplay.innerText = `File Loaded: ${count} Lines`;
        } catch(e) { alert("Error reading file"); }
    }
});

document.getElementById('btn-clean-numbers').addEventListener('click', async () => {
    let validContacts = new Map();
    const addContact = (name, number) => {
        let clean = number.replace(/[^0-9]/g, "");
        if (clean.length >= 10) {
            if (!validContacts.has(clean)) validContacts.set(clean, name.trim());
        }
    };
    if (csvInput.files.length > 0) {
        let text = await csvInput.files[0].text();
        let lines = text.split('\n');
        lines.forEach(line => {
            let parts = line.split(',');
            if (parts.length >= 2) addContact(parts[0], parts[1]);
            else if (parts.length === 1 && parts[0].trim()) addContact("Customer", parts[0]);
        });
    }
    if (manualBox.value.trim()) {
        let lines = manualBox.value.split('\n');
        lines.forEach(line => {
            if(line.includes(',')) {
                let parts = line.split(',');
                addContact(parts[0], parts[1]);
            } else { addContact("Customer", line); }
        });
    }
    if (validContacts.size === 0) { alert("No valid numbers found!"); return; }
    let outputText = "";
    validContacts.forEach((name, number) => { outputText += `${name},${number}\n`; });
    manualBox.value = outputText.trim();
    csvInput.value = ""; fileNameDisplay.innerText = "📂 Data Merged";
    statsDisplay.innerText = `✅ Total: ${validContacts.size}`;
    alert(`Filtered: ${validContacts.size} valid numbers.`);
});

document.getElementById('start-btn').addEventListener('click', async () => {
    let manualNumbers = manualBox.value;
    let rawHtml = msgBox.innerHTML;
    let message = convertHtmlToWhatsApp(rawHtml);
    
    if(!message.trim()) { alert("Message is empty!"); return; }

    let minGap = parseInt(document.getElementById('min-gap').value) || 5;
    let maxGap = parseInt(document.getElementById('max-gap').value) || 10;
    
    let finalData = [];
    if (manualNumbers.trim()) {
        let lines = manualNumbers.split('\n');
        lines.forEach(line => {
            let name = "Customer";
            let numberRaw = line;
            if (line.includes(',')) {
                let parts = line.split(',');
                name = parts[0].trim();
                numberRaw = parts[1];
            }
            if(numberRaw) {
                let cleanNum = numberRaw.replace(/[^0-9]/g, "");
                if (cleanNum.length >= 10) finalData.push({ number: cleanNum, name: name });
            }
        });
    }

    if (finalData.length === 0) { alert("Please add numbers first!"); return; }

    if (!isProVersion && finalData.length > 5) {
        alert(`🔒 FREE PLAN LIMIT!\n\nYou can only send 5 messages at a time on the Free Plan.\n\nYou added ${finalData.length} numbers.\nPlease remove some or Upgrade to PRO.`);
        return;
    }

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.storage.local.get(['broadcastHistory'], (data) => {
        let history = data.broadcastHistory || [];
        let newSession = { id: Date.now(), date: new Date().toLocaleString(), total: finalData.length, logs: [] };
        history.unshift(newSession);
        if(history.length > 50) history = history.slice(0, 50);
        
        let storagePayload = { 
            broadcastHistory: history,
            pendingData: finalData,
            message: message, 
            minGap: minGap, maxGap: maxGap,
            status: "active",
            currentSessionId: newSession.id
        };

        let imgInput = document.getElementById('media-file');
        if (imgInput.files.length > 0) {
            let file = imgInput.files[0];
            const reader = new FileReader();
            reader.onloadend = function() {
                storagePayload.imageData = reader.result;
                storagePayload.fileType = file.type;
                storagePayload.fileName = file.name;
                chrome.storage.local.set(storagePayload, () => {
                    chrome.tabs.sendMessage(tab.id, { action: "initiate" });
                    alert("🚀 Campaign Started! Check WhatsApp Web.");
                });
            }
            reader.readAsDataURL(file);
        } else {
            storagePayload.imageData = null;
            storagePayload.fileType = null;
            chrome.storage.local.set(storagePayload, () => {
                chrome.tabs.sendMessage(tab.id, { action: "initiate" });
                alert("🚀 Campaign Started! Check WhatsApp Web.");
            });
        }
    });
});

document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("Reset all data?")) chrome.storage.local.clear(() => { alert("Reset Done!"); });
});

document.getElementById('extractBtn').addEventListener('click', async () => { 
    let [t] = await chrome.tabs.query({ active: true, currentWindow: true }); 
    chrome.tabs.sendMessage(t.id, { action: "extractGroup" }); 
});

chrome.runtime.onMessage.addListener((r) => { 
    if (r.action === "groupData") { 
        if (r.data.length === 0) { alert("No numbers found!"); return; } 
        let csv = "Name,Mobile Number\n"; 
        r.data.forEach(i => { csv += `${i.name},${i.number}\n`; }); 
        const blob = new Blob([csv], { type: 'text/csv' }); 
        const url = window.URL.createObjectURL(blob); 
        const a = document.createElement('a'); a.href = url; a.download = `Group_${Date.now()}.csv`; 
        document.body.appendChild(a); a.click(); document.body.removeChild(a); 
    } 
});

const loadHistory = () => {
    const list = document.getElementById('history-list');
    list.innerHTML = "Loading...";
    chrome.storage.local.get(['broadcastHistory'], d => {
        let h = d.broadcastHistory || [];
        if (h.length === 0) { list.innerHTML = "No history yet."; return; }
        list.innerHTML = "";
        h.forEach(s => {
            let sent = s.logs.filter(x => x.status.includes("Sent")).length;
            let div = document.createElement('div'); 
            div.className = 'history-item';
            div.innerHTML = `<div style="flex:1;"><span style="font-weight:bold;">📅 ${s.date.split(',')[0]}</span><span style="margin-left:10px; color:#cbd5e1;">✅ ${sent}/${s.total}</span></div><button class="btn-dl-csv" data-id="${s.id}">⬇ CSV</button>`;
            list.appendChild(div);
        });
        document.querySelectorAll('.btn-dl-csv').forEach(btn => {
            btn.addEventListener('click', (e) => { downloadSessionCSV(e.target.dataset.id); });
        });
    });
};

function downloadSessionCSV(id) {
    chrome.storage.local.get(['broadcastHistory'], d => {
        let s = d.broadcastHistory.find(x => x.id == id);
        if (!s) return;
        let c = "Name,Number,Status,Time\n";
        s.logs.forEach(r => c += `${r.name},${r.number},${r.status},${r.time}\n`);
        let b = new Blob([c], { type: 'text/csv' });
        let u = URL.createObjectURL(b);
        let a = document.createElement('a'); a.href = u; a.download = `Report_${s.date.split(',')[0]}_${id}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
}

document.getElementById('refresh-history').addEventListener('click', loadHistory);
document.querySelector('.tab[data-tab="tab-history"]').addEventListener('click', loadHistory);
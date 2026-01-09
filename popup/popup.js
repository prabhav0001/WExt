// popup.js - FINAL BOLD FIX (Multiline Support) 🛠️✅

// --- 0. AUTO LOAD SETTINGS ---
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['savedMinGap', 'savedMaxGap'], (data) => {
        if(data.savedMinGap) document.getElementById('min-gap').value = data.savedMinGap;
        if(data.savedMaxGap) document.getElementById('max-gap').value = data.savedMaxGap;
    });
});

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

// --- 1. TAB SWITCHING ---
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// --- 2. EDITOR & TOOLBAR ---
const msgBox = document.getElementById('message-editor');
const btnBold = document.getElementById('btn-bold');
const btnItalic = document.getElementById('btn-italic');
const btnStrike = document.getElementById('btn-strike');

btnBold.addEventListener('click', () => { document.execCommand('bold'); msgBox.focus(); updateToolbar(); });
btnItalic.addEventListener('click', () => { document.execCommand('italic'); msgBox.focus(); updateToolbar(); });
btnStrike.addEventListener('click', () => { document.execCommand('strikethrough'); msgBox.focus(); updateToolbar(); });
document.getElementById('btn-add-name').addEventListener('click', () => insertTextAtCursor(' {name} '));

// Emoji Picker
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

// 🟢 THE FIX: ADVANCED CONVERTER 🟢
function convertHtmlToWhatsApp(html) {
    let temp = document.createElement("div");
    temp.innerHTML = html;

    // Helper to wrap text but keep spaces outside
    function wrap(text, char) {
        // Only wrap if there is actual content
        if (!text.trim()) return text;
        return char + text + char;
    }

    function traverse(node) {
        if (node.nodeType === 3) return node.textContent.replace(/\u00A0/g, " ");

        if (node.nodeType === 1) {
            let content = "";
            node.childNodes.forEach(c => content += traverse(c));

            let tag = node.tagName.toUpperCase();
            let style = node.style;

            // Formatting
            if (tag === "B" || tag === "STRONG" || style.fontWeight === "bold" || parseInt(style.fontWeight) >= 600) content = wrap(content, "*");
            if (tag === "I" || tag === "EM" || style.fontStyle === "italic") content = wrap(content, "_");
            if (tag === "S" || tag === "STRIKE" || style.textDecoration.includes("line-through")) content = wrap(content, "~");

            // Line Breaks
            if (tag === "BR") return "\n";
            if (tag === "DIV" || tag === "P") return "\n" + content + "\n";

            return content;
        }
        return "";
    }

    let text = traverse(temp);

    // 🔴 CRITICAL FIX: Fix Multiline Formatting
    // Convert: *Line1\nLine2* --->  *Line1*\n*Line2*
    // WhatsApp paste breaks if formatting spans newlines

    const fixMultiline = (str, char) => {
        // Regex to find formatted blocks: e.g., *text*
        // We use a regex that catches the markers
        const regex = new RegExp(`\\${char}([\\s\\S]*?)\\${char}`, 'g');
        return str.replace(regex, (match, content) => {
            if (content.includes('\n')) {
                return content.split('\n')
                    .map(line => line.trim() ? `${char}${line.trim()}${char}` : '') // Wrap each line individually
                    .join('\n');
            }
            return match;
        });
    };

    text = fixMultiline(text, '*');
    text = fixMultiline(text, '_');
    text = fixMultiline(text, '~');

    // Cleanup excessive newlines
    return text.replace(/\n\s*\n\s*\n/g, "\n\n").trim();
}

// --- 3. TEMPLATES ---
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

// --- 4. CSV TEMPLATE ---
document.getElementById('downloadTemplate').addEventListener('click', () => {
    const csvContent = "Name,Mobile Number\nJohn Doe,919876543210\nJane Smith,919988776655";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "Contact_Template.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
});

// --- 5. FILE UPLOAD ---
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

// --- 6. START BROADCAST ---
document.getElementById('start-btn').addEventListener('click', async () => {
    let manualNumbers = manualBox.value;
    let rawHtml = msgBox.innerHTML;

    // Convert HTML to WhatsApp Format
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

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.storage.local.get(['broadcastHistory'], (data) => {
        let history = data.broadcastHistory || [];
        let newSession = { id: Date.now(), date: new Date().toLocaleString(), total: finalData.length, logs: [] };
        history.unshift(newSession);
        // Keep only last 50 sessions
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

// --- 7. EXTRAS ---
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

// --- 8. MEDIA UPLOAD UI ---
const mediaBox = document.getElementById('media-upload-box');
const mediaInput = document.getElementById('media-file');
const mediaNameDisplay = document.getElementById('media-file-name');

mediaBox.addEventListener('click', () => mediaInput.click());

mediaInput.addEventListener('change', () => {
    if (mediaInput.files.length > 0) {
        let file = mediaInput.files[0];
        mediaNameDisplay.innerText = `📎 ${file.name}`;
        mediaNameDisplay.style.color = "var(--primary)";
        mediaBox.style.borderColor = "var(--primary)";
    } else {
        mediaNameDisplay.innerText = "Click to Upload Image/Video";
        mediaNameDisplay.style.color = "var(--text-muted)";
        mediaBox.style.borderColor = "#404040";
    }
});
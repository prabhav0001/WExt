// popup.js - Refactored Version

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    LIMITS: {
        minPhoneLength: 10,
        minGapValue: 1,
        maxGapValue: 300,
        maxHistoryItems: 50,
    },
};

// ============================================
// CONSTANTS
// ============================================
const EMOJIS = [
    '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗',
    '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝',
    '🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩',
    '🤯','😬','❤️','🧡','💛','💚','💙','💜','🖤','💔','❣️','💕','💞','💓','💗','💖','💘','💝','👍','👎',
    '👊','✊','🤛','🤜','🤞','✌️','🤟','🤘','👌','👈','👉','👆','👇','☝️','✋','🤚','🖐','🖖','👋','🤙',
    '💪','🙏','🔥','✨','🌟','💫','💥','💢'
];

const STORAGE_KEYS = {
    minGap: 'savedMinGap',
    maxGap: 'savedMaxGap',
    templates: 'msgTemplates',
    history: 'broadcastHistory',
};

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    // Settings
    minGap: document.getElementById('min-gap'),
    maxGap: document.getElementById('max-gap'),

    // Editor
    msgBox: document.getElementById('message-editor'),
    btnBold: document.getElementById('btn-bold'),
    btnItalic: document.getElementById('btn-italic'),
    btnStrike: document.getElementById('btn-strike'),
    btnAddName: document.getElementById('btn-add-name'),
    btnEmoji: document.getElementById('btn-emoji'),
    emojiPicker: document.getElementById('emoji-picker'),

    // Templates
    templateSelect: document.getElementById('templateSelect'),
    btnSaveTemp: document.getElementById('btnSaveTemp'),
    btnDelTemp: document.getElementById('btnDelTemp'),

    // File Upload
    uploadBox: document.getElementById('upload-box'),
    csvInput: document.getElementById('csvFile'),
    fileNameDisplay: document.getElementById('file-name'),
    manualBox: document.getElementById('manual-numbers'),
    statsDisplay: document.getElementById('total-contacts-display'),

    // Media Upload
    mediaBox: document.getElementById('media-upload-box'),
    mediaInput: document.getElementById('media-file'),
    mediaNameDisplay: document.getElementById('media-file-name'),

    // Actions
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    extractBtn: document.getElementById('extractBtn'),
    downloadTemplate: document.getElementById('downloadTemplate'),
    btnCleanNumbers: document.getElementById('btn-clean-numbers'),
    refreshHistory: document.getElementById('refresh-history'),
    historyList: document.getElementById('history-list'),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const utils = {
    /**
     * Removes all non-numeric characters from a phone number
     * @param {string} number - Raw phone number string
     * @returns {string} Cleaned numeric string
     */
    cleanNumber(number) {
        return number.replace(/[^0-9]/g, '');
    },

    /**
     * Validates if a phone number has minimum required length
     * @param {string} number - Cleaned phone number
     * @returns {boolean} True if valid
     */
    isValidNumber(number) {
        return number.length >= CONFIG.LIMITS.minPhoneLength;
    },

    /**
     * Downloads content as a file
     * @param {string} content - File content
     * @param {string} filename - Download filename
     * @param {string} type - MIME type (default: text/csv)
     */
    downloadFile(content, filename, type = 'text/csv') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Reads file content as text
     * @param {File} file - File object to read
     * @returns {Promise<string>} File contents
     */
    async readFile(file) {
        return file.text();
    },
};

// ============================================
// STORAGE HELPERS
// ============================================
const storage = {
    /**
     * Gets values from chrome.storage.local
     * @param {string[]} keys - Keys to retrieve
     * @returns {Promise<Object>} Storage data
     */
    get(keys) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    console.error('Storage get error:', chrome.runtime.lastError);
                    resolve({}); // Return empty on error to prevent crashes
                } else {
                    resolve(result);
                }
            });
        });
    },

    /**
     * Sets values in chrome.storage.local
     * @param {Object} data - Key-value pairs to store
     * @returns {Promise<void>}
     */
    set(data) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(data, () => {
                if (chrome.runtime.lastError) {
                    console.error('Storage set error:', chrome.runtime.lastError);
                }
                resolve();
            });
        });
    },

    /**
     * Clears all chrome.storage.local data
     * @returns {Promise<void>}
     */
    clear() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    console.error('Storage clear error:', chrome.runtime.lastError);
                }
                resolve();
            });
        });
    },
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const data = await storage.get([STORAGE_KEYS.minGap, STORAGE_KEYS.maxGap]);
    if (data[STORAGE_KEYS.minGap]) elements.minGap.value = data[STORAGE_KEYS.minGap];
    if (data[STORAGE_KEYS.maxGap]) elements.maxGap.value = data[STORAGE_KEYS.maxGap];

    // Load templates
    const templateData = await storage.get([STORAGE_KEYS.templates]);
    updateTemplateDropdown(templateData[STORAGE_KEYS.templates] || {});

    // Setup emoji picker
    setupEmojiPicker();
});

// ============================================
// SETTINGS HANDLERS
// ============================================

/**
 * Creates a change handler for gap inputs with validation
 * @param {string} key - Storage key for the gap value
 * @returns {Function} Event handler function
 */
function handleGapChange(key) {
    return (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < CONFIG.LIMITS.minGapValue) {
            val = CONFIG.LIMITS.minGapValue;
        } else if (val > CONFIG.LIMITS.maxGapValue) {
            val = CONFIG.LIMITS.maxGapValue;
        }
        e.target.value = val;
        storage.set({ [key]: val });
    };
}

elements.minGap.addEventListener('change', handleGapChange(STORAGE_KEYS.minGap));
elements.maxGap.addEventListener('change', handleGapChange(STORAGE_KEYS.maxGap));

// ============================================
// TAB SWITCHING
// ============================================
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// ============================================
// EDITOR & TOOLBAR
// ============================================

/**
 * Applies text formatting using modern APIs instead of deprecated execCommand
 * @param {string} command - Formatting command: 'bold', 'italic', 'strikethrough'
 */
function applyFormat(command) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) return;

    const wrapperMap = {
        bold: { tag: 'b' },
        italic: { tag: 'i' },
        strikethrough: { tag: 's' },
    };

    const wrapper = wrapperMap[command];
    if (!wrapper) return;

    // Check if already wrapped
    const parent = range.commonAncestorContainer.parentElement;
    if (parent?.tagName?.toLowerCase() === wrapper.tag) {
        // Unwrap
        const textNode = document.createTextNode(parent.textContent);
        parent.parentNode.replaceChild(textNode, parent);
    } else {
        // Wrap selection
        const el = document.createElement(wrapper.tag);
        el.textContent = selectedText;
        range.deleteContents();
        range.insertNode(el);

        // Move cursor after the element
        const newRange = document.createRange();
        newRange.setStartAfter(el);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }

    elements.msgBox.focus();
    updateToolbar();
}

elements.btnBold.addEventListener('click', () => applyFormat('bold'));
elements.btnItalic.addEventListener('click', () => applyFormat('italic'));
elements.btnStrike.addEventListener('click', () => applyFormat('strikethrough'));
elements.btnAddName.addEventListener('click', () => insertTextAtCursor(' {name} '));

/**
 * Updates toolbar button states based on current selection
 */
function updateToolbar() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const node = selection.anchorNode?.parentElement;
    if (!node) return;

    const isWrappedIn = (tagName) => {
        let current = node;
        while (current && current !== elements.msgBox) {
            if (current.tagName?.toLowerCase() === tagName) return true;
            current = current.parentElement;
        }
        return false;
    };

    elements.btnBold.classList.toggle('active-tool', isWrappedIn('b') || isWrappedIn('strong'));
    elements.btnItalic.classList.toggle('active-tool', isWrappedIn('i') || isWrappedIn('em'));
    elements.btnStrike.classList.toggle('active-tool', isWrappedIn('s') || isWrappedIn('strike'));
}

elements.msgBox.addEventListener('keyup', updateToolbar);
elements.msgBox.addEventListener('mouseup', updateToolbar);

function insertTextAtCursor(text) {
    elements.msgBox.focus();
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// ============================================
// EMOJI PICKER
// ============================================
function setupEmojiPicker() {
    elements.emojiPicker.innerHTML = '';
    EMOJIS.forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'emoji-item';
        span.addEventListener('click', () => {
            insertTextAtCursor(char);
            elements.emojiPicker.style.display = 'none';
        });
        elements.emojiPicker.appendChild(span);
    });
}

elements.btnEmoji.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = elements.emojiPicker.style.display === 'none' || !elements.emojiPicker.style.display;
    elements.emojiPicker.style.display = isHidden ? 'grid' : 'none';
});

document.addEventListener('click', (e) => {
    if (!elements.emojiPicker.contains(e.target) && e.target !== elements.btnEmoji) {
        elements.emojiPicker.style.display = 'none';
    }
});

// ============================================
// HTML TO WHATSAPP CONVERTER
// ============================================
function convertHtmlToWhatsApp(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    function wrap(text, char) {
        if (!text.trim()) return text;
        return char + text + char;
    }

    function traverse(node) {
        if (node.nodeType === 3) {
            return node.textContent.replace(/\u00A0/g, ' ');
        }

        if (node.nodeType === 1) {
            let content = '';
            node.childNodes.forEach(c => content += traverse(c));

            const tag = node.tagName.toUpperCase();
            const style = node.style;

            // Apply formatting
            if (tag === 'B' || tag === 'STRONG' || style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600) {
                content = wrap(content, '*');
            }
            if (tag === 'I' || tag === 'EM' || style.fontStyle === 'italic') {
                content = wrap(content, '_');
            }
            if (tag === 'S' || tag === 'STRIKE' || style.textDecoration.includes('line-through')) {
                content = wrap(content, '~');
            }

            // Handle line breaks
            if (tag === 'BR') return '\n';
            if (tag === 'DIV' || tag === 'P') return '\n' + content + '\n';

            return content;
        }
        return '';
    }

    let text = traverse(temp);

    // Fix multiline formatting (WhatsApp requires per-line wrapping)
    const fixMultiline = (str, char) => {
        const regex = new RegExp(`\\${char}([\\s\\S]*?)\\${char}`, 'g');
        return str.replace(regex, (match, content) => {
            if (content.includes('\n')) {
                return content.split('\n')
                    .map(line => line.trim() ? `${char}${line.trim()}${char}` : '')
                    .join('\n');
            }
            return match;
        });
    };

    text = fixMultiline(text, '*');
    text = fixMultiline(text, '_');
    text = fixMultiline(text, '~');

    return text.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
}

// ============================================
// TEMPLATE MANAGEMENT
// ============================================
function updateTemplateDropdown(templates) {
    elements.templateSelect.innerHTML = '<option value="">📂 Load Template...</option>';
    Object.keys(templates).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        elements.templateSelect.appendChild(option);
    });
}

elements.btnSaveTemp.addEventListener('click', async () => {
    const htmlContent = elements.msgBox.innerHTML;
    if (!htmlContent.trim()) {
        alert('Message is empty!');
        return;
    }

    const name = prompt('Template Name:');
    if (!name) return;

    const data = await storage.get([STORAGE_KEYS.templates]);
    const templates = data[STORAGE_KEYS.templates] || {};
    templates[name] = htmlContent;

    await storage.set({ [STORAGE_KEYS.templates]: templates });
    updateTemplateDropdown(templates);
    elements.templateSelect.value = name;
});

elements.templateSelect.addEventListener('change', async () => {
    if (!elements.templateSelect.value) return;

    const data = await storage.get([STORAGE_KEYS.templates]);
    const template = data[STORAGE_KEYS.templates]?.[elements.templateSelect.value];
    if (template) elements.msgBox.innerHTML = template;
});

elements.btnDelTemp.addEventListener('click', async () => {
    if (!elements.templateSelect.value) return;
    if (!confirm('Delete selected template?')) return;

    const data = await storage.get([STORAGE_KEYS.templates]);
    delete data[STORAGE_KEYS.templates][elements.templateSelect.value];

    await storage.set({ [STORAGE_KEYS.templates]: data[STORAGE_KEYS.templates] });
    updateTemplateDropdown(data[STORAGE_KEYS.templates]);
    elements.msgBox.innerHTML = '';
});

// ============================================
// CSV TEMPLATE DOWNLOAD
// ============================================
elements.downloadTemplate.addEventListener('click', () => {
    const csvContent = 'Name,Mobile Number\nJohn Doe,919876543210\nJane Smith,919988776655';
    utils.downloadFile(csvContent, 'Contact_Template.csv');
});

// ============================================
// FILE UPLOAD HANDLING
// ============================================
elements.uploadBox.addEventListener('click', () => elements.csvInput.click());

elements.csvInput.addEventListener('change', async () => {
    if (elements.csvInput.files.length === 0) return;

    const file = elements.csvInput.files[0];
    elements.fileNameDisplay.innerText = `📄 ${file.name}`;
    elements.fileNameDisplay.className = 'file-text uploaded';
    elements.uploadBox.style.borderColor = 'var(--primary)';

    try {
        const text = await utils.readFile(file);
        const lines = text.split('\n');
        const count = lines.filter(l => l.trim().length > CONFIG.LIMITS.minPhoneLength - 5).length;
        elements.statsDisplay.innerText = `Total: ${count} contacts`;
    } catch (e) {
        console.error('File read error:', e);
        elements.statsDisplay.innerText = 'Error reading file';
        elements.fileNameDisplay.className = 'file-text';
        elements.uploadBox.style.borderColor = 'var(--danger)';
    }
});

// ============================================
// CONTACT CLEANING
// ============================================
elements.btnCleanNumbers.addEventListener('click', async () => {
    const validContacts = new Map();

    const addContact = (name, number) => {
        const clean = utils.cleanNumber(number);
        if (utils.isValidNumber(clean) && !validContacts.has(clean)) {
            validContacts.set(clean, name.trim());
        }
    };

    // Process CSV file
    if (elements.csvInput.files.length > 0) {
        const text = await utils.readFile(elements.csvInput.files[0]);
        text.split('\n').forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
                addContact(parts[0], parts[1]);
            } else if (parts[0]?.trim()) {
                addContact('Customer', parts[0]);
            }
        });
    }

    // Process manual input
    if (elements.manualBox.value.trim()) {
        elements.manualBox.value.split('\n').forEach(line => {
            if (line.includes(',')) {
                const parts = line.split(',');
                addContact(parts[0], parts[1]);
            } else {
                addContact('Customer', line);
            }
        });
    }

    if (validContacts.size === 0) {
        alert('No valid numbers found!');
        return;
    }

    // Build output
    let outputText = '';
    validContacts.forEach((name, number) => {
        outputText += `${name},${number}\n`;
    });

    elements.manualBox.value = outputText.trim();
    elements.csvInput.value = '';
    elements.fileNameDisplay.innerText = '📂 Data merged successfully';
    elements.fileNameDisplay.className = 'file-text uploaded';
    elements.statsDisplay.innerText = `Total: ${validContacts.size} contacts`;
});

// ============================================
// BROADCAST MANAGEMENT
// ============================================
function parseContactsFromText(text) {
    const contacts = [];

    text.split('\n').forEach(line => {
        let name = 'Customer';
        let numberRaw = line;

        if (line.includes(',')) {
            const parts = line.split(',');
            name = parts[0].trim();
            numberRaw = parts[1];
        }

        if (numberRaw) {
            const cleanNum = utils.cleanNumber(numberRaw);
            if (utils.isValidNumber(cleanNum)) {
                contacts.push({ number: cleanNum, name });
            }
        }
    });

    return contacts;
}

elements.startBtn.addEventListener('click', async () => {
    const manualNumbers = elements.manualBox.value;
    const rawHtml = elements.msgBox.innerHTML;
    const message = convertHtmlToWhatsApp(rawHtml);

    if (!message.trim()) {
        alert('Message is empty!');
        return;
    }

    const minGap = parseInt(elements.minGap.value) || 5;
    const maxGap = parseInt(elements.maxGap.value) || 10;
    const finalData = parseContactsFromText(manualNumbers);

    if (finalData.length === 0) {
        alert('Please add numbers first!');
        return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const historyData = await storage.get([STORAGE_KEYS.history]);

    let history = historyData[STORAGE_KEYS.history] || [];
    const newSession = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        total: finalData.length,
        logs: [],
    };

    history.unshift(newSession);
    if (history.length > CONFIG.LIMITS.maxHistoryItems) history = history.slice(0, CONFIG.LIMITS.maxHistoryItems);

    const storagePayload = {
        [STORAGE_KEYS.history]: history,
        pendingData: finalData,
        message,
        minGap,
        maxGap,
        status: 'active',
        currentSessionId: newSession.id,
    };

    // Handle media attachment
    if (elements.mediaInput.files.length > 0) {
        const file = elements.mediaInput.files[0];
        const reader = new FileReader();

        reader.onloadend = async () => {
            storagePayload.imageData = reader.result;
            storagePayload.fileType = file.type;
            storagePayload.fileName = file.name;

            await storage.set(storagePayload);
            chrome.tabs.sendMessage(tab.id, { action: 'initiate' });
            alert('🚀 Campaign Started! Check WhatsApp Web.');
        };

        reader.readAsDataURL(file);
    } else {
        storagePayload.imageData = null;
        storagePayload.fileType = null;

        await storage.set(storagePayload);
        chrome.tabs.sendMessage(tab.id, { action: 'initiate' });
        alert('🚀 Campaign Started! Check WhatsApp Web.');
    }
});

elements.resetBtn.addEventListener('click', async () => {
    if (confirm('Reset all data?')) {
        await storage.clear();
        alert('Reset Done!');
    }
});

// ============================================
// GROUP EXTRACTION
// ============================================
elements.extractBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'extractGroup' });
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'groupData') {
        if (request.data.length === 0) {
            alert('No numbers found!');
            return;
        }

        let csv = 'Name,Mobile Number\n';
        request.data.forEach(item => {
            csv += `${item.name},${item.number}\n`;
        });

        utils.downloadFile(csv, `Group_${Date.now()}.csv`);
    }
});

// ============================================
// HISTORY MANAGEMENT
// ============================================

/**
 * Loads and renders broadcast history from storage
 */
async function loadHistory() {
    elements.historyList.innerHTML = `
        <div class="empty-state loading">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-text">Loading history...</div>
        </div>
    `;

    const data = await storage.get([STORAGE_KEYS.history]);
    const history = data[STORAGE_KEYS.history] || [];

    if (history.length === 0) {
        elements.historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">No campaigns yet. Start your first one!</div>
            </div>
        `;
        return;
    }

    elements.historyList.innerHTML = '';

    history.forEach(session => {
        const sent = session.logs.filter(x => x.status.includes('Sent')).length;
        const failed = session.logs.filter(x => x.status.includes('Failed') || x.status.includes('Invalid')).length;
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-info">
                <div class="history-date">📅 ${session.date}</div>
                <div class="history-stats">
                    <span class="sent">✅ ${sent} sent</span>
                    <span>❌ ${failed} failed</span>
                    <span>📦 ${session.total} total</span>
                </div>
            </div>
            <button class="btn-dl-csv" data-id="${session.id}">⬇️ CSV</button>
        `;
        elements.historyList.appendChild(div);
    });

    document.querySelectorAll('.btn-dl-csv').forEach(btn => {
        btn.addEventListener('click', (e) => downloadSessionCSV(e.target.dataset.id));
    });
}

async function downloadSessionCSV(id) {
    const data = await storage.get([STORAGE_KEYS.history]);
    const session = data[STORAGE_KEYS.history].find(x => x.id === Number(id));

    if (!session) return;

    let csv = 'Name,Number,Status,Time\n';
    session.logs.forEach(row => {
        csv += `${row.name},${row.number},${row.status},${row.time}\n`;
    });

    utils.downloadFile(csv, `Report_${session.date.split(',')[0]}_${id}.csv`);
}

elements.refreshHistory.addEventListener('click', loadHistory);
document.querySelector('.tab[data-tab="tab-history"]').addEventListener('click', loadHistory);

// ============================================
// MEDIA UPLOAD UI
// ============================================
elements.mediaBox.addEventListener('click', () => elements.mediaInput.click());

elements.mediaInput.addEventListener('change', () => {
    if (elements.mediaInput.files.length > 0) {
        const file = elements.mediaInput.files[0];
        elements.mediaNameDisplay.innerText = `📎 ${file.name}`;
        elements.mediaNameDisplay.className = 'file-text uploaded';
        elements.mediaBox.style.borderColor = 'var(--primary)';
    } else {
        elements.mediaNameDisplay.innerText = 'Click to attach image, video, or document';
        elements.mediaNameDisplay.className = 'file-text';
        elements.mediaBox.style.borderColor = 'var(--border)';
    }
});
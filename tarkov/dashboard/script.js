const API_URL = 'https://api.tarkov.dev/graphql';

let tarkovData = {
    status: null,
    traders: [],
    marketItems: [],
    barters: []
};

// Liste für den Markt (PvE teuer/beliebt)
const MARKET_ITEM_NAMES = [
    "Graphics card", "Physical bitcoin", "LedX Skin Transilluminator", 
    "Intelligence folder", "Defibrillator", "Bottle of Fierce Hatchling moonshine",
    "Propital", "Golden Star balm", "Military power filter"
];

async function init() {
    await fetchAllData();
    setInterval(fetchAllData, 60000); 
    setInterval(updateDynamicElements, 1000); // Uhren & Trader-Timer
    switchView('main');
}

async function fetchAllData() {
    const query = `
    {
        status { currentStatuses { status } }
        traders { name resetTime }
        marketItems: items(gameMode: pve, names: ${JSON.stringify(MARKET_ITEM_NAMES)}) {
            name lastLowPrice iconLink
        }
        barters(gameMode: pve) {
            rewardItems { item { name lastLowPrice iconLink } count }
            requiredItems { item { name lastLowPrice } count }
        }
    }`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const result = await response.json();
        tarkovData = result.data;
        renderAll();
    } catch (e) { console.error("API Error", e); }
}

function renderAll() {
    renderStatusAndTime();
    renderMarket();
    renderBarters();
    renderTraders();
}

function renderStatusAndTime() {
    const container = document.getElementById('status-summary');
    const isOnline = tarkovData.status?.currentStatuses[0].status === 0;
    
    container.innerHTML = `
        <div class="status-indicator ${isOnline ? 'status-online' : 'status-issue'}">
            EFT_SERVER: ${isOnline ? 'ONLINE' : 'ISSUES'}
        </div>
        <div style="color:var(--tarkov-dim); font-size:0.7rem;">ZONE_01 (INGAME)</div>
        <div id="clock-1" class="tarkov-clock">--:--:--</div>
        <div style="color:var(--tarkov-dim); font-size:0.7rem;">ZONE_02 (INGAME)</div>
        <div id="clock-2" class="tarkov-clock">--:--:--</div>
    `;
}

function renderMarket() {
    const container = document.getElementById('market-summary');
    container.innerHTML = tarkovData.marketItems.map(item => `
        <div class="card">
            <img src="${item.iconLink}">
            <span style="flex-grow:1">${item.name.split(' ').pop()}</span>
            <span style="color:var(--green)">${(item.lastLowPrice || 0).toLocaleString()}</span>
        </div>
    `).join('');
}

function renderBarters() {
    const container = document.getElementById('barter-summary');
    const prof = tarkovData.barters.map(b => {
        const reward = b.rewardItems[0];
        const cost = b.requiredItems.reduce((s, r) => s + (r.item.lastLowPrice * r.count), 0);
        return { name: reward.item.name, profit: (reward.item.lastLowPrice * reward.count) - cost };
    }).filter(b => b.profit > 10000).sort((a,b) => b.profit - a.profit);

    container.innerHTML = prof.slice(0, 15).map(b => `
        <div class="card">
            <span style="font-size:0.7rem">${b.name.substring(0,15)}</span>
            <span style="color:var(--green)">+${Math.round(b.profit/1000)}k</span>
        </div>
    `).join('');
}

function renderTraders() {
    const container = document.getElementById('trader-summary');
    container.innerHTML = tarkovData.traders.map(t => `
        <div class="card">
            <span>${t.name}</span>
            <span class="trader-timer" data-reset="${t.resetTime}" style="color:var(--tarkov-yellow)">--:--</span>
        </div>
    `).join('');
}

function updateDynamicElements() {
    // 1. Ingame Uhren (Faktor 7)
    const now = new Date();
    const tarkovTime1 = calculateTarkovTime(now, 0);
    const tarkovTime2 = calculateTarkovTime(now, 12);
    
    if(document.getElementById('clock-1')) document.getElementById('clock-1').innerText = tarkovTime1;
    if(document.getElementById('clock-2')) document.getElementById('clock-2').innerText = tarkovTime2;

    // 2. Trader Countdowns
    document.querySelectorAll('.trader-timer').forEach(el => {
        const diff = new Date(el.dataset.reset) - new Date();
        if (diff < 0) return el.innerText = "RESET";
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        el.innerText = `${h}:${m}:${s}`;
    });
}

function calculateTarkovTime(date, hourOffset) {
    const offsetMs = hourOffset * 60 * 60 * 1000;
    const tarkovMs = (date.getTime() * 7) + offsetMs;
    const tDate = new Date(tarkovMs);
    return tDate.toISOString().substr(11, 8);
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId === 'main' ? 'main-view' : 'detail-view').classList.add('active');
    document.getElementById('view-selector').value = viewId;
}

init();

const API_URL = 'https://api.tarkov.dev/graphql';

let tarkovData = {
    status: null,
    traders: [],
    marketItems: [],
    barters: []
};

const MARKET_ITEM_NAMES = [
    "Graphics card", "Physical bitcoin", "LedX Skin Transilluminator", 
    "Intelligence folder", "Defibrillator", "Bottle of Fierce Hatchling moonshine",
    "Propital", "Golden Star balm", "Military power filter"
];

async function init() {
    await fetchAllData();
    setInterval(fetchAllData, 60000); 
    setInterval(updateDynamicElements, 1000);
}

async function fetchAllData() {
    const query = `{
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
    renderStatusSummary();
    renderMarketSummary();
    renderBarterSummary();
    renderTraderSummary();
}

function renderStatusSummary() {
    const container = document.getElementById('status-summary');
    const isOnline = tarkovData.status?.currentStatuses[0].status === 0;
    container.innerHTML = `
        <div class="status-indicator" style="color:${isOnline ? 'var(--green)' : 'var(--red)'}; border: 1px solid ${isOnline ? 'var(--green)' : 'var(--red)'}">
            SERVER: ${isOnline ? 'ONLINE' : 'ISSUES'}
        </div>
        <div id="clock-1" class="tarkov-clock">--:--:--</div>
        <div id="clock-2" class="tarkov-clock">--:--:--</div>
    `;
}

function renderMarketSummary() {
    const container = document.getElementById('market-summary');
    container.innerHTML = tarkovData.marketItems.map(item => `
        <div class="card">
            <img src="${item.iconLink}">
            <span style="flex-grow:1">${item.name}</span>
            <span style="color:var(--green); font-weight:bold;">${(item.lastLowPrice || 0).toLocaleString()} ₽</span>
        </div>
    `).join('');
}

function renderBarterSummary() {
    const container = document.getElementById('barter-summary');
    const prof = tarkovData.barters.map(b => {
        const reward = b.rewardItems[0];
        const cost = b.requiredItems.reduce((s, r) => s + (r.item.lastLowPrice * r.count), 0);
        return { name: reward.item.name, icon: reward.item.iconLink, profit: (reward.item.lastLowPrice * reward.count) - cost };
    }).filter(b => b.profit > 10000).sort((a,b) => b.profit - a.profit);

    container.innerHTML = prof.slice(0, 15).map(b => `
        <div class="card">
            <img src="${b.icon}">
            <span style="flex-grow:1">${b.name}</span>
            <span style="color:var(--green)">+${Math.round(b.profit/1000)}k</span>
        </div>
    `).join('');
}

function renderTraderSummary() {
    const container = document.getElementById('trader-summary');
    container.innerHTML = tarkovData.traders.map(t => `
        <div class="card">
            <span>${t.name}</span>
            <span class="trader-timer" data-reset="${t.resetTime}" style="color:var(--tarkov-yellow); font-family:monospace;">--:--:--</span>
        </div>
    `).join('');
}

function updateDynamicElements() {
    const now = new Date();
    if(document.getElementById('clock-1')) document.getElementById('clock-1').innerText = calculateTarkovTime(now, 0);
    if(document.getElementById('clock-2')) document.getElementById('clock-2').innerText = calculateTarkovTime(now, 12);

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
    const mainView = document.getElementById('main-view');
    const detailView = document.getElementById('detail-view');
    const selector = document.getElementById('view-selector');

    mainView.style.display = viewId === 'main' ? 'block' : 'none';
    detailView.style.display = viewId === 'main' ? 'none' : 'block';
    selector.value = viewId;

    if (viewId !== 'main') {
        document.getElementById('detail-title').innerText = viewId.toUpperCase();
        document.getElementById('detail-content').innerHTML = document.getElementById(viewId + '-summary').innerHTML;
    }
}

init();

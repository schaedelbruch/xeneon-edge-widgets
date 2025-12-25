const API_URL = 'https://api.tarkov.dev/graphql';

let tarkovData = {
    status: null,
    traders: [],
    crafts: [],
    barters: []
};

async function init() {
    await fetchAllData();
    setInterval(fetchAllData, 60000); 
    setInterval(updateDynamicElements, 1000);
}

async function manualRefresh() {
    const btn = document.getElementById('refresh-btn');
    btn.innerText = "REFRESHING...";
    await fetchAllData();
    btn.innerText = "REFRESH_SYSTEM";
}

async function fetchAllData() {
    const query = `{
        status { currentStatuses { name status message } }
        traders { name resetTime }
        crafts(gameMode: pve) {
            station { name }
            level
            rewardItems { item { name lastLowPrice iconLink } count }
            requiredItems { item { name lastLowPrice iconLink } count }
        }
        barters(gameMode: pve) {
            trader { name }
            level
            rewardItems { item { name lastLowPrice iconLink } count }
            requiredItems { item { name lastLowPrice iconLink } count }
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
    renderCraftSummary();
    renderBarterSummary();
    renderTraderSummary();
}

function renderStatusSummary() {
    const container = document.getElementById('status-summary');
    if (!container || !tarkovData.status) return;
    const statuses = tarkovData.status.currentStatuses;
    const hasIssue = statuses.some(s => s.status !== 0);

    container.innerHTML = `
        <div class="status-indicator" style="color:${hasIssue ? 'var(--red)' : 'var(--green)'}">
            SYSTEM: ${hasIssue ? 'ISSUES' : 'OPERATIONAL'}
        </div>
        ${statuses.map(s => `
            <div class="status-item">
                <span style="color:var(--tarkov-dim)">${s.name.toUpperCase()}</span>
                <span style="color:${s.status === 0 ? 'var(--green)' : 'var(--red)'}">${s.status === 0 ? 'OK' : 'ERR'}</span>
            </div>
        `).join('')}
    `;
}

function calculateProfits(type) {
    const list = type === 'craft' ? tarkovData.crafts : tarkovData.barters;
    return list.map(item => {
        const reward = item.rewardItems[0];
        if (!reward || !reward.item.lastLowPrice) return null;
        const cost = item.requiredItems.reduce((sum, req) => sum + ((req.item.lastLowPrice || 0) * req.count), 0);
        const profit = (reward.item.lastLowPrice * reward.count) - cost;
        return { 
            ...item, 
            profit, 
            name: reward.item.name, 
            icon: reward.item.iconLink,
            location: type === 'craft' ? item.station.name : item.trader.name
        };
    }).filter(i => i && i.profit > 5000).sort((a,b) => b.profit - a.profit);
}

function renderCraftSummary() {
    const container = document.getElementById('craft-summary');
    if (!container) return;
    const profits = calculateProfits('craft');
    // Geändert auf die 20 besten Crafts
    container.innerHTML = profits.slice(0, 20).map(c => `
        <div class="card">
            <img src="${c.icon}">
            <div style="flex-grow:1; display:flex; flex-direction:column;">
                <span style="font-size:0.85rem">${c.name}</span>
                <small style="color:var(--tarkov-dim)">${c.location}</small>
            </div>
            <span style="color:var(--green); font-weight:bold;">+${Math.round(c.profit/1000)}k</span>
        </div>
    `).join('');
}

function renderBarterSummary() {
    const container = document.getElementById('barter-summary');
    if (!container) return;
    const profits = calculateProfits('barter');
    // Geändert auf die 20 besten Barter
    container.innerHTML = profits.slice(0, 20).map(b => `
        <div class="card">
            <img src="${b.icon}">
            <div style="flex-grow:1; display:flex; flex-direction:column;">
                <span style="font-size:0.85rem">${b.name}</span>
                <small style="color:var(--tarkov-dim)">${b.location}</small>
            </div>
            <span style="color:var(--green)">+${Math.round(b.profit/1000)}k</span>
        </div>
    `).join('');
}

function renderTraderSummary() {
    const container = document.getElementById('trader-summary');
    if (!container) return;
    container.innerHTML = tarkovData.traders.map(t => `
        <div class="card">
            <span style="font-size:0.9rem">${t.name}</span>
            <span class="trader-timer" data-reset="${t.resetTime}" style="color:var(--tarkov-yellow); font-family:monospace;">--:--:--</span>
        </div>
    `).join('');
}

function switchView(viewId) {
    const mainView = document.getElementById('main-view');
    const detailView = document.getElementById('detail-view');
    mainView.style.display = viewId === 'main' ? 'block' : 'none';
    detailView.style.display = viewId === 'main' ? 'none' : 'block';
    
    if (viewId !== 'main') {
        const content = document.getElementById(viewId + '-summary').innerHTML;
        document.getElementById('detail-content').innerHTML = content;
    }
}

function updateDynamicElements() {
    document.querySelectorAll('.trader-timer').forEach(el => {
        const diff = new Date(el.dataset.reset) - new Date();
        if (diff < 0) return el.innerText = "RESET";
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        el.innerText = `${h}:${m}:${s}`;
    });
}

init();
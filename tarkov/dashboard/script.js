const API_URL = 'https://api.tarkov.dev/graphql';
let tarkovData = { status: null, traders: [], crafts: [], barters: [] };

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

function renderStatusSummary() {
    const container = document.getElementById('status-summary');
    if (!container || !tarkovData.status) return;
    
    container.innerHTML = tarkovData.status.currentStatuses.map(s => {
        const statusClass = s.status === 0 ? 'status-ok' : 'status-err';
        const statusLabel = s.status === 0 ? 'OPERATIONAL' : 'ERROR';
        
        return `
            <div class="status-item">
                <div style="display:flex; flex-direction:column;">
                    <span style="color:var(--tarkov-dim); font-size:0.7rem; letter-spacing:1px;">${s.name.toUpperCase()}</span>
                    <span style="font-size:0.9rem; color:var(--tarkov-text)">${statusLabel}</span>
                </div>
                <div class="status-indicator ${statusClass}"></div>
            </div>
        `;
    }).join('');
}

function renderCraftSummary() {
    const profits = calculateProfits('craft');
    document.getElementById('craft-summary').innerHTML = profits.slice(0, 20).map(c => `
        <div class="card">
            <img src="${c.icon}">
            <div style="flex-grow:1; display:flex; flex-direction:column;">
                <span>${c.name}</span>
                <small style="color:var(--tarkov-dim)">${c.location} LVL ${c.level}</small>
            </div>
            <span style="color:var(--green); font-weight:bold;">+${Math.round(c.profit/1000)}k</span>
        </div>
    `).join('');
}

function renderBarterSummary() {
    const profits = calculateProfits('barter');
    document.getElementById('barter-summary').innerHTML = profits.slice(0, 20).map(b => `
        <div class="card">
            <img src="${b.icon}">
            <div style="flex-grow:1; display:flex; flex-direction:column;">
                <span>${b.name}</span>
                <small style="color:var(--tarkov-dim)">${b.location} LVL ${b.level}</small>
            </div>
            <span style="color:var(--green); font-weight:bold;">+${Math.round(b.profit/1000)}k</span>
        </div>
    `).join('');
}

function renderTraderSummary() {
    document.getElementById('trader-summary').innerHTML = tarkovData.traders.map(t => `
        <div class="card">
            <span>${t.name}</span>
            <span class="trader-timer" data-reset="${t.resetTime}" style="color:var(--tarkov-yellow); font-family:monospace;">--:--:--</span>
        </div>
    `).join('');
}

function renderDetails(viewId) {
    const container = document.getElementById('detail-content');
    
    if (viewId === 'status') {
        container.innerHTML = `
            <div style="padding:20px; border:1px solid var(--tarkov-border); background:rgba(0,0,0,0.3);">
                <h3 style="color:var(--tarkov-yellow); margin-top:0;">SYSTEM_DIAGNOSTICS_REPORT</h3>
                ${tarkovData.status.currentStatuses.map(s => `
                    <div style="margin-bottom:20px; padding-bottom:10px; border-bottom:1px solid #222;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="font-size:1.2rem;">${s.name}</strong>
                            <span class="status-indicator ${s.status === 0 ? 'status-ok' : 'status-err'}"></span>
                        </div>
                        <p style="color:${s.status === 0 ? 'var(--green)' : 'var(--red)'}; margin:5px 0;">
                            STATUS: ${s.status === 0 ? 'ONLINE' : 'OFFLINE'}
                        </p>
                        ${s.message ? `<small style="color:var(--tarkov-dim)">LOG: ${s.message}</small>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    } else if (viewId === 'craft' || viewId === 'barter') {
        const profits = calculateProfits(viewId);
        container.innerHTML = profits.slice(0, 20).map(item => `
            <div class="detail-card">
                <div class="detail-card-header">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${item.icon}" width="40">
                        <div>
                            <strong style="font-size:1.1rem">${item.name}</strong><br>
                            <small style="color:var(--tarkov-yellow)">${item.location} (LVL ${item.level})</small>
                        </div>
                    </div>
                    <div style="color:var(--green); font-weight:bold; font-size:1.2rem;">+${item.profit.toLocaleString()} ₽</div>
                </div>
                <div class="req-item-list">
                    ${item.requiredItems.map(ri => `
                        <div class="req-item-row">
                            <span>${ri.count}x ${ri.item.name}</span>
                            <span>${((ri.item.lastLowPrice || 0) * ri.count).toLocaleString()} ₽</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = document.getElementById(viewId + '-summary').innerHTML;
    }
}

function switchView(viewId) {
    const mainView = document.getElementById('main-view');
    const detailView = document.getElementById('detail-view');
    const selector = document.getElementById('view-selector');
    
    mainView.style.display = viewId === 'main' ? 'block' : 'none';
    detailView.style.display = viewId === 'main' ? 'none' : 'flex';
    selector.value = viewId;

    if (viewId !== 'main') {
        document.getElementById('detail-title').innerText = viewId.toUpperCase() + "_ANALYSIS";
        renderDetails(viewId);
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
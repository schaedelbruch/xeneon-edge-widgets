/**
 * Tarkov Xeneon Edge OS - Core Logic
 * API: tarkov.dev GraphQL
 */

const API_URL = 'https://api.tarkov.dev/graphql';

// Globaler Daten-Cache
let tarkovData = {
    status: null,
    traders: [],
    marketItems: [],
    ammo: [],
    barters: []
};

/**
 * Initialisiert die Anwendung
 */
async function init() {
    await fetchAllData();
    
    // Intervalle setzen
    setInterval(fetchAllData, 60000);   // API-Update alle 60 Sekunden
    setInterval(updateTraderTimers, 1000); // Timer-Update jede Sekunde
    
    // Initiales Rendering der Hauptansicht
    renderMainDashboard();
}

/**
 * Holt alle benötigten Daten über eine einzige GraphQL-Abfrage
 */
async function fetchAllData() {
    const query = `
    {
        status { currentStatuses { status } }
        traders { name resetTime }
        marketItems: items(names: ["Graphics card", "Physical bitcoin", "LedX Skin Transilluminator", "Moonshine"]) {
            name lastLowPrice iconLink
        }
        ammo: items(type: ammo) {
            name
            iconLink
            properties {
                ... on ItemPropertiesAmmo {
                    damage
                    penetrationPower
                }
            }
        }
        barters {
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
        
        // Nach dem Laden UI aktualisieren
        const currentView = document.getElementById('view-selector').value;
        if (currentView === 'main') {
            renderMainDashboard();
        } else {
            renderDetails(currentView);
        }
    } catch (error) {
        console.error("Fehler beim Abrufen der Tarkov-Daten:", error);
    }
}

/**
 * Navigations-Logik: Wechselt zwischen Übersicht und Detailansichten
 */
function switchView(viewId) {
    const mainView = document.getElementById('main-view');
    const detailView = document.getElementById('detail-view');
    const selector = document.getElementById('view-selector');

    selector.value = viewId;

    if (viewId === 'main') {
        mainView.classList.add('active');
        detailView.classList.remove('active');
        renderMainDashboard();
    } else {
        mainView.classList.remove('active');
        detailView.classList.add('active');
        renderDetails(viewId);
    }
}

/**
 * Rendert die 4 Widgets der Hauptübersicht
 */
function renderMainDashboard() {
    renderStatusSummary();
    renderMarketSummary();
    renderAmmoSummary();
    renderBarterSummary();
}

/**
 * Widget 1: Status & Trader (Zusammenfassung)
 */
function renderStatusSummary() {
    const container = document.getElementById('status-summary');
    if (!tarkovData.status) return;

    const statusObj = tarkovData.status.currentStatuses[0];
    const isOnline = statusObj.status === 0;
    
    let html = `
        <div class="status-indicator ${isOnline ? 'online' : 'issue'}">
            SERVER: ${isOnline ? 'ONLINE' : 'PROBLEME'}
        </div>
        <div class="trader-mini-list">
    `;

    // Zeige die ersten 3 Trader als Vorschau
    tarkovData.traders.slice(0, 3).forEach(t => {
        html += `<div class="card mini"><span>${t.name}</span> <span class="timer" data-reset="${t.resetTime}">--:--:--</span></div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Widget 2: Markt Preise (Zusammenfassung)
 */
function renderMarketSummary() {
    const container = document.getElementById('market-summary');
    container.innerHTML = tarkovData.marketItems.map(item => `
        <div class="card">
            <img src="${item.iconLink}" width="20">
            <span>${item.name.split(' ').pop()}</span>
            <span class="price-up">${(item.lastLowPrice || 0).toLocaleString()} ₽</span>
        </div>
    `).join('');
}

/**
 * Widget 3: Munition (Zusammenfassung)
 */
function renderAmmoSummary() {
    const container = document.getElementById('ammo-summary');
    // Top 5 Munition nach Penetration
    const topAmmo = [...tarkovData.ammo]
        .filter(a => a.properties?.penetrationPower)
        .sort((a, b) => b.properties.penetrationPower - a.properties.penetrationPower)
        .slice(0, 5);

    container.innerHTML = topAmmo.map(a => `
        <div class="card mini">
            <span>${a.name.substring(0, 15)}</span>
            <span>P: <b>${a.properties.penetrationPower}</b></span>
        </div>
    `).join('');
}

/**
 * Widget 4: Barter Sniper (Zusammenfassung)
 */
function renderBarterSummary() {
    const container = document.getElementById('barter-summary');
    const profitable = calculateBarters().slice(0, 4);

    container.innerHTML = profitable.map(b => `
        <div class="card">
            <span style="font-size:0.7rem">${b.name.substring(0,12)}..</span>
            <span class="price-up">+${Math.round(b.profit/1000)}k</span>
        </div>
    `).join('');
}

/**
 * Detailansichten rendern (Volle Höhe 720px mit Scroll)
 */
function renderDetails(viewId) {
    const container = document.getElementById('detail-content');
    const title = document.getElementById('detail-title');
    container.innerHTML = ""; // Clear

    switch (viewId) {
        case 'status':
            title.innerText = "TRADER RESET TIMERS";
            container.innerHTML = tarkovData.traders.map(t => `
                <div class="card detail">
                    <span>${t.name}</span>
                    <span class="timer" data-reset="${t.resetTime}" style="color:var(--tarkov-yellow); font-family:monospace; font-size:1.1rem;">--:--:--</span>
                </div>
            `).join('');
            break;

        case 'market':
            title.innerText = "LIVE MARKET PRICES";
            container.innerHTML = tarkovData.marketItems.map(item => `
                <div class="card detail">
                    <img src="${item.iconLink}" width="32">
                    <span style="flex-grow:1; margin-left:10px">${item.name}</span>
                    <span class="price-up">${(item.lastLowPrice || 0).toLocaleString()} ₽</span>
                </div>
            `).join('');
            break;

        case 'ammo':
            title.innerText = "AMMO PENETRATION CHART";
            container.innerHTML = `
                <input type="text" id="ammo-filter" placeholder="Suchen..." onkeyup="filterAmmoList()" class="tarkov-input">
                <div id="ammo-list-full"></div>
            `;
            filterAmmoList(); // Initial befüllen
            break;

        case 'barter':
            title.innerText = "BARTER SNIPER (FLAMARKET VS. TRADER)";
            const barters = calculateBarters();
            container.innerHTML = barters.map(b => `
                <div class="card detail">
                    <img src="${b.icon}" width="32">
                    <div style="flex-grow:1; margin-left:10px">
                        <div style="font-size:0.8rem">${b.name}</div>
                        <div style="font-size:0.7rem; color:var(--tarkov-dim)">Kosten: ${b.cost.toLocaleString()} ₽</div>
                    </div>
                    <span class="price-up">+${b.profit.toLocaleString()} ₽</span>
                </div>
            `).join('');
            break;
    }
}

/**
 * Hilfsfunktion: Berechnet Profitabilität von Bartern
 */
function calculateBarters() {
    return tarkovData.barters.map(b => {
        const reward = b.rewardItems[0];
        if (!reward || !reward.item.lastLowPrice) return null;

        const sellValue = reward.item.lastLowPrice * reward.count;
        const buyCost = b.requiredItems.reduce((sum, req) => {
            return sum + ((req.item.lastLowPrice || 999999) * req.count);
        }, 0);

        return {
            name: reward.item.name,
            icon: reward.item.iconLink,
            profit: sellValue - buyCost,
            cost: buyCost
        };
    })
    .filter(b => b && b.profit > 0)
    .sort((a, b) => b.profit - a.profit);
}

/**
 * Hilfsfunktion: Filtert die Munitionsliste in der Detailansicht
 */
function filterAmmoList() {
    const input = document.getElementById('ammo-filter');
    const listContainer = document.getElementById('ammo-list-full');
    if (!input || !listContainer) return;

    const filter = input.value.toLowerCase();
    const filteredAmmo = tarkovData.ammo
        .filter(a => a.name.toLowerCase().includes(filter))
        .sort((a, b) => (b.properties?.penetrationPower || 0) - (a.properties?.penetrationPower || 0));

    listContainer.innerHTML = filteredAmmo.map(a => `
        <div class="card detail">
            <span>${a.name}</span>
            <span>P: <b style="color:var(--tarkov-yellow)">${a.properties?.penetrationPower || '?'}</b> | D: ${a.properties?.damage || '?'}</span>
        </div>
    `).join('');
}

/**
 * Update-Loop für alle sichtbaren Timer (Sekundengenau)
 */
function updateTraderTimers() {
    const timers = document.querySelectorAll('.timer');
    const now = new Date();

    timers.forEach(timer => {
        const resetDate = new Date(timer.getAttribute('data-reset'));
        const diff = resetDate - now;

        if (diff <= 0) {
            timer.innerText = "RESETTING...";
            timer.style.color = "var(--green)";
        } else {
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            timer.innerText = `${h}:${m}:${s}`;
            
            // Warnung wenn unter 5 Minuten
            if (diff < 300000) {
                timer.style.color = "var(--tarkov-yellow)";
                timer.style.fontWeight = "bold";
            }
        }
    });
}

// App starten
init();

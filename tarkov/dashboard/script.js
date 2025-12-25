const API_URL = 'https://api.tarkov.dev/graphql';
let allAmmo = []; // Globaler Speicher für die Filter-Funktion

async function fetchTarkovData() {
    // Erweiterte Query für Status, Icons und verbesserte Crafts
    const query = `
    {
        status { currentStatuses { status } }
        traders { name resetTime }
        items(names: ["Graphics card", "Physical bitcoin", "LedX Skin Transilluminator", "Moonshine"]) {
            name
            lastLowPrice
            iconLink
        }
        ammo: items(type: ammo) {
            name
            properties {
                ... on ItemPropertiesAmmo {
                    damage
                    penetrationPower
                }
            }
        }
        crafts {
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
        const json = await response.json();
        const data = json.data;

        allAmmo = data.ammo; // Speichern für Suche

        renderStatus(data.status.currentStatuses[0]);
        renderTraders(data.traders);
        renderPrices(data.items);
        renderAmmo(data.ammo);
        renderCrafts(data.crafts);
    } catch (e) {
        console.error("API Error", e);
        document.getElementById('server-status').innerText = "API-FEHLER";
    }
}

function renderStatus(statusData) {
    const el = document.getElementById('server-status');
    const isOnline = statusData.status === 0;
    el.innerText = isOnline ? "SERVER: ONLINE" : "SERVER: PROBLEME";
    el.style.color = isOnline ? "var(--green)" : "var(--accent)";
}

function renderTraders(traders) {
    const container = document.getElementById('trader-list');
    container.innerHTML = traders.map(t => {
        const timeLeft = new Date(t.resetTime) - new Date();
        const hours = Math.max(0, Math.floor(timeLeft / 3600000));
        return `<div class="card"><span>${t.name}</span> <span style="color:var(--accent)">${hours}h Reset</span></div>`;
    }).join('');
}

function renderPrices(items) {
    const container = document.getElementById('price-ticker');
    container.innerHTML = items.map(item => `
        <div class="card">
            <img src="${item.iconLink}">
            <span style="flex-grow:1">${item.name}</span>
            <span class="price-up">${(item.lastLowPrice || 0).toLocaleString()} ₽</span>
        </div>
    `).join('');
}

function renderAmmo(ammo) {
    // Standardmäßig nur starke Munition zeigen (Pen > 30)
    const topAmmo = ammo.filter(a => a.properties?.penetrationPower > 30)
                        .sort((a,b) => b.properties.penetrationPower - a.properties.penetrationPower);
    displayAmmo(topAmmo.slice(0, 15));
}

function displayAmmo(list) {
    const container = document.getElementById('ammo-table');
    container.innerHTML = list.map(a => `
        <div class="card" style="font-size: 0.75rem;">
            <span>${a.name.replace(' (variant)','').substring(0, 22)}</span>
            <span>P: <b>${a.properties.penetrationPower}</b> | D: ${a.properties.damage}</span>
        </div>
    `).join('');
}

// Suchfunktion für Munition
function filterAmmo() {
    const val = document.getElementById('ammo-search').value.toLowerCase();
    const filtered = allAmmo.filter(a => a.name.toLowerCase().includes(val));
    displayAmmo(filtered.slice(0, 15));
}

function renderCrafts(crafts) {
    const container = document.getElementById('craft-list');
    // Profit-Berechnung: (Ertrag * Menge) - Kosten aller Materialien
    const profitCrafts = crafts.map(c => {
        const reward = c.rewardItems[0];
        const sellPrice = (reward.item.lastLowPrice || 0) * reward.count;
        const cost = c.requiredItems.reduce((acc, curr) => acc + ((curr.item.lastLowPrice || 0) * curr.count), 0);
        return { 
            name: reward.item.name, 
            profit: sellPrice - cost,
            icon: reward.item.iconLink 
        };
    })
    .filter(c => c.profit > 1000) // Nur profitable zeigen
    .sort((a,b) => b.profit - a.profit);

    container.innerHTML = profitCrafts.slice(0, 8).map(c => `
        <div class="card">
            <img src="${c.icon}">
            <span style="flex-grow:1">${c.name.substring(0,18)}...</span>
            <span class="price-up">+${Math.round(c.profit/1000)}k</span>
        </div>
    `).join('');
}

// Initialer Start
fetchTarkovData();
setInterval(fetchTarkovData, 300000); // Alle 5 Minuten aktualisieren

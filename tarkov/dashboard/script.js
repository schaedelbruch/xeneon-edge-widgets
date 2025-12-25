const API_URL = 'https://api.tarkov.dev/graphql';

async function fetchTarkovData() {
    const query = `
    {
        traders {
            name
            resetTime
        }
        items(names: ["Graphics card", "Physical bitcoin", "LedX Skin Transilluminator", "Moonshine"]) {
            name
            lastLowPrice
            avg24hPrice
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
            rewardItems { item { name lastLowPrice } count }
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

        renderTraders(data.traders);
        renderPrices(data.items);
        renderAmmo(data.ammo);
        renderCrafts(data.crafts);
    } catch (e) {
        console.error("API Error", e);
    }
}

function renderTraders(traders) {
    const container = document.getElementById('trader-list');
    container.innerHTML = traders.map(t => {
        const timeLeft = new Date(t.resetTime) - new Date();
        const hours = Math.floor(timeLeft / 3600000);
        return `<div class="card"><span>${t.name}</span> <span style="color:var(--accent)">${hours}h Reset</span></div>`;
    }).join('');
}

function renderPrices(items) {
    const container = document.getElementById('price-ticker');
    container.innerHTML = items.map(item => `
        <div class="card">
            <span>${item.name}</span>
            <span class="price-up">${item.lastLowPrice.toLocaleString()} ₽</span>
        </div>
    `).join('');
}

function renderAmmo(ammo) {
    const container = document.getElementById('ammo-table');
    // Nur Top-Munition zeigen (Pen > 30) zur Übersicht
    const topAmmo = ammo.filter(a => a.properties?.penetrationPower > 30)
                        .sort((a,b) => b.properties.penetrationPower - a.properties.penetrationPower);
    
    container.innerHTML = topAmmo.slice(0, 15).map(a => `
        <div class="card" style="font-size: 0.85rem;">
            <span>${a.name.replace(' (variant)','')}</span>
            <span>P: <b>${a.properties.penetrationPower}</b> | D: ${a.properties.damage}</span>
        </div>
    `).join('');
}

function renderCrafts(crafts) {
    const container = document.getElementById('craft-list');
    // Einfache Profit-Berechnung (Verkaufspreis - Materialkosten)
    const profitCrafts = crafts.map(c => {
        const sellPrice = c.rewardItems[0].item.lastLowPrice * c.rewardItems[0].count;
        const cost = c.requiredItems.reduce((acc, curr) => acc + (curr.item.lastLowPrice * curr.count), 0);
        return { name: c.rewardItems[0].item.name, profit: sellPrice - cost };
    }).sort((a,b) => b.profit - a.profit);

    container.innerHTML = profitCrafts.slice(0, 8).map(c => `
        <div class="card">
            <span>${c.name}</span>
            <span class="price-up">+${Math.round(c.profit/1000)}k</span>
        </div>
    `).join('');
}

// Initial laden und Intervall setzen (alle 5 Min)
fetchTarkovData();
setInterval(fetchTarkovData, 300000);

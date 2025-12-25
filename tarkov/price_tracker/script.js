async function fetchItemPrice(itemName) {
    const query = `{
        itemsByName(name: "${itemName}") {
            name
            avg24hPrice
            iconLink
        }
    }`;

    try {
        const response = await fetch('https://api.tarkov.dev/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const result = await response.json();
        const item = result.data.itemsByName[0];

        document.getElementById('item-name').innerText = item.name;
        document.getElementById('item-price').innerText = item.avg24hPrice.toLocaleString() + ' ₽';
        document.getElementById('item-icon').src = item.iconLink;
    } catch (e) {
        console.error("Fehler beim Abrufen des Items", e);
    }
}

// Beispiel: Grafikkarte
fetchItemPrice("Graphics card");
setInterval(() => fetchItemPrice("Graphics card"), 300000); // Alle 5 Min
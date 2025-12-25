const API_URL = 'https://api.tarkov.dev/graphql';

async function updateStatus() {
    const query = `{
        status {
            currentStatuses {
                status
            }
        }
    }`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const result = await response.json();
        const statusData = result.data.status.currentStatuses[0];
        
        const display = document.getElementById('status-display');
        
        // Status 0 ist in der Regel "OK"
        if (statusData.status === 0) {
            display.innerText = 'ONLINE';
            display.className = 'status-online';
        } else {
            display.innerText = 'PROBLEME';
            display.className = 'status-issue';
        }
    } catch (error) {
        console.error('Fehler beim Laden des Status:', error);
    }
}

updateStatus();
setInterval(updateStatus, 60000); // Jede Minute
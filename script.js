// ========================================
// osu! Random Profile Viewer
// ========================================

const API_BASE = 'https://osu.ppy.sh/api/v2';
let currentToken = null;
let tokenExpiry = 0;

// ========================================
// Authentication
// ========================================
async function getToken() {
    if (currentToken && Date.now() < tokenExpiry) {
        return currentToken;
    }

    try {
        const response = await fetch('https://osu.ppy.sh/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: 5,
                client_secret: '',
                grant_type: 'client_credentials',
                scope: 'public'
            })
        });

        if (!response.ok) {
            throw new Error('Error al obtener token de autenticación');
        }

        const data = await response.json();
        currentToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
        
        console.log('Token obtenido exitosamente');
        return currentToken;
    } catch (error) {
        console.error('Error getting token:', error);
        throw error;
    }
}

// ========================================
// Get Random Profile
// ========================================
async function getRandomProfile() {
    const mode = document.getElementById('modeSelect').value;
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const profileCard = document.getElementById('profileCard');
    const randomBtn = document.getElementById('randomBtn');

    // Reset UI
    loading.style.display = 'flex';
    errorMessage.style.display = 'none';
    profileCard.classList.remove('visible');
    randomBtn.disabled = true;

    try {
        const token = await getToken();
        
        let userProfile = null;
        let attempts = 0;
        const maxAttempts = 15;

        while (!userProfile && attempts < maxAttempts) {
            attempts++;
            const randomId = Math.floor(Math.random() * 19999000) + 1000;
            
            try {
                const response = await fetch(`${API_BASE}/users/${randomId}/${mode}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (response.status === 404) {
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                userProfile = await response.json();
            } catch (err) {
                if (attempts === maxAttempts) throw err;
                continue;
            }
        }

        if (!userProfile) {
            throw new Error('No se pudo encontrar un perfil válido después de varios intentos');
        }

        displayProfile(userProfile, mode);

    } catch (error) {
        showError(`Error: ${error.message}. Inténtalo de nuevo.`);
    } finally {
        loading.style.display = 'none';
        randomBtn.disabled = false;
    }
}

// ========================================
// Display Profile
// ========================================
function displayProfile(profile, mode) {
    const profileCard = document.getElementById('profileCard');
    
    // Avatar
    const avatar = document.getElementById('avatar');
    avatar.src = profile.avatar_url || 'https://osu.ppy.sh/images/defaults/avatar.png';
    avatar.onerror = () => {
        avatar.src = 'https://osu.ppy.sh/images/defaults/avatar.png';
    };
    
    // Username & ID
    document.getElementById('username').textContent = profile.username;
    document.getElementById('userId').textContent = `ID: ${profile.id}`;
    
    // Country Flag
    const countryCode = profile.country.code || '';
    document.getElementById('countryFlag').textContent = countryCode ? getFlagEmoji(countryCode) : '';
    
    // Statistics for selected mode
    const stats = getModeStatistics(profile, mode);
    
    if (stats) {
        document.getElementById('globalRank').textContent = stats.global_rank ? `#${formatNumber(stats.global_rank)}` : '-';
        document.getElementById('countryRank').textContent = stats.country_rank ? `#${formatNumber(stats.country_rank)}` : '-';
        document.getElementById('accuracy').textContent = `${stats.hit_accuracy.toFixed(2)}%`;
        document.getElementById('level').textContent = Math.round(stats.level.current);
    } else {
        document.getElementById('globalRank').textContent = '-';
        document.getElementById('countryRank').textContent = '-';
        document.getElementById('accuracy').textContent = '-';
        document.getElementById('level').textContent = '-';
    }
    
    // Profile Link
    document.getElementById('profileLink').href = `https://osu.ppy.sh/users/${profile.id}`;
    
    // Show card with animation
    setTimeout(() => {
        profileCard.classList.add('visible');
    }, 100);
}

// ========================================
// Helper Functions
// ========================================
function getModeStatistics(profile, mode) {
    const modeMap = {
        'osu': 'osu',
        'taiko': 'taiko',
        'fruits': 'fruits',
        'mania': 'mania'
    };
    
    const statsKey = modeMap[mode] || 'osu';
    return profile.statistics[statsKey];
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getFlagEmoji(countryCode) {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// ========================================
// Event Listeners
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    const randomBtn = document.getElementById('randomBtn');
    const modeSelect = document.getElementById('modeSelect');
    
    randomBtn.addEventListener('click', getRandomProfile);
    
    modeSelect.addEventListener('change', () => {
        getRandomProfile();
    });
    
    // Keyboard shortcut (Space bar to refresh)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'SELECT' && !e.target.disabled) {
            e.preventDefault();
            getRandomProfile();
        }
    });
    
    // Load initial profile
    getRandomProfile();
});

// ========================================
// Console Info
// ========================================
console.log('%c🎵 osu! Random Profile Viewer', 'color: #ff66aa; font-size: 20px; font-weight: bold;');
console.log('%cDescubre jugadores aleatorios de la comunidad osu!', 'color: #888888; font-size: 12px;');
console.log('%cPresiona ESPACIO para cargar un nuevo perfil', 'color: #66ccff; font-size: 12px;');

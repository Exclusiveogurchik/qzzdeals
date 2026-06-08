const UI = {
    renderCard: (deal) => {
        let dealRatingScale = Math.round(parseFloat(deal.dealRating || "0")); // 0 to 10
        let dealQualityColor = dealRatingScale >= 8 ? '#10b981' : dealRatingScale >= 5 ? '#f59e0b' : '#ef4444';
        
        let discountClass = 'discount';
        if (deal.savings >= 80) {
            discountClass += ' pulse';
        }

        const imgUrl = deal.steamAppID ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${deal.steamAppID}/header.jpg` : deal.thumb;
        const dealData = encodeURIComponent(JSON.stringify(deal));
        
        // Check if tracked
        const trackedGames = JSON.parse(localStorage.getItem('trackedGames') || '[]');
        const isTracked = trackedGames.includes(deal.title);

        const storeName = Utils.getStoreName(deal.storeID);

        return `
            <div class="game-card" data-title="${deal.title.replace(/"/g, '&quot;')}" onclick="openGameModal('${dealData}')" style="cursor: pointer;">
                <div class="card-img-wrapper" style="position: relative;">
                    <img src="${imgUrl}" alt="${deal.title}" class="card-img loading" onload="this.classList.remove('loading')" onerror="this.src='${deal.thumb}'; this.classList.remove('loading')">
                    <span class="card-store-icon">${storeName}</span>
                    
                    <button class="track-btn ${isTracked ? 'tracked' : ''}" onclick="toggleTrackPrice(event, '${deal.title.replace(/'/g, "\\'")}')" title="Отслеживать цену">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </button>
                    
                    <div class="card-hover-video-container" onmouseenter="startHoverVideo(event, '${deal.title.replace(/'/g, "\\'")}')" onmouseleave="stopHoverVideo(event)"></div>
                </div>
                <div class="card-content">
                    <h3 class="card-title" title="${deal.title.replace(/"/g, '&quot;')}">${deal.title}</h3>
                    <div class="card-pricing" style="justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div style="display:flex; gap:8px; align-items:center;">
                            <span class="discount-badge ${discountClass}">-${Math.round(deal.savings)}%</span>
                            <span class="new-price">$${deal.salePrice}</span>
                        </div>
                        <div class="card-rating" style="color: ${dealQualityColor}; font-weight: bold;">
                            ${dealRatingScale}/10
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderRankedCard: (deal) => {
        return `
            <div class="ranked-card">
                <div class="rank-number"></div>
                ${UI.renderCard(deal)}
            </div>
        `;
    },

    renderHeroBanner: (deal) => {
        const discountPercent = Math.round(deal.savings);
        const imgUrl = deal.steamAppID ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${deal.steamAppID}/header.jpg` : deal.thumb;
        return `
            <img src="${imgUrl}" alt="${deal.title}" class="hero-banner-img" id="hero-img" onerror="this.src='${deal.thumb}'">
            <div class="hero-banner-overlay">
                <div class="hero-banner-tag">🔥 Скидка дня</div>
                <h2 style="font-size: 2rem; margin-bottom: 0.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${deal.title}</h2>
                <div class="card-pricing" style="margin-bottom: 1rem;">
                    <span class="discount-badge">-${discountPercent}%</span>
                    <span class="new-price" style="font-size: 1.5rem;">$${deal.salePrice}</span>
                    <span class="old-price" style="font-size: 1rem; color: #ccc;">$${deal.normalPrice}</span>
                </div>
            </div>
        `;
    },

    showSkeletons: (containerId, count = 4) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = Array(count).fill('<div class="skeleton-card"></div>').join('');
    }
};

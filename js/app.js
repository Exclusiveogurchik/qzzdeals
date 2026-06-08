document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentStore = '';
    let currentSort = 'Deal Rating';
    let searchQuery = '';

    // Elements
    const bestDealsGrid = document.getElementById('best-deals-grid');
    const topSellingGrid = document.getElementById('top-selling-grid');
    const newDealsGrid = document.getElementById('new-deals-grid');
    const heroBanner = document.getElementById('hero-banner');
    
    const storeFilter = document.getElementById('store-filter');
    const sortFilter = document.getElementById('sort-filter');
    const searchInput = document.getElementById('search-input');
    
    const facts = [
        "Самая продаваемая игра в мире — Minecraft.",
        "Первая в мире видеоигра 'Tennis for Two' была создана в 1958 году.",
        "Пакман изначально назывался 'Puck-Man'.",
        "Самый длинный игровой марафон длился более 138 часов.",
        "Супер Марио впервые появился в игре Donkey Kong под именем Jumpman."
    ];

    // Initialize App
    let isFreeFilter = false;
    
    const init = async () => {
        // Set random fact
        const factEl = document.getElementById('loader-fact');
        if (factEl) factEl.innerText = "Интересный факт: " + facts[Math.floor(Math.random() * facts.length)];

        UI.showSkeletons('best-deals-grid', 5);
        UI.showSkeletons('top-selling-grid', 5);
        UI.showSkeletons('new-deals-grid', 10);
        
        // Wait at least 3 seconds for loading screen + fetch
        const start = Date.now();
        await loadDeals();
        
        // Wait for at least the first batch of images to load so user doesn't see popping images
        const imgs = Array.from(document.querySelectorAll('img.card-img')).slice(0, 5);
        await Promise.race([
            Promise.all(imgs.map(img => {
                if (img.complete) {
                    img.classList.remove('loading');
                    return Promise.resolve();
                }
                return new Promise(r => {
                    const cb = () => {
                        img.classList.remove('loading');
                        r();
                    };
                    img.addEventListener('load', cb);
                    img.addEventListener('error', cb);
                });
            })),
            new Promise(r => setTimeout(r, 1000)) // Max wait 1 second for images
        ]);

        const elapsed = Date.now() - start;
        if (elapsed < 3000) {
            await new Promise(r => setTimeout(r, 3000 - elapsed));
        }

        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    };

    let heroDeals = [];
    let currentHeroIndex = 0;

    const updateHeroBanner = () => {
        if (!heroDeals || heroDeals.length === 0) return;
        const deal = heroDeals[currentHeroIndex];
        const imgUrl = deal.steamAppID ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${deal.steamAppID}/header.jpg` : deal.thumb;
        
        const heroImg = document.getElementById('hero-img');
        if (heroImg) {
            heroImg.src = imgUrl;
            heroImg.onerror = function() { this.src = deal.thumb; };
        }
        
        const heroTitle = document.getElementById('hero-title');
        if (heroTitle) heroTitle.innerText = deal.title;
        
        const heroDiscount = document.getElementById('hero-discount');
        if (heroDiscount) heroDiscount.innerText = `-${Math.round(deal.savings)}%`;
        
        const heroPrice = document.getElementById('hero-price');
        if (heroPrice) heroPrice.innerText = `$${deal.salePrice}`;
        
        const heroOldPrice = document.getElementById('hero-old-price');
        if (heroOldPrice) heroOldPrice.innerText = deal.normalPrice !== deal.salePrice ? `$${deal.normalPrice}` : '';

        const heroBanner = document.getElementById('hero-banner');
        if (heroBanner) {
            heroBanner.onclick = (e) => {
                if(e.target.tagName !== 'BUTTON') {
                    window.openGameModal(encodeURIComponent(JSON.stringify(deal)));
                }
            };
            heroBanner.style.cursor = 'pointer';
        }
    };

    const bannerPrev = document.getElementById('banner-prev');
    const bannerNext = document.getElementById('banner-next');
    if (bannerPrev) {
        bannerPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            if(heroDeals.length > 0) {
                currentHeroIndex = (currentHeroIndex - 1 + heroDeals.length) % heroDeals.length;
                updateHeroBanner();
            }
        });
    }
    if (bannerNext) {
        bannerNext.addEventListener('click', (e) => {
            e.stopPropagation();
            if(heroDeals.length > 0) {
                currentHeroIndex = (currentHeroIndex + 1) % heroDeals.length;
                updateHeroBanner();
            }
        });
    }

    // Parallax logic for Hero
    const parallaxHeroBanner = document.getElementById('hero-banner');
    if (parallaxHeroBanner) {
        parallaxHeroBanner.addEventListener('mousemove', (e) => {
            const rect = parallaxHeroBanner.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            const img = document.getElementById('hero-img');
            const info = parallaxHeroBanner.querySelector('.hero-banner-info');
            
            if (img) img.style.transform = `scale(1.05) translate(${-x * 0.02}px, ${-y * 0.02}px)`;
            if (info) info.style.transform = `translate(${x * 0.02}px, ${y * 0.02}px)`;
        });
        
        parallaxHeroBanner.addEventListener('mouseleave', () => {
            const img = document.getElementById('hero-img');
            const info = parallaxHeroBanner.querySelector('.hero-banner-info');
            
            if (img) img.style.transform = `scale(1.05) translate(0, 0)`;
            if (info) info.style.transform = `translate(0, 0)`;
        });
    }

    const loadDeals = async () => {
        // Build base params
        const params = {
            sortBy: currentSort,
            pageSize: 20
        };
        if (currentStore) params.storeID = currentStore;
        if (searchQuery) params.title = searchQuery;
        if (isFreeFilter) params.upperPrice = 0;

        const deals = await API.getDeals(params);

        if (!deals || deals.length === 0) {
            const noResults = '<p style="color: var(--text-muted); padding: 1rem;">Нет результатов</p>';
            bestDealsGrid.innerHTML = noResults;
            topSellingGrid.innerHTML = noResults;
            newDealsGrid.innerHTML = noResults;
            return;
        }

        // 1. Hero Banner (pick the best deal with >70% savings)
        const heroDeal = deals.find(d => parseFloat(d.savings) > 50) || deals[0];
        if (heroBanner && heroDeal) {
            heroBanner.innerHTML = UI.renderHeroBanner(heroDeal);
        }

        // 2. Best Deals (Highest Savings)
        const bestDealsHtml = deals.slice(0, 8).map(deal => UI.renderCard(deal)).join('');
        bestDealsGrid.innerHTML = bestDealsHtml;

        // 3. Top Selling (Ranked list, let's use Metacritic or Deal Rating for "top")
        const topDealsHtml = [...deals].sort((a, b) => b.dealRating - a.dealRating).slice(0, 5).map(deal => UI.renderRankedCard(deal)).join('');
        topSellingGrid.innerHTML = topDealsHtml;

        // 4. New Deals (Just the rest)
        const newDealsHtml = deals.slice(5, 15).map(deal => UI.renderCard(deal)).join('');
        newDealsGrid.innerHTML = newDealsHtml;
    };

    // Scroll Buttons Logic
    document.querySelectorAll('.scroll-container').forEach(container => {
        const leftBtn = container.querySelector('.scroll-btn.left');
        const rightBtn = container.querySelector('.scroll-btn.right');
        const scrollArea = container.querySelector('.horizontal-scroll');

        if (leftBtn && rightBtn && scrollArea) {
            leftBtn.addEventListener('click', () => {
                scrollArea.scrollBy({ left: -300, behavior: 'smooth' });
            });
            rightBtn.addEventListener('click', () => {
                scrollArea.scrollBy({ left: 300, behavior: 'smooth' });
            });
        }
    });

    // Nav Links Logic
    const pages = {
        'all': document.getElementById('page-home'),
        'popular': document.getElementById('page-popular'),
        'free': document.getElementById('page-free'),
        'stores': document.getElementById('page-stores')
    };

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(n => n.classList.remove('active'));
            link.classList.add('active');
            
            const filter = link.getAttribute('data-filter');
            isFreeFilter = false;
            
            // Hide all pages
            Object.values(pages).forEach(p => { if(p) p.style.display = 'none'; });
            
            // Show selected page
            if (pages[filter]) pages[filter].style.display = 'block';

            if (filter === 'all') {
                currentSort = 'Deal Rating';
                searchInput.value = '';
                searchQuery = '';
                loadDeals();
            } else if (filter === 'free') {
                currentSort = 'Price';
                isFreeFilter = true;
                loadPageDeals('free-page-grid', true);
            } else if (filter === 'popular') {
                currentSort = 'Deal Rating';
                loadPageDeals('popular-page-grid', false, true);
            } else if (filter === 'preorder') {
                // Not requested explicitly to have a page, let's just go home and sort by something else or just show home
                if (pages['all']) pages['all'].style.display = 'block';
            }
        });
    });

    const loadPageDeals = async (containerId, isFree = false, isTierList = false) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '<p style="color: var(--text-muted);">Загрузка...</p>';
        
        const params = { sortBy: 'Deal Rating', pageSize: 30 };
        if (isFree) params.upperPrice = 0;
        
        const deals = await API.getDeals(params);
        if (!deals || deals.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted);">Нет данных</p>';
            return;
        }

        if (isTierList) {
            // Deduplicate games by title
            const uniqueDeals = [];
            const titles = new Set();
            for (const d of deals) {
                if (!titles.has(d.title)) {
                    titles.add(d.title);
                    uniqueDeals.push(d);
                }
            }

            const html = uniqueDeals.slice(0, 10).map((deal, i) => {
                const imgUrl = deal.steamAppID ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${deal.steamAppID}/header.jpg` : deal.thumb;
                const tierColor = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--border-color)';
                return `
                    <div style="display: flex; gap: 1.5rem; align-items: center; background: var(--bg-card); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; border-left: 4px solid ${tierColor}">
                        <div style="font-size: 2rem; font-weight: 800; color: ${tierColor}; width: 40px; text-align: center;">${i + 1}</div>
                        <img src="${imgUrl}" alt="${deal.title}" style="width: 160px; height: 90px; object-fit: cover; border-radius: 4px;" onerror="this.src='${deal.thumb}'">
                        <div style="flex: 1;">
                            <h3 style="font-size: 1.2rem; margin-bottom: 0.5rem;">${deal.title}</h3>
                            <div class="card-pricing">
                                <span class="discount-badge">-${Math.round(deal.savings)}%</span>
                                <span class="new-price">$${deal.salePrice}</span>
                                ${deal.normalPrice !== deal.salePrice ? `<span class="old-price">$${deal.normalPrice}</span>` : ''}
                            </div>
                        </div>
                        <button class="btn btn-primary">В магазин</button>
                    </div>
                `;
            }).join('');
            container.innerHTML = html;
        } else {
            container.innerHTML = deals.map(deal => UI.renderCard(deal)).join('');
        }
    };

    // We populate hero deals on initial load
    const populateHero = async () => {
        const deals = await API.getDeals({ sortBy: 'Deal Rating', pageSize: 10 });
        if (deals && deals.length > 0) {
            // Deduplicate for hero slider
            const uniqueHero = [];
            const titles = new Set();
            for (const d of deals) {
                if (!titles.has(d.title)) {
                    titles.add(d.title);
                    uniqueHero.push(d);
                }
            }
            heroDeals = uniqueHero.slice(0, 5);
            currentHeroIndex = 0;
            updateHeroBanner();
        }
    };
    
    // Call populateHero on init
    populateHero();

    // Hero Button logic
    const heroBtn = document.getElementById('hero-btn-view-all');
    if (heroBtn) {
        heroBtn.addEventListener('click', () => {
            const bestDealsSection = document.getElementById('best-deals-grid');
            if (bestDealsSection) {
                bestDealsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // Event Listeners
    storeFilter.addEventListener('change', (e) => {
        currentStore = e.target.value;
        loadDeals();
    });

    sortFilter.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadDeals();
    });

    const searchDropdown = document.getElementById('search-dropdown');
    
    searchInput.addEventListener('input', Utils.debounce(async (e) => {
        searchQuery = e.target.value.trim();
        
        if (searchQuery.length > 2) {
            // Reverted to CheapShark deals API as requested by user ("не надо во всем мире искать")
            let searchResults = await API.getDeals({ title: searchQuery, exact: 0, pageSize: 8 });
            
            if (searchResults && searchResults.length > 0) {
                // Deduplicate deals by title to avoid clutter
                const uniqueResults = [];
                const titles = new Set();
                for (const deal of searchResults) {
                    if (!titles.has(deal.title)) {
                        titles.add(deal.title);
                        uniqueResults.push(deal);
                    }
                }

                searchDropdown.innerHTML = uniqueResults.slice(0, 5).map(deal => {
                    const dealData = encodeURIComponent(JSON.stringify(deal));
                    const imgUrl = deal.steamAppID ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${deal.steamAppID}/header.jpg` : deal.thumb;

                    return `
                    <div class="search-dropdown-item" onclick="openGameModal('${dealData}')">
                        <img src="${imgUrl}" alt="${deal.title}" onerror="this.src='${deal.thumb}'">
                        <div class="search-dropdown-info">
                            <div class="search-dropdown-title">${deal.title}</div>
                            <div class="search-dropdown-price">От $${deal.salePrice}</div>
                        </div>
                    </div>`;
                }).join('');
                searchDropdown.style.display = 'block';
            } else {
                searchDropdown.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); text-align: center;">Ничего не найдено</div>';
                searchDropdown.style.display = 'block';
            }
        } else {
            searchDropdown.style.display = 'none';
        }
    }, 500));

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper')) {
            if (searchDropdown) searchDropdown.style.display = 'none';
        }
    });

    // Theme Switcher Placeholder
    // The design is dark by default. We can toggle class 'light-theme' on body to test.

    // Start
    init();
});

// Global function to open modal
window.openGameModal = async (dealDataEnc, isFromSearch = false) => {
    try {
        let deal = JSON.parse(decodeURIComponent(dealDataEnc));
        const modal = document.getElementById('game-modal');
        const modalBody = document.getElementById('modal-body');
        
        modalBody.innerHTML = '<div style="padding: 3rem; text-align: center;"><div class="loader-spinner" style="margin: 0 auto;"></div><p style="margin-top:1rem; color:var(--text-muted);">Загрузка данных об игре...</p></div>';
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Lock background scroll
        
        // If opened from RAWG search, let's find if there is a CheapShark deal!
        if (isFromSearch) {
            const csDeals = await API.getDeals({ title: deal.title, exact: 0, pageSize: 1 });
            if (csDeals && csDeals.length > 0) {
                // If a deal is found, use it
                deal = csDeals[0];
            }
        }

        const rawgDetails = await API.getRawgDetails(deal.title);
        
        const imgUrl = deal.steamAppID ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${deal.steamAppID}/header.jpg` : deal.thumb;
        const heroBg = rawgDetails && rawgDetails.background ? rawgDetails.background : imgUrl;
        
        let desc = rawgDetails ? rawgDetails.description : 'Описание временно недоступно.';
        let gameplayHtml = '';
        
        if (rawgDetails && rawgDetails.gameplay) {
            gameplayHtml = `
                <h3 class="modal-gameplay-title">Геймплей</h3>
                <img src="${rawgDetails.gameplay}" alt="Gameplay" class="modal-gameplay-img">
            `;
        }
        
        let dealRatingScale = Math.round(parseFloat(deal.dealRating || "0")); // 0 to 10
        let dealQualityColor = dealRatingScale >= 8 ? '#10b981' : dealRatingScale >= 5 ? '#f59e0b' : '#ef4444';

        let priceHtml = '';
        if (deal.dealID) {
            priceHtml = `
                <button class="btn btn-primary" onclick="window.open('https://www.cheapshark.com/redirect?dealID=${deal.dealID}', '_blank')" style="font-size: 1.1rem; padding: 0.75rem 2rem;">
                    Приобрести за $${deal.salePrice}
                </button>
                ${deal.normalPrice !== deal.salePrice ? `<span style="text-decoration: line-through; color: var(--text-muted); font-size: 1.1rem;">$${deal.normalPrice}</span> <span class="discount-badge" style="font-size: 1rem;">-${Math.round(deal.savings)}%</span>` : ''}
            `;
        } else {
            dealQualityColor = 'var(--text-muted)';
            priceHtml = `<button class="btn" style="background: var(--bg-input); cursor: default; color: var(--text-muted);">Скидок не найдено</button>`;
        }

        modalBody.innerHTML = `
            <div class="modal-hero" style="background-image: url('${heroBg}')">
                <div class="modal-hero-overlay"></div>
            </div>
            <div class="modal-info">
                <h2 class="modal-title">${deal.title}</h2>
                <div class="modal-rating" style="border-color: ${dealQualityColor}">
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Качество сделки:</span>
                    <span class="modal-rating-score" style="color: ${dealQualityColor}">${deal.dealID ? dealRatingScale + '/10' : '—'}</span>
                </div>
                <div class="modal-actions">
                    ${priceHtml}
                </div>
                <p class="modal-desc">${desc}</p>
                ${gameplayHtml}
            </div>
        `;
        
    } catch (e) {
        console.error("Modal error:", e);
    }
};

// Modal Close logic
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('game-modal');
    const closeBtn = document.getElementById('modal-close');
    
    const closeModal = () => {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Unlock background scroll
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
});

// --- TOAST NOTIFICATIONS ---
window.showToast = (message) => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> <span>${message}</span>`;
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// --- TRACKING (LOCALSTORAGE) ---
window.toggleTrackPrice = (event, gameTitle) => {
    event.stopPropagation(); // Prevent opening modal
    const btn = event.currentTarget;
    let tracked = JSON.parse(localStorage.getItem('trackedGames') || '[]');
    
    if (tracked.includes(gameTitle)) {
        tracked = tracked.filter(t => t !== gameTitle);
        btn.classList.remove('tracked');
        window.showToast(`Удалено из отслеживаемого: ${gameTitle}`);
    } else {
        tracked.push(gameTitle);
        btn.classList.add('tracked');
        window.showToast(`Добавлено в отслеживаемое: ${gameTitle}`);
    }
    
    localStorage.setItem('trackedGames', JSON.stringify(tracked));
};

// --- HOVER VIDEO (MOCK) ---
window.hoverIntervals = {};

window.startHoverVideo = async (event, gameTitle) => {
    const container = event.currentTarget;
    container.classList.add('active');
    
    // Check if we already have screenshots loaded for this game
    if (!container.dataset.screens) {
        const details = await API.getRawgDetails(gameTitle);
        if (details && details.screenshots && details.screenshots.length > 0) {
            container.dataset.screens = JSON.stringify(details.screenshots.map(s => s.image));
        } else {
            container.dataset.screens = '[]';
        }
    }

    const screens = JSON.parse(container.dataset.screens);
    if (screens.length === 0) return;

    let index = 0;
    container.style.backgroundImage = `url('${screens[0]}')`;
    
    window.hoverIntervals[gameTitle] = setInterval(() => {
        index = (index + 1) % screens.length;
        container.style.backgroundImage = `url('${screens[index]}')`;
    }, 600); // cycle every 600ms
};

window.stopHoverVideo = (event) => {
    const container = event.currentTarget;
    container.classList.remove('active');
    container.style.backgroundImage = 'none';
    for (let key in window.hoverIntervals) {
        clearInterval(window.hoverIntervals[key]);
    }
    window.hoverIntervals = {};
};

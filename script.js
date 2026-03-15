class Obamnifier {
    constructor() {
        this.sourceCanvas = document.getElementById('sourceCanvas');
        this.targetCanvas = document.getElementById('targetCanvas');
        this.outputCanvas = document.getElementById('outputCanvas');
        
        this.sourceCtx = this.sourceCanvas.getContext('2d');
        this.targetCtx = this.targetCanvas.getContext('2d');
        this.outputCtx = this.outputCanvas.getContext('2d');
        
        this.uploadedImage = null;
        this.obamaImage = null;
        this.customTargetImage = null;
        this.resolution = 64;
        this.isCustomTarget = false;
        this.currentTargetPath = './Obamna.png';
        this.communityImages = [];
        this.isAnimating = false;
        this.animationFrame = null;
        this.highResWarningShown = false; // Track if warning has been shown
        
        // Initialize database connection
        this.room = new WebsimSocket();
        
        // Subscribe to shared images updates
        this.unsubscribeImages = this.room.collection('shared_image').subscribe((images) => {
            this.communityImages = images || [];
            const grid = document.getElementById('communityGrid');
            if (grid) this.displayCommunityImages(this.communityImages);
        });
        
        // Initialize DOMPurify for XSS protection
        this.initDOMPurify();
        
        // New QoL features
        this.historyStack = [];
        this.historyIndex = -1;
        this.maxHistorySize = 10;
        this.dragCounter = 0;
        this.performanceMetrics = {
            fps: 0,
            frameCount: 0,
            lastFrameTime: performance.now(),
            memoryUsage: 0,
            processingTime: 0
        };
        this.isFullscreen = false;
        this.zoomLevel = 1;
        this.panOffset = { x: 0, y: 0 };
        this.lastSaveTime = 0;
        this.presets = {
            'high-quality': { resolution: 512, animationSpeed: 1, quality: 'high' },
            'balanced': { resolution: 256, animationSpeed: 3, quality: 'medium' },
            'fast': { resolution: 128, animationSpeed: 5, quality: 'medium' },
            'mobile-optimized': { resolution: 128, animationSpeed: 5, quality: 'low' },
            'ultra-hd': { resolution: 1024, animationSpeed: 1, quality: 'high' },
            'gif-friendly': { resolution: 64, animationSpeed: 5, quality: 'low' }
        };
        
        // Settings
        this.settings = {
            quality: 'medium',
            maxResolution: 128,
            hideUIDuringAnimation: false,
            smoothAnimations: true,
            autoSave: false,
            animationSpeed: 2,
            showProgressDetails: true,
            colorTheme: 'dark',
            showPerfMonitor: false,
            hardwareAcceleration: true,
            autoResize: true,
            keyboardShortcuts: true,
            autoSaveWIP: true,
            keepHistory: true
        };
        
        this.recentCustomTargets = JSON.parse(localStorage.getItem('obamnify-recent-targets') || '[]');
        
        this.initSettings();
        this.initNewsButton();
        this.loadSettings();
        this.initLoadingSequence();
        
        this.init();
        this.initModal();
        this.initSidebar();
        this.initDeviceSelector();
        this.initDonationButton();
        
        // Initialize new features
        this.initKeyboardShortcuts();
        this.initDragAndDrop();
        this.initPerformanceMonitor();
        this.initZoomControls();
        this.initPresets();
        this.initToastSystem();
        this.initCanvasInteractions();
        this.initFullscreen();
        this.initQuickActions();
        this.startAutoSave();
        this.initSettingsEnhancements();
    }
    
    async initDOMPurify() {
        // Import DOMPurify for sanitization
        const DOMPurify = await import('dompurify');
        this.DOMPurify = DOMPurify.default;
    }
    
    // Utility method to safely sanitize HTML content
    sanitizeHTML(html) {
        if (!this.DOMPurify) {
            console.warn('DOMPurify not loaded, falling back to text content');
            // Fallback: create a text node to escape HTML
            const div = document.createElement('div');
            div.textContent = html;
            return div.innerHTML;
        }
        return this.DOMPurify.sanitize(html);
    }
    
    // Utility method to safely set text content
    setTextContent(element, text) {
        if (typeof text !== 'string') {
            text = String(text || '');
        }
        element.textContent = text;
    }
    
    // Utility method to validate and sanitize URLs
    validateURL(url) {
        if (!url || typeof url !== 'string') return null;
        
        try {
            const urlObj = new URL(url);
            // Only allow http, https, and data URLs from trusted domains
            const allowedProtocols = ['http:', 'https:', 'data:'];
            const trustedDomains = ['websim.com', 'api.websim.com', 'images.websim.com', 'cdn.websim.com'];
            
            if (!allowedProtocols.includes(urlObj.protocol)) {
                return null;
            }
            
            // For http/https, check if domain is trusted
            if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
                const isTrusted = trustedDomains.some(domain => 
                    urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
                );
                if (!isTrusted) {
                    return null;
                }
            }
            
            return url;
        } catch {
            return null;
        }
    }
    
    // Utility method to sanitize file names
    sanitizeFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') return 'Untitled';
        
        // Remove any HTML tags and limit length
        const cleanName = fileName
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/[<>"'&]/g, '') // Remove dangerous characters
            .trim()
            .substring(0, 50); // Limit length
            
        return cleanName || 'Untitled';
    }
    
    initLoadingSequence() {
        // Simulate asset loading with proper timing
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            loadingScreen.style.animation = 'fadeOut 0.3s ease-in forwards';
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                this.showFollowPrompt();
            }, 300);
        }, 1500);
    }
    
    showFollowPrompt() {
        const followPrompt = document.getElementById('followPrompt');
        
        // Show follow prompt
        followPrompt.style.display = 'flex';
        
        // Setup follow button handlers
        const followYes = document.getElementById('followYes');
        const followNo = document.getElementById('followNo');
        
        const followYesHandler = () => {
            window.open('https://websim.com/@cybuds', '_blank');
            this.hideFollowPrompt();
        };
        
        const followNoHandler = () => {
            this.hideFollowPrompt();
        };
        
        followYes.addEventListener('click', followYesHandler);
        followNo.addEventListener('click', followNoHandler);
    }
    
    hideFollowPrompt() {
        const followPrompt = document.getElementById('followPrompt');
        
        followPrompt.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => {
            followPrompt.style.display = 'none';
            
            // Show petition notification before tutorial/device selection
            this.showPetitionNotification();
        }, 300);
    }

    showPetitionNotification() {
        const petitionNotification = document.getElementById('petitionNotification');
        petitionNotification.style.display = 'flex';
        
        // Setup petition button handlers
        const petitionYes = document.getElementById('petitionYes');
        const petitionNo = document.getElementById('petitionNo');
        
        const petitionYesHandler = () => {
            window.open('https://websim.com/@cybuds/why-i-should-be-a-websim-admin', '_blank');
            this.hidePetitionNotification();
        };
        
        const petitionNoHandler = () => {
            this.hidePetitionNotification();
        };
        
        petitionYes.addEventListener('click', petitionYesHandler);
        petitionNo.addEventListener('click', petitionNoHandler);
    }

    hidePetitionNotification() {
        const petitionNotification = document.getElementById('petitionNotification');
        
        petitionNotification.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => {
            petitionNotification.style.display = 'none';
            this.showAnnouncementNotification();
        }, 300);
    }

    showAnnouncementNotification() {
        const announcementNotification = document.getElementById('announcementNotification');
        announcementNotification.style.display = 'flex';
        
        // Setup announcement button handlers
        const announcementPlay = document.getElementById('announcementPlay');
        const announcementOk = document.getElementById('announcementOk');
        
        // Disable the "Got it" button initially and show countdown
        announcementOk.disabled = true;
        announcementOk.style.opacity = '0.5';
        announcementOk.style.cursor = 'not-allowed';
        
        let countdown = 5;
        announcementOk.textContent = `Wait ${countdown}s`;
        
        // Start countdown timer
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                announcementOk.textContent = `Wait ${countdown}s`;
            } else {
                // Enable the button after 5 seconds
                clearInterval(countdownInterval);
                announcementOk.disabled = false;
                announcementOk.style.opacity = '1';
                announcementOk.style.cursor = 'pointer';
                announcementOk.textContent = 'Got it';
            }
        }, 1000);
        
        const announcementPlayHandler = () => {
            clearInterval(countdownInterval);
            window.open('https://websim.com/@cybuds/react-with-random-phrase-generator/32', '_blank');
            this.hideAnnouncementNotification();
        };
        
        const announcementOkHandler = () => {
            if (!announcementOk.disabled) {
                clearInterval(countdownInterval);
                this.hideAnnouncementNotification();
            }
        };
        
        announcementPlay.addEventListener('click', announcementPlayHandler);
        announcementOk.addEventListener('click', announcementOkHandler);
    }

    hideAnnouncementNotification() {
        const announcementNotification = document.getElementById('announcementNotification');
        
        announcementNotification.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => {
            announcementNotification.style.display = 'none';
            this.proceedAfterPetition();
        }, 300);
    }

    proceedAfterPetition() {
        // Go directly to device selection
        this.proceedToDeviceSelection();
    }
    
    showTutorial() {
        const tutorialOverlay = document.getElementById('tutorialOverlay');
        tutorialOverlay.style.display = 'flex';
        
        // Initialize tutorial controls
        this.initTutorial();
    }
    
    initTutorial() {
        const nextBtn = document.getElementById('tutorialNext');
        const prevBtn = document.getElementById('tutorialPrev');
        const skipBtn = document.getElementById('tutorialSkip');
        
        // Next button handler
        nextBtn.addEventListener('click', () => {
            if (this.currentTutorialStep < 3) {
                this.currentTutorialStep++;
                this.updateTutorialStep();
            } else {
                this.completeTutorial();
            }
        });
        
        // Previous button handler
        prevBtn.addEventListener('click', () => {
            if (this.currentTutorialStep > 1) {
                this.currentTutorialStep--;
                this.updateTutorialStep();
            }
        });
        
        // Skip button handler
        skipBtn.addEventListener('click', () => {
            this.completeTutorial();
        });
    }
    
    updateTutorialStep() {
        // Update step indicators
        document.querySelectorAll('.tutorial-step-indicator .step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 <= this.currentTutorialStep);
        });
        
        // Update step content
        document.querySelectorAll('.tutorial-step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.currentTutorialStep);
        });
        
        // Update button visibility
        const nextBtn = document.getElementById('tutorialNext');
        const prevBtn = document.getElementById('tutorialPrev');
        
        prevBtn.style.display = this.currentTutorialStep > 1 ? 'block' : 'none';
        nextBtn.textContent = this.currentTutorialStep === 3 ? 'Got it! 🚀' : 'Next →';
    }
    
    completeTutorial() {
        // Mark tutorial as seen
        localStorage.setItem('obamnify-tutorial-seen', 'true');
        this.tutorialSeen = true;
        
        // Hide tutorial with animation
        const tutorialOverlay = document.getElementById('tutorialOverlay');
        tutorialOverlay.style.animation = 'fadeOut 0.3s ease-in forwards';
        
        setTimeout(() => {
            tutorialOverlay.style.display = 'none';
            this.proceedToDeviceSelection();
        }, 300);
    }
    
    proceedToDeviceSelection() {
        // Check for stored device preference
        const storedDevice = localStorage.getItem('obamnify-device-type');
        
        if (storedDevice) {
            // Auto-select stored device type
            this.selectDevice(storedDevice);
            document.body.classList.remove('device-selecting');
        } else {
            // Show device selector
            const deviceSelector = document.getElementById('deviceSelector');
            deviceSelector.style.display = 'flex';
            document.body.classList.add('device-selecting');
        }
    }
    
    initModal() {
        const modal = document.getElementById('updateModal');
        const closeBtn = document.getElementById('closeModal');
        
        // Create confetti effect
        this.createConfetti();
        
        // Initialize update navigation
        this.initUpdateNavigation();
        
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeModal();
        });
        
        // Close modal when clicking outside content area
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        // Prevent modal content clicks from bubbling
        const modalContent = modal.querySelector('.modal-content');
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Close modal with escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }
    
    closeModal() {
        const modal = document.getElementById('updateModal');
        modal.classList.add('hidden');
        // Remove modal after animation completes
        setTimeout(() => {
            if (modal.classList.contains('hidden')) {
                modal.style.display = 'none';
            }
        }, 200);
    }
    
    initUpdateNavigation() {
        const updateItems = document.querySelectorAll('.update-item');
        const updateEntries = document.querySelectorAll('.update-entry');
        
        updateItems.forEach(item => {
            item.addEventListener('click', () => {
                const updateId = item.dataset.update;
                
                // Update sidebar selection
                updateItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Update content display
                updateEntries.forEach(entry => entry.classList.remove('active'));
                document.getElementById(`update-${updateId}`).classList.add('active');
            });
        });
    }
    
    createConfetti() {
        const container = document.querySelector('.confetti-container');
        const colors = ['#dc2626', '#fff', '#666', '#999', '#ccc'];
        
        // Clear existing confetti first
        container.innerHTML = '';
        
        // Create confetti pieces safely
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            container.appendChild(confetti);
        }
    }
    
    initSidebar() {
        const changeTargetBtn = document.getElementById('changeTargetBtn');
        const sidebar = document.getElementById('targetSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const closeSidebar = document.getElementById('closeSidebar');
        const tabBtns = document.querySelectorAll('.tab-btn');
        const targetOptions = document.querySelectorAll('.target-option');
        const customUpload = document.getElementById('customTargetUpload');
        const shareUpload = document.getElementById('shareImageUpload');
        
        // Open sidebar
        changeTargetBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            this.updateCatalogWithRecent();
        });
        
        // Close sidebar
        const closeSidebarHandler = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };
        
        closeSidebar.addEventListener('click', closeSidebarHandler);
        overlay.addEventListener('click', closeSidebarHandler);
        
        // Tab switching
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // Update tab buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(targetTab + 'Tab').classList.add('active');
                
                if (targetTab === 'share') {
                    this.loadCommunityImages();
                }
            });
        });
        
        // Target selection from catalog
        targetOptions.forEach(option => {
            option.addEventListener('click', () => {
                const imagePath = option.dataset.image;
                this.selectCatalogTarget(imagePath);
                
                // Update UI
                targetOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                closeSidebarHandler();
            });
        });
        
        // Custom target upload
        customUpload.addEventListener('change', (e) => {
            this.handleCustomTargetUpload(e);
        });
        
        // Share image upload
        shareUpload.addEventListener('change', (e) => {
            this.handleShareImageUpload(e);
        });
    }
    
    updateCatalogWithRecent() {
        const catalogTab = document.getElementById('catalogTab');
        const targetGrid = catalogTab.querySelector('.target-grid');
        
        // Clear existing content
        targetGrid.innerHTML = '';
        
        // Add recent custom targets section if any exist
        if (this.recentCustomTargets.length > 0) {
            const recentSection = document.createElement('div');
            recentSection.className = 'recent-custom-section';
            
            const sectionTitle = document.createElement('h4');
            this.setTextContent(sectionTitle, 'Recently Used Custom Targets');
            recentSection.appendChild(sectionTitle);
            
            const recentGrid = document.createElement('div');
            recentGrid.className = 'target-grid recent-targets-grid';
            recentSection.appendChild(recentGrid);
            
            // Show last 4 recent targets
            this.recentCustomTargets.slice(-4).reverse().forEach(target => {
                if (!target || !target.dataUrl || !target.name) return;
                
                const option = document.createElement('div');
                option.className = 'target-option custom-recent';
                
                // Create elements safely
                const indicator = document.createElement('div');
                indicator.className = 'custom-target-indicator';
                this.setTextContent(indicator, 'Custom');
                
                const img = document.createElement('img');
                const validUrl = this.validateURL(target.dataUrl);
                if (validUrl) {
                    img.src = validUrl;
                    img.alt = this.sanitizeFileName(target.name);
                    img.loading = 'lazy';
                } else {
                    img.alt = 'Invalid image';
                    img.style.display = 'none';
                }
                
                const span = document.createElement('span');
                this.setTextContent(span, this.sanitizeFileName(target.name));
                
                option.appendChild(indicator);
                option.appendChild(img);
                option.appendChild(span);
                
                option.addEventListener('click', () => {
                    this.selectCustomTargetFromData(target);
                    this.updateTargetSelection(option);
                    this.closeSidebarHandler();
                });
                
                recentGrid.appendChild(option);
            });
            
            catalogTab.insertBefore(recentSection, targetGrid);
        }
        
        // Add default catalog targets
        const catalogTargets = [
            { image: './Obamna.png', name: 'Obama' },
            { image: './trump.png', name: 'Trump' },
            { image: './mrbeast.png', name: 'MrBeast' },
            { image: './shrek.png', name: 'Shrek' },
            { image: './cheems.png', name: 'Cheems' },
            { image: './gigachad.png', name: 'Gigachad' },
            { image: './skibidi.png', name: 'Skibidi' },
            { image: './eye of rah guy.png', name: 'Eye of Rah' },
            { image: './property in egypt.png', name: 'Property Guy' },
            { image: './67 kid.png', name: '67 Kid' }
            { image: './NurmaliaSr.png', name: 'Me (Roblox)' }
        ];
        
        catalogTargets.forEach(target => {
            const option = document.createElement('div');
            option.className = 'target-option';
            option.dataset.image = target.image;
            
            const img = document.createElement('img');
            img.src = target.image;
            img.alt = target.name;
            
            const span = document.createElement('span');
            this.setTextContent(span, target.name);
            
            option.appendChild(img);
            option.appendChild(span);
            
            option.addEventListener('click', () => {
                this.selectCatalogTarget(target.image);
                this.updateTargetSelection(option);
                this.closeSidebarHandler();
            });
            
            targetGrid.appendChild(option);
        });
    }
    
    updateTargetSelection(selectedOption) {
        // Update UI selection
        document.querySelectorAll('.target-option').forEach(opt => opt.classList.remove('selected'));
        selectedOption.classList.add('selected');
    }
    
    closeSidebarHandler() {
        const sidebar = document.getElementById('targetSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
    
    selectCustomTargetFromData(targetData) {
        const img = new Image();
        img.onload = () => {
            this.customTargetImage = img;
            this.isCustomTarget = true;
            this.currentTargetPath = `custom_${targetData.name}`;
            this.drawTargetImage();
            document.getElementById('revertBtn').style.display = 'block';
        };
        img.src = targetData.dataUrl;
    }
    
    initDeviceSelector() {
        const deviceSelector = document.getElementById('deviceSelector');
        const deviceBtns = document.querySelectorAll('.device-btn');
        
        // Add class to body to hide other elements during device selection
        document.body.classList.add('device-selecting');
        
        deviceBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const deviceType = btn.dataset.device;
                this.selectDevice(deviceType);
                
                // Hide device selector
                deviceSelector.style.animation = 'fadeOut 0.3s ease-in forwards';
                setTimeout(() => {
                    deviceSelector.style.display = 'none';
                    document.body.classList.remove('device-selecting');
                }, 300);
            });
        });
    }
    
    selectDevice(deviceType) {
        if (!deviceType) return;
        
        this.deviceType = deviceType;
        
        // Remove any existing device classes
        document.body.classList.remove('desktop-device', 'mobile-device', 'tablet-device');
        document.body.classList.add(`${deviceType}-device`);
        
        // Store preference
        localStorage.setItem('obamnify-device-type', deviceType);
        
        // Apply device-specific optimizations
        const resolutionSlider = document.getElementById('resolution');
        const maxResSlider = document.getElementById('maxResSetting');
        
        if (deviceType === 'mobile') {
            // Mobile now gets full power like desktop!
            this.settings.maxResolution = 2048; // Full resolution available
            resolutionSlider.max = 2048;
            maxResSlider.max = 2048;
            maxResSlider.value = 2048;
            
            setTimeout(() => {
                alert('📱 Mobile Device Detected!\n\n🚀 Full power unlocked! You now have access to resolutions up to 2048px just like desktop.\n\nNote: Very high resolutions may still be slow, but go wild!');
            }, 1000);
            
        } else if (deviceType === 'tablet') {
            // Tablet optimizations with warnings  
            resolutionSlider.value = Math.min(56, this.settings.maxResolution);
            resolutionSlider.max = 2048; // Allow high res but with warnings
            this.resolution = Math.min(56, this.settings.maxResolution);
            
            this.settings.maxResolution = Math.min(this.settings.maxResolution, 2048);
            maxResSlider.max = 2048;
            
            // Show initial warning about high resolutions
            setTimeout(() => {
                alert('📱 Tablet Device Detected!\n\n⚠️ WARNING: Resolutions above 256px may crash your device. Use with caution!\n\nFor best performance, keep resolution under 256px.');
            }, 1000);
            
        } else if (deviceType === 'desktop') {
            // Desktop optimizations - full power!
            this.settings.quality = 'high';
            this.settings.maxResolution = 2048; // Full resolution available
            this.settings.smoothAnimations = true;
            resolutionSlider.max = 2048;
            maxResSlider.max = 2048;
            maxResSlider.value = 2048;
            
            setTimeout(() => {
                alert('💻 Desktop Detected!\n\n🚀 Full power unlocked! You can now use resolutions up to 2048px.\n\nNote: Very high resolutions may still be slow, but your desktop can handle it!');
            }, 1000);
        }
        
        // Update UI elements
        document.getElementById('resolutionValue').textContent = this.resolution;
        document.getElementById('maxResValue').textContent = this.settings.maxResolution;
        this.applySettings();
        
        console.log(`Device type selected: ${deviceType} with optimizations applied`);
    }
    
    initDonationButton() {
        const donationBtn = document.getElementById('donationBtn');
        
        donationBtn.addEventListener('click', async () => {
            try {
                // Add visual feedback
                donationBtn.style.transform = 'translateY(-2px) scale(0.95)';
                setTimeout(() => {
                    donationBtn.style.transform = 'translateY(-2px) scale(1.05)';
                }, 100);
                
                // Post a comment with minimum tip (10 credits)
                const result = await window.websim.postComment({
                    content: "Thanks for creating Obamnify! Here's a little tip to support the project 💰✨",
                    credits: 10
                });
                
                if (result.error) {
                    console.error('Donation failed:', result.error);
                    alert('Oops! Something went wrong with the donation. Please try again.');
                } else {
                    // Visual feedback for success
                    donationBtn.textContent = '💖 thank you!';
                    donationBtn.style.background = '#10b981';
                    setTimeout(() => {
                        donationBtn.textContent = '💰 gimme money';
                        donationBtn.style.background = '#2563eb';
                    }, 3000);
                }
            } catch (error) {
                console.error('Donation error:', error);
                alert('Oops! Something went wrong. Please make sure you\'re logged in and try again.');
            }
        });
        
        // Device settings button
        const deviceSettingsBtn = document.getElementById('deviceSettingsBtn');
        deviceSettingsBtn.addEventListener('click', () => {
            this.showDeviceSelector();
        });
    }
    
    showDeviceSelector() {
        const deviceSelector = document.getElementById('deviceSelector');
        
        // Show the device selector
        deviceSelector.style.display = 'flex';
        deviceSelector.style.animation = 'fadeIn 0.3s ease-out';
        
        // Add class to body to show we're in device selection mode
        document.body.classList.add('device-selecting');
    }
    
    initSettings() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsOverlay = document.getElementById('settingsOverlay');
        const closeSettings = document.getElementById('closeSettings');
        
        // Settings controls
        const qualitySetting = document.getElementById('qualitySetting');
        const maxResSetting = document.getElementById('maxResSetting');
        const maxResValue = document.getElementById('maxResValue');
        const hideUISetting = document.getElementById('hideUISetting');
        const smoothAnimSetting = document.getElementById('smoothAnimSetting');
        const autoSaveSetting = document.getElementById('autoSaveSetting');
        const animSpeedSetting = document.getElementById('animSpeedSetting');
        const animSpeedValue = document.getElementById('animSpeedValue');
        const progressDetailsSetting = document.getElementById('progressDetailsSetting');
        
        // Open settings
        settingsBtn.addEventListener('click', () => {
            settingsOverlay.style.display = 'flex';
            this.updateSettingsUI();
        });
        
        // Close settings
        const closeSettingsHandler = () => {
            settingsOverlay.style.display = 'none';
        };
        
        closeSettings.addEventListener('click', closeSettingsHandler);
        settingsOverlay.addEventListener('click', (e) => {
            if (e.target === settingsOverlay) {
                closeSettingsHandler();
            }
        });
        
        // Settings event listeners
        qualitySetting.addEventListener('change', (e) => {
            this.settings.quality = e.target.value;
            this.applySettings();
            this.saveSettings();
        });
        
        maxResSetting.addEventListener('input', (e) => {
            const newRes = parseInt(e.target.value);
            this.settings.maxResolution = newRes;
            maxResValue.textContent = newRes;
            
            // Show warning for high resolutions on non-desktop devices (only once)
            if (newRes > 256 && this.deviceType !== 'desktop' && !this.highResWarningShown) {
                alert('⚠️ WARNING: Resolutions above 256px may crash your device! Consider using a desktop for high-resolution transformations.');
                this.highResWarningShown = true;
            }
            
            // Update resolution slider max
            const resSlider = document.getElementById('resolution');
            resSlider.max = newRes;
            if (parseInt(resSlider.value) > newRes) {
                resSlider.value = newRes;
                this.resolution = newRes;
                document.getElementById('resolutionValue').textContent = this.resolution;
            }
            
            this.saveSettings();
        });
        
        hideUISetting.addEventListener('change', (e) => {
            this.settings.hideUIDuringAnimation = e.target.checked;
            this.saveSettings();
        });
        
        smoothAnimSetting.addEventListener('change', (e) => {
            this.settings.smoothAnimations = e.target.checked;
            this.saveSettings();
        });
        
        autoSaveSetting.addEventListener('change', (e) => {
            this.settings.autoSave = e.target.checked;
            this.saveSettings();
        });
        
        animSpeedSetting.addEventListener('input', (e) => {
            this.settings.animationSpeed = parseInt(e.target.value);
            const speeds = ['Slow', 'Normal', 'Fast'];
            animSpeedValue.textContent = speeds[this.settings.animationSpeed - 1];
            
            // Also update the main slider to keep them in sync
            const mainSpeed = this.settings.animationSpeed + 1; // Map 1-5 range to 2-4 range (within 1-5)
            document.getElementById('animationSpeed').value = mainSpeed;
            this.animationSpeed = mainSpeed;
            
            const mainSpeedNames = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Lightning'];
            const mainSpeedValue = document.getElementById('mainAnimSpeedValue');
            if (mainSpeedValue) {
                mainSpeedValue.textContent = mainSpeedNames[mainSpeed - 1];
            }
            
            this.saveSettings();
        });
        
        progressDetailsSetting.addEventListener('change', (e) => {
            this.settings.showProgressDetails = e.target.checked;
            this.saveSettings();
        });
    }
    
    initNewsButton() {
        const newsBtn = document.getElementById('newsBtn');
        
        newsBtn.addEventListener('click', () => {
            // Show the update modal
            document.getElementById('updateModal').style.display = 'flex';
            document.getElementById('updateModal').classList.remove('hidden');
        });
    }
    
    updateSettingsUI() {
        document.getElementById('qualitySetting').value = this.settings.quality;
        document.getElementById('maxResSetting').value = this.settings.maxResolution;
        document.getElementById('maxResValue').textContent = this.settings.maxResolution;
        document.getElementById('hideUISetting').checked = this.settings.hideUIDuringAnimation;
        document.getElementById('smoothAnimSetting').checked = this.settings.smoothAnimations;
        document.getElementById('autoSaveSetting').checked = this.settings.autoSave;
        document.getElementById('animSpeedSetting').value = this.settings.animationSpeed;
        
        const speeds = ['Slow', 'Normal', 'Fast'];
        document.getElementById('animSpeedValue').textContent = speeds[this.settings.animationSpeed - 1];
        document.getElementById('progressDetailsSetting').checked = this.settings.showProgressDetails;
        
        // New settings
        document.getElementById('colorThemeSetting').value = this.settings.colorTheme;
        document.getElementById('showPerfMonitorSetting').checked = this.settings.showPerfMonitor;
        document.getElementById('hardwareAccelSetting').checked = this.settings.hardwareAcceleration;
        document.getElementById('autoResizeSetting').checked = this.settings.autoResize;
        document.getElementById('keyboardShortcutsSetting').checked = this.settings.keyboardShortcuts;
        document.getElementById('autoSaveWIPSetting').checked = this.settings.autoSaveWIP;
        document.getElementById('keepHistorySetting').checked = this.settings.keepHistory;
        
        // Apply theme
        this.applyColorTheme(this.settings.colorTheme);
        
        // Update performance monitor visibility
        this.performanceMonitor.style.display = this.settings.showPerfMonitor ? 'block' : 'none';
    }
    
    applySettings() {
        // Apply quality setting
        document.body.classList.remove('low-quality', 'medium-quality', 'high-quality');
        document.body.classList.add(`${this.settings.quality}-quality`);
        
        // Update resolution slider max
        const resSlider = document.getElementById('resolution');
        resSlider.max = this.settings.maxResolution;
    }
    
    saveSettings() {
        localStorage.setItem('obamnify-settings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('obamnify-settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Load saved presets
        const savedPresets = localStorage.getItem('obamnify-presets');
        if (savedPresets) {
            try {
                const customPresets = JSON.parse(savedPresets);
                this.presets = { ...this.presets, ...customPresets };
            } catch (error) {
                console.warn('Failed to load saved presets:', error);
            }
        }
        
        this.applySettings();
    }
    
    selectCatalogTarget(imagePath) {
        if (!imagePath) return;
        
        this.currentTargetPath = imagePath;
        
        if (imagePath === './Obamna.png') {
            this.isCustomTarget = false;
            this.customTargetImage = null;
            document.getElementById('revertBtn').style.display = 'none';
            this.drawTargetImage();
        } else {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.customTargetImage = img;
                this.isCustomTarget = true;
                this.drawTargetImage();
                document.getElementById('revertBtn').style.display = 'block';
            };
            img.onerror = () => {
                console.error('Failed to load target image:', imagePath);
                this.revertToObama();
            };
            img.src = imagePath;
        }
    }
    
    async handleCustomTargetUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.className = 'upload-status loading';
        this.setTextContent(statusDiv, 'Checking image content...');
        
        try {
            // Basic content filtering
            if (!this.isImageSafe(file)) {
                throw new Error('Image failed content filter');
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                this.customTargetImage = new Image();
                this.customTargetImage.onload = () => {
                    const targetName = this.sanitizeFileName(file.name.split('.')[0]) || 'Custom Image';
                    
                    this.isCustomTarget = true;
                    this.currentTargetPath = `custom_${targetName}`;
                    this.drawTargetImage();
                    document.getElementById('revertBtn').style.display = 'block';
                    
                    // Add to recent custom targets
                    this.addToRecentCustomTargets(targetName, e.target.result);
                    
                    statusDiv.className = 'upload-status success';
                    this.setTextContent(statusDiv, 'Image uploaded successfully!');
                    
                    // Close sidebar after success
                    setTimeout(() => {
                        this.closeSidebarHandler();
                    }, 1500);
                };
                this.customTargetImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
            
        } catch (error) {
            statusDiv.className = 'upload-status error';
            this.setTextContent(statusDiv, 'Upload failed: Image contains inappropriate content');
            event.target.value = '';
        }
    }
    
    async handleShareImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const statusDiv = document.getElementById('shareUploadStatus');
        statusDiv.className = 'upload-status loading';
        this.setTextContent(statusDiv, 'Checking and uploading image...');
        
        try {
            console.log('Starting image upload...', file.name); // Debug log
            
            // Apply content filtering
            if (!this.isImageSafe(file)) {
                throw new Error('Image failed content filter');
            }
            
            console.log('Image passed safety check'); // Debug log
            
            // Upload the image
            const imageUrl = await window.websim.upload(file);
            console.log('Image uploaded to:', imageUrl); // Debug log
            
            // Validate the uploaded URL
            const validUrl = this.validateURL(imageUrl);
            if (!validUrl) {
                throw new Error('Invalid image URL returned');
            }
            
            // Save to database with sanitized data
            const record = await this.room.collection('shared_image').create({
                name: this.sanitizeFileName(file.name.split('.')[0]) || 'Unnamed Image',
                url: validUrl,
                file_type: file.type,
                file_size: file.size
            });
            
            console.log('Image record created:', record); // Debug log
            
            statusDiv.className = 'upload-status success';
            this.setTextContent(statusDiv, 'Image shared successfully! It will appear in the community catalog.');
            
            // Clear the file input
            event.target.value = '';
            
            // Reload community images
            setTimeout(() => {
                this.loadCommunityImages();
            }, 1000);
            
        } catch (error) {
            console.error('Share upload error:', error);
            statusDiv.className = 'upload-status error';
            const errorMessage = error.message.includes('content filter') 
                ? 'Upload failed: Image contains inappropriate content'
                : 'Failed to share image. Please try again.';
            this.setTextContent(statusDiv, errorMessage);
            event.target.value = '';
        }
    }
    
    async loadCommunityImages() {
        try {
            // Get shared images from database
            const sharedImages = this.room.collection('shared_image').getList() || [];
            this.communityImages = sharedImages;
            this.displayCommunityImages(sharedImages);
            
        } catch (error) {
            console.error('Error loading community images:', error);
            const grid = document.getElementById('communityGrid');
            if (grid) {
                const noImagesMsg = document.createElement('p');
                noImagesMsg.className = 'no-images';
                this.setTextContent(noImagesMsg, 'Error loading community images. Please try again later.');
                grid.innerHTML = '';
                grid.appendChild(noImagesMsg);
            }
        }
    }
    
    displayCommunityImages(sharedImages) {
        const grid = document.getElementById('communityGrid');
        if (!grid) return;
        
        if (!sharedImages || sharedImages.length === 0) {
            const noImagesMsg = document.createElement('p');
            noImagesMsg.className = 'no-images';
            this.setTextContent(noImagesMsg, 'No community images yet. Be the first to share!');
            grid.innerHTML = '';
            grid.appendChild(noImagesMsg);
            return;
        }
        
        grid.innerHTML = '';
        
        // Show most recent images first (reverse since getList returns oldest first)
        const recentImages = [...sharedImages].reverse().slice(0, 12);
        
        recentImages.forEach(imageRecord => {
            if (!imageRecord || !imageRecord.url) return;
            
            // Validate the image URL
            const validUrl = this.validateURL(imageRecord.url);
            if (!validUrl) {
                console.warn('Skipping image with invalid URL:', imageRecord.url);
                return;
            }
            
            const option = document.createElement('div');
            option.className = 'target-option community-image';
            
            const img = document.createElement('img');
            img.src = validUrl;
            img.alt = this.sanitizeFileName(imageRecord.name) || 'Community Image';
            img.loading = 'lazy';
            
            const span = document.createElement('span');
            this.setTextContent(span, this.sanitizeFileName(imageRecord.name) || 'Unnamed');
            
            const imageInfo = document.createElement('div');
            imageInfo.className = 'image-info';
            const username = imageRecord.username ? this.sanitizeFileName(imageRecord.username) : 'Anonymous';
            this.setTextContent(imageInfo, `by ${username}`);
            
            option.appendChild(img);
            option.appendChild(span);
            option.appendChild(imageInfo);
            
            // Add error handling for image loading
            img.onerror = () => {
                option.style.display = 'none';
                console.error('Failed to load community image:', validUrl);
            };
            
            option.addEventListener('click', () => {
                this.selectCommunityImage(validUrl, this.sanitizeFileName(imageRecord.name));
                
                // Update UI selection
                document.querySelectorAll('.target-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // Close sidebar
                document.getElementById('targetSidebar').classList.remove('open');
                document.getElementById('sidebarOverlay').classList.remove('active');
            });
            
            grid.appendChild(option);
        });
    }
    
    selectCommunityImage(imageUrl, imageName) {
        // Validate URL before using
        const validUrl = this.validateURL(imageUrl);
        if (!validUrl) {
            console.error('Invalid community image URL:', imageUrl);
            alert('Invalid image URL. Please try another image.');
            return;
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.customTargetImage = img;
            this.isCustomTarget = true;
            this.currentTargetPath = `community_${this.sanitizeFileName(imageName) || 'image'}`;
            this.drawTargetImage();
            document.getElementById('revertBtn').style.display = 'block';
        };
        img.onerror = () => {
            console.error('Failed to load community image:', validUrl);
            alert('Failed to load selected image. Please try another one.');
        };
        img.src = validUrl;
    }
    
    isImageSafe(file) {
        // Enhanced safety checks
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        if (file.size > maxSize) {
            throw new Error('File too large (max 10MB)');
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid file type. Supported formats: JPG, PNG, GIF, WebP');
        }
        
        // Check filename for suspicious content - sanitize first
        const suspiciousKeywords = [
            'nude', 'nsfw', 'explicit', 'adult', 'porn', 'sex',
            'violence', 'weapon', 'hate', 'racist', 'nazi'
        ];
        
        const fileName = this.sanitizeFileName(file.name).toLowerCase();
        for (const keyword of suspiciousKeywords) {
            if (fileName.includes(keyword)) {
                throw new Error('Filename contains inappropriate content');
            }
        }
        
        return true;
    }
    
    init() {
        // Load Obama image with error handling
        this.obamaImage = new Image();
        this.obamaImage.crossOrigin = 'anonymous';
        this.obamaImage.src = './Obamna.png';
        
        this.obamaImage.onload = () => {
            this.drawTargetImage();
        };
        
        this.obamaImage.onerror = () => {
            console.error('Failed to load Obama image');
            const progressText = document.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = 'Error: Failed to load target image';
            }
        };
        
        // Default resolution button
        document.getElementById('defaultResBtn').addEventListener('click', () => {
            const defaultRes = 64;
            const resSlider = document.getElementById('resolution');
            
            // Set resolution to default
            resSlider.value = defaultRes;
            this.resolution = defaultRes;
            document.getElementById('resolutionValue').textContent = defaultRes;
            
            // Redraw canvases if images are loaded
            if (this.uploadedImage) {
                this.drawSourceImage();
            }
            if (this.getCurrentTargetImage()) {
                this.drawTargetImage();
            }
            
            // Visual feedback
            const btn = document.getElementById('defaultResBtn');
            btn.textContent = '✓';
            setTimeout(() => {
                btn.textContent = 'Default';
            }, 1000);
        });
        
        // Event listeners
        document.getElementById('imageUpload').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });
        
        document.getElementById('revertBtn').addEventListener('click', () => {
            this.revertToObama();
        });
        
        document.getElementById('resolution').addEventListener('input', (e) => {
            const newRes = parseInt(e.target.value);
            if (isNaN(newRes) || newRes <= 0) return;
            
            // Show warning for high resolutions on non-desktop devices (only once)
            if (newRes > 256 && this.deviceType !== 'desktop' && !this.highResWarningShown) {
                const confirmed = confirm('⚠️ WARNING: This resolution may crash your device!\n\nResolutions above 256px can overwhelm mobile/tablet hardware and cause browser crashes. Continue anyway?');
                if (!confirmed) {
                    e.target.value = Math.min(256, this.settings.maxResolution);
                    this.resolution = Math.min(256, this.settings.maxResolution);
                    document.getElementById('resolutionValue').textContent = this.resolution;
                    return;
                }
                this.highResWarningShown = true;
            }
            
            this.resolution = newRes;
            document.getElementById('resolutionValue').textContent = this.resolution;
            
            if (this.uploadedImage) {
                this.drawSourceImage();
            }
            if (this.getCurrentTargetImage()) {
                this.drawTargetImage();
            }
        });
        
        // Animation speed slider
        document.getElementById('animationSpeed').addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            const speedNames = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Lightning'];
            document.getElementById('mainAnimSpeedValue').textContent = speedNames[speed - 1];
            this.animationSpeed = speed;
            
            // Also update the settings slider to keep them in sync
            const settingsSpeed = Math.max(1, Math.min(3, speed - 1)); // Map 1-5 range to 1-3 range
            document.getElementById('animSpeedSetting').value = settingsSpeed;
            this.settings.animationSpeed = settingsSpeed;
            
            const settingsSpeedNames = ['Slow', 'Normal', 'Fast'];
            const settingsSpeedValue = document.getElementById('animSpeedValue');
            if (settingsSpeedValue) {
                settingsSpeedValue.textContent = settingsSpeedNames[settingsSpeed - 1];
            }
            
            this.saveSettings();
        });
        
        document.getElementById('obamnifyBtn').addEventListener('click', () => {
            if (!this.isAnimating) {
                this.startObamnification();
            }
        });
        
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveImage();
        });
        
        document.getElementById('commentBtn').addEventListener('click', () => {
            this.shareResult();
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedImage = new Image();
            this.uploadedImage.onload = () => {
                this.drawSourceImage();
                document.getElementById('obamnifyBtn').disabled = false;
                this.showToast(`Image loaded: ${this.uploadedImage.width}x${this.uploadedImage.height}`, 'success');
            };
            this.uploadedImage.onerror = () => {
                this.showToast('Failed to load image. Please try another file.', 'error');
            };
            this.uploadedImage.src = e.target.result;
        };
        reader.onerror = () => {
            this.showToast('Failed to read file. Please try again.', 'error');
        };
        reader.readAsDataURL(file);
    }
    
    revertToObama() {
        this.isCustomTarget = false;
        this.currentTargetPath = './Obamna.png';
        this.customTargetImage = null;
        this.drawTargetImage();
        document.getElementById('revertBtn').style.display = 'none';
        
        // Reset catalog selection
        document.querySelectorAll('.target-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.image === './Obamna.png') {
                opt.classList.add('selected');
            }
        });
    }
    
    getCurrentTargetImage() {
        if (this.isCustomTarget && this.customTargetImage) {
            return this.customTargetImage;
        }
        return this.obamaImage;
    }
    
    drawTargetImage() {
        const targetImage = this.getCurrentTargetImage();
        if (!targetImage || !targetImage.complete) return;
        
        const res = this.getComputeResolution();
        this.targetCanvas.width = res; 
        this.targetCanvas.height = res;
        this.targetCtx.imageSmoothingEnabled = false;
        
        try {
            this.targetCtx.drawImage(targetImage, 0, 0, res, res);
        } catch (error) {
            console.error('Error drawing target image:', error);
        }
    }
    
    drawSourceImage() {
        if (!this.uploadedImage || !this.uploadedImage.complete) return;
        
        const res = this.getComputeResolution();
        this.sourceCanvas.width = res; 
        this.sourceCanvas.height = res;
        this.sourceCtx.imageSmoothingEnabled = false;
        
        try {
            this.sourceCtx.drawImage(this.uploadedImage, 0, 0, res, res);
        } catch (error) {
            console.error('Error drawing source image:', error);
        }
    }
    
    getComputeResolution() {
        // Remove device caps - all devices get full resolution access
        return Math.min(this.resolution, this.settings.maxResolution);
    }
    
    getMaxPixels() {
        // Reduced pixel limits for better performance
        const base = this.deviceType === 'mobile' ? 3000 : 
                    this.deviceType === 'tablet' ? 5000 : 6000;
        return this.settings.quality === 'low' ? Math.floor(base * 0.6)
             : this.settings.quality === 'high' ? Math.floor(base * 1.0)
             : Math.floor(base * 0.8);
    }
    
    getPixelData(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = [];
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4;
                pixels.push({
                    x, y,
                    r: imageData.data[index],
                    g: imageData.data[index + 1],
                    b: imageData.data[index + 2],
                    a: imageData.data[index + 3]
                });
            }
        }
        
        return pixels;
    }
    
    calculateLuminance(r, g, b) {
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }
    
    buildFastMapping(sourcePixels, targetPixels) {
        if (!sourcePixels || !targetPixels || sourcePixels.length === 0 || targetPixels.length === 0) {
            return [];
        }
        
        const mapping = [];
        const maxPixels = Math.min(sourcePixels.length, targetPixels.length, 8000); // Hard limit for performance
        
        // Use simple luminance-based mapping for better performance
        const analyzePixel = (pixel) => {
            if (!pixel || typeof pixel.r === 'undefined') return null;
            const luminance = Math.round(0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b);
            return { ...pixel, luminance };
        };
        
        const analyzedSource = sourcePixels.slice(0, maxPixels)
            .map(analyzePixel)
            .filter(p => p !== null);
        const analyzedTarget = targetPixels.slice(0, maxPixels)
            .map(analyzePixel)
            .filter(p => p !== null);
        
        if (analyzedSource.length === 0 || analyzedTarget.length === 0) {
            return [];
        }
        
        // Sort once for faster matching
        analyzedSource.sort((a, b) => a.luminance - b.luminance);
        analyzedTarget.sort((a, b) => a.luminance - b.luminance);
        
        // Simple direct mapping based on luminance order
        const targetStep = analyzedTarget.length / analyzedSource.length;
        
        for (let i = 0; i < analyzedSource.length; i++) {
            const targetIndex = Math.min(Math.floor(i * targetStep), analyzedTarget.length - 1);
            const sourcePixel = analyzedSource[i];
            const targetPixel = analyzedTarget[targetIndex];
            
            if (sourcePixel && targetPixel) {
                mapping.push({
                    from: { x: sourcePixel.x, y: sourcePixel.y },
                    to: { x: targetPixel.x, y: targetPixel.y },
                    color: { r: sourcePixel.r, g: sourcePixel.g, b: sourcePixel.b, a: sourcePixel.a }
                });
            }
        }
        
        return mapping;
    }
    
    calculateHue(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        if (delta === 0) return 0;
        
        let hue;
        switch (max) {
            case r: hue = ((g - b) / delta) % 6; break;
            case g: hue = (b - r) / delta + 2; break;
            case b: hue = (r - g) / delta + 4; break;
        }
        
        return hue * 60;
    }
    
    calculateSaturation(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        if (max === 0) return 0;
        return (delta / max) * 100;
    }
    
    async startObamnification() {
        if (this.isAnimating || !this.uploadedImage || !this.getCurrentTargetImage()) {
            return;
        }
        
        this.isAnimating = true;
        document.getElementById('obamnifyBtn').disabled = true;
        
        try {
            // Ensure images are properly drawn
            this.drawSourceImage();
            this.drawTargetImage();
            
            const sourcePixels = this.getPixelData(this.sourceCanvas);
            const targetPixels = this.getPixelData(this.targetCanvas);
            
            if (sourcePixels.length === 0 || targetPixels.length === 0) {
                throw new Error('Failed to extract pixel data from images');
            }
            
            const maxPixels = this.getMaxPixels();
            const stride = Math.max(1, Math.floor(sourcePixels.length / maxPixels));
            const sPix = sourcePixels.filter((_, i) => i % stride === 0);
            const tStride = Math.max(1, Math.floor(targetPixels.length / maxPixels));
            const tPix = targetPixels.filter((_, i) => i % tStride === 0);
            
            const pixelMapping = this.buildFastMapping(sPix, tPix);
            
            if (pixelMapping.length === 0) {
                throw new Error('Failed to create pixel mapping');
            }
            
            await this.animateTransformation(pixelMapping, this.getComputeResolution());
            
        } catch (error) {
            console.error('Obamnification error:', error);
            const progressText = document.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = 'Error during transformation. Please try again.';
            }
        } finally {
            this.isAnimating = false;
            document.getElementById('obamnifyBtn').disabled = false;
        }
    }
    
    async animateTransformation(pixelMapping, res) {
        if (!pixelMapping || pixelMapping.length === 0) {
            throw new Error('Invalid pixel mapping');
        }
        
        const startTime = performance.now();
        this.outputCanvas.width = res; 
        this.outputCanvas.height = res;
        this.outputCtx.imageSmoothingEnabled = false;

        if (this.settings.hideUIDuringAnimation) {
            document.body.classList.add('hide-ui-loading');
        }
        
        // Use the animation speed slider value
        const animSpeed = this.animationSpeed || 3;
        const speedMultiplier = [0.3, 0.6, 1.0, 1.8, 3.0][animSpeed - 1];
        
        // Adjust animation steps based on speed slider
        const baseSteps = this.deviceType === 'mobile' ? 30 : 
                         this.deviceType === 'tablet' ? 40 : 60;
        const steps = Math.max(10, Math.floor(baseSteps / speedMultiplier));
        
        const bar = document.querySelector('.progress-fill');
        const txt = document.querySelector('.progress-text');
        const percentage = document.querySelector('.progress-percentage');
        const progressDetails = document.querySelector('.progress-details');
        const pixelsProcessed = document.getElementById('pixelsProcessed');
        const timeRemaining = document.getElementById('timeRemaining');
        const processingSpeed = document.getElementById('processingSpeed');
        
        if (this.settings.showProgressDetails && progressDetails) {
            progressDetails.style.display = 'flex';
        }
        
        if (txt) txt.textContent = 'Transforming...';

        // Pre-allocate image data for better performance
        const imageData = this.outputCtx.createImageData(res, res);
        const data = imageData.data;
        
        let pixelsProcessedCount = 0;

        for (let step = 0; step <= steps; step++) {
            if (!this.isAnimating) break; // Allow cancellation
            
            const p = step / steps;
            const e = this.settings.smoothAnimations ? this.easeInOutCubic(p) : p;
            
            const stepStartTime = performance.now();

            // Fill with black background
            data.fill(0);
            
            // Set alpha channel to 255 for all pixels
            for (let i = 3; i < data.length; i += 4) {
                data[i] = 255;
            }

            // Batch pixel operations for better performance
            pixelsProcessedCount = 0;
            for (const m of pixelMapping) {
                if (!m || !m.from || !m.to || !m.color) continue;
                
                const x = Math.round(m.from.x + (m.to.x - m.from.x) * e);
                const y = Math.round(m.from.y + (m.to.y - m.from.y) * e);

                if (x >= 0 && x < res && y >= 0 && y < res) {
                    const index = (y * res + x) * 4;
                    if (index >= 0 && index < data.length - 3) {
                        data[index] = m.color.r || 0;
                        data[index + 1] = m.color.g || 0;
                        data[index + 2] = m.color.b || 0;
                        data[index + 3] = m.color.a !== undefined ? m.color.a : 255;
                        pixelsProcessedCount++;
                    }
                }
            }
            
            this.outputCtx.putImageData(imageData, 0, 0);
            
            // Update progress indicators
            if (bar) bar.style.width = `${p * 100}%`;
            if (percentage) percentage.textContent = `${Math.round(p * 100)}%`;
            
            if (this.settings.showProgressDetails) {
                if (pixelsProcessed) pixelsProcessed.textContent = pixelsProcessedCount.toLocaleString();
                
                const elapsed = performance.now() - startTime;
                const remaining = steps > 0 ? (elapsed / (step + 1)) * (steps - step) : 0;
                if (timeRemaining) timeRemaining.textContent = remaining > 1000 ? `${(remaining / 1000).toFixed(1)}s` : `${Math.round(remaining)}ms`;
                
                const speed = Math.round(pixelsProcessedCount / (elapsed / 1000));
                if (processingSpeed) processingSpeed.textContent = speed.toLocaleString();
            }
            
            const stepTime = performance.now() - stepStartTime;
            this.performanceMetrics.processingTime = Math.round(stepTime);

            // Use faster timing based on animation speed slider
            if (step < steps) {
                await new Promise(resolve => {
                    const delay = Math.max(1, Math.floor(16 / speedMultiplier));
                    if (this.settings.smoothAnimations) {
                        this.animationFrame = requestAnimationFrame(resolve);
                    } else {
                        this.animationFrame = setTimeout(resolve, delay);
                    }
                });
            }
        }

        if (this.settings.hideUIDuringAnimation) {
            document.body.classList.remove('hide-ui-loading');
        }
        
        if (progressDetails) progressDetails.style.display = 'none';
        if (txt) txt.textContent = 'Transformation Complete!';
        
        const resultActions = document.getElementById('resultActions');
        if (resultActions) resultActions.style.display = 'flex';
        
        if (this.settings.autoSave) {
            setTimeout(() => this.saveImage(), 500);
        }
        
        const totalTime = performance.now() - startTime;
        this.showToast(`Transformation completed in ${(totalTime / 1000).toFixed(1)}s`, 'success');
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    saveImage() {
        // Create a temporary canvas for high-res output
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set to a higher resolution for better quality
        const saveSize = 800;
        tempCanvas.width = saveSize;
        tempCanvas.height = saveSize;
        
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(this.outputCanvas, 0, 0, saveSize, saveSize);
        
        // Create download link
        const link = document.createElement('a');
        
        // Show format options
        const format = prompt('Choose format:\n1. PNG (lossless)\n2. JPEG (smaller file)', '1');
        
        if (format === '1' || format === 'PNG' || format === 'png') {
            link.download = 'obamnified.png';
            link.href = tempCanvas.toDataURL('image/png');
        } else if (format === '2' || format === 'JPEG' || format === 'jpeg' || format === 'jpg') {
            link.download = 'obamnified.jpg';
            link.href = tempCanvas.toDataURL('image/jpeg', 0.9);
        } else {
            return; // User cancelled
        }
        
        link.click();
    }
    
    async shareResult() {
        try {
            // Convert canvases to blobs and upload
            const originalBlob = await this.canvasToBlob(this.sourceCanvas);
            const resultBlob = await this.canvasToBlob(this.outputCanvas);
            
            const originalUrl = await window.websim.upload(originalBlob);
            const resultUrl = await window.websim.upload(resultBlob);
            
            const images = [originalUrl, resultUrl];
            let commentText;
            
            if (this.isCustomTarget || this.currentTargetPath !== './Obamna.png') {
                // Also upload the custom target image
                const targetBlob = await this.canvasToBlob(this.targetCanvas);
                const targetUrl = await window.websim.upload(targetBlob);
                images.push(targetUrl);
                commentText = "I turned my original image into something else! Check it out:";
            } else {
                commentText = "I turned my original image into Obama! Check it out:";
            }
            
            const result = await window.websim.postComment({
                content: commentText,
                images: images
            });
            
            if (result.error) {
                alert('Failed to post comment: ' + result.error);
            }
        } catch (error) {
            console.error('Error sharing result:', error);
            alert('Failed to share result. Please try again.');
        }
    }
    
    canvasToBlob(canvas) {
        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
    }
    
    cleanup() {
        // Cancel ongoing animations
        this.isAnimating = false;
        if (this.animationFrame) {
            if (typeof this.animationFrame === 'number') {
                cancelAnimationFrame(this.animationFrame);
            } else {
                clearTimeout(this.animationFrame);
            }
            this.animationFrame = null;
        }
        
        // Unsubscribe from database updates
        if (this.unsubscribeImages) {
            this.unsubscribeImages();
        }
        
        // Clear image references
        this.uploadedImage = null;
        this.customTargetImage = null;
        this.obamaImage = null;
    }
    
    addToRecentCustomTargets(name, dataUrl) {
        // Sanitize inputs
        const safeName = this.sanitizeFileName(name);
        const validUrl = this.validateURL(dataUrl);
        
        if (!safeName || !validUrl) {
            console.warn('Invalid data provided to addToRecentCustomTargets');
            return;
        }
        
        const target = { 
            name: safeName, 
            dataUrl: validUrl, 
            timestamp: Date.now() 
        };
        
        // Remove if already exists
        this.recentCustomTargets = this.recentCustomTargets.filter(t => t.name !== safeName);
        
        // Add to end
        this.recentCustomTargets.push(target);
        
        // Keep only last 6
        if (this.recentCustomTargets.length > 6) {
            this.recentCustomTargets = this.recentCustomTargets.slice(-6);
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('obamnify-recent-targets', JSON.stringify(this.recentCustomTargets));
        } catch (error) {
            console.error('Failed to save recent targets to localStorage:', error);
        }
    }
    
    initKeyboardShortcuts() {
        if (!this.settings.keyboardShortcuts) return;
        
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const ctrl = e.ctrlKey || e.metaKey;
            
            switch (e.key.toLowerCase()) {
                case 'o':
                    if (ctrl) {
                        e.preventDefault();
                        document.getElementById('imageUpload').click();
                    }
                    break;
                case 's':
                    if (ctrl) {
                        e.preventDefault();
                        if (document.getElementById('saveBtn').style.display !== 'none') {
                            this.saveImage();
                        }
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    const obamnifyBtn = document.getElementById('obamnifyBtn');
                    if (!obamnifyBtn.disabled) {
                        if (this.isAnimating) {
                            this.stopAnimation();
                        } else {
                            this.startObamnification();
                        }
                    }
                    break;
                case 'r':
                    if (!ctrl) {
                        e.preventDefault();
                        this.resetToDefaults();
                    }
                    break;
                case 't':
                    e.preventDefault();
                    document.getElementById('changeTargetBtn').click();
                    break;
                case 'f':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'p':
                    e.preventDefault();
                    this.togglePerformanceMonitor();
                    break;
                case '?':
                    e.preventDefault();
                    this.showShortcutsHelp();
                    break;
                case 'escape':
                    this.closeAllOverlays();
                    break;
                case ',':
                    e.preventDefault();
                    document.getElementById('settingsBtn').click();
                    break;
                case 'z':
                    if (ctrl) {
                        e.preventDefault();
                        this.undo();
                    }
                    break;
                case 'y':
                    if (ctrl) {
                        e.preventDefault();
                        this.redo();
                    }
                    break;
            }
        });
    }
    
    initDragAndDrop() {
        const body = document.body;
        const dropZone = document.getElementById('dropZone');
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            body.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Handle drag enter/leave for visual feedback
        body.addEventListener('dragenter', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                this.dragCounter++;
                dropZone.style.display = 'flex';
                body.classList.add('dragging');
            }
        });
        
        body.addEventListener('dragleave', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                this.dragCounter--;
                if (this.dragCounter === 0) {
                    dropZone.style.display = 'none';
                    body.classList.remove('dragging');
                }
            }
        });
        
        // Handle file drop
        body.addEventListener('drop', (e) => {
            this.dragCounter = 0;
            dropZone.style.display = 'none';
            body.classList.remove('dragging');
            
            const files = Array.from(e.dataTransfer.files);
            const imageFile = files.find(file => file.type.startsWith('image/'));
            
            if (imageFile) {
                this.handleFileUpload(imageFile);
                this.showToast('Image uploaded successfully!', 'success');
            } else {
                this.showToast('Please drop an image file', 'warning');
            }
        });
    }
    
    handleFileUpload(file) {
        // Enhanced file validation
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        
        if (file.size > maxSize) {
            this.showToast('File too large. Maximum size is 50MB.', 'error');
            return;
        }
        
        if (!allowedTypes.includes(file.type)) {
            this.showToast('Unsupported file type. Please use JPG, PNG, GIF, WebP, or BMP.', 'error');
            return;
        }
        
        this.saveToHistory('image_upload');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedImage = new Image();
            this.uploadedImage.onload = () => {
                // Auto-resize if image is too large and setting is enabled
                if (this.settings.autoResize && (this.uploadedImage.width > 2048 || this.uploadedImage.height > 2048)) {
                    this.resizeImage(this.uploadedImage, 2048);
                }
                
                this.drawSourceImage();
                document.getElementById('obamnifyBtn').disabled = false;
                this.showToast(`Image loaded: ${this.uploadedImage.width}x${this.uploadedImage.height}`, 'success');
            };
            this.uploadedImage.onerror = () => {
                this.showToast('Failed to load image. Please try another file.', 'error');
            };
            this.uploadedImage.src = e.target.result;
        };
        reader.onerror = () => {
            this.showToast('Failed to read file. Please try again.', 'error');
        };
        reader.readAsDataURL(file);
    }
    
    initPerformanceMonitor() {
        this.performanceMonitor = document.getElementById('performanceMonitor');
        this.fpsCounter = document.getElementById('fpsCounter');
        this.memoryUsage = document.getElementById('memoryUsage');
        this.processingTimeDisplay = document.getElementById('processingTime');
        
        // Update performance metrics
        const updatePerformance = () => {
            const now = performance.now();
            this.performanceMetrics.frameCount++;
            
            if (now - this.performanceMetrics.lastFrameTime >= 1000) {
                this.performanceMetrics.fps = Math.round(this.performanceMetrics.frameCount * 1000 / (now - this.performanceMetrics.lastFrameTime));
                this.performanceMetrics.frameCount = 0;
                this.performanceMetrics.lastFrameTime = now;
                
                // Update memory usage if available
                if (performance.memory) {
                    this.performanceMetrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                }
                
                // Update display
                if (this.fpsCounter) this.fpsCounter.textContent = this.performanceMetrics.fps;
                if (this.memoryUsage) this.memoryUsage.textContent = this.performanceMetrics.memoryUsage;
                if (this.processingTimeDisplay) this.processingTimeDisplay.textContent = this.performanceMetrics.processingTime;
            }
            
            requestAnimationFrame(updatePerformance);
        };
        
        requestAnimationFrame(updatePerformance);
    }
    
    togglePerformanceMonitor() {
        this.settings.showPerfMonitor = !this.settings.showPerfMonitor;
        this.performanceMonitor.style.display = this.settings.showPerfMonitor ? 'block' : 'none';
        document.getElementById('showPerfMonitorSetting').checked = this.settings.showPerfMonitor;
        this.saveSettings();
    }
    
    initZoomControls() {
        // Source canvas zoom
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.zoomCanvas('source', 1.2);
        });
        document.getElementById('zoomOut').addEventListener('click', () => {
            this.zoomCanvas('source', 0.8);
        });
        document.getElementById('zoomReset').addEventListener('click', () => {
            this.resetZoom('source');
        });
        
        // Target canvas zoom
        document.getElementById('targetZoomIn').addEventListener('click', () => {
            this.zoomCanvas('target', 1.2);
        });
        document.getElementById('targetZoomOut').addEventListener('click', () => {
            this.zoomCanvas('target', 0.8);
        });
        document.getElementById('targetZoomReset').addEventListener('click', () => {
            this.resetZoom('target');
        });
        
        // Output canvas zoom
        document.getElementById('outputZoomIn').addEventListener('click', () => {
            this.zoomCanvas('output', 1.2);
        });
        document.getElementById('outputZoomOut').addEventListener('click', () => {
            this.zoomCanvas('output', 0.8);
        });
        document.getElementById('outputZoomReset').addEventListener('click', () => {
            this.resetZoom('output');
        });
    }
    
    zoomCanvas(canvasType, factor) {
        const canvas = document.getElementById(`${canvasType}Canvas`);
        const currentTransform = canvas.style.transform || 'scale(1)';
        const currentScale = parseFloat(currentTransform.match(/scale\(([^)]+)\)/)?.[1] || '1');
        const newScale = Math.max(0.1, Math.min(5, currentScale * factor));
        
        canvas.style.transform = `scale(${newScale})`;
        canvas.style.transformOrigin = 'center center';
        
        this.showToast(`Zoom: ${Math.round(newScale * 100)}%`, 'info', 1000);
    }
    
    resetZoom(canvasType) {
        const canvas = document.getElementById(`${canvasType}Canvas`);
        canvas.style.transform = 'scale(1)';
        this.showToast('Zoom reset', 'info', 1000);
    }
    
    initPresets() {
        const presetsBtn = document.getElementById('quickPresets');
        const presetsOverlay = document.getElementById('presetsOverlay');
        const closePresets = document.getElementById('closePresets');
        
        presetsBtn.addEventListener('click', () => {
            presetsOverlay.style.display = 'flex';
        });
        
        closePresets.addEventListener('click', () => {
            presetsOverlay.style.display = 'none';
        });
        
        // Handle preset selection
        document.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', () => {
                const presetName = item.dataset.preset;
                this.applyPreset(presetName);
                presetsOverlay.style.display = 'none';
            });
        });
        
        // Save current preset
        document.getElementById('saveCurrentPreset').addEventListener('click', () => {
            this.saveCurrentAsPreset();
        });
    }
    
    saveCurrentAsPreset() {
        const presetName = prompt('Enter a name for this preset:');
        if (!presetName || presetName.trim() === '') {
            return;
        }
        
        const safeName = this.sanitizeFileName(presetName.trim());
        if (!safeName) {
            this.showToast('Invalid preset name', 'error');
            return;
        }
        
        // Create preset from current settings
        const newPreset = {
            resolution: this.resolution,
            animationSpeed: this.animationSpeed,
            quality: this.settings.quality
        };
        
        // Add to presets
        this.presets[safeName] = newPreset;
        
        // Save to localStorage
        try {
            localStorage.setItem('obamnify-presets', JSON.stringify(this.presets));
            this.showToast(`Preset "${safeName}" saved successfully!`, 'success');
        } catch (error) {
            console.error('Failed to save preset:', error);
            this.showToast('Failed to save preset', 'error');
        }
    }
    
    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;
        
        this.saveToHistory('preset_apply');
        
        // Apply preset settings
        document.getElementById('resolution').value = preset.resolution;
        document.getElementById('resolutionValue').textContent = preset.resolution;
        this.resolution = preset.resolution;
        
        document.getElementById('animationSpeed').value = preset.animationSpeed;
        const speedNames = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Lightning'];
        document.getElementById('mainAnimSpeedValue').textContent = speedNames[preset.animationSpeed - 1];
        this.animationSpeed = preset.animationSpeed;
        
        document.getElementById('qualitySetting').value = preset.quality;
        this.settings.quality = preset.quality;
        
        this.applySettings();
        this.saveSettings();
        
        // Redraw canvases with new settings
        if (this.uploadedImage) this.drawSourceImage();
        if (this.getCurrentTargetImage()) this.drawTargetImage();
        
        this.showToast(`Applied preset: ${presetName}`, 'success');
    }
    
    initToastSystem() {
        this.toastContainer = document.getElementById('toastContainer');
    }
    
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type] || 'ℹ️';
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${this.sanitizeHTML(message)}</div>
            <button class="toast-close">&times;</button>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Auto remove
        const timer = setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timer);
            this.removeToast(toast);
        });
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
    }
    
    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
    saveToHistory(action) {
        if (!this.settings.keepHistory) return;
        
        const state = {
            action,
            timestamp: Date.now(),
            settings: { ...this.settings },
            resolution: this.resolution,
            animationSpeed: this.animationSpeed,
            isCustomTarget: this.isCustomTarget,
            currentTargetPath: this.currentTargetPath
        };
        
        // Remove future history if we're not at the end
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
        }
        
        this.historyStack.push(state);
        
        // Limit history size
        if (this.historyStack.length > this.maxHistorySize) {
            this.historyStack.shift();
        } else {
            this.historyIndex++;
        }
        
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreFromHistory(this.historyStack[this.historyIndex]);
            this.showToast('Undone', 'info', 1000);
        }
    }
    
    redo() {
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyIndex++;
            this.restoreFromHistory(this.historyStack[this.historyIndex]);
            this.showToast('Redone', 'info', 1000);
        }
    }
    
    restoreFromHistory(state) {
        // Restore settings
        this.settings = { ...state.settings };
        this.resolution = state.resolution;
        this.animationSpeed = state.animationSpeed;
        this.isCustomTarget = state.isCustomTarget;
        this.currentTargetPath = state.currentTargetPath;
        
        // Update UI
        this.updateSettingsUI();
        document.getElementById('resolution').value = this.resolution;
        document.getElementById('resolutionValue').textContent = this.resolution;
        document.getElementById('animationSpeed').value = this.animationSpeed;
        const speedNames = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Lightning'];
        document.getElementById('mainAnimSpeedValue').textContent = speedNames[this.animationSpeed - 1];
        
        this.applySettings();
        this.updateUndoRedoButtons();
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('quickUndo');
        const redoBtn = document.getElementById('quickRedo');
        
        undoBtn.disabled = this.historyIndex <= 0;
        redoBtn.disabled = this.historyIndex >= this.historyStack.length - 1;
    }
    
    initFullscreen() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateFullscreenButton();
        });
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {
                this.showToast('Fullscreen not supported or blocked', 'warning');
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    updateFullscreenButton() {
        const icon = document.querySelector('#fullscreenBtn i');
        icon.className = this.isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    }
    
    initQuickActions() {
        document.getElementById('quickHelp').addEventListener('click', () => {
            this.showShortcutsHelp();
        });
        
        document.getElementById('quickPerf').addEventListener('click', () => {
            this.togglePerformanceMonitor();
        });
        
        document.getElementById('quickUndo').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('quickRedo').addEventListener('click', () => {
            this.redo();
        });
    }
    
    showShortcutsHelp() {
        const overlay = document.getElementById('shortcutsOverlay');
        overlay.style.display = 'flex';
        
        document.getElementById('closeShortcuts').addEventListener('click', () => {
            overlay.style.display = 'none';
        });
    }
    
    closeAllOverlays() {
        // Close all open overlays
        document.querySelectorAll('.modal-overlay, .shortcuts-overlay, .presets-overlay, .settings-overlay, .target-sidebar').forEach(overlay => {
            overlay.style.display = 'none';
            overlay.classList.remove('open', 'active');
        });
        
        // Stop animation if running
        if (this.isAnimating) {
            this.stopAnimation();
        }
    }
    
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationFrame) {
            if (typeof this.animationFrame === 'number') {
                cancelAnimationFrame(this.animationFrame);
            } else {
                clearTimeout(this.animationFrame);
            }
            this.animationFrame = null;
        }
        
        document.getElementById('obamnifyBtn').disabled = false;
        const progressText = document.querySelector('.progress-text');
        if (progressText) progressText.textContent = 'Animation stopped';
        
        this.showToast('Animation stopped', 'info');
    }
    
    resetToDefaults() {
        this.saveToHistory('reset_defaults');
        
        // Reset to default values
        document.getElementById('resolution').value = 64;
        document.getElementById('resolutionValue').textContent = 64;
        this.resolution = 64;
        
        document.getElementById('animationSpeed').value = 3;
        document.getElementById('mainAnimSpeedValue').textContent = 'Normal';
        this.animationSpeed = 3;
        
        // Redraw canvases
        if (this.uploadedImage) this.drawSourceImage();
        if (this.getCurrentTargetImage()) this.drawTargetImage();
        
        this.showToast('Reset to defaults', 'success');
    }
    
    startAutoSave() {
        if (!this.settings.autoSaveWIP) return;
        
        setInterval(() => {
            if (Date.now() - this.lastSaveTime > 30000) { // 30 seconds
                this.autoSaveWork();
            }
        }, 10000); // Check every 10 seconds
    }
    
    autoSaveWork() {
        try {
            const workData = {
                timestamp: Date.now(),
                resolution: this.resolution,
                animationSpeed: this.animationSpeed,
                isCustomTarget: this.isCustomTarget,
                currentTargetPath: this.currentTargetPath,
                settings: this.settings
            };
            
            localStorage.setItem('obamnify-autosave', JSON.stringify(workData));
            this.lastSaveTime = Date.now();
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }
    
    loadAutoSavedWork() {
        try {
            const saved = localStorage.getItem('obamnify-autosave');
            if (saved) {
                const workData = JSON.parse(saved);
                // Only restore if it's recent (within 24 hours)
                if (Date.now() - workData.timestamp < 24 * 60 * 60 * 1000) {
                    this.showToast('Restored previous work', 'info');
                    // Restore work here if needed
                }
            }
        } catch (error) {
            console.warn('Failed to load auto-saved work:', error);
        }
    }
    
    initSettingsEnhancements() {
        // Color theme setting
        document.getElementById('colorThemeSetting').addEventListener('change', (e) => {
            this.settings.colorTheme = e.target.value;
            this.applyColorTheme(e.target.value);
            this.saveSettings();
        });
        
        // New settings
        document.getElementById('showPerfMonitorSetting').addEventListener('change', (e) => {
            this.settings.showPerfMonitor = e.target.checked;
            this.togglePerformanceMonitor();
        });
        
        document.getElementById('hardwareAccelSetting').addEventListener('change', (e) => {
            this.settings.hardwareAcceleration = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('autoResizeSetting').addEventListener('change', (e) => {
            this.settings.autoResize = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('keyboardShortcutsSetting').addEventListener('change', (e) => {
            this.settings.keyboardShortcuts = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('autoSaveWIPSetting').addEventListener('change', (e) => {
            this.settings.autoSaveWIP = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('keepHistorySetting').addEventListener('change', (e) => {
            this.settings.keepHistory = e.target.checked;
            if (!e.target.checked) {
                this.clearHistory();
            }
            this.saveSettings();
        });
        
        // Settings actions
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.clearHistory();
            this.showToast('History cleared', 'success');
        });
        
        document.getElementById('exportSettingsBtn').addEventListener('click', () => {
            this.exportSettings();
        });
        
        document.getElementById('importSettingsBtn').addEventListener('click', () => {
            document.getElementById('settingsFileInput').click();
        });
        
        document.getElementById('settingsFileInput').addEventListener('change', (e) => {
            this.importSettings(e.target.files[0]);
        });
    }
    
    applyColorTheme(theme) {
        document.body.classList.remove('theme-dark', 'theme-high-contrast', 'theme-colorful');
        document.body.classList.add(`theme-${theme}`);
    }
    
    clearHistory() {
        this.historyStack = [];
        this.historyIndex = -1;
        this.updateUndoRedoButtons();
    }
    
    exportSettings() {
        const settingsData = {
            version: '1.0',
            timestamp: Date.now(),
            settings: this.settings,
            presets: this.presets
        };
        
        const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'obamnify-settings.json';
        link.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Settings exported', 'success');
    }
    
    async importSettings(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.settings) {
                this.settings = { ...this.settings, ...data.settings };
                this.applySettings();
                this.updateSettingsUI();
                this.saveSettings();
            }
            
            if (data.presets) {
                this.presets = { ...this.presets, ...data.presets };
            }
            
            this.showToast('Settings imported successfully', 'success');
        } catch (error) {
            this.showToast('Failed to import settings', 'error');
        }
    }
    
    initCanvasInteractions() {
        // Add canvas error handling
        const canvases = [this.sourceCanvas, this.targetCanvas, this.outputCanvas];
        
        canvases.forEach(canvas => {
            canvas.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                this.showToast('Graphics context lost. Please refresh the page.', 'error');
            });
            
            canvas.addEventListener('webglcontextrestored', () => {
                this.showToast('Graphics context restored', 'success');
                this.redrawAllCanvases();
            });
        });
    }
    
    redrawAllCanvases() {
        if (this.uploadedImage) this.drawSourceImage();
        if (this.getCurrentTargetImage()) this.drawTargetImage();
    }
}

// Check for stored device preference and auto-select if found
document.addEventListener('DOMContentLoaded', () => {
    new Obamnifier();
});
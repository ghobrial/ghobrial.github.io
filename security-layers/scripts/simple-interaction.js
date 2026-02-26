/**
 * Simplified Security Layer Interaction for Testing
 */

class SimpleSecurityLayerInteraction {
    constructor() {
        this.activeLayers = new Set();
        this.layerData = {
            kernel: { name: 'Kernel Security', icon: '🛡️', color: '#009500' },
            hal: { name: 'Hardware Abstraction Layer', icon: '🔐', color: '#0077e4' },
            runtime: { name: 'Runtime Security', icon: '⚡', color: '#7e00e8' },
            app: { name: 'Application Security', icon: '📱', color: '#c80035' }
        };
    }
    
    initialize() {
        console.log('Simple Security Layer Interaction initialized');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Banking action button handlers
        document.querySelectorAll('.banking-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleActionClick(e));
        });
        
        // Security layer click handlers
        document.querySelectorAll('.security-layer').forEach(layer => {
            layer.addEventListener('click', (e) => this.handleLayerClick(e));
        });
        
        // Back button handlers
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleBackClick(e));
        });
        
        // Status layer click handlers
        document.querySelectorAll('.status-layer').forEach(status => {
            status.addEventListener('click', (e) => this.handleStatusClick(e));
        });
        
        // Navigation button handlers
        const nextBtn = document.querySelector('footer .btn.btn-primary');
        const prevBtn = document.querySelector('footer .btn.btn-secondary');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                console.log('Next button clicked');
                this.showMessage('Next: Navigate to the next learning step');
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                console.log('Previous button clicked');
                this.showMessage('Previous: Navigate to the previous learning step');
            });
        }
    }
    
    handleActionClick(event) {
        const button = event.target.closest('.banking-action-btn');
        if (!button) return;
        
        const action = button.getAttribute('data-action');
        const requiredLayers = button.getAttribute('data-layers');
        const targetScreen = button.getAttribute('data-screen');
        
        console.log('Action clicked:', action, 'Layers:', requiredLayers, 'Screen:', targetScreen);
        
        // Activate security layers if specified
        if (requiredLayers) {
            this.activateLayersSequentially(requiredLayers.split(','));
        }
        
        // Handle screen transition if specified
        if (targetScreen) {
            this.transitionToScreen(targetScreen);
        }
        
        // Show feedback
        const actionMessages = {
            'login': 'Initiating secure login - All security layers activated!',
            'balance': 'Checking account balance - Security layers protecting your data',
            'transfer': 'Preparing secure transfer - Maximum security enabled',
            'authenticate': 'Authenticating with biometric security',
            'confirm-transfer': 'Processing secure transfer'
        };
        
        const message = actionMessages[action] || `${action} action activated!`;
        this.showMessage(message, 'success');
    }
    
    handleLayerClick(event) {
        const layerElement = event.target.closest('.security-layer');
        if (!layerElement) return;
        
        const layerId = layerElement.getAttribute('data-layer');
        const layerInfo = this.layerData[layerId];
        
        console.log('Layer clicked:', layerId);
        
        if (layerInfo) {
            this.showMessage(`${layerInfo.name} clicked! ${layerInfo.icon}`);
        }
    }
    
    handleBackClick(event) {
        const button = event.target.closest('.back-btn');
        if (!button) return;
        
        const targetScreen = button.getAttribute('data-target');
        if (targetScreen) {
            this.transitionToScreen(targetScreen);
        }
    }
    
    handleStatusClick(event) {
        const statusElement = event.target.closest('.status-layer');
        if (!statusElement) return;
        
        const layerId = statusElement.getAttribute('data-layer');
        const layerInfo = this.layerData[layerId];
        const isActive = statusElement.classList.contains('active');
        
        console.log('Status layer clicked:', layerId, 'Active:', isActive);
        
        if (isActive && layerInfo) {
            // Show detailed information for active layers
            this.showMessage(`${layerInfo.name} is ACTIVE - Protecting your banking session`);
        } else if (layerInfo) {
            // Show information for inactive layers
            this.showMessage(`${layerInfo.name} is inactive - Try a banking action to activate security layers`);
        }
    }
    
    activateLayersSequentially(layerIds) {
        console.log('Activating layers:', layerIds);
        
        // Clear existing active layers
        this.deactivateAllLayers();
        
        // Activate layers with delays
        layerIds.forEach((layerId, index) => {
            setTimeout(() => {
                this.activateLayer(layerId.trim());
            }, index * 300);
        });
    }
    
    activateLayer(layerId) {
        const layerElement = document.querySelector(`.security-layer[data-layer="${layerId}"]`);
        const statusElement = document.querySelector(`.status-layer[data-layer="${layerId}"]`);
        
        console.log('Attempting to activate layer:', layerId);
        console.log('Layer element found:', !!layerElement);
        console.log('Status element found:', !!statusElement);
        
        if (!layerElement) {
            console.warn('Security layer element not found:', layerId);
            return;
        }
        
        layerElement.classList.add('active', 'interactive');
        if (statusElement) {
            statusElement.classList.add('active');
            console.log('Status element activated for:', layerId);
        }
        
        this.activeLayers.add(layerId);
        
        console.log('Successfully activated layer:', layerId);
        console.log('Currently active layers:', Array.from(this.activeLayers));
    }
    
    deactivateAllLayers() {
        document.querySelectorAll('.security-layer').forEach(layer => {
            layer.classList.remove('active', 'interactive');
        });
        
        document.querySelectorAll('.status-layer').forEach(status => {
            status.classList.remove('active');
        });
        
        this.activeLayers.clear();
        console.log('All layers deactivated');
    }
    
    transitionToScreen(targetScreenId) {
        const currentScreen = document.querySelector('.app-screen.active');
        const targetScreen = document.getElementById(targetScreenId);
        
        if (!targetScreen) {
            console.warn('Target screen not found:', targetScreenId);
            return;
        }
        
        console.log('Transitioning to screen:', targetScreenId);
        
        // Handle exit animation for current screen
        if (currentScreen) {
            currentScreen.classList.remove('active');
        }
        
        // Handle enter animation for target screen
        targetScreen.classList.add('active');
    }
    
    showMessage(text, type = 'info') {
        // Remove any existing messages first
        const existingMessages = document.querySelectorAll('.interaction-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageEl = document.createElement('div');
        messageEl.className = 'interaction-message';
        
        const bgColor = type === 'success' ? '#4CAF50' : 
                       type === 'warning' ? '#FF9800' : 
                       type === 'error' ? '#F44336' : '#2196F3';
        
        messageEl.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 16px;
            background: ${bgColor};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            line-height: 1.4;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Add animation keyframes
        if (!document.querySelector('#message-animations')) {
            const style = document.createElement('style');
            style.id = 'message-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        messageEl.textContent = text;
        document.body.appendChild(messageEl);
        
        // Auto-remove after delay with animation
        setTimeout(() => {
            messageEl.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing simple interaction');
    const interaction = new SimpleSecurityLayerInteraction();
    interaction.initialize();
});
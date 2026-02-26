/**
 * AnyBank Android Security Interactions - Base JavaScript Framework
 * Provides core functionality for all security learning interactions
 */

/* ===== INTERACTION STATE MANAGEMENT ===== */

/**
 * Base class for managing interaction state and user progress
 */
class InteractionState {
    constructor(totalSteps = 1) {
        this.currentStep = 0;
        this.totalSteps = totalSteps;
        this.completedSteps = new Set();
        this.userActions = [];
        this.startTime = Date.now();
        this.interactionData = {};
        this.isInitialized = false;
        
        // Bind methods to preserve context
        this.nextStep = this.nextStep.bind(this);
        this.previousStep = this.previousStep.bind(this);
        this.goToStep = this.goToStep.bind(this);
        this.logAction = this.logAction.bind(this);
    }
    
    /**
     * Initialize the interaction state
     */
    initialize() {
        if (this.isInitialized) {
            console.warn('InteractionState already initialized');
            return;
        }
        
        this.isInitialized = true;
        this.logAction('system', 'interaction_started', {
            totalSteps: this.totalSteps,
            timestamp: this.startTime
        });
        
        // Trigger initialization event
        this.dispatchEvent('interaction:initialized', {
            state: this.getState()
        });
    }
    
    /**
     * Move to the next step
     */
    nextStep() {
        if (this.currentStep < this.totalSteps - 1) {
            const previousStep = this.currentStep;
            this.currentStep++;
            this.completedSteps.add(previousStep);
            
            this.logAction('navigation', 'next_step', {
                from: previousStep,
                to: this.currentStep
            });
            
            this.dispatchEvent('step:changed', {
                previousStep,
                currentStep: this.currentStep,
                progress: this.getProgress()
            });
            
            return true;
        }
        return false;
    }
    
    /**
     * Move to the previous step
     */
    previousStep() {
        if (this.currentStep > 0) {
            const previousStep = this.currentStep;
            this.currentStep--;
            
            this.logAction('navigation', 'previous_step', {
                from: previousStep,
                to: this.currentStep
            });
            
            this.dispatchEvent('step:changed', {
                previousStep,
                currentStep: this.currentStep,
                progress: this.getProgress()
            });
            
            return true;
        }
        return false;
    }
    
    /**
     * Go to a specific step
     */
    goToStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.totalSteps) {
            const previousStep = this.currentStep;
            this.currentStep = stepIndex;
            
            this.logAction('navigation', 'goto_step', {
                from: previousStep,
                to: this.currentStep
            });
            
            this.dispatchEvent('step:changed', {
                previousStep,
                currentStep: this.currentStep,
                progress: this.getProgress()
            });
            
            return true;
        }
        return false;
    }
    
    /**
     * Mark current step as completed
     */
    completeCurrentStep() {
        this.completedSteps.add(this.currentStep);
        this.logAction('progress', 'step_completed', {
            step: this.currentStep,
            totalCompleted: this.completedSteps.size
        });
        
        this.dispatchEvent('step:completed', {
            step: this.currentStep,
            progress: this.getProgress()
        });
    }
    
    /**
     * Get current progress as percentage
     */
    getProgress() {
        return Math.round((this.completedSteps.size / this.totalSteps) * 100);
    }
    
    /**
     * Log user action
     */
    logAction(category, action, data = null) {
        const actionLog = {
            timestamp: Date.now() - this.startTime,
            category,
            action,
            data,
            step: this.currentStep,
            id: this.generateActionId()
        };
        
        this.userActions.push(actionLog);
        
        // Dispatch action logged event
        this.dispatchEvent('action:logged', actionLog);
        
        // Keep only last 100 actions to prevent memory issues
        if (this.userActions.length > 100) {
            this.userActions = this.userActions.slice(-100);
        }
    }
    
    /**
     * Get current state snapshot
     */
    getState() {
        return {
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            completedSteps: Array.from(this.completedSteps),
            progress: this.getProgress(),
            sessionDuration: Date.now() - this.startTime,
            actionCount: this.userActions.length,
            interactionData: { ...this.interactionData }
        };
    }
    
    /**
     * Reset interaction to initial state
     */
    reset() {
        this.currentStep = 0;
        this.completedSteps.clear();
        this.userActions = [];
        this.interactionData = {};
        
        this.logAction('system', 'interaction_reset');
        this.dispatchEvent('interaction:reset', {
            state: this.getState()
        });
    }
    
    /**
     * Generate unique action ID
     */
    generateActionId() {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: {
                ...detail,
                interactionState: this
            }
        });
        document.dispatchEvent(event);
    }
}

/* ===== ERROR HANDLING SYSTEM ===== */

/**
 * Centralized error handling and recovery system
 */
class ErrorHandler {
    static instance = null;
    
    constructor() {
        if (ErrorHandler.instance) {
            return ErrorHandler.instance;
        }
        
        this.errorLog = [];
        this.maxErrors = 50;
        this.setupGlobalErrorHandling();
        
        ErrorHandler.instance = this;
    }
    
    /**
     * Set up global error handling
     */
    setupGlobalErrorHandling() {
        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError('javascript', event.error || new Error(event.message), {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('promise', event.reason, {
                type: 'unhandled_rejection'
            });
        });
    }
    
    /**
     * Handle different types of errors
     */
    handleError(type, error, context = {}) {
        const errorInfo = {
            id: this.generateErrorId(),
            timestamp: Date.now(),
            type,
            message: error?.message || String(error),
            stack: error?.stack,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Log error
        this.logError(errorInfo);
        
        // Attempt recovery based on error type
        this.attemptRecovery(type, error, context);
        
        // Dispatch error event
        document.dispatchEvent(new CustomEvent('error:handled', {
            detail: errorInfo
        }));
    }
    
    /**
     * Handle invalid interaction state
     */
    static handleInvalidState(interaction, expectedState, actualState) {
        console.warn(`State mismatch: expected ${expectedState}, got ${actualState}`);
        
        // Reset to safe state
        if (interaction && typeof interaction.reset === 'function') {
            interaction.reset();
        }
        
        // Show user-friendly message
        this.showMessage('The interaction has been reset to ensure proper functionality.', 'info');
    }
    
    /**
     * Handle animation failures
     */
    static handleAnimationFailure(element, fallbackAction) {
        if (!element) return;
        
        // Remove animation classes
        const animationClasses = ['animated', 'pulse', 'fade-in', 'slide-in', 'scale-in'];
        element.classList.remove(...animationClasses);
        
        // Apply fallback styling
        if (fallbackAction && typeof fallbackAction === 'function') {
            try {
                fallbackAction();
            } catch (error) {
                console.warn('Fallback action failed:', error);
            }
        }
        
        console.warn('Animation fallback applied for element:', element);
    }
    
    /**
     * Show user message
     */
    static showMessage(text, type = 'info', duration = 5000) {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background: ${type === 'error' ? '#FF4444' : type === 'warning' ? '#FFA500' : '#4CAF50'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
            font-size: 14px;
            line-height: 1.4;
        `;
        messageEl.textContent = text;
        
        document.body.appendChild(messageEl);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, duration);
        
        return messageEl;
    }
    
    /**
     * Log error to internal log
     */
    logError(errorInfo) {
        this.errorLog.push(errorInfo);
        
        // Keep only recent errors
        if (this.errorLog.length > this.maxErrors) {
            this.errorLog = this.errorLog.slice(-this.maxErrors);
        }
        
        // Log to console in development
        if (this.isDevelopment()) {
            console.error('Error logged:', errorInfo);
        }
    }
    
    /**
     * Attempt error recovery
     */
    attemptRecovery(type, error, context) {
        switch (type) {
            case 'animation':
                this.recoverFromAnimationError(context);
                break;
            case 'state':
                this.recoverFromStateError(context);
                break;
            case 'network':
                this.recoverFromNetworkError(context);
                break;
            default:
                // Generic recovery
                this.genericRecovery(error, context);
        }
    }
    
    /**
     * Recovery methods
     */
    recoverFromAnimationError(context) {
        if (context.element) {
            ErrorHandler.handleAnimationFailure(context.element, context.fallback);
        }
    }
    
    recoverFromStateError(context) {
        if (context.interaction) {
            ErrorHandler.handleInvalidState(
                context.interaction,
                context.expected,
                context.actual
            );
        }
    }
    
    recoverFromNetworkError(context) {
        ErrorHandler.showMessage('Network error occurred. Please check your connection.', 'warning');
    }
    
    genericRecovery(error, context) {
        // Log for debugging but don't disrupt user experience
        console.warn('Generic error recovery applied:', error);
    }
    
    /**
     * Utility methods
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        const typeCount = {};
        this.errorLog.forEach(error => {
            typeCount[error.type] = (typeCount[error.type] || 0) + 1;
        });
        
        return {
            totalErrors: this.errorLog.length,
            errorsByType: typeCount,
            recentErrors: this.errorLog.slice(-5)
        };
    }
}

/* ===== BROWSER COMPATIBILITY SYSTEM ===== */

/**
 * Browser compatibility detection and fallback system
 */
class CompatibilityHandler {
    static instance = null;
    
    constructor() {
        if (CompatibilityHandler.instance) {
            return CompatibilityHandler.instance;
        }
        
        this.capabilities = this.detectCapabilities();
        this.applyFallbacks();
        
        CompatibilityHandler.instance = this;
    }
    
    /**
     * Detect browser capabilities
     */
    detectCapabilities() {
        return {
            svg: this.checkSVGSupport(),
            animations: this.checkAnimationSupport(),
            flexbox: this.checkFlexboxSupport(),
            grid: this.checkGridSupport(),
            customProperties: this.checkCustomPropertiesSupport(),
            es6: this.checkES6Support(),
            webgl: this.checkWebGLSupport(),
            touch: this.checkTouchSupport()
        };
    }
    
    /**
     * SVG support detection
     */
    checkSVGSupport() {
        return document.implementation.hasFeature(
            "http://www.w3.org/TR/SVG11/feature#BasicStructure", 
            "1.1"
        );
    }
    
    /**
     * CSS Animation support detection
     */
    checkAnimationSupport() {
        const testEl = document.createElement('div');
        return 'animation' in testEl.style || 
               'webkitAnimation' in testEl.style ||
               'mozAnimation' in testEl.style;
    }
    
    /**
     * Flexbox support detection
     */
    checkFlexboxSupport() {
        const testEl = document.createElement('div');
        return 'flex' in testEl.style ||
               'webkitFlex' in testEl.style ||
               'msFlex' in testEl.style;
    }
    
    /**
     * CSS Grid support detection
     */
    checkGridSupport() {
        const testEl = document.createElement('div');
        return 'grid' in testEl.style ||
               'msGrid' in testEl.style;
    }
    
    /**
     * CSS Custom Properties support detection
     */
    checkCustomPropertiesSupport() {
        return window.CSS && CSS.supports && CSS.supports('color', 'var(--test)');
    }
    
    /**
     * ES6 support detection
     */
    checkES6Support() {
        try {
            return typeof Symbol !== 'undefined' && 
                   typeof Promise !== 'undefined' &&
                   typeof Map !== 'undefined';
        } catch (e) {
            return false;
        }
    }
    
    /**
     * WebGL support detection
     */
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Touch support detection
     */
    checkTouchSupport() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 ||
               navigator.msMaxTouchPoints > 0;
    }
    
    /**
     * Apply fallbacks based on detected capabilities
     */
    applyFallbacks() {
        if (!this.capabilities.svg) {
            this.provideSVGFallback();
        }
        
        if (!this.capabilities.animations) {
            this.provideAnimationFallback();
        }
        
        if (!this.capabilities.flexbox) {
            this.provideFlexboxFallback();
        }
        
        if (!this.capabilities.customProperties) {
            this.provideCustomPropertiesFallback();
        }
        
        // Add capability classes to body
        this.addCapabilityClasses();
    }
    
    /**
     * SVG fallback implementation
     */
    provideSVGFallback() {
        document.body.classList.add('no-svg');
        
        // Replace SVG elements with CSS-based alternatives
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('svg').forEach(svg => {
                const fallback = document.createElement('div');
                fallback.className = 'svg-fallback ' + (svg.className.baseVal || '');
                fallback.setAttribute('data-svg-fallback', svg.getAttribute('data-icon') || 'icon');
                
                if (svg.parentNode) {
                    svg.parentNode.replaceChild(fallback, svg);
                }
            });
        });
    }
    
    /**
     * Animation fallback implementation
     */
    provideAnimationFallback() {
        document.body.classList.add('no-animations');
        
        // Add CSS to disable animations
        const style = document.createElement('style');
        style.textContent = `
            .no-animations *,
            .no-animations *::before,
            .no-animations *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Flexbox fallback implementation
     */
    provideFlexboxFallback() {
        document.body.classList.add('no-flexbox');
        
        // Add CSS for flexbox alternatives
        const style = document.createElement('style');
        style.textContent = `
            .no-flexbox .flex {
                display: block;
            }
            .no-flexbox .flex > * {
                display: inline-block;
                vertical-align: top;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Custom Properties fallback implementation
     */
    provideCustomPropertiesFallback() {
        document.body.classList.add('no-custom-properties');
        
        // Add hardcoded color values
        const style = document.createElement('style');
        style.textContent = `
            .no-custom-properties .anybank-header {
                background: linear-gradient(135deg, #FF3B47, #E6353F);
            }
            .no-custom-properties .btn-primary {
                background: linear-gradient(135deg, #FF3B47, #E6353F);
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Add capability classes to body
     */
    addCapabilityClasses() {
        Object.entries(this.capabilities).forEach(([capability, supported]) => {
            const className = supported ? `has-${capability}` : `no-${capability}`;
            document.body.classList.add(className);
        });
        
        // Add touch class
        if (this.capabilities.touch) {
            document.body.classList.add('touch-device');
        }
    }
    
    /**
     * Get capability report
     */
    getCapabilityReport() {
        return {
            ...this.capabilities,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }
}

/* ===== COMMON UI COMPONENTS ===== */

/**
 * Reusable UI component utilities
 */
class UIComponents {
    /**
     * Create a progress indicator
     */
    static createProgressIndicator(current, total, container) {
        const progressEl = document.createElement('div');
        progressEl.className = 'progress-indicator';
        progressEl.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(current / total) * 100}%"></div>
            </div>
            <div class="progress-text">${current} of ${total}</div>
        `;
        
        if (container) {
            container.appendChild(progressEl);
        }
        
        return progressEl;
    }
    
    /**
     * Create a loading spinner
     */
    static createLoadingSpinner(container) {
        const spinnerEl = document.createElement('div');
        spinnerEl.className = 'loading-spinner';
        
        if (container) {
            container.appendChild(spinnerEl);
        }
        
        return spinnerEl;
    }
    
    /**
     * Create a modal dialog
     */
    static createModal(title, content, actions = []) {
        const modalEl = document.createElement('div');
        modalEl.className = 'modal-overlay';
        modalEl.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-content">${content}</div>
                <div class="modal-actions">
                    ${actions.map(action => 
                        `<button class="btn ${action.class || 'btn-secondary'}" data-action="${action.action}">${action.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;
        
        // Add event listeners
        const closeBtn = modalEl.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeModal(modalEl));
        
        // Close on overlay click
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) {
                this.closeModal(modalEl);
            }
        });
        
        // Handle action buttons
        modalEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                modalEl.dispatchEvent(new CustomEvent('modal:action', {
                    detail: { action, modal: modalEl }
                }));
            });
        });
        
        document.body.appendChild(modalEl);
        return modalEl;
    }
    
    /**
     * Close modal
     */
    static closeModal(modalEl) {
        if (modalEl && modalEl.parentNode) {
            modalEl.classList.add('animate-fade-out');
            setTimeout(() => {
                modalEl.remove();
            }, 300);
        }
    }
    
    /**
     * Create tooltip
     */
    static createTooltip(element, text, position = 'top') {
        const tooltipEl = document.createElement('div');
        tooltipEl.className = `tooltip tooltip-${position}`;
        tooltipEl.textContent = text;
        
        element.addEventListener('mouseenter', () => {
            document.body.appendChild(tooltipEl);
            this.positionTooltip(tooltipEl, element, position);
        });
        
        element.addEventListener('mouseleave', () => {
            if (tooltipEl.parentNode) {
                tooltipEl.remove();
            }
        });
        
        return tooltipEl;
    }
    
    /**
     * Position tooltip relative to element
     */
    static positionTooltip(tooltip, element, position) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top, left;
        
        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 8;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 8;
                break;
        }
        
        tooltip.style.position = 'fixed';
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.zIndex = '10000';
    }
}

/* ===== INITIALIZATION ===== */

/**
 * Initialize the base framework when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize error handling
    new ErrorHandler();
    
    // Initialize compatibility handling
    new CompatibilityHandler();
    
    // Dispatch framework ready event
    document.dispatchEvent(new CustomEvent('framework:ready', {
        detail: {
            timestamp: Date.now(),
            capabilities: CompatibilityHandler.instance?.getCapabilityReport()
        }
    }));
});

/* ===== EXPORTS ===== */

// Make classes available globally
window.InteractionState = InteractionState;
window.ErrorHandler = ErrorHandler;
window.CompatibilityHandler = CompatibilityHandler;
window.UIComponents = UIComponents;

/* ===== SECURITY LAYER INTERACTION CLASS ===== */

/**
 * Security Layer Interaction - Manages the security layer visualization
 */
class SecurityLayerInteraction {
    constructor() {
        this.interactionState = new InteractionState(4);
        this.activeLayers = new Set();
        this.currentAction = null;
        this.layerData = this.initializeLayerData();
        this.helpSystem = this.initializeHelpSystem();
        this.tutorialSteps = this.initializeTutorialSteps();
        this.currentHelpStep = 0;
        this.currentTutorialStep = 0;
        
        // Bind methods
        this.handleLayerClick = this.handleLayerClick.bind(this);
        this.handleActionClick = this.handleActionClick.bind(this);
        this.closeDetailPanel = this.closeDetailPanel.bind(this);
        this.activateLayersSequentially = this.activateLayersSequentially.bind(this);
        this.showHelp = this.showHelp.bind(this);
        this.closeHelp = this.closeHelp.bind(this);
        this.nextHelpStep = this.nextHelpStep.bind(this);
        this.prevHelpStep = this.prevHelpStep.bind(this);
    }
    
    /**
     * Initialize the interaction
     */
    initialize() {
        this.interactionState.initialize();
        this.setupEventListeners();
        this.setupKeyboardNavigation();
        
        // Start with the first tutorial step
        this.updateTutorialStep();
        
        console.log('Security Layer Interaction initialized with tutorial mode');
    }
    
    /**
     * Initialize security layer data from design document
     */
    initializeLayerData() {
        return {
            kernel: {
                id: 'kernel',
                name: 'Kernel Security',
                icon: '🛡️',
                color: '#009500',
                description: 'Foundation of Android security providing process isolation and mandatory access controls',
                mechanisms: [
                    'Unique Linux user ID for each app',
                    'SELinux mandatory access control policies',
                    'Application sandbox enforcement',
                    'Permission framework validation'
                ],
                bankingExamples: [
                    'Isolates AnyBank from other apps',
                    'Prevents unauthorized system access',
                    'Enforces banking app permissions'
                ]
            },
            hal: {
                id: 'hal',
                name: 'Hardware Abstraction Layer',
                icon: '🔐',
                color: '#0077e4',
                description: 'Secures communication between apps and device hardware',
                mechanisms: [
                    'Secure biometric data processing',
                    'Hardware-backed cryptographic operations',
                    'Trusted execution environment access',
                    'Secure element communication for payments'
                ],
                bankingExamples: [
                    'Protects fingerprint authentication',
                    'Secures NFC payment transactions',
                    'Hardware-backed key storage'
                ]
            },
            runtime: {
                id: 'runtime',
                name: 'Android Runtime Security',
                icon: '⚡',
                color: '#7e00e8',
                description: 'Protects app execution and memory from runtime attacks',
                mechanisms: [
                    'Memory protection and isolation',
                    'Address Space Layout Randomization (ASLR)',
                    'Code integrity verification',
                    'Secure garbage collection'
                ],
                bankingExamples: [
                    'Protects account data in memory',
                    'Prevents memory-based attacks',
                    'Verifies app code integrity'
                ]
            },
            app: {
                id: 'app',
                name: 'Application Security',
                icon: '📱',
                color: '#c80035',
                description: 'App-level security controls and data protection',
                mechanisms: [
                    'Private storage areas',
                    'Intent validation and filtering',
                    'Content Provider access controls',
                    'Network security configuration'
                ],
                bankingExamples: [
                    'Encrypts transaction history',
                    'Validates payment Intents',
                    'Controls data sharing'
                ]
            }
        };
    }
    
    /**
     * Initialize help system data
     */
    initializeHelpSystem() {
        return {
            steps: [
                {
                    title: 'Welcome to Android Security Layers',
                    content: '<div class="help-step"><h4>🛡️ Interactive Security Learning</h4><p>This interaction demonstrates how Android\'s four security layers work together to protect banking applications like AnyBank.</p></div>'
                },
                {
                    title: 'Security Layer Overview',
                    content: '<div class="help-step"><h4>🔍 Four Layers of Protection</h4><p>Learn about Kernel Security, Hardware Abstraction, Runtime Security, and Application Security layers.</p></div>'
                },
                {
                    title: 'How to Interact',
                    content: '<div class="help-step"><h4>🎯 Interactive Elements</h4><p>Click banking actions to see security layers activate. Click on active layers to learn more about their mechanisms.</p></div>'
                },
                {
                    title: 'Ready to Explore',
                    content: '<div class="help-step"><h4>🚀 Start Your Security Journey</h4><p>You\'re ready to explore Android security layers! Start with the Secure Login button to see all four layers activate.</p></div>'
                }
            ]
        };
    }
    
    /**
     * Initialize tutorial steps for guided learning progression
     */
    initializeTutorialSteps() {
        return [
            {
                title: "Welcome to AnyBank Security",
                description: "Learn how Android's four security layers protect banking apps through interactive exploration.",
                targetScreen: "welcome-screen",
                activeLayers: [],
                availableInteractions: [],
                instructions: "Click any banking action to see security layers activate, or use Next to follow the guided tour"
            },
            {
                title: "Kernel Security Foundation", 
                description: "Experience the foundational security layer that isolates and protects every app process.",
                targetScreen: "login-screen",
                activeLayers: ['kernel'],
                availableInteractions: ['kernel'],
                instructions: "Click the kernel security icon (🛡️) to explore its mechanisms, then try Secure Login"
            },
            {
                title: "Hardware Security Integration",
                description: "See how hardware-level security enhances authentication and cryptographic operations.",
                targetScreen: "login-screen", 
                activeLayers: ['kernel', 'hal'],
                availableInteractions: ['kernel', 'hal'],
                instructions: "Click the hardware security icon (🔐) to learn about biometric protection"
            },
            {
                title: "Complete Security Stack",
                description: "Explore all four security layers working together to protect sensitive banking operations.",
                targetScreen: "transfer-screen",
                activeLayers: ['kernel', 'hal', 'runtime', 'app'],
                availableInteractions: ['kernel', 'hal', 'runtime', 'app'],
                instructions: "Click any security layer icon to explore its role in protecting your banking transactions"
            }
        ];
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Banking action button handlers
        document.querySelectorAll('.banking-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleActionClick(e));
        });
        
        // Quick action button handlers
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleActionClick(e));
        });
        
        // Back button handlers
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleBackClick(e));
        });
        
        // Logout button handler
        document.querySelectorAll('.logout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleLogoutClick(e));
        });
        
        // Authentication option button handlers (both biometric and login/password)
        document.querySelectorAll('.auth-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAuthOptionClick(e));
        });
        
        // Legacy biometric button handler (for compatibility)
        document.querySelectorAll('.biometric-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleBiometricClick(e));
        });
        
        // Detail panel close handler
        const closeBtn = document.getElementById('panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => this.closeDetailPanel(e));
        }
        
        // Help toggle button handler (new approach)
        const helpToggleBtn = document.getElementById('help-toggle-btn');
        const detailedHelpContent = document.getElementById('detailed-help-content');
        
        if (helpToggleBtn && detailedHelpContent) {
            helpToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isActive = detailedHelpContent.classList.contains('active');
                
                if (isActive) {
                    detailedHelpContent.classList.remove('active');
                    helpToggleBtn.classList.remove('active');
                    helpToggleBtn.querySelector('.help-text').textContent = 'Show Guide';
                    helpToggleBtn.setAttribute('aria-label', 'Show detailed guidance');
                } else {
                    detailedHelpContent.classList.add('active');
                    helpToggleBtn.classList.add('active');
                    helpToggleBtn.querySelector('.help-text').textContent = 'Hide Guide';
                    helpToggleBtn.setAttribute('aria-label', 'Hide detailed guidance');
                }
                
                // Log the interaction
                this.interactionState.logAction('help_system', isActive ? 'help_hidden' : 'help_shown', {
                    method: 'toggle_button',
                    location: 'instruction_panel'
                });
            });
        }
        
        // Remove old floating help button functionality
        // const helpBtn = document.getElementById('floating-help-btn');
        // Remove old help modal functionality
        // const helpClose = document.getElementById('help-close');
        // const helpNext = document.getElementById('help-next');
        // const helpPrev = document.getElementById('help-prev');
        // Remove old help modal event listeners
        /*
        if (helpBtn) {
            helpBtn.addEventListener('click', (e) => this.showHelp(e));
        }
        
        if (helpClose) {
            helpClose.addEventListener('click', (e) => this.closeHelp(e));
        }
        
        if (helpNext) {
            helpNext.addEventListener('click', (e) => this.nextHelpStep(e));
        }
        
        if (helpPrev) {
            helpPrev.addEventListener('click', (e) => this.prevHelpStep(e));
        }
        */
        
        // Layer status item click handlers (new info panel)
        document.querySelectorAll('.layer-status-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleLayerStatusClick(e));
        });
    }
    
    /**
     * Set up keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Escape':
                    this.closeDetailPanel();
                    this.closeHelp();
                    break;
                case 'Enter':
                case ' ':
                    if (e.target.classList.contains('security-layer')) {
                        e.preventDefault();
                        this.handleLayerClick({ target: e.target });
                    }
                    break;
            }
        });
    }
    
    /**
     * Handle security layer clicks
     */
    handleLayerClick(event) {
        const layerElement = event.target.closest('.security-layer');
        if (!layerElement) return;
        
        const layerId = layerElement.getAttribute('data-layer');
        const layerInfo = this.layerData[layerId];
        
        if (!layerInfo) return;
        
        // Log the interaction
        this.interactionState.logAction('layer_interaction', 'layer_clicked', {
            layerId,
            layerName: layerInfo.name,
            isActive: layerElement.classList.contains('active')
        });
        
        // Show layer details
        this.showLayerDetails(layerInfo);
        
        // Add visual feedback
        this.addLayerFeedback(layerElement);
    }
    
    /**
     * Handle banking action clicks
     */
    handleActionClick(event) {
        const button = event.target.closest('.banking-action-btn, .quick-action-btn');
        if (!button) return;
        
        const action = button.getAttribute('data-action');
        const requiredLayers = button.getAttribute('data-layers');
        const targetScreen = button.getAttribute('data-screen');
        
        // Log the action
        this.interactionState.logAction('banking_action', action, {
            requiredLayers: requiredLayers ? requiredLayers.split(',') : [],
            targetScreen,
            timestamp: Date.now()
        });
        
        // Store current action
        this.currentAction = action;
        
        // Handle screen transition if specified
        if (targetScreen) {
            this.transitionToScreen(targetScreen);
        }
        
        // Activate required security layers if specified
        if (requiredLayers) {
            this.activateLayersSequentially(requiredLayers.split(','));
        }
        
        // Update button state for processing actions
        if (action === 'authenticate' || action === 'confirm-transfer') {
            // Show security check message
            ErrorHandler.showMessage('Security Check: Verifying with security layers...', 'info', 2000);
            
            this.updateActionButtonState(button, 'processing');
            
            // Simulate processing time
            setTimeout(() => {
                this.updateActionButtonState(button, 'complete');
                this.showActionFeedback(action);
                
                // Handle post-action transitions - prevent returning to welcome screen
                if (action === 'authenticate') {
                    setTimeout(() => {
                        this.transitionToScreen('dashboard-screen');
                    }, 1000);
                } else if (action === 'confirm-transfer') {
                    setTimeout(() => {
                        this.transitionToScreen('dashboard-screen');
                        this.showTransferSuccess();
                    }, 1000);
                }
            }, 2000);
        }
    }
    
    /**
     * Handle back button clicks
     */
    handleBackClick(event) {
        const button = event.target.closest('.back-btn');
        if (!button) return;
        
        const targetScreen = button.getAttribute('data-target');
        if (targetScreen) {
            this.transitionToScreen(targetScreen);
        }
        
        this.interactionState.logAction('navigation', 'back_clicked', {
            targetScreen,
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle layer status item clicks (from info panel)
     */
    handleLayerStatusClick(event) {
        const statusItem = event.target.closest('.layer-status-item');
        if (!statusItem) return;
        
        const layerId = statusItem.getAttribute('data-layer');
        const layerInfo = this.layerData[layerId];
        const isActive = statusItem.classList.contains('active');
        
        if (!layerInfo) return;
        
        // Log the interaction
        this.interactionState.logAction('layer_interaction', 'status_clicked', {
            layerId,
            layerName: layerInfo.name,
            isActive
        });
        
        if (isActive) {
            // Show layer details if active
            this.showLayerDetails(layerInfo);
        } else {
            // Show message about inactive layer
            ErrorHandler.showMessage(`${layerInfo.name} is inactive. Try a banking action to activate security layers.`, 'info', 3000);
        }
    }
    
    /**
     * Handle logout button clicks
     */
    handleLogoutClick(event) {
        this.interactionState.logAction('banking_action', 'logout', {
            timestamp: Date.now()
        });
        
        // Show security check message
        ErrorHandler.showMessage('Security Check: Deactivating security layers...', 'info', 1500);
        
        // Deactivate all security layers with processing state
        this.deactivateAllLayersWithProcessing();
        
        // Return to login screen instead of welcome screen
        setTimeout(() => {
            this.transitionToScreen('login-screen');
            ErrorHandler.showMessage('Logged out successfully. Please log in again to continue.', 'info', 3000);
        }, 1500);
    }
    
    /**
     * Handle authentication option clicks (both biometric and login/password)
     */
    handleAuthOptionClick(event) {
        const button = event.target.closest('.auth-option-btn');
        if (!button) return;
        
        const action = button.getAttribute('data-action');
        const targetScreen = button.getAttribute('data-screen');
        
        this.interactionState.logAction('banking_action', action, {
            timestamp: Date.now()
        });
        
        // Show security check message
        const authType = action === 'biometric' ? 'biometric' : 'login/password';
        ErrorHandler.showMessage(`Security Check: ${authType} authentication in progress...`, 'info', 2000);
        
        // Activate HAL layer for both authentication types (hardware security)
        this.activateLayer('hal');
        
        // Update button state
        const icon = button.querySelector('.btn-icon');
        const text = button.querySelector('.btn-text');
        const originalIcon = icon ? icon.textContent : '';
        const originalText = text ? text.textContent : '';
        
        if (icon) icon.textContent = '⏳';
        if (text) text.textContent = action === 'biometric' ? 'Scanning...' : 'Verifying...';
        button.disabled = true;
        
        // Simulate authentication process
        setTimeout(() => {
            if (icon) icon.textContent = '✅';
            if (text) text.textContent = action === 'biometric' ? 'Verified' : 'Authenticated';
            
            // Show success feedback
            const successMessage = action === 'biometric' 
                ? 'Biometric authentication successful! Proceeding to dashboard...'
                : 'Login/Password authentication successful! Proceeding to dashboard...';
            ErrorHandler.showMessage(successMessage, 'info', 2000);
            
            // Navigate to target screen after successful authentication
            setTimeout(() => {
                if (targetScreen) {
                    this.transitionToScreen(targetScreen);
                }
                
                // Reset button after navigation
                setTimeout(() => {
                    if (icon) icon.textContent = originalIcon;
                    if (text) text.textContent = originalText;
                    button.disabled = false;
                }, 1000);
            }, 1000);
        }, 1500);
    }
    
    /**
     * Handle biometric authentication (legacy method for compatibility)
     */
    handleBiometricClick(event) {
        const button = event.target.closest('.biometric-btn');
        if (!button) return;
        
        this.interactionState.logAction('banking_action', 'biometric_auth', {
            timestamp: Date.now()
        });
        
        // Show security check message
        ErrorHandler.showMessage('Security Check: Biometric authentication in progress...', 'info', 2000);
        
        // Activate HAL layer for biometric processing
        this.activateLayer('hal');
        
        // Update button state
        const icon = button.querySelector('.btn-icon');
        const text = button.querySelector('.btn-text');
        
        if (icon) icon.textContent = '⏳';
        if (text) text.textContent = 'Scanning...';
        button.disabled = true;
        
        // Simulate biometric scan
        setTimeout(() => {
            if (icon) icon.textContent = '✅';
            if (text) text.textContent = 'Verified';
            
            // Show success feedback
            ErrorHandler.showMessage('Biometric authentication successful! Proceeding to dashboard...', 'info', 2000);
            
            // Navigate to dashboard after successful biometric auth
            setTimeout(() => {
                this.transitionToScreen('dashboard-screen');
                
                // Reset button after navigation
                setTimeout(() => {
                    if (icon) icon.textContent = '👆';
                    if (text) text.textContent = 'Use Fingerprint';
                    button.disabled = false;
                }, 1000);
            }, 1000);
        }, 1500);
    }
    
    /**
     * Transition between app screens
     */
    transitionToScreen(targetScreenId) {
        const currentScreen = document.querySelector('.app-screen.active');
        const targetScreen = document.getElementById(targetScreenId);
        
        if (!targetScreen) {
            console.warn(`Target screen not found: ${targetScreenId}`);
            return;
        }
        
        // Log screen transition
        this.interactionState.logAction('navigation', 'screen_transition', {
            from: currentScreen ? currentScreen.id : null,
            to: targetScreenId,
            timestamp: Date.now()
        });
        
        // Handle exit animation for current screen
        if (currentScreen) {
            currentScreen.classList.add('exiting');
            setTimeout(() => {
                currentScreen.classList.remove('active', 'exiting');
            }, 300);
        }
        
        // Handle enter animation for target screen
        setTimeout(() => {
            targetScreen.classList.add('active');
            targetScreen.classList.add('animate-slide-in-right');
            
            // Remove animation class after completion
            setTimeout(() => {
                targetScreen.classList.remove('animate-slide-in-right');
            }, 600);
            
            // Reset and activate appropriate layers for the new screen after transition
            setTimeout(() => {
                this.activateLayersForScreen(targetScreenId);
            }, 300);
        }, 150);
        
        // Update progress based on screen
        this.updateProgressForScreen(targetScreenId);
    }
    
    /**
     * Activate appropriate security layers for specific screens
     */
    activateLayersForScreen(screenId) {
        const screenLayerMap = {
            'welcome-screen': [], // No layers active on welcome
            'login-screen': ['kernel', 'hal', 'runtime', 'app'], // All layers for login
            'dashboard-screen': ['kernel', 'runtime', 'app'], // Basic protection for dashboard
            'balance-screen': ['kernel', 'runtime', 'app'], // Data access protection
            'transfer-screen': ['kernel', 'hal', 'runtime', 'app'], // Full protection for transfers
            'history-screen': ['kernel', 'runtime', 'app'] // Data access protection
        };
        
        const requiredLayers = screenLayerMap[screenId] || [];
        
        if (requiredLayers.length > 0) {
            this.activateLayersSequentially(requiredLayers);
        } else {
            // Deactivate all layers for screens that don't need them
            this.deactivateAllLayersWithProcessing();
        }
    }
    
    /**
     * Update progress indicator based on current screen
     */
    updateProgressForScreen(screenId) {
        const screenProgress = {
            'welcome-screen': 0,
            'login-screen': 1,
            'dashboard-screen': 2,
            'balance-screen': 3,
            'transfer-screen': 3,
            'history-screen': 3
        };
        
        const progress = screenProgress[screenId] || 0;
        this.interactionState.currentStep = progress;
    }
    
    /**
     * Show transfer success message
     */
    showTransferSuccess() {
        ErrorHandler.showMessage('Transfer completed successfully! All security layers verified the transaction.', 'info', 4000);
        
        // Update balance display (simulate)
        const balanceElements = document.querySelectorAll('.balance-amount');
        balanceElements.forEach(el => {
            if (el.textContent === '$12,345.67') {
                el.textContent = '$11,845.67';
            }
        });
    }
    
    /**
     * Show help overlay
     */
    showHelp() {
        const helpOverlay = document.getElementById('help-overlay');
        if (helpOverlay) {
            helpOverlay.classList.add('active');
            this.currentHelpStep = 0;
            this.updateHelpContent();
        }
        
        this.interactionState.logAction('help_system', 'help_opened', {
            timestamp: Date.now()
        });
    }
    
    /**
     * Close help overlay
     */
    closeHelp() {
        const helpOverlay = document.getElementById('help-overlay');
        if (helpOverlay) {
            helpOverlay.classList.remove('active');
        }
        
        this.interactionState.logAction('help_system', 'help_closed', {
            currentStep: this.currentHelpStep,
            timestamp: Date.now()
        });
    }
    
    /**
     * Go to next help step
     */
    nextHelpStep() {
        if (this.currentHelpStep < this.helpSystem.steps.length - 1) {
            this.currentHelpStep++;
            this.updateHelpContent();
            
            this.interactionState.logAction('help_system', 'help_next', {
                step: this.currentHelpStep,
                timestamp: Date.now()
            });
        } else {
            // Close help on last step
            this.closeHelp();
        }
    }
    
    /**
     * Go to previous help step
     */
    prevHelpStep() {
        if (this.currentHelpStep > 0) {
            this.currentHelpStep--;
            this.updateHelpContent();
            
            this.interactionState.logAction('help_system', 'help_previous', {
                step: this.currentHelpStep,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Update help content based on current step
     */
    updateHelpContent() {
        const helpBody = document.getElementById('help-body');
        const helpProgress = document.getElementById('help-progress');
        const helpNext = document.getElementById('help-next');
        const helpPrev = document.getElementById('help-prev');
        
        if (!helpBody || !helpProgress) return;
        
        const currentStep = this.helpSystem.steps[this.currentHelpStep];
        
        // Update content
        helpBody.innerHTML = currentStep.content;
        
        // Update progress
        helpProgress.textContent = `${this.currentHelpStep + 1} of ${this.helpSystem.steps.length}`;
        
        // Update navigation buttons
        if (helpPrev) {
            helpPrev.disabled = this.currentHelpStep === 0;
            helpPrev.style.opacity = this.currentHelpStep === 0 ? '0.5' : '1';
        }
        
        if (helpNext) {
            const isLastStep = this.currentHelpStep === this.helpSystem.steps.length - 1;
            helpNext.textContent = isLastStep ? 'Start Exploring →' : 'Next →';
        }
    }
    
    /**
     * Activate security layers in sequence with processing states
     */
    activateLayersSequentially(layerIds) {
        // Clear existing active layers with processing animation
        this.deactivateAllLayersWithProcessing();
        
        // Show security check message
        ErrorHandler.showMessage('Security Check: Activating security layers...', 'info', 1500);
        
        // Wait for deactivation to complete, then activate layers with delays
        setTimeout(() => {
            layerIds.forEach((layerId, index) => {
                setTimeout(() => {
                    this.activateLayerWithProcessing(layerId.trim());
                }, index * 400);
            });
        }, 1000);
    }
    
    /**
     * Activate a specific security layer with processing state
     */
    activateLayerWithProcessing(layerId) {
        const statusElement = document.querySelector(`.layer-status-item[data-layer="${layerId}"]`);
        if (statusElement) {
            // First show processing state
            statusElement.classList.add('processing');
            const statusText = statusElement.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = 'PROCESSING';
            }
            
            // After brief delay, activate the layer
            setTimeout(() => {
                statusElement.classList.remove('processing');
                statusElement.classList.add('active');
                if (statusText) {
                    statusText.textContent = 'ACTIVE';
                }
            }, 600);
        }
        
        this.activeLayers.add(layerId);
        
        // Log activation
        this.interactionState.logAction('layer_activation', 'layer_activated', {
            layerId,
            totalActiveLayers: this.activeLayers.size
        });
    }
    
    /**
     * Activate a specific security layer (legacy method for compatibility)
     */
    activateLayer(layerId) {
        this.activateLayerWithProcessing(layerId);
    }
    
    /**
     * Deactivate all security layers with processing animation
     */
    deactivateAllLayersWithProcessing() {
        // First set all layers to processing state
        document.querySelectorAll('.layer-status-item').forEach(statusItem => {
            if (statusItem.classList.contains('active')) {
                const statusText = statusItem.querySelector('.status-text');
                if (statusText) {
                    statusText.textContent = 'PROCESSING';
                }
                statusItem.classList.add('processing');
            }
        });
        
        // After brief delay, deactivate all layers
        setTimeout(() => {
            this.deactivateAllLayers();
        }, 800);
    }
    
    /**
     * Deactivate all security layers
     */
    deactivateAllLayers() {
        // Update the status in the info panel
        document.querySelectorAll('.layer-status-item').forEach(statusItem => {
            statusItem.classList.remove('active', 'processing');
            const statusText = statusItem.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = 'INACTIVE';
            }
        });
        
        this.activeLayers.clear();
    }
    
    /**
     * Show layer details in the side panel
     */
    showLayerDetails(layerInfo) {
        const panel = document.getElementById('layer-detail-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');
        
        if (!panel || !title || !content) return;
        
        // Update panel title
        title.innerHTML = `${layerInfo.icon} ${layerInfo.name}`;
        
        // Create detailed content with expandable sections
        content.innerHTML = `
            <div class="layer-info">
                <h4 style="color: ${layerInfo.color}">
                    ${layerInfo.icon} ${layerInfo.name}
                </h4>
                <p>${layerInfo.description}</p>
            </div>
            
            <div class="expandable-section expanded">
                <div class="section-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <h5 class="section-title">Security Mechanisms</h5>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="layer-mechanisms">
                        <ul>
                            ${layerInfo.mechanisms.map(mechanism => `<li>${mechanism}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="expandable-section expanded">
                <div class="section-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <h5 class="section-title">AnyBank Examples</h5>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="banking-examples">
                        <ul>
                            ${layerInfo.bankingExamples.map(example => `<li>${example}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="expandable-section">
                <div class="section-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <h5 class="section-title">Security Tips</h5>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="security-tip">
                        <h6>🛡️ Security Best Practice</h6>
                        <p>${this.getSecurityTip(layerInfo.id)}</p>
                    </div>
                </div>
            </div>
            
            <div class="expandable-section">
                <div class="section-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <h5 class="section-title">Interaction Guide</h5>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="layer-interaction-guide">
                        <h6>How to explore this layer:</h6>
                        <ol class="interaction-steps">
                            ${this.getInteractionSteps(layerInfo.id).map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                </div>
            </div>
        `;
        
        // Show panel
        panel.classList.add('open');
        
        // Focus management
        const closeButton = document.getElementById('panel-close');
        if (closeButton) {
            closeButton.focus();
        }
    }
    
    /**
     * Get security tip for a specific layer
     */
    getSecurityTip(layerId) {
        const tips = {
            kernel: 'The kernel layer is always active and provides the foundation for all other security measures. It cannot be bypassed or disabled by applications.',
            hal: 'Hardware security features like biometric sensors and secure elements provide the strongest protection when properly implemented.',
            runtime: 'Memory protection and code integrity verification happen automatically during app execution, protecting against many common attack vectors.',
            app: 'Application-level security depends on proper implementation by developers. Always validate inputs and encrypt sensitive data.'
        };
        
        return tips[layerId] || 'This security layer provides essential protection for mobile banking applications.';
    }
    
    /**
     * Get interaction steps for a specific layer
     */
    getInteractionSteps(layerId) {
        const steps = {
            kernel: [
                'Try any banking action to see the kernel layer activate first',
                'Notice how the kernel layer remains active throughout all operations',
                'Observe the green border indicating kernel-level protection'
            ],
            hal: [
                'Use the "Secure Login" or "Transfer Funds" actions to activate HAL',
                'Try the biometric authentication on the login screen',
                'Watch for the blue border indicating hardware security'
            ],
            runtime: [
                'Any banking action will activate runtime security',
                'Notice how runtime protection works with other layers',
                'Observe the purple border indicating memory protection'
            ],
            app: [
                'All banking actions demonstrate app-level security',
                'Navigate between different screens to see data protection',
                'Notice the red border indicating application security'
            ]
        };
        
        return steps[layerId] || ['Click on this layer when it\'s active to learn more'];
    }
    
    /**
     * Close the detail panel
     */
    closeDetailPanel() {
        const panel = document.getElementById('layer-detail-panel');
        if (panel) {
            panel.classList.remove('open');
        }
        
        // Return focus to the last clicked layer
        const activeLayer = document.querySelector('.security-layer.active');
        if (activeLayer) {
            activeLayer.focus();
        }
    }
    
    /**
     * Add visual feedback to layer interaction
     */
    addLayerFeedback(layerElement) {
        // Remove existing feedback classes
        layerElement.classList.remove('animate-glow', 'animate-bounce');
        
        // Add feedback animation
        layerElement.classList.add('animate-glow');
        
        // Remove after animation
        setTimeout(() => {
            layerElement.classList.remove('animate-glow');
        }, 2000);
    }
    
    /**
     * Update action button state
     */
    updateActionButtonState(button, state) {
        const icon = button.querySelector('.btn-icon');
        const text = button.querySelector('.btn-text');
        
        switch (state) {
            case 'processing':
                button.disabled = true;
                button.classList.add('processing');
                if (icon) icon.textContent = '⏳';
                if (text) text.textContent = 'Processing...';
                break;
                
            case 'complete':
                button.disabled = false;
                button.classList.remove('processing');
                button.classList.add('complete');
                if (icon) icon.textContent = '✅';
                if (text) text.textContent = 'Complete';
                
                // Reset after delay
                setTimeout(() => {
                    this.resetActionButton(button);
                }, 2000);
                break;
        }
    }
    
    /**
     * Reset action button to original state
     */
    resetActionButton(button) {
        const action = button.getAttribute('data-action');
        const icon = button.querySelector('.btn-icon');
        const text = button.querySelector('.btn-text');
        
        button.classList.remove('processing', 'complete');
        
        // Restore original content based on action
        const actionConfig = {
            login: { icon: '🔐', text: 'Secure Login' },
            balance: { icon: '💰', text: 'Check Balance' },
            transfer: { icon: '💸', text: 'Transfer Funds' },
            authenticate: { icon: '🔑', text: 'Use Login/Password' },
            'confirm-transfer': { icon: '✅', text: 'Confirm Transfer' },
            biometric: { icon: '👆', text: 'Use Fingerprint' }
        };
        
        const config = actionConfig[action];
        if (config) {
            if (icon) icon.textContent = config.icon;
            if (text) text.textContent = config.text;
        }
    }
    
    /**
     * Show action feedback
     */
    showActionFeedback(action) {
        const messages = {
            login: 'Login screen loaded! Security layers are ready for authentication.',
            balance: 'Balance information retrieved securely through protected channels.',
            transfer: 'Transfer screen loaded with full security validation.',
            authenticate: 'Authentication successful! All security layers verified your identity.',
            'confirm-transfer': 'Transfer processing with multi-layer security verification.',
            biometric: 'Biometric authentication completed successfully.',
            history: 'Transaction history loaded with encrypted data protection.'
        };
        
        const message = messages[action] || 'Action completed successfully.';
        ErrorHandler.showMessage(message, 'info', 3000);
    }
    
    /**
     * Show welcome state
     */
    showWelcomeState() {
        // Ensure all layers are deactivated initially
        this.deactivateAllLayers();
        
        // Show welcome screen
        const welcomeScreen = document.getElementById('welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.classList.add('animate-fade-in');
        }
    }
    

    
    /**
     * Get interaction statistics
     */
    getStats() {
        return {
            ...this.interactionState.getState(),
            activeLayers: Array.from(this.activeLayers),
            currentAction: this.currentAction,
            layerInteractions: this.interactionState.userActions.filter(
                action => action.category === 'layer_interaction'
            ).length,
            bankingActions: this.interactionState.userActions.filter(
                action => action.category === 'banking_action'
            ).length
        };
    }
    

    
    /**
     * Update the tutorial step content and UI
     */
    updateTutorialStep() {
        const step = this.tutorialSteps[this.currentTutorialStep];
        
        // Update screen if specified
        if (step.targetScreen) {
            this.transitionToScreen(step.targetScreen);
        }
        
        // Activate security layers for this step
        this.deactivateAllLayers();
        if (step.activeLayers && step.activeLayers.length > 0) {
            this.activateLayersSequentially(step.activeLayers);
        }
        
        // Update the instruction panel content
        this.updateInstructionPanel(step);
        
        // Set up help toggle functionality after DOM update
        this.setupHelpToggle();
    }
    
    /**
     * Update the instruction panel with step content
     */
    updateInstructionPanel(step) {
        // Find or create instruction panel
        let instructionPanel = document.querySelector('.instruction-panel');
        if (!instructionPanel) {
            // Create instruction panel if it doesn't exist
            instructionPanel = document.createElement('div');
            instructionPanel.className = 'instruction-panel';
            
            const securityLayersInfo = document.querySelector('.security-layers-info');
            if (securityLayersInfo) {
                securityLayersInfo.insertBefore(instructionPanel, securityLayersInfo.firstChild);
            }
        }
        
        // Update panel content
        instructionPanel.innerHTML = `
            <div class="instruction-header">
                <h3 class="instruction-title">${step.title}</h3>
                <div class="instruction-controls">
                    <button class="help-toggle-btn" id="help-toggle-btn" aria-label="Toggle detailed guidance">
                        <span class="help-icon">💡</span>
                        <span class="help-text">Show Guide</span>
                    </button>
                </div>
            </div>
            <div class="instruction-content">
                <p class="instruction-description">${step.description}</p>
                <div class="instruction-guidance">
                    <p><strong>What to do:</strong> ${step.instructions}</p>
                </div>
                
                <!-- Enhanced Help Content (Initially Hidden) -->
                <div class="detailed-help-content" id="detailed-help-content">
                    <div class="help-section">
                        <h4>🎯 How to Interact</h4>
                        <ul>
                            <li>Click banking actions (Secure Login, Check Balance, Transfer) to activate security layers</li>
                            <li>Click on active security layer icons (🛡️ 🔐 ⚡ 📱) to learn about their mechanisms</li>
                            <li>Use the Next/Previous buttons to follow the guided tour</li>
                            <li>Watch the right panel to see which layers are active</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>🔍 Security Layer Details</h4>
                        <ul>
                            <li><strong>Kernel Security (🛡️):</strong> Process isolation and mandatory access controls</li>
                            <li><strong>Hardware Security (🔐):</strong> Biometric authentication and cryptographic operations</li>
                            <li><strong>Runtime Security (⚡):</strong> Memory protection and code integrity verification</li>
                            <li><strong>App Security (📱):</strong> Data encryption and secure storage mechanisms</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>💡 Learning Tips</h4>
                        <ul>
                            <li>Start with "Secure Login" to see all four layers activate together</li>
                            <li>Try different banking actions to see how layer activation varies</li>
                            <li>Click on highlighted layer icons for detailed mechanism explanations</li>
                            <li>Follow the guided tour for structured learning progression</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Set up help toggle functionality
     */
    setupHelpToggle() {
        const helpToggleBtn = document.getElementById('help-toggle-btn');
        const detailedHelpContent = document.getElementById('detailed-help-content');
        
        if (helpToggleBtn && detailedHelpContent) {
            // Remove any existing event listeners
            helpToggleBtn.replaceWith(helpToggleBtn.cloneNode(true));
            const newHelpToggleBtn = document.getElementById('help-toggle-btn');
            
            newHelpToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isActive = detailedHelpContent.classList.contains('active');
                
                if (isActive) {
                    detailedHelpContent.classList.remove('active');
                    newHelpToggleBtn.classList.remove('active');
                    newHelpToggleBtn.querySelector('.help-text').textContent = 'Show Guide';
                    newHelpToggleBtn.setAttribute('aria-label', 'Show detailed guidance');
                } else {
                    detailedHelpContent.classList.add('active');
                    newHelpToggleBtn.classList.add('active');
                    newHelpToggleBtn.querySelector('.help-text').textContent = 'Hide Guide';
                    newHelpToggleBtn.setAttribute('aria-label', 'Hide detailed guidance');
                }
                
                // Log the interaction
                this.interactionState.logAction('help_system', isActive ? 'help_hidden' : 'help_shown', {
                    method: 'toggle_button',
                    location: 'instruction_panel'
                });
            });
        }
    }
    

    
    /**
     * Complete the tutorial
     */
    completeTutorial() {
        this.interactionState.logAction('tutorial', 'completed', {
            totalSteps: this.tutorialSteps.length,
            completionTime: Date.now() - this.interactionState.startTime
        });
        
        // Show completion message
        ErrorHandler.showMessage('Tutorial completed! You can now freely explore all security layers and banking functions.', 'info', 5000);
        
        // Enable free exploration mode
        this.enableFreeExploration();
    }
    
    /**
     * Enable free exploration mode after tutorial completion
     */
    enableFreeExploration() {
        // Update instruction panel for free exploration
        const instructionPanel = document.querySelector('.instruction-panel');
        if (instructionPanel) {
            instructionPanel.innerHTML = `
                <div class="instruction-header">
                    <h3 class="instruction-title">Free Exploration Mode</h3>
                </div>
                <div class="instruction-content">
                    <p class="instruction-description">Tutorial complete! Now you can freely explore all banking functions and security layers.</p>
                    <div class="instruction-guidance">
                        <p><strong>Try these actions:</strong></p>
                        <ul>
                            <li>Click any banking action to see security layers activate</li>
                            <li>Click active security layer icons to learn more</li>
                            <li>Navigate between different banking screens</li>
                            <li>Use the help button (?) for additional guidance</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Restart the tutorial from the beginning
     */
    restartTutorial() {
        this.currentTutorialStep = 0;
        this.interactionState.reset();
        this.interactionState.currentStep = 0;
        this.updateTutorialStep();
        
        this.interactionState.logAction('tutorial', 'restarted');
    }
}

// Make SecurityLayerInteraction available globally
window.SecurityLayerInteraction = SecurityLayerInteraction;

// Initialize SecurityLayerInteraction when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing SecurityLayerInteraction');
    const securityInteraction = new SecurityLayerInteraction();
    securityInteraction.initialize();
    
    // Make it globally available for debugging
    window.securityInteraction = securityInteraction;
});
// Dynamic Arrow System for Pathway Visualization
class PathwayArrows {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.arrows = [];
        this.init();
    }

    init() {
        // Wait for next frame to ensure DOM is fully ready
        requestAnimationFrame(() => {
            this.canvas = document.getElementById('pathway-arrows-canvas');
            this.container = document.querySelector('.pathway-container');
            
            if (!this.canvas || !this.container) {
                console.debug('Arrow system: Waiting for canvas or container');
                return;
            }

            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                console.debug('Arrow system: Canvas context not available');
                return;
            }
            
            this.setupCanvas();
            this.defineConnections();
            this.drawArrows();
            
            // Redraw on window resize
            window.addEventListener('resize', () => {
                setTimeout(() => {
                    this.setupCanvas();
                    this.drawArrows();
                }, 100);
            });
        });
    }

    setupCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getCardPosition(selector, side = 'center') {
        let element;
        
        // Handle :contains() pseudo-selector
        if (selector.includes(':contains(')) {
            const match = selector.match(/(.+):contains\("([^"]+)"\)/);
            if (match) {
                const baseSelector = match[1];
                const searchText = match[2];
                const elements = this.container.querySelectorAll(baseSelector);
                element = Array.from(elements).find(el => el.textContent.includes(searchText));
            }
        } else {
            element = this.container.querySelector(selector);
        }
        
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return null;
        }

        const containerRect = this.container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        const relativeX = elementRect.left - containerRect.left;
        const relativeY = elementRect.top - containerRect.top;
        
        switch (side) {
            case 'top':
                return { x: relativeX + elementRect.width / 2, y: relativeY };
            case 'bottom':
                return { x: relativeX + elementRect.width / 2, y: relativeY + elementRect.height };
            case 'left':
                return { x: relativeX, y: relativeY + elementRect.height / 2 };
            case 'right':
                return { x: relativeX + elementRect.width, y: relativeY + elementRect.height / 2 };
            case 'center':
            default:
                return { x: relativeX + elementRect.width / 2, y: relativeY + elementRect.height / 2 };
        }
    }

    defineConnections() {
        this.arrows = [
            // ===== STRESS INITIATORS =====
            // Chronic stress to PROLACTIN and ROS
            { from: '.stress-initiators-row .stress-card:nth-child(1)', fromSide: 'bottom', to: '#prolactin-activation', toSide: 'top', type: 'pathway' },
            { from: '.stress-initiators-row .stress-card:nth-child(1)', fromSide: 'bottom', to: '#ros-generation', toSide: 'top', type: 'pathway' },
            // Other stress initiators to ROS (4 remaining)
            { from: '.stress-initiators-row .stress-card:nth-child(2)', fromSide: 'bottom', to: '#ros-generation', toSide: 'top', type: 'pathway' },
            { from: '.stress-initiators-row .stress-card:nth-child(3)', fromSide: 'bottom', to: '#ros-generation', toSide: 'top', type: 'pathway' },
            { from: '.stress-initiators-row .stress-card:nth-child(4)', fromSide: 'bottom', to: '#ros-generation', toSide: 'top', type: 'pathway' },
            { from: '.stress-initiators-row .stress-card:nth-child(5)', fromSide: 'bottom', to: '#ros-generation', toSide: 'top', type: 'pathway' },

            // ===== PROLACTIN CONNECTIONS =====
            { from: '#prolactin-activation', fromSide: 'right', to: '#ros-generation', toSide: 'left', type: 'pathway' },
            { from: '#prolactin-activation', fromSide: 'bottom', to: '.nfkb-card', toSide: 'top', type: 'pathway' },
            { from: '#prolactin-activation', fromSide: 'bottom', to: '.fibrotic-card:contains("TGF-β1 ACTIVATION")', toSide: 'top', type: 'pathway' },

            // ===== NO HORIZONTAL CONNECTIONS BETWEEN STRESS CARDS - They only point to ROS/PROLACTIN =====

            // ===== ROS TO INFLAMMATORY PATHWAY =====
            { from: '#ros-generation', fromSide: 'bottom', to: '.nfkb-card', toSide: 'top', type: 'pathway' },
            { from: '#ros-generation', fromSide: 'bottom', to: '.cytokine-card', toSide: 'top', type: 'pathway' },

            // ===== HORIZONTAL CONNECTION: NF-κB TO CYTOKINES =====
            { from: '.nfkb-card', fromSide: 'right', to: '.cytokine-card', toSide: 'left', type: 'pathway' },

            // ===== ROS TO NO DYSFUNCTION (direct path) =====
            { from: '#ros-generation', fromSide: 'bottom', to: '.fibrotic-card:contains("NO/cGMP DYSFUNCTION")', toSide: 'top', type: 'pathway' },

            // ===== INFLAMMATORY TO FIBROTIC (both cards to TGF-β1) =====
            { from: '.nfkb-card', fromSide: 'bottom', to: '.fibrotic-card:contains("TGF-β1 ACTIVATION")', toSide: 'top', type: 'pathway' },
            { from: '.cytokine-card', fromSide: 'bottom', to: '.fibrotic-card:contains("TGF-β1 ACTIVATION")', toSide: 'top', type: 'pathway' },

            // ===== TGF-β1 TO DOWNSTREAM FIBROTIC =====
            { from: '.fibrotic-card:contains("TGF-β1 ACTIVATION")', fromSide: 'bottom', to: '.fibrotic-card:contains("MYOFIBROBLAST DIFFERENTIATION")', toSide: 'top', type: 'pathway' },
            { from: '.fibrotic-card:contains("TGF-β1 ACTIVATION")', fromSide: 'bottom', to: '.fibrotic-card:contains("COLLAGEN SYNTHESIS")', toSide: 'top', type: 'pathway' },
            { from: '.fibrotic-card:contains("TGF-β1 ACTIVATION")', fromSide: 'bottom', to: '.fibrotic-card:contains("MMP/TIMP IMBALANCE")', toSide: 'top', type: 'pathway' },

            // ===== NO DYSFUNCTION TO MITOCHONDRIAL =====
            { from: '.fibrotic-card:contains("NO/cGMP DYSFUNCTION")', fromSide: 'bottom', to: '.fibrotic-card:contains("MITOCHONDRIAL DYSFUNCTION")', toSide: 'top', type: 'pathway' },

            // ===== INTERVENTION ARROWS (INHIBITION) =====
            
            // Antioxidants to ROS
            { from: '.antioxidant-card', fromSide: 'left', to: '#ros-generation', toSide: 'right', type: 'inhibition' },
            
            // Stress management to chronic stress (curved)
            { from: '.antioxidant-card', fromSide: 'top', to: '.stress-initiators-row .stress-card:nth-child(1)', toSide: 'bottom', type: 'inhibition' },
            
            // Anti-inflammatory to cytokines
            { from: '.anti-inflammatory-card', fromSide: 'left', to: '.cytokine-card', toSide: 'right', type: 'inhibition' },
            
            // TGF-β1 inhibition
            { from: '.tgf-inhibition-card', fromSide: 'left', to: '.fibrotic-card:contains("TGF-β1 ACTIVATION")', toSide: 'right', type: 'inhibition' },
            
            // Vascular support to NO dysfunction
            { from: '.vascular-support-card', fromSide: 'left', to: '.fibrotic-card:contains("NO/cGMP DYSFUNCTION")', toSide: 'right', type: 'inhibition' },
            
            // Mitochondrial rescue to dysfunction
            { from: '.mitochondrial-rescue-card', fromSide: 'left', to: '.fibrotic-card:contains("MITOCHONDRIAL DYSFUNCTION")', toSide: 'right', type: 'inhibition' },

            // ===== VITAMIN C-E REGENERATION SYNERGY =====
            { from: '.antioxidant-card', fromSide: 'right', to: '.vitamin-regeneration', toSide: 'left', type: 'synergy' },

            // ===== ADDITIONAL CROSS-CONNECTIONS =====
            
            // Horizontal connections within fibrotic second layer
            { from: '.fibrotic-card:contains("MYOFIBROBLAST DIFFERENTIATION")', fromSide: 'right', to: '.fibrotic-card:contains("COLLAGEN SYNTHESIS")', toSide: 'left', type: 'pathway' },
            { from: '.fibrotic-card:contains("COLLAGEN SYNTHESIS")', fromSide: 'right', to: '.fibrotic-card:contains("MMP/TIMP IMBALANCE")', toSide: 'left', type: 'pathway' },
            { from: '.fibrotic-card:contains("MMP/TIMP IMBALANCE")', fromSide: 'right', to: '.fibrotic-card:contains("MITOCHONDRIAL DYSFUNCTION")', toSide: 'left', type: 'pathway' },
            
            // ===== FIBROTIC TO DISEASE MANIFESTATION =====
            // All fibrotic cards converge to the comprehensive fibrosis card
            { from: '.fibrotic-card:contains("MYOFIBROBLAST DIFFERENTIATION")', fromSide: 'bottom', to: '.comprehensive-fibrosis-card', toSide: 'top', type: 'pathway' },
            { from: '.fibrotic-card:contains("COLLAGEN SYNTHESIS")', fromSide: 'bottom', to: '.comprehensive-fibrosis-card', toSide: 'top', type: 'pathway' },
            { from: '.fibrotic-card:contains("MMP/TIMP IMBALANCE")', fromSide: 'bottom', to: '.comprehensive-fibrosis-card', toSide: 'top', type: 'pathway' },
            { from: '.fibrotic-card:contains("MITOCHONDRIAL DYSFUNCTION")', fromSide: 'bottom', to: '.comprehensive-fibrosis-card', toSide: 'top', type: 'pathway' }
        ];
    }

    drawArrow(from, to, type = 'pathway') {
        if (!from || !to) return;

        this.ctx.save();
        
        // Set arrow style based on type
        switch (type) {
            case 'pathway':
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([]);
                break;
            case 'intervention':
                this.ctx.strokeStyle = '#009900';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([]);
                break;
            case 'inhibition':
                this.ctx.strokeStyle = '#cc0000';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                break;
            case 'synergy':
                this.ctx.strokeStyle = '#0066cc';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([3, 3]);
                break;
        }

        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        
        // Add curve for longer connections
        const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
        if (distance > 200) {
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const curveOffset = distance * 0.1;
            this.ctx.quadraticCurveTo(midX + curveOffset, midY, to.x, to.y);
        } else {
            this.ctx.lineTo(to.x, to.y);
        }
        this.ctx.stroke();

        // Draw arrowhead
        this.drawArrowhead(from, to, type);
        
        this.ctx.restore();
    }

    drawArrowhead(from, to, type) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const headLength = 8;
        
        this.ctx.beginPath();
        this.ctx.moveTo(to.x, to.y);
        this.ctx.lineTo(
            to.x - headLength * Math.cos(angle - Math.PI / 6),
            to.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(to.x, to.y);
        this.ctx.lineTo(
            to.x - headLength * Math.cos(angle + Math.PI / 6),
            to.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();

        // Fill arrowhead for solid arrows
        if (type !== 'inhibition') {
            this.ctx.beginPath();
            this.ctx.moveTo(to.x, to.y);
            this.ctx.lineTo(
                to.x - headLength * Math.cos(angle - Math.PI / 6),
                to.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            this.ctx.lineTo(
                to.x - headLength * Math.cos(angle + Math.PI / 6),
                to.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            this.ctx.closePath();
            this.ctx.fillStyle = this.ctx.strokeStyle;
            this.ctx.fill();
        }
    }

    drawArrows() {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.arrows.forEach(arrow => {
            try {
                const fromPos = this.getCardPosition(arrow.from, arrow.fromSide);
                const toPos = this.getCardPosition(arrow.to, arrow.toSide);
                
                if (fromPos && toPos) {
                    this.drawArrow(fromPos, toPos, arrow.type);
                }
            } catch (e) {
                console.debug(`Skipping arrow from ${arrow.from} to ${arrow.to}:`, e.message);
            }
        });
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PathwayArrows();
    });
} else {
    // DOM is already loaded
    setTimeout(() => {
        new PathwayArrows();
    }, 100);
}
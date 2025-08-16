// Calculator User Interface Integration
class CalculatorUI {
    constructor() {
        this.calculator = null;
        this.currentPatient = {
            weight: 75, height: 175, age: 45, bmi: 24.5,
            creatinine: 'normal', liver: 'normal', smoking: 'never',
            diseaseStage: 'chronic', curvature: 30, hasPlaque: 'no'
        };
        this.selectedComponents = new Set();
    }

    async initialize() {
        try {
            // Initialize data loader and calculator
            await window.dataLoader.loadAllData();
            this.calculator = window.calculator;
            await this.calculator.initialize();

            // Render dynamic components list from data
            this.renderComponentsList();

            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize patient profile and stage-based components
            this.initializeStageBasedComponents();
            this.updatePatientDisplay();
            
            console.log('Calculator UI initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize calculator UI:', error);
            this.showError('Failed to initialize calculator. Please refresh the page.');
        }
    }

    renderComponentsList() {
        try {
            const container = document.getElementById('components-container');
            if (!container) return;

            const componentsData = window.dataLoader.getComponentsData();
            const components = componentsData.components;

            const html = Object.entries(components)
                .map(([id, comp]) => {
                    return `
                    <div class="component-item" data-component="${id}">
                        <input type="checkbox" id="${id}" />
                        <label for="${id}">
                            <span class="component-name">${comp.name}</span>
                            <span class="component-dose" id="dose-${id}"></span>
                        </label>
                    </div>`;
                })
                .join('');

            container.innerHTML = html;
        } catch (err) {
            console.error('Failed to render components list:', err);
        }
    }

    setupEventListeners() {
        // Patient profile inputs
        const patientInputs = ['weight', 'height', 'age', 'creatinine', 'liver', 'smoking', 'diseaseStage', 'curvature', 'hasPlaque'];
        patientInputs.forEach(inputName => {
            const input = document.getElementById(inputName);
            if (input) {
                input.addEventListener('change', () => this.updatePatientProfile(inputName, input.value));
            }
        });

        // Component checkboxes
        const componentIds = window.dataLoader.getAllComponentIds();
        componentIds.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.toggleComponent(id, checkbox.checked));
            }
        });

        // Reset button
        const resetBtn = document.querySelector('.reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetCalculator());
        }

        // Auto-calc on any change is already wired; remove explicit button handling
    }

    updatePatientProfile(field, value) {
        // Convert and validate input
        if (['weight', 'height', 'age', 'curvature'].includes(field)) {
            this.currentPatient[field] = parseFloat(value) || 0;
        } else {
            this.currentPatient[field] = value;
        }

        // Recalculate BMI if weight or height changed
        if (field === 'weight' || field === 'height') {
            this.currentPatient.bmi = this.calculateBMI(this.currentPatient.weight, this.currentPatient.height);
        }

        // Update stage-based component recommendations if stage or plaque status changed
        if (field === 'diseaseStage' || field === 'hasPlaque') {
            this.updateStageBasedComponents();
        }

        // Update all calculations and displays
        this.updateCalculations();
        this.updatePatientDisplay();
    }

    calculateBMI(weight, height) {
        if (!weight || !height) return 0;
        const heightM = height / 100;
        return weight / (heightM * heightM);
    }

    initializeStageBasedComponents() {
        this.updateStageBasedComponents();
    }

    updateStageBasedComponents() {
        try {
            // Check if acute phase with plaque - use chronic protocol (full 12 components)
            const isAcuteWithPlaque = this.currentPatient.diseaseStage === 'acute' && 
                                      this.currentPatient.hasPlaque !== 'no';
            
            // Get components for the appropriate stage
            // If acute with plaque, use chronic stage to get all 12 components
            const effectiveStage = isAcuteWithPlaque ? 'chronic' : this.currentPatient.diseaseStage;
            const stageComponents = window.dataLoader.getComponentsByStage(effectiveStage);
            
            // Clear current selection
            this.selectedComponents.clear();
            
            // Reset all checkboxes to unchecked and enabled by default
            const allComponents = window.dataLoader.getAllComponentIds();
            allComponents.forEach(componentId => {
                const checkbox = document.getElementById(componentId);
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.disabled = false;
                }
            });

            // Apply contraindications: disable and ensure unchecked
            // For acute with plaque, no contraindications apply (full protocol)
            if (!isAcuteWithPlaque && stageComponents.contraindicated && stageComponents.contraindicated.length > 0) {
                stageComponents.contraindicated.forEach(componentId => {
                    const checkbox = document.getElementById(componentId);
                    if (checkbox) {
                        checkbox.checked = false;
                        checkbox.disabled = true;
                    }
                    this.selectedComponents.delete(componentId);
                });
            }

            // Add core components for the stage
            stageComponents.core.forEach(componentId => {
                // Don't manually add to selectedComponents - let toggleComponent handle it
                this.updateComponentCheckbox(componentId, true);
            });

        } catch (error) {
            console.error('Error updating stage-based components:', error);
        }
    }

    updateComponentCheckbox(componentId, checked) {
        const checkbox = document.getElementById(componentId);
        if (checkbox) {
            checkbox.checked = checked;
            // Manually trigger the change event since programmatic changes don't fire it
            checkbox.dispatchEvent(new Event('change'));
        }
    }

    toggleComponent(componentId, checked) {
        if (checked) {
            this.selectedComponents.add(componentId);
        } else {
            this.selectedComponents.delete(componentId);
        }
        this.updateCalculations();
    }

    async updateCalculations() {
        try {
            if (!this.calculator || this.selectedComponents.size === 0) {
                this.clearResults();
                return;
            }

            // Convert patient profile to the format expected by calculator
            const patientProfile = this.formatPatientProfile();
            const selectedComponentsArray = Array.from(this.selectedComponents);

            // Calculate dosing and effectiveness
            const results = this.calculator.calculateDosing(patientProfile, selectedComponentsArray);

            // Update UI with results
            this.updateResults(results);

        } catch (error) {
            console.error('Calculation error:', error);
            this.showError('Calculation failed. Please check your inputs.');
        }
    }

    formatPatientProfile() {
        // Convert UI patient format to calculator format
        let creatinineClearance = 90; // Default normal (~>60)
        if (this.currentPatient.creatinine === 'mild') creatinineClearance = 50;
        else if (this.currentPatient.creatinine === 'moderate') creatinineClearance = 25;

        // Normalize liver function from UI select to model enums (Child-Pugh B only)
        let liverFunction = 'normal';
        if (this.currentPatient.liver === 'child-b') liverFunction = 'childB';

        return {
            weight: this.currentPatient.weight,
            height: this.currentPatient.height,
            age: this.currentPatient.age,
            bmi: this.currentPatient.bmi,
            smoking: this.currentPatient.smoking === 'current',
            creatinineClearance: creatinineClearance,
            liverFunction,
            stage: this.currentPatient.diseaseStage,
            hasPlaque: this.currentPatient.hasPlaque !== 'no',
            hasCalcification: this.currentPatient.hasPlaque === 'calcified'
        };
    }

    updateResults(results) {
        // Update therapy components
        this.updateTherapyComponents(results.componentDoses);
        
        // Update effectiveness metrics
        this.updateEffectivenessResults(results.effectiveness);
        
        // Update warnings
        this.updateWarnings(results.warnings);
        
        // Update stage recommendations
        this.updateStageRecommendations(results.stageRecommendations);
    }

    updateDosingResults(componentDoses) {
        const dosingContainer = document.getElementById('dosing-results');
        if (!dosingContainer) return;

        const dosingHTML = Object.entries(componentDoses).map(([componentId, dose]) => {
            const component = window.dataLoader.getComponent(componentId);
            
            // Special handling for vitamin D3+K2 complex and curcumin+piperine
            let doseDisplay = `${dose.adjustedDose} ${dose.unit}`;
            if (componentId === 'vitamin-d3-k2-complex') {
                // Calculate K2 dose based on ratio (100 µg K2 for 4000 IU D3)
                const k2Dose = Math.round(dose.adjustedDose * 100 / 4000);
                doseDisplay = `${dose.adjustedDose} IU + ${k2Dose} µg`;
            } else if (componentId === 'curcumin-piperine') {
                // Calculate piperine dose based on ratio (10 mg piperine for 1000 mg curcumin)
                const piperineDose = Math.round(dose.adjustedDose * 10 / 1000);
                doseDisplay = `${dose.adjustedDose} mg + ${piperineDose} mg`;
            }
            
            return `
                <div class="dose-item">
                    <span class="component-name">${component.name}</span>
                    <span class="dose-amount">${doseDisplay}</span>
                    <span class="dose-frequency">${dose.frequency}</span>
                    ${dose.adjustmentFactor !== 1 ? `<span class="adjustment">(${Math.round(dose.adjustmentFactor * 100)}%)</span>` : ''}
                </div>
            `;
        }).join('');

        dosingContainer.innerHTML = dosingHTML;

        // Also update per-component chips next to checkboxes for immediate feedback
        Object.entries(componentDoses).forEach(([componentId, dose]) => {
            const doseSpan = document.getElementById(`dose-${componentId}`);
            if (!doseSpan) return;
            let amountText = `${dose.adjustedDose}${dose.unit}`;
            
            // Special handling for vitamin D3+K2 complex and curcumin+piperine
            if (componentId === 'vitamin-d3-k2-complex') {
                const k2Dose = Math.round(dose.adjustedDose * 100 / 4000);
                amountText = `${dose.adjustedDose}IU + ${k2Dose}µg`;
            } else if (componentId === 'curcumin-piperine') {
                const piperineDose = Math.round(dose.adjustedDose * 10 / 1000);
                amountText = `${dose.adjustedDose}mg + ${piperineDose}mg`;
            } else if (dose.route === 'topical') {
                const grams = Math.round((dose.adjustedDose / 1000) * 10) / 10;
                amountText = `${grams}g`;
            }
            let text = `${amountText} ${dose.frequency}`;
            if (dose.adjustmentFactor !== 1) {
                const arrow = dose.adjustmentFactor > 1 ? ' ↑' : ' ↓';
                text += arrow;
            }
            doseSpan.textContent = text;
        });
    }

    updateTherapyComponents(componentDoses) {
        const oralContainer = document.querySelector('#oral-components .components-grid');
        const topicalContainer = document.querySelector('#topical-components .components-grid');
        
        if (!oralContainer || !topicalContainer) return;
        
        const oralComponents = [];
        const topicalComponents = [];
        
        Object.entries(componentDoses).forEach(([componentId, dose]) => {
            const component = window.dataLoader.getComponent(componentId);
            
            // Special handling for vitamin D3+K2 complex and curcumin+piperine
            let doseDisplay = `${dose.adjustedDose}${dose.unit}`;
            if (componentId === 'vitamin-d3-k2-complex') {
                const k2Dose = Math.round(dose.adjustedDose * 100 / 4000);
                doseDisplay = `${dose.adjustedDose}IU + ${k2Dose}µg`;
            } else if (componentId === 'curcumin-piperine') {
                const piperineDose = Math.round(dose.adjustedDose * 10 / 1000);
                doseDisplay = `${dose.adjustedDose}mg + ${piperineDose}mg`;
            }
            
            const componentInfo = {
                name: component.name,
                dose: dose.adjustedDose,
                unit: dose.unit,
                doseDisplay: doseDisplay,
                frequency: dose.frequency,
                route: dose.route,
                adjustmentFactor: dose.adjustmentFactor,
                componentId: componentId
            };
            
            if (dose.route === 'topical') {
                topicalComponents.push(componentInfo);
            } else {
                oralComponents.push(componentInfo);
            }
        });
        
        // Render oral components
        oralContainer.innerHTML = oralComponents.map(comp => `
            <div class="therapy-component">
                <div class="component-name">${comp.name}</div>
                <div class="component-dose">${comp.doseDisplay} ${comp.frequency}</div>
                ${comp.adjustmentFactor !== 1 ? 
                    `<div class="dose-adjustment">${Math.round(comp.adjustmentFactor * 100)}% adjusted</div>` : 
                    ''}
            </div>
        `).join('') || '<div class="no-components">No oral components selected</div>';
        
        // Render topical components
        topicalContainer.innerHTML = topicalComponents.map(comp => {
            const grams = Math.round((comp.dose / 1000) * 10) / 10;
            return `
            <div class="therapy-component">
                <div class="component-name">${comp.name}</div>
                <div class="component-dose">${grams}g ${comp.frequency}</div>
                ${comp.adjustmentFactor !== 1 ? 
                    `<div class="dose-adjustment">${Math.round(comp.adjustmentFactor * 100)}% adjusted</div>` : 
                    ''}
            </div>
        `}).join('') || '<div class="no-components">No topical components selected</div>';
    }

    updateEffectivenessResults(effectiveness) {
        // The effectiveness results are now static and shown in HTML
        // No need to update progress bars
    }

    updateProgressBar(progressId, value) {
        const progressElement = document.getElementById(progressId);
        const valueElement = document.getElementById(progressId.replace('-progress', '-value'));
        
        if (progressElement) {
            const percentage = Math.round(value);
            
            // Update native progress element
            if (progressElement.tagName === 'PROGRESS') {
                progressElement.value = percentage;
                progressElement.textContent = `${percentage}%`; // Fallback text
            } else {
                // Fallback for old div-based progress bars
                progressElement.style.width = `${percentage}%`;
                progressElement.textContent = `${percentage}%`;
            }
            
            // Update the separate value display
            if (valueElement) {
                valueElement.textContent = `${percentage}%`;
            }
        }
    }

    updateSynergyResults(synergyEffects) {
        const synergyContainer = document.getElementById('synergy-results');
        if (!synergyContainer) return;

        const synergyHTML = Object.entries(synergyEffects).map(([pair, synergy]) => {
            const components = pair.split('-').join(' + ');
            return `
                <div class="synergy-item ${synergy.significance}">
                    <span class="synergy-pair">${components}</span>
                    <span class="synergy-factor">${synergy.factor}x</span>
                    <span class="synergy-type">${synergy.type}</span>
                </div>
            `;
        }).join('');

        synergyContainer.innerHTML = synergyHTML || '<div class="no-synergies">No significant synergies detected</div>';
    }

    updateWarnings(warnings) {
        const warningsContainer = document.getElementById('warnings-container');
        if (!warningsContainer) return;

        if (warnings.length === 0) {
            warningsContainer.style.display = 'none';
            return;
        }

        warningsContainer.style.display = 'block';
        const warningsHTML = warnings.map(warning => 
            `<div class="warning-item">⚠️ ${warning}</div>`
        ).join('');

        warningsContainer.innerHTML = warningsHTML;
    }

    updateStageRecommendations(recommendations) {
        const stageContainer = document.getElementById('stage-recommendations');
        if (!stageContainer) return;

        // Check if injectable therapy should be shown
        const isChronicOrAcuteWithPlaque = (this.currentPatient.diseaseStage === 'chronic') || 
                                           (this.currentPatient.diseaseStage === 'acute' && this.currentPatient.hasPlaque !== 'no');
        
        // Find injectable therapy in special considerations
        const injectableInfo = recommendations.specialConsiderations?.find(
            consideration => consideration.includes('Injectable therapy')
        );

        const stageHTML = `
            <div class="stage-info">
                <h4>${recommendations.stageName}</h4>
                <p>${recommendations.description}</p>
                <div class="stage-details">
                    <div>Duration: ${recommendations.duration}</div>
                </div>
                ${isChronicOrAcuteWithPlaque && injectableInfo ? `
                    <div class="injectable-therapy-info" style="margin-top: 10px; padding: 10px; background-color: #e3f2fd; border-radius: 5px; border-left: 4px solid #1976d2;">
                        <strong style="color: #1976d2;">💉 Injectable Therapy Required:</strong>
                        <p style="margin: 5px 0 0 0;">${injectableInfo}</p>
                        <div style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-radius: 5px; border-left: 4px solid #ff9800;">
                            <strong style="color: #ff6f00;">⚠️ Critical Safety Notice:</strong>
                            <p style="margin: 5px 0 0 0; font-size: 0.9em;">
                                Pentoxifylline injections may only be conducted by absolute experts with a 30G needle, 
                                as any additional trauma might worsen the condition. It is only indicated upon consultation 
                                with experts knowledgeable in this specific domain and should be reduced dynamically upon 
                                progressive decline of the disease.
                            </p>
                        </div>
                    </div>
                ` : ''}
                
                <div class="pde5-disclaimer" style="margin-top: 10px; padding: 10px; background-color: #f3e5f5; border-radius: 5px; border-left: 4px solid #9c27b0;">
                    <strong style="color: #7b1fa2;">💊 Important Consultation Notice:</strong>
                    <p style="margin: 5px 0 0 0; font-size: 0.9em;">
                        Consult with specialist regarding combination of pentoxifylline and PDE5 inhibitors 
                        like daily 5mg tadalafil for your specific presentation of the disease.
                    </p>
                </div>
            </div>
        `;

        stageContainer.innerHTML = stageHTML;
    }

    updatePatientDisplay() {
        // Update BMI display
        const bmiDisplay = document.getElementById('bmi-display');
        if (bmiDisplay) {
            bmiDisplay.textContent = `BMI: ${this.currentPatient.bmi.toFixed(1)}`;
        }

        // Update height input if BMI was calculated
        const heightInput = document.getElementById('height');
        if (heightInput) {
            heightInput.value = this.currentPatient.height;
        }
    }

    clearResults() {
        const containers = ['dosing-results', 'synergy-results', 'warnings-container', 'stage-recommendations'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = '';
            }
        });

        // Reset progress bars
        const progressBars = ['tgf-progress', 'collagen-progress', 'curvature-progress', 'plaque-progress', 'pain-progress', 'success-progress'];
        progressBars.forEach(id => {
            const bar = document.getElementById(id);
            if (bar) {
                bar.style.width = '0%';
                bar.textContent = '0%';
            }
        });
    }

    resetCalculator() {
        // Reset patient profile to defaults
        this.currentPatient = {
            weight: 75, height: 175, age: 45, bmi: 24.5,
            creatinine: 'normal', liver: 'normal', smoking: 'never',
            diseaseStage: 'chronic', curvature: 30, hasPlaque: 'no'
        };

        // Reset form inputs
        Object.entries(this.currentPatient).forEach(([field, value]) => {
            const input = document.getElementById(field);
            if (input) {
                input.value = value;
            }
        });

        // Clear component selection
        this.selectedComponents.clear();
        
        // Uncheck all checkboxes
        const allComponents = window.dataLoader.getAllComponentIds();
        allComponents.forEach(componentId => {
            this.updateComponentCheckbox(componentId, false);
        });

        // Reinitialize stage-based components
        this.initializeStageBasedComponents();
        
        // Update displays
        this.updatePatientDisplay();
        this.updateCalculations();
    }

    showError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `<div class="error-message">❌ ${message}</div>`;
            errorContainer.style.display = 'block';
        } else {
            alert(message);
        }
    }
}

// Initialize calculator UI when page loads
window.calculatorUI = new CalculatorUI();
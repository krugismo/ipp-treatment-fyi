// Data Loading and Management System
class DataLoader {
    constructor() {
        this.cache = {
            components: null,
            interactions: null,
            stages: null,
            lastLoaded: null
        };
        this.validator = new ValidationEngine();
    }

    async loadAllData() {
        try {
            console.log('Loading medical data...');
            
            const [componentsResponse, interactionsResponse, stagesResponse] = await Promise.all([
                this.fetchWithRetry('./data/components.json'),
                this.fetchWithRetry('./data/interactions.json'),
                this.fetchWithRetry('./data/stages.json')
            ]);

            this.cache.components = await componentsResponse.json();
            this.cache.interactions = await interactionsResponse.json();
            this.cache.stages = await stagesResponse.json();
            this.cache.lastLoaded = new Date();

            // Validate loaded data
            const validation = await this.validator.validateAllData(
                this.cache.components,
                this.cache.interactions,
                this.cache.stages
            );

            if (!validation.valid) {
                console.error('Data validation errors:', validation.errors);
                throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
            }

            if (validation.warnings.length > 0) {
                console.warn('Data validation warnings:', validation.warnings);
            }

            console.log('Medical data loaded and validated successfully');
            return true;

        } catch (error) {
            console.error('Failed to load medical data:', error);
            throw error;
        }
    }

    async fetchWithRetry(url, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            } catch (error) {
                if (i === retries - 1) throw error;
                console.warn(`Fetch attempt ${i + 1} failed for ${url}, retrying...`);
                await this.delay(delay * Math.pow(2, i)); // Exponential backoff
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getComponentsData() {
        if (!this.cache.components) {
            throw new Error('Components data not loaded. Call loadAllData() first.');
        }
        return this.cache.components;
    }

    getInteractionsData() {
        if (!this.cache.interactions) {
            throw new Error('Interactions data not loaded. Call loadAllData() first.');
        }
        return this.cache.interactions;
    }

    getStagesData() {
        if (!this.cache.stages) {
            throw new Error('Stages data not loaded. Call loadAllData() first.');
        }
        return this.cache.stages;
    }

    getComponent(componentId) {
        const data = this.getComponentsData();
        return data.components[componentId];
    }

    getAllComponentIds() {
        const data = this.getComponentsData();
        return Object.keys(data.components);
    }

    getComponentsByStage(stageId) {
        const stagesData = this.getStagesData();
        const stage = stagesData.stageProtocols[stageId];
        
        if (!stage) {
            throw new Error(`Stage ${stageId} not found`);
        }

        return {
            core: stage.coreComponents,
            optional: stage.optionalComponents,
            contraindicated: stage.contraindicated
        };
    }

    isDataStale(maxAgeMinutes = 60) {
        if (!this.cache.lastLoaded) return true;
        
        const ageMinutes = (Date.now() - this.cache.lastLoaded.getTime()) / (1000 * 60);
        return ageMinutes > maxAgeMinutes;
    }

    async refreshDataIfNeeded(maxAgeMinutes = 60) {
        if (this.isDataStale(maxAgeMinutes)) {
            console.log('Data is stale, refreshing...');
            await this.loadAllData();
        }
    }

    clearCache() {
        this.cache = {
            components: null,
            interactions: null,
            stages: null,
            lastLoaded: null
        };
        console.log('Data cache cleared');
    }

    getLoadedDataSummary() {
        if (!this.cache.lastLoaded) {
            return { loaded: false, message: 'No data loaded' };
        }

        const componentsCount = this.cache.components ? 
            Object.keys(this.cache.components.components).length : 0;
        const interactionsCount = this.cache.interactions ? 
            Object.keys(this.cache.interactions.drugInteractions).length : 0;
        const stagesCount = this.cache.stages ? 
            Object.keys(this.cache.stages.stageProtocols).length : 0;

        return {
            loaded: true,
            lastLoaded: this.cache.lastLoaded,
            summary: {
                components: componentsCount,
                interactions: interactionsCount,
                stages: stagesCount
            }
        };
    }

    // Development and testing utilities
    exportDataForTesting() {
        return {
            components: this.cache.components,
            interactions: this.cache.interactions,
            stages: this.cache.stages,
            timestamp: this.cache.lastLoaded
        };
    }

    async loadTestData(testData) {
        console.log('Loading test data...');
        
        this.cache.components = testData.components;
        this.cache.interactions = testData.interactions;
        this.cache.stages = testData.stages;
        this.cache.lastLoaded = new Date();

        // Validate test data
        const validation = await this.validator.validateAllData(
            this.cache.components,
            this.cache.interactions,
            this.cache.stages
        );

        if (!validation.valid) {
            console.error('Test data validation errors:', validation.errors);
            throw new Error(`Test data validation failed: ${validation.errors.join(', ')}`);
        }

        console.log('Test data loaded successfully');
        return true;
    }

    validateComponentExists(componentId) {
        const data = this.getComponentsData();
        if (!data.components[componentId]) {
            throw new Error(`Component '${componentId}' not found in data`);
        }
        return true;
    }

    validateStageExists(stageId) {
        const data = this.getStagesData();
        if (!data.stageProtocols[stageId]) {
            throw new Error(`Stage '${stageId}' not found in data`);
        }
        return true;
    }

    getDataIntegrityReport() {
        if (!this.cache.lastLoaded) {
            return { error: 'No data loaded' };
        }

        const report = {
            timestamp: new Date(),
            dataAge: Date.now() - this.cache.lastLoaded.getTime(),
            components: {},
            interactions: {},
            stages: {},
            crossReferences: {}
        };

        // Components integrity
        const componentsData = this.getComponentsData();
        report.components = {
            count: Object.keys(componentsData.components).length,
            missingPK: [],
            missingPD: [],
            invalidDoses: []
        };

        Object.entries(componentsData.components).forEach(([id, comp]) => {
            if (!comp.pharmacokinetics) report.components.missingPK.push(id);
            if (!comp.pharmacodynamics) report.components.missingPD.push(id);
            if (!comp.dosePerKg || comp.dosePerKg <= 0) report.components.invalidDoses.push(id);
        });

        // Interactions integrity
        const interactionsData = this.getInteractionsData();
        report.interactions = {
            count: Object.keys(interactionsData.drugInteractions).length,
            missingMechanisms: [],
            unusualFactors: []
        };

        Object.entries(interactionsData.drugInteractions).forEach(([id, interaction]) => {
            if (!interaction.mechanism) report.interactions.missingMechanisms.push(id);
            if (interaction.factor > 5 || interaction.factor < 0.1) {
                report.interactions.unusualFactors.push({ id, factor: interaction.factor });
            }
        });

        // Stages integrity
        const stagesData = this.getStagesData();
        report.stages = {
            count: Object.keys(stagesData.stageProtocols).length,
            missingComponents: [],
            invalidSuccess: []
        };

        Object.entries(stagesData.stageProtocols).forEach(([id, stage]) => {
            if (!stage.coreComponents || stage.coreComponents.length === 0) {
                report.stages.missingComponents.push(id);
            }
            if (stage.successBase < 0 || stage.successBase > 100) {
                report.stages.invalidSuccess.push({ id, success: stage.successBase });
            }
        });

        // Cross-references integrity
        report.crossReferences = {
            orphanedInteractions: [],
            unknownStageComponents: []
        };

        // Check for interactions referencing unknown components
        Object.keys(interactionsData.drugInteractions).forEach(interactionId => {
            const parts = interactionId.split('_');
            parts.forEach(componentId => {
                if (!componentsData.components[componentId]) {
                    report.crossReferences.orphanedInteractions.push({
                        interaction: interactionId,
                        unknownComponent: componentId
                    });
                }
            });
        });

        // Check for stage components not in components data
        Object.entries(stagesData.stageProtocols).forEach(([stageId, stage]) => {
            [...stage.coreComponents, ...stage.optionalComponents].forEach(componentId => {
                if (!componentsData.components[componentId]) {
                    report.crossReferences.unknownStageComponents.push({
                        stage: stageId,
                        unknownComponent: componentId
                    });
                }
            });
        });

        return report;
    }
}

// Global data loader instance
window.dataLoader = new DataLoader();
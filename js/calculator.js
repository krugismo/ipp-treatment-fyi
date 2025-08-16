// Main Calculator Engine
class PeyronieMedicalCalculator {
    constructor() {
        this.componentsData = null;
        this.interactionsData = null;
        this.stagesData = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            await this.loadData();
            this.initialized = true;
            console.log('Calculator initialized successfully');
        } catch (error) {
            console.error('Failed to initialize calculator:', error);
            throw error;
        }
    }

    async loadData() {
        const [componentsResponse, interactionsResponse, stagesResponse] = await Promise.all([
            fetch('./data/components.json'),
            fetch('./data/interactions.json'),
            fetch('./data/stages.json')
        ]);

        this.componentsData = await componentsResponse.json();
        this.interactionsData = await interactionsResponse.json();
        this.stagesData = await stagesResponse.json();
    }

    calculateDosing(patientProfile, selectedComponents) {
        if (!this.initialized) {
            throw new Error('Calculator not initialized');
        }

        const dosing = new DosingEngine(this.componentsData);
        const interactions = new InteractionEngine(this.interactionsData);
        const stages = new StageEngine(this.stagesData);

        // Get stage-specific recommendations
        const stageRecommendations = stages.getRecommendations(patientProfile.stage, patientProfile);
        
        // Calculate individual doses
        const componentDoses = {};
        for (const componentId of selectedComponents) {
            const component = this.componentsData.components[componentId];
            if (!component) continue;

            componentDoses[componentId] = dosing.calculateComponentDose(
                componentId,
                patientProfile
            );
        }

        // Calculate synergy effects
        const synergyEffects = interactions.calculateSynergies(selectedComponents);

        // Calculate overall effectiveness
        let effectiveness = this.calculateOverallEffectiveness(
            selectedComponents,
            componentDoses,
            synergyEffects,
            patientProfile
        );

        // Apply stage-specific modifiers to effectiveness
        effectiveness = stages.calculateStageSpecificEffectiveness(
            patientProfile.stage,
            selectedComponents,
            effectiveness,
            patientProfile
        );

        return {
            componentDoses,
            synergyEffects,
            effectiveness,
            stageRecommendations,
            warnings: this.generateWarnings(patientProfile, selectedComponents)
        };
    }

    calculateOverallEffectiveness(components, doses, synergies, profile) {
        // Diminishing-returns aggregation: 100 * (1 - Π (1 - effect_i * weight_i / 100))
        const aggregateMetric = (metricKey) => {
            let product = 1.0;
            components.forEach(componentId => {
                const component = this.componentsData.components[componentId];
                if (!component) return;
                const pd = component.pharmacodynamics || {};
                const base = Number(pd[metricKey] || 0);
                const weight = Math.max(0, Math.min(2, doses[componentId].adjustedDose / (component.dosePerKg * profile.weight)));
                const contribution = Math.max(0, Math.min(1, (base / 100) * weight));
                product *= (1 - contribution);
            });
            let value = 100 * (1 - product);
            // Overall synergy factor capped and softened
            let overallSynergyFactor = 1.0;
            let high = 0, moderate = 0;
            Object.values(synergies).forEach(s => {
                if (s.significance === 'high') { overallSynergyFactor *= Math.min(s.factor || 1, 1.6); high++; }
                else if (s.significance === 'moderate') { overallSynergyFactor *= Math.min(s.factor || 1, 1.3); moderate++; }
            });
            // Bound the exponents to prevent extreme values
            if (high > 1) overallSynergyFactor *= Math.pow(0.9, Math.min(high - 1, 10));
            if (moderate > 2) overallSynergyFactor *= Math.pow(0.95, Math.min(moderate - 2, 10));
            overallSynergyFactor = Math.max(0.5, Math.min(overallSynergyFactor, 1.8));
            // Ensure value is positive before power operation
            value = Math.max(0, value);
            value = Math.pow(value, 0.9) * (0.85 + 0.15 * Math.max(0, Math.min((overallSynergyFactor - 1) / 0.8, 1)));
            return Math.max(0, Math.min(100, value));
        };

        const tgfReduction = aggregateMetric('tgfReduction');
        const collagenReduction = aggregateMetric('collagenReduction');
        const curvatureReduction = aggregateMetric('curvatureReduction');
        const plaqueReduction = aggregateMetric('plaqueReduction');
        const painRelief = aggregateMetric('painRelief');

        // Conservative response potential (not individual success); bounded
        const stage = this.stagesData?.stageProtocols?.[profile.stage];
        const baseSuccess = stage?.successBase ?? 70;
        const core = stage?.coreComponents || [];
        const covered = components.filter(c => core.includes(c)).length;
        const coverageRatio = core.length ? covered / core.length : 0.5;
        let synergyBoost = 1.0;
        Object.values(synergies).forEach(s => { synergyBoost *= Math.min(s.factor || 1, 1.5); });
        synergyBoost = Math.min(synergyBoost, 1.6);
        let penalty = 0;
        if (profile.age >= 65) penalty += 10;
        if (profile.bmi >= 30) penalty += 5;
        if (profile.smoking) penalty += 5;
        if (profile.creatinineClearance < 30) penalty += 10;
        if (profile.liverFunction && profile.liverFunction !== 'normal') penalty += 10;
        const responsePotential = Math.max(0, Math.min(95, baseSuccess * coverageRatio * (0.9 + 0.1 * (synergyBoost - 1) / 0.6) - penalty));

        return {
            tgfReduction,
            collagenReduction,
            curvatureReduction,
            plaqueReduction,
            painRelief,
            overallSuccessRate: responsePotential
        };
    }

    generateWarnings(profile, components) {
        const warnings = [];

        // Age warnings
        if (profile.age >= 65) {
            warnings.push('Elderly patient: Consider reduced dosing for some components');
        }

        // BMI warnings
        if (profile.bmi >= 30) {
            warnings.push('Obesity may require dose adjustments for fat-soluble compounds');
        }

        // Kidney function warnings
        if (profile.creatinineClearance < 30) {
            warnings.push('Severe kidney impairment: Dose reductions required');
        }

        // Liver function warnings (Child-Pugh B per model)
        if (profile.liverFunction === 'childB') {
            warnings.push('Liver impairment: Significant dose adjustments needed');
        }
        
        // Acute with plaque warning
        if (profile.stage === 'acute' && profile.hasPlaque) {
            warnings.push('Acute phase with established plaque: Full protocol recommended');
        }

        // Component-specific warnings
        if (components.includes('pentoxifylline') && profile.creatinineClearance < 30) {
            warnings.push('Pentoxifylline: 50% dose reduction required for severe kidney impairment');
        }

        if (components.includes('diclofenac') && profile.liverFunction !== 'normal') {
            warnings.push('Diclofenac: Use with caution in liver impairment');
        }

        return warnings;
    }
}

// Initialize global calculator instance
window.calculator = new PeyronieMedicalCalculator();
// Disease Stage Management Engine
class StageEngine {
    constructor(stagesData) {
        this.stagesData = stagesData;
    }

    getRecommendations(stageId, patientProfile = null) {
        const stage = this.stagesData.stageProtocols[stageId];
        if (!stage) {
            throw new Error(`Stage ${stageId} not found`);
        }

        // Adjust duration based on plaque/calcification for acute phase
        let duration = stage.duration;
        let specialConsiderations = [...(stage.specialConsiderations || [])];
        
        if (stageId === 'acute' && patientProfile) {
            if (patientProfile.hasCalcification) {
                duration = "18-36";
            } else if (patientProfile.hasPlaque) {
                duration = "6-24";
            }
            // Default acute phase is already 3-18 months
            
            // Add injectable therapy for acute with plaque
            if (patientProfile.hasPlaque || patientProfile.hasCalcification) {
                specialConsiderations.push("Injectable therapy mandatory: biweekly for 6 months, then monthly for 12 months");
            }
        }

        return {
            stageName: stage.name,
            timeframe: stage.timeframe,
            duration: `${duration} ${stage.durationUnit}`,
            description: stage.description,
            characteristics: stage.characteristics,
            coreComponents: stage.coreComponents,
            optionalComponents: stage.optionalComponents,
            contraindicated: stage.contraindicated,
            specialConsiderations: specialConsiderations,
            expectedSuccessRate: stage.successBase,
            verification: stage.verification
        };
    }

    getComponentsForStage(stageId, allComponents) {
        const stage = this.stagesData.stageProtocols[stageId];
        if (!stage) {
            return {
                core: [],
                optional: [],
                excluded: []
            };
        }

        const recommendedComponents = {
            core: [],
            optional: [],
            excluded: []
        };

        allComponents.forEach(componentId => {
            if (stage.coreComponents.includes(componentId)) {
                recommendedComponents.core.push(componentId);
            } else if (stage.optionalComponents.includes(componentId)) {
                recommendedComponents.optional.push(componentId);
            } else if (stage.contraindicated.includes(componentId)) {
                recommendedComponents.excluded.push(componentId);
            }
        });

        return recommendedComponents;
    }

    calculateStageSpecificEffectiveness(stageId, selectedComponents, componentEffectiveness, patientProfile = null) {
        const stage = this.stagesData.stageProtocols[stageId];
        if (!stage) return componentEffectiveness;

        let adjustedEffectiveness = { ...componentEffectiveness };
        let stageMultiplier = this._getStageMultiplier(stageId, selectedComponents, stage, patientProfile, adjustedEffectiveness);
        
        stageMultiplier = this._applyPatientProfileAdjustments(patientProfile, selectedComponents, adjustedEffectiveness, stageMultiplier);
        
        return this._applyMultiplierToEffectiveness(adjustedEffectiveness, stageMultiplier);
    }

    _getStageMultiplier(stageId, selectedComponents, stage, patientProfile, adjustedEffectiveness) {
        if (stageId === 'acute') {
            return this._calculateAcuteStageMultiplier(selectedComponents, patientProfile, adjustedEffectiveness);
        }
        if (stageId === 'chronic') {
            return this._calculateChronicStageMultiplier(selectedComponents, stage);
        }
        return 1.0;
    }

    _calculateAcuteStageMultiplier(selectedComponents, patientProfile, adjustedEffectiveness) {
        let multiplier = 1.0;
        
        // Acute phase responds better to antioxidants
        if (selectedComponents.includes('vitamin-c') || selectedComponents.includes('vitamin-e')) {
            multiplier *= 1.25;
        }
        
        // Less effective for established fibrosis markers
        adjustedEffectiveness.collagenReduction *= 0.8;
        adjustedEffectiveness.plaqueReduction *= 0.7;
        
        // Special case: acute with established plaque needs full protocol
        if (patientProfile && (patientProfile.hasPlaque || patientProfile.hasCalcification)) {
            multiplier *= 1.3;
            adjustedEffectiveness.plaqueReduction *= 1.2;
        }
        
        return multiplier;
    }

    _calculateChronicStageMultiplier(selectedComponents, stage) {
        const coreComponentsPresent = stage.coreComponents.filter(comp => 
            selectedComponents.includes(comp)
        ).length;
        const coreComponentsTotal = stage.coreComponents.length;
        
        return coreComponentsPresent >= coreComponentsTotal * 0.8 ? 1.15 : 0.9;
    }

    _applyPatientProfileAdjustments(patientProfile, selectedComponents, adjustedEffectiveness, stageMultiplier) {
        if (!patientProfile) return stageMultiplier;
        
        let multiplier = stageMultiplier;
        
        // Calcified plaque responds exceptionally well to pentoxifylline
        if (patientProfile.hasCalcification && selectedComponents.includes('pentoxifylline')) {
            adjustedEffectiveness.plaqueReduction *= 1.5;
            adjustedEffectiveness.curvatureReduction *= 1.3;
            multiplier *= 1.2;
        }
        
        // Severe curvature (>60°) requires full protocol
        if (patientProfile.curvature && patientProfile.curvature > 60) {
            multiplier *= selectedComponents.length >= 10 ? 1.1 : 0.85;
            adjustedEffectiveness.painRelief *= 1.2;
        }
        
        return multiplier;
    }

    _applyMultiplierToEffectiveness(adjustedEffectiveness, stageMultiplier) {
        Object.keys(adjustedEffectiveness).forEach(key => {
            if (typeof adjustedEffectiveness[key] === 'number') {
                adjustedEffectiveness[key] *= stageMultiplier;
                adjustedEffectiveness[key] = Math.min(adjustedEffectiveness[key], 100);
            }
        });
        
        return adjustedEffectiveness;
    }

    getMonitoringSchedule(stageId) {
        const schedule = this.stagesData.monitoringSchedule;
        const stage = this.stagesData.stageProtocols[stageId];
        
        if (!stage) return schedule;

        // Customize monitoring based on stage
        const customSchedule = { ...schedule };

        if (stageId === 'acute') {
            // More frequent early monitoring for acute phase
            customSchedule.week2 = {
                timepoint: 'Week 2',
                clinical: ['Early response assessment'],
                laboratory: [],
                imaging: [],
                biomarkers: []
            };
        }

        return customSchedule;
    }

    validateStageSelection(patientProfile) {
        const validations = [];

        // Check if stage matches patient characteristics
        if (patientProfile.stage === 'acute' && patientProfile.symptomDuration > 12) {
            validations.push({
                type: 'warning',
                message: 'Patient has symptoms >12 months but acute stage selected',
                recommendation: 'Consider chronic stage classification'
            });
        }


        return validations;
    }

    generateStageReport(stageId, patientProfile, selectedComponents) {
        const recommendations = this.getRecommendations(stageId);
        const componentRecommendations = this.getComponentsForStage(stageId, selectedComponents);
        const monitoringSchedule = this.getMonitoringSchedule(stageId);
        const validations = this.validateStageSelection(patientProfile);

        return {
            stage: recommendations,
            components: componentRecommendations,
            monitoring: monitoringSchedule,
            validations: validations,
            adherenceFactors: this.calculateAdherenceFactors(stageId, selectedComponents),
            progressPredictions: this.predictProgress(stageId, selectedComponents, patientProfile)
        };
    }

    calculateAdherenceFactors(stageId, selectedComponents) {
        const stage = this.stagesData.stageProtocols[stageId];
        
        // Calculate complexity score
        const complexityScore = selectedComponents.length * 0.1;
        const durationMonths = parseInt(stage.duration);
        const durationPenalty = durationMonths > 12 ? 0.1 : 0;
        
        const baseAdherence = 0.85; // 85% baseline adherence
        const adjustedAdherence = baseAdherence - complexityScore - durationPenalty;
        
        return {
            expectedAdherence: Math.max(adjustedAdherence, 0.5),
            complexityFactor: complexityScore,
            durationChallenge: durationPenalty,
            recommendations: this.getAdherenceRecommendations(adjustedAdherence)
        };
    }

    getAdherenceRecommendations(adherence) {
        const recommendations = [];
        
        if (adherence < 0.7) {
            recommendations.push('Consider simplifying regimen to improve adherence');
            recommendations.push('Implement dosing reminders and pill organizers');
            recommendations.push('Schedule more frequent follow-up appointments');
        }
        
        if (adherence < 0.6) {
            recommendations.push('Consider reducing to core components only initially');
            recommendations.push('Evaluate patient motivation and support systems');
        }
        
        return recommendations;
    }

    predictProgress(stageId, selectedComponents, patientProfile) {
        const stage = this.stagesData.stageProtocols[stageId];
        const baseSuccessRate = stage.successBase;
        
        // Adjust based on component coverage
        const coreComponentsCovered = stage.coreComponents.filter(comp => 
            selectedComponents.includes(comp)
        ).length;
        const coverageRatio = coreComponentsCovered / stage.coreComponents.length;
        
        const adjustedSuccessRate = baseSuccessRate * coverageRatio;
        
        // Timeline predictions
        const durationMonths = parseInt(stage.duration);
        const milestones = {
            month1: Math.round(adjustedSuccessRate * 0.1),
            month3: Math.round(adjustedSuccessRate * 0.3),
            month6: Math.round(adjustedSuccessRate * 0.6),
            monthFinal: Math.round(adjustedSuccessRate)
        };
        
        return {
            expectedSuccessRate: adjustedSuccessRate,
            treatmentDuration: `${durationMonths} months`,
            milestones: milestones,
            riskFactors: this.identifyRiskFactors(patientProfile),
            optimizationSuggestions: this.getOptimizationSuggestions(stageId, selectedComponents, patientProfile)
        };
    }

    identifyRiskFactors(patientProfile) {
        const riskFactors = [];
        
        if (patientProfile.age >= 65) riskFactors.push('Advanced age');
        if (patientProfile.smoking) riskFactors.push('Smoking');
        if (patientProfile.bmi >= 30) riskFactors.push('Obesity');
        if (patientProfile.diabetes) riskFactors.push('Diabetes');
        if (patientProfile.creatinineClearance < 60) riskFactors.push('Kidney impairment');
        
        return riskFactors;
    }

    getOptimizationSuggestions(stageId, selectedComponents, patientProfile = null) {
        const stage = this.stagesData.stageProtocols[stageId];
        const suggestions = [];
        
        // Check for missing core components
        const missingCore = stage.coreComponents.filter(comp => 
            !selectedComponents.includes(comp)
        );
        
        if (missingCore.length > 0) {
            suggestions.push(`Consider adding missing core components: ${missingCore.join(', ')}`);
        }
        
        // Patient-specific suggestions based on profile
        if (patientProfile) {
            if (patientProfile.hasCalcification && !selectedComponents.includes('pentoxifylline')) {
                suggestions.push('Pentoxifylline is priority component for calcified plaques');
            }
            
            if (patientProfile.curvature > 60 && selectedComponents.length < 10) {
                suggestions.push('Consider full 12-component protocol for severe curvature (>60°)');
            }
        }
        
        return suggestions;
    }
}
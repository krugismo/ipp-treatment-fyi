// Drug Interaction Calculation Engine
class InteractionEngine {
    constructor(interactionsData) {
        this.interactionsData = interactionsData;
    }

    calculateSynergies(selectedComponents) {
        const synergies = {};
        const interactions = this.interactionsData.drugInteractions;

        // Check all possible pair combinations
        for (let i = 0; i < selectedComponents.length; i++) {
            for (let j = i + 1; j < selectedComponents.length; j++) {
                const comp1 = selectedComponents[i];
                const comp2 = selectedComponents[j];
                
                // Check both directions for interaction
                const interactionKey1 = `${comp1}_${comp2}`;
                const interactionKey2 = `${comp2}_${comp1}`;
                
                const interaction = interactions[interactionKey1] || interactions[interactionKey2];
                
                if (interaction) {
                    synergies[`${comp1}-${comp2}`] = this.processInteraction(interaction);
                }
            }
        }

        return synergies;
    }

    processInteraction(interaction) {
        const processed = {
            type: interaction.type,
            factor: interaction.factor,
            mechanism: interaction.mechanism,
            significance: interaction.significance,
            verification: interaction.verification
        };

        // Calculate Combination Index (CI) if available
        if (interaction.ci) {
            processed.combinationIndex = interaction.ci;
            processed.interpretation = this.interpretCombinationIndex(interaction.ci);
        }

        // Calculate regeneration rate if applicable
        if (interaction.type === 'regeneration' && interaction.rate) {
            processed.regenerationRate = interaction.rate;
            processed.regenerationFactor = this.calculateRegenerationFactor(interaction.rate);
        }

        return processed;
    }

    interpretCombinationIndex(ci) {
        const interpretation = this.interactionsData.synergyCalculation.interpretation;
        
        if (ci < 0.1) return interpretation["CI < 0.1"];
        if (ci <= 0.3) return interpretation["0.1-0.3"];
        if (ci <= 0.7) return interpretation["0.3-0.7"];
        if (ci <= 0.85) return interpretation["0.7-0.85"];
        if (ci <= 0.90) return interpretation["0.85-0.90"];
        if (ci <= 1.10) return interpretation["0.90-1.10"];
        if (ci <= 1.20) return interpretation["1.10-1.20"];
        if (ci <= 1.45) return interpretation["1.20-1.45"];
        if (ci <= 3.3) return interpretation["1.45-3.3"];
        return interpretation["> 3.3"];
    }

    calculateRegenerationFactor(regenerationRate) {
        // Convert regeneration rate to effectiveness multiplier
        // Higher rates = better regeneration = higher factor
        if (regenerationRate > 100000) return 2.5;
        if (regenerationRate > 10000) return 2.0;
        if (regenerationRate > 1000) return 1.5;
        if (regenerationRate > 100) return 1.2;
        return 1.1;
    }

    calculateOverallSynergyFactor(synergies) {
        let overallFactor = 1.0;
        let highSignificanceCount = 0;
        let moderateSignificanceCount = 0;

        Object.values(synergies).forEach(synergy => {
            if (synergy.significance === 'high') {
                overallFactor *= Math.min(synergy.factor, 2.0);
                highSignificanceCount++;
            } else if (synergy.significance === 'moderate') {
                overallFactor *= Math.min(synergy.factor, 1.5);
                moderateSignificanceCount++;
            }
        });

        // Apply diminishing returns for multiple interactions
        if (highSignificanceCount > 1) {
            overallFactor *= (0.9 ** (highSignificanceCount - 1));
        }
        if (moderateSignificanceCount > 2) {
            overallFactor *= (0.95 ** (moderateSignificanceCount - 2));
        }

        return Math.min(overallFactor, 3.0); // Cap at 3x maximum benefit
    }

    checkContraindications(selectedComponents, patientProfile) {
        const contraindications = [];

        // Age-related contraindications
        if (patientProfile.age >= 75) {
            if (selectedComponents.includes('pentoxifylline')) {
                contraindications.push({
                    type: 'age',
                    component: 'pentoxifylline',
                    severity: 'caution',
                    message: 'Increased bleeding risk in elderly patients'
                });
            }
        }

        // Kidney function contraindications
        if (patientProfile.creatinineClearance < 15) {
            if (selectedComponents.includes('pentoxifylline')) {
                contraindications.push({
                    type: 'renal',
                    component: 'pentoxifylline',
                    severity: 'contraindicated',
                    message: 'Contraindicated in severe renal impairment'
                });
            }
        }

        // Liver function contraindications (no Child-Pugh C in model) — none here

        return contraindications;
    }

    calculateChouTalalayIndex(component1Dose, component2Dose, component1IC50, component2IC50) {
        // Chou-Talalay method for drug combination analysis
        // CI = (D1/Dx1) + (D2/Dx2) + α(D1·D2)/(Dx1·Dx2)
        
        const d1_over_dx1 = component1Dose / component1IC50;
        const d2_over_dx2 = component2Dose / component2IC50;
        const alpha = 0.5; // Interaction parameter
        
        const ci = d1_over_dx1 + d2_over_dx2 + (alpha * d1_over_dx1 * d2_over_dx2);
        
        let synergyStrength;
        if (ci < 0.7) {
            synergyStrength = 'synergistic';
        } else if (ci > 1.1) {
            synergyStrength = 'antagonistic';
        } else {
            synergyStrength = 'additive';
        }
        
        return {
            combinationIndex: ci,
            interpretation: this.interpretCombinationIndex(ci),
            synergyStrength: synergyStrength
        };
    }

    generateInteractionReport(selectedComponents) {
        const synergies = this.calculateSynergies(selectedComponents);
        const overallFactor = this.calculateOverallSynergyFactor(synergies);
        
        const report = {
            totalInteractions: Object.keys(synergies).length,
            overallSynergyFactor: Math.round(overallFactor * 100) / 100,
            significantInteractions: Object.entries(synergies)
                .filter(([key, synergy]) => synergy.significance === 'high')
                .length,
            interactions: synergies,
            recommendations: this.generateInteractionRecommendations(synergies)
        };

        return report;
    }

    generateInteractionRecommendations(synergies) {
        const recommendations = [];

        Object.entries(synergies).forEach(([pair, synergy]) => {
            if (synergy.significance === 'high' && synergy.factor > 2) {
                recommendations.push({
                    type: 'optimization',
                    message: `Strong synergy between ${pair.replace('-', ' and ')}: ${synergy.mechanism}`,
                    action: 'Consider prioritizing this combination for maximum benefit'
                });
            }
            
            if (synergy.combinationIndex && synergy.combinationIndex < 0.3) {
                recommendations.push({
                    type: 'synergy',
                    message: `Very strong synergistic interaction: ${pair.replace('-', ' and ')}`,
                    action: 'Excellent combination - maintain both components'
                });
            }
        });

        return recommendations;
    }
}
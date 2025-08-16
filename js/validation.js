// Data Loading and Validation System
class ValidationEngine {
    constructor() {
        this.validationRules = {
            patientProfile: {
                weight: { min: 40, max: 200, required: true },
                height: { min: 140, max: 220, required: true },
                age: { min: 18, max: 100, required: true },
                bmi: { min: 15, max: 50, required: true },
                creatinineClearance: { min: 5, max: 200, required: false },
                stage: { enum: ['acute', 'chronic', 'calcified', 'severe'], required: true }
            },
            components: {
                dosePerKg: { min: 0.1, max: 100, required: true },
                frequency: { enum: ['QD', 'BID', 'TID', 'QID'], required: true },
                pharmacokinetics: {
                    ka: { min: 0.01, max: 10, required: true },
                    tmax: { min: 0.1, max: 24, required: true },
                    f: { min: 0.1, max: 100, required: true },
                    vd: { min: 0.01, max: 50, required: true },
                    halfLife: { min: 0.1, max: 200, required: true },
                    kp: { min: 0.01, max: 50, required: true }
                }
            }
        };
    }

    validatePatientProfile(profile) {
        const errors = [];
        const warnings = [];

        // Check required fields
        Object.entries(this.validationRules.patientProfile).forEach(([field, rules]) => {
            if (rules.required && (profile[field] === undefined || profile[field] === null)) {
                errors.push(`${field} is required`);
                return;
            }

            const value = profile[field];
            if (value === undefined || value === null) return;

            // Range validation
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`${field} must be no more than ${rules.max}`);
            }

            // Enum validation
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
            }
        });

        // Cross-field validations
        if (profile.weight && profile.height) {
            const calculatedBMI = profile.weight / Math.pow(profile.height / 100, 2);
            if (profile.bmi && Math.abs(profile.bmi - calculatedBMI) > 1) {
                warnings.push('BMI does not match calculated value from weight and height');
            }
        }

        // Clinical warnings
        if (profile.age >= 75) {
            warnings.push('Elderly patient: Consider dose adjustments and increased monitoring');
        }

        if (profile.bmi >= 35) {
            warnings.push('Severe obesity: Significant pharmacokinetic changes expected');
        }

        if (profile.creatinineClearance && profile.creatinineClearance < 30) {
            warnings.push('Severe renal impairment: Major dose adjustments required');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    validateComponentData(componentsData) {
        const errors = [];
        const warnings = [];

        if (!componentsData.components || typeof componentsData.components !== 'object') {
            errors.push('Components data must contain a components object');
            return { valid: false, errors, warnings };
        }

        Object.entries(componentsData.components).forEach(([componentId, component]) => {
            // Validate component structure
            if (!component.name) {
                errors.push(`Component ${componentId}: name is required`);
            }

            if (!component.dosePerKg || component.dosePerKg <= 0) {
                errors.push(`Component ${componentId}: valid dosePerKg is required`);
            }

            if (!component.frequency || !['QD', 'BID', 'TID', 'QID'].includes(component.frequency)) {
                errors.push(`Component ${componentId}: valid frequency is required`);
            }

            // Validate pharmacokinetics
            if (!component.pharmacokinetics) {
                errors.push(`Component ${componentId}: pharmacokinetics data is required`);
            } else {
                const pk = component.pharmacokinetics;
                const pkRules = this.validationRules.components.pharmacokinetics;
                
                Object.entries(pkRules).forEach(([param, rules]) => {
                    const value = pk[param];

                    // Allow special-case non-oral/topical exceptions: e.g., ka may be 'N/A' for topical formulations
                    const isTopical = component.route === 'topical';
                    if (isTopical && param === 'ka' && (value === 'N/A' || value === null || value === undefined)) {
                        return; // skip ka numeric validation for topical
                    }

                    if (rules.required && (value === undefined || value === null)) {
                        errors.push(`Component ${componentId}: ${param} is required`);
                        return;
                    }

                    if (typeof value === 'string') {
                        // Non-numeric provided where numeric expected (except allowed cases handled above)
                        errors.push(`Component ${componentId}: ${param} must be numeric`);
                        return;
                    }

                    if (value !== undefined && value !== null) {
                        if (rules.min !== undefined && value < rules.min) {
                            errors.push(`Component ${componentId}: ${param} must be at least ${rules.min}`);
                        }
                        if (rules.max !== undefined && value > rules.max) {
                            errors.push(`Component ${componentId}: ${param} must be no more than ${rules.max}`);
                        }
                    }
                });
            }

            // Validate pharmacodynamics
            if (!component.pharmacodynamics) {
                warnings.push(`Component ${componentId}: pharmacodynamics data missing`);
            } else {
                const pd = component.pharmacodynamics;
                ['tgfReduction', 'collagenReduction', 'curvatureReduction', 'plaqueReduction', 'painRelief', 'successRate'].forEach(metric => {
                    if (pd[metric] === undefined || pd[metric] < 0 || pd[metric] > 100) {
                        warnings.push(`Component ${componentId}: ${metric} should be between 0-100`);
                    }
                });
            }

            // Validate adjustments
            if (component.adjustments) {
                Object.entries(component.adjustments).forEach(([adjustment, factor]) => {
                    if (factor <= 0 || factor > 3) {
                        warnings.push(`Component ${componentId}: adjustment factor ${adjustment} (${factor}) seems unusual`);
                    }
                });
            }

            // Validate stages
            if (!component.stages) {
                warnings.push(`Component ${componentId}: stage information missing`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    validateInteractionData(interactionsData) {
        const errors = [];
        const warnings = [];

        if (!interactionsData.drugInteractions) {
            errors.push('Interactions data must contain drugInteractions object');
            return { valid: false, errors, warnings };
        }

        Object.entries(interactionsData.drugInteractions).forEach(([interactionId, interaction]) => {
            if (!interaction.type) {
                errors.push(`Interaction ${interactionId}: type is required`);
            }

            if (!interaction.factor || interaction.factor <= 0) {
                errors.push(`Interaction ${interactionId}: positive factor is required`);
            }

            if (!interaction.mechanism) {
                warnings.push(`Interaction ${interactionId}: mechanism description missing`);
            }

            if (!interaction.significance || !['low', 'moderate', 'high'].includes(interaction.significance)) {
                warnings.push(`Interaction ${interactionId}: significance should be low/moderate/high`);
            }

            // Validate Combination Index if present
            if (interaction.ci !== undefined) {
                if (interaction.ci <= 0 || interaction.ci > 10) {
                    warnings.push(`Interaction ${interactionId}: unusual combination index value (${interaction.ci})`);
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    validateStageData(stagesData) {
        const errors = [];
        const warnings = [];

        if (!stagesData.stageProtocols) {
            errors.push('Stages data must contain stageProtocols object');
            return { valid: false, errors, warnings };
        }

        const requiredStages = ['acute', 'chronic', 'calcified', 'severe'];
        requiredStages.forEach(stage => {
            if (!stagesData.stageProtocols[stage]) {
                errors.push(`Required stage '${stage}' is missing`);
            }
        });

        Object.entries(stagesData.stageProtocols).forEach(([stageId, stage]) => {
            if (!stage.name) {
                errors.push(`Stage ${stageId}: name is required`);
            }

            if (!stage.duration || !stage.durationUnit) {
                errors.push(`Stage ${stageId}: duration and durationUnit are required`);
            }

            if (stage.successBase === undefined || stage.successBase < 0 || stage.successBase > 100) {
                errors.push(`Stage ${stageId}: successBase must be between 0-100`);
            }

            if (!Array.isArray(stage.coreComponents)) {
                errors.push(`Stage ${stageId}: coreComponents must be an array`);
            }

            if (!Array.isArray(stage.optionalComponents)) {
                errors.push(`Stage ${stageId}: optionalComponents must be an array`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    async validateAllData(componentsData, interactionsData, stagesData) {
        const validations = {
            components: this.validateComponentData(componentsData),
            interactions: this.validateInteractionData(interactionsData),
            stages: this.validateStageData(stagesData)
        };

        const allErrors = [
            ...validations.components.errors,
            ...validations.interactions.errors,
            ...validations.stages.errors
        ];

        const allWarnings = [
            ...validations.components.warnings,
            ...validations.interactions.warnings,
            ...validations.stages.warnings
        ];

        return {
            valid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings,
            detailed: validations
        };
    }

    sanitizePatientProfile(profile) {
        const sanitized = { ...profile };

        // Ensure numeric fields are numbers
        ['weight', 'height', 'age', 'bmi', 'creatinineClearance'].forEach(field => {
            if (sanitized[field] !== undefined) {
                sanitized[field] = parseFloat(sanitized[field]);
            }
        });

        // Ensure boolean fields are booleans
        ['smoking', 'diabetes'].forEach(field => {
            if (sanitized[field] !== undefined) {
                sanitized[field] = Boolean(sanitized[field]);
            }
        });

        // Calculate BMI if missing
        if (!sanitized.bmi && sanitized.weight && sanitized.height) {
            sanitized.bmi = sanitized.weight / Math.pow(sanitized.height / 100, 2);
        }

        // Set default creatinine clearance if missing (normal adult)
        if (!sanitized.creatinineClearance && sanitized.age) {
            // Cockcroft-Gault estimation for average adult
            const estimatedCrCl = ((140 - sanitized.age) * sanitized.weight) / (72 * 1.0); // Assuming normal Cr = 1.0
            sanitized.creatinineClearance = Math.round(estimatedCrCl);
        }

        return sanitized;
    }
}
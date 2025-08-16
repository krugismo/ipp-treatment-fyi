// Dosing Calculation Engine
class DosingEngine {
    constructor(componentsData) {
        this.componentsData = componentsData;
        this.referencePatient = componentsData.referencePatient;
    }

    calculateComponentDose(componentId, patientProfile) {
        const component = this.componentsData.components[componentId];
        if (!component) {
            throw new Error(`Component ${componentId} not found`);
        }

        // Base dose calculation (weight-based)
        const baseDose = component.dosePerKg * patientProfile.weight;

        // Apply patient-specific adjustments
        let adjustmentFactor = 1.0;
        const adjustments = component.adjustments;

        // Age adjustment
        if (patientProfile.age >= 65 && adjustments.age65) {
            adjustmentFactor *= adjustments.age65;
        }

        // BMI adjustment
        if (patientProfile.bmi >= 30 && adjustments.bmi30) {
            adjustmentFactor *= adjustments.bmi30;
        }

        // Smoking adjustment (patientProfile.smoking is boolean)
        if (patientProfile.smoking === true && adjustments.smoking) {
            adjustmentFactor *= adjustments.smoking;
        }

        // Creatinine clearance adjustment per model (CrCl 30-50 window)
        if (typeof patientProfile.creatinineClearance === 'number' && patientProfile.creatinineClearance <= 50 && adjustments.crCl30) {
            adjustmentFactor *= adjustments.crCl30;
        }

        // Liver function adjustment (Child-Pugh B per model)
        if (patientProfile.liverFunction === 'childB' && adjustments.childB) {
            adjustmentFactor *= adjustments.childB;
        }

        const adjustedDose = baseDose * adjustmentFactor;

        // Calculate bioavailability-adjusted effective dose
        const effectiveDose = adjustedDose * (component.pharmacokinetics.f / 100);

        // Calculate tissue distribution
        const tissueDose = this.calculateTissueDistribution(
            effectiveDose,
            component.pharmacokinetics,
            patientProfile
        );

        return {
            baseDose: Math.round(baseDose),
            adjustmentFactor: Math.round(adjustmentFactor * 100) / 100,
            adjustedDose: Math.round(adjustedDose),
            effectiveDose: Math.round(effectiveDose * 100) / 100,
            tissueDose: Math.round(tissueDose * 100) / 100,
            frequency: component.frequency,
            timing: component.timing,
            unit: component.unit,
            route: component.route
        };
    }

    calculateTissueDistribution(effectiveDose, pharmacokinetics, patientProfile) {
        // Simplified tissue distribution model for corpus cavernosum
        const volumeOfDistribution = pharmacokinetics.vd * patientProfile.weight;
        const plasmaConcentration = effectiveDose / volumeOfDistribution;
        
        // Tissue partition coefficient for corpus cavernosum
        const tissueConcentration = plasmaConcentration * pharmacokinetics.kp;
        
        return tissueConcentration;
    }

    getDailyDose(componentId, patientProfile) {
        const doseInfo = this.calculateComponentDose(componentId, patientProfile);
        
        // Convert frequency to daily multiplier
        const frequencyMultipliers = {
            'QD': 1,     // Once daily
            'BID': 2,    // Twice daily
            'TID': 3,    // Three times daily
            'QID': 4     // Four times daily
        };

        const dailyMultiplier = frequencyMultipliers[doseInfo.frequency] || 1;
        return doseInfo.adjustedDose * dailyMultiplier;
    }

    validateDoseRange(componentId, calculatedDose) {
        const component = this.componentsData.components[componentId];
        if (!component) return { valid: false, error: 'Component not found' };

        // Prefer data-defined safe range when available
        const range = component.safeRange || null;
        const defaultRanges = {
            'l-carnitine': { min: 500, max: 3000 },
            'coq10': { min: 100, max: 200 },
            'propolis': { min: 600, max: 700 },
            'ginkgo': { min: 240, max: 320 },
            'bilberry': { min: 160, max: 320 },
            'silymarin': { min: 400, max: 400 },
            'vitamin-e': { min: 600, max: 800 },
            'vitamin-c': { min: 750, max: 1500 },
            'sod': { min: 140, max: 140 },
            'boswellia': { min: 200, max: 300 },
            'pentoxifylline': { min: 400, max: 800 },
            'diclofenac': { min: 3000, max: 3000 }
        };
        const effectiveRange = range || defaultRanges[componentId];
        if (!effectiveRange) return { valid: true, warning: 'No established range' };

        if (calculatedDose < effectiveRange.min) {
            return { 
                valid: false, 
                error: `Dose ${calculatedDose}mg below minimum safe range (${effectiveRange.min}mg)` 
            };
        }

        if (calculatedDose > effectiveRange.max) {
            return { 
                valid: false, 
                error: `Dose ${calculatedDose}mg exceeds maximum safe range (${effectiveRange.max}mg)` 
            };
        }

        return { valid: true };
    }

    generateDosingSchedule(componentDoses, patientProfile) {
        const schedule = this.initializeSchedule();
        const fatSolubleComponents = new Set(['coq10', 'vitamin-e', 'boswellia', 'silymarin']);
        
        // First pass: distribute components to their preferred time slots
        this.distributeComponentsToSlots(componentDoses, schedule);
        
        // Second pass: optimize fat-soluble components placement
        this.optimizeFatSolubleComponents(schedule, fatSolubleComponents);
        
        // Third pass: co-locate synergistic pairs
        this.coLocateSynergyPairs(schedule);
        
        return schedule;
    }
    
    initializeSchedule() {
        return {
            morning: [], noon: [], evening: [], 
            dinner: [], breakfast: [], bedtime: [], topical: []
        };
    }
    
    distributeComponentsToSlots(componentDoses, schedule) {
        Object.entries(componentDoses).forEach(([componentId, doseInfo]) => {
            const component = this.componentsData.components[componentId];
            const times = Array.isArray(component.timing) ? component.timing : [];
            
            times.forEach(time => {
                if (schedule[time]) {
                    schedule[time].push({
                        id: componentId,
                        name: component.name,
                        dose: doseInfo.adjustedDose,
                        unit: doseInfo.unit,
                        route: doseInfo.route,
                        frequency: doseInfo.frequency
                    });
                }
            });
        });
    }
    
    optimizeFatSolubleComponents(schedule, fatSolubleComponents) {
        const slotMappings = { morning: 'breakfast', evening: 'dinner' };
        
        Object.entries(slotMappings).forEach(([fromSlot, toSlot]) => {
            const itemsToMove = schedule[fromSlot].filter(item => {
                if (!fatSolubleComponents.has(item.id)) return false;
                const component = this.componentsData.components[item.id];
                return component.timing?.includes(toSlot);
            });
            
            if (itemsToMove.length > 0) {
                const moveIds = new Set(itemsToMove.map(i => i.id));
                schedule[fromSlot] = schedule[fromSlot].filter(item => !moveIds.has(item.id));
                schedule[toSlot].push(...itemsToMove);
            }
        });
    }
    
    coLocateSynergyPairs(schedule) {
        const synergyPairs = [
            ['vitamin-c', 'vitamin-e'], ['vitamin-c', 'coq10'],
            ['propolis', 'bilberry'], ['pentoxifylline', 'vitamin-e']
        ];
        
        // Build location map
        const locationMap = new Map();
        Object.keys(schedule).forEach(slot => {
            schedule[slot].forEach(item => locationMap.set(item.id, slot));
        });
        
        // Process each synergy pair
        synergyPairs.forEach(([compA, compB]) => {
            this.attemptSynergyMove(compA, compB, schedule, locationMap);
        });
    }
    
    attemptSynergyMove(compA, compB, schedule, locationMap) {
        if (!locationMap.has(compA) || !locationMap.has(compB)) return;
        
        const slotA = locationMap.get(compA);
        const slotB = locationMap.get(compB);
        
        if (slotA === slotB) return;
        
        // Determine move direction based on slot population
        const targetSlot = schedule[slotA].length >= schedule[slotB].length ? slotA : slotB;
        const sourceSlot = targetSlot === slotA ? slotB : slotA;
        const componentToMove = targetSlot === slotA ? compB : compA;
        
        // Check if move is allowed by timing constraints
        const component = this.componentsData.components[componentToMove];
        if (!component.timing?.includes(targetSlot)) return;
        
        // Perform the move
        const index = schedule[sourceSlot].findIndex(x => x.id === componentToMove);
        if (index >= 0) {
            const [item] = schedule[sourceSlot].splice(index, 1);
            schedule[targetSlot].push(item);
            locationMap.set(item.id, targetSlot);
        }
    }
}
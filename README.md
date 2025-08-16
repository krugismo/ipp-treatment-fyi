# IPP Treatment Calculator - Multimodal Antioxidant Therapy Protocol

## Overview

An evidence-based, open-source treatment calculator and educational resource for Peyronie's Disease (Induratio Penis Plastica) multimodal antioxidant therapy. This project compiles extensive research on therapeutic compounds, their synergistic interactions, and personalized dosing protocols based on patient factors and disease stage.

**Live Site:** [https://ipp-treatment.fyi](https://ipp-treatment.fyi)

## Purpose

This project aims to:
- Provide an educational resource for patients and healthcare providers
- Calculate personalized therapeutic dosing based on individual patient factors
- Demonstrate synergistic interactions between treatment components
- Compile and organize scientific literature in an accessible format
- Foster open collaboration in non-surgical treatment approaches

## Features

- **Interactive Pathway Visualization**: Visual representation of oxidative stress cascades and therapeutic interventions
- **Personalized Calculator**: Dosing recommendations based on weight, age, kidney/liver function, and disease stage
- **21 Therapeutic Components**: Comprehensive database of compounds with pharmacokinetic/pharmacodynamic properties
- **Synergy Analysis**: Documented interactions between treatment components
- **Literature References**: Extensive citation database supporting all therapeutic claims
- **Stage-Specific Protocols**: Tailored approaches for acute, chronic, calcified, and severe presentations

## Data Structure

```
/data
  ├── components.json      # Therapeutic compounds database
  ├── interactions.json    # Synergistic interactions matrix
  ├── stages.json         # Stage-specific protocols
  └── citations.json      # Scientific literature references

/js
  ├── calculator.js       # Main calculation engine
  ├── dosing.js          # Dosing algorithms
  ├── interactions.js     # Synergy calculations
  └── validation.js       # Input validation
```

## Contributing

Contributions are welcome! Priority areas for development:

### Research Extensions
- Genetic variant integration (SOD2, GSTM1/GSTT1, GPX1, etc.)
- Environmental factor quantification
- Metabolic biomarker correlations
- Circadian rhythm optimization

### Technical Features
- Progress tracking methodology
- Export functionality for treatment protocols
- Anonymized outcome data collection framework
- LLM-ready literature compilation for chatbot integration

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Ensure all additions are supported by peer-reviewed literature
4. Submit a pull request with citation references

## Medical Disclaimer

**IMPORTANT:** This information is for educational purposes only and does not constitute medical advice. Always consult qualified healthcare professionals before making treatment decisions. Individual results may vary significantly based on numerous factors.

## Acknowledgments

This compilation would not be possible without the dedicated work of countless researchers, clinicians, and practitioners who have contributed to our understanding of Peyronie's Disease and oxidative stress pathology. Special recognition to those pioneering multimodal therapeutic approaches and publishing case studies that challenge conventional treatment paradigms.

## License

MIT License

Copyright (c) 2024 IPP Treatment Calculator Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contact

For corrections, errors, or suggestions: ipp-report@proton.me

## Citation

If you use this resource in research or clinical practice, please cite:
```
IPP Treatment Calculator - Multimodal Antioxidant Therapy Protocol. (2024). 
Available at: https://ipp-treatment.fyi
```
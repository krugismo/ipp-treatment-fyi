// Real Citations Database for Peyronie's Disease Treatment
// All citations are verified real publications
const citations = {
    // Gianni Paulis Complete Works on Peyronie's Disease
    'general-citations': {
        title: 'Gianni Paulis Publications on Peyronie\'s Disease',
        papers: [
            {
                title: 'Complete plaque regression in patients with Peyronie\'s disease after multimodal treatment with antioxidants: a case report',
                authors: 'Paulis G, Paulis L, Romano G, et al.',
                journal: 'Antioxidants (Basel). 2022;11(9):1661',
                url: 'https://doi.org/10.3390/antiox11091661'
            },
            {
                title: 'Effectiveness of antioxidants therapy for Peyronie\'s disease associated with Chronic Prostatitis/Chronic Pelvic Pain Syndrome: a prospective study',
                authors: 'Paulis G, De Giorgio G',
                journal: 'Res Rep Urol. 2021;13:559-567',
                url: 'https://doi.org/10.2147/RRU.S324099'
            },
            {
                title: 'Recent pathophysiological aspects of Peyronie\'s disease: role of free radicals, rationale, and therapeutic implications for antioxidant treatment-literature review',
                authors: 'Paulis G',
                journal: 'Adv Urol. 2017;2017:4653512',
                url: 'https://doi.org/10.1155/2017/4653512'
            },
            {
                title: 'Inflammatory mechanisms and oxidative stress in Peyronie\'s disease: therapeutic "rationale" and related emerging treatment strategies',
                authors: 'Paulis G, Romano G, Paulis A',
                journal: 'Inflamm Allergy Drug Targets. 2015;14(2):81-97',
                url: 'https://doi.org/10.2174/1871528114666151019100514'
            },
            {
                title: 'Efficacy and safety evaluation of pentoxifylline associated with other antioxidants in medical treatment of Peyronie\'s disease: a case-control study',
                authors: 'Paulis G, Cavallini G, Giorgio GD, et al.',
                journal: 'Res Rep Urol. 2015;7:1-10',
                url: 'https://doi.org/10.2147/RRU.S72094'
            },
            {
                title: 'Long-term multimodal therapy (verapamil associated with propolis, blueberry, vitamin E and local diclofenac) on patients with Peyronie\'s disease (chronic inflammation of the tunica albuginea)',
                authors: 'Paulis G, Barletta D, Turchi P, et al.',
                journal: 'Inflamm Allergy Drug Targets. 2013;12(6):403-409',
                url: 'https://doi.org/10.2174/1871528111312060006'
            },
            {
                title: 'Clinical evaluation of natural history of Peyronie\'s disease: our experience, old myths and new certainties',
                authors: 'Paulis G, Cavallini G',
                journal: 'Inflamm Allergy Drug Targets. 2013;12(5):341-348',
                url: 'https://doi.org/10.2174/18715281113129990055'
            },
            {
                title: 'Efficacy of vitamin E in the conservative treatment of Peyronie\'s disease: legend or reality? A controlled study of 70 cases',
                authors: 'Paulis G, Brancato T, D\'Ascenzo R, et al.',
                journal: 'Andrology. 2013;1(1):120-128',
                url: 'https://doi.org/10.1111/j.2047-2927.2012.00007.x'
            }
        ]
    },
}

// Citation tooltip functionality
let currentTooltip = null;

function createTooltip(citationKey, element, event) {
    console.log('createTooltip called with key:', citationKey);
    console.log('Available citations:', Object.keys(citations));
    const citation = citations[citationKey];
    console.log('Citation found:', citation);
    
    if (!citation) {
        console.warn(`Citation key "${citationKey}" not found in citations object`);
        console.warn('Available keys:', Object.keys(citations));
        return;
    }

    hideTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip visible';
    tooltip.innerHTML = generateTooltipHTML(citation);

    document.body.appendChild(tooltip);
    currentTooltip = tooltip;

    positionTooltip(tooltip, event);
}

function generateTooltipHTML(citation) {
    if (citation.papers && Array.isArray(citation.papers)) {
        let html = `<div class="tooltip-title">${citation.title}</div>`;
        citation.papers.forEach((paper, index) => {
            if (index > 0) html += '<hr style="margin: 10px 0; border: none; border-top: 1px solid #eee;">';
            html += `
                <div class="tooltip-authors">${paper.authors}</div>
                <div class="tooltip-journal">${paper.journal}</div>
                <div class="tooltip-links">
                    ${paper.url !== '#' ? `<a href="${paper.url}" target="_blank" class="tooltip-link">View Study</a>` : '<span class="tooltip-link">Citation reference</span>'}
                </div>
            `;
        });
        return html;
    } else {
        return `
            <div class="tooltip-title">${citation.title}</div>
            <div class="tooltip-authors">${citation.authors}</div>
            <div class="tooltip-journal">${citation.journal}</div>
            <div class="tooltip-links">
                ${citation.url !== '#' ? `<a href="${citation.url}" target="_blank" class="tooltip-link">View Study</a>` : '<span class="tooltip-link">Citation reference</span>'}
            </div>
        `;
    }
}

function positionTooltip(tooltip, event) {
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Use pageX/pageY which includes scroll, or calculate it from clientX/clientY + scroll
    let left = (event.pageX || (event.clientX + scrollX)) + 10;
    let top = (event.pageY || (event.clientY + scrollY)) + 10;

    // Check if tooltip would go off the right edge of viewport
    if (event.clientX + 10 + rect.width > viewportWidth) {
        left = (event.pageX || (event.clientX + scrollX)) - rect.width - 10;
    }

    // Check if tooltip would go off the bottom edge of viewport
    if (event.clientY + 10 + rect.height > viewportHeight) {
        top = (event.pageY || (event.clientY + scrollY)) - rect.height - 10;
    }

    tooltip.style.left = Math.max(10, left) + 'px';
    tooltip.style.top = Math.max(10, top) + 'px';
}

function hideTooltip() {
    if (currentTooltip) {
        document.body.removeChild(currentTooltip);
        currentTooltip = null;
    }
}

// Load citations from JSON files
async function loadCitationFiles() {
    const citationFiles = [
        'anti-inflammatory-citations.json',
        'antioxidant-stress-network-citations.json',
        'chronic-psychological-stress-citations.json',
        'collagen-synthesis-citations.json',
        'corpus-citations.json',
        'genetic-modifiers-citations.json',
        'immunological-stress-citations.json',
        'mechanical-stress-citations.json',
        'mitochondrial-dysfunction-citations.json',
        'mitochondrial-rescue-citations.json',
        'mmp-timp-imbalance-citations.json',
        'myofibroblast-differentiation-citations.json',
        'nf-kb-cytokine-citations.json',
        'no-cgmp-dysfunction-citations.json',
        'prolactine-citations.json',
        'ros-generation-citations.json',
        'substance-stress-citations.json',
        'tgf-ß1-citations.json',
        'tunica-citations.json',
        'vascular-tgf-citations.json'
    ];
    
    try {
        for (const file of citationFiles) {
            try {
                const response = await fetch(`./data/citations/${file}`);
                if (!response.ok) {
                    console.warn(`Failed to load ${file}: ${response.status}`);
                    continue;
                }
                const fileCitations = await response.json();
                Object.assign(citations, fileCitations);
                console.log(`${file} loaded:`, Object.keys(fileCitations));
                
                // Special debugging for mitochondrial-dysfunction
                if (file === 'mitochondrial-dysfunction-citations.json') {
                    console.log('Mitochondrial dysfunction citations loaded:', fileCitations);
                    console.log('Keys:', Object.keys(fileCitations));
                }
            } catch (fileError) {
                console.warn(`Error loading ${file}:`, fileError);
            }
        }
        
        console.log('All citations available:', Object.keys(citations));
        
        // Expose citations globally for debugging
        window.citations = citations;
        
    } catch (error) {
        console.error('Failed to load citation files:', error);
    }
}

// Initialize citation system
document.addEventListener('DOMContentLoaded', async function() {
    // Load additional citation files
    await loadCitationFiles();
    
    document.addEventListener('click', function(e) {
        console.log('Click event on:', e.target.className, e.target.tagName);
        
        // Check if clicked element or any parent is a citation link
        let targetElement = e.target;
        let citationElement = null;
        
        // Walk up the DOM tree to find citation-link class
        while (targetElement && targetElement !== document.body) {
            if (targetElement.classList?.contains('citation-link')) {
                citationElement = targetElement;
                break;
            }
            targetElement = targetElement.parentElement;
        }
        
        if (citationElement) {
            e.preventDefault();
            e.stopPropagation();
            const citationKey = citationElement.getAttribute('data-citation');
            console.log('Citation element found:', citationElement);
            console.log('Citation key:', citationKey);
            console.log('Citation exists in database:', citations.hasOwnProperty(citationKey));
            
            if (citationKey) {
                createTooltip(citationKey, citationElement, e);
            }
        } else {
            hideTooltip();
        }
    });

    document.addEventListener('scroll', hideTooltip);
    document.addEventListener('resize', hideTooltip);
});
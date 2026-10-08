/**
 * PROTEINURIA - Clinical Urine Protein Assessment Engine
 * Aligned with KDIGO 2024 Guidelines
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const state = {
    currentMode: 'dipstick', // 'dipstick' | 'ratio' | '24hr'
    
    // Mode 1: Dipstick
    dipstick: {
      padValue: 'neg',
      nominalMg: 0,
      label: 'Negative (<10 mg/dL)',
      hydration: 2 // 1: dilute, 2: normal, 3: concentrated
    },

    // Mode 2: Lab Ratio
    ratio: {
      type: 'uacr', // 'uacr' | 'upcr'
      entryMode: 'direct', // 'direct' | 'raw'
      directValue: 45,
      unit: 'mg_g', // 'mg_g' | 'mg_mmol'
      rawProtein: 6.0,
      rawCreatinine: 120
    },

    // Mode 3: 24-Hour Urine
    twentyFour: {
      volumeMl: 1800,
      concentration: 25,
      unit: 'mg_dl' // 'mg_dl' | 'mg_l' | 'g_l'
    },

    // Confounding Context Modifiers
    modifiers: {
      exercise: false,
      fever: false,
      diabetes: false,
      hypertension: false,
      pregnancy: false
    },

    // Output Results Cache
    computed: {
      primaryValueStr: '',
      primaryUnit: '',
      categoryKey: '', // 'normal', 'micro', 'macro', 'nephrotic'
      categoryTitle: '',
      kdigoStage: '',
      est24hExcretion: '',
      colorHex: '#10B981',
      percentage: 0, // 0 to 1
      clinicalNote: '',
      emergencyAlert: null
    }
  };

  // ==========================================
  // DOM ELEMENT REFERENCES
  // ==========================================
  // Navigation & Drawer
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-link');
  const currentYearSpan = document.getElementById('currentYear');
  if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

  // Mode Tabs
  const tabDipstick = document.getElementById('tab-dipstick');
  const tabRatio = document.getElementById('tab-ratio');
  const tab24hr = document.getElementById('tab-24hr');
  const panels = {
    dipstick: document.getElementById('panel-dipstick'),
    ratio: document.getElementById('panel-ratio'),
    '24hr': document.getElementById('panel-24hr')
  };

  // Dipstick Controls
  const dipstickCards = document.querySelectorAll('.color-swatch-card');
  const hydrationSlider = document.getElementById('hydrationSlider');
  const hydrationLabel = document.getElementById('hydrationLabel');

  // Ratio Controls
  const ratioTypeUACR = document.getElementById('ratioTypeUACR');
  const ratioTypeUPCR = document.getElementById('ratioTypeUPCR');
  const btnModeDirect = document.getElementById('btnModeDirect');
  const btnModeRaw = document.getElementById('btnModeRaw');
  const formDirectRatio = document.getElementById('formDirectRatio');
  const formRawComponents = document.getElementById('formRawComponents');
  const directRatioValue = document.getElementById('directRatioValue');
  const ratioUnitSelect = document.getElementById('ratioUnitSelect');
  const rawProteinInput = document.getElementById('rawProteinInput');
  const rawProteinLabel = document.getElementById('rawProteinLabel');
  const rawCreatinineInput = document.getElementById('rawCreatinineInput');
  const directRatioLabel = document.getElementById('directRatioLabel');

  // 24-Hour Controls
  const input24Volume = document.getElementById('input24Volume');
  const input24Concentration = document.getElementById('input24Concentration');
  const select24Unit = document.getElementById('select24Unit');

  // Modifier Checkboxes
  const modExercise = document.getElementById('modExercise');
  const modFever = document.getElementById('modFever');
  const modDiabetes = document.getElementById('modDiabetes');
  const modHypertension = document.getElementById('modHypertension');
  const modPregnancy = document.getElementById('modPregnancy');

  // Results Scorecard Display Elements
  const kdigoStageBadge = document.getElementById('kdigoStageBadge');
  const gaugeTrackFill = document.getElementById('gaugeTrackFill');
  const gaugeNeedleGroup = document.getElementById('gaugeNeedleGroup');
  const resultValueDisplay = document.getElementById('resultValueDisplay');
  const resultUnitDisplay = document.getElementById('resultUnitDisplay');
  const resultSeverityPill = document.getElementById('resultSeverityPill');
  const estExcretionDisplay = document.getElementById('estExcretionDisplay');
  const kdigoTextDisplay = document.getElementById('kdigoTextDisplay');
  const microAssessmentDisplay = document.getElementById('microAssessmentDisplay');
  const clinicalNoteCard = document.getElementById('clinicalNoteCard');
  const clinicalNoteTitle = document.getElementById('clinicalNoteTitle');
  const clinicalNoteBody = document.getElementById('clinicalNoteBody');
  const emergencyAlertCard = document.getElementById('emergencyAlertCard');
  const alertTitle = document.getElementById('alertTitle');
  const alertText = document.getElementById('alertText');

  // Doctor Summary Modal Elements
  const btnOpenReport = document.getElementById('btnOpenReport');
  const reportModal = document.getElementById('reportModal');
  const btnCloseReport = document.getElementById('btnCloseReport');
  const btnDismissReport = document.getElementById('btnDismissReport');
  const btnPrintReport = document.getElementById('btnPrintReport');
  const reportDate = document.getElementById('reportDate');
  const repModality = document.getElementById('repModality');
  const repValue = document.getElementById('repValue');
  const repExcretion = document.getElementById('repExcretion');
  const repKdigo = document.getElementById('repKdigo');
  const reportModifiersList = document.getElementById('reportModifiersList');
  const reportGuidanceText = document.getElementById('reportGuidanceText');
  const reportQuestionsList = document.getElementById('reportQuestionsList');

  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');

  // ==========================================
  // EVENT LISTENERS & SETUP
  // ==========================================

  // Mobile Menu Drawer
  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    });

    document.querySelectorAll('[data-close-drawer]').forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Active Navigation Highlighting on Scroll
  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 140;
    const sections = ['home', 'about', 'calculator', 'faq'];
    
    sections.forEach(secId => {
      const el = document.getElementById(secId);
      const navEl = document.querySelector(`.nav-link[href="#${secId}"]`);
      if (el && navEl) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          navEl.classList.add('active');
        }
      }
    });
  });

  // Mode Switch Tabs
  function setMode(modeKey) {
    state.currentMode = modeKey;

    // Update Tab Buttons
    [tabDipstick, tabRatio, tab24hr].forEach(tab => {
      if (tab) {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    if (modeKey === 'dipstick') {
      tabDipstick.classList.add('active');
      tabDipstick.setAttribute('aria-selected', 'true');
    } else if (modeKey === 'ratio') {
      tabRatio.classList.add('active');
      tabRatio.setAttribute('aria-selected', 'true');
    } else if (modeKey === '24hr') {
      tab24hr.classList.add('active');
      tab24hr.setAttribute('aria-selected', 'true');
    }

    // Toggle Panels
    Object.keys(panels).forEach(key => {
      if (panels[key]) {
        panels[key].classList.toggle('active', key === modeKey);
      }
    });

    recalculate();
  }

  tabDipstick.addEventListener('click', () => setMode('dipstick'));
  tabRatio.addEventListener('click', () => setMode('ratio'));
  tab24hr.addEventListener('click', () => setMode('24hr'));

  // Dipstick Swatch Selection
  dipstickCards.forEach(card => {
    card.addEventListener('click', () => {
      dipstickCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      state.dipstick.padValue = card.dataset.pad;
      state.dipstick.nominalMg = parseFloat(card.dataset.mg) || 0;
      state.dipstick.label = card.dataset.label;

      recalculate();
    });
  });

  // Hydration Slider
  hydrationSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    state.dipstick.hydration = val;

    if (val === 1) {
      hydrationLabel.textContent = 'Very Dilute (Specific Gravity < 1.010)';
      hydrationLabel.style.color = '#38BDF8';
    } else if (val === 2) {
      hydrationLabel.textContent = 'Normal Hydration (1.015 - 1.020)';
      hydrationLabel.style.color = '#10B981';
    } else {
      hydrationLabel.textContent = 'Highly Concentrated (SG > 1.025)';
      hydrationLabel.style.color = '#F59E0B';
    }

    recalculate();
  });

  // Ratio Type Toggle (UACR vs UPCR)
  function handleRatioTypeChange() {
    const isUACR = ratioTypeUACR.checked;
    state.ratio.type = isUACR ? 'uacr' : 'upcr';

    if (isUACR) {
      directRatioLabel.textContent = 'Enter Measured UACR Value:';
      rawProteinLabel.textContent = 'Urine Albumin (mg/L):';
    } else {
      directRatioLabel.textContent = 'Enter Measured UPCR Value:';
      rawProteinLabel.textContent = 'Total Urine Protein (mg/dL):';
    }

    recalculate();
  }

  ratioTypeUACR.addEventListener('change', handleRatioTypeChange);
  ratioTypeUPCR.addEventListener('change', handleRatioTypeChange);

  // Ratio Entry Mode (Direct vs Raw)
  btnModeDirect.addEventListener('click', () => {
    btnModeDirect.classList.add('active');
    btnModeRaw.classList.remove('active');
    formDirectRatio.style.display = 'block';
    formRawComponents.style.display = 'none';
    state.ratio.entryMode = 'direct';
    recalculate();
  });

  btnModeRaw.addEventListener('click', () => {
    btnModeRaw.classList.add('active');
    btnModeDirect.classList.remove('active');
    formDirectRatio.style.display = 'none';
    formRawComponents.style.display = 'block';
    state.ratio.entryMode = 'raw';
    recalculate();
  });

  // Direct Ratio Inputs
  directRatioValue.addEventListener('input', (e) => {
    state.ratio.directValue = parseFloat(e.target.value) || 0;
    recalculate();
  });

  ratioUnitSelect.addEventListener('change', (e) => {
    state.ratio.unit = e.target.value;
    recalculate();
  });

  // Raw Component Inputs
  rawProteinInput.addEventListener('input', (e) => {
    state.ratio.rawProtein = parseFloat(e.target.value) || 0;
    recalculate();
  });

  rawCreatinineInput.addEventListener('input', (e) => {
    state.ratio.rawCreatinine = parseFloat(e.target.value) || 0;
    recalculate();
  });

  // 24-Hour Urine Inputs
  input24Volume.addEventListener('input', (e) => {
    state.twentyFour.volumeMl = parseFloat(e.target.value) || 0;
    recalculate();
  });

  input24Concentration.addEventListener('input', (e) => {
    state.twentyFour.concentration = parseFloat(e.target.value) || 0;
    recalculate();
  });

  select24Unit.addEventListener('change', (e) => {
    state.twentyFour.unit = e.target.value;
    recalculate();
  });

  // Modifiers
  const modifierMap = [
    { el: modExercise, key: 'exercise' },
    { el: modFever, key: 'fever' },
    { el: modDiabetes, key: 'diabetes' },
    { el: modHypertension, key: 'hypertension' },
    { el: modPregnancy, key: 'pregnancy' }
  ];

  modifierMap.forEach(m => {
    m.el.addEventListener('change', () => {
      state.modifiers[m.key] = m.el.checked;
      recalculate();
    });
  });

  // FAQ Accordion
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ==========================================
  // CLINICAL CALCULATION LOGIC (KDIGO 2024)
  // ==========================================
  function recalculate() {
    let categoryKey = 'normal';
    let categoryTitle = 'Normal Physiological Level';
    let kdigoStage = 'KDIGO A1: Normal';
    let est24hExcretion = '< 150 mg/day';
    let microAssessment = 'No significant glomerular leak detected';
    let clinicalNote = '';
    let colorHex = '#10B981';
    let percentage = 0.05; // 0 to 1 for gauge needle & fill
    let primaryValStr = '';
    let primaryUnit = '';
    let emergencyAlert = null;

    // ------------------------------------------
    // MODE 1: DIPSTICK CALCULATION
    // ------------------------------------------
    if (state.currentMode === 'dipstick') {
      const pad = state.dipstick.padValue;
      const hydration = state.dipstick.hydration;

      if (pad === 'neg') {
        primaryValStr = 'Negative';
        primaryUnit = '<10 mg/dL';
        categoryKey = 'normal';
        categoryTitle = 'Normal / Negative Protein';
        kdigoStage = 'KDIGO A1: Normal';
        est24hExcretion = '< 150 mg/day';
        microAssessment = 'Healthy glomerular filtration barrier';
        colorHex = '#10B981';
        percentage = 0.08;

        if (hydration === 1) {
          clinicalNote = 'Urine is very dilute. High fluid intake can dilute urine protein below dipstick detection thresholds. If clinical symptoms (edema/hypertension) exist, verify with early-morning spot UACR.';
        } else {
          clinicalNote = 'Negative test strip indicates physiological urinary protein excretion. Routine healthy baseline.';
        }
      } else if (pad === 'trace') {
        primaryValStr = 'Trace';
        primaryUnit = '15–30 mg/dL';
        primaryValStr = 'Trace';
        
        if (hydration === 3) {
          // Concentrated urine can cause trace artifact
          categoryKey = 'normal';
          categoryTitle = 'Trace (Likely Concentrated Urine)';
          kdigoStage = 'KDIGO A1 / Borderline';
          est24hExcretion = '100 – 250 mg/day';
          microAssessment = 'Physiological concentration effect';
          colorHex = '#10B981';
          percentage = 0.22;
          clinicalNote = 'Trace protein in highly concentrated morning urine is often benign. Recheck after adequate hydration or confirm with spot UACR.';
        } else {
          categoryKey = 'micro';
          categoryTitle = 'Borderline / Microalbuminuria Range';
          kdigoStage = 'KDIGO A1 / Early A2';
          est24hExcretion = '150 – 350 mg/day';
          microAssessment = 'Possible low-level glomerular permeability';
          colorHex = '#F59E0B';
          percentage = 0.32;
          clinicalNote = 'Trace reading warrants a repeat first-morning spot UACR to rule out early microalbuminuria, particularly if diabetes or hypertension is present.';
        }
      } else if (pad === '1plus') {
        primaryValStr = '1+';
        primaryUnit = '30–100 mg/dL';
        categoryKey = 'micro';
        categoryTitle = 'Mild Proteinuria (Microalbuminuria)';
        kdigoStage = 'KDIGO A2: Moderately Increased';
        
        if (hydration === 1) {
          est24hExcretion = '500 – 1,000 mg/day (Dilution Amplified)';
          percentage = 0.50;
        } else {
          est24hExcretion = '300 – 800 mg/day';
          percentage = 0.42;
        }

        microAssessment = 'Persistent glomerular filtration stress likely';
        colorHex = '#F59E0B';
        clinicalNote = '1+ dipstick consistently corresponds to significant proteinuria. A confirmatory laboratory spot UACR test is strongly recommended.';
      } else if (pad === '2plus') {
        primaryValStr = '2+';
        primaryUnit = '100–300 mg/dL';
        categoryKey = 'macro';
        categoryTitle = 'Moderate-High Proteinuria (Macroalbuminuria)';
        kdigoStage = 'KDIGO A3: Severely Increased';
        est24hExcretion = '1,000 – 2,500 mg/day';
        microAssessment = 'Active glomerular leak / renal parenchymal stress';
        colorHex = '#EF4444';
        percentage = 0.68;
        clinicalNote = '2+ indicates significant protein spillover. Requires clinical workup including comprehensive metabolic panel, serum creatinine, eGFR, and blood pressure review.';
      } else if (pad === '3plus') {
        primaryValStr = '3+';
        primaryUnit = '300–1000 mg/dL';
        categoryKey = 'macro';
        categoryTitle = 'High-Grade Macroproteinuria';
        kdigoStage = 'KDIGO A3: Severely Increased';
        est24hExcretion = '2,500 – 4,000 mg/day';
        microAssessment = 'Severe podocyte / glomerular basement membrane injury';
        colorHex = '#EF4444';
        percentage = 0.82;
        clinicalNote = 'Substantial protein excretion. Physician evaluation and nephrology consultation are advised to prevent progressive renal impairment.';
      } else if (pad === '4plus') {
        primaryValStr = '4+';
        primaryUnit = '>1000 mg/dL';
        categoryKey = 'nephrotic';
        categoryTitle = 'Nephrotic Range Proteinuria Alert';
        kdigoStage = 'KDIGO A3+ (Nephrotic Spectrum)';
        est24hExcretion = '> 3,500 mg/day';
        microAssessment = 'Critical barrier breakdown with heavy albuminuria';
        colorHex = '#A855F7';
        percentage = 0.96;
        clinicalNote = '4+ reading suggests nephrotic-range proteinuria. High risk of hypoproteinemia, peripheral edema, hyperlipidemia, and hypercoagulability.';
        emergencyAlert = {
          title: 'Immediate Nephrology Evaluation Advised',
          text: '4+ protein loss suggests nephrotic range excretion (>3.5g/24h). Contact your healthcare provider promptly.'
        };
      }
    }

    // ------------------------------------------
    // MODE 2: LAB RATIO (UACR / UPCR)
    // ------------------------------------------
    else if (state.currentMode === 'ratio') {
      let finalRatioValue = 0;
      const isUACR = state.ratio.type === 'uacr';

      if (state.ratio.entryMode === 'direct') {
        finalRatioValue = state.ratio.directValue;
        // Convert to mg/g baseline for KDIGO evaluation if input is mg/mmol
        // 1 mg/mmol ≈ 8.84 mg/g
        if (state.ratio.unit === 'mg_mmol') {
          // Keep display value as entered, compute standard mg/g equivalent
          const standardMgG = finalRatioValue * 8.84;
          primaryValStr = finalRatioValue.toFixed(1);
          primaryUnit = 'mg/mmol';
          finalRatioValue = standardMgG;
        } else {
          primaryValStr = finalRatioValue.toFixed(0);
          primaryUnit = 'mg/g';
        }
      } else {
        // Raw Calculation
        // Albumin (mg/L) / Creatinine (mg/dL) * 100 = mg/g
        const prot = state.ratio.rawProtein;
        const creat = state.ratio.rawCreatinine;
        if (creat > 0) {
          if (isUACR) {
            // prot is mg/L, creat is mg/dL (1 dL = 0.1 L, so creat is creat*10 mg/L)
            // UACR (mg/g) = (prot in mg/L) / (creat in g/L) = (prot) / (creat * 0.01) = (prot / creat) * 100
            finalRatioValue = (prot / creat) * 100;
          } else {
            // UPCR: prot in mg/dL, creat in mg/dL => prot / creat = g/g * 1000 = mg/g
            finalRatioValue = (prot / creat) * 1000;
          }
          primaryValStr = Math.round(finalRatioValue).toString();
          primaryUnit = 'mg/g';
        } else {
          finalRatioValue = 0;
          primaryValStr = '0';
          primaryUnit = 'mg/g';
        }
      }

      // KDIGO 2024 UACR Classification
      if (isUACR) {
        if (finalRatioValue < 30) {
          categoryKey = 'normal';
          categoryTitle = 'Optimal / Normal Albuminuria';
          kdigoStage = 'KDIGO Stage A1 (<30 mg/g)';
          est24hExcretion = '< 30 mg/day Albumin (<150 mg Total)';
          microAssessment = 'Healthy glomerular filtration selectivity';
          colorHex = '#10B981';
          percentage = Math.min(0.25, Math.max(0.04, (finalRatioValue / 30) * 0.25));
          clinicalNote = 'Spot UACR is within normal clinical limits. In diabetic or hypertensive patients, repeat annually to monitor kidney health.';
        } else if (finalRatioValue <= 300) {
          categoryKey = 'micro';
          categoryTitle = 'Microalbuminuria (Moderately Increased)';
          kdigoStage = 'KDIGO Stage A2 (30–300 mg/g)';
          est24hExcretion = '30 – 300 mg/day Albumin (~150–600 mg Total)';
          microAssessment = 'Subclinical glomerular hyperfiltration or barrier stress';
          colorHex = '#F59E0B';
          percentage = 0.25 + ((finalRatioValue - 30) / 270) * 0.35;
          clinicalNote = 'Moderately increased albuminuria. Landmark KDIGO trials recommend confirming with 2 repeated tests over 3–6 months. Renoprotective therapies (SGLT2 inhibitors or ACEi/ARB) often discussed with doctors.';
        } else if (finalRatioValue <= 2200) {
          categoryKey = 'macro';
          categoryTitle = 'Macroalbuminuria (Severely Increased)';
          kdigoStage = 'KDIGO Stage A3 (>300 mg/g)';
          est24hExcretion = '300 – 2,200 mg/day Albumin';
          microAssessment = 'Advanced glomerular endothelial and podocyte dysfunction';
          colorHex = '#EF4444';
          percentage = 0.60 + ((finalRatioValue - 300) / 1900) * 0.28;
          clinicalNote = 'Severely increased albuminuria is a strong independent predictor of CKD progression and cardiovascular events. Requires prompt nephrology co-management.';
        } else {
          categoryKey = 'nephrotic';
          categoryTitle = 'Nephrotic Range Albuminuria';
          kdigoStage = 'KDIGO Stage A3+ (>2,200 mg/g)';
          est24hExcretion = '> 2,200 mg/day Albumin (~>3,500 mg Total)';
          microAssessment = 'Profound podocytopathy or membranous glomerular lesion';
          colorHex = '#A855F7';
          percentage = 0.95;
          clinicalNote = 'Extremely high albumin-to-creatinine ratio consistent with nephrotic syndrome. Urgent specialized nephrology workup needed.';
          emergencyAlert = {
            title: 'Nephrotic Spectrum Protein Spillover',
            text: 'UACR indicates critical protein loss. Schedule formal nephrological workup including lipid panel and renal ultrasound.'
          };
        }
      } 
      // UPCR (Total Protein to Creatinine Ratio)
      else {
        if (finalRatioValue < 150) {
          categoryKey = 'normal';
          categoryTitle = 'Normal Total Protein Ratio';
          kdigoStage = 'KDIGO UPCR < 150 mg/g';
          est24hExcretion = '< 150 mg/day Total Protein';
          microAssessment = 'Normal protein excretion profile';
          colorHex = '#10B981';
          percentage = 0.12;
          clinicalNote = 'Total protein-to-creatinine ratio is within physiological limits.';
        } else if (finalRatioValue <= 500) {
          categoryKey = 'micro';
          categoryTitle = 'Mild Protein Excretion Ratio';
          kdigoStage = 'KDIGO UPCR 150–500 mg/g';
          est24hExcretion = '150 – 500 mg/day Total Protein';
          microAssessment = 'Mild tubular or glomerular proteinuria';
          colorHex = '#F59E0B';
          percentage = 0.38;
          clinicalNote = 'Mildly elevated total protein ratio. Check whether tubular or glomerular origin.';
        } else if (finalRatioValue <= 3000) {
          categoryKey = 'macro';
          categoryTitle = 'High Protein Excretion Ratio';
          kdigoStage = 'KDIGO UPCR 500–3,000 mg/g';
          est24hExcretion = '500 – 3,000 mg/day Total Protein';
          microAssessment = 'Significant glomerular protein leakage';
          colorHex = '#EF4444';
          percentage = 0.72;
          clinicalNote = 'Overt proteinuria documented on UPCR. Comprehensive renal workup warranted.';
        } else {
          categoryKey = 'nephrotic';
          categoryTitle = 'Nephrotic Range UPCR';
          kdigoStage = 'KDIGO UPCR > 3,000 mg/g';
          est24hExcretion = '> 3,500 mg/day Total Protein';
          microAssessment = 'Nephrotic syndrome excretion threshold exceeded';
          colorHex = '#A855F7';
          percentage = 0.96;
          clinicalNote = 'Total protein ratio firmly in nephrotic spectrum.';
          emergencyAlert = {
            title: 'Nephrotic Range Protein Excretion',
            text: 'UPCR > 3,000 mg/g corresponds to massive daily urinary protein loss. Prompt medical care recommended.'
          };
        }
      }
    }

    // ------------------------------------------
    // MODE 3: 24-HOUR COLLECTION
    // ------------------------------------------
    else if (state.currentMode === '24hr') {
      const vol = state.twentyFour.volumeMl;
      const conc = state.twentyFour.concentration;
      const unit = state.twentyFour.unit;

      // Convert concentration to mg/mL
      let concMgPerMl = 0;
      if (unit === 'mg_dl') {
        concMgPerMl = conc / 100; // 1 dL = 100 mL
      } else if (unit === 'mg_l') {
        concMgPerMl = conc / 1000; // 1 L = 1000 mL
      } else if (unit === 'g_l') {
        concMgPerMl = conc; // 1 g/L = 1 mg/mL
      }

      const totalMg24h = Math.round(vol * concMgPerMl);
      primaryValStr = totalMg24h.toLocaleString();
      primaryUnit = 'mg/day';

      if (totalMg24h < 150) {
        categoryKey = 'normal';
        categoryTitle = 'Physiological 24-Hour Excretion';
        kdigoStage = 'Normal (< 150 mg/24h)';
        est24hExcretion = `${totalMg24h} mg/24h (Direct Measurement)`;
        microAssessment = 'Complete normal 24-hour baseline';
        colorHex = '#10B981';
        percentage = Math.min(0.24, Math.max(0.04, (totalMg24h / 150) * 0.24));
        clinicalNote = '24-hour total protein is within healthy adult physiological benchmarks (<150 mg/24h).';
      } else if (totalMg24h <= 500) {
        categoryKey = 'micro';
        categoryTitle = 'Mild 24-Hour Protein Excretion';
        kdigoStage = 'Borderline / Mild (150–500 mg/24h)';
        est24hExcretion = `${totalMg24h} mg/24h (Direct Measurement)`;
        microAssessment = 'Mild elevation; examine physiological vs renal cause';
        colorHex = '#F59E0B';
        percentage = 0.25 + ((totalMg24h - 150) / 350) * 0.32;
        clinicalNote = 'Mildly elevated 24-hour protein loss. Can occur in mild hypertension, orthostatic proteinuria in youth, or early nephropathy.';
      } else if (totalMg24h < 3500) {
        categoryKey = 'macro';
        categoryTitle = 'Sub-Nephrotic Proteinuria';
        kdigoStage = 'Moderate / Severe (500–3,500 mg/24h)';
        est24hExcretion = `${totalMg24h} mg/24h (Direct Measurement)`;
        microAssessment = 'Substantial glomerular filtration compromise';
        colorHex = '#EF4444';
        percentage = 0.58 + ((totalMg24h - 500) / 3000) * 0.30;
        clinicalNote = 'Significant protein loss verified by gold-standard 24-hour collection. Formal nephrology consultation indicated.';
      } else {
        categoryKey = 'nephrotic';
        categoryTitle = 'Nephrotic Syndrome Benchmark';
        kdigoStage = 'Nephrotic Range (> 3,500 mg/24h)';
        est24hExcretion = `${totalMg24h} mg/24h (Direct Measurement)`;
        microAssessment = 'Hallmark criterion for nephrotic syndrome confirmed';
        colorHex = '#A855F7';
        percentage = 0.96;
        clinicalNote = '24-hour protein excretion exceeds 3.5 grams per day, the official clinical hallmark for Nephrotic Syndrome.';
        emergencyAlert = {
          title: 'Nephrotic Excretion Verified (>3.5 g/day)',
          text: 'Collection confirms nephrotic syndrome threshold. Requires urgent clinical evaluation for edema, hypoalbuminemia, and renal biopsy consideration.'
        };
      }
    }

    // ------------------------------------------
    // CONTEXT MODIFIER OVERLAYS
    // ------------------------------------------
    // Severity position before any pregnancy overlay (used for the history graph)
    const basePercentage = percentage;

    const activeMods = [];
    if (state.modifiers.exercise) activeMods.push('Vigorous Exercise');
    if (state.modifiers.fever) activeMods.push('Fever / Acute Infection');
    if (state.modifiers.diabetes) activeMods.push('Diabetes Mellitus');
    if (state.modifiers.hypertension) activeMods.push('Hypertension');
    if (state.modifiers.pregnancy) activeMods.push('Pregnancy');

    // Pregnancy + Proteinuria = High alert for Preeclampsia
    if (state.modifiers.pregnancy && categoryKey !== 'normal') {
      emergencyAlert = {
        title: 'Obstetric Assessment Required (Preeclampsia Risk)',
        text: 'Detectable protein in urine during pregnancy accompanied by high blood pressure can signify preeclampsia. Please contact your obstetrician or maternity triage without delay.'
      };
      colorHex = '#EF4444';
      if (percentage < 0.6) percentage = 0.65;
    }

    // Transient factors explanation
    if ((state.modifiers.exercise || state.modifiers.fever) && categoryKey !== 'nephrotic') {
      clinicalNote += ' Note: Recent heavy physical exertion or acute febrile illness frequently induces temporary functional proteinuria. Retesting after 48 hours of recovery is standard clinical protocol.';
    }

    // Diabetes / HTN context note
    if (state.modifiers.diabetes || state.modifiers.hypertension) {
      clinicalNote += ' Because diabetes or hypertension is present, tight blood pressure (<120/80 mmHg) and glycemic control are paramount to protect remaining nephron function.';
    }

    // Store in computed state
    state.computed = {
      primaryValueStr: primaryValStr,
      primaryUnit: primaryUnit,
      categoryKey: categoryKey,
      categoryTitle: categoryTitle,
      kdigoStage: kdigoStage,
      est24hExcretion: est24hExcretion,
      colorHex: colorHex,
      percentage: percentage,
      clinicalNote: clinicalNote,
      emergencyAlert: emergencyAlert,
      microAssessment: microAssessment,
      activeModifiers: activeMods,
      basePercentage: basePercentage
    };

    // Render UI Updates
    renderResults();
  }

  // ==========================================
  // UI RENDER ENGINE
  // ==========================================
  function renderResults() {
    const c = state.computed;

    // Primary Values
    resultValueDisplay.textContent = c.primaryValueStr;
    resultUnitDisplay.textContent = c.primaryUnit;
    resultSeverityPill.textContent = c.categoryTitle;
    resultSeverityPill.style.color = c.colorHex;

    // Badges & Breakdown
    kdigoStageBadge.textContent = c.kdigoStage;
    kdigoStageBadge.style.color = c.colorHex;
    kdigoStageBadge.style.borderColor = c.colorHex;
    kdigoStageBadge.style.backgroundColor = `${c.colorHex}18`;

    estExcretionDisplay.textContent = c.est24hExcretion;
    kdigoTextDisplay.textContent = c.kdigoStage;
    microAssessmentDisplay.textContent = c.microAssessment;

    // Clinical Note
    clinicalNoteTitle.textContent = `Clinical Guidance — ${c.categoryTitle}`;
    clinicalNoteTitle.style.color = c.colorHex;
    clinicalNoteBody.textContent = c.clinicalNote;

    // Emergency Alert
    if (c.emergencyAlert) {
      emergencyAlertCard.style.display = 'flex';
      alertTitle.textContent = c.emergencyAlert.title;
      alertText.textContent = c.emergencyAlert.text;
    } else {
      emergencyAlertCard.style.display = 'none';
    }

    // Gauge Needle & Arc Fill Animation
    // Arc total length is ~298.
    const maxOffset = 298;
    const strokeDash = maxOffset - (c.percentage * maxOffset);
    gaugeTrackFill.style.strokeDashoffset = strokeDash;
    gaugeTrackFill.style.stroke = c.colorHex;

    // Angle: -90deg (0% normal) to +90deg (100% nephrotic)
    const angle = -90 + (c.percentage * 180);
    if (gaugeNeedleGroup) {
      gaugeNeedleGroup.style.transform = `translate(120px, 120px) rotate(${angle}deg)`;
    }
  }

  // ==========================================
  // DOCTOR REPORT GENERATOR MODAL
  // ==========================================
  function openReportModal() {
    const c = state.computed;

    reportDate.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    let modalityName = 'Urine Dipstick Urinalysis';
    if (state.currentMode === 'ratio') {
      modalityName = state.ratio.type === 'uacr' ? 'Spot Urine UACR Ratio' : 'Spot Urine UPCR Ratio';
    } else if (state.currentMode === '24hr') {
      modalityName = '24-Hour Urine Protein Excretion Collection';
    }

    repModality.textContent = modalityName;
    repValue.textContent = `${c.primaryValueStr} ${c.primaryUnit}`;
    repValue.style.color = c.colorHex;
    repExcretion.textContent = c.est24hExcretion;
    repKdigo.textContent = c.kdigoStage;
    reportGuidanceText.textContent = c.clinicalNote;

    // Modifiers list
    reportModifiersList.innerHTML = '';
    if (c.activeModifiers.length > 0) {
      c.activeModifiers.forEach(mod => {
        const li = document.createElement('li');
        li.textContent = `Active Context: ${mod}`;
        reportModifiersList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'None reported (Standard resting clinical baseline).';
      reportModifiersList.appendChild(li);
    }

    // Customized doctor questions based on patient results
    reportQuestionsList.innerHTML = '';
    const questions = [
      'Would you recommend confirming this with a first-morning urine spot UACR test?',
      'How do my latest blood pressure and serum creatinine (eGFR) numbers align with this result?'
    ];

    if (state.modifiers.diabetes || state.modifiers.hypertension) {
      questions.push('Are my current medications optimally protecting my kidney glomeruli (e.g. SGLT2 inhibitors or ACEi/ARB)?');
    }

    if (state.modifiers.exercise || state.modifiers.fever) {
      questions.push('Could my recent vigorous workout or fever account for a transient elevation? When should we recheck?');
    }

    if (state.modifiers.pregnancy) {
      questions.unshift('Could this protein reading represent preeclampsia? Should we check blood pressure and blood platelets right away?');
    }

    if (c.categoryKey === 'macro' || c.categoryKey === 'nephrotic') {
      questions.push('Should I be evaluated by a Nephrologist for a detailed kidney workup or renal ultrasound?');
    }

    questions.forEach(q => {
      const li = document.createElement('li');
      li.textContent = `"${q}"`;
      reportQuestionsList.appendChild(li);
    });

    reportModal.classList.add('open');
    reportModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeReportModal() {
    reportModal.classList.remove('open');
    reportModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  btnOpenReport.addEventListener('click', openReportModal);
  btnCloseReport.addEventListener('click', closeReportModal);
  btnDismissReport.addEventListener('click', closeReportModal);

  reportModal.addEventListener('click', (e) => {
    if (e.target === reportModal) closeReportModal();
  });

  btnPrintReport.addEventListener('click', () => {
    window.print();
  });

  // ==========================================
  // MEMBERS & READING HISTORY
  // ==========================================
  const STORAGE_KEY = 'renalSense.history.v1';
  const HISTORY_LIMIT = 6;   // rows / points shown per member
  const MAX_STORED = 60;     // readings kept per member

  const STATUS_META = {
    normal:    { label: 'Normal',    hex: '#10B981', colorName: 'Green',  band: [0, 0.25] },
    micro:     { label: 'Mild',      hex: '#F59E0B', colorName: 'Amber',  band: [0.25, 0.60] },
    macro:     { label: 'High',      hex: '#EF4444', colorName: 'Red',    band: [0.60, 0.88] },
    nephrotic: { label: 'Nephrotic', hex: '#A855F7', colorName: 'Purple', band: [0.88, 1] }
  };
  const BAND_ORDER = ['normal', 'micro', 'macro', 'nephrotic'];

  // Actual dipstick pad colours (match the swatches in style.css)
  const PAD_META = {
    neg:     { hex: '#FEF08A', name: 'Straw yellow' },
    trace:   { hex: '#D9F99D', name: 'Pale yellow-green' },
    '1plus': { hex: '#86EFAC', name: 'Light lime' },
    '2plus': { hex: '#34D399', name: 'Sea green' },
    '3plus': { hex: '#0D9488', name: 'Deep teal' },
    '4plus': { hex: '#0369A1', name: 'Navy cyan' }
  };

  const memberChips = document.getElementById('memberChips');
  const btnAddMember = document.getElementById('btnAddMember');
  const memberAddForm = document.getElementById('memberAddForm');
  const newMemberName = document.getElementById('newMemberName');
  const btnConfirmAddMember = document.getElementById('btnConfirmAddMember');
  const btnCancelAddMember = document.getElementById('btnCancelAddMember');
  const memberFormError = document.getElementById('memberFormError');
  const btnSaveReading = document.getElementById('btnSaveReading');
  const saveTargetName = document.getElementById('saveTargetName');
  const historyMemberName = document.getElementById('historyMemberName');
  const historyTableWrap = document.getElementById('historyTableWrap');
  const historyTableBody = document.getElementById('historyTableBody');
  const historyEmpty = document.getElementById('historyEmpty');
  const historyChart = document.getElementById('historyChart');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const btnRemoveMember = document.getElementById('btnRemoveMember');

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeHex(hex, fallback) {
    return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : fallback;
  }

  function defaultStore() {
    const first = { id: uid(), name: 'Me', readings: [] };
    return { activeId: first.id, members: [first] };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.members) && parsed.members.length) {
          parsed.members.forEach(m => { if (!Array.isArray(m.readings)) m.readings = []; });
          if (!parsed.members.some(m => m.id === parsed.activeId)) {
            parsed.activeId = parsed.members[0].id;
          }
          return parsed;
        }
      }
    } catch (err) {
      /* storage unavailable or corrupted: fall through to a fresh store */
    }
    return defaultStore();
  }

  let store = loadStore();

  function persistStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch (err) {
      return false;
    }
  }

  function activeMember() {
    return store.members.find(m => m.id === store.activeId) || store.members[0];
  }

  function showToast(message) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtDateShort(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  // ---------- Member chips ----------
  function renderMembers() {
    const current = activeMember();
    memberChips.innerHTML = '';

    store.members.forEach(m => {
      const isActive = m.id === current.id;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'member-chip' + (isActive ? ' active' : '');
      chip.setAttribute('role', 'tab');
      chip.setAttribute('aria-selected', isActive ? 'true' : 'false');

      const avatar = document.createElement('span');
      avatar.className = 'member-avatar';
      avatar.textContent = (m.name.trim().charAt(0) || '?').toUpperCase();

      const name = document.createElement('span');
      name.className = 'member-name';
      name.textContent = m.name;

      const count = document.createElement('span');
      count.className = 'member-count';
      count.textContent = m.readings.length;
      count.title = m.readings.length + ' saved reading' + (m.readings.length === 1 ? '' : 's');

      chip.append(avatar, name, count);
      chip.addEventListener('click', () => {
        store.activeId = m.id;
        persistStore();
        renderAll();
      });
      memberChips.appendChild(chip);
    });

    saveTargetName.textContent = current.name;
    historyMemberName.textContent = current.name;
    btnRemoveMember.style.display = store.members.length > 1 ? '' : 'none';
  }

  // ---------- History table ----------
  function renderHistory() {
    const member = activeMember();
    const last = member.readings.slice(-HISTORY_LIMIT);

    historyTableBody.innerHTML = '';

    if (!last.length) {
      historyTableWrap.style.display = 'none';
      historyEmpty.style.display = 'block';
      historyEmpty.textContent = 'No readings saved for ' + member.name +
        ' yet. Run a test above, then press \u201CSave Reading to History\u201D.';
      btnClearHistory.style.display = 'none';
    } else {
      historyTableWrap.style.display = '';
      historyEmpty.style.display = 'none';
      btnClearHistory.style.display = '';

      last.slice().reverse().forEach(r => {
        const meta = STATUS_META[r.statusKey] || STATUS_META.normal;
        const colour = safeHex(r.colorHex, meta.hex);
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td><span class="h-date">' + esc(fmtDate(r.ts)) + '</span><span class="h-time">' + esc(fmtTime(r.ts)) + '</span></td>' +
          '<td><span class="h-colour"><span class="h-swatch" style="background:' + colour + '"></span><span class="h-colour-name">' + esc(r.colorName || meta.colorName) + '</span></span></td>' +
          '<td><span class="h-result">' + esc(r.result) + '</span><span class="h-test">' + esc(r.mode) + '</span></td>' +
          '<td><span class="h-status" style="color:' + meta.hex + ';background:' + meta.hex + '1F;border-color:' + meta.hex + '66" title="' + esc(r.stage || '') + '">' + esc(meta.label) + '</span></td>';
        historyTableBody.appendChild(tr);
      });
    }

    renderChart(last, member.name);
  }

  // ---------- Trend graph (inline SVG) ----------
  function renderChart(readings, memberName) {
    if (!readings.length) {
      historyChart.innerHTML = '<p class="chart-empty">The graph appears here after the first saved reading.</p>';
      return;
    }

    const W = 520, H = 360, pl = 78, pr = 16, pt = 30, pb = 60;
    const plotW = W - pl - pr;
    const plotH = H - pt - pb;
    const inset = 30;
    const n = readings.length;

    const yOf = p => pt + plotH * (1 - Math.max(0, Math.min(1, p)));
    const xOf = i => (n === 1 ? pl + plotW / 2 : pl + inset + ((plotW - inset * 2) * i) / (n - 1));

    let svg = '<svg class="trend-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Line graph of the last ' + n +
      ' readings for ' + esc(memberName) + '">';

    // Severity bands
    BAND_ORDER.forEach(key => {
      const meta = STATUS_META[key];
      const yTop = yOf(meta.band[1]);
      const yBottom = yOf(meta.band[0]);
      svg += '<rect x="' + pl + '" y="' + yTop + '" width="' + plotW + '" height="' + (yBottom - yTop) + '" fill="' + meta.hex + '" opacity="0.09"/>';
      svg += '<line x1="' + pl + '" x2="' + (pl + plotW) + '" y1="' + yBottom + '" y2="' + yBottom + '" stroke="rgba(255,255,255,0.1)" stroke-dasharray="3 4"/>';
      svg += '<text x="' + (pl - 10) + '" y="' + ((yTop + yBottom) / 2 + 4) + '" text-anchor="end" font-size="11" font-weight="700" fill="' + meta.hex + '">' + meta.label + '</text>';
    });
    svg += '<line x1="' + pl + '" x2="' + pl + '" y1="' + pt + '" y2="' + (pt + plotH) + '" stroke="rgba(255,255,255,0.18)"/>';

    // Connecting line
    if (n > 1) {
      const pts = readings.map((r, i) => xOf(i).toFixed(1) + ',' + yOf(r.pct).toFixed(1)).join(' ');
      svg += '<polyline points="' + pts + '" fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>';
    }

    // Points, value labels, x-axis labels
    readings.forEach((r, i) => {
      const meta = STATUS_META[r.statusKey] || STATUS_META.normal;
      const x = xOf(i);
      const y = yOf(r.pct);
      const labelY = y - 15 < pt + 4 ? y + 26 : y - 15;
      const tip = fmtDate(r.ts) + ' ' + fmtTime(r.ts) + ' | ' + r.result + ' | ' + r.mode + ' | ' + meta.label;

      svg += '<g><title>' + esc(tip) + '</title>' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="12" fill="' + meta.hex + '" opacity="0.2"/>' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6.5" fill="' + meta.hex + '" stroke="#0E1726" stroke-width="2.5"/>' +
        '</g>';
      svg += '<text x="' + x.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#E2E8F0">' + esc(r.short || '') + '</text>';
      svg += '<text x="' + x.toFixed(1) + '" y="' + (pt + plotH + 22) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#CBD5E1">' + esc(fmtDateShort(r.ts)) + '</text>';
      svg += '<text x="' + x.toFixed(1) + '" y="' + (pt + plotH + 37) + '" text-anchor="middle" font-size="10" fill="#64748B">' + esc(fmtTime(r.ts)) + '</text>';
    });

    svg += '</svg>';
    historyChart.innerHTML = svg;
    historyChart.scrollLeft = historyChart.scrollWidth; // keep the newest readings in view on small screens
  }

  function renderAll() {
    renderMembers();
    renderHistory();
  }

  // ---------- Save a reading ----------
  function saveReading() {
    const c = state.computed;
    const member = activeMember();
    const meta = STATUS_META[c.categoryKey] || STATUS_META.normal;

    let modeLabel = 'Dipstick';
    if (state.currentMode === 'ratio') modeLabel = state.ratio.type === 'uacr' ? 'Spot UACR' : 'Spot UPCR';
    else if (state.currentMode === '24hr') modeLabel = '24-hr urine';

    // Colour: real strip colour for dipstick, severity colour for lab / 24-hr results
    let colorHex = meta.hex;
    let colorName = meta.colorName;
    if (state.currentMode === 'dipstick' && PAD_META[state.dipstick.padValue]) {
      colorHex = PAD_META[state.dipstick.padValue].hex;
      colorName = PAD_META[state.dipstick.padValue].name;
    }

    member.readings.push({
      id: uid(),
      ts: Date.now(),
      mode: modeLabel,
      colorHex: colorHex,
      colorName: colorName,
      result: (c.primaryValueStr + ' ' + c.primaryUnit).trim(),
      short: c.primaryValueStr,
      statusKey: c.categoryKey,
      stage: c.kdigoStage,
      pct: typeof c.basePercentage === 'number' ? c.basePercentage : c.percentage
    });

    if (member.readings.length > MAX_STORED) {
      member.readings = member.readings.slice(-MAX_STORED);
    }

    const stored = persistStore();
    renderAll();
    showToast(stored
      ? 'Saved to ' + member.name + '\u2019s history'
      : 'Saved for this session only (browser storage is unavailable)');
  }

  // ---------- Member actions ----------
  function openAddMemberForm() {
    memberAddForm.style.display = 'flex';
    btnAddMember.setAttribute('aria-expanded', 'true');
    memberFormError.textContent = '';
    newMemberName.value = '';
    newMemberName.focus();
  }

  function closeAddMemberForm() {
    memberAddForm.style.display = 'none';
    btnAddMember.setAttribute('aria-expanded', 'false');
    memberFormError.textContent = '';
  }

  function confirmAddMember() {
    const name = newMemberName.value.trim().replace(/\s+/g, ' ');
    if (!name) {
      memberFormError.textContent = 'Please enter a name.';
      return;
    }
    if (store.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      memberFormError.textContent = 'A member with that name already exists.';
      return;
    }
    const member = { id: uid(), name: name, readings: [] };
    store.members.push(member);
    store.activeId = member.id;
    persistStore();
    closeAddMemberForm();
    renderAll();
    showToast(name + ' added');
  }

  btnAddMember.addEventListener('click', () => {
    if (memberAddForm.style.display === 'none') openAddMemberForm();
    else closeAddMemberForm();
  });
  btnConfirmAddMember.addEventListener('click', confirmAddMember);
  btnCancelAddMember.addEventListener('click', closeAddMemberForm);
  newMemberName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmAddMember(); }
    if (e.key === 'Escape') closeAddMemberForm();
  });

  btnSaveReading.addEventListener('click', saveReading);

  btnClearHistory.addEventListener('click', () => {
    const member = activeMember();
    if (confirm('Clear all saved readings for ' + member.name + '?')) {
      member.readings = [];
      persistStore();
      renderAll();
    }
  });

  btnRemoveMember.addEventListener('click', () => {
    if (store.members.length < 2) return;
    const member = activeMember();
    if (confirm('Remove ' + member.name + ' and all of their saved readings?')) {
      store.members = store.members.filter(m => m.id !== member.id);
      store.activeId = store.members[0].id;
      persistStore();
      renderAll();
    }
  });

  renderAll();

  // Initial Calculation Run
  recalculate();
});

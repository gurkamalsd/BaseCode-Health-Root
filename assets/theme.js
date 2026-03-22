/* ═══════════════════════════════════════════════════
   BaseCode Health — Shopify Theme JavaScript
   ═══════════════════════════════════════════════════ */

(function() {
  'use strict';

  /* ── Supabase config ── */
  var SUPABASE_URL = 'https://buxlhvxlffyaaojqaese.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1eGxodnhsZmZ5YWFvanFhZXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTIyMjgsImV4cCI6MjA4ODM4ODIyOH0.kFaL51umWL65Yc-hqd67Q7xzNdxuRvVzSeEuh9YzxSI';

  /* ═══════════════════════════════════════════════
     1. TRACKING — Meta Pixel + GA4 + CAPI
     ═══════════════════════════════════════════════ */

  window.trackEvent = function(eventName, customData) {
    var eventId = eventName + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);

    // Client-side Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, customData || {}, { eventID: eventId });
    }

    // Server-side CAPI (fire-and-forget)
    try {
      fetch('/api/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            event_name: eventName,
            event_id: eventId,
            event_source_url: window.location.href,
            custom_data: customData || {}
          }]
        })
      }).catch(function() {});
    } catch(e) {}

    // GA4 via gtag
    if (typeof window.gtag === 'function') {
      var GA4_MAP = {
        ViewContent: 'view_item',
        AddToCart: 'add_to_cart',
        InitiateCheckout: 'begin_checkout',
        Lead: 'generate_lead'
      };
      var ga4Name = GA4_MAP[eventName] || eventName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      window.gtag('event', ga4Name, Object.assign({}, customData || {}, { event_id: eventId }));
    }
  };

  /* ═══════════════════════════════════════════════
     2. SCROLL REVEAL — IntersectionObserver
     ═══════════════════════════════════════════════ */

  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.reveal-hidden, .reveal-left, .reveal-right').forEach(function(el) {
      observer.observe(el);
    });
  }

  /* ═══════════════════════════════════════════════
     3. COUNT-UP ANIMATION
     ═══════════════════════════════════════════════ */

  function initCountUp() {
    if (!('IntersectionObserver' in window)) return;
    var counters = document.querySelectorAll('[data-count-target]');
    if (!counters.length) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.dataset.counted) return;
        el.dataset.counted = '1';
        observer.unobserve(el);

        var target = parseInt(el.dataset.countTarget, 10);
        var suffix = el.dataset.countSuffix || '';
        var duration = parseInt(el.dataset.countDuration || '1000', 10);
        var start = performance.now();

        function tick(now) {
          var progress = Math.min((now - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.3 });

    counters.forEach(function(el) { observer.observe(el); });
  }

  /* ═══════════════════════════════════════════════
     4. NAVBAR SCROLL EFFECT
     ═══════════════════════════════════════════════ */

  function initNavbar() {
    var nav = document.querySelector('.navbar');
    if (!nav) return;

    function onScroll() {
      if (window.scrollY > 40) {
        nav.classList.add('navbar--scrolled');
      } else {
        nav.classList.remove('navbar--scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile menu toggle
    var toggle = document.querySelector('.navbar__mobile-toggle');
    var menu = document.querySelector('.navbar__mobile-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', function() {
        var isOpen = menu.classList.toggle('navbar__mobile-menu--open');
        toggle.setAttribute('aria-expanded', isOpen);
        toggle.innerHTML = isOpen
          ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
          : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';
      });

      // Close on Escape
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && menu.classList.contains('navbar__mobile-menu--open')) {
          menu.classList.remove('navbar__mobile-menu--open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';
        }
      });

      // Close on link click
      menu.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
          menu.classList.remove('navbar__mobile-menu--open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  /* ═══════════════════════════════════════════════
     5. LEAD CAPTURE FORMS (Supabase)
     ═══════════════════════════════════════════════ */

  function initLeadForms() {
    document.querySelectorAll('[data-lead-form]').forEach(function(form) {
      var source = form.dataset.source || form.dataset.leadSource || 'unknown';
      var hasFiredFocus = false;

      form.addEventListener('focusin', function() {
        if (!hasFiredFocus) {
          hasFiredFocus = true;
          trackEvent('Lead', { content_name: source });
        }
      });

      form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLeadSubmit(form, source);
      });
    });
  }

  function handleLeadSubmit(form, source) {
    var honeypot = form.querySelector('[name="website"]');
    if (honeypot && honeypot.value) {
      showFormSuccess(form);
      return;
    }

    var submitBtn = form.querySelector('[type="submit"]');

    // Support both data-attribute inputs (popup) and name-attribute inputs (inline forms)
    // For forms with desktop+mobile duplicate inputs, find the one with a value
    var name = '', email = '';
    form.querySelectorAll('[data-lead-name], [name="firstName"]').forEach(function(input) {
      if (input.value.trim()) name = input.value.trim();
    });
    form.querySelectorAll('[data-lead-email], [name="email"]').forEach(function(input) {
      if (input.value.trim()) email = input.value.trim();
    });

    if (!email) {
      showFormError(form);
      return;
    }
    if (!name) name = 'Friend';

    var emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (email.length > 255 || !emailRegex.test(email)) {
      showFormError(form);
      return;
    }

    // Disable button
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    var eventId = 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    try { trackEvent('Lead'); } catch(e) {}
    sessionStorage.setItem('bc_lead_captured', '1');

    // Capture UTM params
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function(key) {
      var val = params.get(key);
      if (val) utm[key] = val;
    });

    var body = {
      email: email,
      firstName: name.slice(0, 100),
      source: source,
      eventId: eventId,
      pageUrl: window.location.href
    };
    if (Object.keys(utm).length > 0) body.utm = utm;

    fetch(SUPABASE_URL + '/functions/v1/waitlist-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(body)
    })
    .then(function(res) {
      if (res.status === 409) {
        showFormSuccess(form, true);
        return;
      }
      if (!res.ok) throw new Error('Failed');
      return res.json();
    })
    .then(function() {
      showFormSuccess(form);
    })
    .catch(function() {
      showFormError(form);
    });
  }

  function showFormSuccess(form, isDuplicate) {
    // Pattern 1: data-lead-wrapper with data-lead-form-view / data-lead-success-view (popup)
    var wrapper = form.closest('[data-lead-wrapper]');
    if (wrapper) {
      var formView = wrapper.querySelector('[data-lead-form-view]');
      var successView = wrapper.querySelector('[data-lead-success-view]');
      if (formView) formView.style.display = 'none';
      if (successView) {
        successView.style.display = 'block';
        if (isDuplicate) {
          var msg = successView.querySelector('[data-success-msg]');
          if (msg) msg.textContent = "You're already on the list.";
        }
      }
      return;
    }

    // Pattern 2: sibling .lead-form-success / .lead-form-duplicate (inline/waitlist/free-report)
    var parent = form.parentElement;
    if (parent) {
      form.style.display = 'none';
      if (isDuplicate) {
        var dupEl = parent.querySelector('.lead-form-duplicate');
        if (dupEl) dupEl.style.display = 'block';
      } else {
        var successEl = parent.querySelector('.lead-form-success');
        if (successEl) successEl.style.display = 'block';
      }
    }
  }

  function showFormError(form) {
    // Support both data-lead-error (popup) and .lead-form-error (inline forms)
    var errorEl = form.querySelector('[data-lead-error]') || form.querySelector('.lead-form-error');
    if (errorEl) errorEl.style.display = 'block';
    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.defaultText || 'Try Again';
    }
  }

  /* ═══════════════════════════════════════════════
     6. SHOP LEAD POPUP (5s delay)
     ═══════════════════════════════════════════════ */

  function initShopLeadPopup() {
    var popup = document.getElementById('shop-lead-popup');
    if (!popup) return;

    var SESSION_KEY = 'bc_shop_popup_dismissed';

    function showPopup() {
      popup.style.display = 'flex';
      popup.setAttribute('aria-hidden', 'false');
      var firstInput = popup.querySelector('button, input');
      if (firstInput) firstInput.focus();
    }

    function dismissPopup() {
      popup.style.display = 'none';
      popup.setAttribute('aria-hidden', 'true');
      sessionStorage.setItem(SESSION_KEY, '1');
      window.dispatchEvent(new CustomEvent('close-discount-popup'));
    }

    // Show after 5s delay, once per session
    if (!sessionStorage.getItem(SESSION_KEY) && !sessionStorage.getItem('bc_lead_captured')) {
      setTimeout(showPopup, 5000);
    }

    // Listen for open event from floating pill
    window.addEventListener('open-discount-popup', showPopup);

    // Close button
    popup.querySelector('[data-popup-close]').addEventListener('click', dismissPopup);

    // Click backdrop to close
    popup.addEventListener('click', function(e) {
      if (e.target === popup) dismissPopup();
    });

    // Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && popup.style.display === 'flex') dismissPopup();
    });
  }

  /* ═══════════════════════════════════════════════
     7. FLOATING DISCOUNT PILL
     ═══════════════════════════════════════════════ */

  function initFloatingPill() {
    var pill = document.getElementById('floating-discount-pill');
    if (!pill) return;

    var DISMISS_KEY = 'bc_pill_dismissed';

    if (
      sessionStorage.getItem(DISMISS_KEY) ||
      sessionStorage.getItem('bc_lead_captured') ||
      sessionStorage.getItem('bc_quiz_active')
    ) return;

    setTimeout(function() {
      pill.style.display = 'block';
    }, 2000);

    // Click pill -> open popup
    pill.querySelector('[data-pill-open]').addEventListener('click', function() {
      window.dispatchEvent(new Event('open-discount-popup'));
      pill.style.display = 'none';
    });

    // Dismiss X
    pill.querySelector('[data-pill-dismiss]').addEventListener('click', function(e) {
      e.stopPropagation();
      pill.style.display = 'none';
      sessionStorage.setItem(DISMISS_KEY, '1');
    });

    // Hide when popup opens, show when closes
    window.addEventListener('open-discount-popup', function() { pill.style.display = 'none'; });
    window.addEventListener('close-discount-popup', function() {
      if (!sessionStorage.getItem(DISMISS_KEY)) pill.style.display = 'block';
    });

    // Hide during quiz
    window.addEventListener('quiz-started', function() { pill.style.display = 'none'; });
  }

  /* ═══════════════════════════════════════════════
     8. EXIT INTENT POPUP
     ═══════════════════════════════════════════════ */

  function initExitIntent() {
    var fired = false;
    document.addEventListener('mouseout', function(e) {
      if (fired) return;
      if (sessionStorage.getItem('bc_lead_captured') || sessionStorage.getItem('bc_shop_popup_dismissed')) return;
      if (e.clientY <= 0) {
        fired = true;
        window.dispatchEvent(new Event('open-discount-popup'));
      }
    });
  }

  /* ═══════════════════════════════════════════════
     9. STICKY MOBILE CTA
     ═══════════════════════════════════════════════ */

  function initStickyCTA() {
    var cta = document.querySelector('.sticky-cta');
    if (!cta) return;

    var trigger = document.querySelector('[data-sticky-trigger]') || document.querySelector('.product-hero');
    if (!trigger) return;

    function onScroll() {
      var triggerBottom = trigger.getBoundingClientRect().bottom;
      if (triggerBottom < 0) {
        cta.classList.add('sticky-cta--visible');
      } else {
        cta.classList.remove('sticky-cta--visible');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ═══════════════════════════════════════════════
     10. FAQ ACCORDION
     ═══════════════════════════════════════════════ */

  function initFAQ() {
    document.querySelectorAll('.faq-trigger').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var item = btn.closest('.faq-item');
        var content = item.querySelector('.faq-content');
        var isOpen = content && content.style.display === 'block';

        // Close all
        document.querySelectorAll('.faq-item').forEach(function(faqItem) {
          var c = faqItem.querySelector('.faq-content');
          var t = faqItem.querySelector('.faq-trigger');
          if (c) c.style.display = 'none';
          if (t) t.setAttribute('aria-expanded', 'false');
          var chev = faqItem.querySelector('.faq-chevron');
          if (chev) chev.style.transform = 'rotate(0deg)';
        });

        // Toggle current
        if (!isOpen && content) {
          content.style.display = 'block';
          btn.setAttribute('aria-expanded', 'true');
          var chevron = item.querySelector('.faq-chevron');
          if (chevron) chevron.style.transform = 'rotate(180deg)';
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════
     11. PRODUCT PAGE — ADD TO CART
     ═══════════════════════════════════════════════ */

  function initProductPage() {
    var addToCartBtn = document.querySelector('[data-add-to-cart]');
    if (!addToCartBtn) return;

    var quantityEl = document.querySelector('[data-quantity]');

    addToCartBtn.addEventListener('click', function() {
      var variantId = addToCartBtn.dataset.variantId;
      var sellingPlanId = addToCartBtn.dataset.sellingPlanId;
      var quantity = quantityEl ? parseInt(quantityEl.textContent || '1', 10) : 1;
      var toggleState = document.getElementById('subscribe-toggle-state');
      var isSubscribe = toggleState ? toggleState.value === '1' : false;

      if (!variantId) return;

      addToCartBtn.disabled = true;
      var btnTextEl = addToCartBtn.querySelector('[data-cart-btn-text]');
      if (btnTextEl) btnTextEl.textContent = 'Adding...';

      trackEvent('AddToCart', {
        content_name: 'Origin',
        content_type: isSubscribe ? 'subscription' : 'one-time',
        value: isSubscribe ? 34 : 40,
        currency: 'USD'
      });

      var cartItem = {
        id: variantId,
        quantity: quantity
      };

      if (isSubscribe && sellingPlanId) {
        cartItem.selling_plan = sellingPlanId;
      }

      var body = { items: [cartItem] };

      // Add to Shopify native cart with discount
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(function(res) { return res.json(); })
      .then(function() {
        trackEvent('InitiateCheckout', {
          content_name: 'Origin',
          value: isSubscribe ? 34 : 40,
          currency: 'USD'
        });
        // Redirect to checkout with discount auto-applied
        window.location.href = '/discount/FOUNDER20?redirect=/checkout';
      })
      .catch(function() {
        addToCartBtn.disabled = false;
        var errTextEl = addToCartBtn.querySelector('[data-cart-btn-text]');
        if (errTextEl) errTextEl.textContent = 'Try Again';
      });
    });

    // Quantity +/- buttons
    var qtyMinus = document.querySelector('[data-qty-minus]');
    var qtyPlus = document.querySelector('[data-qty-plus]');
    if (quantityEl && qtyMinus && qtyPlus) {
      qtyMinus.addEventListener('click', function() {
        var q = parseInt(quantityEl.textContent || '1', 10);
        if (q > 1) quantityEl.textContent = q - 1;
      });
      qtyPlus.addEventListener('click', function() {
        var q = parseInt(quantityEl.textContent || '1', 10);
        if (q < 10) quantityEl.textContent = q + 1;
      });
    }

    // Subscribe/one-time price update is handled by inline selectPurchaseType()
    // in product-hero.liquid which updates the hidden #subscribe-toggle-state input.

    // Image gallery
    document.querySelectorAll('.product-thumbnail').forEach(function(thumb) {
      thumb.addEventListener('click', function() {
        var mainImg = document.querySelector('.product-main-image');
        if (mainImg) {
          mainImg.src = thumb.dataset.fullImage;
          mainImg.alt = thumb.dataset.alt || '';
        }
        document.querySelectorAll('.product-thumbnail--active').forEach(function(t) {
          t.classList.remove('product-thumbnail--active');
        });
        thumb.classList.add('product-thumbnail--active');
      });
    });
  }

  /* ═══════════════════════════════════════════════
     12. QUIZ
     ═══════════════════════════════════════════════ */

  function initQuiz() {
    var quizContainer = document.querySelector('[data-quiz-container]');
    if (!quizContainer) return;

    var questions = [
      { text: "How would you rate your daily stress load?", subtext: "Chronic cortisol elevation drives systemic inflammation, gut barrier breakdown, and accelerated biological aging. McEwen's allostatic load research quantified this as measurable biological cost.", options: [
        { label: "Severe — I'm constantly overwhelmed", score: 17 }, { label: "High — I manage but never fully recover", score: 14 },
        { label: "Moderate — some stressful periods", score: 8 }, { label: "Low — I feel balanced", score: 3 }
      ]},
      { text: "What does your typical diet look like?", subtext: "Sonnenburg et al. documented that ultra-processed Western diets systematically extinguish beneficial gut bacteria within a single generation. Your diet directly determines your microbial baseline.", options: [
        { label: "Mostly processed/fast food and takeout", score: 17 }, { label: "Mixed — some whole foods, some processed", score: 11 },
        { label: "Mostly whole foods, occasional processed", score: 6 }, { label: "Primarily whole, unprocessed foods", score: 2 }
      ]},
      { text: "How would you describe your sleep quality?", subtext: "Circadian disruption down-regulates melatonin synthesis and elevates cortisol, creating a compounding biological tax that accelerates gut permeability and cognitive decline.", options: [
        { label: "Poor — I wake up exhausted most days", score: 17 }, { label: "Inconsistent — good nights and bad nights", score: 11 },
        { label: "Decent — usually 6-7 hours of solid sleep", score: 6 }, { label: "Excellent — consistent deep sleep", score: 2 }
      ]},
      { text: "How many rounds of antibiotics have you taken in the last 5 years?", subtext: "Each antibiotic course eliminates entire bacterial populations. Research shows microbiome recovery can take 6-12 months per round — and some species never return without targeted reintroduction.", options: [
        { label: "3 or more rounds", score: 17 }, { label: "1-2 rounds", score: 11 },
        { label: "None in the last 5 years", score: 4 }
      ]},
      { text: "Which symptoms do you experience regularly?", subtext: "These are clinical markers of the biological tax — signs that your body's foundational systems are operating below baseline due to environmental mismatch.", options: [
        { label: "Brain fog, fatigue, and digestive issues", score: 17 },
        { label: "Low energy and poor recovery", score: 13 },
        { label: "Occasional bloating or sluggishness", score: 8 }, { label: "None — I feel optimized", score: 2 }
      ]}
    ];

    var step = 0;
    var answers = [];
    var selectedOption = null;

    var introScreen = quizContainer.querySelector('[data-quiz-intro]');
    var questionScreen = quizContainer.querySelector('[data-quiz-question]');
    var resultsScreen = quizContainer.querySelector('[data-quiz-results]');
    var nextBtn = quizContainer.querySelector('[data-quiz-next]');

    function render() {
      var totalQuestions = questions.length;
      var isIntro = step === 0;
      var isResults = step === totalQuestions + 1;

      introScreen.style.display = isIntro ? 'block' : 'none';
      questionScreen.style.display = (!isIntro && !isResults) ? 'block' : 'none';
      resultsScreen.style.display = isResults ? 'block' : 'none';

      if (!isIntro && !isResults) {
        var pct = Math.round(((step - 1) / totalQuestions) * 100);
        var currentEl = quizContainer.querySelector('[data-quiz-current]');
        var progressEl = quizContainer.querySelector('[data-quiz-progress]');
        var barEl = quizContainer.querySelector('[data-quiz-bar]');
        if (currentEl) currentEl.textContent = step;
        if (progressEl) progressEl.textContent = pct;
        if (barEl) barEl.style.width = pct + '%';
        selectedOption = null;
        renderQuestion(questions[step - 1], step, totalQuestions);
      }

      if (isResults) {
        renderResults();
      }
    }

    function updateNextBtn() {
      if (!nextBtn) return;
      var totalQuestions = questions.length;
      nextBtn.textContent = step === totalQuestions ? 'See My Results' : 'Next Question';
      if (selectedOption !== null) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
      } else {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.4';
        nextBtn.style.cursor = 'not-allowed';
      }
    }

    function renderQuestion(q, stepNum, total) {
      var qText = questionScreen.querySelector('[data-quiz-question-text]');
      if (qText) qText.textContent = q.text;

      var subText = questionScreen.querySelector('[data-quiz-subtext]');
      if (subText) subText.textContent = q.subtext;

      var optionsContainer = questionScreen.querySelector('[data-quiz-options]');
      if (!optionsContainer) return;
      optionsContainer.innerHTML = '';

      q.options.forEach(function(opt, i) {
        var btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt.label;
        btn.addEventListener('click', function() {
          selectedOption = i;
          var allBtns = optionsContainer.querySelectorAll('button');
          allBtns.forEach(function(b) { b.classList.remove('quiz-option--selected'); });
          btn.classList.add('quiz-option--selected');
          updateNextBtn();
        });
        optionsContainer.appendChild(btn);
      });

      updateNextBtn();
    }

    // Next button handler
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (selectedOption === null) return;
        var currentQ = questions[step - 1];
        if (!currentQ) return;
        answers.push(currentQ.options[selectedOption].score);
        selectedOption = null;
        step++;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    function renderResults() {
      var totalScore = answers.reduce(function(sum, s) { return sum + s; }, 0);
      var maxScore = 100;
      var riskLevel = totalScore >= 64 ? 'high' : (totalScore >= 36 ? 'moderate' : 'low');

      var riskConfig = {
        high: {
          label: 'High Biological Tax', color: '#C4783A', bgColor: 'rgba(196,120,58,0.12)',
          headline: 'Your environment is taxing your biology hard — but it\'s reversible.',
          body: 'Your assessment reveals significant environmental load across multiple systems. The chronic stress, dietary disruption, and bacterial depletion you\'re experiencing are compounding — creating a biological tax that shows up as fatigue, brain fog, and digestive dysfunction. Origin was engineered as the foundational protocol for exactly this profile.',
          purchaseHeadline: 'Your score confirms what your body has been signaling.',
          purchaseBody: 'The fatigue, the brain fog, the gut dysfunction — they\'re not separate problems. They\'re the predictable output of a system under environmental overload. Origin\'s four targeted strains begin restoring foundational bacterial populations from day one. Most users report measurable changes in 2–3 weeks.',
          purchaseSubtext: 'Systemic adaptation requires daily protocol adherence. Your bacterial baseline didn\'t erode in a day — and restoration is a continuous process, not a one-time fix.'
        },
        moderate: {
          label: 'Moderate Biological Tax', color: '#D4925A', bgColor: 'rgba(212,146,90,0.10)',
          headline: 'The environmental load is building — this is the optimal intervention window.',
          body: 'Your results indicate early-to-moderate signs of environmental mismatch. The biological tax hasn\'t fully compounded yet, which means intervention now yields the highest ROI on your health outcomes.',
          purchaseHeadline: 'You\'re in the optimal window for systemic adaptation.',
          purchaseBody: 'Origin\'s four strains restore barrier integrity and butyrate production from day one. At your tax level, most users notice improved digestion and sustained energy within 3–4 weeks.',
          purchaseSubtext: 'Environmental adaptation is a daily protocol. The strains colonize progressively and the prebiotic sustains them continuously.'
        },
        low: {
          label: 'Low Biological Tax', color: '#4A5550', bgColor: 'rgba(74,85,80,0.08)',
          headline: 'Your biological baseline is strong.',
          body: 'Your assessment suggests your foundational systems are operating near baseline. Understanding your environmental impact score now helps you protect what\'s intact.',
          purchaseHeadline: 'Your baseline is strong. Origin maintains it.',
          purchaseBody: 'The research shows environmental disruption is cumulative — what\'s intact now can erode under sustained modern stress. Origin maintains the bacterial diversity you still have.',
          purchaseSubtext: 'Prevention is more efficient than restoration. One daily protocol maintains your foundational baseline.'
        }
      };
      var risk = riskConfig[riskLevel];

      // Score number animation
      var scoreEl = resultsScreen.querySelector('[data-score-number]');
      if (scoreEl) {
        var start = performance.now();
        function animateScore(now) {
          var t = Math.min((now - start) / 1200, 1);
          var eased = 1 - Math.pow(1 - t, 3);
          scoreEl.textContent = Math.round(eased * totalScore);
          if (t < 1) requestAnimationFrame(animateScore);
        }
        requestAnimationFrame(animateScore);
      }

      // SVG ring
      var ring = resultsScreen.querySelector('[data-score-ring]');
      if (ring) {
        var r = parseFloat(ring.getAttribute('r')) || 80;
        var circ = 2 * Math.PI * r;
        setTimeout(function() {
          ring.style.strokeDashoffset = circ * (1 - totalScore / maxScore);
          ring.style.stroke = risk.color;
        }, 100);
      }

      // Risk label pill
      var riskPill = resultsScreen.querySelector('[data-risk-pill]');
      if (riskPill) {
        riskPill.textContent = risk.label;
        riskPill.style.background = risk.bgColor;
        riskPill.style.color = risk.color;
      }

      // Risk explanation card
      var riskHeadline = resultsScreen.querySelector('[data-risk-headline]');
      if (riskHeadline) riskHeadline.textContent = risk.headline;
      var riskBody = resultsScreen.querySelector('[data-risk-body]');
      if (riskBody) riskBody.textContent = risk.body;

      // Value stack dynamic content
      var purchaseHeadline = resultsScreen.querySelector('[data-purchase-headline]');
      if (purchaseHeadline) purchaseHeadline.textContent = risk.purchaseHeadline;
      var purchaseBody = resultsScreen.querySelector('[data-purchase-body]');
      if (purchaseBody) purchaseBody.textContent = risk.purchaseBody;
      var purchaseSubtext = resultsScreen.querySelector('[data-purchase-subtext]');
      if (purchaseSubtext) purchaseSubtext.textContent = risk.purchaseSubtext;

      // Update WhatsApp share text with score
      var waBtn = resultsScreen.querySelector('[data-whatsapp-share]');
      if (waBtn) {
        waBtn.setAttribute('data-whatsapp-text', 'I just took the Biology Score quiz — scored ' + totalScore + '/100 (' + risk.label + '). Backed by real research. Takes 2 minutes.');
      }

      // Fire tracking
      trackEvent('QuizComplete', { score: totalScore, risk: riskLevel });
      sessionStorage.setItem('bc_quiz_completed', '1');
    }

    // Start button
    var startBtn = quizContainer.querySelector('[data-quiz-start]');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        step = 1;
        sessionStorage.setItem('bc_quiz_active', '1');
        window.dispatchEvent(new Event('quiz-started'));
        trackEvent('ViewContent', { content_name: 'depletion-quiz-start' });
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Retake button
    resultsScreen.addEventListener('click', function(e) {
      if (e.target.matches('[data-quiz-retake]')) {
        step = 0;
        answers = [];
        selectedOption = null;
        sessionStorage.removeItem('bc_quiz_active');
        window.dispatchEvent(new Event('quiz-restarted'));
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Hide shop CTA when email form succeeds
    var emailCapture = resultsScreen.querySelector('[data-quiz-email-capture]');
    if (emailCapture) {
      var observer = new MutationObserver(function() {
        var successEl = emailCapture.querySelector('.lead-form-success');
        var duplicateEl = emailCapture.querySelector('.lead-form-duplicate');
        if ((successEl && successEl.style.display !== 'none') || (duplicateEl && duplicateEl.style.display !== 'none')) {
          var shopCta = resultsScreen.querySelector('[data-quiz-shop-cta]');
          if (shopCta) shopCta.style.display = 'none';
          var formWrapper = emailCapture.querySelector('[data-email-form-wrapper]');
          if (formWrapper) formWrapper.style.display = 'none';
        }
      });
      observer.observe(emailCapture, { subtree: true, attributes: true, attributeFilter: ['style'] });
    }

    render();
  }

  /* ═══════════════════════════════════════════════
     13. HERO SCORE TEASER (animated ring)
     ═══════════════════════════════════════════════ */

  function initHeroScoreTeaser() {
    var teaserEl = document.querySelector('[data-score-teaser]');
    if (!teaserEl) return;

    var demoScore = 79;
    var maxScore = 100;
    var r = 68;
    var circ = 2 * Math.PI * r;
    var ring = teaserEl.querySelector('[data-teaser-ring]');
    var countEl = teaserEl.querySelector('[data-teaser-count]');

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        var duration = 1400;
        var start = performance.now();

        function tick(now) {
          var t = Math.min((now - start) / duration, 1);
          var eased = 1 - Math.pow(1 - t, 3);
          var current = Math.round(eased * demoScore);
          if (countEl) countEl.textContent = current;
          if (ring) {
            ring.style.strokeDashoffset = circ * (1 - (current / maxScore));
          }
          if (t < 1) requestAnimationFrame(tick);
        }

        if (ring) {
          ring.style.strokeDasharray = circ;
          ring.style.strokeDashoffset = circ;
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });

    observer.observe(teaserEl);
  }

  /* ═══════════════════════════════════════════════
     14. COPY CODE BUTTON
     ═══════════════════════════════════════════════ */

  function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var text = btn.dataset.copy;
        navigator.clipboard.writeText(text).then(function() {
          var originalText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function() { btn.textContent = originalText; }, 2000);
        });
      });
    });
  }

  /* ═══════════════════════════════════════════════
     15. WHATSAPP SHARE
     ═══════════════════════════════════════════════ */

  function initWhatsAppShare() {
    document.querySelectorAll('[data-whatsapp-share]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var text = btn.dataset.whatsappText || '';
        var url = btn.dataset.whatsappUrl || window.location.href;
        var shareUrl = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
        window.open(shareUrl, '_blank');
      });
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: STICKY HEADER
     ═══════════════════════════════════════════════ */

  function initStickyHeader() {
    var header = document.querySelector('.header');
    if (!header) return;

    var hideOnScroll = header.getAttribute('data-hide-on-scroll') === 'true';
    var lastScrollY = window.scrollY;
    var isHidden = false;
    var DELTA = 5;
    var HIDE_THRESHOLD = 300;

    function onScroll() {
      var currentY = window.scrollY;

      if (currentY > 40) {
        header.classList.add('header--scrolled');
      } else {
        header.classList.remove('header--scrolled');
      }

      if (hideOnScroll) {
        var diff = currentY - lastScrollY;
        if (Math.abs(diff) < DELTA) return;

        if (diff > 0 && currentY > HIDE_THRESHOLD && !isHidden) {
          header.classList.add('header--hidden');
          isHidden = true;
        } else if (diff < 0 && isHidden) {
          header.classList.remove('header--hidden');
          isHidden = false;
        }
      }

      lastScrollY = currentY;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: FAQ ACCORDION (data-faq-toggle)
     ═══════════════════════════════════════════════ */

  function initRootFAQ() {
    document.querySelectorAll('[data-faq-toggle]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var item = btn.closest('.faq-item');
        if (!item) return;
        var content = item.querySelector('[data-faq-content], .faq-item__answer');
        if (!content) return;
        var isOpen = content.classList.contains('is-open');

        // Toggle current
        if (isOpen) {
          content.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
          var icon = btn.querySelector('.faq-item__icon, svg');
          if (icon) icon.style.transform = '';
        } else {
          content.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          var icon2 = btn.querySelector('.faq-item__icon, svg');
          if (icon2) icon2.style.transform = 'rotate(45deg)';
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: TESTIMONIAL CAROUSEL (data-testimonial-dot/slide)
     ═══════════════════════════════════════════════ */

  function initTestimonialCarousel() {
    document.querySelectorAll('[data-testimonial-carousel]').forEach(function(carousel) {
      var slides = carousel.querySelectorAll('[data-testimonial-slide]');
      var dots = carousel.querySelectorAll('[data-testimonial-dot]');
      if (slides.length < 2) return;

      function showSlide(index) {
        slides.forEach(function(s) { s.style.display = 'none'; });
        dots.forEach(function(d) { d.classList.remove('is-active'); });
        if (slides[index]) slides[index].style.display = '';
        if (dots[index]) dots[index].classList.add('is-active');
      }

      dots.forEach(function(dot) {
        dot.addEventListener('click', function() {
          var idx = parseInt(dot.getAttribute('data-testimonial-dot'));
          showSlide(idx);
        });
      });

      // Auto-play if data attribute present
      var autoSpeed = carousel.getAttribute('data-auto-play');
      if (autoSpeed) {
        var current = 0;
        setInterval(function() {
          current = (current + 1) % slides.length;
          showSlide(current);
        }, parseInt(autoSpeed) * 1000);
      }
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: PRODUCT TABS (data-tab / data-tab-panel)
     ═══════════════════════════════════════════════ */

  function initProductTabs() {
    document.querySelectorAll('.product-tabs').forEach(function(tabContainer) {
      var tabs = tabContainer.querySelectorAll('.product-tabs__tab');
      var panels = tabContainer.querySelectorAll('.product-tabs__panel');

      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          var target = tab.getAttribute('data-tab');

          tabs.forEach(function(t) { t.classList.remove('is-active'); });
          panels.forEach(function(p) { p.classList.remove('is-active'); });

          tab.classList.add('is-active');
          var panel = tabContainer.querySelector('[data-tab-panel="' + target + '"]');
          if (panel) panel.classList.add('is-active');
        });
      });
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: PRODUCT CAROUSEL ARROWS
     ═══════════════════════════════════════════════ */

  function initCarouselArrows() {
    document.querySelectorAll('[data-carousel-prev]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var track = btn.closest('.carousel').querySelector('.carousel__track');
        if (track) track.scrollBy({ left: -300, behavior: 'smooth' });
      });
    });
    document.querySelectorAll('[data-carousel-next]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var track = btn.closest('.carousel').querySelector('.carousel__track');
        if (track) track.scrollBy({ left: 300, behavior: 'smooth' });
      });
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: THUMBNAIL GALLERY
     ═══════════════════════════════════════════════ */

  function initThumbnailGallery() {
    document.querySelectorAll('[data-thumbnail]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var src = btn.getAttribute('data-image-src');
        var mainImg = document.getElementById('product-main-image');
        if (mainImg && src) {
          mainImg.src = src;
          mainImg.srcset = src.replace('width=1200', 'width=600') + ' 600w, ' + src.replace('width=1200', 'width=900') + ' 900w, ' + src + ' 1200w';
        }
        // Update active border
        btn.closest('.product-gallery').querySelectorAll('[data-thumbnail]').forEach(function(t) {
          t.style.borderColor = 'transparent';
        });
        btn.style.borderColor = 'var(--color-primary)';
      });
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: SELLING PLAN TOGGLE
     ═══════════════════════════════════════════════ */

  function initSellingPlanToggle() {
    var toggle = document.getElementById('selling-plan-toggle');
    if (!toggle) return;
    var planInput = document.getElementById('product-selling-plan');

    toggle.querySelectorAll('[data-plan]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        toggle.querySelectorAll('[data-plan]').forEach(function(b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');

        var plan = btn.getAttribute('data-plan');
        if (planInput) {
          if (plan === 'one-time') {
            planInput.disabled = true;
            planInput.value = '';
          } else {
            planInput.disabled = false;
            // Re-set to first selling plan
            var form = document.getElementById('product-form');
            if (form) {
              var origVal = planInput.getAttribute('value');
              if (origVal) planInput.value = origVal;
            }
          }
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: MOBILE MENU
     ═══════════════════════════════════════════════ */

  function initMobileMenu() {
    var menuToggle = document.querySelector('.header__menu-toggle, [id="menu-toggle"]');
    var menu = document.querySelector('.mobile-menu');
    var backdrop = menu && menu.querySelector('.mobile-menu__backdrop');
    var closeBtn = menu && menu.querySelector('[data-menu-close], #mobile-menu-close');
    var iconOpen = document.getElementById('menu-icon-open');
    var iconClose = document.getElementById('menu-icon-close');

    if (!menuToggle || !menu) return;

    function openMenu() {
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      menuToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (iconOpen) iconOpen.style.display = 'none';
      if (iconClose) iconClose.style.display = 'block';
      var first = menu.querySelector('a, button');
      if (first) setTimeout(function() { first.focus(); }, 50);
    }
    function closeMenu() {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (iconOpen) iconOpen.style.display = 'block';
      if (iconClose) iconClose.style.display = 'none';
      menuToggle.focus();
    }

    menuToggle.addEventListener('click', function() {
      if (menu.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
    if (backdrop) backdrop.addEventListener('click', closeMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
    });

    /* Mobile sub-menus */
    menu.querySelectorAll('.mobile-menu__parent-toggle').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var expanded = this.getAttribute('aria-expanded') === 'true';
        var children = this.nextElementSibling;
        this.setAttribute('aria-expanded', !expanded);
        var chevron = this.querySelector('svg');
        if (chevron) chevron.style.transform = expanded ? '' : 'rotate(180deg)';
        if (children) children.style.display = expanded ? 'none' : 'block';
      });
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: DESKTOP DROPDOWNS
     ═══════════════════════════════════════════════ */

  function initDesktopDropdowns() {
    document.querySelectorAll('.header__nav-dropdown').forEach(function(dropdown) {
      var btn  = dropdown.querySelector('button');
      var ddMenu = dropdown.querySelector('.header__dropdown-menu');
      if (!btn || !ddMenu) return;
      function show() { ddMenu.style.display = 'block'; btn.setAttribute('aria-expanded', 'true'); var c = btn.querySelector('svg'); if (c) c.style.transform = 'rotate(180deg)'; }
      function hide() { ddMenu.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); var c = btn.querySelector('svg'); if (c) c.style.transform = ''; }
      dropdown.addEventListener('mouseenter', show);
      dropdown.addEventListener('mouseleave', hide);
      btn.addEventListener('click', function() { ddMenu.style.display === 'block' ? hide() : show(); });
      btn.addEventListener('keydown', function(e) { if (e.key === 'Escape') { hide(); btn.focus(); } });
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: SEARCH TOGGLE
     ═══════════════════════════════════════════════ */

  function initSearchToggle() {
    var searchBtn = document.getElementById('search-toggle');
    var searchForm = document.getElementById('header-search-form');
    var header = document.getElementById('site-header');
    if (!searchBtn || !searchForm) return;

    searchBtn.addEventListener('click', function() {
      var open = searchForm.classList.toggle('is-open');
      searchBtn.setAttribute('aria-expanded', open);
      if (open) {
        var input = searchForm.querySelector('input');
        if (input) setTimeout(function() { input.focus(); }, 50);
      }
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && searchForm.classList.contains('is-open')) {
        searchForm.classList.remove('is-open');
        searchBtn.setAttribute('aria-expanded', 'false');
        searchBtn.focus();
      }
    });
    document.addEventListener('click', function(e) {
      if (header && !header.contains(e.target)) {
        searchForm.classList.remove('is-open');
        searchBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ═══════════════════════════════════════════════
     ROOT THEME: CART DRAWER
     ═══════════════════════════════════════════════ */

  function initCartDrawer() {
    var cartBtn = document.querySelector('[data-cart-toggle], #cart-toggle, .header__icon--cart');
    var drawer = document.querySelector('.cart-drawer');
    var backdrop = document.querySelector('.cart-drawer__backdrop');
    var closeBtn = drawer && (drawer.querySelector('[data-cart-close]') || drawer.querySelector('#cart-drawer-close'));

    if (!cartBtn || !drawer) return;

    function openDrawer() {
      drawer.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      drawer.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    cartBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openDrawer();
    });
    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    // Listen for cart-drawer:refresh event
    document.addEventListener('cart-drawer:refresh', function() {
      fetch('/cart.js').then(function(r) { return r.json(); }).then(function(cart) {
        var countEl = document.querySelector('[data-cart-count]');
        if (countEl) countEl.textContent = cart.item_count;
      });
    });
  }

  /* ═══════════════════════════════════════════════
     ANNOUNCEMENT BAR — Dismiss handler + ticker pause
     ═══════════════════════════════════════════════ */

  function initAnnouncementBar() {
    // Update header offset when announcement is dismissed
    function clearAnnouncementHeight() {
      document.documentElement.style.setProperty('--announcement-height', '0px');
    }
    window.addEventListener('bch:announcement:dismissed', clearAnnouncementHeight);
    // Check on load if already dismissed
    var annBar = document.querySelector('.announcement-bar');
    if (!annBar || annBar.offsetHeight === 0) {
      clearAnnouncementHeight();
    }

    // Pause ticker on hover
    var track = document.querySelector('.announcement-bar__track');
    if (track && annBar) {
      annBar.addEventListener('mouseenter', function() { track.style.animationPlayState = 'paused'; });
      annBar.addEventListener('mouseleave', function() { track.style.animationPlayState = 'running'; });
    }
  }

  /* ═══════════════════════════════════════════════
     TESTIMONIAL CAROUSEL — Pause + keyboard nav
     ═══════════════════════════════════════════════ */

  function initTestimonialEnhancements() {
    document.querySelectorAll('[data-testimonial-carousel]').forEach(function(carousel) {
      var slides = carousel.querySelectorAll('[data-testimonial-slide]');
      var dots = carousel.querySelectorAll('[data-testimonial-dot]');
      if (slides.length < 2) return;

      var autoSpeed = carousel.getAttribute('data-auto-play');
      if (!autoSpeed) return;
      var intervalMs = parseInt(autoSpeed) * 1000;
      var current = 0;
      var timer = null;

      function showSlide(index) {
        current = ((index % slides.length) + slides.length) % slides.length;
        slides.forEach(function(s) { s.style.display = 'none'; });
        dots.forEach(function(d) { d.classList.remove('is-active'); });
        if (slides[current]) slides[current].style.display = '';
        if (dots[current]) dots[current].classList.add('is-active');
      }

      function startAutoPlay() {
        if (timer) return;
        timer = setInterval(function() {
          showSlide(current + 1);
        }, intervalMs);
      }

      function pauseAutoPlay() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      // Pause on hover + focusin
      carousel.addEventListener('mouseenter', pauseAutoPlay);
      carousel.addEventListener('focusin', pauseAutoPlay);
      carousel.addEventListener('mouseleave', startAutoPlay);
      carousel.addEventListener('focusout', startAutoPlay);

      // Arrow key navigation
      carousel.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') { showSlide(current - 1); pauseAutoPlay(); }
        if (e.key === 'ArrowRight') { showSlide(current + 1); pauseAutoPlay(); }
      });
    });
  }

  /* ═══════════════════════════════════════════════
     INIT — Run everything on DOM ready
     ═══════════════════════════════════════════════ */

  function init() {
    // Original functions
    initScrollReveal();
    initCountUp();
    initNavbar();
    initLeadForms();
    initShopLeadPopup();
    initFloatingPill();
    initExitIntent();
    initStickyCTA();
    initFAQ();
    initProductPage();
    initQuiz();
    initHeroScoreTeaser();
    initCopyButtons();
    initWhatsAppShare();

    // Root theme functions
    initStickyHeader();
    initRootFAQ();
    initTestimonialCarousel();
    initProductTabs();
    initCarouselArrows();
    initThumbnailGallery();
    initSellingPlanToggle();
    initMobileMenu();
    initDesktopDropdowns();
    initSearchToggle();
    initCartDrawer();
    initAnnouncementBar();
    initTestimonialEnhancements();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

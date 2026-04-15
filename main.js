/**
 * ORYZO-STYLE ANIMATIONS
 * Smooth scroll-linked parallax, reveals, and 3D effects
 */

// Smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

/**
 * Hero Parallax Effect
 * Elements move at different speeds for depth
 * Reduced on mobile for better performance
 */
(function() {
  const hero = document.querySelector('.hero');
  const heroTitle = document.querySelector('.hero h1');
  const heroLede = document.querySelector('.hero-lede');
  const scrollHint = document.querySelector('.scroll-hint');
  const floatItems = document.querySelectorAll('.float-item');
  const badge = document.querySelector('.header__badge');
  
  if (!hero) return;
  
  const isMobile = window.innerWidth <= 768;
  
  // Skip parallax entirely on mobile to avoid visibility issues
  if (isMobile) return;
  
  let scrollY = 0;
  let currentY = 0;
  const ease = 0.08;
  
  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }
  
  function updateParallax() {
    currentY = lerp(currentY, scrollY, ease);
    
    const progress = Math.min(currentY / window.innerHeight, 1);
    
    // Hero title moves up slower (parallax)
    if (heroTitle) {
      heroTitle.style.transform = `translateY(${currentY * 0.3}px) scale(${1 - progress * 0.1})`;
      heroTitle.style.opacity = Math.max(0, 1 - progress * 1.5);
    }
    
    // Lede text moves slightly faster
    if (heroLede) {
      heroLede.style.transform = `translateY(${currentY * 0.2}px)`;
    }
    
    // Scroll hint fades out quickly
    if (scrollHint) {
      scrollHint.style.opacity = Math.max(0, 1 - progress * 3);
      scrollHint.style.transform = `translateY(${currentY * 0.5}px)`;
    }
    
    // Floating items - each at different speed for depth
    floatItems.forEach((item, i) => {
      const speed = 0.1 + (i % 5) * 0.08;
      const rotateSpeed = (i % 2 === 0 ? 1 : -1) * currentY * 0.02;
      item.style.transform = `translateY(${currentY * speed}px) rotate(${rotateSpeed}deg)`;
    });
    
    // Badge shrinks on scroll
    if (badge && currentY > 50) {
      badge.style.transform = `scale(${Math.max(0.8, 1 - currentY * 0.001)})`;
    }
    
    requestAnimationFrame(updateParallax);
  }
  
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  }, { passive: true });
  
  requestAnimationFrame(updateParallax);
})();

/**
 * Scroll Reveal Animations
 * Elements animate in when entering viewport
 * Disabled on mobile for better compatibility
 */
(function() {
  const isMobile = window.innerWidth <= 768;
  
  // Skip reveal animations on mobile - everything visible by default
  if (isMobile) return;
  
  const revealElements = document.querySelectorAll('.product-stage, .product-copy, .price, footer');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // Stagger children if present
        const children = entry.target.querySelectorAll('.product-copy h2, .product-copy p, .buy-btn');
        children.forEach((child, i) => {
          child.style.transitionDelay = `${i * 0.1}s`;
          child.classList.add('revealed');
        });
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px 0px -10% 0px'
  });
  
  revealElements.forEach(el => {
    el.classList.add('reveal-ready');
    observer.observe(el);
  });
})();

/**
 * Magnetic Cursor Effect on Buttons (pointer devices only — avoids touch offset)
 */
(function() {
  if (window.matchMedia("(max-width: 768px)").matches) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;

  const buttons = document.querySelectorAll('.buy-btn, .scroll-hint');
  
  buttons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();

/**
 * Smooth Counter Animation for Prices
 * DISABLED on mobile to prevent display issues
 */
(function() {
  const isMobile = window.innerWidth <= 768;
  
  // Skip price animation on mobile
  if (isMobile) return;
  
  const priceElements = document.querySelectorAll('[data-price]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        const finalValue = parseInt(entry.target.textContent.replace(/[^\d]/g, ''));
        animateValue(entry.target, 0, finalValue, 1000);
      }
    });
  }, { threshold: 0.5 });
  
  function animateValue(el, start, end, duration) {
    const startTime = performance.now();
    const prefix = el.textContent.includes('৳') ? '৳' : '';
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(start + (end - start) * eased);
      
      el.textContent = prefix + toBengaliNumber(current);
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }
  
  function toBengaliNumber(num) {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(d => bengaliDigits[parseInt(d)] || d).join('');
  }
  
  priceElements.forEach(el => observer.observe(el));
})();

/**
 * Smooth scroll-linked zoom with frame-based interpolation.
 * Each product zooms in as it enters center, creating a cinematic flow.
 * 3D rotation effect for product images with --3d class.
 * DISABLED on mobile to prevent visibility issues.
 */
(function () {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tracks = document.querySelectorAll(".product-track");
  const isMobile = window.innerWidth <= 768;

  // Skip all scroll animations on mobile - products stay fully visible
  if (!tracks.length || reducedMotion || isMobile) return;

  // Store current animated values for smooth lerp
  const state = new Map();
  tracks.forEach((track) => {
    state.set(track, {
      imgScale: 0.82,
      copyScale: 0.94,
      copyY: 28,
      copyOpacity: 0.55,
      priceScale: 0.75,
      // 3D rotation values
      rotateX: 12,
      rotateY: -8,
      rotateZ: 2,
      translateZ: -60,
    });
  });
  
  // Smooth lerp factor (desktop only)
  const LERP_FACTOR = 0.08;
  const LERP_FACTOR_3D = 0.06;

  function lerp(current, target, factor) {
    return current + (target - current) * factor;
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function getTargetValues(progress) {
    // Bell curve: peaks at progress = 0.5
    const bell = Math.sin(progress * Math.PI);
    
    // 3D rotation: starts tilted, flattens at center, tilts opposite on exit
    const tiltPhase = (progress - 0.5) * 2; // -1 to 1
    
    return {
      imgScale: 0.88 + 0.26 * bell,
      copyScale: 0.96 + 0.04 * bell,
      copyY: 28 - 28 * bell,
      copyOpacity: 0.65 + 0.35 * bell,
      priceScale: 0.85 + 0.37 * bell,
      rotateX: tiltPhase * 15,
      rotateY: -tiltPhase * 12,
      rotateZ: tiltPhase * 3,
      translateZ: -Math.abs(tiltPhase) * 80 + bell * 40,
    };
  }

  function animate() {
    const vh = window.innerHeight;

    tracks.forEach((track) => {
      const rect = track.getBoundingClientRect();
      const trackHeight = track.offsetHeight;
      const scrollable = trackHeight - vh;
      if (scrollable <= 0) return;

      // Progress through this section: 0 at entry, 1 at exit
      const scrolled = -rect.top;
      let rawProgress = scrolled / scrollable;
      rawProgress = Math.max(0, Math.min(1, rawProgress));
      const progress = easeOutQuart(rawProgress);

      const targets = getTargetValues(progress);
      const current = state.get(track);

      // Smooth interpolation toward target values
      current.imgScale = lerp(current.imgScale, targets.imgScale, LERP_FACTOR);
      current.copyScale = lerp(current.copyScale, targets.copyScale, LERP_FACTOR);
      current.copyY = lerp(current.copyY, targets.copyY, LERP_FACTOR);
      current.copyOpacity = lerp(current.copyOpacity, targets.copyOpacity, LERP_FACTOR);
      current.priceScale = lerp(current.priceScale, targets.priceScale, LERP_FACTOR);
      
      // 3D values
      current.rotateX = lerp(current.rotateX, targets.rotateX, LERP_FACTOR_3D);
      current.rotateY = lerp(current.rotateY, targets.rotateY, LERP_FACTOR_3D);
      current.rotateZ = lerp(current.rotateZ, targets.rotateZ, LERP_FACTOR_3D);
      current.translateZ = lerp(current.translateZ, targets.translateZ, LERP_FACTOR_3D);

      // Apply transforms
      const visual = track.querySelector('[data-parallax="visual"]');
      const copy = track.querySelector('[data-parallax="copy"]');
      const priceEl = track.querySelector("[data-price]");
      const is3D = visual?.classList.contains("product-visual--3d");

      if (visual) {
        if (is3D) {
          // 3D transform on the container
          visual.style.transform = `scale(${current.imgScale.toFixed(4)})`;
          
          // Apply 3D rotation to the image itself
          const img = visual.querySelector("img");
          if (img) {
            const rotX = current.rotateX.toFixed(2);
            const rotY = current.rotateY.toFixed(2);
            const rotZ = current.rotateZ.toFixed(2);
            const transZ = current.translateZ.toFixed(2);
            
            img.style.transform = `
              perspective(1200px)
              rotateX(${rotX}deg)
              rotateY(${rotY}deg)
              rotateZ(${rotZ}deg)
              translateZ(${transZ}px)
            `;
            
          }
        } else {
          visual.style.transform = `scale(${current.imgScale.toFixed(4)})`;
        }
      }

      if (copy) {
        copy.style.transform = `translateY(${current.copyY.toFixed(2)}px) scale(${current.copyScale.toFixed(4)})`;
        copy.style.opacity = current.copyOpacity.toFixed(3);
      }

      if (priceEl) {
        priceEl.style.transform = `scale(${current.priceScale.toFixed(4)})`;
        const narrow = window.innerWidth <= 768;
        priceEl.style.transformOrigin = narrow
          ? "center center"
          : track.classList.contains("product-track--alt")
            ? "right center"
            : "left center";
      }
    });

    requestAnimationFrame(animate);
  }

  // Kick off continuous animation loop for smoothest feel
  requestAnimationFrame(animate);
})();

/**
 * Oryzo-style blur-to-clear glow text reveal
 * Words transition from blurry to clear with glow effect
 */
(function () {
  const scrollTexts = document.querySelectorAll("[data-scroll-text]");
  if (!scrollTexts.length) return;

  const allWords = [];
  scrollTexts.forEach((container) => {
    const words = container.querySelectorAll(".word");
    words.forEach((word) => allWords.push(word));
  });

  const totalWords = allWords.length;
  if (totalWords === 0) return;

  let currentActiveIndex = -1;

  function updateWords() {
    const scrollY = window.scrollY;
    const triggerStart = 10;
    const triggerEnd = window.innerHeight * 0.35;
    
    const scrollProgress = Math.max(0, Math.min(1, (scrollY - triggerStart) / (triggerEnd - triggerStart)));
    
    // Calculate which word should be "active" (current glowing word)
    const exactProgress = scrollProgress * totalWords;
    const activeIndex = Math.floor(exactProgress);
    
    // Only update if changed
    if (activeIndex === currentActiveIndex) return;
    currentActiveIndex = activeIndex;

    allWords.forEach((word, index) => {
      word.classList.remove("active", "past");
      
      if (index < activeIndex) {
        // Already revealed - clear but no glow
        word.classList.add("past");
      } else if (index === activeIndex) {
        // Current word - glowing
        word.classList.add("active");
      }
      // Future words stay blurry (no class)
    });
  }

  // Smooth scroll handler with RAF
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateWords();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Initial check
  updateWords();
})();

/**
 * Order Modal System
 * Handles product click, quantity selection, and order form
 */
(function () {
  const DELIVERY_CHARGE = 100;
  
  // Modal elements
  const orderModal = document.getElementById("orderModal");
  const successModal = document.getElementById("successModal");
  const modalClose = document.getElementById("modalClose");
  const successClose = document.getElementById("successClose");
  
  // Modal content elements
  const modalImage = document.getElementById("modalImage");
  const modalProductName = document.getElementById("modalProductName");
  const modalWeight = document.getElementById("modalWeight");
  const modalUnitPrice = document.getElementById("modalUnitPrice");
  const qtyInput = document.getElementById("qtyInput");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");
  const subtotal = document.getElementById("subtotal");
  const totalPrice = document.getElementById("totalPrice");
  const orderForm = document.getElementById("orderForm");
  
  // Current product data
  let currentProduct = {
    name: "",
    price: 0,
    weight: "",
    image: ""
  };
  
  // Convert number to Bengali numerals
  function toBengaliNumber(num) {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bengaliDigits[parseInt(d)]);
  }
  
  // Update price display
  function updatePrices() {
    const qty = parseInt(qtyInput.value) || 1;
    const productTotal = currentProduct.price * qty;
    const total = productTotal + DELIVERY_CHARGE;
    
    subtotal.textContent = `৳${toBengaliNumber(productTotal)}`;
    totalPrice.textContent = `৳${toBengaliNumber(total)}`;
  }
  
  // Open modal with product data
  function openModal(productEl) {
    currentProduct = {
      name: productEl.dataset.productName,
      price: parseInt(productEl.dataset.price),
      weight: productEl.dataset.weight,
      image: productEl.dataset.image
    };
    
    modalImage.src = currentProduct.image;
    modalImage.alt = currentProduct.name;
    modalProductName.textContent = currentProduct.name;
    modalWeight.textContent = currentProduct.weight;
    modalUnitPrice.textContent = `৳${toBengaliNumber(currentProduct.price)}`;
    
    qtyInput.value = 1;
    updatePrices();
    
    orderModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
  
  // Close modal
  function closeModal() {
    orderModal.classList.remove("active");
    document.body.style.overflow = "";
  }
  
  // Close success modal
  function closeSuccessModal() {
    successModal.classList.remove("active");
    document.body.style.overflow = "";
  }
  
  // Show success modal
  function showSuccess() {
    closeModal();
    setTimeout(() => {
      successModal.classList.add("active");
      document.body.style.overflow = "hidden";
    }, 200);
  }
  
  // Event listeners for buy buttons
  document.querySelectorAll("[data-buy]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const productEl = btn.closest(".product-track");
      if (productEl) {
        openModal(productEl);
      }
    });
  });
  
  // Close modal events
  modalClose?.addEventListener("click", closeModal);
  successClose?.addEventListener("click", closeSuccessModal);
  
  orderModal?.addEventListener("click", (e) => {
    if (e.target === orderModal) closeModal();
  });
  
  successModal?.addEventListener("click", (e) => {
    if (e.target === successModal) closeSuccessModal();
  });
  
  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeSuccessModal();
    }
  });
  
  // Quantity controls
  qtyMinus?.addEventListener("click", () => {
    const current = parseInt(qtyInput.value) || 1;
    if (current > 1) {
      qtyInput.value = current - 1;
      updatePrices();
    }
  });
  
  qtyPlus?.addEventListener("click", () => {
    const current = parseInt(qtyInput.value) || 1;
    if (current < 50) {
      qtyInput.value = current + 1;
      updatePrices();
    }
  });
  
  qtyInput?.addEventListener("input", () => {
    let val = parseInt(qtyInput.value) || 1;
    if (val < 1) val = 1;
    if (val > 50) val = 50;
    qtyInput.value = val;
    updatePrices();
  });
  
  // Form submission
  orderForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const customerName = document.getElementById("customerName").value;
    const customerPhone = document.getElementById("customerPhone").value;
    const customerAddress = document.getElementById("customerAddress").value;
    const qty = parseInt(qtyInput.value) || 1;
    const productTotal = currentProduct.price * qty;
    const total = productTotal + DELIVERY_CHARGE;
    
    // Create order data (you can send this to a server)
    const orderData = {
      product: currentProduct.name,
      quantity: qty,
      unitPrice: currentProduct.price,
      weight: currentProduct.weight,
      subtotal: productTotal,
      deliveryCharge: DELIVERY_CHARGE,
      total: total,
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress
      },
      orderDate: new Date().toISOString()
    };
    
    // Log order (replace with actual API call)
    console.log("Order placed:", orderData);
    
    // Reset form
    orderForm.reset();
    
    // Show success
    showSuccess();
  });
})();

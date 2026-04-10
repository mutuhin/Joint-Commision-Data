/**
 * Dried Depot - Ultra Smooth Scroll Animations
 * Using lerp interpolation for buttery smooth effects
 */

class SmoothScroll {
    constructor() {
        this.current = 0;
        this.target = 0;
        this.ease = 0.075;
        this.rafId = null;
        this.isScrolling = false;
        
        this.init();
    }
    
    init() {
        this.setupLenis();
        this.initNavbar();
        this.initProductAnimations();
        this.initParallax();
        this.initMouseEffects();
        this.initButtonEffects();
        this.animate();
    }
    
    setupLenis() {
        const wrapper = document.body;
        
        this.scrollData = {
            current: 0,
            target: 0,
            limit: document.body.scrollHeight - window.innerHeight
        };
        
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    const offset = target.getBoundingClientRect().top + window.pageYOffset - 80;
                    this.smoothScrollTo(offset);
                }
            });
        });
    }
    
    smoothScrollTo(target) {
        const start = window.pageYOffset;
        const distance = target - start;
        const duration = 1200;
        let startTime = null;
        
        const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
        
        const animation = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutQuint(progress);
            
            window.scrollTo(0, start + (distance * eased));
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };
        
        requestAnimationFrame(animation);
    }
    
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    }
    
    initNavbar() {
        const navbar = document.querySelector('.navbar');
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
            
            lastScroll = currentScroll;
        }, { passive: true });
    }
    
    initProductAnimations() {
        this.products = document.querySelectorAll('.product-showcase');
        this.productStates = new Map();
        
        this.products.forEach(product => {
            this.productStates.set(product, {
                scale: { current: 0.85, target: 0.85 },
                opacity: { current: 0, target: 0 },
                translateY: { current: 50, target: 50 },
                jarRotateX: { current: 0, target: 0 },
                jarRotateY: { current: 0, target: 0 },
                jarTranslateY: { current: 0, target: 0 },
                visible: false
            });
        });
    }
    
    updateProductAnimations() {
        const viewportHeight = window.innerHeight;
        const viewportCenter = viewportHeight / 2;
        
        this.products.forEach(product => {
            const state = this.productStates.get(product);
            const rect = product.getBoundingClientRect();
            const productCenter = rect.top + (rect.height / 2);
            
            const distanceFromCenter = viewportCenter - productCenter;
            const normalizedDistance = this.clamp(Math.abs(distanceFromCenter) / (viewportHeight * 0.6), 0, 1);
            
            const isInView = rect.top < viewportHeight && rect.bottom > 0;
            const isNearCenter = normalizedDistance < 0.5;
            
            if (isInView) {
                const easeProgress = 1 - Math.pow(normalizedDistance, 2);
                
                state.scale.target = 0.85 + (easeProgress * 0.15);
                state.opacity.target = 0.3 + (easeProgress * 0.7);
                state.translateY.target = (1 - easeProgress) * 30;
                
                state.jarTranslateY.target = Math.sin(normalizedDistance * Math.PI) * -20;
                state.jarRotateY.target = distanceFromCenter * 0.015;
                
                if (isNearCenter && !state.visible) {
                    state.visible = true;
                    product.classList.add('visible');
                }
            } else if (rect.top > viewportHeight) {
                state.scale.target = 0.85;
                state.opacity.target = 0;
                state.translateY.target = 50;
                state.visible = false;
                product.classList.remove('visible');
            }
            
            const lerpFactor = 0.08;
            state.scale.current = this.lerp(state.scale.current, state.scale.target, lerpFactor);
            state.opacity.current = this.lerp(state.opacity.current, state.opacity.target, lerpFactor);
            state.translateY.current = this.lerp(state.translateY.current, state.translateY.target, lerpFactor);
            state.jarTranslateY.current = this.lerp(state.jarTranslateY.current, state.jarTranslateY.target, lerpFactor * 0.5);
            state.jarRotateY.current = this.lerp(state.jarRotateY.current, state.jarRotateY.target, lerpFactor * 0.5);
            
            product.style.transform = `scale(${state.scale.current}) translateY(${state.translateY.current}px)`;
            product.style.opacity = state.opacity.current;
            
            const jar = product.querySelector('.product-jar');
            if (jar) {
                jar.style.transform = `translateY(${state.jarTranslateY.current}px) rotateY(${state.jarRotateY.current}deg)`;
            }
        });
    }
    
    initParallax() {
        this.parallaxElements = document.querySelectorAll('.float-item');
        this.parallaxStates = [];
        
        this.parallaxElements.forEach((el, i) => {
            this.parallaxStates.push({
                element: el,
                speed: 0.1 + (i * 0.03),
                currentY: 0,
                targetY: 0,
                currentRotation: 0,
                targetRotation: 0
            });
        });
    }
    
    updateParallax() {
        const scrolled = window.pageYOffset;
        
        this.parallaxStates.forEach((state, i) => {
            state.targetY = scrolled * state.speed;
            state.targetRotation = scrolled * 0.015 * (i % 2 === 0 ? 1 : -1);
            
            state.currentY = this.lerp(state.currentY, state.targetY, 0.05);
            state.currentRotation = this.lerp(state.currentRotation, state.targetRotation, 0.05);
            
            state.element.style.transform = `translateY(${-state.currentY}px) rotate(${state.currentRotation}deg)`;
        });
    }
    
    initMouseEffects() {
        this.products.forEach(product => {
            const jar = product.querySelector('.product-3d-container');
            if (!jar) return;
            
            let mouseState = {
                currentX: 0, targetX: 0,
                currentY: 0, targetY: 0,
                isHovering: false
            };
            
            product.addEventListener('mousemove', (e) => {
                const rect = product.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                
                mouseState.targetX = y * -15;
                mouseState.targetY = x * 20;
                mouseState.isHovering = true;
            });
            
            product.addEventListener('mouseleave', () => {
                mouseState.targetX = 0;
                mouseState.targetY = 0;
                mouseState.isHovering = false;
            });
            
            const updateMouse = () => {
                mouseState.currentX = this.lerp(mouseState.currentX, mouseState.targetX, 0.08);
                mouseState.currentY = this.lerp(mouseState.currentY, mouseState.targetY, 0.08);
                
                if (mouseState.isHovering || Math.abs(mouseState.currentX) > 0.01 || Math.abs(mouseState.currentY) > 0.01) {
                    jar.style.transform = `perspective(1000px) rotateX(${mouseState.currentX}deg) rotateY(${mouseState.currentY}deg)`;
                }
                
                requestAnimationFrame(updateMouse);
            };
            
            updateMouse();
        });
    }
    
    initButtonEffects() {
        document.querySelectorAll('.btn-add-cart').forEach(button => {
            button.addEventListener('click', function() {
                const originalContent = this.innerHTML;
                
                this.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                    this.innerHTML = `
                        <span>Added!</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                    `;
                    this.style.background = 'var(--primary)';
                }, 100);
                
                setTimeout(() => {
                    this.innerHTML = originalContent;
                    this.style.background = '';
                }, 2500);
            });
        });
    }
    
    animate() {
        this.updateProductAnimations();
        this.updateParallax();
        this.updateFadeElements();
        
        this.rafId = requestAnimationFrame(() => this.animate());
    }
    
    updateFadeElements() {
        if (!this.fadeElements) {
            this.fadeElements = document.querySelectorAll('.feature, .about-content, .contact-container');
            this.fadeStates = new Map();
            
            this.fadeElements.forEach(el => {
                this.fadeStates.set(el, {
                    opacity: { current: 0, target: 0 },
                    translateY: { current: 40, target: 40 },
                    triggered: false
                });
                el.style.opacity = '0';
                el.style.transform = 'translateY(40px)';
            });
        }
        
        const viewportHeight = window.innerHeight;
        
        this.fadeElements.forEach(el => {
            const state = this.fadeStates.get(el);
            const rect = el.getBoundingClientRect();
            
            if (rect.top < viewportHeight * 0.85 && !state.triggered) {
                state.triggered = true;
                state.opacity.target = 1;
                state.translateY.target = 0;
            }
            
            state.opacity.current = this.lerp(state.opacity.current, state.opacity.target, 0.06);
            state.translateY.current = this.lerp(state.translateY.current, state.translateY.target, 0.06);
            
            el.style.opacity = state.opacity.current;
            el.style.transform = `translateY(${state.translateY.current}px)`;
        });
    }
}

class ScrollProgress {
    constructor() {
        this.createIndicator();
        this.update();
    }
    
    createIndicator() {
        this.indicator = document.createElement('div');
        this.indicator.className = 'scroll-progress';
        this.indicator.innerHTML = '<div class="scroll-progress-bar"></div>';
        document.body.appendChild(this.indicator);
        
        const style = document.createElement('style');
        style.textContent = `
            .scroll-progress {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: rgba(0,0,0,0.1);
                z-index: 9999;
            }
            .scroll-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #2D5A27, #4A7C43);
                width: 0%;
                transition: width 0.1s ease-out;
            }
        `;
        document.head.appendChild(style);
        
        this.bar = this.indicator.querySelector('.scroll-progress-bar');
    }
    
    update() {
        const updateProgress = () => {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.pageYOffset / scrollHeight) * 100;
            this.bar.style.width = `${progress}%`;
            requestAnimationFrame(updateProgress);
        };
        updateProgress();
    }
}

class ProductSnapScroll {
    constructor() {
        this.products = document.querySelectorAll('.product-showcase');
        this.isSnapping = false;
        this.snapTimeout = null;
        this.lastScrollTime = 0;
        
        this.init();
    }
    
    init() {
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            this.lastScrollTime = Date.now();
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (Date.now() - this.lastScrollTime >= 150) {
                    this.snapToNearest();
                }
            }, 150);
        }, { passive: true });
    }
    
    snapToNearest() {
        if (this.isSnapping) return;
        
        const viewportCenter = window.innerHeight / 2;
        let nearestProduct = null;
        let nearestDistance = Infinity;
        
        this.products.forEach(product => {
            const rect = product.getBoundingClientRect();
            const productCenter = rect.top + (rect.height / 2);
            const distance = Math.abs(viewportCenter - productCenter);
            
            if (distance < nearestDistance && rect.top < window.innerHeight && rect.bottom > 0) {
                nearestDistance = distance;
                nearestProduct = product;
            }
        });
        
        if (nearestProduct && nearestDistance > 50 && nearestDistance < window.innerHeight * 0.4) {
            this.isSnapping = true;
            
            const rect = nearestProduct.getBoundingClientRect();
            const targetScroll = window.pageYOffset + rect.top - (window.innerHeight - rect.height) / 2;
            
            this.smoothScroll(targetScroll, () => {
                this.isSnapping = false;
            });
        }
    }
    
    smoothScroll(target, callback) {
        const start = window.pageYOffset;
        const distance = target - start;
        const duration = 800;
        let startTime = null;
        
        const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
        
        const animation = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            window.scrollTo(0, start + (distance * easeOutQuart(progress)));
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            } else if (callback) {
                callback();
            }
        };
        
        requestAnimationFrame(animation);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const smoothScroll = new SmoothScroll();
    const scrollProgress = new ScrollProgress();
    const productSnap = new ProductSnapScroll();
    
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
        
        document.querySelectorAll('.product-showcase').forEach((product, i) => {
            if (product.getBoundingClientRect().top < window.innerHeight) {
                setTimeout(() => {
                    product.classList.add('visible');
                }, i * 150);
            }
        });
    });
});

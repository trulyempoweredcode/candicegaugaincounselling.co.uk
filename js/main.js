/* =============================================
   MAIN JS
   Mobile nav, accordion, back-to-top, lightbox,
   form AJAX, cookie consent
   ============================================= */

(function () {
  'use strict';

  /* -----------------------------------------
     MOBILE NAVIGATION TOGGLE
     ----------------------------------------- */
  var toggle = document.querySelector('.nav__toggle');
  var mobileMenu = document.querySelector('.nav__mobile');
  var body = document.body;

  if (toggle && mobileMenu) {
    // Mobile sub-menu expand buttons
    var expandBtns = mobileMenu.querySelectorAll('.nav__mobile-expand');

    function closeMenu() {
      toggle.classList.remove('nav__toggle--open');
      mobileMenu.classList.remove('nav__mobile--open');
      mobileMenu.classList.remove('nav__mobile--from-scroll');
      body.style.overflow = '';
      toggle.setAttribute('aria-expanded', 'false');
      // Collapse all open sub-menus
      expandBtns.forEach(function (btn) {
        btn.setAttribute('aria-expanded', 'false');
        var ch = btn.closest('.nav__mobile-group').querySelector('.nav__mobile-children');
        if (ch) ch.hidden = true;
      });
    }

    toggle.addEventListener('click', function () {
      var isOpen = toggle.classList.toggle('nav__toggle--open');
      mobileMenu.classList.toggle('nav__mobile--open', isOpen);
      mobileMenu.classList.remove('nav__mobile--from-scroll');
      body.style.overflow = isOpen ? 'hidden' : '';
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    var mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(function (link) {
      // Don't close menu when clicking dropdown parent links — they toggle submenus
      if (link.closest('.nav__mobile-parent')) return;
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('nav__mobile--open')) {
        closeMenu();
        toggle.focus();
      }
    });

    var mql = window.matchMedia('(min-width: 1100px)');
    mql.addEventListener('change', function (e) {
      if (e.matches && mobileMenu.classList.contains('nav__mobile--open')) {
        closeMenu();
      }
    });

    /* -----------------------------------------
       MOBILE NAV DROPDOWNS (accordion)
       ----------------------------------------- */
    expandBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var children = btn.closest('.nav__mobile-group').querySelector('.nav__mobile-children');
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!isOpen));
        children.hidden = isOpen;
      });
    });

    // Also toggle dropdown when clicking the parent link text
    var parentLinks = mobileMenu.querySelectorAll('.nav__mobile-parent > .nav__link');
    parentLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var group = link.closest('.nav__mobile-group');
        var btn = group.querySelector('.nav__mobile-expand');
        var children = group.querySelector('.nav__mobile-children');
        if (btn && children) {
          var isOpen = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', String(!isOpen));
          children.hidden = isOpen;
        }
      });
    });
  }

  /* -----------------------------------------
     COMPACT HEADER
     Shows compact bar when scrolled past the main
     header. Full header visible when at top of page.
     ----------------------------------------- */
  var mainNav = document.querySelector('.nav, .nav--two-tier');
  var scrollNav = document.querySelector('.nav-scroll');

  if (mainNav && scrollNav) {
    var navHeight = mainNav.offsetHeight;
    var scrollToggle = scrollNav.querySelector('.nav-scroll__toggle');

    // Compact bar hamburger opens the main mobile menu
    if (scrollToggle && toggle && mobileMenu) {
      scrollToggle.addEventListener('click', function () {
        var isOpen = toggle.classList.toggle('nav__toggle--open');
        mobileMenu.classList.toggle('nav__mobile--open', isOpen);
        if (isOpen) {
          mobileMenu.classList.add('nav__mobile--from-scroll');
        } else {
          mobileMenu.classList.remove('nav__mobile--from-scroll');
        }
        body.style.overflow = isOpen ? 'hidden' : '';
        toggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    window.addEventListener('scroll', function () {
      if (window.scrollY > navHeight) {
        // Past the header — show compact bar
        scrollNav.classList.add('nav-scroll--visible');
      } else {
        // At or near top — show full header, hide compact bar
        scrollNav.classList.remove('nav-scroll--visible');
      }
    }, { passive: true });
  }

  /* -----------------------------------------
     ACCORDION
     Toggle .accordion__item--open on trigger click.
     Supports multiple independent accordions per page.
     ----------------------------------------- */
  var accordionTriggers = document.querySelectorAll('.accordion__trigger');
  accordionTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var item = trigger.closest('.accordion__item');
      var accordion = trigger.closest('.accordion');
      var isOpen = item.classList.contains('accordion__item--open');

      // Close all siblings in the same accordion
      if (accordion) {
        accordion.querySelectorAll('.accordion__item--open').forEach(function (openItem) {
          openItem.classList.remove('accordion__item--open');
          var btn = openItem.querySelector('.accordion__trigger');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        });
      }

      // Toggle clicked item (open if it was closed)
      if (!isOpen) {
        item.classList.add('accordion__item--open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* -----------------------------------------
     BACK TO TOP
     Show button after scrolling 400px.
     ----------------------------------------- */
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        backToTop.classList.add('back-to-top--visible');
      } else {
        backToTop.classList.remove('back-to-top--visible');
      }
    }, { passive: true });

    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* -----------------------------------------
     LIGHTBOX
     Click gallery item to open, click overlay
     or close button to dismiss.
     ----------------------------------------- */
  var lightbox = document.querySelector('.lightbox');
  var lightboxImg = lightbox ? lightbox.querySelector('.lightbox__img') : null;
  var lightboxClose = lightbox ? lightbox.querySelector('.lightbox__close') : null;

  if (lightbox && lightboxImg) {
    var galleryItems = document.querySelectorAll('.gallery__item');
    galleryItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var img = item.querySelector('img');
        if (img) {
          lightboxImg.src = img.src;
          lightboxImg.alt = img.alt || '';
          lightbox.classList.add('lightbox--open');
          body.style.overflow = 'hidden';
        }
      });
    });

    function closeLightbox() {
      lightbox.classList.remove('lightbox--open');
      body.style.overflow = '';
    }

    if (lightboxClose) {
      lightboxClose.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('lightbox--open')) {
        closeLightbox();
      }
    });
  }

  /* -----------------------------------------
     ANTI-SPAM: Timestamp field
     Set _t to page load time (epoch ms) so the
     server can reject instant bot submissions.
     ----------------------------------------- */
  var tsField = document.querySelector('input[name="_t"]');
  if (tsField) {
    tsField.value = Date.now().toString();
  }

  /* -----------------------------------------
     CONTACT FORM — AJAX SUBMISSION
     Posts form data via fetch, shows inline
     success/error message, no page reload.
     ----------------------------------------- */
  var contactForm = document.querySelector('.form[method="POST"]');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = contactForm.querySelector('[type="submit"]');
      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending\u2026';

      var formData = new FormData(contactForm);

      fetch(contactForm.action, {
        method: 'POST',
        body: formData
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Network response was not ok');
          contactForm.innerHTML =
            '<div class="form__success">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' +
            '<h3>Message Sent</h3>' +
            '<p>Thank you for getting in touch. We\'ll get back to you soon.</p>' +
            '</div>';
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          // Show error if not already present
          if (!contactForm.querySelector('.form__error')) {
            var err = document.createElement('p');
            err.className = 'form__error';
            err.textContent = 'Something went wrong. Please try again or email me directly.';
            submitBtn.parentNode.insertBefore(err, submitBtn);
          }
        });
    });
  }

  /* -----------------------------------------
     SCROLL REVEAL
     Fade-up sections as they enter the viewport.
     Add class="reveal" to any section element.
     ----------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px 80px 0px'
    });

    revealEls.forEach(function (el) {
      // Immediately reveal elements already in the viewport on page load
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('reveal--visible');
      } else {
        revealObserver.observe(el);
      }
    });
  } else {
    // Fallback: show everything immediately if no IntersectionObserver
    revealEls.forEach(function (el) {
      el.classList.add('reveal--visible');
    });
  }

  /* -----------------------------------------
     TESTIMONIAL CAROUSEL
     Auto-rotating testimonials with dot nav.
     ----------------------------------------- */
  var carousel = document.querySelector('.testimonial-carousel');
  if (carousel) {
    var slides = carousel.querySelectorAll('.testimonial');
    var dotsContainer = carousel.querySelector('.testimonial-carousel__nav');
    var dots = dotsContainer ? dotsContainer.querySelectorAll('.testimonial-carousel__dot') : [];
    var currentSlide = 0;
    var autoplayTimer = null;

    function showSlide(index) {
      slides.forEach(function (s, i) {
        s.classList.toggle('testimonial--active', i === index);
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('testimonial-carousel__dot--active', i === index);
      });
      currentSlide = index;
    }

    function nextSlide() {
      showSlide((currentSlide + 1) % slides.length);
    }

    function startAutoplay() {
      autoplayTimer = setInterval(nextSlide, 6000);
    }

    function resetAutoplay() {
      clearInterval(autoplayTimer);
      startAutoplay();
    }

    // Dot click handlers
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        showSlide(i);
        resetAutoplay();
      });
    });

    // Initial state and autoplay
    if (slides.length > 1) {
      showSlide(0);
      startAutoplay();
    }
  }

  /* -----------------------------------------
     SIDEBAR NAV (auto-generated, sticky)
     Container: #services-sidebar
     Tracks sections via IntersectionObserver.
     Configurable via data attributes on container:
       data-sidebar-target  — CSS selector for sections (default: '[id^="service-"]')
       data-sidebar-heading — heading text (default: 'Services')
       data-sidebar-cta-1   — "Label|href" for primary CTA (default: 'Book a Session|contact.html')
       data-sidebar-cta-2   — "Label|href" for secondary CTA (omit to hide)
     ----------------------------------------- */
  var servicesSidebar = document.getElementById('services-sidebar');
  if (servicesSidebar) {
    var targetSel = servicesSidebar.getAttribute('data-sidebar-target') || '[id^="service-"]';
    var headingText = servicesSidebar.getAttribute('data-sidebar-heading') || 'Services';
    var cta1 = servicesSidebar.getAttribute('data-sidebar-cta-1') || 'Book a Session|contact.html';
    var cta2 = servicesSidebar.getAttribute('data-sidebar-cta-2');
    var serviceSections = document.querySelectorAll(targetSel);
    if (serviceSections.length) {
      var sidebarNav = document.createElement('nav');
      sidebarNav.className = 'services-sidebar__nav';
      var sidebarHeading = document.createElement('p');
      sidebarHeading.className = 'services-sidebar__heading';
      sidebarHeading.textContent = headingText;
      sidebarNav.appendChild(sidebarHeading);

      serviceSections.forEach(function (section) {
        var h2 = section.querySelector('h2');
        if (!h2) return;
        var link = document.createElement('a');
        link.href = '#' + section.id;
        link.className = 'services-sidebar__link';
        link.textContent = h2.textContent;
        sidebarNav.appendChild(link);
      });

      servicesSidebar.appendChild(sidebarNav);

      // CTA buttons (configurable)
      if (cta1) {
        var parts1 = cta1.split('|');
        var bookBtn = document.createElement('a');
        bookBtn.href = parts1[1] || 'contact.html';
        bookBtn.className = 'btn btn--primary services-sidebar__btn';
        bookBtn.textContent = parts1[0] || 'Book a Session';
        servicesSidebar.appendChild(bookBtn);
      }

      if (cta2) {
        var parts2 = cta2.split('|');
        var priceBtn = document.createElement('a');
        priceBtn.href = parts2[1] || 'pricing.html';
        priceBtn.className = 'btn btn--secondary services-sidebar__btn';
        priceBtn.textContent = parts2[0] || 'View Pricing';
        servicesSidebar.appendChild(priceBtn);
      }

      // Active link tracking via IntersectionObserver
      var sidebarLinks = servicesSidebar.querySelectorAll('.services-sidebar__link');
      var sidebarObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            sidebarLinks.forEach(function (l) { l.classList.remove('services-sidebar__link--active'); });
            var active = servicesSidebar.querySelector('.services-sidebar__link[href="#' + entry.target.id + '"]');
            if (active) active.classList.add('services-sidebar__link--active');
          }
        });
      }, { threshold: 0.3, rootMargin: '-80px 0px -40% 0px' });
      serviceSections.forEach(function (s) { sidebarObserver.observe(s); });
    }
  }

  /* -----------------------------------------
     COOKIE CONSENT BANNER
     Show banner if not previously accepted.
     Store preference in localStorage.
     ----------------------------------------- */
  var cookieBanner = document.querySelector('.cookie-banner');
  if (cookieBanner) {
    var consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      cookieBanner.classList.add('cookie-banner--visible');
    }

    var acceptBtn = cookieBanner.querySelector('.cookie-banner__accept');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        localStorage.setItem('cookie_consent', 'accepted');
        cookieBanner.classList.remove('cookie-banner--visible');
      });
    }

    var declineBtn = cookieBanner.querySelector('.cookie-banner__decline');
    if (declineBtn) {
      declineBtn.addEventListener('click', function () {
        localStorage.setItem('cookie_consent', 'declined');
        cookieBanner.classList.remove('cookie-banner--visible');
      });
    }
  }

  /* -----------------------------------------
     PARALLAX HERO
     Applies to .hero--parallax: background drifts
     up at 40% scroll speed, content fades out.
  ----------------------------------------- */
  var parallaxHero = document.querySelector('.hero--parallax');
  if (parallaxHero) {
    var parallaxContent = parallaxHero.querySelector('.hero__content');
    var heroHeight = parallaxHero.offsetHeight;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var scrollY = window.scrollY || window.pageYOffset;
          heroHeight = parallaxHero.offsetHeight;
          if (scrollY <= heroHeight) {
            parallaxHero.style.backgroundPositionY = 'calc(50% + ' + (scrollY * 0.4) + 'px)';
            if (parallaxContent) {
              parallaxContent.style.transform = 'translateY(-' + (scrollY * 0.25) + 'px)';
              parallaxContent.style.opacity = Math.max(1 - scrollY / (heroHeight * 0.7), 0);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

})();
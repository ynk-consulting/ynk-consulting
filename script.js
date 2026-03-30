document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Scroll Header Style
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
            header.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
            header.style.background = 'rgba(255, 255, 255, 0.95)';
        }
    });

    // Smooth Scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            navLinks.classList.remove('active'); // close mobile menu if open

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 150;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Stop observing once it's visible
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-section').forEach((section) => {
        observer.observe(section);
    });

    // Initialize AOS Animation Library
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }

    // Contact Form Submission via EmailJS
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('submitMsg') || document.getElementById('form-status');

    if (contactForm) {
        console.log('Contact form detected, attaching listener...');
        contactForm.addEventListener('submit', function (event) {
            // ALWAYS prevent default first to stop page reload
            event.preventDefault(); 
            console.log('Form submission intercepted.');

            if (typeof emailjs === 'undefined') {
                const errMsg = 'Email service (EmailJS) is not loaded. Please check your internet connection or ad-blocker.';
                console.error(errMsg);
                if (formStatus) {
                    formStatus.textContent = errMsg;
                    formStatus.style.color = '#dc3545';
                    formStatus.style.display = 'block';
                } else {
                    alert(errMsg);
                }
                return;
            }

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerText : 'Submit';

            // UI Feedback: Sending state
            if (submitBtn) {
                submitBtn.innerText = 'Sending...';
                submitBtn.disabled = true;
            }
            if (formStatus) {
                formStatus.style.display = 'none';
                formStatus.textContent = '';
            }

            // Send actual email using EmailJS
            emailjs.sendForm('service_shkoh831', 'template_7bx5nlq', this)
                .then(() => {
                    console.log('SUCCESS!');
                    if (submitBtn) {
                        submitBtn.innerText = 'Sent Successfully!';
                        submitBtn.style.backgroundColor = '#28a745';
                    }
                    if (formStatus) {
                        formStatus.textContent = 'Thank you! Your message has been sent.';
                        formStatus.style.color = '#28a745';
                        formStatus.style.display = 'block';
                    }
                    contactForm.reset(); // Clear inputs

                    // Reset button after 3 seconds
                    setTimeout(() => {
                        if (submitBtn) {
                            submitBtn.innerText = originalBtnText;
                            submitBtn.style.backgroundColor = '';
                            submitBtn.disabled = false;
                        }
                    }, 3000);
                }, (error) => {
                    console.error('FAILED...', error);
                    if (submitBtn) {
                        submitBtn.innerText = 'Failed to Send';
                        submitBtn.style.backgroundColor = '#dc3545';
                        submitBtn.disabled = false;
                    }

                    if (formStatus) {
                        formStatus.textContent = 'Failed to send message: ' + (error.text || 'Unknown error');
                        formStatus.style.color = '#dc3545';
                        formStatus.style.display = 'block';
                    }

                    // Reset button after 3 seconds
                    setTimeout(() => {
                        if (submitBtn) {
                            submitBtn.innerText = originalBtnText;
                            submitBtn.style.backgroundColor = '';
                        }
                    }, 3000);
                });
        });
    }

    // Fix for hash links jumping behind header due to AOS fade-up animations
    window.addEventListener('load', () => {
        if (window.location.hash) {
            // Wait briefly for AOS and browser layout to settle natively
            setTimeout(() => {
                const target = document.querySelector(window.location.hash);
                if (target) {
                    let topOffset = 0;
                    let elem = target;
                    while (elem) {
                        topOffset += elem.offsetTop;
                        elem = elem.offsetParent;
                    }
                    const headerOffset = 150;
                    window.scrollTo({
                        top: topOffset - headerOffset,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    });
});

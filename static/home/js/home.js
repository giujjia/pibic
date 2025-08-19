document.addEventListener("DOMContentLoaded", () => {
  initializeMobileMenu()
  initializeScrollAnimations()
  initializeButtonInteractions()
  initializeAccessibility()
})

function initializeMobileMenu() {
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle")
  const navbarLinks = document.querySelector(".navbar-links")

  if (mobileMenuToggle && navbarLinks) {
    mobileMenuToggle.addEventListener("click", () => {
      navbarLinks.classList.toggle("show")

      const isExpanded = navbarLinks.classList.contains("show")
      mobileMenuToggle.setAttribute("aria-expanded", isExpanded)

      const icon = mobileMenuToggle.querySelector("i")
      if (icon) {
        icon.className = isExpanded ? "fas fa-times" : "fas fa-bars"
      }
    })

    // Close mobile menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!mobileMenuToggle.contains(e.target) && !navbarLinks.contains(e.target)) {
        navbarLinks.classList.remove("show")
        mobileMenuToggle.setAttribute("aria-expanded", "false")
        const icon = mobileMenuToggle.querySelector("i")
        if (icon) {
          icon.className = "fas fa-bars"
        }
      }
    })

    // Close mobile menu when window is resized to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) {
        navbarLinks.classList.remove("show")
        mobileMenuToggle.setAttribute("aria-expanded", "false")
        const icon = mobileMenuToggle.querySelector("i")
        if (icon) {
          icon.className = "fas fa-bars"
        }
      }
    })
  }
}

function initializeScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  // Observe feature cards for scroll animations
  const featureCards = document.querySelectorAll(".feature-card")
  featureCards.forEach((card, index) => {
    card.style.opacity = "0"
    card.style.transform = "translateY(30px)"
    card.style.transition = `opacity 0.6s ease-out ${index * 0.2}s, transform 0.6s ease-out ${index * 0.2}s`
    observer.observe(card)
  })
}

function initializeButtonInteractions() {
  const buttons = document.querySelectorAll(".button, .hero-button, .feature-button")

  buttons.forEach((button) => {
    // Add click animation
    button.addEventListener("click", function (e) {
      // Create ripple effect
      const ripple = document.createElement("span")
      const rect = this.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      ripple.style.width = ripple.style.height = size + "px"
      ripple.style.left = x + "px"
      ripple.style.top = y + "px"
      ripple.classList.add("ripple")

      this.appendChild(ripple)

      setTimeout(() => {
        ripple.remove()
      }, 600)
    })

    // Add loading state for navigation buttons
    if (button.href && !button.href.startsWith("#")) {
      button.addEventListener("click", function () {
        this.classList.add("loading")
        this.style.position = "relative"
      })
    }
  })
}

function initializeAccessibility() {
  // Add keyboard navigation for feature cards
  const featureCards = document.querySelectorAll(".feature-card")

  featureCards.forEach((card) => {
    card.setAttribute("tabindex", "0")

    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        const button = this.querySelector(".feature-button")
        if (button) {
          e.preventDefault()
          button.click()
        }
      }
    })

    // Add focus styles
    card.addEventListener("focus", function () {
      this.style.outline = "2px solid var(--primary-color)"
      this.style.outlineOffset = "2px"
    })

    card.addEventListener("blur", function () {
      this.style.outline = "none"
    })
  })

  // Improve logo accessibility
  const logoLink = document.querySelector(".logo-link")
  if (logoLink) {
    logoLink.setAttribute("aria-label", "BioMutate - Página inicial")
  }

  // Add skip to main content link
  const skipLink = document.createElement("a")
  skipLink.href = "#main-content"
  skipLink.textContent = "Pular para o conteúdo principal"
  skipLink.className = "sr-only skip-link"
  skipLink.style.position = "absolute"
  skipLink.style.top = "-40px"
  skipLink.style.left = "6px"
  skipLink.style.background = "var(--primary-color)"
  skipLink.style.color = "white"
  skipLink.style.padding = "8px"
  skipLink.style.textDecoration = "none"
  skipLink.style.borderRadius = "4px"
  skipLink.style.zIndex = "1000"

  skipLink.addEventListener("focus", function () {
    this.style.top = "6px"
  })

  skipLink.addEventListener("blur", function () {
    this.style.top = "-40px"
  })

  document.body.insertBefore(skipLink, document.body.firstChild)

  // Add main content ID
  const main = document.querySelector("main")
  if (main) {
    main.id = "main-content"
  }
}

// Add ripple effect CSS
const rippleCSS = `
.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
}

@keyframes ripple-animation {
    to {
        transform: scale(4);
        opacity: 0;
    }
}
`

const style = document.createElement("style")
style.textContent = rippleCSS
document.head.appendChild(style)

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault()
    const target = document.querySelector(this.getAttribute("href"))
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  })
})

// Add performance monitoring
if ("performance" in window) {
  window.addEventListener("load", () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType("navigation")[0]
      if (perfData.loadEventEnd - perfData.loadEventStart > 3000) {
        console.warn("Page load time is slow:", perfData.loadEventEnd - perfData.loadEventStart, "ms")
      }
    }, 0)
  })
}

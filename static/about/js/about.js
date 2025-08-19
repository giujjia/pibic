document.addEventListener("DOMContentLoaded", () => {
  initializeMobileMenu()
  initializeScrollAnimations()
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

  // Observe sections for scroll animations
  const animatedElements = document.querySelectorAll(
    ".mission-content, .feature-item, .technology-content, .contact-content",
  )

  animatedElements.forEach((element, index) => {
    element.style.opacity = "0"
    element.style.transform = "translateY(30px)"
    element.style.transition = `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s`
    observer.observe(element)
  })
}

function initializeAccessibility() {
  // Add keyboard navigation for feature items
  const featureItems = document.querySelectorAll(".feature-item")

  featureItems.forEach((item) => {
    item.setAttribute("tabindex", "0")

    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        // Add any click behavior if needed
      }
    })

    // Add focus styles
    item.addEventListener("focus", function () {
      this.style.outline = "2px solid var(--primary-color)"
      this.style.outlineOffset = "2px"
    })

    item.addEventListener("blur", function () {
      this.style.outline = "none"
    })
  })

  // Improve logo accessibility
  const logoLink = document.querySelector(".logo-link")
  if (logoLink) {
    logoLink.setAttribute("aria-label", "BioMutate - Go to homepage")
  }

  // Add skip to main content link
  const skipLink = document.createElement("a")
  skipLink.href = "#main-content"
  skipLink.textContent = "Skip to main content"
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

document.addEventListener("DOMContentLoaded", () => {
  // Global variables
  let currentData = null
  let currentSheet = "proteins"
  const visibleColumns = {}
  const activeFilters = new Set()

  // Pagination variables
  const ROWS_PER_PAGE = 50
  let currentPage = 1
  let totalPages = 1

  // DOM elements
  const uploadSection = document.getElementById("uploadSection")
  const readySection = document.getElementById("readySection")
  const tableViewerSection = document.getElementById("tableViewerSection")
  const fileUploadArea = document.getElementById("file-upload-area")
  const fileInput = document.getElementById("file-input")
  const fileInfo = document.getElementById("file-info")
  const uploadForm = document.getElementById("upload-form")
  const loadExampleBtn = document.getElementById("load-example-btn")
  const backToUploadBtn = document.getElementById("back-to-upload")

  // Filter buttons
  const addGenesBtn = document.getElementById("add-genes-btn")
  const addProteinIdBtn = document.getElementById("add-protein-id-btn")
  const removeContaminantsBtn = document.getElementById("remove-contaminants-btn")

  // Other buttons
  const downloadBtn = document.getElementById("download-btn")
  const columnsBtn = document.getElementById("columns-btn")

  // Modal elements
  const helpModal = document.getElementById("help-modal")
  const helpButton = document.getElementById("help-button")
  const closeModal = document.getElementById("close-modal")
  const columnsModal = document.getElementById("columns-modal")
  const closeColumnsModal = document.getElementById("close-columns-modal")
  const sheetSelectionModal = document.getElementById("sheet-selection-modal")
  const closeSheetSelectionModal = document.getElementById("close-sheet-selection-modal")
  const contaminantSelectionModal = document.getElementById("contaminant-selection-modal")
  const closeContaminantSelectionModal = document.getElementById("close-contaminant-selection-modal")

  // Get CSRF token
  function getCSRFToken() {
    return document.querySelector("[name=csrfmiddlewaretoken]").value
  }

  // File upload handling
  fileUploadArea.addEventListener("click", () => fileInput.click())
  fileUploadArea.addEventListener("dragover", handleDragOver)
  fileUploadArea.addEventListener("dragleave", handleDragLeave)
  fileUploadArea.addEventListener("drop", handleDrop)
  fileInput.addEventListener("change", handleFileSelect)

  function handleDragOver(e) {
    e.preventDefault()
    fileUploadArea.classList.add("dragover")
  }

  function handleDragLeave(e) {
    e.preventDefault()
    fileUploadArea.classList.remove("dragover")
  }

  function handleDrop(e) {
    e.preventDefault()
    fileUploadArea.classList.remove("dragover")
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect({ target: { files: files } })
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (file) {
      showFileInfo(file.name)
    }
  }

  function showFileInfo(fileName) {
    document.getElementById("file-name").textContent = fileName
    fileUploadArea.style.display = "none"
    fileInfo.style.display = "flex"
  }

  document.getElementById("remove-file").addEventListener("click", () => {
    fileInput.value = ""
    fileUploadArea.style.display = "flex"
    fileInfo.style.display = "none"
  })

  // Form submission
  uploadForm.addEventListener("submit", handleFormSubmit)

  async function handleFormSubmit(e) {
    e.preventDefault()

    if (!fileInput.files.length) {
      showError("Please select a file first")
      return
    }

    const formData = new FormData()
    formData.append("data_file", fileInput.files[0])
    formData.append("csrfmiddlewaretoken", getCSRFToken())

    try {
      showLoading("Processing file...", true)
      const response = await fetch("/table-viewer/upload-data/", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        currentData = result.data
        showTableViewer()
        hideLoading()
        showSuccess("File loaded successfully!")
      } else {
        showError(result.error || "Upload failed")
        hideLoading()
      }
    } catch (error) {
      showError("Upload failed: " + error.message)
      hideLoading()
    }
  }

  // Load example data
  loadExampleBtn.addEventListener("click", async () => {
    try {
      showLoading("Loading example data...", true)

      const response = await fetch("/table-viewer/load-example/", {
        method: "POST",
        headers: {
          "X-CSRFToken": getCSRFToken(),
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (result.success) {
        currentData = result.data
        showTableViewer()
        hideLoading()
        showSuccess("Example data loaded successfully!")
      } else {
        showError(result.error || "Failed to load example data")
        hideLoading()
      }
    } catch (error) {
      showError("Failed to load example data: " + error.message)
      hideLoading()
    }
  })

  // Filter functions
  addGenesBtn.addEventListener("click", () => {
    if (activeFilters.has("add-genes")) {
      showWarning("Gene information has already been added")
      return
    }
    showSheetSelectionModal("add-genes", "Select sheets to add gene information:")
  })

  addProteinIdBtn.addEventListener("click", async () => {
    if (activeFilters.has("add-protein-id")) {
      showWarning("Protein IDs have already been added")
      return
    }
    await applyFilter("/table-viewer/add-protein-id/", "Adding protein identification...", "add-protein-id")
    addProteinIdBtn.classList.add("active")
  })

  removeContaminantsBtn.addEventListener("click", () => {
    if (activeFilters.has("remove-contaminants")) {
      showWarning("Contaminants have already been removed")
      return
    }
    showContaminantSelectionModal()
  })

  // Sheet selection modal for add genes
  function showSheetSelectionModal(action, title) {
    document.getElementById("sheet-selection-title").textContent = title
    document.getElementById("sheet-selection-action").value = action

    // Clear previous selections
    document.querySelectorAll('input[name="selected-sheets"]').forEach((cb) => (cb.checked = false))

    showModal(sheetSelectionModal)
  }

  // Contaminant selection modal
  function showContaminantSelectionModal() {
    // Clear previous selections
    document.querySelectorAll('input[name="contaminant-sheets"]').forEach((cb) => (cb.checked = false))

    showModal(contaminantSelectionModal)
  }

  // Handle sheet selection confirmation
  document.getElementById("confirm-sheet-selection").addEventListener("click", async () => {
    const action = document.getElementById("sheet-selection-action").value
    const selectedSheets = Array.from(document.querySelectorAll('input[name="selected-sheets"]:checked')).map(
      (cb) => cb.value,
    )

    if (selectedSheets.length === 0) {
      showError("Please select at least one sheet")
      return
    }

    hideModal(sheetSelectionModal)

    if (action === "add-genes") {
      await applyFilterWithSheets("/table-viewer/add-genes/", "Adding gene information... It may take a while", "add-genes", selectedSheets)
      addGenesBtn.classList.add("active")
    }
  })

  // Handle contaminant removal confirmation
  document.getElementById("confirm-contaminant-removal").addEventListener("click", async () => {
    const selectedSheets = Array.from(document.querySelectorAll('input[name="contaminant-sheets"]:checked')).map(
      (cb) => cb.value,
    )

    if (selectedSheets.length === 0) {
      showError("Please select at least one sheet")
      return
    }

    hideModal(contaminantSelectionModal)

    if (confirm("Are you sure you want to remove contaminants? This action cannot be undone.")) {
      await applyFilterWithSheets(
        "/table-viewer/remove-contaminants/",
        "Removing contaminants...",
        "remove-contaminants",
        selectedSheets,
      )
      removeContaminantsBtn.classList.add("active")
    }
  })

  async function applyFilter(url, loadingMessage, filterId) {
    try {
      showLoading(loadingMessage, false)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-CSRFToken": getCSRFToken(),
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (result.success) {
        currentData = result.data
        currentPage = 1 // Reset to first page
        updateTable()
        hideLoading()
        showSuccess(result.message || "Filter applied successfully!")

        // Mark filter as active
        activeFilters.add(filterId)

        // Update visible columns for the new data structure
        Object.keys(currentData).forEach((sheet) => {
          if (!visibleColumns[sheet]) {
            visibleColumns[sheet] = {}
          }

          currentData[sheet].columns.forEach((col) => {
            if (visibleColumns[sheet][col] === undefined) {
              visibleColumns[sheet][col] = true
            }
          })
        })

        // If columns modal is open, update it
        if (columnsModal.classList.contains("active")) {
          populateColumnsModal()
        }
      } else {
        showError(result.error || "Filter operation failed")
        hideLoading()
      }
    } catch (error) {
      showError("Filter operation failed: " + error.message)
      hideLoading()
    }
  }

  async function applyFilterWithSheets(url, loadingMessage, filterId, selectedSheets) {
    try {
      showLoading(loadingMessage, false)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-CSRFToken": getCSRFToken(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheets: selectedSheets }),
      })

      const result = await response.json()

      if (result.success) {
        currentData = result.data
        currentPage = 1 // Reset to first page
        updateTable()
        hideLoading()
        showSuccess(result.message || "Filter applied successfully!")

        // Mark filter as active
        activeFilters.add(filterId)

        // Update visible columns for the new data structure
        Object.keys(currentData).forEach((sheet) => {
          if (!visibleColumns[sheet]) {
            visibleColumns[sheet] = {}
          }

          currentData[sheet].columns.forEach((col) => {
            if (visibleColumns[sheet][col] === undefined) {
              visibleColumns[sheet][col] = true
            }
          })
        })

        // If columns modal is open, update it
        if (columnsModal.classList.contains("active")) {
          populateColumnsModal()
        }
      } else {
        showError(result.error || "Filter operation failed")
        hideLoading()
      }
    } catch (error) {
      showError("Filter operation failed: " + error.message)
      hideLoading()
    }
  }

  // Download functionality
  downloadBtn.addEventListener("click", () => {
    showLoading("Preparing download...", false)
    setTimeout(() => {
      window.location.href = "/table-viewer/download/"
      hideLoading()
    }, 500)
  })

  // Sheet tabs handling
  document.querySelectorAll(".sheet-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const sheet = this.dataset.sheet
      switchSheet(sheet)
    })
  })

  function switchSheet(sheet) {
    // Update active tab
    document.querySelectorAll(".sheet-tab").forEach((tab) => {
      tab.classList.remove("active")
    })
    document.querySelector(`[data-sheet="${sheet}"]`).classList.add("active")

    currentSheet = sheet
    currentPage = 1 // Reset to first page when switching sheets
    updateTable()
  }

  // Pagination functions
  function calculatePagination() {
    if (!currentData || !currentData[currentSheet]) {
      totalPages = 1
      return
    }

    const totalRows = currentData[currentSheet].data.length
    totalPages = Math.ceil(totalRows / ROWS_PER_PAGE)

    if (currentPage > totalPages) {
      currentPage = totalPages || 1
    }
  }

  function updatePaginationControls() {
    const paginationContainer = document.getElementById("pagination-container")
    if (!paginationContainer) {
      // Create pagination container if it doesn't exist
      const tableContainer = document.querySelector(".table-container")
      const paginationDiv = document.createElement("div")
      paginationDiv.id = "pagination-container"
      paginationDiv.className = "pagination-container"
      tableContainer.appendChild(paginationDiv)
    }

    const container = document.getElementById("pagination-container")
    container.innerHTML = ""

    if (totalPages <= 1) {
      return
    }

    // Previous button
    const prevBtn = document.createElement("button")
    prevBtn.className = `pagination-btn ${currentPage === 1 ? "disabled" : ""}`
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>'
    prevBtn.disabled = currentPage === 1
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--
        updateTable()
      }
    })
    container.appendChild(prevBtn)

    // Page numbers
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, currentPage + 2)

    if (startPage > 1) {
      const firstBtn = createPageButton(1)
      container.appendChild(firstBtn)

      if (startPage > 2) {
        const ellipsis = document.createElement("span")
        ellipsis.className = "pagination-ellipsis"
        ellipsis.textContent = "..."
        container.appendChild(ellipsis)
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = createPageButton(i)
      container.appendChild(pageBtn)
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span")
        ellipsis.className = "pagination-ellipsis"
        ellipsis.textContent = "..."
        container.appendChild(ellipsis)
      }

      const lastBtn = createPageButton(totalPages)
      container.appendChild(lastBtn)
    }

    // Next button
    const nextBtn = document.createElement("button")
    nextBtn.className = `pagination-btn ${currentPage === totalPages ? "disabled" : ""}`
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>'
    nextBtn.disabled = currentPage === totalPages
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++
        updateTable()
      }
    })
    container.appendChild(nextBtn)
  }

  function createPageButton(pageNum) {
    const btn = document.createElement("button")
    btn.className = `pagination-btn ${pageNum === currentPage ? "active" : ""}`
    btn.textContent = pageNum
    btn.addEventListener("click", () => {
      currentPage = pageNum
      updateTable()
    })
    return btn
  }

  // Table management
  function showTableViewer() {
    uploadSection.style.display = "none"
    readySection.style.display = "none"
    tableViewerSection.style.display = "block"

    // Initialize visible columns for all sheets
    Object.keys(currentData).forEach((sheet) => {
      visibleColumns[sheet] = {}
      currentData[sheet].columns.forEach((col) => {
        visibleColumns[sheet][col] = true
      })
    })

    updateTable()
  }

  function updateTable() {
    if (!currentData || !currentData[currentSheet]) {
      return
    }

    calculatePagination()

    const sheetData = currentData[currentSheet]
    const tableHeader = document.getElementById("table-header")
    const tableBody = document.getElementById("table-body")
    const tableStats = document.getElementById("table-stats")

    // Clear existing content
    tableHeader.innerHTML = ""
    tableBody.innerHTML = ""

    // Get visible columns
    const columns = sheetData.columns.filter((col) => visibleColumns[currentSheet] && visibleColumns[currentSheet][col])

    // Create header
    columns.forEach((column) => {
      const th = document.createElement("th")
      th.textContent = column
      th.title = column
      tableHeader.appendChild(th)
    })

    // Calculate pagination
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE
    const endIndex = Math.min(startIndex + ROWS_PER_PAGE, sheetData.data.length)
    const pageData = sheetData.data.slice(startIndex, endIndex)

    // Create rows with fade-in animation
    pageData.forEach((row, index) => {
      const tr = document.createElement("tr")
      tr.style.opacity = "0"
      tr.style.animation = `fadeIn 0.3s ease forwards ${index * 0.01}s`

      columns.forEach((column) => {
        const td = document.createElement("td")
        const value = row[column]
        td.textContent = value !== undefined ? value : ""
        td.title = value !== undefined ? value : ""
        tr.appendChild(td)
      })

      tableBody.appendChild(tr)
    })

    // Update stats
    const visibleRows = sheetData.data.length
    const visibleCols = columns.length
    const totalCols = sheetData.columns.length

    tableStats.textContent = `Showing ${startIndex + 1}-${endIndex} of ${visibleRows} rows and ${visibleCols}/${totalCols} columns`

    // Update pagination controls
    updatePaginationControls()
  }

  // Column management
  columnsBtn.addEventListener("click", () => {
    populateColumnsModal()
    showModal(columnsModal)
  })

  function populateColumnsModal() {
    const columnsList = document.getElementById("columns-list")
    columnsList.innerHTML = ""

    if (!currentData || !currentData[currentSheet]) {
      return
    }

    const columns = currentData[currentSheet].columns

    columns.forEach((column) => {
      const div = document.createElement("div")
      div.className = "column-item"

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.id = `col-${column}`
      checkbox.checked = visibleColumns[currentSheet][column]
      checkbox.addEventListener("change", function () {
        visibleColumns[currentSheet][column] = this.checked
        updateTable()
      })

      const label = document.createElement("label")
      label.htmlFor = `col-${column}`
      label.textContent = column

      div.appendChild(checkbox)
      div.appendChild(label)
      columnsList.appendChild(div)
    })
  }

  // Column selection buttons
  document.getElementById("select-all-columns").addEventListener("click", () => {
    Object.keys(visibleColumns[currentSheet]).forEach((col) => {
      visibleColumns[currentSheet][col] = true
    })
    populateColumnsModal()
    updateTable()
  })

  document.getElementById("deselect-all-columns").addEventListener("click", () => {
    Object.keys(visibleColumns[currentSheet]).forEach((col) => {
      visibleColumns[currentSheet][col] = false
    })
    populateColumnsModal()
    updateTable()
  })

  // Modal handling
  helpButton.addEventListener("click", () => showModal(helpModal))
  closeModal.addEventListener("click", () => hideModal(helpModal))
  closeColumnsModal.addEventListener("click", () => hideModal(columnsModal))
  closeSheetSelectionModal.addEventListener("click", () => hideModal(sheetSelectionModal))
  closeContaminantSelectionModal.addEventListener("click", () => hideModal(contaminantSelectionModal))

  // Close modals when clicking outside
  ;[helpModal, columnsModal, sheetSelectionModal, contaminantSelectionModal].forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        hideModal(this)
      }
    })
  })

  // Modal utility functions
  function showModal(modal) {
    modal.style.display = "flex"
    modal.setAttribute("aria-hidden", "false")
    document.body.style.overflow = "hidden"
  }

  function hideModal(modal) {
    modal.style.display = "none"
    modal.setAttribute("aria-hidden", "true")
    document.body.style.overflow = ""
  }

  // Back to upload
  backToUploadBtn.addEventListener("click", () => {
    if (confirm("Going back to upload will discard current data. Do you want to continue?")) {
      tableViewerSection.style.display = "none"
      uploadSection.style.display = "block"
      readySection.style.display = "block"

      // Reset form
      fileInput.value = ""
      fileUploadArea.style.display = "flex"
      fileInfo.style.display = "none"

      // Clear data
      currentData = null
      activeFilters.clear()
      currentPage = 1

      // Reset filter buttons
      addGenesBtn.classList.remove("active")
      addProteinIdBtn.classList.remove("active")
      removeContaminantsBtn.classList.remove("active")
    }
  })

  // Utility functions
  function showLoading(message, showProgress = false) {
    // Create loading overlay if it doesn't exist
    let loadingOverlay = document.getElementById("loading-overlay")
    if (!loadingOverlay) {
      loadingOverlay = document.createElement("div")
      loadingOverlay.id = "loading-overlay"
      loadingOverlay.className = "loading-overlay"

      let loadingContent = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p id="loading-message">${message}</p>
            `

      if (showProgress) {
        loadingContent += `
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="loading-progress"></div>
                    </div>
                `
      }

      loadingContent += `</div>`
      loadingOverlay.innerHTML = loadingContent
      document.body.appendChild(loadingOverlay)

      if (showProgress) {
        simulateProgress()
      }
    } else {
      document.getElementById("loading-message").textContent = message

      const progressBar = document.getElementById("loading-progress")
      if (progressBar) {
        progressBar.style.width = "0%"
        if (showProgress) {
          simulateProgress()
        }
      }
    }
    loadingOverlay.style.display = "flex"
  }

  function simulateProgress() {
    const progressBar = document.getElementById("loading-progress")
    if (!progressBar) return

    let width = 0
    const interval = setInterval(() => {
      if (width >= 90) {
        clearInterval(interval)
      } else {
        width += Math.random() * 5
        progressBar.style.width = `${Math.min(width, 90)}%`
      }
    }, 300)

    // Store the interval ID to clear it when hideLoading is called
    window.currentProgressInterval = interval
  }

  function hideLoading() {
    const loadingOverlay = document.getElementById("loading-overlay")
    if (loadingOverlay) {
      // Complete the progress bar animation
      const progressBar = document.getElementById("loading-progress")
      if (progressBar) {
        progressBar.style.width = "100%"

        // Clear any existing interval
        if (window.currentProgressInterval) {
          clearInterval(window.currentProgressInterval)
        }

        // Wait for the progress bar to complete before hiding
        setTimeout(() => {
          loadingOverlay.style.display = "none"
        }, 300)
      } else {
        loadingOverlay.style.display = "none"
      }
    }
  }

  function showError(message) {
    showNotification(message, "error")
  }

  function showSuccess(message) {
    showNotification(message, "success")
  }

  function showWarning(message) {
    showNotification(message, "warning")
  }

  function showNotification(message, type) {
    // Create notification if it doesn't exist
    let notification = document.getElementById("notification")
    if (!notification) {
      notification = document.createElement("div")
      notification.id = "notification"
      notification.className = "notification"
      document.body.appendChild(notification)
    }

    // Clear any existing timeout
    if (window.notificationTimeout) {
      clearTimeout(window.notificationTimeout)
    }

    notification.textContent = message
    notification.className = `notification ${type} show`

    // Auto hide after 5 seconds
    window.notificationTimeout = setTimeout(() => {
      notification.classList.remove("show")
    }, 5000)
  }

  // Mobile menu toggle
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle")
  const navbarLinks = document.querySelector(".navbar-links")

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", () => {
      navbarLinks.classList.toggle("show")
    })
  }

  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // ESC key closes modals
    if (e.key === "Escape") {
      hideModal(helpModal)
      hideModal(columnsModal)
      hideModal(sheetSelectionModal)
      hideModal(contaminantSelectionModal)

      // Also hide any notification
      const notification = document.getElementById("notification")
      if (notification) {
        notification.classList.remove("show")
      }
    }
  })
})

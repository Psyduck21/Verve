// Gmail uses dynamic classes, but typically the toolbar at the top of an open email 
// has role="toolbar" or similar stable selectors.

function injectVerveButton() {
  // A simplified approach: look for the email action toolbar
  // In Gmail, the top toolbar when viewing an email often has the class '.iH' or '.G-tF'
  // Since Gmail classes change, a more robust approach is to find elements by aria-label 
  // or structure, but for this MVP we'll inject near the "Reply" button container.

  const toolbars = document.querySelectorAll('.iH > div')

  toolbars.forEach(toolbar => {
    // Check if we already injected to avoid duplicates
    if (toolbar.querySelector('.focal-save-btn')) return

    const btn = document.createElement('div')
    btn.className = 'T-I J-J5-Ji T-I-Js-IF focal-save-btn'
    btn.innerText = 'Save to verve'
    btn.style.marginLeft = '8px'
    btn.style.backgroundColor = '#000'
    btn.style.color = '#fff'
    btn.style.padding = '0 12px'
    btn.style.borderRadius = '4px'
    btn.style.cursor = 'pointer'

    btn.addEventListener('click', async () => {
      if (btn.innerText === 'Analyzing...') return

      const subjectEl = document.querySelector('h2.hP')
      const subject = subjectEl ? subjectEl.textContent || 'Untitled Email' : 'Untitled Email'

      const bodies = document.querySelectorAll('.a3s')
      const latestBody = bodies.length > 0 ? (bodies[bodies.length - 1] as HTMLElement).innerText || '' : ''
      const raw_content = `Subject: ${subject}\n\n${latestBody}`.replace(/\s+/g, ' ').substring(0, 5000)

      const urlMatches = window.location.hash.match(/\/([A-Za-z0-9]+)$/)
      const externalId = urlMatches ? urlMatches[1] : window.location.href

      btn.innerText = 'Analyzing...'
      btn.style.opacity = '0.7'

      chrome.runtime.sendMessage({
        type: 'EXTRACT_EMAIL_INTENT',
        payload: { raw_content, current_date_time: new Date().toString() }
      }, (aiResponse) => {
        let aiData = {}
        if (!aiResponse?.success) {
          console.error('verve AI error:', aiResponse?.error)
          // Fallback if AI fails
        } else {
          aiData = aiResponse.data
        }

        showConfirmationForm(subject, externalId, aiData, raw_content)
      })
    })

    function showConfirmationForm(subject: string, externalId: string, aiData: any, raw_content: string) {
      const existingForm = document.getElementById('focal-confirm-form')
      if (existingForm) existingForm.remove()

      const formContainer = document.createElement('div')
      formContainer.id = 'focal-confirm-form'
      formContainer.style.position = 'absolute'
      formContainer.style.zIndex = '9999'
      formContainer.style.backgroundColor = '#18181b'
      formContainer.style.color = '#fff'
      formContainer.style.padding = '16px'
      formContainer.style.borderRadius = '8px'
      formContainer.style.marginTop = '8px'
      formContainer.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
      formContainer.style.border = '1px solid #3f3f46'
      formContainer.style.display = 'flex'
      formContainer.style.flexDirection = 'column'
      formContainer.style.gap = '8px'
      formContainer.style.width = '300px'

      const headerRow = document.createElement('div')
      headerRow.style.display = 'flex'
      headerRow.style.justifyContent = 'space-between'
      headerRow.style.alignItems = 'center'
      headerRow.style.marginBottom = '4px'

      const formLabel = document.createElement('strong')
      formLabel.innerText = 'Save to verve'

      const closeBtn = document.createElement('button')
      closeBtn.type = 'button'
      closeBtn.innerText = '✕'
      closeBtn.setAttribute('aria-label', 'Close confirmation form')
      closeBtn.style.background = 'transparent'
      closeBtn.style.border = 'none'
      closeBtn.style.color = '#fff'
      closeBtn.style.cursor = 'pointer'
      closeBtn.style.fontSize = '16px'
      closeBtn.addEventListener('click', () => formContainer.remove())

      headerRow.appendChild(formLabel)
      headerRow.appendChild(closeBtn)
      formContainer.appendChild(headerRow)

      const createInput = (val: string, type: string = 'text', placeholder: string = '') => {
        const inp = document.createElement('input')
        inp.type = type
        inp.value = val || ''
        inp.placeholder = placeholder
        inp.style.padding = '8px'
        inp.style.borderRadius = '4px'
        inp.style.border = '1px solid #3f3f46'
        inp.style.backgroundColor = '#27272a'
        inp.style.color = '#fff'
        return inp
      }

      let parsedDate = ''
      let parsedTime = ''
      if (aiData?.scheduled_at) {
        const d = new Date(aiData.scheduled_at)
        if (!isNaN(d.getTime())) {
          parsedDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
          parsedTime = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
        }
      }

      const fallbackTitle = aiData?.title || `Reply: ${subject}`
      const fallbackDescription = aiData?.description || raw_content.slice(0, 1000) || 'Email task'
      const fallbackPriority = aiData?.priority || 'medium'
      const fallbackCategory = aiData?.category || 'personal'
      const fallbackDuration = typeof aiData?.estimated_duration_minutes === 'number'
        ? aiData.estimated_duration_minutes.toString()
        : '30'

      const titleInput = createInput(fallbackTitle)

      const descriptionInput = document.createElement('textarea')
      descriptionInput.value = fallbackDescription
      descriptionInput.rows = 2
      descriptionInput.style.padding = '8px'
      descriptionInput.style.borderRadius = '4px'
      descriptionInput.style.border = '1px solid #3f3f46'
      descriptionInput.style.backgroundColor = '#27272a'
      descriptionInput.style.color = '#fff'
      descriptionInput.style.resize = 'vertical'

      const dateInput = createInput(parsedDate, 'date')
      const timeInput = createInput(parsedTime, 'time')
      const durationInput = createInput(fallbackDuration, 'number')

      const createSelect = (options: string[], selectedValue: string) => {
        const sel = document.createElement('select')
        sel.style.padding = '8px'
        sel.style.borderRadius = '4px'
        sel.style.border = '1px solid #3f3f46'
        sel.style.backgroundColor = '#27272a'
        sel.style.color = '#fff'
        options.forEach(opt => {
          const optionEl = document.createElement('option')
          optionEl.value = opt
          optionEl.innerText = opt.charAt(0).toUpperCase() + opt.slice(1)
          if (opt === selectedValue) optionEl.selected = true
          sel.appendChild(optionEl)
        })
        return sel
      }

      const priorityInput = createSelect(['critical', 'high', 'medium', 'low'], fallbackPriority)
      const categoryInput = createSelect(['work', 'personal', 'health'], fallbackCategory)

      const submitBtn = document.createElement('button')
      submitBtn.innerText = 'Confirm Save'
      submitBtn.style.padding = '8px 16px'
      submitBtn.style.backgroundColor = '#10B981'
      submitBtn.style.color = '#fff'
      submitBtn.style.border = 'none'
      submitBtn.style.borderRadius = '4px'
      submitBtn.style.cursor = 'pointer'
      submitBtn.style.marginTop = '8px'

      formContainer.appendChild(document.createTextNode('Task Title'))
      formContainer.appendChild(titleInput)
      formContainer.appendChild(document.createTextNode('Summary'))
      formContainer.appendChild(descriptionInput)
      formContainer.appendChild(document.createTextNode('Priority'))
      formContainer.appendChild(priorityInput)
      formContainer.appendChild(document.createTextNode('Category'))
      formContainer.appendChild(categoryInput)
      formContainer.appendChild(document.createTextNode('Date'))
      formContainer.appendChild(dateInput)
      formContainer.appendChild(document.createTextNode('Time'))
      formContainer.appendChild(timeInput)
      formContainer.appendChild(document.createTextNode('Duration (mins)'))
      formContainer.appendChild(durationInput)
      formContainer.appendChild(submitBtn)

        // Insert relative to button container
        ; (toolbar as HTMLElement).style.position = 'relative'
      toolbar.appendChild(formContainer)

      submitBtn.addEventListener('click', () => {
        // Unscheduled emails are allowed, so we removed the strict date/time validation.

        const payload = {
          title: titleInput.value,
          description: descriptionInput.value,
          priority: priorityInput.value,
          category: categoryInput.value,
          external_provider: 'gmail',
          external_id: externalId,
          external_link: window.location.href,
          source_metadata: { original_subject: subject },
          raw_content: raw_content,
          scheduled_at: dateInput.value ? new Date(`${dateInput.value}T${timeInput.value || '09:00'}:00`).toISOString() : undefined,
          estimated_duration_minutes: parseInt(durationInput.value) || 30
        }

        submitBtn.innerText = 'Saving...'

        chrome.runtime.sendMessage({ type: 'SAVE_TO_verve', payload }, (response) => {
          if (response?.success) {
            btn.innerText = 'Saved ✓'
            btn.style.backgroundColor = '#10B981'
            formContainer.remove()
          } else {
            submitBtn.innerText = 'Failed ✗'
            submitBtn.style.backgroundColor = '#EF4444'
            console.error('Verve extension error:', response?.error)
          }

          setTimeout(() => {
            btn.innerText = 'Save to Verve'
            btn.style.backgroundColor = '#000'
            btn.style.opacity = '1'
          }, 3000)
        })
      })
    }

    toolbar.appendChild(btn)
  })
}

// Re-run injection periodically since Gmail is an SPA
setInterval(injectVerveButton, 2000)

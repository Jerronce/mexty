// Mexty Extension - Content Script
// Detect and autofill job forms, securely communicate with backend via background

const API_BASE_URL = 'https://us-central1-mexty101.cloudfunctions.net/api';

// Mapping of common form field names to profile keys
const FIELD_MAP = {
  name: ['name', 'full_name', 'fullname', 'applicant_name'],
  firstName: ['first_name', 'firstname', 'given-name', 'firstName'],
  lastName: ['last_name', 'lastname', 'family-name', 'lastName'],
  email: ['email', 'email_address'],
  phone: ['phone', 'phone_number', 'tel'],
  location: ['location', 'city', 'address', 'country'],
  portfolio: ['portfolio', 'website', 'site', 'personal_site', 'github', 'linkedin'],
  resume: ['resume', 'cv', 'upload_resume'],
  coverLetter: ['coverletter', 'cover_letter'],
  linkedin: ['linkedin', 'linkedin_url'],
  github: ['github', 'github_url']
};

// Detect if this page likely contains a job application form
function detectJobForm() {
  const keywords = ['apply', 'application', 'resume', 'cv', 'cover letter', 'job', 'position'];
  const forms = Array.from(document.forms);
  const matches = forms.filter((f) => {
    const text = (f.innerText || '').toLowerCase();
    return keywords.some((k) => text.includes(k));
  });
  return matches.length > 0 ? matches : null;
}

// Get profile data for autofill
async function getProfileData() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getFormData' }, (response) => {
      if (response && response.success) {
        resolve(response.data);
      } else {
        resolve(null);
      }
    });
  });
}

// Try to fill an element with a value
function fillElement(el, value) {
  if (!el || value == null) return false;
  const tag = el.tagName.toLowerCase();
  const type = (el.getAttribute('type') || '').toLowerCase();

  try {
    if (tag === 'input' || tag === 'textarea') {
      if (['checkbox', 'radio'].includes(type)) return false;
      el.focus();
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
      return true;
    }

    if (tag === 'select') {
      const options = Array.from(el.options);
      const match = options.find(
        (o) => o.textContent.trim().toLowerCase() === String(value).trim().toLowerCase() ||
               o.value.trim().toLowerCase() === String(value).trim().toLowerCase()
      );
      if (match) {
        el.value = match.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
  } catch (e) {
    console.warn('Fill element failed', e);
  }
  return false;
}

// Identify field type from name/id/placeholder/aria-label/label text
function identifyFieldType(el) {
  const attrs = [
    el.name,
    el.id,
    el.getAttribute('placeholder'),
    el.getAttribute('aria-label')
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  // Also check associated label
  const label = el.labels && el.labels[0] ? el.labels[0].innerText.toLowerCase() : '';
  if (label) attrs.push(label);

  for (const key in FIELD_MAP) {
    if (FIELD_MAP[key].some((k) => attrs.some((a) => a.includes(k)))) {
      return key;
    }
  }
  return null;
}

// Autofill detected forms
async function autoFillForms() {
  const forms = detectJobForm();
  if (!forms) return { success: false, reason: 'No form detected' };

  const profile = await getProfileData();
  if (!profile) return { success: false, reason: 'No profile data' };

  let filledCount = 0;

  for (const form of forms) {
    const inputs = Array.from(form.querySelectorAll('input, textarea, select'));

    for (const el of inputs) {
      const key = identifyFieldType(el);
      if (!key) continue;

      // Map profile keys
      let value = null;
      switch (key) {
        case 'name':
          value = profile.fullName || [profile.firstName, profile.lastName].filter(Boolean).join(' ');
          break;
        case 'firstName':
          value = profile.firstName;
          break;
        case 'lastName':
          value = profile.lastName;
          break;
        case 'email':
          value = profile.email;
          break;
        case 'phone':
          value = profile.phone;
          break;
        case 'location':
          value = profile.location || profile.city;
          break;
        case 'portfolio':
          value = profile.portfolio || profile.website || profile.linkedin || profile.github;
          break;
        case 'linkedin':
          value = profile.linkedin;
          break;
        case 'github':
          value = profile.github;
          break;
        default:
          break;
      }

      if (value && fillElement(el, value)) filledCount++;
    }
  }

  return { success: filledCount > 0, count: filledCount };
}

// Listen for messages from popup to trigger autofill
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autoFillForm') {
    autoFillForms().then((result) => {
      sendResponse(result);
    });
    return true;
  }
});

// Observe DOM changes to detect dynamically loaded forms (LinkedIn Easy Apply, etc.)
const observer = new MutationObserver(() => {
  const forms = detectJobForm();
  if (forms) {
    chrome.runtime.sendMessage({
      action: 'notifyUser',
      title: 'Mexty can help',
      message: 'I found a job application form. Open the popup to auto-fill.'
    });
  }
});

observer.observe(document.documentElement || document.body, {
  childList: true,
  subtree: true
});

// Utility: Inject small helper UI hint (non-invasive)
(function injectHint() {
  try {
    const hint = document.createElement('div');
    hint.style.position = 'fixed';
    hint.style.bottom = '12px';
    hint.style.right = '12px';
    hint.style.background = 'rgba(0,0,0,0.6)';
    hint.style.color = '#fff';
    hint.style.padding = '8px 10px';
    hint.style.borderRadius = '8px';
    hint.style.fontSize = '12px';
    hint.style.zIndex = '2147483647';
    hint.style.pointerEvents = 'none';
    hint.textContent = 'Mexty is active on this page';
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 3500);
  } catch (e) {}
})();

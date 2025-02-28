const API_KEY = 'YOUR API KEY OF mailslurp.com'; // Replace with your actual API key
let currentInboxId = null;

async function generateEmail() {
  try {
    const response = await fetch('https://api.mailslurp.com/inboxes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    const data = await response.json();
    currentInboxId = data.id;
    document.getElementById('emailInput').value = data.emailAddress;
    // Save using chrome.storage for extension context
    chrome.storage.local.set({ mailslurpInbox: data });
    refreshEmails();
    startAutoRefresh();
  } catch (error) {
    alert('Error generating email: ' + error.message);
  }
}

async function refreshEmails() {
  if (!currentInboxId) return;
  
  // Show loader immediately in the email list
  const emailList = document.getElementById('emailList');
  emailList.innerHTML = `
    <div style="padding: 2rem; text-align: center; color: var(--muted);">
      <i class="fas fa-inbox fa-2x"></i>
      <p>Loading emails...</p>
      <div class="loader"></div>
    </div>
  `;

  // Wait 2 seconds before fetching emails
  setTimeout(async () => {
    try {
      const response = await fetch(`https://api.mailslurp.com/inboxes/${currentInboxId}/emails`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      const emails = await response.json();
      renderEmails(emails);
    } catch (error) {
      alert('Error fetching emails: ' + error.message);
    }
  }, 2000); // 2000 milliseconds = 2 seconds
}

function renderEmails(emails) {
  const emailList = document.getElementById('emailList');
  emailList.innerHTML = '';

  if (emails.length === 0) {
    emailList.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--muted);">
        <i class="fas fa-inbox fa-2x"></i>
        <p>No emails found in inbox</p>
        <div class="loader"></div>
      </div>
    `;
    return;
  }

  emails.forEach(email => {
    const emailElement = document.createElement('div');
    emailElement.className = 'email-item';
    emailElement.innerHTML = `
      <div class="email-sender">${email.from}</div>
      <div class="email-subject">${email.subject || 'No subject'}</div>
      <div class="email-date">${new Date(email.createdAt).toLocaleString()}</div>
    `;
    emailElement.addEventListener('click', () => showEmailContent(email.id));
    emailList.appendChild(emailElement);
  });
}

async function showEmailContent(emailId) {
  // Display loader in modal until content loads
  document.getElementById('modalContent').innerHTML = '<div class="loader"></div>';
  document.getElementById('emailModal').style.display = 'flex';
  try {
    const response = await fetch(`https://api.mailslurp.com/emails/${emailId}`, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    
    const email = await response.json();
    const cleanBody = DOMPurify.sanitize(email.body || 'No content available');
    
    document.getElementById('modalContent').innerHTML = `
      <button class="back-button" id="backButton">Back</button>
      <h2 style="margin-bottom: 1rem;">${email.subject}</h2>
      <div style="margin-bottom: 1rem;">
        <strong>From:</strong> ${email.from}<br>
        <strong>Date:</strong> ${new Date(email.createdAt).toLocaleString()}
      </div>
      <hr>
      <div>${cleanBody}</div>
    `;
    
    // Attach event listener to the Back button to close the modal
    document.getElementById('backButton').addEventListener('click', () => {
      document.getElementById('emailModal').style.display = 'none';
    });
  } catch (error) {
    alert('Error loading email: ' + error.message);
  }
}

function copyEmail() {
  const email = document.getElementById('emailInput').value;
  if (!email) {
    alert("No email available to copy!");
    return;
  }
  navigator.clipboard.writeText(email)
    .then(() => alert("Email copied to clipboard!"))
    .catch(err => alert("Failed to copy email: " + err));
}

// Auto-refresh functionality
let refreshInterval;
function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  // Change auto-refresh interval from 10 seconds to 20 seconds
  refreshInterval = setInterval(refreshEmails, 20000);
}

// Close modal when clicking outside its content
document.getElementById('emailModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('emailModal')) {
    document.getElementById('emailModal').style.display = 'none';
  }
});

// Light/Dark mode toggle
function toggleTheme() {
  document.body.classList.toggle('light-mode');
  // Save preference using chrome.storage
  if (document.body.classList.contains('light-mode')) {
    chrome.storage.local.set({ theme: 'light' });
  } else {
    chrome.storage.local.set({ theme: 'dark' });
  }
}

// Set initial theme and load inbox on popup load
document.addEventListener('DOMContentLoaded', () => {
  // Attach event listeners
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('newAddress').addEventListener('click', generateEmail);
  document.getElementById('refreshEmails').addEventListener('click', refreshEmails);
  document.getElementById('copyEmail').addEventListener('click', copyEmail);

  // Load stored inbox data
  chrome.storage.local.get(['mailslurpInbox'], (result) => {
    if (result.mailslurpInbox) {
      const inbox = result.mailslurpInbox;
      currentInboxId = inbox.id;
      document.getElementById('emailInput').value = inbox.emailAddress;
      refreshEmails();
      startAutoRefresh();
    }
  });
  // Load theme preference
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme === 'light') {
      document.body.classList.add('light-mode');
    }
  });
});

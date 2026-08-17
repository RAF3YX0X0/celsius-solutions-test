/**
 * Toast Notification System
 */

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', title = '', duration = 4500) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = Icons.activity;
    if (type === 'success') iconSvg = Icons.check;
    else if (type === 'error') iconSvg = Icons.failures;
    else if (type === 'warning') iconSvg = Icons.failures;
    else if (type === 'sync') iconSvg = Icons.refresh;

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => this.dismiss(toast);

    this.container.appendChild(toast);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  },

  success(message, title = 'Success') {
    return this.show(message, 'success', title);
  },

  error(message, title = 'Error') {
    return this.show(message, 'error', title, 6000);
  },

  info(message, title = 'Notification') {
    return this.show(message, 'info', title);
  },

  warning(message, title = 'Warning') {
    return this.show(message, 'warning', title, 5000);
  },

  dismiss(toast) {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }
};

window.Toast = Toast;

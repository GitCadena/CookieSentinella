export class XSSShield {
  constructor() {
    this.init();
  }

  init() {
    this.monitorDOMChanges();
    this.interceptNetworkRequests();
  }

  monitorDOMChanges() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.scanForXSS(node);
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  scanForXSS(element) {
    const scripts = element.querySelectorAll('script');
    scripts.forEach(script => {
      if (!this.isScriptAllowed(script)) {
        script.remove();
        this.reportXSSAttempt('Inline script injection');
      }
    });

    const elementsWithEvents = element.querySelectorAll('*');
    elementsWithEvents.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on') && !this.isEventHandlerAllowed(attr.name, attr.value)) {
          el.removeAttribute(attr.name);
          this.reportXSSAttempt(`Malicious event handler: ${attr.name}`);
        }
      });
    });

    const elementsWithUrls = element.querySelectorAll('[href],[src]');
    elementsWithUrls.forEach(el => {
      const attr = el.getAttribute('href') || el.getAttribute('src');
      if (attr && attr.toLowerCase().startsWith('javascript:')) {
        el.removeAttribute('href');
        el.removeAttribute('src');
        this.reportXSSAttempt('JavaScript URL injection');
      }
    });
  }

  isScriptAllowed(script) {
    if (script.src) {
      return this.isAllowedDomain(script.src);
    }
    return false;
  }

  isEventHandlerAllowed(name, value) {
    const forbiddenPatterns = [
      /eval\(/i,
      /Function\(/i,
      /setTimeout\(/i,
      /setInterval\(/i,
      /\.innerHTML\s*=/i,
      /\.outerHTML\s*=/i
    ];
    
    return !forbiddenPatterns.some(pattern => pattern.test(value));
  }

  interceptNetworkRequests() {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      if (typeof input === 'string' && this.isMaliciousUrl(input)) {
        this.reportXSSAttempt(`Malicious fetch request to: ${input}`);
        throw new Error('Blocked potentially malicious request');
      }
      
      return originalFetch(input, init).then(response => {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          response.clone().text().then(text => {
            if (this.detectXSSInResponse(text)) {
              this.reportXSSAttempt('XSS in response');
            }
          });
        }
        return response;
      });
    };
  }

  isMaliciousUrl(url) {
    const maliciousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /eval\(/i,
      /%3Cscript%3E/i
    ];
    return maliciousPatterns.some(pattern => pattern.test(url));
  }

  detectXSSInResponse(text) {
    const xssPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /javascript:[^'"]*/i,
      /on\w+\s*=/i,
      /eval\(/i,
      /expression\(/i
    ];
    return xssPatterns.some(pattern => pattern.test(text));
  }

  reportXSSAttempt(details) {
    chrome.runtime.sendMessage({
      type: 'xss_attempt',
      details: details,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }
}
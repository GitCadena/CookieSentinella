export class BrowserFingerprint {
  constructor() {
    this.fingerprint = null;
    this.monitoringInterval = null;
    this.activeTabId = null;
    this.validUrlPatterns = [
      /^https?:\/\/(.*)/
    ];
  }

  isAccessibleUrl(url) {
    if (!url) return false;
    return this.validUrlPatterns.some(pattern => pattern.test(url));
  }

  async init(tabId) {
    this.activeTabId = tabId;
    const tabUrl = await this.getTabUrl(tabId);
    if (tabId && this.isAccessibleUrl(tabUrl)) {
      await this.initializeFingerprint();
    } else {
      console.log(`Skipping fingerprint init for URL: ${tabUrl}`);
    }
    this.startMonitoring();
  }

  async getTabUrl(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      return tab?.url;
    } catch (error) {
      console.error('Error getting tab URL:', error);
      return null;
    }
  }

  async initializeFingerprint() {
    try {
      this.fingerprint = await this.generateFingerprint();
    } catch (error) {
      console.error('Failed to initialize fingerprint:', error);
    }
  }

  async generateFingerprint() {
    try {
      // Obtener o generar un ID persistente
      let deviceId = await new Promise(resolve => {
        chrome.storage.local.get(['deviceId'], result => {
          if (result.deviceId) {
            resolve(result.deviceId);
          } else {
            const newId = crypto.getRandomValues(new Uint32Array(4)).join('-');
            chrome.storage.local.set({ deviceId: newId }, () => resolve(newId));
          }
        });
      });

      // Combinar con propiedades estables
      const data = {
        deviceId: deviceId,
        userAgent: navigator.userAgent,
        screenWidth: screen.width,
        screenHeight: screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      const hashBuffer = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(JSON.stringify(data)));
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Error generating fingerprint:', error);
      throw error;
    }
  }

  async getCurrentFingerprint() {
    if (!this.activeTabId) return null;
    return {
      fingerprint: this.fingerprint,
      tabId: this.activeTabId
    };
  }

  startMonitoring() {
    this.stopMonitoring();
    
    this.monitoringInterval = setInterval(async () => {
      if (!this.activeTabId) return;
      
      try {
        const currentFp = await this.generateFingerprint();
        if (currentFp && currentFp !== this.fingerprint) {
          await this.handleFingerprintChange(currentFp);
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 60000); // Revisar cada minuto
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async handleFingerprintChange(newFingerprint) {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Device Fingerprint Changed',
        message: 'Significant changes detected in device fingerprint.'
      });
      
      chrome.storage.local.get(['fingerprint_changes'], result => {
        const changes = result.fingerprint_changes || [];
        changes.push({
          timestamp: new Date().toISOString(),
          oldFingerprint: this.fingerprint,
          newFingerprint: newFingerprint
        });
        chrome.storage.local.set({ fingerprint_changes: changes });
      });
      
      await chrome.runtime.sendMessage({
        type: 'fingerprint_changed',
        newFingerprint,
        tabId: this.activeTabId
      });
      
      this.fingerprint = newFingerprint;
    } catch (error) {
      console.error('Error handling fingerprint change:', error);
    }
  }

  updateTabId(newTabId) {
    if (newTabId !== this.activeTabId) {
      this.activeTabId = newTabId;
      this.initializeFingerprint();
    }
  }
}
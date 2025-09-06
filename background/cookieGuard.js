import { BrowserFingerprint } from './browserFingerprint.js';

export class CookieGuard {
  constructor() {
    this.cookieHashes = new Map();
    this.fingerprint = null;
    this.init();
  }

  async init() {
    const bf = new BrowserFingerprint();
    await bf.init();
    this.fingerprint = await bf.getCurrentFingerprint();
    this.setupListeners();
    this.loadCookieHashes();
  }

  async loadCookieHashes() {
    const result = await chrome.storage.local.get(['cookie_hashes']);
    if (result.cookie_hashes) {
      this.cookieHashes = new Map(JSON.parse(result.cookie_hashes));
    }
  }

  async saveCookieHashes() {
    await chrome.storage.local.set({
      cookie_hashes: JSON.stringify(Array.from(this.cookieHashes))
    });
  }

  setupListeners() {
    chrome.cookies.onChanged.addListener(changeInfo => {
      if (!changeInfo.removed && changeInfo.cookie.name === 'MoodleSession') {
        this.validateCookieChange(changeInfo.cookie);
      } else if (changeInfo.removed && changeInfo.cookie.name === 'MoodleSession') {
        const cookieKey = this.getCookieKey(changeInfo.cookie);
        this.cookieHashes.delete(cookieKey);
        this.saveCookieHashes();
        console.log(`Cleared hash for MoodleSession on logout`);
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'verify_cookie') {
        this.verifyCookieHash(message.cookie).then(sendResponse);
        return true;
      }
    });
  }

  getCookieKey(cookie) {
    const cleanDomain = cookie.domain?.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
    return `${cookie.name}|${cleanDomain}|${cookie.path}`;
  }

  async validateCookieChange(cookie) {
    const cookieKey = this.getCookieKey(cookie);
    const storedHash = this.cookieHashes.get(cookieKey);
    
    if (!storedHash) {
      const newHash = await this.generateCookieHash(cookie);
      this.cookieHashes.set(cookieKey, newHash);
      await this.saveCookieHashes();
      console.log(`Stored new hash for MoodleSession`);
      return;
    }

    const currentHash = await this.generateCookieHash(cookie);
    if (currentHash !== storedHash) {
      this.handleCookieTampering(cookie);
    }
  }

  async generateCookieHash(cookie) {
    const cookieData = `${cookie.name}=${cookie.value}|${cookie.domain}|${cookie.path}|${this.fingerprint}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', 
      new TextEncoder().encode(cookieData));
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyCookieHash(cookie) {
    const cookieKey = this.getCookieKey(cookie);
    const storedHash = this.cookieHashes.get(cookieKey);
    if (!storedHash) return false;
    const currentHash = await this.generateCookieHash(cookie);
    return currentHash === storedHash;
  }

  async handleCookieTampering(cookie) {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Cookie Tampering Detected',
        message: `Unauthorized change in ${cookie.name} cookie`
      });

      const cleanDomain = cookie.domain?.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
      await chrome.cookies.remove({
        url: `https://${cleanDomain}${cookie.path}`,
        name: cookie.name
      });
      console.log(`Removed tampered MoodleSession cookie`);
    } catch (error) {
      console.error('Error handling tampering:', error);
    }
  }
}
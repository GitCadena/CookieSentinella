import { SecureStorage } from './secureStorage.js';

const secureStorage = new SecureStorage();

export class CookieProtector {
  constructor() {
    this.init();
    this.cookieQueue = new Map();
    this.processing = false;
  }

  async init() {
    await chrome.storage.local.set({
      protection_complete: false,
      protection_lock: null,
      session_active: false,
      last_cookie_cleanup: 0
    });
  }

  async protectCookie(cookie) {
    const stored = await chrome.storage.local.get(['protection_lock', 'session_active']);
    const now = Date.now();
    
    if (this.processing) {
      this.cookieQueue.set(now, cookie);
      return false;
    }
    
    this.processing = true;
    
    try {
      await chrome.storage.local.set({ protection_lock: now });

      if (!cookie) {
        cookie = await chrome.cookies.get({
          url: 'https://www.virtualunimayor.edu.co/virtualidad/',
          name: 'MoodleSession'
        });
        if (!cookie) {
          console.log('No MoodleSession cookie found');
          await chrome.storage.local.set({ protection_lock: null });
          this.processing = false;
          this.processQueue();
          return false;
        }
      }

      const cleanDomain = cookie.domain?.startsWith('.') ? cookie.domain.substring(1) : cookie.domain || 'www.virtualunimayor.edu.co';
      const protocol = cookie.secure ? 'https' : 'http';
      const path = cookie.path || '/virtualidad/';
      const secure = cookie.secure || true;
      const httpOnly = cookie.httpOnly || false;
      const sameSite = cookie.sameSite || 'no_restriction';

      await this.cleanAllCookies(cleanDomain, path);
      
      const realCookieDetails = {
        url: `${protocol}://${cleanDomain}${path}`,
        name: 'MoodleSession',
        value: cookie.value,
        domain: cleanDomain,
        path: path,
        secure: secure,
        httpOnly: true,
        sameSite: 'lax'
      };
      
      await chrome.cookies.set(realCookieDetails);
      await secureStorage.storeCookieValue(realCookieDetails);
      
      const fakeValue = await this.generateFakeValue();
      const fakeCookieDetails = {
        url: `${protocol}://${cleanDomain}${path}`,
        name: 'MoodleSession',
        value: fakeValue,
        domain: `.${cleanDomain}`,
        path: path,
        secure: secure,
        httpOnly: false,
        sameSite: 'none'
      };
      
      await chrome.cookies.set(fakeCookieDetails);
      
      await chrome.storage.local.set({
        protection_complete: true,
        protection_lock: null,
        session_active: true,
        last_cookie_cleanup: now,
        fake_cookie_value: fakeValue
      });

      console.log('Cookie protection completed successfully');
      return true;
    } catch (error) {
      console.error('Error protecting cookie:', error);
      await chrome.storage.local.set({ protection_lock: null });
      return false;
    } finally {
      this.processing = false;
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.cookieQueue.size > 0 && !this.processing) {
      const [timestamp, cookie] = this.cookieQueue.entries().next().value;
      this.cookieQueue.delete(timestamp);
      await this.protectCookie(cookie);
    }
  }

  async cleanAllCookies(domain, path) {
    try {
      const domains = [domain, `.${domain}`];
      for (const d of domains) {
        const cookies = await chrome.cookies.getAll({
          domain: d,
          name: 'MoodleSession'
        });
        
        cookies.sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));
        
        if (cookies.length > 1) {
          for (let i = 1; i < cookies.length; i++) {
            await chrome.cookies.remove({
              url: `https://${cookies[i].domain}${cookies[i].path}`,
              name: cookies[i].name
            });
            console.log(`Removed duplicate MoodleSession for domain ${cookies[i].domain}`);
          }
        }
      }
    } catch (error) {
      console.log('Error cleaning cookies:', error);
    }
  }

  async generateFakeValue() {
    const data = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async updateProtectedCookies(cookie) {
    const result = await chrome.storage.local.get('protected_cookies');
    const cookies = result.protected_cookies ? JSON.parse(result.protected_cookies) : [];
    const cookieKey = `${cookie.name}|${cookie.domain}|${cookie.path}`;
    const existingIndex = cookies.findIndex(([key]) => key === cookieKey);
    if (existingIndex !== -1) {
      cookies[existingIndex] = [cookieKey, cookie];
    } else {
      cookies.push([cookieKey, cookie]);
    }
    await chrome.storage.local.set({ protected_cookies: JSON.stringify(cookies) });
  }

  async validateCookies(url) {
    try {
      const cleanUrl = url.startsWith('http') ? url : `https://www.virtualunimayor.edu.co${url.startsWith('/') ? url : '/' + url}`;
      const cookies = await chrome.cookies.getAll({ url: cleanUrl });
      const moodleSession = cookies.find(c => c.name === 'MoodleSession');
      const stored = await chrome.storage.local.get(['moodleSession', 'session_active']);

      if (!moodleSession && stored.session_active) {
        await this.notifyTampering('MoodleSession cookie missing, possible tampering');
        await chrome.storage.local.set({ session_active: false });
      } else if (moodleSession && stored.moodleSession && stored.session_active) {
        const storedCookie = await secureStorage.getCookieValue();
        if (moodleSession.value === storedCookie?.value) {
          await this.notifyTampering('Real MoodleSession value detected, possible tampering');
          await this.protectCookie(null);
        }
      }
    } catch (error) {
      console.error('Error validating cookies:', error);
    }
  }

  async notifyTampering(message) {
    const now = Date.now();
    const lastNotification = (await chrome.storage.local.get('last_tamper_notification')).last_tamper_notification || 0;
    if (now - lastNotification < 15 * 60 * 1000) return;

    await chrome.storage.local.set({ last_tamper_notification: now });
    chrome.notifications.create({
      type: 'basic',
      title: 'Cookie Tampering Detected',
      message: message,
      iconUrl: chrome.runtime.getURL('icons/icon48.png')
    });
  }

  async clearValidationData() {
    try {
      const stored = await chrome.storage.local.get('moodleSession');
      if (stored.moodleSession?.attributes) {
        await this.cleanAllCookies(stored.moodleSession.attributes.domain, stored.moodleSession.attributes.path);
      }
      await chrome.storage.local.remove([
        'moodleSession',
        'cookie_access_log',
        'protection_complete',
        'protection_lock',
        'session_active',
        'last_tamper_notification',
        'fake_cookie_value'
      ]);
      await secureStorage.clearCookieValue();
      console.log('Cleared validation data');
    } catch (error) {
      console.error('Error clearing validation data:', error);
    }
  }
}
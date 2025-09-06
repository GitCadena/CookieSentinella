export class SecureStorage {
  constructor() {
    this.encryptionKey = null;
    this.init();
  }

  async init() {
    await this.generateEncryptionKey();
  }

  async generateEncryptionKey() {
    try {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(navigator.userAgent + performance.timeOrigin),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('StaticSaltForKDF'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Error generating encryption key:', error);
      throw error;
    }
  }

  async storeCookieValue(cookie) {
    try {
      if (!this.encryptionKey) {
        await this.generateEncryptionKey();
      }

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.encryptionKey,
        new TextEncoder().encode(cookie.value)
      );
      
      const encryptedValue = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      const ivBase64 = btoa(String.fromCharCode(...iv));
      
      await chrome.storage.local.set({
        moodleSession: {
          encryptedValue,
          iv: ivBase64,
          attributes: {
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expirationDate
          }
        }
      });
      console.log('Stored encrypted MoodleSession value');
    } catch (error) {
      console.error('Error storing cookie value:', error);
      throw error;
    }
  }

  async getCookieValue() {
    try {
      const result = await chrome.storage.local.get('moodleSession');
      if (!result.moodleSession || !this.encryptionKey) return null;

      const { encryptedValue, iv, attributes } = result.moodleSession;
      const encrypted = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));
      const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivArray
        },
        this.encryptionKey,
        encrypted
      );

      return {
        value: new TextDecoder().decode(decrypted),
        attributes
      };
    } catch (error) {
      console.error('Error retrieving cookie value:', error);
      return null;
    }
  }

  async clearCookieValue() {
    await chrome.storage.local.remove('moodleSession');
    console.log('Cleared stored MoodleSession value');
  }

  async rotateKeysIfNeeded() {
    const lastRotation = (await chrome.storage.local.get('lastKeyRotation')).lastKeyRotation || 0;
    if (Date.now() - lastRotation > 24 * 60 * 60 * 1000) {
      await this.generateEncryptionKey();
      await chrome.storage.local.set({ lastKeyRotation: Date.now() });
      console.log('Rotated encryption key');
    }
  }
}
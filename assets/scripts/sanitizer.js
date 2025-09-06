const HTMLSanitizer = {
  allowedTags: new Set(['a', 'b', 'blockquote', 'code', 'del', 'dd', 'dl', 'dt', 'em', 
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'img', 'kbd', 'li', 'ol', 'p', 'pre', 
    's', 'sup', 'sub', 'strong', 'strike', 'ul', 'br', 'hr', 'span', 'div']),

  allowedAttributes: {
    a: ['href', 'title', 'name', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['style', 'class', 'id']
  },

  allowedSchemes: {
    a: ['http', 'https', 'mailto', 'ftp'],
    img: ['http', 'https', 'data']
  },

  sanitize: function(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    this.sanitizeNode(doc.body);
    return doc.body.innerHTML;
  },

  sanitizeNode: function(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (!this.allowedTags.has(node.tagName.toLowerCase())) {
        node.parentNode.removeChild(node);
        return;
      }

      const allowedAttrs = this.allowedAttributes[node.tagName.toLowerCase()] || [];
      const globalAttrs = this.allowedAttributes['*'] || [];
      const allAllowedAttrs = [...allowedAttrs, ...globalAttrs];

      Array.from(node.attributes).forEach(attr => {
        const attrName = attr.name.toLowerCase();
        
        if (!allAllowedAttrs.includes(attrName)) {
          node.removeAttribute(attr.name);
          return;
        }

        if (attrName === 'href' || attrName === 'src') {
          const scheme = this.getScheme(attr.value);
          const allowedSchemes = this.allowedSchemes[node.tagName.toLowerCase()];
          
          if (!allowedSchemes || !allowedSchemes.includes(scheme)) {
            node.removeAttribute(attr.name);
          }
        }

        if (attrName === 'style') {
          this.sanitizeStyle(node);
        }
      });
    }

    Array.from(node.childNodes).forEach(child => {
      this.sanitizeNode(child);
    });
  },

  getScheme: function(url) {
    const match = url.match(/^([a-z][a-z0-9+\-.]*):/i);
    return match ? match[1].toLowerCase() : null;
  },

  sanitizeStyle: function(node) {
    const allowedProperties = [
      'color', 'background-color', 'font-weight', 'font-style', 
      'text-decoration', 'font-size', 'text-align'
    ];
    
    const style = node.getAttribute('style');
    const styles = style?.split(';').reduce((acc, rule) => {
      const [prop, value] = rule.split(':').map(s => s.trim());
      if (prop && value && allowedProperties.includes(prop.toLowerCase())) {
        acc.push(`${prop}:${value}`);
      }
      return acc;
    }, []) || [];

    if (styles.length > 0) {
      node.setAttribute('style', styles.join(';'));
    } else {
      node.removeAttribute('style');
    }
  }
};

if (typeof window !== 'undefined') {
  window.HTMLSanitizer = HTMLSanitizer;
}
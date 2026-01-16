import React, { useState } from 'react';
import { useBrand } from '../../context/BrandContext';
import { groqClient } from '../../services/GroqClient';
import { Brain, Link, FileText, Sparkles, Palette, MessageSquare, CheckSquare, Ruler } from 'lucide-react';

const BrandBrain: React.FC = () => {
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [useManualInput, setUseManualInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { brandData, setBrandData } = useBrand();

  const handleExtract = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    
    try {
      // Validate URL format
      let validUrl: URL;
      try {
        validUrl = new URL(url);
      } catch {
        throw new Error('Please enter a valid URL (e.g., https://example.com)');
      }

      // Try multiple CORS proxies in sequence
      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
      ];

      let htmlContent = '';
      let lastError = null;

      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl, {
            headers: {
              'Accept': 'application/json, text/html'
            }
          });
          
          if (!response.ok) {
            // Check for specific HTTP errors
            if (response.status === 403) {
              lastError = new Error('Website blocked the request (403 Forbidden)');
            } else if (response.status === 404) {
              lastError = new Error('Page not found (404)');
            } else {
              lastError = new Error(`HTTP ${response.status}`);
            }
            throw lastError;
          }

          // Handle different proxy response formats
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const data = await response.json();
            htmlContent = data.contents || data.data || '';
          } else {
            htmlContent = await response.text();
          }

          if (htmlContent) break; // Successfully fetched content
        } catch (err) {
          lastError = err;
          console.warn(`Proxy failed: ${proxyUrl}`, err);
          continue; // Try next proxy
        }
      }

      if (!htmlContent) {
        const is403 = lastError?.message?.includes('403');
        const errorMsg = is403
          ? `This website blocks automated requests. Click "Paste Text" above and manually copy/paste content from ${validUrl.hostname}`
          : `Unable to fetch website content. Try clicking "Paste Text" above to manually paste brand content instead.`;
        throw new Error(errorMsg);
      }

      // Extract text content from HTML (simple approach)
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const textContent = doc.body.textContent || '';

      if (!textContent.trim()) {
        throw new Error('No text content found on the page. Try a different URL.');
      }

      // Use Groq to analyze and extract brand identity
      const extractedBrandData = await groqClient.extractBrandIdentity(textContent);
      
      setBrandData(extractedBrandData);
      setLoading(false);
    } catch (err) {
      console.error('Error extracting brand data:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract brand data');
      setLoading(false);
    }
  };

  const handleManualExtract = async () => {
    if (!manualText.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      // Use Groq to analyze and extract brand identity from manual text
      const extractedBrandData = await groqClient.extractBrandIdentity(manualText);
      
      setBrandData(extractedBrandData);
      setLoading(false);
    } catch (err) {
      console.error('Error extracting brand data:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract brand data');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 'var(--spectrum-spacing-400)', fontFamily: 'adobe-clean, sans-serif' }}>
      {/* Toggle between URL and Manual input */}
      <div style={{ marginBottom: 'var(--spectrum-spacing-300)', display: 'flex', gap: 'var(--spectrum-spacing-200)', justifyContent: 'center' }}>
        <button
          onClick={() => setUseManualInput(false)}
          style={{
            padding: 'var(--spectrum-spacing-100) var(--spectrum-spacing-300)',
            fontSize: 'var(--spectrum-body-xs-text-size)',
            fontWeight: 600,
            fontFamily: 'adobe-clean, sans-serif',
            backgroundColor: !useManualInput ? '#4069FD' : 'var(--spectrum-gray-200)',
            color: !useManualInput ? '#fff' : 'var(--spectrum-gray-700)',
            border: 'none',
            borderRadius: 'var(--spectrum-corner-radius-100)',
            cursor: 'pointer',
            transition: 'all 0.13s ease-out',
          }}
        >
          <Link size={14} style={{ marginRight: '4px' }} />
          From URL
        </button>
        <button
          onClick={() => setUseManualInput(true)}
          style={{
            padding: 'var(--spectrum-spacing-100) var(--spectrum-spacing-300)',
            fontSize: 'var(--spectrum-body-xs-text-size)',
            fontWeight: 600,
            fontFamily: 'adobe-clean, sans-serif',
            backgroundColor: useManualInput ? '#4069FD' : 'var(--spectrum-gray-200)',
            color: useManualInput ? '#fff' : 'var(--spectrum-gray-700)',
            border: 'none',
            borderRadius: 'var(--spectrum-corner-radius-100)',
            cursor: 'pointer',
            transition: 'all 0.13s ease-out',
          }}
        >
          <FileText size={14} style={{ marginRight: '4px' }} />
          Paste Text
        </button>
      </div>

      {!useManualInput ? (
      <div style={{ marginBottom: 'var(--spectrum-spacing-400)' }}>
        <label style={{ 
          display: 'block',
          fontSize: 'var(--spectrum-label-text-size)',
          fontWeight: 600,
          color: 'var(--spectrum-label-color)',
          marginBottom: 'var(--spectrum-spacing-100)'
        }}>
          Website URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={loading}
          style={{
            width: '100%',
            padding: 'var(--spectrum-spacing-200)',
            fontSize: 'var(--spectrum-font-size-100)',
            fontFamily: 'adobe-clean, sans-serif',
            backgroundColor: 'var(--spectrum-background-layer-1)',
            border: '1px solid var(--spectrum-border-color)',
            borderRadius: 'var(--spectrum-corner-radius-100)',
            color: 'var(--spectrum-text-body)',
            outline: 'none',
            transition: 'border-color 0.13s ease-out',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#FA0';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--spectrum-border-color)';
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spectrum-spacing-300)' }}>
          <button
            onClick={handleExtract}
            disabled={!url || loading}
            style={{
              padding: 'var(--spectrum-spacing-200) var(--spectrum-spacing-400)',
              fontSize: 'var(--spectrum-font-size-100)',
              fontWeight: 600,
              fontFamily: 'adobe-clean, sans-serif',
              backgroundColor: loading ? 'var(--spectrum-gray-400)' : '#4069FD',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--spectrum-corner-radius-100)',
              cursor: loading || !url ? 'not-allowed' : 'pointer',
              transition: 'all 0.13s ease-out',
              opacity: loading || !url ? 0.5 : 1,
            }}
          onMouseEnter={(e) => {
            if (!loading && url) {
              e.currentTarget.style.backgroundColor = '#5078FE';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && url) {
              e.currentTarget.style.backgroundColor = '#4069FD';
            }
          }}
        >
          {loading ? (
            <>Extracting...</>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Sparkles size={16} />
              Extract Brand Data
            </span>
          )}
          </button>
        </div>
      </div>
      ) : (
      <div style={{ marginBottom: 'var(--spectrum-spacing-400)' }}>
        <label style={{ 
          display: 'block',
          fontSize: 'var(--spectrum-label-text-size)',
          fontWeight: 600,
          color: 'var(--spectrum-label-color)',
          marginBottom: 'var(--spectrum-spacing-100)'
        }}>
          Brand Text
        </label>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Paste brand guidelines, website copy, or any brand-related text here..."
          disabled={loading}
          rows={8}
          style={{
            width: '100%',
            padding: 'var(--spectrum-spacing-200)',
            fontSize: 'var(--spectrum-font-size-100)',
            fontFamily: 'adobe-clean, sans-serif',
            backgroundColor: 'var(--spectrum-background-layer-1)',
            border: '1px solid var(--spectrum-border-color)',
            borderRadius: 'var(--spectrum-corner-radius-100)',
            color: 'var(--spectrum-text-body)',
            outline: 'none',
            transition: 'border-color 0.13s ease-out',
            resize: 'vertical',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#FA0';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--spectrum-border-color)';
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spectrum-spacing-300)' }}>
          <button
            onClick={handleManualExtract}
            disabled={!manualText.trim() || loading}
            style={{
              padding: 'var(--spectrum-spacing-200) var(--spectrum-spacing-400)',
              fontSize: 'var(--spectrum-font-size-100)',
              fontWeight: 600,
              fontFamily: 'adobe-clean, sans-serif',
              backgroundColor: loading ? 'var(--spectrum-gray-400)' : '#4069FD',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--spectrum-corner-radius-100)',
              cursor: loading || !manualText.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.13s ease-out',
              opacity: loading || !manualText.trim() ? 0.5 : 1,
            }}
          onMouseEnter={(e) => {
            if (!loading && manualText.trim()) {
              e.currentTarget.style.backgroundColor = '#5078FE';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && manualText.trim()) {
              e.currentTarget.style.backgroundColor = '#4069FD';
            }
          }}
        >
          {loading ? (
            <>Extracting...</>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Sparkles size={16} />
              Extract Brand Data
            </span>
          )}
          </button>
        </div>
      </div>
      )}

      {error && (
        <div style={{
          padding: 'var(--spectrum-spacing-300)',
          backgroundColor: 'var(--spectrum-red-100)',
          border: '1px solid var(--spectrum-red-400)',
          borderRadius: 'var(--spectrum-corner-radius-100)',
          marginBottom: 'var(--spectrum-spacing-400)',
        }}>
          <p style={{ 
            margin: 0,
            fontSize: 'var(--spectrum-body-s-text-size)',
            color: 'var(--spectrum-red-900)'
          }}>
            {error}
          </p>
        </div>
      )}

      {brandData.primaryColors.length > 0 && (
        <div style={{
          padding: 'var(--spectrum-spacing-400)',
          backgroundColor: 'var(--spectrum-background-layer-2)',
          borderRadius: 'var(--spectrum-corner-radius-200)',
          border: '1px solid var(--spectrum-border-color)',
        }}>
          <h3 style={{ 
            fontSize: 'var(--spectrum-heading-l-text-size)',
            fontWeight: 700,
            color: 'var(--spectrum-heading-color)',
            margin: '0 0 var(--spectrum-spacing-300) 0',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spectrum-spacing-200)'
          }}>
            <CheckSquare size={20} color="#00719f" />
            Brand Identity Extracted
          </h3>
          
          {/* Primary Colors */}
          <div style={{ marginBottom: 'var(--spectrum-spacing-400)' }}>
            <h4 style={{ 
              fontSize: 'var(--spectrum-heading-m-text-size)',
              fontWeight: 600,
              color: 'var(--spectrum-heading-color)',
              margin: '0 0 var(--spectrum-spacing-200) 0',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spectrum-spacing-100)'
            }}>
              <Palette size={18} color="#00719f" />
              Primary Colors
            </h4>
            <div style={{ 
              display: 'flex', 
              gap: 'var(--spectrum-spacing-300)', 
              flexWrap: 'wrap' 
            }}>
              {brandData.primaryColors.map((color, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: 'var(--spectrum-spacing-100)' 
                }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: color,
                      borderRadius: 'var(--spectrum-corner-radius-100)',
                      border: '2px solid var(--spectrum-border-color)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                  <span style={{ 
                    fontSize: 'var(--spectrum-font-size-75)', 
                    color: 'var(--spectrum-text-secondary)', 
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 500
                  }}>
                    {color}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Voice */}
          {brandData.brandVoice && (
            <div style={{ marginBottom: 'var(--spectrum-spacing-400)' }}>
              <h4 style={{ 
                fontSize: 'var(--spectrum-heading-m-text-size)',
                fontWeight: 600,
                color: 'var(--spectrum-heading-color)',
                margin: '0 0 var(--spectrum-spacing-200) 0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spectrum-spacing-100)'
              }}>
                <MessageSquare size={18} color="#00719f" />
                Brand Voice
              </h4>
              <p style={{ 
                margin: 0,
                fontSize: 'var(--spectrum-body-text-size)',
                color: 'var(--spectrum-body-color)',
                lineHeight: 1.6,
                padding: 'var(--spectrum-spacing-200)',
                backgroundColor: 'var(--spectrum-background-layer-1)',
                borderRadius: 'var(--spectrum-corner-radius-100)',
                borderLeft: '3px solid #FA0'
              }}>
                {brandData.brandVoice}
              </p>
            </div>
          )}

          {/* Design Guidelines */}
          {brandData.designGuidelines.length > 0 && (
            <div>
              <h4 style={{ 
                fontSize: 'var(--spectrum-heading-m-text-size)',
                fontWeight: 600,
                color: 'var(--spectrum-heading-color)',
                margin: '0 0 var(--spectrum-spacing-200) 0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spectrum-spacing-100)'
              }}>
                <Ruler size={18} color="#00719f" />
                Design Guidelines
              </h4>
              <ul style={{ 
                margin: 0,
                paddingLeft: 'var(--spectrum-spacing-400)',
                fontSize: 'var(--spectrum-body-text-size)',
                color: 'var(--spectrum-body-color)',
                lineHeight: 1.8
              }}>
                {brandData.designGuidelines.map((guideline, index) => (
                  <li key={index} style={{ marginBottom: 'var(--spectrum-spacing-100)' }}>
                    {guideline}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandBrain;

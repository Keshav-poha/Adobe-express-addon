import React, { useState, useEffect } from 'react';
import { useBrand } from '../../context/BrandContext';
import { groqClient, VisionAnalysis } from '../../services/GroqClient';
import { Search, BarChart3, Lightbulb, Sparkles, Upload, Lock, Crown } from 'lucide-react';
import { ProgressCircle } from './LoadingComponents';
import addOnUISdk from "https://express.adobe.com/static/add-on-sdk/sdk.js";
import { useLanguage } from '../../context/LanguageContext';

const DesignAuditor: React.FC = () => {
  const { t, language } = useLanguage();
  const { brandData, hasBrandData } = useBrand();
  const [auditing, setAuditing] = useState(false);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPremiumUser, setIsPremiumUser] = useState<boolean | null>(null);
  const [checkingPremium, setCheckingPremium] = useState(true);

  // Check premium status on component mount
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        const premium = await addOnUISdk.app.currentUser.isPremiumUser();
        setIsPremiumUser(premium);
      } catch (error) {
        console.error('Error checking premium status:', error);
        // Default to non-premium if check fails
        setIsPremiumUser(false);
      } finally {
        setCheckingPremium(false);
      }
    };

    checkPremiumStatus();
  }, []);

  const handleUpgrade = async () => {
    try {
      const hasUpgraded = await addOnUISdk.app.startPremiumUpgradeIfFreeUser();
      if (hasUpgraded) {
        // User upgraded successfully, update premium status
        setIsPremiumUser(true);
      }
    } catch (error) {
      console.error('Error during upgrade flow:', error);
    }
  };

  // Helper function to resize image to reduce payload size
  const resizeImage = async (blob: Blob, maxWidth: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with quality compression
        canvas.toBlob(
          (resizedBlob) => {
            if (!resizedBlob) {
              reject(new Error('Failed to create resized blob'));
              return;
            }
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              URL.revokeObjectURL(url);
              resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read resized image'));
            reader.readAsDataURL(resizedBlob);
          },
          'image/jpeg',
          0.85 // 85% quality for good balance between quality and size
        );
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  };

  const runAudit = async () => {
    // Check premium status before running audit
    if (!isPremiumUser) {
      setError('Design Audit is a premium feature. Please upgrade to Adobe Express Premium to use this feature.');
      return;
    }
    
    if (!hasBrandData) {
      setError(t('extractFirst'));
      return;
    }

    setAuditing(true);
    setAnalysis(null);
    setError(null);

    try {
      // Create rendition of current page
      const renditions = await addOnUISdk.app.document.createRenditions({
        range: addOnUISdk.constants.Range.currentPage,
        format: addOnUISdk.constants.RenditionFormat.png,
      });

      if (renditions.length === 0) {
        throw new Error('No rendition created');
      }

      const rendition = renditions[0];
      const blob = rendition.blob;

      // Resize and compress image to avoid 413 errors
      const base64 = await resizeImage(blob, 1024);

      // Check if page has any content
      if (!base64 || base64.length < 100) {
        throw new Error('Page appears empty. Add some content before running design audit.');
      }

      // Analyze with Groq Vision
      const visionAnalysis = await groqClient.analyzeDesign(base64, brandData, language);
      
      // Validate analysis returned
      if (!visionAnalysis) {
        throw new Error('Design review service is currently unavailable. Please try again later.');
      }
      
      setAnalysis(visionAnalysis);
    } catch (error) {
      console.error('Error running audit:', error);
      
      // Provide specific error messages
      let errorMessage = 'Failed to run audit. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('unavailable') || error.message.includes('service')) {
          errorMessage = 'Design review service is temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('empty')) {
          errorMessage = error.message;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('413') || error.message.includes('too large') || error.message.includes('request_too_large')) {
          errorMessage = 'Design is too complex to analyze. Try simplifying your design or analyzing a smaller section.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setAuditing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4069FD'; // Primary Blue
    if (score >= 75) return '#00719f'; // Accent Teal
    if (score >= 60) return '#FA0'; // Yellow/Orange
    return '#5078FE'; // Light Blue
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Work';
  };

  const metrics = analysis
    ? [
        { label: t('colorConsistency'), score: analysis.colorConsistency },
        { label: t('typographyScale'), score: analysis.typographyScale },
        { label: t('spacingRhythm'), score: analysis.spacingRhythm },
        { label: t('accessibility'), score: analysis.accessibility },
      ]
    : [];

  return (
    <div style={{ padding: 'var(--spectrum-spacing-400)', fontFamily: 'adobe-clean, sans-serif' }}>

      {/* Loading Premium Status */}
      {checkingPremium && (
        <div style={{ textAlign: 'center', padding: 'var(--spectrum-spacing-600)' }}>
          <ProgressCircle size="medium" label="Checking access..." />
        </div>
      )}

      {/* Premium Paywall */}
      {!checkingPremium && !isPremiumUser && (
        <div style={{
          padding: 'var(--spectrum-spacing-600)',
          backgroundColor: 'var(--spectrum-background-layer-2)',
          borderRadius: 'var(--spectrum-corner-radius-200)',
          border: '2px solid #FA0',
          textAlign: 'center',
          marginBottom: 'var(--spectrum-spacing-400)',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#4069FD',
            marginBottom: 'var(--spectrum-spacing-400)',
          }}>
            <Crown size={32} color="#fff" />
          </div>
          
          <h2 className="spectrum-heading-l" style={{
            margin: '0 0 var(--spectrum-spacing-200) 0',
            color: 'var(--spectrum-heading-color)',
          }}>
            Premium Feature
          </h2>
          
          <p style={{
            fontSize: 'var(--spectrum-body-text-size)',
            color: 'var(--spectrum-body-color)',
            lineHeight: 1.6,
            marginBottom: 'var(--spectrum-spacing-400)',
            maxWidth: '400px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Design Audit is a premium feature that uses advanced AI to analyze your designs against brand guidelines and provide actionable feedback.
          </p>

          <div style={{
            backgroundColor: 'var(--spectrum-background-layer-1)',
            borderRadius: 'var(--spectrum-corner-radius-100)',
            padding: 'var(--spectrum-spacing-400)',
            marginBottom: 'var(--spectrum-spacing-500)',
            textAlign: 'left',
          }}>
            <p style={{
              fontSize: 'var(--spectrum-body-s-text-size)',
              color: 'var(--spectrum-body-color)',
              fontWeight: 600,
              marginBottom: 'var(--spectrum-spacing-200)',
            }}>
              What you'll get with Premium:
            </p>
            <ul style={{
              margin: 0,
              paddingLeft: 'var(--spectrum-spacing-400)',
              fontSize: 'var(--spectrum-body-s-text-size)',
              color: 'var(--spectrum-body-color)',
              lineHeight: 1.8,
            }}>
              <li>AI-powered design analysis</li>
              <li>Brand consistency scoring</li>
              <li>Detailed recommendations</li>
              <li>Accessibility insights</li>
              <li>Typography & spacing evaluation</li>
            </ul>
          </div>

          <button
            onClick={handleUpgrade}
            style={{
              padding: 'var(--spectrum-spacing-300) var(--spectrum-spacing-600)',
              fontSize: 'var(--spectrum-font-size-200)',
              fontWeight: 700,
              fontFamily: 'adobe-clean, sans-serif',
              backgroundColor: '#4069FD',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--spectrum-corner-radius-100)',
              cursor: 'pointer',
              transition: 'all 0.13s ease-out',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spectrum-spacing-200)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5078FE';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4069FD';
            }}
          >
            <Crown size={18} />
            Upgrade to Premium
          </button>

          <p style={{
            fontSize: 'var(--spectrum-body-xs-text-size)',
            color: 'var(--spectrum-gray-600)',
            marginTop: 'var(--spectrum-spacing-300)',
            marginBottom: 0,
          }}>
            Unlock all premium features with Adobe Express Premium
          </p>
        </div>
      )}

      {/* Main Content - Only show if premium user */}
      {!checkingPremium && isPremiumUser && (
        <>
      {/* Error Display */}
      {error && (
        <div style={{
          padding: 'var(--spectrum-spacing-300)',
          backgroundColor: 'var(--spectrum-background-layer-2)',
          border: '1px solid var(--spectrum-negative-color)',
          borderRadius: 'var(--spectrum-corner-radius-100)',
          marginBottom: 'var(--spectrum-spacing-400)',
        }}>
          <p style={{ 
            margin: 0,
            fontSize: 'var(--spectrum-font-size-100)',
            color: 'var(--spectrum-negative-color)',
            fontWeight: 500
          }}>
            {error}
          </p>
        </div>
      )}

      {/* Brand Context Display */}
      {hasBrandData && (
        <div style={{
          padding: 'var(--spectrum-spacing-300)',
          backgroundColor: 'var(--spectrum-background-layer-2)',
          borderRadius: 'var(--spectrum-corner-radius-100)',
          border: '1px solid var(--spectrum-border-color)',
          marginBottom: 'var(--spectrum-spacing-400)'
        }}>
          <h3 className="spectrum-heading-m" style={{ 
            margin: '0 0 var(--spectrum-spacing-200) 0'
          }}>
            {t('auditingBrand')}
          </h3>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spectrum-spacing-200)',
            flexWrap: 'wrap'
          }}>
            <span style={{ 
              fontSize: 'var(--spectrum-body-s-text-size)',
              color: 'var(--spectrum-body-color)',
              fontWeight: 600
            }}>
              Colors:
            </span>
            <div style={{ display: 'flex', gap: 'var(--spectrum-spacing-75)' }}>
              {brandData.primaryColors.slice(0, 5).map((color, index) => (
                <div
                  key={index}
                  title={color}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: color,
                    borderRadius: '4px',
                    border: '1px solid var(--spectrum-border-color)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Run Audit Button */}
      <button
        onClick={runAudit}
        disabled={!hasBrandData || auditing}
        style={{
          width: '100%',
          padding: 'var(--spectrum-spacing-300) var(--spectrum-spacing-400)',
          fontSize: 'var(--spectrum-font-size-200)',
          fontWeight: 700,
          fontFamily: 'adobe-clean, sans-serif',
          backgroundColor: auditing ? 'var(--spectrum-gray-400)' : '#4069FD',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--spectrum-corner-radius-100)',
          cursor: !hasBrandData || auditing ? 'not-allowed' : 'pointer',
          transition: 'all 0.13s ease-out',
          opacity: !hasBrandData || auditing ? 0.5 : 1,
          marginBottom: 'var(--spectrum-spacing-400)',
        }}
        onMouseEnter={(e) => {
          if (hasBrandData && !auditing) {
            e.currentTarget.style.backgroundColor = '#5078FE';
          }
        }}
        onMouseLeave={(e) => {
          if (hasBrandData && !auditing) {
            e.currentTarget.style.backgroundColor = '#4069FD';
          }
        }}
      >
        {auditing ? (
          <>{t('analyzing')}</>
        ) : (
          <>
            <Search size={18} />
            {t('runAudit')}
          </>
        )}
      </button>

      {/* Loading State */}
      {auditing && (
        <div style={{ textAlign: 'center', padding: 'var(--spectrum-spacing-600)' }}>
          <ProgressCircle size="medium" label={t('analyzingDesign')} />
        </div>
      )}

      {/* Analysis Results */}
      {!auditing && analysis && (
        <div style={{
          padding: 'var(--spectrum-spacing-400)',
          backgroundColor: 'var(--spectrum-background-layer-2)',
          borderRadius: 'var(--spectrum-corner-radius-200)',
          border: '2px solid #FA0',
        }}>
          {/* Overall Score */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: 'var(--spectrum-spacing-500)',
            padding: 'var(--spectrum-spacing-400)',
            backgroundColor: 'var(--spectrum-background-layer-1)',
            borderRadius: 'var(--spectrum-corner-radius-100)',
          }}>
            <div style={{ 
              fontSize: '64px', 
              fontWeight: 800, 
              color: getScoreColor(analysis.score),
              lineHeight: 1,
              marginBottom: 'var(--spectrum-spacing-100)'
            }}>
              {analysis.score}
            </div>
            <p style={{ 
              fontSize: 'var(--spectrum-body-l-text-size)',
              color: 'var(--spectrum-body-color)',
              fontWeight: 600,
              margin: '0 0 var(--spectrum-spacing-75) 0'
            }}>
              {t('overallScore')}
            </p>
            <span style={{
              display: 'inline-block',
              padding: 'var(--spectrum-spacing-75) var(--spectrum-spacing-300)',
              backgroundColor: getScoreColor(analysis.score),
              color: '#fff',
              borderRadius: 'var(--spectrum-corner-radius-100)',
              fontSize: 'var(--spectrum-body-s-text-size)',
              fontWeight: 700,
            }}>
              {getScoreLabel(analysis.score)}
            </span>
          </div>

          {/* Detailed Metrics */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'var(--spectrum-spacing-300)',
            marginBottom: 'var(--spectrum-spacing-400)'
          }}>
            <h3 className="spectrum-heading-l" style={{ 
              margin: '0 0 var(--spectrum-spacing-200) 0',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spectrum-spacing-100)'
            }}>
              <BarChart3 size={20} color="#00719f" />
              {t('detailedMetrics')}
            </h3>
            {metrics.map((metric, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--spectrum-spacing-300)',
                  backgroundColor: 'var(--spectrum-background-layer-1)',
                  borderRadius: 'var(--spectrum-corner-radius-100)',
                  border: '1px solid var(--spectrum-border-color)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ 
                    fontSize: 'var(--spectrum-body-text-size)', 
                    color: 'var(--spectrum-body-color)',
                    fontWeight: 600
                  }}>
                    {metric.label}
                  </span>
                  <div style={{
                    marginTop: 'var(--spectrum-spacing-100)',
                    height: '6px',
                    backgroundColor: 'var(--spectrum-gray-200)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    width: '100%',
                    maxWidth: '200px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${metric.score}%`,
                      backgroundColor: getScoreColor(metric.score),
                      transition: 'width 0.3s ease-out'
                    }} />
                  </div>
                </div>
                <span style={{ 
                  fontSize: 'var(--spectrum-heading-m-text-size)', 
                  fontWeight: 700, 
                  color: getScoreColor(metric.score),
                  marginLeft: 'var(--spectrum-spacing-300)'
                }}>
                  {metric.score}
                </span>
              </div>
            ))}
          </div>

          {/* Feedback */}
          {analysis.feedback.length > 0 && (
            <div style={{ marginBottom: 'var(--spectrum-spacing-400)' }}>
              <h3 className="spectrum-heading-l" style={{ 
                margin: '0 0 var(--spectrum-spacing-200) 0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spectrum-spacing-100)'
              }}>
                <Lightbulb size={20} color="#00719f" />
                Feedback
              </h3>
              <ul style={{ 
                margin: 0,
                paddingLeft: 'var(--spectrum-spacing-400)',
                fontSize: 'var(--spectrum-body-text-size)',
                color: 'var(--spectrum-body-color)',
                lineHeight: 1.8
              }}>
                {analysis.feedback.map((item, index) => (
                  <li key={index} style={{ marginBottom: 'var(--spectrum-spacing-100)' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h3 className="spectrum-heading-l" style={{ 
                margin: '0 0 var(--spectrum-spacing-200) 0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spectrum-spacing-100)'
              }}>
                <Sparkles size={20} color="#00719f" />
                Recommendations
              </h3>
              <ul style={{ 
                margin: 0,
                paddingLeft: 'var(--spectrum-spacing-400)',
                fontSize: 'var(--spectrum-body-text-size)',
                color: 'var(--spectrum-body-color)',
                lineHeight: 1.8
              }}>
                {analysis.recommendations.map((item, index) => (
                  <li key={index} style={{ marginBottom: 'var(--spectrum-spacing-100)' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default DesignAuditor;

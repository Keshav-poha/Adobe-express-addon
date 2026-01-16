import React, { useState } from 'react';
import { useBrand } from '../../context/BrandContext';
import { groqClient } from '../../services/GroqClient';
import { TrendingUp, Sparkles, Copy, Palette } from 'lucide-react';

const TrendEngine: React.FC = () => {
  const { brandData, hasBrandData } = useBrand();
  const [selectedTrend, setSelectedTrend] = useState<string>('');
  const [selectedViralStyle, setSelectedViralStyle] = useState<string>('');
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);

  const viralStyles = [
    { id: 'none', name: 'No Viral Style', desc: 'Standard design without viral elements' },
    { id: 'republic-day', name: 'Republic Day', desc: 'Patriotic tricolor, unity messaging, "Celebrating 77 years of democracy"' },
    { id: 'lohri', name: 'Lohri Festival', desc: 'Bonfire imagery, harvest celebration, warm tones' },
    { id: 'valentines', name: 'Valentine\'s Day', desc: 'Romantic themes, self-love narrative, modern hearts' },
    { id: 'holi', name: 'Holi Festival', desc: 'Color explosions, playful energy, togetherness hook' },
    { id: 'pov-story', name: 'POV Story', desc: 'Point-of-view narrative, first-person perspective, relatable hooks' },
    { id: 'before-after', name: 'Before/After', desc: 'Transformation reveal, side-by-side comparison, dramatic contrast' },
    { id: 'tutorial', name: 'Tutorial Aesthetic', desc: 'Step-by-step visual, educational tone, clear progression' },
    { id: 'cinematic', name: 'Cinematic', desc: 'Film-grade lighting, dramatic depth, movie poster vibes' },
    { id: 'trending-audio', name: 'Audio-First', desc: 'Beat-synced visuals, rhythm patterns, music video style' },
  ];

  const trends = [
    { 
      id: 'minimalist', 
      title: 'Minimalist', 
      desc: 'Clean, simple designs with plenty of white space'
    },
    { 
      id: 'bold-typography', 
      title: 'Bold Typography', 
      desc: 'Make a statement with large, impactful text'
    },
    { 
      id: 'gradient', 
      title: 'Gradient Fusion', 
      desc: 'Modern color blends and smooth transitions'
    },
    { 
      id: 'vintage', 
      title: 'Vintage Revival', 
      desc: 'Retro aesthetics with a modern twist'
    },
    { 
      id: 'abstract', 
      title: 'Abstract Art', 
      desc: 'Creative shapes and experimental compositions'
    },
    { 
      id: '3d', 
      title: '3D Elements', 
      desc: 'Depth and dimension with realistic renders'
    },
  ];

  const handleGeneratePrompt = async () => {
    if (!hasBrandData) {
      alert('Please extract brand data first in the Brand Brain tab!');
      return;
    }

    if (!selectedTrend) {
      alert('Please select a trend style first!');
      return;
    }

    setGeneratingPrompt(true);
    setGeneratedPrompt(null);

    try {
      const trendName = trends.find(t => t.id === selectedTrend)?.title || selectedTrend;
      const viralStyleIds = selectedViralStyle ? [selectedViralStyle] : [];
      
      const prompt = await groqClient.generateFireflyPrompt(
        trendName,
        brandData,
        selectedViralStyle !== 'none' && selectedViralStyle !== '',
        viralStyleIds
      );
      setGeneratedPrompt(prompt);
    } catch (error) {
      console.error('Error generating prompt:', error);
      alert('Failed to generate prompt. Please try again.');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt);
      alert('Prompt copied to clipboard!');
    }
  };

  return (
    <div style={{ padding: 'var(--spectrum-spacing-400)', fontFamily: 'adobe-clean, sans-serif' }}>
      {/* Brand Colors Display */}
      {hasBrandData && (
        <div style={{
          padding: 'var(--spectrum-spacing-300)',
          backgroundColor: 'var(--spectrum-background-layer-2)',
          borderRadius: 'var(--spectrum-corner-radius-100)',
          border: '1px solid var(--spectrum-border-color)',
          marginBottom: 'var(--spectrum-spacing-400)'
        }}>
          <h3 style={{ 
            fontSize: 'var(--spectrum-heading-m-text-size)',
            fontWeight: 600,
            color: 'var(--spectrum-heading-color)',
            margin: '0 0 var(--spectrum-spacing-200) 0',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spectrum-spacing-100)'
          }}>
            <Palette size={18} color="#00719f" />
            Using Your Brand Colors:
          </h3>
          <div style={{ display: 'flex', gap: 'var(--spectrum-spacing-100)' }}>
            {brandData.primaryColors.slice(0, 5).map((color, index) => (
              <div
                key={index}
                title={color}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '2px solid var(--spectrum-border-color)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trend Selection Dropdown */}
      <div style={{
        marginBottom: 'var(--spectrum-spacing-400)'
      }}>
        <label
          htmlFor="trend-select"
          style={{
            display: 'block',
            fontSize: 'var(--spectrum-body-text-size)',
            fontWeight: 600,
            color: 'var(--spectrum-heading-color)',
            marginBottom: 'var(--spectrum-spacing-100)'
          }}
        >
          Select Trend Style
        </label>
        <select
          id="trend-select"
          value={selectedTrend}
          onChange={(e) => setSelectedTrend(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--spectrum-spacing-200)',
            fontSize: 'var(--spectrum-body-text-size)',
            fontFamily: 'adobe-clean, sans-serif',
            backgroundColor: 'var(--spectrum-background-layer-1)',
            color: 'var(--spectrum-body-color)',
            border: '1px solid var(--spectrum-border-color)',
            borderRadius: 'var(--spectrum-corner-radius-100)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">-- Choose a trend --</option>
          {trends.map((trend) => (
            <option key={trend.id} value={trend.id}>
              {trend.title} - {trend.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Viral Style Selection Dropdown */}
      <div style={{
        marginBottom: 'var(--spectrum-spacing-400)'
      }}>
        <label
          htmlFor="viral-select"
          style={{
            display: 'block',
            fontSize: 'var(--spectrum-body-text-size)',
            fontWeight: 600,
            color: 'var(--spectrum-heading-color)',
            marginBottom: 'var(--spectrum-spacing-100)'
          }}
        >
          Select Viral Style (Optional)
        </label>
        <select
          id="viral-select"
          value={selectedViralStyle}
          onChange={(e) => setSelectedViralStyle(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--spectrum-spacing-200)',
            fontSize: 'var(--spectrum-body-text-size)',
            fontFamily: 'adobe-clean, sans-serif',
            backgroundColor: 'var(--spectrum-background-layer-1)',
            color: 'var(--spectrum-body-color)',
            border: '1px solid var(--spectrum-border-color)',
            borderRadius: 'var(--spectrum-corner-radius-100)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {viralStyles.map((style) => (
            <option key={style.id} value={style.id}>
              {style.name} - {style.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGeneratePrompt}
        disabled={!hasBrandData || generatingPrompt || !selectedTrend}
        style={{
          width: '100%',
          padding: 'var(--spectrum-spacing-300)',
          fontSize: 'var(--spectrum-font-size-200)',
          fontWeight: 700,
          fontFamily: 'adobe-clean, sans-serif',
          backgroundColor: generatingPrompt ? 'var(--spectrum-gray-400)' : '#4069FD',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--spectrum-corner-radius-100)',
          cursor: hasBrandData && !generatingPrompt && selectedTrend ? 'pointer' : 'not-allowed',
          transition: 'all 0.13s ease-out',
          opacity: !hasBrandData || !selectedTrend ? 0.5 : 1,
          marginBottom: 'var(--spectrum-spacing-400)'
        }}
        onMouseEnter={(e) => {
          if (hasBrandData && !generatingPrompt && selectedTrend) {
            e.currentTarget.style.backgroundColor = '#5078FE';
          }
        }}
        onMouseLeave={(e) => {
          if (hasBrandData && !generatingPrompt && selectedTrend) {
            e.currentTarget.style.backgroundColor = '#4069FD';
          }
        }}
      >
        {generatingPrompt ? (
          <>Generating Prompt...</>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Sparkles size={18} />
            Generate Firefly Prompt
          </span>
        )}
      </button>

      {/* Generated Prompt Display */}
      {generatedPrompt && (
        <div style={{
          padding: 'var(--spectrum-spacing-400)',
          backgroundColor: 'var(--spectrum-background-layer-2)',
          borderRadius: 'var(--spectrum-corner-radius-200)',
          border: '2px solid #FA0',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spectrum-spacing-300)'
          }}>
            <h3 style={{ 
              fontSize: 'var(--spectrum-heading-l-text-size)',
              fontWeight: 700,
              color: 'var(--spectrum-heading-color)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spectrum-spacing-100)'
            }}>
              <Sparkles size={20} color="#00719f" />
              Generated Firefly Prompt
            </h3>
            <button
              onClick={copyToClipboard}
              style={{
                padding: 'var(--spectrum-spacing-100) var(--spectrum-spacing-300)',
                fontSize: 'var(--spectrum-font-size-75)',
                fontWeight: 600,
                fontFamily: 'adobe-clean, sans-serif',
                backgroundColor: '#4069FD',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--spectrum-corner-radius-100)',
                cursor: 'pointer',
                transition: 'all 0.13s ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5078FE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4069FD';
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Copy size={14} />
                Copy
              </span>
            </button>
          </div>
          
          <div style={{
            padding: 'var(--spectrum-spacing-300)',
            backgroundColor: 'var(--spectrum-background-layer-1)',
            borderRadius: 'var(--spectrum-corner-radius-100)',
            border: '1px solid var(--spectrum-border-color)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 'var(--spectrum-body-s-text-size)',
            color: 'var(--spectrum-body-color)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}>
            {generatedPrompt}
          </div>

          <p style={{
            marginTop: 'var(--spectrum-spacing-300)',
            marginBottom: 0,
            fontSize: 'var(--spectrum-body-xs-text-size)',
            color: 'var(--spectrum-text-secondary)',
            fontStyle: 'italic'
          }}>
            Copy this prompt and paste it into Adobe Firefly to generate your design!
          </p>
        </div>
      )}

      {!hasBrandData && (
        <div style={{
          padding: 'var(--spectrum-spacing-400)',
          backgroundColor: 'var(--spectrum-gray-100)',
          borderRadius: 'var(--spectrum-corner-radius-100)',
          border: '1px solid var(--spectrum-border-color)',
          textAlign: 'center'
        }}>
          <p style={{
            margin: 0,
            fontSize: 'var(--spectrum-body-text-size)',
            color: 'var(--spectrum-text-secondary)'
          }}>
            Extract brand data in the <strong>Brand Brain</strong> tab first to enable prompt generation.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrendEngine;

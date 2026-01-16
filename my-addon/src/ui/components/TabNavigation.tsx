import React from 'react';
import { Brain, TrendingUp, Search } from 'lucide-react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'brand-brain', label: 'Brand Brain', icon: Brain },
    { id: 'trend-engine', label: 'Trend Engine', icon: TrendingUp },
    { id: 'design-auditor', label: 'Design Auditor', icon: Search },
  ];

  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: 'var(--spectrum-background-layer-1)',
        borderBottom: '1px solid var(--spectrum-divider-color)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              padding: '12px var(--spectrum-spacing-300)',
              fontSize: 'var(--spectrum-font-size-100)',
              fontWeight: isActive ? 700 : 400,
              fontFamily: 'adobe-clean, sans-serif',
              backgroundColor: isActive ? 'var(--spectrum-background-layer-2)' : 'transparent',
              color: isActive ? '#00719f' : 'var(--spectrum-text-secondary)',
              border: 'none',
              borderBottom: isActive 
                ? '2px solid #00719f' 
                : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.13s ease-out',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'var(--spectrum-background-layer-2)';
                e.currentTarget.style.color = 'var(--spectrum-text-heading)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--spectrum-text-secondary)';
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #00719f';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <IconComponent size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;

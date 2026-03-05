'use client'

interface TabsProps {
  tabs: { key: string; label: string }[]
  activeTab: string
  onTabChange: (key: string) => void
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

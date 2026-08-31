export const CLASS_META = {
  plastic:   { label: 'Plastic',    category: 'Recyclable',     disposal: 'Plastic Bin',        co2: 0.6,  icon: '🧴', accent: '#a8e063' },
  metal:     { label: 'Metal',      category: 'Recyclable',     disposal: 'Metal Bin',          co2: 1.2,  icon: '🥫', accent: '#c6f135' },
  paper:     { label: 'Paper',      category: 'Recyclable',     disposal: 'Dry Waste Bin',      co2: 0.4,  icon: '📰', accent: '#a8e063' },
  cardboard: { label: 'Cardboard',  category: 'Recyclable',     disposal: 'Cardboard Bin',      co2: 0.4,  icon: '📦', accent: '#a8e063' },
  glass:     { label: 'Glass',      category: 'Recyclable',     disposal: 'Glass Bin',          co2: 0.3,  icon: '🍶', accent: '#c6f135' },
  organic:   { label: 'Organic',    category: 'Biodegradable',  disposal: 'Compost Bin',        co2: 0.3,  icon: '🍃', accent: '#a8e063' },
  trash:     { label: 'Trash',      category: 'Non-Recyclable', disposal: 'General Waste Bin',  co2: 0.0,  icon: '🗑️', accent: '#888' },
}

export const API_BASE = '/api'

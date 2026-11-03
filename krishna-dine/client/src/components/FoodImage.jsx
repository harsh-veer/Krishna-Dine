import { useState } from 'react';
import { ChefHat, Coffee, CookingPot, Flame, IceCreamBowl, Salad, Soup, UtensilsCrossed, Wheat, Utensils } from 'lucide-react';
import { assetUrl } from '../services/config';

// Illustrated placeholders per category: always render, never a broken image.
const STYLES = {
  starters: { icon: Flame, from: '#F5D9B8', to: '#E9A86A', fg: '#7A3A0E' },
  soups: { icon: Soup, from: '#F7E2C2', to: '#E7B474', fg: '#7A4410' },
  chinese: { icon: Salad, from: '#F9D7C9', to: '#E58C6D', fg: '#7C2D17' },
  'south-indian': { icon: UtensilsCrossed, from: '#F6EBC8', to: '#E4C770', fg: '#6B5310' },
  'main-course': { icon: ChefHat, from: '#F6D6B6', to: '#D98A4E', fg: '#6E300C' },
  'indian-breads': { icon: Wheat, from: '#F7EBD3', to: '#DDBB80', fg: '#6A4B14' },
  'rice-and-biryani': { icon: CookingPot, from: '#F8E6BE', to: '#E3B25A', fg: '#6E4A0C' },
  beverages: { icon: Coffee, from: '#E6DCCF', to: '#B89474', fg: '#4A2F1A' },
  desserts: { icon: IceCreamBowl, from: '#F7D9DE', to: '#E39AA8', fg: '#7A2436' },
};

const slug = (s = '') => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function FoodPlaceholder({ name, category, className = '' }) {
  const style = STYLES[slug(category)] || { icon: Utensils, from: '#E3EFE8', to: '#A9CDB9', fg: '#0B3B2E' };
  const Icon = style.icon;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `radial-gradient(circle at 30% 25%, ${style.from}, ${style.to})` }}
      role="img"
      aria-label={name}
    >
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/25" />
      <div className="absolute -bottom-6 -left-3 h-20 w-20 rounded-full bg-white/15" />
      <Icon className="relative h-1/3 w-1/3 min-h-[28px] min-w-[28px]" style={{ color: style.fg }} strokeWidth={1.6} />
    </div>
  );
}

export default function FoodImage({ src, name, category, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <FoodPlaceholder name={name} category={category} className={className} />;
  return <img src={assetUrl(src)} alt={name} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

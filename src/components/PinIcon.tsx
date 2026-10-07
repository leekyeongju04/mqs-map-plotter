import React from 'react';
import {
  MapPin,
  Landmark,
  Compass,
  Flag,
  Navigation,
  Crosshair,
  Target,
  Shield,
  Sword,
  Sparkles,
  Skull,
  Crown,
  Anchor,
  Flame,
  Eye,
  Star,
  Gem,
  Trees,
  Fish,
  Mountain,
  Heart,
  Key,
  Tent,
  User,
  CircleDot,
  AlertTriangle,
  HelpCircle,
  LucideProps,
} from 'lucide-react';

export const AVAILABLE_ICONS = [
  { id: 'MapPin', name: 'Pin', icon: MapPin },
  { id: 'Landmark', name: 'Landmark', icon: Landmark },
  { id: 'Navigation', name: 'Portal', icon: Navigation },
  { id: 'Compass', name: 'Compass', icon: Compass },
  { id: 'Flag', name: 'Quest Flag', icon: Flag },
  { id: 'Skull', name: 'Monster / Boss', icon: Skull },
  { id: 'Sword', name: 'Combat', icon: Sword },
  { id: 'Shield', name: 'Guard', icon: Shield },
  { id: 'Sparkles', name: 'Treasure / Relic', icon: Sparkles },
  { id: 'Crown', name: 'Ruler / Elite', icon: Crown },
  { id: 'Anchor', name: 'Ship / Dock', icon: Anchor },
  { id: 'Flame', name: 'Campfire', icon: Flame },
  { id: 'Tent', name: 'Camp', icon: Tent },
  { id: 'User', name: 'NPC', icon: User },
  { id: 'Key', name: 'Key / Lock', icon: Key },
  { id: 'Gem', name: 'Gem / Resource', icon: Gem },
  { id: 'Star', name: 'Special Point', icon: Star },
  { id: 'Crosshair', name: 'Target', icon: Crosshair },
  { id: 'Eye', name: 'Observation', icon: Eye },
  { id: 'Trees', name: 'Forest', icon: Trees },
  { id: 'Mountain', name: 'Mountain', icon: Mountain },
  { id: 'Fish', name: 'Fishing Spot', icon: Fish },
  { id: 'Heart', name: 'Healer / Respawn', icon: Heart },
  { id: 'CircleDot', name: 'Waypoint', icon: CircleDot },
];

export const AVAILABLE_COLORS = [
  { id: '#EF4444', name: 'Red', hex: '#EF4444' },
  { id: '#F97316', name: 'Orange', hex: '#F97316' },
  { id: '#F59E0B', name: 'Amber', hex: '#F59E0B' },
  { id: '#10B981', name: 'Emerald', hex: '#10B981' },
  { id: '#06B6D4', name: 'Cyan', hex: '#06B6D4' },
  { id: '#0284C7', name: 'Sky', hex: '#0284C7' },
  { id: '#6366F1', name: 'Indigo', hex: '#6366F1' },
  { id: '#8B5CF6', name: 'Violet', hex: '#8B5CF6' },
  { id: '#EC4899', name: 'Pink', hex: '#EC4899' },
  { id: '#64748B', name: 'Slate', hex: '#64748B' },
  { id: '#1E293B', name: 'Dark Slate', hex: '#1E293B' },
];

interface PinIconProps extends LucideProps {
  name: string;
}

export const PinIcon: React.FC<PinIconProps> = ({ name, ...props }) => {
  const item = AVAILABLE_ICONS.find((i) => i.id === name);
  const IconComponent = item ? item.icon : MapPin;
  return <IconComponent {...props} />;
};

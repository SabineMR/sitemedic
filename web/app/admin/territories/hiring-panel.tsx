/**
 * Hiring Recommendations Panel
 *
 * Displays actionable hiring triggers grouped by region:
 * - High utilization (>80%): Orange trending-up icon
 * - Low fulfillment (<90%): Red alert triangle
 * - Coverage gap (>10% rejection): Yellow map pin
 *
 * Message format: "Hire medic in {Region} ({sectors}, {utilization}% utilization)"
 */

'use client';

import { useState } from 'react';
import { TrendingUp, AlertTriangle, MapPin, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { TerritoryWithMetrics } from '@/lib/queries/admin/territories';
import { detectHiringTriggers, groupTriggersByRegion, type HiringTrigger } from '@/lib/territory/hiring-triggers';

interface HiringPanelProps {
  territories: TerritoryWithMetrics[];
}

interface TriggerCardProps {
  trigger: HiringTrigger;
}

function TriggerCard({ trigger }: TriggerCardProps) {
  // Determine icon and color based on trigger type
  const getIconAndColor = () => {
    switch (trigger.trigger_type) {
      case 'high_utilization':
        return {
          icon: TrendingUp,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
        };
      case 'low_fulfillment':
        return {
          icon: AlertTriangle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
        };
      case 'coverage_gap':
        return {
          icon: MapPin,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
        };
    }
  };

  const { icon: Icon, color, bgColor } = getIconAndColor();

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${bgColor} border border-gray-700/50`}>
      {/* Pulsing indicator for critical triggers */}
      {trigger.severity === 'critical' && (
        <div className="relative flex-shrink-0 mt-1">
          <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-500 opacity-75 animate-ping"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
        </div>
      )}

      {/* Icon */}
      <Icon className={`h-5 w-5 ${color} flex-shrink-0 mt-0.5`} />

      {/* Content */}
      <div className="flex-1 space-y-2">
        {/* Message */}
        <p className="text-sm text-white font-medium">
          {trigger.message}
        </p>

        {/* Metric details */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>
            Metric: <span className="font-semibold text-white">{trigger.metric_value.toFixed(1)}</span>
          </span>
          <span>•</span>
          <span>
            Threshold: <span className="font-semibold">{trigger.threshold}</span>
          </span>
          {trigger.weeks_active > 0 && (
            <>
              <span>•</span>
              <span>
                Active: <span className="font-semibold">{trigger.weeks_active}w</span>
              </span>
            </>
          )}
        </div>

        {/* Trigger type badge */}
        <div>
          <Badge
            variant={trigger.severity === 'critical' ? 'destructive' : 'default'}
            className="text-xs"
          >
            {trigger.trigger_type.replace('_', ' ')}
          </Badge>
        </div>
      </div>
    </div>
  );
}

interface RegionSectionProps {
  region: string;
  triggers: HiringTrigger[];
  isExpanded: boolean;
  onToggle: () => void;
}

function RegionSection({ region, triggers, isExpanded, onToggle }: RegionSectionProps) {
  const criticalCount = triggers.filter(t => t.severity === 'critical').length;

  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
      {/* Region Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold">{region}</h3>
          <Badge variant="secondary" className="bg-gray-700">
            {triggers.length}
          </Badge>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="bg-red-600">
              {criticalCount} critical
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Triggers List */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-gray-800/10">
          {triggers.map((trigger, idx) => (
            <TriggerCard key={`${trigger.territory_id}-${trigger.trigger_type}-${idx}`} trigger={trigger} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HiringPanel({ territories }: HiringPanelProps) {
  // Detect hiring triggers and group by region
  const triggers = detectHiringTriggers(territories);
  const groupedTriggers = groupTriggersByRegion(triggers);

  // Track expanded regions
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(
    new Set(Array.from(groupedTriggers.keys()))
  );

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  };

  // No triggers - show empty state
  if (triggers.length === 0) {
    return (
      <div className="px-8 pt-6">
        <Card className="p-6 bg-gray-800/30 border-gray-700/50">
          <div className="flex items-center gap-3 text-gray-400">
            <Briefcase className="h-5 w-5" />
            <p>
              <span className="font-semibold text-white">No hiring recommendations.</span>
              {' '}All territories operating within normal parameters.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-8 pt-6">
      {/* Panel Header */}
      <div className="flex items-center gap-3 mb-4">
        <Briefcase className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-white">Hiring Recommendations</h2>
        <Badge variant="secondary" className="bg-blue-600">
          {triggers.length}
        </Badge>
      </div>

      {/* Regions */}
      <div className="space-y-3">
        {Array.from(groupedTriggers.entries()).map(([region, regionTriggers]) => (
          <RegionSection
            key={region}
            region={region}
            triggers={regionTriggers}
            isExpanded={expandedRegions.has(region)}
            onToggle={() => toggleRegion(region)}
          />
        ))}
      </div>
    </div>
  );
}

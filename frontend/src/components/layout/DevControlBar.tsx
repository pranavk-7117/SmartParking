import React, { useState } from 'react';
import { Play, Pause, Plus, Minus, AlertOctagon, Sliders, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext';
import { useToast } from '../../context/ToastContext';

export const DevControlBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    simulationActive,
    setSimulationActive,
    simulateEntry,
    simulateExit,
    isFacilityFull,
    toggleFacilityFullSimulation,
  } = useLiveData();
  const { showToast } = useToast();

  const handleEntry = (category?: 'Car' | 'Scooter') => {
    simulateEntry(category);
    showToast(`Simulated vehicle entry: ${category || 'Random'}`, 'info', 2500);
  };

  const handleExit = (category?: 'Car' | 'Scooter') => {
    simulateExit(category);
    showToast(`Simulated vehicle exit: ${category || 'Random'}`, 'info', 2500);
  };

  const handleToggleFull = () => {
    toggleFacilityFullSimulation();
    if (!isFacilityFull) {
      showToast('Facility marked as FULL. Kiosk & Dashboard will reflect full state.', 'error', 3500);
    } else {
      showToast('Facility returned to normal operational counts.', 'success', 3500);
    }
  };

  return (
    <aside aria-label="Dev simulation panel" className="fixed bottom-4 right-4 z-40">
      <div className="bg-neutral-900/95 text-white rounded-card shadow-elevated border border-neutral-700/80 backdrop-blur-md overflow-hidden transition-all duration-200">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2 text-xs font-semibold hover:bg-neutral-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-accent" />
            <span>Dev / Mock Controls</span>
          </div>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {isExpanded && (
          <div className="p-3 pt-1 border-t border-neutral-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400">Auto Sim:</span>
              <button
                type="button"
                onClick={() => setSimulationActive(!simulationActive)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  simulationActive ? 'bg-emerald-600 text-white' : 'bg-neutral-700 text-neutral-300'
                }`}
              >
                {simulationActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {simulationActive ? 'Active (9s)' : 'Paused'}
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-neutral-400">Simulate Entry / Exit</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleEntry('Car')}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3 text-success" /> Car Entry
                </button>
                <button
                  type="button"
                  onClick={() => handleExit('Car')}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center gap-1"
                >
                  <Minus className="w-3 h-3 text-danger" /> Car Exit
                </button>
                <button
                  type="button"
                  onClick={() => handleEntry('Scooter')}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3 text-success" /> Scooter In
                </button>
                <button
                  type="button"
                  onClick={() => handleExit('Scooter')}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center gap-1"
                >
                  <Minus className="w-3 h-3 text-danger" /> Scooter Out
                </button>
              </div>
            </div>

            <div className="pt-1 border-t border-neutral-800 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={handleToggleFull}
                className={`w-full px-2.5 py-1.5 rounded flex items-center justify-center gap-1.5 font-semibold transition-colors ${
                  isFacilityFull
                    ? 'bg-danger text-white hover:bg-danger-light'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                {isFacilityFull ? 'Disable Facility Full' : 'Test "Facility Full" State'}
              </button>

              <a
                href="/display"
                target="_blank"
                rel="noreferrer"
                className="w-full px-2.5 py-1 rounded bg-primary hover:bg-primary-light text-white flex items-center justify-center gap-1.5 font-medium text-[11px]"
              >
                <ExternalLink className="w-3 h-3" />
                Open Standalone Kiosk
              </a>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

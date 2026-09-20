"use client";

import React, { useState, useEffect } from "react";
import { MapPin, ArrowDown, Search } from "lucide-react";
import { RiskAnalysisRequest } from "@/types/oracle";

interface RiskFormProps {
  onSubmit: (data: RiskAnalysisRequest) => void;
  isLoading: boolean;
  initialAddress?: string;
  initialDepth?: number;
}

const IOWA_SAMPLE_ADDRESSES = [
  { label: "Slater (Story Co.)", value: "101 Main St, Slater, IA 50244", depth: 140 },
  { label: "Amana (Iowa Co.)", value: "705 44th Ave, Amana, IA 52203", depth: 65 },
  { label: "Decorah Karst (Winneshiek Co.)", value: "500 W Water St, Decorah, IA 52101", depth: 85 },
];

export default function RiskForm({ onSubmit, isLoading, initialAddress = "", initialDepth }: RiskFormProps) {
  const [address, setAddress] = useState(initialAddress);
  const [wellDepth, setWellDepth] = useState<number | "">(initialDepth || 175);
  const [weatherScenario, setWeatherScenario] = useState<"current" | "heavy_storm" | "dry">("current");

  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
    }
    if (initialDepth) {
      setWellDepth(initialDepth);
    }
  }, [initialAddress, initialDepth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    // Use entered depth or leave undefined for backend regional geological resolution
    const effectiveDepth = wellDepth && Number(wellDepth) > 0 ? Number(wellDepth) : undefined;

    onSubmit({
      address: address.trim(),
      wellDepth: effectiveDepth,
      weatherScenario,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-lg font-bold text-stone-900">
          Well &amp; Property Parameters
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Predict acute chemical nitrate spikes and microbial manure pathogens (E. coli &amp; Salmonella) in private drinking wells following rainfall.
        </p>
      </div>

      {/* Property Address */}
      <div className="space-y-2 mb-6">
        <label
          htmlFor="address-input"
          className="block text-xs font-bold uppercase tracking-wider text-stone-700"
        >
          Iowa Property Address, Rural Route, or Town
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <MapPin className="w-4 h-4 text-[#2d545a]" />
          </div>
          <input
            id="address-input"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            placeholder="Enter Iowa address or town (e.g. 101 Main St, Slater, IA)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d545a]/20 focus:border-[#2d545a] transition"
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-stone-500">
          <span>Quick fill:</span>
          {IOWA_SAMPLE_ADDRESSES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setAddress(item.value);
                setWellDepth(item.depth);
              }}
              className="text-[#2d545a] font-medium hover:underline cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Well Depth Input */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label
              htmlFor="depth-input"
              className="block text-xs font-bold uppercase tracking-wider text-stone-700"
            >
              Well Depth (Feet)
            </label>
            <span className="text-[11px] font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              Optional
            </span>
          </div>
          <span className="text-xs text-stone-500">
            {typeof wellDepth === "number" && wellDepth < 50
              ? "Shallow (<50 ft: high runoff vulnerability)"
              : typeof wellDepth === "number" && wellDepth > 180
              ? "Deep bedrock (>180 ft: protected aquifer)"
              : typeof wellDepth === "number"
              ? "Intermediate depth (50–180 ft)"
              : "Defaults to Iowa DNR state average (175 ft)"}
          </span>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <ArrowDown className="w-4 h-4 text-[#2d545a]" />
          </div>
          <input
            id="depth-input"
            type="number"
            min="5"
            max="2000"
            value={wellDepth}
            onChange={(e) => setWellDepth(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="e.g. 175 (or leave blank to use Iowa DNR state average of 175 ft)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d545a]/20 focus:border-[#2d545a] transition"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
          {[
            { label: "Shallow Well", depth: 45, desc: "45 ft (Alluvial sand/gravel)" },
            { label: "Iowa State Avg", depth: 175, desc: "175 ft (Iowa DNR rural median)" },
            { label: "Deep Bedrock", depth: 300, desc: "300 ft (Confined aquifer)" },
          ].map((item) => {
            const isSelected = wellDepth === item.depth || (wellDepth === "" && item.depth === 175);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setWellDepth(item.depth)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? "bg-[#eaf1f2] border-[#2d545a] text-[#224348] shadow-xs font-semibold"
                    : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="text-[11px] opacity-75">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rainfall Condition */}
      <div className="mb-6 p-4 rounded-xl bg-stone-50 border border-stone-200">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
          Precipitation Condition
        </label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { id: "current", label: "Live 48h Forecast", desc: "Incoming storm outlook" },
            { id: "heavy_storm", label: "Heavy Rain (2.6\")", desc: "Simulate storm runoff" },
            { id: "dry", label: "Dry Period (0.0\")", desc: "Simulate baseline" },
          ].map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setWeatherScenario(sc.id as any)}
              className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                weatherScenario === sc.id
                  ? "bg-white border-[#2d545a] text-[#2d545a] shadow-xs font-bold"
                  : "border-transparent text-stone-600 hover:text-stone-900"
              }`}
            >
              <div className="font-semibold">{sc.label}</div>
              <div className="text-[10px] text-stone-400">{sc.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !address.trim()}
        className="w-full py-3.5 px-4 rounded-xl bg-[#2d545a] hover:bg-[#224348] active:bg-[#1a3438] text-white font-bold text-sm transition shadow-sm shadow-[#2d545a]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Analyzing Hydrology &amp; Runoff Risk...</span>
          </>
        ) : (
          <>
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span>Analyze Contamination Risk</span>
          </>
        )}
      </button>
    </form>
  );
}

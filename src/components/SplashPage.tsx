"use client";

import React, { useState } from "react";
import {
  MapPin,
  ArrowRight,
  Droplets,
  CloudRain,
  Cpu,
  ShieldCheck,
  Biohazard,
} from "lucide-react";

interface SplashPageProps {
  onStartAnalysis: (address: string, depth?: number) => void;
}

const PLACEHOLDER_LOCATIONS = [
  { label: "Slater (Story Co.)", value: "101 Main St, Slater, IA 50244", depth: 140 },
  { label: "Amana (Iowa Co.)", value: "705 44th Ave, Amana, IA 52203", depth: 65 },
  { label: "Decorah Karst (Winneshiek Co.)", value: "500 W Water St, Decorah, IA 52101", depth: 85 },
];

export default function SplashPage({ onStartAnalysis }: SplashPageProps) {
  const [addressInput, setAddressInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartAnalysis(addressInput.trim());
  };

  const handleSelectSample = (loc: { label: string; value: string; depth: number }) => {
    setAddressInput(loc.value);
    onStartAnalysis(loc.value, loc.depth);
  };

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden border-b border-stone-200/90 shadow-sm">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-white/68 backdrop-blur-[2px]" />

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28 text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#eaf0f1] text-[#224348] border border-[#b8cdd0] shadow-xs">
            <Droplets className="w-4 h-4 text-[#2d545a] fill-[#2d545a]/20" />
            <span className="font-black tracking-widest text-[#1a3438]">NITRASENSOR</span>
            <span className="text-[#799fa3]">•</span>
            <span className="text-[#224348] font-semibold normal-case tracking-normal">Iowa Groundwater Intelligence</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 leading-[1.12]">
              Know Your Water <br className="hidden sm:inline" />
              <span className="text-[#2d545a]">is Safe to Drink.</span>
            </h1>

            <p className="text-base sm:text-lg text-stone-700 leading-relaxed max-w-2xl mx-auto font-medium">
              Get instant alerts when heavy rain pushes fertilizer and bacteria into your private well, so you can keep your family safe.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="pt-2 max-w-2xl mx-auto"
          >
            <div className="p-2 rounded-2xl bg-white border-2 border-stone-300 shadow-xl shadow-stone-900/10 flex flex-col sm:flex-row items-center gap-2 focus-within:border-[#2d545a] focus-within:ring-4 focus-within:ring-[#2d545a]/15 transition-all">
              <div className="flex items-center w-full pl-3 gap-2.5">
                <MapPin className="w-5 h-5 text-[#2d545a] flex-shrink-0" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Enter Iowa property address, rural route, or town..."
                  className="w-full py-3 bg-transparent text-sm sm:text-base text-stone-900 placeholder-stone-400 font-medium focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#2d545a] hover:bg-[#224348] active:bg-[#1a3438] text-white text-sm sm:text-base font-bold transition shadow-md shadow-[#2d545a]/30 flex items-center justify-center gap-2.5 flex-shrink-0 cursor-pointer"
              >
                <span>Check My Well</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 mr-1">
                Sample Wells:
              </span>
              {PLACEHOLDER_LOCATIONS.map((loc) => (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => handleSelectSample(loc)}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-stone-300 hover:border-[#2d545a] hover:bg-[#eaf1f2] text-stone-700 hover:text-[#224348] font-medium text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3 h-3 text-[#2d545a]" />
                  <span>{loc.label}</span>
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-16 sm:space-y-20">
        <div className="space-y-8 pt-2">
          <div className="text-center space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#2d545a]">
              How Nitrasensor Works
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950">
              Physical Hydrology Meets Machine Learning
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto">
              Real-time environmental telemetry combined with trained predictive intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="rounded-2xl bg-white border border-stone-200 p-6 sm:p-7 shadow-xs hover:shadow-md transition space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#eaf1f2] border border-[#b8cdd0] flex items-center justify-center text-[#224348] font-bold text-lg">
                1
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-[#2d545a]" />
                  Environmental Sensing
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Connects live to the Iowa State University Soil Moisture Network, terrain elevation slope models, and Open-Meteo 48h rainfall forecasts to quantify surface runoff potential.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl bg-white border border-stone-200 p-6 sm:p-7 shadow-xs hover:shadow-md transition space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-lg">
                2
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  Nitrasensor ML
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Nitrasensor ML predicts continuous nitrate concentrations (mg/L) and bacterial pathogen probabilities (E. coli &amp; Salmonella) based on well depth, soil saturation, and precipitation.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl bg-white border border-stone-200 p-6 sm:p-7 shadow-xs hover:shadow-md transition space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#eaf0f1] border border-[#b8cdd0] flex items-center justify-center text-[#224348] font-bold text-lg">
                3
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2d545a]" />
                  Nitrasensor AI Guidance
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Nitrasensor AI synthesizes clinical precautions for vulnerable family members, explains proper water handling, and provides actionable farmer runoff holds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Contaminant Breakdown Highlight */}
        <div className="rounded-3xl bg-white border border-stone-200 p-7 sm:p-10 shadow-xs space-y-6">
          <div className="max-w-2xl space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-stone-950">
              Why Monitoring Private Wells Matters in Iowa
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Unlike municipal city water, <strong>private wells are not regulated or routinely tested by the EPA</strong>. Over 300,000 rural Iowans rely on private wells surrounded by intensive row-crop agriculture and livestock confinement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="text-sm font-bold text-[#2d545a] flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Chemical Nitrates (NO₃-N)
              </div>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Synthesized nitrogen fertilizers and manure dissolve into soil water. In infants, excess nitrates cause &quot;Blue Baby Syndrome&quot; (methemoglobinemia), preventing blood from carrying oxygen.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <Biohazard className="w-4 h-4" />
                Biological Pathogens (E. coli &amp; Salmonella)
              </div>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Overland manure runoff from livestock feeding operations bypasses shallow well casings, causing severe bacterial gastroenteritis, bloody diarrhea, and acute dehydration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

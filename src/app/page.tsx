"use client";

import React, { useState } from "react";
import { Droplets, AlertCircle, ArrowLeft, Search } from "lucide-react";
import SplashPage from "@/components/SplashPage";
import RiskForm from "@/components/RiskForm";
import ResultsDashboard from "@/components/ResultsDashboard";
import { RiskAnalysisRequest, RiskAnalysisResponse } from "@/types/oracle";

export default function Home() {
  const [currentView, setCurrentView] = useState<"splash" | "analysis">("splash");
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedDepth, setSelectedDepth] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskAnalysisResponse | null>(null);

  const handleStartFromSplash = (address: string, depth?: number) => {
    setSelectedAddress(address);
    setSelectedDepth(depth);
    setError(null);
    setCurrentView("analysis");
  };

  const handleAnalyze = async (formData: RiskAnalysisRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to analyze well contamination risk.");
      }

      const data: RiskAnalysisResponse = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const handleReturnToSplash = () => {
    setCurrentView("splash");
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f9faf9] text-stone-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-stone-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReturnToSplash}
            className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#2d545a] flex items-center justify-center text-white shadow-md shadow-[#2d545a]/20 group-hover:bg-[#224348] group-hover:scale-105 transition-all">
              <Droplets className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-stone-950">
                  Nitrasensor
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#eaf0f1] text-[#224348] border border-[#b8cdd0]">
                  Iowa
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Rural Well-Water Safety &amp; Runoff Predictor
              </p>
            </div>
          </button>

          {/* Header Navigation CTA */}
          {currentView === "analysis" ? (
            <button
              type="button"
              onClick={handleReturnToSplash}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-700 text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Back to Overview</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentView("analysis")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2d545a] hover:bg-[#224348] active:bg-[#1a3438] text-white text-xs font-bold transition shadow-sm shadow-[#2d545a]/25 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Launch Nitrasensor</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full">
        {currentView === "splash" ? (
          <SplashPage onStartAnalysis={handleStartFromSplash} />
        ) : (
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
            {/* Intro in Analysis View (when no result yet) */}
            {!result && (
              <div className="max-w-3xl mx-auto text-center space-y-2 pb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#eaf0f1] text-[#224348] border border-[#b8cdd0]">
                  <Droplets className="w-3.5 h-3.5 text-[#2d545a]" />
                  <span>Well Risk Diagnostic</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-950">
                  Evaluate Your Well&apos;s Runoff Vulnerability
                </h2>
                <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl mx-auto font-medium">
                  Enter your well depth and property location to evaluate acute contamination risks from both <strong>chemical fertilizer nitrates</strong> and <strong>manure pathogens (E. coli &amp; Salmonella)</strong> using real-time watershed sensors and Nitrasensor ML.
                </p>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Analysis Error: </strong>
                  {error}
                </div>
              </div>
            )}

            {/* Form or Results */}
            {!result ? (
              <div className="max-w-3xl mx-auto">
                <RiskForm
                  onSubmit={handleAnalyze}
                  isLoading={isLoading}
                  initialAddress={selectedAddress}
                  initialDepth={selectedDepth}
                />
              </div>
            ) : (
              <ResultsDashboard
                data={result}
                onReset={handleReset}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-stone-700">
            <span>Nitrasensor</span>
            <span>•</span>
            <span>Iowa State University Mesonet</span>
            <span>•</span>
            <span>Open-Meteo Weather &amp; Topography</span>
            <span>•</span>
            <span>USGS Water Quality Network</span>
          </div>
          <p className="text-[11px] text-stone-400 max-w-2xl mx-auto leading-relaxed">
            Nitrasensor is an informational screening tool designed for rural private well owners. For certified laboratory water testing, consult your local county public health department or the Iowa DNR Grants-to-Counties program.
          </p>
        </div>
      </footer>
    </div>
  );
}

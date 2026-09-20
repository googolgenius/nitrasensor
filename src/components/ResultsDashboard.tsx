"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  CloudRain,
  Mountain,
  Droplets,
  Activity,
  ArrowLeft,
  Shield,
  Biohazard,
  Tractor,
  FileText,
  ShieldAlert,
  Cpu,
  Baby,
  FlaskConical,
  BarChart2,
} from "lucide-react";
import { RiskAnalysisResponse } from "@/types/oracle";

interface ResultsDashboardProps {
  data: RiskAnalysisResponse;
  onReset: () => void;
}

export default function ResultsDashboard({
  data,
  onReset,
}: ResultsDashboardProps) {
  const [activeView, setActiveView] = useState<"health" | "ml" | "agriculture">("health");

  const {
    risk_score,
    status,
    advisory_title,
    reasoning,
    medical_recommendation,
    boiling_water_warning,
    alert_triggered,
    alert_message,
    disclaimer,
    ml_inference,
    nitrate_risk,
    pathogen_risk,
    agricultural_mitigation,
    location,
    environmental_data,
  } = data;

  const statusConfig = {
    LOW: {
      color: "text-emerald-700",
      badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: CheckCircle,
      label: "Low Estimated Risk",
    },
    MODERATE: {
      color: "text-amber-700",
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      icon: AlertCircle,
      label: "Moderate Estimated Risk",
    },
    HIGH: {
      color: "text-rose-700",
      badge: "bg-rose-50 text-rose-800 border-rose-200",
      icon: AlertTriangle,
      label: "High Estimated Risk",
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="w-full space-y-6">
      {/* High Risk Water Quality Advisory Banner */}
      {alert_triggered && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 sm:p-5 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Active Water Quality Advisory (Composite Score: {risk_score}/100)
            </div>
            <p className="text-sm font-medium text-rose-900 leading-relaxed">
              {alert_message ||
                "High runoff detected in your watershed. Pregnant women and infants under 6 months should switch to bottled water for the next 48 hours."}
            </p>
          </div>
        </div>
      )}

      {/* Main Score & Location Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-800">
              {location.matched_address}
            </span>
            {location.county && <span> • {location.county}</span>}
          </div>
          <div className="text-slate-400">
            Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium mb-2.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${statusConfig.badge}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              {advisory_title}
            </h3>
            <p className="text-sm text-slate-600 mt-1 max-w-lg">
              Evaluates acute risks from both chemical fertilizer runoff (nitrates) and livestock manure coliforms (E. coli &amp; Salmonella) for a {environmental_data.well_profile.depth_ft} ft well.
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-right">
              <div className="text-xs uppercase font-medium text-slate-400">Overall Score</div>
              <div className="text-3xl font-extrabold text-slate-900">
                {risk_score}
                <span className="text-sm font-normal text-slate-400">/100</span>
              </div>
            </div>
            <div
              className="w-12 h-12 rounded-full border-4 flex items-center justify-center"
              style={{
                borderColor: status === "HIGH" ? "#f43f5e" : status === "MODERATE" ? "#f59e0b" : "#10b981",
              }}
            >
              <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
            </div>
          </div>
        </div>

        {/* Dual Threat Breakdown */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nitrate Risk */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-semibold uppercase text-slate-700 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[#2d545a]" />
                Nitrate Chemical Surge
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                nitrate_risk.score >= 75 ? "bg-rose-50 text-rose-800 border-rose-200" :
                nitrate_risk.score >= 40 ? "bg-amber-50 text-amber-800 border-amber-200" :
                "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}>
                {nitrate_risk.score}/100 ({nitrate_risk.status})
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {nitrate_risk.clinical_impact}
            </p>
          </div>

          {/* Pathogen Risk */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-semibold uppercase text-slate-700 flex items-center gap-1.5">
                <Biohazard className="w-3.5 h-3.5 text-rose-600" />
                Pathogens (E. coli &amp; Salmonella)
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                pathogen_risk.score >= 75 ? "bg-rose-50 text-rose-800 border-rose-200" :
                pathogen_risk.score >= 40 ? "bg-amber-50 text-amber-800 border-amber-200" :
                "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}>
                {pathogen_risk.score}/100 ({pathogen_risk.status})
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {pathogen_risk.clinical_impact}
            </p>
          </div>
        </div>

        {/* AI Executive Summary Banner */}
        <div className="mt-5 p-4 rounded-xl bg-[#f1f6f7] border border-[#b8cdd0] flex items-start gap-3.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2d545a] mt-1.5 animate-pulse flex-shrink-0" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#224348]">
                Nitrasensor AI Clinical Synopsis
              </span>
              <span className="text-[10px] font-bold bg-[#2d545a] text-white px-2 py-0.5 rounded-full">
                Live Synthesis
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-medium">
              {medical_recommendation.split("\n")[0]}
            </p>
          </div>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveView("health")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeView === "health"
              ? "border-[#2d545a] text-[#2d545a] font-bold"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Shield className="w-4 h-4" />
          Clinical Health Guidance
        </button>
        <button
          onClick={() => setActiveView("ml")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeView === "ml"
              ? "border-[#2d545a] text-[#2d545a] font-bold"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Cpu className="w-4 h-4" />
          Nitrasensor ML
        </button>
        <button
          onClick={() => setActiveView("agriculture")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeView === "agriculture"
              ? "border-[#2d545a] text-[#2d545a] font-bold"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Tractor className="w-4 h-4" />
          Farmer &amp; Landowner Mitigation
        </button>
      </div>

      {/* View 1: Clinical Guidance */}
      {activeView === "health" && (
        <div className="space-y-6">
          {/* Prominent Nitrasensor AI Clinical & Hydrogeological Assessment */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2d545a] flex items-center justify-center text-white">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Nitrasensor AI Clinical Assessment
                  </h4>
                  <p className="text-xs text-slate-500">
                    Environmental toxicologist &amp; physical hydrogeology synthesis for this well.
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#eaf1f2] border border-[#b8cdd0] text-[11px] font-semibold text-[#224348]">
                <span className="w-2 h-2 rounded-full bg-[#2d545a] animate-pulse"></span>
                <span>Clinical Intelligence Active</span>
              </div>
            </div>

            {/* Medical Directives */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#2d545a]" />
                <span>Primary Clinical Guidance &amp; Water Safety Directives</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {medical_recommendation}
              </div>
            </div>

            {/* Hydrogeological Deep Dive */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2d545a]" />
                <span>Hydrogeological Runoff &amp; Aquifer Analysis</span>
              </div>
              <div className="p-4 rounded-xl bg-[#fbfcfb] border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {reasoning}
              </div>
            </div>

            {/* Target Patient Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Baby className="w-4 h-4 text-[#2d545a]" />
                  <span>Infants Under 6 Months</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Infants are at acute risk of methemoglobinemia from nitrates and dehydration from E. coli / Salmonella. Always use certified bottled water for formula.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                  <span>Free Laboratory Testing</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  The Iowa DNR Grants-to-Counties program provides free or subsidized private well testing through local county environmental health departments.
                </p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 leading-normal">
              <strong>Clinical Note: </strong>{disclaimer}
            </div>
          </div>

          {/* Environmental Sensor Data Grid */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Live Environmental Telemetry (Telemetry Inputs)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span>48h Rainfall</span>
                  <CloudRain className="w-4 h-4 text-[#2d545a]" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {environmental_data.precipitation_summary.total_48h_rain_inches}&quot;
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Rain probability: {environmental_data.precipitation_summary.rain_probability_pct}%
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span>Soil Saturation</span>
                  <Droplets className="w-4 h-4 text-cyan-500" />
                </div>
                <div className="text-lg font-bold text-slate-900 truncate">
                  {environmental_data.soil_conditions.saturation_level}
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">
                  {environmental_data.soil_conditions.iowa_mesonet ? (
                    <span>ISU Mesonet: {environmental_data.soil_conditions.iowa_mesonet.stationName} ({environmental_data.soil_conditions.iowa_mesonet.soilMoisture12in ?? "N/A"}%)</span>
                  ) : (
                    <span>Open-Meteo Soil Model</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span>Terrain Slope</span>
                  <Mountain className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {environmental_data.slope_percent}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Elevation: {environmental_data.elevation_ft} ft
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span>USGS River Nitrate</span>
                  <Activity className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {environmental_data.regional_nitrate_baseline.usgs_reading_mg_L}{" "}
                  <span className="text-xs font-normal text-slate-400">mg/L</span>
                </div>
                <div
                  className="text-xs text-slate-500 mt-1 truncate"
                  title={environmental_data.regional_nitrate_baseline.station_name || "EPA standard: 10.0 mg/L"}
                >
                  {environmental_data.regional_nitrate_baseline.station_name || "EPA standard: 10.0 mg/L"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Nitrasensor ML Model Outputs (NO Nitrasensor AI summary here) */}
      {activeView === "ml" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#2d545a]" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Nitrasensor ML
                  </h4>
                  <p className="text-xs text-slate-500">
                    Predictive model calibrated on Iowa groundwater hydrology and well depth data.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#eaf1f2] text-[#224348] text-xs font-semibold border border-[#b8cdd0]">
                Predictive Model
              </span>
            </div>

            {/* Model Target Outputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nitrate Regression Prediction */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs uppercase font-medium text-slate-500">
                  Predicted Nitrate Concentration
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {ml_inference.predictedNitrateMgL}
                  </span>
                  <span className="text-sm text-slate-600 font-medium">mg/L NO₃-N</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">
                    Expected Range: [{ml_inference.confidenceInterval.lowMgL} - {ml_inference.confidenceInterval.highMgL}] mg/L
                  </span>
                  <span className={`font-semibold ${ml_inference.predictedNitrateExceedsMCL ? "text-rose-600" : "text-emerald-600"}`}>
                    {ml_inference.predictedNitrateExceedsMCL ? "Exceeds 10.0 mg/L MCL" : "Below 10.0 mg/L MCL"}
                  </span>
                </div>
              </div>

              {/* Pathogen Probability Classification */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs uppercase font-medium text-slate-500">
                  E. coli / Salmonella Infiltration Probability
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {ml_inference.pathogenProbabilityPct}%
                  </span>
                  <span className="text-sm text-slate-600 font-medium">Estimated Probability</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Microbial Infiltration Index</span>
                  <span className={`font-semibold ${ml_inference.pathogenProbabilityPct >= 50 ? "text-rose-600" : "text-emerald-600"}`}>
                    {ml_inference.pathogenProbabilityPct >= 50 ? "Elevated Microbial Risk" : "Normal Microbial Baseline"}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Risk Factors */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-[#2d545a]" />
                  Key Factors Influencing This Assessment
                </h5>
                <span className="text-[11px] text-slate-400">Relative Impact</span>
              </div>

              <div className="space-y-3">
                {ml_inference.featureAttributions.map((attr) => (
                  <div key={attr.featureName} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-semibold text-slate-900">
                        {attr.displayName} <span className="font-normal text-slate-500">({attr.valueString})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase ${
                          attr.direction === "increases_risk" ? "text-rose-600" : "text-emerald-600"
                        }`}>
                          {attr.direction === "increases_risk" ? "+ Increases Risk" : "- Reduces Risk"}
                        </span>
                        <span className="font-bold text-slate-900">{attr.contributionPct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${attr.direction === "increases_risk" ? "bg-rose-500" : "bg-emerald-500"}`}
                        style={{ width: `${attr.contributionPct * 2}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500">{attr.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 3: Agricultural Mitigation (NO Nitrasensor AI summary here) */}
      {activeView === "agriculture" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Agricultural Runoff Mitigation &amp; Best Management Practices (BMPs)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Guidance for farmers and landowners to reduce chemical and manure loading into rural aquifers.
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#eaf1f2] text-[#224348] text-xs font-semibold border border-[#b8cdd0]">
                Application Status: {agricultural_mitigation.manure_application_window}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {agricultural_mitigation.key_recommendations.map((rec, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {rec.title}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-slate-100 text-xs text-slate-600 space-y-2">
              <strong className="text-slate-900 block">
                Why Iowa&apos;s Water Quality Matters:
              </strong>
              <p>
                Iowa generates tens of millions of tons of liquid swine and poultry manure annually. Combined with extensive subsurface agricultural tile drainage, nutrient runoff into the Raccoon, Cedar, and Des Moines river basins has made Iowa groundwater among the most vulnerable in the United States. Adopting 48-hour weather holds and vegetated riparian buffers protects downstream drinking wells from acute toxicity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Boiling Water Guidance (Bottom of page, no yellow background, no critical warning) */}
      <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-xs text-stone-600 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-stone-800">
          <Droplets className="w-3.5 h-3.5 text-[#2d545a]" />
          <span>Water handling note</span>
        </div>
        <p className="leading-relaxed text-stone-600">
          {boiling_water_warning}
        </p>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Test Another Well
        </button>
      </div>
    </div>
  );
}

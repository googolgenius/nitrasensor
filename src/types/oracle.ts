export interface RiskAnalysisRequest {
  address?: string;
  wellDepth?: number; // in feet
  weatherScenario?: "current" | "heavy_storm" | "dry";
  // Direct 5 feature inputs for ML model evaluation
  wellDepthFt?: number;
  precip48hIn?: number;
  soilMoisturePct?: number;
  slopePct?: number;
  usgsBaselineMgL?: number;
}

export interface IowaStationData {
  stationId: string;
  stationName: string;
  county: string;
  distanceMiles?: number;
  soilMoisture12in?: number; // %
  soilMoisture24in?: number; // %
  soilTempF?: number;
}

export interface FeatureAttribution {
  featureName: string;
  displayName: string;
  valueString: string;
  contributionPct: number;
  direction: "increases_risk" | "reduces_risk";
  description: string;
}

export interface MLModelInferenceResult {
  modelName: string; // "Nitrasensor ML"
  predictedNitrateMgL: number; // Continuous prediction (e.g. 14.2 mg/L)
  predictedNitrateExceedsMCL: boolean; // > 10.0 mg/L EPA standard
  pathogenProbabilityPct: number; // 0 - 100% probability of E. coli / Salmonella infiltration
  mlCompositeScore: number; // 1 - 100
  confidenceInterval: {
    lowMgL: number;
    highMgL: number;
  };
  featureAttributions: FeatureAttribution[];
}

export interface PathogenRiskAssessment {
  score: number; // 1 - 100
  status: "LOW" | "MODERATE" | "HIGH";
  dominant_threats: string[]; // E. coli, Salmonella, Campylobacter
  cafo_density_factor: "High Manure Pressure" | "Moderate Manure Pressure" | "Low";
  clinical_impact: string;
  disinfection_guidance: string;
}

export interface NitrateRiskAssessment {
  score: number; // 1 - 100
  status: "LOW" | "MODERATE" | "HIGH";
  clinical_impact: string;
}

export interface AgriculturalMitigationPlan {
  manure_application_window: "Safe (Dry Soil Window)" | "Caution: Rain Approaching" | "Critical Hold: High Runoff Risk";
  setback_buffer_ft: number;
  key_recommendations: {
    title: string;
    description: string;
  }[];
}

export interface RiskAnalysisResponse {
  risk_score: number; // Primary composite risk score (1 - 100)
  status: "LOW" | "MODERATE" | "HIGH";
  advisory_title: string;
  reasoning: string;
  medical_recommendation: string;
  boiling_water_warning: string;
  alert_triggered: boolean;
  alert_message?: string;
  disclaimer: string;
  
  // Custom ML Model Inference output
  ml_inference: MLModelInferenceResult;

  // Dual-threat breakdown
  nitrate_risk: NitrateRiskAssessment;
  pathogen_risk: PathogenRiskAssessment;
  agricultural_mitigation: AgriculturalMitigationPlan;

  location: {
    input_address: string;
    matched_address: string;
    latitude: number;
    longitude: number;
    county?: string;
    state?: string;
  };
  environmental_data: {
    elevation_ft: number;
    slope_percent: number;
    precipitation_summary: {
      current_day_rain_inches: number;
      next_day_rain_inches: number;
      total_48h_rain_inches: number;
      rain_probability_pct: number;
    };
    soil_conditions: {
      saturation_level: "Low" | "Moderate" | "Saturated (High Infiltration Risk)";
      iowa_mesonet?: IowaStationData;
    };
    regional_nitrate_baseline: {
      usgs_reading_mg_L: number;
      epa_standard_mg_L: number;
      station_name: string;
    };
    well_profile: {
      depth_ft: number;
      aquifer_classification: "Shallow Unconfined" | "Intermediate Glacial" | "Deep Bedrock / Confined";
      runoff_susceptibility: "High" | "Moderate" | "Low";
    };
  };
}

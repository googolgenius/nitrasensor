import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  RiskAnalysisRequest,
  RiskAnalysisResponse,
  IowaStationData,
  PathogenRiskAssessment,
  NitrateRiskAssessment,
  AgriculturalMitigationPlan,
} from "@/types/oracle";
import { runONNXModelInference } from "@/lib/mlModel";

const DEFAULT_LAT = 41.8828;
const DEFAULT_LON = -93.6786;
const DEFAULT_ADDRESS = "Slater, Story County, IA";

// Helper: Geocode using US Census, Photon (rural routes), or Open-Meteo
async function geocodeAddress(address: string): Promise<{
  lat: number;
  lon: number;
  matchedAddress: string;
  county?: string;
  state: string;
}> {
  // 1. Try US Census Geocoder
  try {
    const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(
      address
    )}&benchmark=2020&format=json`;
    const res = await fetch(censusUrl, {
      headers: { "User-Agent": "Nitrasensor/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const match = data?.result?.addressMatches?.[0];
      if (match?.coordinates) {
        return {
          lat: Number(match.coordinates.y),
          lon: Number(match.coordinates.x),
          matchedAddress: match.matchedAddress || address,
          county: match.addressComponents?.county,
          state: match.addressComponents?.state || "IA",
        };
      }
    }
  } catch (e) {
    // Continue
  }

  // 2. Try Photon (handles rural routes, county roads, e.g. "3003 330th St Slater IA")
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(photonUrl, {
      headers: { "User-Agent": "Nitrasensor/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const feature = data?.features?.[0];
      if (feature?.geometry?.coordinates) {
        const [lon, lat] = feature.geometry.coordinates;
        const props = feature.properties || {};
        const parts = [
          props.name || props.street,
          props.city,
          props.county ? `${props.county} County` : null,
          props.state || "IA",
          props.postcode,
        ].filter(Boolean);

        return {
          lat,
          lon,
          matchedAddress: parts.join(", ") || address,
          county: props.county,
          state: props.state || "IA",
        };
      }
    }
  } catch (e) {
    // Continue
  }

  // 3. Fallback to Open-Meteo Geocoding
  try {
    const openMeteoGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      address
    )}&count=1&language=en&format=json`;
    const res = await fetch(openMeteoGeoUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const geoData = await res.json();
      const match = geoData?.results?.[0];
      if (match) {
        return {
          lat: match.latitude,
          lon: match.longitude,
          matchedAddress: `${match.name}, ${match.admin1 || "IA"}, US`,
          county: match.admin2,
          state: match.admin1 || "IA",
        };
      }
    }
  } catch (e) {
    // Continue
  }

  return {
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
    matchedAddress: `${address} (${DEFAULT_ADDRESS})`,
    county: "Story County",
    state: "IA",
  };
}

// Helper: Query Iowa State University Soil Moisture Network (ISUSM)
async function fetchIowaMesonetSoil(lat: number, lon: number): Promise<IowaStationData | undefined> {
  try {
    const url = "https://mesonet.agron.iastate.edu/api/1/currents.json?network=ISUSM";
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return undefined;

    const json = await res.json();
    const stations: any[] = json?.data || [];
    if (!stations.length) return undefined;

    let nearestStation: any = null;
    let minDistance = Infinity;

    for (const st of stations) {
      if (st.lat && st.lon) {
        const dLat = st.lat - lat;
        const dLon = st.lon - lon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        if (dist < minDistance) {
          minDistance = dist;
          nearestStation = st;
        }
      }
    }

    if (nearestStation) {
      const distanceMiles = Math.round(minDistance * 69);
      return {
        stationId: nearestStation.station,
        stationName: nearestStation.name || "ISU Agronomy Station",
        county: nearestStation.county || "Iowa",
        distanceMiles,
        soilMoisture12in: nearestStation.c2smv ? Math.round(nearestStation.c2smv * 10) / 10 : undefined,
        soilMoisture24in: nearestStation.c3smv ? Math.round(nearestStation.c3smv * 10) / 10 : undefined,
        soilTempF: nearestStation.c2tmpf ? Math.round(nearestStation.c2tmpf) : undefined,
      };
    }
  } catch (e) {
    // Continue
  }
  return undefined;
}

// Helper: Fetch real elevation and slope gradient
async function fetchElevationAndSlope(lat: number, lon: number): Promise<{ elevationFt: number; slopePercent: number }> {
  try {
    const offsetLat = lat + 0.0045; // ~500m
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat},${offsetLat}&longitude=${lon},${lon}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const elev1 = data?.elevation?.[0] ?? 280;
      const elev2 = data?.elevation?.[1] ?? 285;
      const elevationFt = Math.round(elev1 * 3.28084);
      const diffMeters = Math.abs(elev1 - elev2);
      const slopePercent = Math.max(1.0, Math.min(22.0, Math.round((diffMeters / 500) * 100 * 10) / 10));
      return { elevationFt, slopePercent };
    }
  } catch (e) {
    // Continue
  }
  return { elevationFt: 920, slopePercent: 3.2 };
}

// Helper: Fetch rainfall forecast and soil conditions
async function fetchWeather(
  lat: number,
  lon: number,
  scenario?: "current" | "heavy_storm" | "dry"
): Promise<{
  currentDayRainInches: number;
  nextDayRainInches: number;
  total48hRainInches: number;
  rainProbPct: number;
  soilMoistureVal: number;
  soilSaturationLevel: "Low" | "Moderate" | "Saturated (High Infiltration Risk)";
}> {
  if (scenario === "heavy_storm") {
    return {
      currentDayRainInches: 1.45,
      nextDayRainInches: 1.15,
      total48hRainInches: 2.6,
      rainProbPct: 90,
      soilMoistureVal: 0.42,
      soilSaturationLevel: "Saturated (High Infiltration Risk)",
    };
  }

  if (scenario === "dry") {
    return {
      currentDayRainInches: 0.0,
      nextDayRainInches: 0.0,
      total48hRainInches: 0.0,
      rainProbPct: 5,
      soilMoistureVal: 0.16,
      soilSaturationLevel: "Low",
    };
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max&hourly=soil_moisture_0_to_1cm&timezone=auto&forecast_days=2`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const day1Mm = data?.daily?.precipitation_sum?.[0] ?? 0;
      const day2Mm = data?.daily?.precipitation_sum?.[1] ?? 0;
      const totalMm = day1Mm + day2Mm;

      const currentDayRainInches = Math.round((day1Mm / 25.4) * 100) / 100;
      const nextDayRainInches = Math.round((day2Mm / 25.4) * 100) / 100;
      const total48hRainInches = Math.round((totalMm / 25.4) * 100) / 100;

      const rainProbPct = Math.max(...(data?.daily?.precipitation_probability_max?.slice(0, 2) || [10]));

      const hourly: number[] = data?.hourly?.soil_moisture_0_to_1cm || [];
      const moistureVal = hourly.length ? hourly[hourly.length - 1] : 0.26;
      const soilMoistureVal = Math.round(moistureVal * 100) / 100;

      let soilSaturationLevel: "Low" | "Moderate" | "Saturated (High Infiltration Risk)" = "Moderate";
      if (soilMoistureVal >= 0.35) {
        soilSaturationLevel = "Saturated (High Infiltration Risk)";
      } else if (soilMoistureVal < 0.20) {
        soilSaturationLevel = "Low";
      }

      return {
        currentDayRainInches,
        nextDayRainInches,
        total48hRainInches,
        rainProbPct,
        soilMoistureVal,
        soilSaturationLevel,
      };
    }
  } catch (e) {
    // Continue
  }

  return {
    currentDayRainInches: 0.25,
    nextDayRainInches: 0.45,
    total48hRainInches: 0.7,
    rainProbPct: 45,
    soilMoistureVal: 0.28,
    soilSaturationLevel: "Moderate",
  };
}

// Helper: Fetch USGS Iowa stream nitrate sensor data (nearest active sensor)
async function fetchUSGSIowaNitrate(
  lat?: number,
  lon?: number,
  county?: string
): Promise<{ readingMgL: number; stationName: string; distanceMiles?: number }> {
  try {
    const url = "https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=ia&parameterCd=99133,00618&period=P7D";
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const timeSeries = data?.value?.timeSeries;
      if (Array.isArray(timeSeries) && timeSeries.length > 0) {
        let nearest: { readingMgL: number; stationName: string; distanceMiles: number } | null = null;
        let minDist = Infinity;

        for (const ts of timeSeries) {
          const geo = ts?.sourceInfo?.geoLocation?.geogLocation;
          const vals = ts?.values?.[0]?.value;
          if (!Array.isArray(vals) || vals.length === 0) continue;

          // Find latest valid numeric reading
          let latestVal: number | null = null;
          for (let i = vals.length - 1; i >= 0; i--) {
            const v = parseFloat(vals[i]?.value);
            if (!isNaN(v) && v >= 0 && v < 50) {
              latestVal = v;
              break;
            }
          }
          if (latestVal === null) continue;

          if (lat !== undefined && lon !== undefined && geo?.latitude && geo?.longitude) {
            const dLat = geo.latitude - lat;
            const dLon = geo.longitude - lon;
            const dist = Math.sqrt(dLat * dLat + dLon * dLon);
            if (dist < minDist) {
              minDist = dist;
              nearest = {
                readingMgL: Math.round(latestVal * 10) / 10,
                stationName: ts?.sourceInfo?.siteName || "USGS River Sensor",
                distanceMiles: Math.round(dist * 69),
              };
            }
          } else {
            return {
              readingMgL: Math.round(latestVal * 10) / 10,
              stationName: ts?.sourceInfo?.siteName || "USGS River Sensor",
            };
          }
        }

        if (nearest) {
          return nearest;
        }
      }
    }
  } catch (e) {
    // Continue
  }

  // Watershed-specific regional baseline fallback if USGS service times out
  let regionalFallback = 6.8;
  let basinName = "USGS Iowa River Basin Network";
  if (county && /winneshiek|allamakee|clayton|fayette|decorah/i.test(county)) {
    regionalFallback = 4.2;
    basinName = "Upper Iowa / Turkey River Basin";
  } else if (county && /story|boone|hamilton|webster|polk|ames/i.test(county)) {
    regionalFallback = 7.4;
    basinName = "Des Moines River / South Skunk Basin";
  } else if (county && /iowa|johnson|cedar|benton|linn/i.test(county)) {
    regionalFallback = 5.9;
    basinName = "Middle Iowa / Cedar River Basin";
  }

  return {
    readingMgL: regionalFallback,
    stationName: basinName,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: RiskAnalysisRequest = await req.json();
    const {
      address,
      wellDepth,
      weatherScenario,
      wellDepthFt: directWellDepth,
      precip48hIn: directPrecip,
      soilMoisturePct: directSoilMoist,
      slopePct: directSlope,
      usgsBaselineMgL: directUsgs,
    } = body;

    let depthFt: number;
    let precip48hIn: number;
    let soilMoisturePct: number;
    let slopePercent: number;
    let usgsBaselineMgL: number;
    let elevationFt = 920;
    let location: {
      matchedAddress: string;
      lat: number;
      lon: number;
      county?: string;
      state: string;
    } = {
      matchedAddress: DEFAULT_ADDRESS,
      lat: DEFAULT_LAT,
      lon: DEFAULT_LON,
      county: "Story County",
      state: "IA",
    };
    let weather: {
      currentDayRainInches: number;
      nextDayRainInches: number;
      total48hRainInches: number;
      rainProbPct: number;
      soilMoistureVal: number;
      soilSaturationLevel: "Low" | "Moderate" | "Saturated (High Infiltration Risk)";
    } = {
      currentDayRainInches: 0.25,
      nextDayRainInches: 0.45,
      total48hRainInches: 0.7,
      rainProbPct: 45,
      soilMoistureVal: 0.28,
      soilSaturationLevel: "Moderate",
    };
    let iowaMesonetStation: IowaStationData | undefined = undefined;
    let usgs = {
      readingMgL: 7.6,
      stationName: "USGS Iowa River Basin Network",
    };

    // Support both direct 5-feature API payload and standard address-driven evaluation
    if (directWellDepth !== undefined && directPrecip !== undefined) {
      depthFt = Number(directWellDepth);
      precip48hIn = Number(directPrecip);
      soilMoisturePct = Number(directSoilMoist ?? 30);
      slopePercent = Number(directSlope ?? 3.2);
      usgsBaselineMgL = Number(directUsgs ?? 6.5);
      if (address) {
        location = await geocodeAddress(address);
      }
    } else {
      if (!address || typeof address !== "string" || !address.trim()) {
        return NextResponse.json({ error: "Please enter an Iowa property address or town." }, { status: 400 });
      }

      // Step 1: Geocoding
      location = await geocodeAddress(address);

      // Step 2: Well Depth Resolution (defaults to Iowa DNR state average of 175 ft, or region-specific drilling depth)
      if (wellDepth !== undefined && wellDepth !== null && !isNaN(Number(wellDepth)) && Number(wellDepth) > 0) {
        depthFt = Number(wellDepth);
      } else {
        // Iowa DNR State Water-Well Drilling Statistics:
        // Statewide average rural drinking well is ~175 ft.
        // Northeast Paleozoic Karst plateau: shallower fractured bedrock (120 ft).
        // Northwest Iowa deep bedrock / Dakota sandstone: deeper (220 ft).
        const isKarstNeIowa = location.lat > 42.5 && location.lon > -92.0;
        const isNorthwestDeep = location.lat > 42.8 && location.lon < -94.5;
        if (isKarstNeIowa) {
          depthFt = 120;
        } else if (isNorthwestDeep) {
          depthFt = 220;
        } else {
          depthFt = 175; // Iowa statewide rural well average (Iowa DNR & DrillerDB)
        }
      }

      // Step 3: Topography & Slope
      const topo = await fetchElevationAndSlope(location.lat, location.lon);
      elevationFt = topo.elevationFt;
      slopePercent = topo.slopePercent;

      // Step 4: Weather Forecast & Soil Saturation
      weather = await fetchWeather(location.lat, location.lon, weatherScenario);

      // Step 5: Iowa State University Soil Moisture Network (ISUSM)
      iowaMesonetStation = await fetchIowaMesonetSoil(location.lat, location.lon);

      // Step 6: USGS Iowa River Nitrate Baseline
      usgs = await fetchUSGSIowaNitrate(location.lat, location.lon, location.county);

      precip48hIn = weather.total48hRainInches;
      soilMoisturePct = Math.round(weather.soilMoistureVal * 100);
      usgsBaselineMgL = usgs.readingMgL;
    }

    // Well classification
    let aquiferClass: "Shallow Unconfined" | "Intermediate Glacial" | "Deep Bedrock / Confined" = "Intermediate Glacial";
    let susceptibility: "High" | "Moderate" | "Low" = "Moderate";

    if (depthFt < 50) {
      aquiferClass = "Shallow Unconfined";
      susceptibility = "High";
    } else if (depthFt > 180) {
      aquiferClass = "Deep Bedrock / Confined";
      susceptibility = "Low";
    }

    // --- Step 6: Nitrasensor ML Model Inference (ONNX Runtime) ---
    const mlInference = await runONNXModelInference({
      wellDepthFt: depthFt,
      precip48hIn,
      soilMoisturePct,
      slopePct: slopePercent,
      usgsBaselineMgL,
    });

    // Determine status based on ML composite score
    const totalScore = mlInference.mlCompositeScore;
    let status: "LOW" | "MODERATE" | "HIGH" = "LOW";
    let advisory_title = "Normal Baseline Conditions";

    if (totalScore >= 75) {
      status = "HIGH";
      advisory_title = "Elevated Runoff Advisory (High Contamination Potential)";
    } else if (totalScore >= 40) {
      status = "MODERATE";
      advisory_title = "Moderate Leaching Potential";
    }

    // Dynamic Clinical and Hydrogeological AI Synthesis Engine
    const isKarst =
      (location.lat > 42.5 && location.lon > -92.0) ||
      (location.county && /winneshiek|allamakee|clayton|fayette/i.test(location.county)) ||
      /decorah/i.test(location.matchedAddress);

    const isTileDrainedLobe =
      (location.county && /story|boone|hamilton|webster|polk|dallas/i.test(location.county)) ||
      /slater|ames/i.test(location.matchedAddress);

    const isAlluvialValley =
      (location.county && /iowa|johnson|cedar|benton|linn/i.test(location.county)) ||
      /amana/i.test(location.matchedAddress);

    let regionalGeologyDesc = "Situated in rural agricultural Iowa, groundwater recharge is governed by topsoil percolation and seasonal water table fluctuations across the regional watershed.";
    if (isKarst) {
      regionalGeologyDesc = "This property lies in the Northeast Iowa Paleozoic Plateau (Driftless Area), characterized by fractured Ordovician Galena-Platteville karst limestone. Solution sinkholes and thin soil overburden create direct vertical conduits into bedrock aquifers, bypassing natural sedimentary filtration.";
    } else if (isTileDrainedLobe) {
      regionalGeologyDesc = "Located within the Des Moines Lobe glacial drift plain, the landscape features dense subsurface agricultural tile drainage (perforated 4-foot collector pipes) that short-circuit natural wetland denitrification, routing concentrated nitrate pulses directly into shallow recharge zones.";
    } else if (isAlluvialValley) {
      regionalGeologyDesc = "Situated in the Southern Iowa Drift Plain along the Iowa River alluvial corridor, this property features permeable sandy loam soils over unconfined alluvial gravels with a shallow water table, causing accelerated solute transport during storm events.";
    }

    let depthAnalysis = "";
    if (depthFt < 60) {
      depthAnalysis = `At ${depthFt} feet, this well draws from an unconfined surficial aquifer with minimal protective geological confining layers. Surface runoff and liquid livestock slurry can reach the well intake within 24 to 48 hours of significant rainfall.`;
    } else if (depthFt < 160) {
      depthAnalysis = `At ${depthFt} feet, this well taps intermediate glacial till formations. While discontinuous clay layers provide partial protection, preferential macropore flow through soil fractures and annular casing channels allows storm-mobilized nitrates to penetrate during heavy precipitation.`;
    } else {
      depthAnalysis = `At ${depthFt} feet, this well reaches deep bedrock formations protected by natural confining shale and till aquitards. While deeper aquifers have higher baseline filtration, fractured casing collars and regional recharge fissures remain susceptible during major overland runoff events.`;
    }

    let weatherImpact = "";
    if (precip48hIn >= 1.5 || soilMoisturePct >= 35) {
      weatherImpact = `Heavy forecast rainfall of ${precip48hIn} inches across saturated topsoil (${soilMoisturePct}% moisture) severely limits soil absorption, generating rapid overland sheet runoff and high hydraulic downward pressure. This mobilizes field-applied synthetic nitrogen and swine manure coliforms directly toward the wellhead.`;
    } else if (precip48hIn >= 0.4) {
      weatherImpact = `Moderate forecast rainfall of ${precip48hIn} inches across ${soilMoisturePct}% soil moisture initiates steady vadose zone percolation, leaching soluble nitrate-nitrogen ions downward toward the water table.`;
    } else {
      weatherImpact = `Low antecedent rainfall (${precip48hIn} inches) and ${soilMoisturePct}% soil moisture restrict active surface leaching. Water quality currently reflects stable ambient groundwater baseline conditions.`;
    }

    const mlSynthesis = `Nitrasensor ML predicts a nitrate concentration of ${mlInference.predictedNitrateMgL} mg/L (${
      mlInference.predictedNitrateExceedsMCL
        ? "CRITICAL: Exceeds the 10.0 mg/L EPA Safe Drinking Water Act Maximum Contaminant Level"
        : "Currently within the 10.0 mg/L EPA Drinking Water Standard"
    }) with an estimated ${mlInference.pathogenProbabilityPct}% probability of co-transported microbial pathogens (E. coli, Salmonella). The primary modeled risk driver is ${mlInference.featureAttributions[0].displayName} (${mlInference.featureAttributions[0].valueString}), accounting for ${mlInference.featureAttributions[0].contributionPct}% of total modeled variance.`;

    let reasoning = `${regionalGeologyDesc}\n\n${depthAnalysis}\n\n${weatherImpact}\n\n${mlSynthesis}`;

    let medical_recommendation = "";
    if (status === "HIGH") {
      medical_recommendation = `High runoff detected in your watershed. Pregnant women and infants under 6 months should switch to bottled water for the next 48 hours. Infants lack adult gastric acidity, allowing nitrates to convert into toxic nitrites that bind hemoglobin, causing life-threatening methemoglobinemia ('Blue Baby Syndrome'). Concurrently, a ${mlInference.pathogenProbabilityPct}% modeled pathogen risk presents acute hazards of bacterial gastroenteritis (E. coli O157:H7, Salmonella) for young children and elderly residents.\n\nCRITICAL DIRECTIVE: DO NOT BOIL WATER TO REMOVE NITRATES. Boiling evaporates water and concentrates chemical nitrates, increasing toxicity. Use certified bottled water or a verified Reverse Osmosis (RO) filtration system. For microbial disinfection only, boil water if nitrates are confirmed below 10 mg/L.`;
    } else if (status === "MODERATE") {
      medical_recommendation = `Elevated precipitation may accelerate bacterial leaching and nitrate movement into your well. Households with infants under 6 months, pregnant individuals, or immunocompromised family members should switch to certified bottled or reverse-osmosis purified water until storm runoff clears.\n\nWater Treatment Note: Standard particulate filters and boiling will NOT remove dissolved chemical nitrates. Verify your drinking water using certified county laboratory test strips, or utilize reverse-osmosis purification.`;
    } else {
      medical_recommendation = `Water currently meets baseline health expectations for private rural wells in your area. Maintain annual certified testing for total coliform bacteria and nitrates every spring through the Iowa DNR Grants-to-Counties program, or immediately following any severe storm event exceeding 2.0 inches of precipitation.`;
    }

    // Boiling water guidance
    const boiling_water_warning = "Boiling water note: While boiling eliminates biological pathogens like E. coli, it evaporates water and concentrates dissolved nitrates, which can increase chemical toxicity. If nitrate levels are elevated, boiling will not remove them. For infants under 6 months and pregnant individuals, use certified bottled or reverse-osmosis water. For healthy adults needing microbial disinfection, boil water only if nitrates have been confirmed below 10 mg/L.";

    // Agricultural mitigation plan
    let manureWindow: "Safe (Dry Soil Window)" | "Caution: Rain Approaching" | "Critical Hold: High Runoff Risk" = "Safe (Dry Soil Window)";
    if (precip48hIn >= 1.0 || soilMoisturePct >= 35) {
      manureWindow = "Critical Hold: High Runoff Risk";
    } else if (precip48hIn >= 0.25 || soilMoisturePct >= 28) {
      manureWindow = "Caution: Rain Approaching";
    }

    const agricultural_mitigation: AgriculturalMitigationPlan = {
      manure_application_window: manureWindow,
      setback_buffer_ft: depthFt < 50 ? 200 : 100,
      key_recommendations: [
        {
          title: "Enforce 48-Hour Application Holds",
          description: `With ${precip48hIn} inches of rainfall forecast, hold all liquid swine manure and synthetic nitrogen applications. Applying to saturated soils (${soilMoisturePct}% moisture) leads to direct overland runoff into neighboring wellheads.`,
        },
        {
          title: "Maintain 100-200 Ft Wellhead Setbacks",
          description: `Establish a minimum ${depthFt < 50 ? 200 : 100}-foot vegetated buffer around all private well casings where no manure, slurry, or nitrogen fertilizer is spread.`,
        },
        {
          title: "Grassed Waterways & Cover Crops",
          description: "Utilize fall cereal rye and vegetative filter strips to physically trap manure solids, absorb dissolved nitrates, and redirect surface water away from groundwater recharge zones.",
        },
      ],
    };

    const nitrate_risk: NitrateRiskAssessment = {
      score: Math.min(100, Math.round((mlInference.predictedNitrateMgL / 15.0) * 100)),
      status: mlInference.predictedNitrateMgL >= 10.0 ? "HIGH" : mlInference.predictedNitrateMgL >= 5.0 ? "MODERATE" : "LOW",
      clinical_impact: "Methemoglobinemia ('Blue Baby Syndrome') in infants; potential thyroid and reproductive risks with prolonged elevated exposure.",
    };

    const pathogen_risk: PathogenRiskAssessment = {
      score: mlInference.pathogenProbabilityPct,
      status: mlInference.pathogenProbabilityPct >= 75 ? "HIGH" : mlInference.pathogenProbabilityPct >= 40 ? "MODERATE" : "LOW",
      dominant_threats: ["E. coli O157:H7", "Salmonella enterica", "Campylobacter jejuni"],
      cafo_density_factor: "High Manure Pressure",
      clinical_impact: "Severe bacterial gastroenteritis, bloody diarrhea, and dehydration requiring hospitalization, particularly in young children and the elderly.",
      disinfection_guidance: "Continuous UV disinfection systems (class A) or shock chlorination for contaminated wellheads.",
    };

    // --- Step 7: LLM Synthesis (Gemini acts as Clinical Toxicologist interpreting ML predictions) ---
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const prompt = `You are a clinical environmental health toxicologist and hydrogeologist interpreting a machine learning groundwater risk model for a private well in rural Iowa.

NITRASENSOR ML MODEL OUTPUTS:
- ML Predicted Nitrate Concentration: ${mlInference.predictedNitrateMgL} mg/L (EPA Drinking Water Standard: 10.0 mg/L, Exceeds Standard: ${mlInference.predictedNitrateExceedsMCL})
- 90% Confidence Interval: [${mlInference.confidenceInterval.lowMgL} - ${mlInference.confidenceInterval.highMgL}] mg/L
- ML Modeled Pathogen Infiltration Probability (E. coli & Salmonella): ${mlInference.pathogenProbabilityPct}%
- ML Composite Score: ${mlInference.mlCompositeScore}/100
- Primary Feature Contributor: ${mlInference.featureAttributions[0].displayName} (${mlInference.featureAttributions[0].contributionPct}% weight)

ENVIRONMENTAL SENSOR DATA:
- Location: ${location.matchedAddress}
- Well Depth: ${depthFt} ft (${aquiferClass})
- 48h Rain Forecast: ${precip48hIn} inches
- Soil Saturation: ${soilMoisturePct}% moisture (${soilMoisturePct >= 35 ? "Saturated" : "Moderate"})
- USGS Regional Stream Nitrate: ${usgsBaselineMgL} mg/L

INSTRUCTIONS:
1. Act as the Clinical Toxicologist. Synthesize the ML model's predicted nitrate level and pathogen probability into a detailed, professional hydrogeological and medical explanation. Do NOT use emojis.
2. If overall risk > 75, you MUST include: "High runoff detected in your watershed. Pregnant women and infants under 6 months should switch to bottled water for the next 48 hours."
3. Respond in valid JSON:
{
  "reasoning": "<clinical and hydrogeological synthesis explaining why the ML model predicted these values, referencing the specific Iowa county/geology, well depth, and storm dynamics>",
  "medical_recommendation": "<practical medical, infant feeding, boiling water caution, and water safety recommendations>"
}`;

        const candidateModels = ["gemini-3.8-flash", "gemini-3.6-flash"];
        let generatedText = "";
        let usedModel = "";

        for (const candidate of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: candidate,
              contents: prompt,
              config: {
                temperature: 0.1,
              },
            });
            if (response.text) {
              generatedText = response.text.trim();
              usedModel = candidate;
              console.log(`[Gemini API] Successfully synthesized risk assessment with ${candidate}`);
              break;
            }
          } catch (modelErr: any) {
            console.warn(`[Gemini API] ${candidate} unavailable (${modelErr?.message || modelErr}), trying fallback...`);
          }
        }

        if (generatedText) {
          // Clean JSON string if wrapped in markdown code fence
          let cleanJson = generatedText;
          if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          }
          const parsed = JSON.parse(cleanJson);
          if (parsed.reasoning) reasoning = parsed.reasoning;
          if (parsed.medical_recommendation) medical_recommendation = parsed.medical_recommendation;
        }
      } catch (geminiErr) {
        console.warn("[Gemini API] All Gemini models failed, falling back to local clinical engine", geminiErr);
      }
    }

    const alert_triggered = totalScore > 75;
    const alert_message = alert_triggered
      ? "High runoff detected in your watershed. Pregnant women and infants under 6 months should switch to bottled water for the next 48 hours."
      : undefined;

    const result: RiskAnalysisResponse = {
      risk_score: totalScore,
      status,
      advisory_title,
      reasoning,
      medical_recommendation,
      boiling_water_warning,
      alert_triggered,
      alert_message,
      disclaimer:
        "Nitrasensor combines Nitrasensor ML predictions with real-time environmental sensors and Nitrasensor AI clinical evaluation. It is an informational predictive screening tool, not a certified laboratory water test.",
      ml_inference: mlInference,
      nitrate_risk,
      pathogen_risk,
      agricultural_mitigation,
      location: {
        input_address: address || location.matchedAddress,
        matched_address: location.matchedAddress,
        latitude: location.lat,
        longitude: location.lon,
        county: location.county,
        state: location.state,
      },
      environmental_data: {
        elevation_ft: elevationFt,
        slope_percent: slopePercent,
        precipitation_summary: {
          current_day_rain_inches: weather.currentDayRainInches,
          next_day_rain_inches: weather.nextDayRainInches,
          total_48h_rain_inches: precip48hIn,
          rain_probability_pct: weather.rainProbPct,
        },
        soil_conditions: {
          saturation_level: soilMoisturePct >= 35 ? "Saturated (High Infiltration Risk)" : soilMoisturePct >= 25 ? "Moderate" : "Low",
          iowa_mesonet: iowaMesonetStation,
        },
        regional_nitrate_baseline: {
          usgs_reading_mg_L: usgsBaselineMgL,
          epa_standard_mg_L: 10.0,
          station_name: usgs.stationName,
        },
        well_profile: {
          depth_ft: depthFt,
          aquifer_classification: aquiferClass,
          runoff_susceptibility: susceptibility,
        },
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error in /api/analyze-risk:", err);
    return NextResponse.json(
      { error: "Unable to process well risk analysis. Please verify your address and try again." },
      { status: 500 }
    );
  }
}

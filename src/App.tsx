import { useEffect, useRef, useState } from "react";
import "./App.css";

type TruckStatus =
  | "NORMAL"
  | "FOG"
  | "WARNING"
  | "REROUTING";

type Truck = {
  id: string;
  x: number;
  y: number;
  speed: number;
  baseSpeed: number;
  route: number;
  status: TruckStatus;
};

type Alert = {
  id: number;
  type: "danger" | "warning" | "info";
  title: string;
  message: string;
};

type Weather = {
  fogDensity: number;
  rainfall: number;
  humidity: number;
  visibility: number;
  windSpeed: number;
};

type DangerPair = {
  truck1: string;
  truck2: string;
  distance: number;
};

const DANGER_DISTANCE_METERS = 10;
const DENSE_FOG_VISIBILITY = 60;
const FOG_ZONE_RADIUS = 18;

const initialTrucks: Truck[] = [
  {
    id: "T01",
    x: 8,
    y: 18,
    speed: 0.32,
    baseSpeed: 0.32,
    route: 1,
    status: "NORMAL",
  },
  {
    id: "T02",
    x: 25,
    y: 30,
    speed: 0.28,
    baseSpeed: 0.28,
    route: 1,
    status: "NORMAL",
  },
  {
    id: "T03",
    x: 52,
    y: 42,
    speed: 0.25,
    baseSpeed: 0.25,
    route: 2,
    status: "NORMAL",
  },
  {
    id: "T04",
    x: 42,
    y: 48,
    speed: 0.3,
    baseSpeed: 0.3,
    route: 2,
    status: "NORMAL",
  },
  {
    id: "T05",
    x: 15,
    y: 67,
    speed: 0.27,
    baseSpeed: 0.27,
    route: 3,
    status: "NORMAL",
  },
  {
    id: "T06",
    x: 68,
    y: 76,
    speed: 0.24,
    baseSpeed: 0.24,
    route: 3,
    status: "NORMAL",
  },
  {
    id: "T07",
    x: 72,
    y: 26,
    speed: 0.31,
    baseSpeed: 0.31,
    route: 1,
    status: "NORMAL",
  },
  {
    id: "T08",
    x: 78,
    y: 55,
    speed: 0.29,
    baseSpeed: 0.29,
    route: 2,
    status: "NORMAL",
  },
];

function App() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [trucks, setTrucks] =
    useState<Truck[]>(initialTrucks);

  const [isRunning, setIsRunning] =
    useState(true);

  const [simulationSpeed, setSimulationSpeed] =
    useState(1);

  const [visibility, setVisibility] =
    useState(100);

  const [weather, setWeather] =
    useState<Weather>({
      fogDensity: 35,
      rainfall: 20,
      humidity: 72,
      visibility: 100,
      windSpeed: 12,
    });

  const [alerts, setAlerts] =
    useState<Alert[]>([]);

  const [eventHistory, setEventHistory] =
    useState<string[]>([
      "System initialized successfully",
      "GPS/DGPS tracking connected",
      "V2V communication active",
      "V2I control channel connected",
      "Digital Twin initialized",
    ]);

  const [time, setTime] =
    useState(0);

  const [selectedTruckId, setSelectedTruckId] =
    useState<string | null>(null);

  const [buzzerOn, setBuzzerOn] =
    useState(false);

  const [ledOn, setLedOn] =
    useState(false);

  const [dangerPair, setDangerPair] =
    useState<DangerPair | null>(null);

  // ==========================================================
  // AUDIO
  // ==========================================================

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const buzzerIntervalRef =
    useRef<number | null>(null);

  /*
    Creates/gets the browser audio context.

    Brave requires a user interaction before
    audio can normally start, so the Test Buzzer
    button and Start button call this function.
  */

  const getAudioContext = () => {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current =
        new AudioContextClass();
    }

    return audioContextRef.current;
  };

  // ==========================================================
  // PLAY ONE BUZZ
  // ==========================================================

  const playBuzzer = () => {
    const audioContext =
      getAudioContext();

    if (!audioContext) {
      return;
    }

    if (
      audioContext.state ===
      "suspended"
    ) {
      audioContext.resume();
    }

    const oscillator =
      audioContext.createOscillator();

    const gainNode =
      audioContext.createGain();

    oscillator.type = "square";

    oscillator.frequency.setValueAtTime(
      850,
      audioContext.currentTime,
    );

    gainNode.gain.setValueAtTime(
      0.25,
      audioContext.currentTime,
    );

    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.45,
    );

    oscillator.connect(
      gainNode,
    );

    gainNode.connect(
      audioContext.destination,
    );

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime +
        0.45,
    );
  };

  // ==========================================================
  // TEST BUZZER
  // ==========================================================

  const testBuzzer = () => {
    playBuzzer();

    addEvent(
      "🔊 Manual buzzer test activated",
    );
  };

  // ==========================================================
  // ACTIVATE / DEACTIVATE CONTINUOUS BUZZER
  // ==========================================================

  useEffect(() => {
    if (
      buzzerOn &&
      dangerPair
    ) {
      // Immediately play once
      playBuzzer();

      // Then repeat every 800ms
      buzzerIntervalRef.current =
        window.setInterval(
          () => {
            playBuzzer();
          },
          800,
        );
    } else {
      if (
        buzzerIntervalRef.current !==
        null
      ) {
        window.clearInterval(
          buzzerIntervalRef.current,
        );

        buzzerIntervalRef.current =
          null;
      }
    }

    return () => {
      if (
        buzzerIntervalRef.current !==
        null
      ) {
        window.clearInterval(
          buzzerIntervalRef.current,
        );

        buzzerIntervalRef.current =
          null;
      }
    };
  }, [
    buzzerOn,
    dangerPair,
  ]);

  // ==========================================================
  // FOG ZONE
  // ==========================================================

  const fogZone = {
    x: 50,
    y: 45,
    radius: FOG_ZONE_RADIUS,
  };

  // ==========================================================
  // DISTANCE
  // ==========================================================

  const calculateDistance = (
    a: Truck,
    b: Truck,
  ) => {
    const dx =
      a.x - b.x;

    const dy =
      a.y - b.y;

    return Math.sqrt(
      dx * dx + dy * dy,
    );
  };

  // ==========================================================
  // DISTANCE FROM FOG
  // ==========================================================

  const calculateFogDistance = (
    truck: Truck,
  ) => {
    const dx =
      truck.x -
      fogZone.x;

    const dy =
      truck.y -
      fogZone.y;

    return Math.sqrt(
      dx * dx + dy * dy,
    );
  };

  // ==========================================================
  // RISK MODEL
  // ==========================================================

  const calculateRiskScore = (
    truck: Truck,
    nearestTruck: Truck | null,
    nearestDistance: number,
  ) => {
    if (!nearestTruck) {
      return 0;
    }

    const distanceRisk =
      Math.max(
        0,
        100 -
          nearestDistance *
            9,
      );

    const speedDifference =
      Math.abs(
        truck.speed -
          nearestTruck.speed,
      );

    const speedRisk =
      Math.min(
        30,
        speedDifference *
          180,
      );

    const visibilityRisk =
      Math.max(
        0,
        (100 - visibility) *
          0.25,
      );

    return Math.min(
      100,
      Math.round(
        distanceRisk * 0.55 +
          speedRisk +
          visibilityRisk,
      ),
    );
  };

  // ==========================================================
  // EVENT HISTORY
  // ==========================================================

  const addEvent = (
    message: string,
  ) => {
    setEventHistory(
      (current) => [
        `${new Date().toLocaleTimeString()} — ${message}`,
        ...current.slice(0, 9),
      ],
    );
  };

  // ==========================================================
  // MAIN SIMULATION
  // ==========================================================

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          // -----------------------------------------------
          // CLOCK
          // -----------------------------------------------

          setTime(
            (current) =>
              current + 1,
          );

          // -----------------------------------------------
          // WEATHER
          // -----------------------------------------------

          setWeather(
            (current) => {
              const fogChange =
                Math.round(
                  Math.random() *
                    8 -
                    4,
                );

              const rainChange =
                Math.round(
                  Math.random() *
                    6 -
                    3,
                );

              const humidityChange =
                Math.round(
                  Math.random() *
                    4 -
                    2,
                );

              const windChange =
                Math.round(
                  Math.random() *
                    4 -
                    2,
                );

              const fogDensity =
                Math.max(
                  15,
                  Math.min(
                    95,
                    current.fogDensity +
                      fogChange,
                  ),
                );

              const rainfall =
                Math.max(
                  0,
                  Math.min(
                    100,
                    current.rainfall +
                      rainChange,
                  ),
                );

              const humidity =
                Math.max(
                  50,
                  Math.min(
                    100,
                    current.humidity +
                      humidityChange,
                  ),
                );

              const windSpeed =
                Math.max(
                  5,
                  Math.min(
                    40,
                    current.windSpeed +
                      windChange,
                  ),
                );

              const calculatedVisibility =
                Math.max(
                  3,
                  Math.round(
                    100 -
                      fogDensity *
                        0.72 -
                      rainfall *
                        0.18,
                  ),
                );

              return {
                fogDensity,
                rainfall,
                humidity,
                visibility:
                  calculatedVisibility,
                windSpeed,
              };
            },
          );

          // -----------------------------------------------
          // MOVE TRUCKS
          // -----------------------------------------------

          setTrucks(
            (currentTrucks) => {
              const updatedTrucks =
                currentTrucks.map(
                  (truck) => {
                    const distanceFromFog =
                      calculateFogDistance(
                        truck,
                      );

                    const insideFog =
                      distanceFromFog <
                      fogZone.radius;

                    let newSpeed =
                      truck.baseSpeed;

                    if (
                      insideFog
                    ) {
                      newSpeed =
                        truck.baseSpeed *
                        0.4;
                    }

                    let newX =
                      truck.x +
                      newSpeed *
                        simulationSpeed;

                    if (
                      newX > 96
                    ) {
                      newX = 4;
                    }

                    return {
                      ...truck,
                      x: newX,
                      speed:
                        newSpeed,
                      status:
                        insideFog
                          ? "FOG"
                          : "NORMAL",
                    };
                  },
                );

              const newAlerts: Alert[] =
                [];

              const reroutingTrucks =
                new Set<string>();

              let detectedDangerPair:
                DangerPair | null =
                null;

              // -------------------------------------------
              // V2V COLLISION DETECTION
              // -------------------------------------------

              for (
                let i = 0;
                i <
                updatedTrucks.length;
                i++
              ) {
                for (
                  let j =
                    i + 1;
                  j <
                    updatedTrucks.length;
                  j++
                ) {
                  const truckA =
                    updatedTrucks[i];

                  const truckB =
                    updatedTrucks[j];

                  const distance =
                    calculateDistance(
                      truckA,
                      truckB,
                    );

                  const truckAInFog =
                    calculateFogDistance(
                      truckA,
                    ) <
                    fogZone.radius;

                  const truckBInFog =
                    calculateFogDistance(
                      truckB,
                    ) <
                    fogZone.radius;

                  /*
                    MAIN DANGER CONDITION

                    Dense fog
                    +
                    Both trucks inside fog
                    +
                    Distance <= 10m
                  */

                  const denseFog =
                    visibility <=
                    DENSE_FOG_VISIBILITY;

                  if (
                    denseFog &&
                    truckAInFog &&
                    truckBInFog &&
                    distance <=
                      DANGER_DISTANCE_METERS
                  ) {
                    const risk =
                      Math.min(
                        100,
                        Math.round(
                          100 -
                            distance *
                              7,
                        ),
                      );

                    detectedDangerPair =
                      {
                        truck1:
                          truckA.id,
                        truck2:
                          truckB.id,
                        distance,
                      };

                    newAlerts.push({
                      id:
                        Date.now() +
                        i * 100 +
                        j,

                      type: "danger",

                      title:
                        "DENSE FOG COLLISION RISK",

                      message:
                        `${truckA.id} ↔ ${truckB.id} — ` +
                        `${distance.toFixed(
                          1,
                        )} m apart — ` +
                        `${risk}% risk — ` +
                        `TARGETED WARNING SENT`,
                    });

                    reroutingTrucks.add(
                      truckB.id,
                    );
                  }

                  // -----------------------------------------
                  // NORMAL V2V WARNING
                  // -----------------------------------------

                  else if (
                    distance < 12
                  ) {
                    const risk =
                      Math.min(
                        100,
                        Math.round(
                          100 -
                            distance *
                              7,
                        ),
                      );

                    newAlerts.push({
                      id:
                        Date.now() +
                        i * 100 +
                        j,

                      type:
                        risk >=
                        70
                          ? "danger"
                          : "warning",

                      title:
                        risk >=
                        70
                          ? "HIGH COLLISION RISK"
                          : "V2V PROXIMITY WARNING",

                      message:
                        `${truckA.id} ↔ ${truckB.id} — ` +
                        `${risk}% risk — ` +
                        `${distance.toFixed(
                          1,
                        )} m apart`,
                    });

                    if (
                      distance <=
                      DANGER_DISTANCE_METERS
                    ) {
                      reroutingTrucks.add(
                        truckB.id,
                      );
                    }
                  }
                }
              }

              // -------------------------------------------
              // HARDWARE OUTPUT
              // -------------------------------------------

              if (
                detectedDangerPair
              ) {
                setDangerPair(
                  detectedDangerPair,
                );

                setBuzzerOn(
                  true,
                );

                setLedOn(true);
              } else {
                setDangerPair(
                  null,
                );

                setBuzzerOn(
                  false,
                );

                setLedOn(false);
              }

              // -------------------------------------------
              // FOG ALERTS
              // -------------------------------------------

              updatedTrucks.forEach(
                (
                  truck,
                  index,
                ) => {
                  const distanceFromFog =
                    calculateFogDistance(
                      truck,
                    );

                  if (
                    distanceFromFog <
                    fogZone.radius
                  ) {
                    newAlerts.push({
                      id:
                        10000 +
                        index +
                        Math.floor(
                          Date.now() /
                            1000,
                        ),

                      type: "warning",

                      title:
                        "LOW VISIBILITY",

                      message:
                        `${truck.id} entered fog zone — speed automatically reduced`,
                    });
                  }
                },
              );

              // -------------------------------------------
              // UNIQUE ALERTS
              // -------------------------------------------

              const uniqueAlerts =
                newAlerts.filter(
                  (
                    alert,
                    index,
                    self,
                  ) =>
                    index ===
                    self.findIndex(
                      (
                        item,
                      ) =>
                        item.title ===
                          alert.title &&
                        item.message ===
                          alert.message,
                    ),
                );

              setAlerts(
                uniqueAlerts,
              );

              // -------------------------------------------
              // REROUTING
              // -------------------------------------------

              return updatedTrucks.map(
                (truck) => {
                  if (
                    reroutingTrucks.has(
                      truck.id,
                    )
                  ) {
                    return {
                      ...truck,

                      status:
                        "REROUTING",

                      y:
                        truck.y >
                        50
                          ? Math.max(
                              10,
                              truck.y -
                                0.5,
                            )
                          : Math.min(
                              90,
                              truck.y +
                                0.5,
                            ),
                    };
                  }

                  return truck;
                },
              );
            },
          );
        },
        180,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [
    isRunning,
    simulationSpeed,
    visibility,
  ]);

  // ==========================================================
  // VISIBILITY
  // ==========================================================

  useEffect(() => {
    const trucksInFog =
      trucks.filter(
        (truck) =>
          calculateFogDistance(
            truck,
          ) <
          fogZone.radius,
      );

    const localVisibility =
      Math.max(
        3,
        weather.visibility -
          trucksInFog.length *
            4,
      );

    setVisibility(
      localVisibility,
    );
  }, [
    trucks,
    weather.visibility,
  ]);

  // ==========================================================
  // COLLISION EVENT
  // ==========================================================

  useEffect(() => {
    const collisionAlert =
      alerts.find(
        (alert) =>
          alert.type ===
          "danger",
      );

    if (
      collisionAlert
    ) {
      setEventHistory(
        (current) => {
          if (
            current[0]?.includes(
              collisionAlert.message,
            )
          ) {
            return current;
          }

          return [
            `${new Date().toLocaleTimeString()} — ⚠ ${collisionAlert.message}`,
            ...current.slice(
              0,
              9,
            ),
          ];
        },
      );
    }
  }, [alerts]);

  // ==========================================================
  // HARDWARE EVENT
  // ==========================================================

  useEffect(() => {
    if (
      buzzerOn &&
      ledOn &&
      dangerPair
    ) {
      setEventHistory(
        (current) => {
          const message =
            `🔴 HARDWARE ALERT — ${dangerPair.truck1} & ${dangerPair.truck2} — Buzzer + LED activated`;

          if (
            current[0]?.includes(
              "HARDWARE ALERT",
            )
          ) {
            return current;
          }

          return [
            `${new Date().toLocaleTimeString()} — ${message}`,
            ...current.slice(
              0,
              9,
            ),
          ];
        },
      );
    }
  }, [
    buzzerOn,
    ledOn,
    dangerPair,
  ]);

  // ==========================================================
  // RESET
  // ==========================================================

  const resetSimulation =
    () => {
      setTrucks(
        initialTrucks,
      );

      setAlerts([]);

      setVisibility(100);

      setWeather({
        fogDensity: 35,
        rainfall: 20,
        humidity: 72,
        visibility: 100,
        windSpeed: 12,
      });

      setTime(0);

      setSelectedTruckId(
        null,
      );

      setBuzzerOn(false);

      setLedOn(false);

      setDangerPair(null);

      setEventHistory([
        "Simulation reset",
        "All trucks returned to initial positions",
        "GPS/DGPS tracking restored",
        "V2V/V2I monitoring restarted",
        "Digital Twin synchronized",
      ]);

      setIsRunning(false);
    };

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const activeFogTrucks =
    trucks.filter(
      (truck) =>
        truck.status ===
        "FOG",
    ).length;

  const collisionCount =
    alerts.filter(
      (alert) =>
        alert.type ===
        "danger",
    ).length;

  const reroutingCount =
    trucks.filter(
      (truck) =>
        truck.status ===
        "REROUTING",
    ).length;

  const safetyScore =
    Math.max(
      0,
      100 -
        collisionCount *
          12 -
        activeFogTrucks *
          4 -
        reroutingCount *
          3,
    );

  const speedCompliance =
    Math.max(
      0,
      Math.round(
        ((trucks.length -
          activeFogTrucks) /
          trucks.length) *
          100,
      ),
    );

  const fogExposure =
    Math.round(
      (activeFogTrucks /
        trucks.length) *
        100,
    );

  const v2vRisk =
    Math.min(
      100,
      collisionCount *
        15,
    );

  // ==========================================================
  // SELECTED TRUCK
  // ==========================================================

  const selectedTruck =
    trucks.find(
      (truck) =>
        truck.id ===
        selectedTruckId,
    );

  // ==========================================================
  // CLOSEST TRUCK
  // ==========================================================

  let closestTruck:
    | Truck
    | null = null;

  let closestDistance =
    Infinity;

  if (
    selectedTruck
  ) {
    trucks.forEach(
      (truck) => {
        if (
          truck.id ===
          selectedTruck.id
        ) {
          return;
        }

        const distance =
          calculateDistance(
            selectedTruck,
            truck,
          );

        if (
          distance <
          closestDistance
        ) {
          closestDistance =
            distance;

          closestTruck =
            truck;
        }
      },
    );
  }

  // ==========================================================
  // SELECTED RISK
  // ==========================================================

  const selectedRisk =
    selectedTruck
      ? calculateRiskScore(
          selectedTruck,
          closestTruck,
          closestDistance,
        )
      : 0;

  const riskLevel =
    selectedRisk >= 70
      ? "HIGH"
      : selectedRisk >= 40
        ? "MEDIUM"
        : "LOW";

  const speedKmH =
    selectedTruck
      ? Math.round(
          selectedTruck.speed *
            200,
        )
      : 0;

  const baseSpeedKmH =
    selectedTruck
      ? Math.round(
          selectedTruck.baseSpeed *
            200,
        )
      : 0;

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    <div className="dashboard">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="topbar">

        <div className="brand">

          <div className="logo">
            ⛏
          </div>

          <div>

            <h1>
              Mine Safety Control Room
            </h1>

            <p>
              Haul Road Monitoring,
              Risk Detection & Digital
              Twin Simulation
            </p>

          </div>

        </div>

        <div className="top-status">

          <div className="clock">
            SIM TIME:{" "}
            {Math.floor(
              time / 60,
            )
              .toString()
              .padStart(2, "0")}
            :
            {(time % 60)
              .toString()
              .padStart(2, "0")}
          </div>

          <div
            className={`system-live ${
              isRunning
                ? ""
                : "paused"
            }`}
          >

            <span></span>

            {isRunning
              ? "SYSTEM LIVE"
              : "PAUSED"}

          </div>

        </div>

      </header>

      {/* ====================================================
          DASHBOARD
      ==================================================== */}

      <main className="dashboard-grid">

        {/* ==================================================
            LEFT PANEL
        ================================================== */}

        <aside className="left-panel">

          <h2>
            System Status
          </h2>

          <div className="system-item">
            <span>
              📡 GPS / DGPS Tracking
            </span>

            <strong>
              ONLINE
            </strong>
          </div>

          <div className="system-item">
            <span>
              🔗 V2V Communication
            </span>

            <strong>
              ACTIVE
            </strong>
          </div>

          <div className="system-item">
            <span>
              📶 V2I Control Channel
            </span>

            <strong>
              CONNECTED
            </strong>
          </div>

          <div className="system-item">
            <span>
              🛡 Safety Risk Engine
            </span>

            <strong>
              RUNNING
            </strong>
          </div>

          <div className="system-item">
            <span>
              🗺 Digital Twin
            </span>

            <strong>
              SYNCHRONIZED
            </strong>
          </div>

          <div className="system-item">
            <span>
              🌫 Visibility Monitor
            </span>

            <strong>
              {visibility}%
            </strong>
          </div>

          {/* =================================================
              HARDWARE
          ================================================= */}

          <h2 className="section-heading">
            Hardware Safety Output
          </h2>

          <div className="communication-card">

            <span>
              🔴 Warning LED
            </span>

            <strong>
              {ledOn
                ? "ON"
                : "OFF"}
            </strong>

          </div>

          <div className="communication-card">

            <span>
              🔊 Safety Buzzer
            </span>

            <strong>
              {buzzerOn
                ? "ON"
                : "OFF"}
            </strong>

          </div>

          <button
            className="control-btn primary"
            onClick={
              testBuzzer
            }
            style={{
              width: "100%",
              marginTop: "10px",
            }}
          >
            🔊 Test Buzzer
          </button>

          {dangerPair && (
            <div className="risk-summary">

              <div>

                <span>
                  Targeted Dumper Alert
                </span>

                <strong className="risk-high">
                  {dangerPair.truck1}
                  {" ↔ "}
                  {dangerPair.truck2}
                </strong>

              </div>

              <p>
                Distance:{" "}
                {dangerPair.distance.toFixed(
                  1,
                )}{" "}
                m
              </p>

            </div>
          )}

          {/* =================================================
              WEATHER
          ================================================= */}

          <h2 className="section-heading">
            Weather Monitor
          </h2>

          <div className="weather-grid">

            <div className="weather-card">

              <span>
                🌫
              </span>

              <strong>
                {weather.fogDensity}%
              </strong>

              <small>
                FOG DENSITY
              </small>

            </div>

            <div className="weather-card">

              <span>
                🌧
              </span>

              <strong>
                {weather.rainfall}%
              </strong>

              <small>
                RAINFALL
              </small>

            </div>

            <div className="weather-card">

              <span>
                💧
              </span>

              <strong>
                {weather.humidity}%
              </strong>

              <small>
                HUMIDITY
              </small>

            </div>

            <div className="weather-card">

              <span>
                💨
              </span>

              <strong>
                {weather.windSpeed} km/h
              </strong>

              <small>
                WIND SPEED
              </small>

            </div>

          </div>

          <div className="visibility-box">

            <span>
              Current Visibility
            </span>

            <strong>
              {visibility} m
            </strong>

            <small>
              Simulated sensor reading
            </small>

          </div>

          {/* =================================================
              LIVE STATS
          ================================================= */}

          <h2 className="section-heading">
            Live Statistics
          </h2>

          <div className="stat-grid">

            <div className="stat-box">

              <span>
                🚚
              </span>

              <strong>
                {trucks.length}
              </strong>

              <small>
                ACTIVE TRUCKS
              </small>

            </div>

            <div className="stat-box">

              <span>
                ⚠️
              </span>

              <strong>
                {alerts.length}
              </strong>

              <small>
                ACTIVE ALERTS
              </small>

            </div>

            <div className="stat-box">

              <span>
                🌫
              </span>

              <strong>
                {visibility} m
              </strong>

              <small>
                VISIBILITY
              </small>

            </div>

            <div className="stat-box">

              <span>
                🔴
              </span>

              <strong>
                {collisionCount}
              </strong>

              <small>
                COLLISION RISKS
              </small>

            </div>

          </div>

          {/* =================================================
              CONTROLS
          ================================================= */}

          <h2 className="section-heading">
            Simulation Control
          </h2>

          <div className="controls">

            <button
              className="control-btn primary"
              onClick={() => {
                getAudioContext();

                setIsRunning(
                  true,
                );
              }}
            >
              ▶ Start
            </button>

            <button
              className="control-btn"
              onClick={() =>
                setIsRunning(
                  false,
                )
              }
            >
              ⏸ Pause
            </button>

            <button
              className="control-btn reset"
              onClick={
                resetSimulation
              }
            >
              ↻ Reset
            </button>

          </div>

          <div className="speed-control">

            <label>
              Simulation Speed:{" "}
              {simulationSpeed}x
            </label>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={
                simulationSpeed
              }
              onChange={(e) =>
                setSimulationSpeed(
                  Number(
                    e.target.value,
                  ),
                )
              }
            />

          </div>

        </aside>

        {/* ==================================================
            DIGITAL TWIN
        ================================================== */}

        <section className="map-section">

          <div className="map-header">

            <div>

              <h2>
                Digital Twin — Live Mine
                Haul Road
              </h2>

              <p>
                Simulated real-time
                representation of mine
                vehicle operations
              </p>

            </div>

            <div className="map-live">

              <span></span>

              LIVE DIGITAL TWIN

            </div>

          </div>

          <div className="mine-map">

            <div className="road road-one"></div>

            <div className="road road-two"></div>

            <div className="road road-three"></div>

            <div className="mining-area area-one">
              ⛏ EXCAVATION ZONE
            </div>

            <div className="mining-area area-two">
              🏭 PROCESSING AREA
            </div>

            {/* ==============================================
                FOG
            ============================================== */}

            <div
              className="fog-zone"
              style={{
                left: `${fogZone.x}%`,
                top: `${fogZone.y}%`,
              }}
            >

              <div className="fog-inner">

                🌫

                <span>
                  {visibility <=
                  DENSE_FOG_VISIBILITY
                    ? "DENSE FOG"
                    : "LOW VISIBILITY"}
                </span>

                <small>
                  {visibility} m
                </small>

              </div>

            </div>

            {/* ==============================================
                WARNING BEACON
            ============================================== */}

            {dangerPair && (
              <div
                className="warning-beacon"
                style={{
                  left: `${
                    trucks.find(
                      (truck) =>
                        truck.id ===
                        dangerPair.truck1,
                    )?.x ?? 50
                  }%`,

                  top: `${
                    trucks.find(
                      (truck) =>
                        truck.id ===
                        dangerPair.truck1,
                    )?.y ?? 50
                  }%`,
                }}
              >
                🔴
              </div>
            )}

            {/* ==============================================
                TRUCKS
            ============================================== */}

            {trucks.map(
              (truck) => (
                <div
                  key={truck.id}
                  className={`truck ${
                    truck.status ===
                    "FOG"
                      ? "in-fog"
                      : truck.status ===
                          "REROUTING"
                        ? "rerouting"
                        : ""
                  } ${
                    selectedTruckId ===
                    truck.id
                      ? "selected-truck"
                      : ""
                  } ${
                    dangerPair &&
                    (
                      dangerPair.truck1 ===
                        truck.id ||
                      dangerPair.truck2 ===
                        truck.id
                    )
                      ? "danger-truck"
                      : ""
                  }`}
                  style={{
                    left: `${truck.x}%`,
                    top: `${truck.y}%`,
                  }}
                  onClick={() =>
                    setSelectedTruckId(
                      truck.id,
                    )
                  }
                >

                  <div className="truck-icon">
                    🚚
                  </div>

                  <div className="truck-info">

                    <strong>
                      {truck.id}
                    </strong>

                    <span>
                      {Math.round(
                        truck.x,
                      )}
                      ,{" "}
                      {Math.round(
                        truck.y,
                      )}
                    </span>

                  </div>

                  {truck.status !==
                    "NORMAL" && (
                    <div className="truck-status">

                      {truck.status ===
                      "FOG"
                        ? "SLOW"
                        : truck.status ===
                            "REROUTING"
                          ? "REROUTE"
                          : "WARNING"}

                    </div>
                  )}

                </div>
              ),
            )}

            {/* ==============================================
                LEGEND
            ============================================== */}

            <div className="map-legend">

              <span>
                🚚 Normal Truck
              </span>

              <span>
                🌫 Fog Zone
              </span>

              <span>
                ⚠ V2V Risk
              </span>

              <span>
                🔄 Rerouting
              </span>

            </div>

          </div>

        </section>

        {/* ==================================================
            RIGHT PANEL
        ================================================== */}

        <aside className="right-panel">

          <h2>
            Truck Telemetry
          </h2>

          {!selectedTruck ? (
            <div className="telemetry-empty">

              <div>
                🚚
              </div>

              <strong>
                Select a Truck
              </strong>

              <p>
                Click any truck on the
                Digital Twin map to view
                live telemetry and risk
                information.
              </p>

            </div>
          ) : (
            <div className="telemetry-panel">

              <div className="telemetry-title">

                <div className="big-truck">
                  🚚
                </div>

                <div>

                  <h3>
                    {selectedTruck.id}
                  </h3>

                  <span>
                    LIVE VEHICLE DATA
                  </span>

                </div>

              </div>

              <div className="telemetry-status">

                <span>
                  Current Status
                </span>

                <strong
                  className={
                    selectedTruck.status ===
                    "NORMAL"
                      ? "safe"
                      : selectedTruck.status ===
                          "FOG"
                        ? "warning"
                        : "danger"
                  }
                >
                  {selectedTruck.status}
                </strong>

              </div>

              <div className="telemetry-grid">

                <div className="telemetry-card">

                  <small>
                    GPS X
                  </small>

                  <strong>
                    {selectedTruck.x.toFixed(
                      1,
                    )}
                  </strong>

                </div>

                <div className="telemetry-card">

                  <small>
                    GPS Y
                  </small>

                  <strong>
                    {selectedTruck.y.toFixed(
                      1,
                    )}
                  </strong>

                </div>

                <div className="telemetry-card">

                  <small>
                    SPEED
                  </small>

                  <strong>
                    {speedKmH} km/h
                  </strong>

                </div>

                <div className="telemetry-card">

                  <small>
                    BASE SPEED
                  </small>

                  <strong>
                    {baseSpeedKmH} km/h
                  </strong>

                </div>

                <div className="telemetry-card">

                  <small>
                    ROUTE
                  </small>

                  <strong>
                    HAUL-0
                    {selectedTruck.route}
                  </strong>

                </div>

                <div className="telemetry-card">

                  <small>
                    VISIBILITY
                  </small>

                  <strong>
                    {visibility} m
                  </strong>

                </div>

              </div>

              {/* ============================================
                  RISK
              ============================================ */}

              <div
                className={`risk-panel ${riskLevel.toLowerCase()}`}
              >

                <div className="risk-header">

                  <span>
                    Collision Risk
                  </span>

                  <strong>
                    {selectedRisk}%
                  </strong>

                </div>

                <div className="risk-bar">

                  <div
                    style={{
                      width: `${selectedRisk}%`,
                    }}
                  ></div>

                </div>

                <small>
                  Risk Level:{" "}
                  {riskLevel}
                </small>

              </div>

              {/* ============================================
                  NEAREST VEHICLE
              ============================================ */}

              <div className="nearest-truck">

                <span>
                  Nearest Vehicle
                </span>

                <strong>
                  {closestTruck
                    ? `${closestTruck.id} — ${closestDistance.toFixed(
                        1,
                      )} m`
                    : "None"}
                </strong>

              </div>

              {/* ============================================
                  V2V
              ============================================ */}

              <div className="communication-card">

                <span>
                  📡 V2V Status
                </span>

                <strong>
                  {closestTruck &&
                  closestDistance <=
                    DANGER_DISTANCE_METERS
                    ? "WARNING SENT"
                    : "MONITORING"}
                </strong>

              </div>

              {/* ============================================
                  BUZZER
              ============================================ */}

              <div className="communication-card">

                <span>
                  🔊 Buzzer
                </span>

                <strong>
                  {dangerPair &&
                  (
                    dangerPair.truck1 ===
                      selectedTruck.id ||
                    dangerPair.truck2 ===
                      selectedTruck.id
                  )
                    ? "ACTIVATED"
                    : "STANDBY"}
                </strong>

              </div>

              {/* ============================================
                  LED
              ============================================ */}

              <div className="communication-card">

                <span>
                  🔴 Warning LED
                </span>

                <strong>
                  {dangerPair &&
                  (
                    dangerPair.truck1 ===
                      selectedTruck.id ||
                    dangerPair.truck2 ===
                      selectedTruck.id
                  )
                    ? "ACTIVATED"
                    : "STANDBY"}
                </strong>

              </div>

              {/* ============================================
                  V2I
              ============================================ */}

              <div className="communication-card">

                <span>
                  🏢 V2I Control
                </span>

                <strong>
                  {selectedTruck.status ===
                  "REROUTING"
                    ? "REROUTE COMMAND ACTIVE"
                    : selectedTruck.status ===
                        "FOG"
                      ? "SPEED REDUCTION COMMAND"
                      : "CONNECTED"}
                </strong>

              </div>

              <button
                className="clear-selection"
                onClick={() =>
                  setSelectedTruckId(
                    null,
                  )
                }
              >
                Clear Selection
              </button>

            </div>
          )}

          {/* ==================================================
              ANALYTICS
          ================================================== */}

          <h2 className="section-heading">
            Safety Analytics
          </h2>

          <div className="safety-score">

            <div>

              <span>
                Overall Safety Score
              </span>

              <strong>
                {safetyScore}/100
              </strong>

            </div>

            <div className="score-bar">

              <div
                style={{
                  width: `${safetyScore}%`,
                }}
              ></div>

            </div>

          </div>

          <div className="analytics-grid">

            <div className="analytics-card">

              <span>
                🚦
              </span>

              <strong>
                {speedCompliance}%
              </strong>

              <small>
                SPEED COMPLIANCE
              </small>

            </div>

            <div className="analytics-card">

              <span>
                🌫
              </span>

              <strong>
                {fogExposure}%
              </strong>

              <small>
                FOG EXPOSURE
              </small>

            </div>

            <div className="analytics-card">

              <span>
                🔗
              </span>

              <strong>
                {v2vRisk}%
              </strong>

              <small>
                V2V RISK
              </small>

            </div>

            <div className="analytics-card">

              <span>
                🔄
              </span>

              <strong>
                {reroutingCount}
              </strong>

              <small>
                REROUTES
              </small>

            </div>

          </div>

          {/* ==================================================
              RISK ASSESSMENT
          ================================================== */}

          <h2 className="section-heading">
            Risk Assessment
          </h2>

          <div className="risk-summary">

            <div>

              <span>
                Fleet Risk Level
              </span>

              <strong
                className={
                  v2vRisk >= 70
                    ? "risk-high"
                    : v2vRisk >= 40
                      ? "risk-medium"
                      : "risk-low"
                }
              >
                {v2vRisk >= 70
                  ? "HIGH"
                  : v2vRisk >= 40
                    ? "MEDIUM"
                    : "LOW"}
              </strong>

            </div>

            <p>
              Risk is calculated using
              vehicle proximity, relative
              speed and visibility
              conditions.
            </p>

          </div>

          {/* ==================================================
              ALERTS
          ================================================== */}

          <h2 className="section-heading">
            Active Safety Alerts
          </h2>

          <div className="alert-count">

            <span>
              {alerts.length}
            </span>

            <p>
              ACTIVE ALERTS
            </p>

          </div>

          <div className="alerts-list">

            {alerts.length ===
            0 ? (
              <div className="no-alert">

                🟢

                <strong>
                  NO CRITICAL ALERTS
                </strong>

                <p>
                  All vehicles are
                  operating safely.
                </p>

              </div>
            ) : (
              alerts
                .slice(0, 5)
                .map(
                  (alert) => (
                    <div
                      key={alert.id}
                      className={`alert-card ${alert.type}`}
                    >

                      <strong>

                        {alert.type ===
                        "danger"
                          ? "🔴"
                          : "🟡"}{" "}

                        {alert.title}

                      </strong>

                      <p>
                        {alert.message}
                      </p>

                    </div>
                  ),
                )
            )}

          </div>

          {/* ==================================================
              CONTROL ROOM
          ================================================== */}

          <h2 className="section-heading">
            Control Room Decisions
          </h2>

          <div className="decision-card">

            <span>
              🌫 Fog Response
            </span>

            <strong>
              {activeFogTrucks > 0
                ? `${activeFogTrucks} TRUCK(S) SLOWED`
                : "NORMAL SPEED"}
            </strong>

          </div>

          <div className="decision-card">

            <span>
              📡 V2V Safety
            </span>

            <strong>
              {collisionCount > 0
                ? "COLLISION WARNING ACTIVE"
                : "MONITORING"}
            </strong>

          </div>

          <div className="decision-card">

            <span>
              🏢 V2I Command
            </span>

            <strong>
              {reroutingCount > 0
                ? "REROUTE COMMAND ACTIVE"
                : "CONTROL CHANNEL READY"}
            </strong>

          </div>

          <div className="decision-card">

            <span>
              🔊 Dumper Warning
            </span>

            <strong>
              {dangerPair
                ? `${dangerPair.truck1} + ${dangerPair.truck2} ALERTED`
                : "NO TARGETED WARNING"}
            </strong>

          </div>

          <div className="decision-card">

            <span>
              🧠 Risk Engine
            </span>

            <strong>
              REAL-TIME RISK ASSESSMENT
            </strong>

          </div>

          {/* ==================================================
              EVENT HISTORY
          ================================================== */}

          <h2 className="section-heading">
            Event History
          </h2>

          <div className="history">

            {eventHistory.map(
              (
                event,
                index,
              ) => (
                <div
                  className="history-item"
                  key={index}
                >
                  {event}
                </div>
              ),
            )}

          </div>

        </aside>

      </main>

    </div>
  );
}

export default App;
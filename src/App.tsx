import { useEffect, useState } from "react";
import "./App.css";

type Truck = {
  id: string;
  x: number;
  y: number;
  speed: number;
  baseSpeed: number;
  route: number;
  status: "NORMAL" | "FOG" | "WARNING" | "REROUTING";
};

type Alert = {
  id: number;
  type: "danger" | "warning" | "info";
  title: string;
  message: string;
};

const initialTrucks: Truck[] = [
  { id: "T01", x: 8, y: 18, speed: 0.32, baseSpeed: 0.32, route: 1, status: "NORMAL" },
  { id: "T02", x: 25, y: 30, speed: 0.28, baseSpeed: 0.28, route: 1, status: "NORMAL" },
  { id: "T03", x: 52, y: 42, speed: 0.25, baseSpeed: 0.25, route: 2, status: "NORMAL" },
  { id: "T04", x: 42, y: 48, speed: 0.3, baseSpeed: 0.3, route: 2, status: "NORMAL" },
  { id: "T05", x: 15, y: 67, speed: 0.27, baseSpeed: 0.27, route: 3, status: "NORMAL" },
  { id: "T06", x: 68, y: 76, speed: 0.24, baseSpeed: 0.24, route: 3, status: "NORMAL" },
  { id: "T07", x: 72, y: 26, speed: 0.31, baseSpeed: 0.31, route: 1, status: "NORMAL" },
  { id: "T08", x: 78, y: 55, speed: 0.29, baseSpeed: 0.29, route: 2, status: "NORMAL" },
];

function App() {
  const [trucks, setTrucks] = useState<Truck[]>(initialTrucks);
  const [isRunning, setIsRunning] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [visibility, setVisibility] = useState(100);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [eventHistory, setEventHistory] = useState<string[]>([
    "System initialized successfully",
    "GPS tracking connected",
    "V2V communication active",
  ]);
  const [time, setTime] = useState(0);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);

  const fogZone = {
    x: 50,
    y: 45,
    radius: 18,
  };

  const addEvent = (message: string) => {
    setEventHistory((current) => [
      `${new Date().toLocaleTimeString()} — ${message}`,
      ...current.slice(0, 7),
    ]);
  };

  const calculateDistance = (a: Truck, b: Truck) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(dx * dx + dy * dy);
  };

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setTime((current) => current + 1);

      setTrucks((currentTrucks) => {
        const updatedTrucks = currentTrucks.map((truck) => {
          const dx = truck.x - fogZone.x;
          const dy = truck.y - fogZone.y;

          const distanceFromFog = Math.sqrt(dx * dx + dy * dy);

          const insideFog = distanceFromFog < fogZone.radius;

          let newSpeed = truck.baseSpeed;

          if (insideFog) {
            newSpeed = truck.baseSpeed * 0.4;
          }

          let newX = truck.x + newSpeed * simulationSpeed;

          if (newX > 96) {
            newX = 4;
          }

          return {
            ...truck,
            x: newX,
            speed: newSpeed,
            status: insideFog ? "FOG" : "NORMAL",
          };
        });

        const newAlerts: Alert[] = [];
        const reroutingTrucks = new Set<string>();

        for (let i = 0; i < updatedTrucks.length; i++) {
          for (let j = i + 1; j < updatedTrucks.length; j++) {
            const distance = calculateDistance(
              updatedTrucks[i],
              updatedTrucks[j],
            );

            if (distance < 9) {
              newAlerts.push({
                id: i * 100 + j,
                type: "danger",
                title: "V2V COLLISION RISK",
                message: `${updatedTrucks[i].id} is too close to ${updatedTrucks[j].id}`,
              });

              reroutingTrucks.add(updatedTrucks[j].id);
            }
          }
        }

        updatedTrucks.forEach((truck, index) => {
          const dx = truck.x - fogZone.x;
          const dy = truck.y - fogZone.y;

          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < fogZone.radius) {
            newAlerts.push({
              id: 1000 + index,
              type: "warning",
              title: "LOW VISIBILITY",
              message: `${truck.id} entered the fog zone — speed reduced`,
            });
          }
        });

        setAlerts(newAlerts);

        return updatedTrucks.map((truck) => {
          if (reroutingTrucks.has(truck.id)) {
            return {
              ...truck,
              status: "REROUTING",
              y:
                truck.y > 50
                  ? Math.max(10, truck.y - 0.5)
                  : Math.min(90, truck.y + 0.5),
            };
          }

          return truck;
        });
      });
    }, 120);

    return () => clearInterval(timer);
  }, [isRunning, simulationSpeed]);

  useEffect(() => {
    const trucksInFog = trucks.filter((truck) => {
      const dx = truck.x - fogZone.x;
      const dy = truck.y - fogZone.y;

      return Math.sqrt(dx * dx + dy * dy) < fogZone.radius;
    });

    setVisibility(Math.max(45, 100 - trucksInFog.length * 12));
  }, [trucks]);

  useEffect(() => {
    if (alerts.length > 0) {
      const collisionAlert = alerts.find(
        (alert) => alert.type === "danger",
      );

      if (collisionAlert) {
        addEvent(`⚠ ${collisionAlert.message}`);
      }
    }
  }, [alerts]);

  const resetSimulation = () => {
    setTrucks(initialTrucks);
    setAlerts([]);
    setVisibility(100);
    setTime(0);
    setSelectedTruckId(null);

    setEventHistory([
      "Simulation reset",
      "All trucks returned to initial positions",
      "Safety monitoring restarted",
    ]);

    setIsRunning(false);
  };

  const activeFogTrucks = trucks.filter(
    (truck) => truck.status === "FOG",
  ).length;

  const collisionCount = alerts.filter(
    (alert) => alert.type === "danger",
  ).length;

  const reroutingCount = trucks.filter(
    (truck) => truck.status === "REROUTING",
  ).length;

  /*
    SAFETY ANALYTICS

    We start with a perfect score of 100.
    Active safety problems reduce the score.
  */

  const safetyScore = Math.max(
    0,
    100 -
      collisionCount * 12 -
      activeFogTrucks * 4 -
      reroutingCount * 3,
  );

  const speedCompliance = Math.max(
    0,
    Math.round(
      ((trucks.length - activeFogTrucks) / trucks.length) * 100,
    ),
  );

  const fogExposure = Math.round(
    (activeFogTrucks / trucks.length) * 100,
  );

  const v2vRisk = Math.min(100, collisionCount * 15);

  const selectedTruck = trucks.find(
    (truck) => truck.id === selectedTruckId,
  );

  let closestTruck: Truck | null = null;
  let closestDistance = Infinity;

  if (selectedTruck) {
    trucks.forEach((truck) => {
      if (truck.id === selectedTruck.id) return;

      const distance = calculateDistance(selectedTruck, truck);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTruck = truck;
      }
    });
  }

  const speedKmH = selectedTruck
    ? Math.round(selectedTruck.speed * 200)
    : 0;

  const baseSpeedKmH = selectedTruck
    ? Math.round(selectedTruck.baseSpeed * 200)
    : 0;

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="logo">⛏</div>

          <div>
            <h1>Mine Safety Control Room</h1>
            <p>
              AI-Powered Haul Road Monitoring & Safety Simulation
            </p>
          </div>
        </div>

        <div className="top-status">
          <div className="clock">
            SIM TIME:{" "}
            {Math.floor(time / 60)
              .toString()
              .padStart(2, "0")}
            :
            {(time % 60).toString().padStart(2, "0")}
          </div>

          <div className={`system-live ${isRunning ? "" : "paused"}`}>
            <span></span>
            {isRunning ? "SYSTEM LIVE" : "PAUSED"}
          </div>
        </div>
      </header>

      <main className="dashboard-grid">
        <aside className="left-panel">
          <h2>System Status</h2>

          <div className="system-item">
            <span>📡 GPS Tracking</span>
            <strong>ONLINE</strong>
          </div>

          <div className="system-item">
            <span>🔗 V2V Communication</span>
            <strong>ACTIVE</strong>
          </div>

          <div className="system-item">
            <span>🛡 Safety Engine</span>
            <strong>RUNNING</strong>
          </div>

          <div className="system-item">
            <span>🌫 Weather Monitor</span>
            <strong>{visibility}% VISIBILITY</strong>
          </div>

          <h2 className="section-heading">Live Statistics</h2>

          <div className="stat-grid">
            <div className="stat-box">
              <span>🚚</span>
              <strong>{trucks.length}</strong>
              <small>ACTIVE TRUCKS</small>
            </div>

            <div className="stat-box">
              <span>⚠️</span>
              <strong>{alerts.length}</strong>
              <small>ACTIVE ALERTS</small>
            </div>

            <div className="stat-box">
              <span>🌫</span>
              <strong>{visibility}%</strong>
              <small>VISIBILITY</small>
            </div>

            <div className="stat-box">
              <span>🔴</span>
              <strong>{collisionCount}</strong>
              <small>COLLISION RISKS</small>
            </div>
          </div>

          <h2 className="section-heading">Simulation Control</h2>

          <div className="controls">
            <button
              className="control-btn primary"
              onClick={() => setIsRunning(true)}
            >
              ▶ Start
            </button>

            <button
              className="control-btn"
              onClick={() => setIsRunning(false)}
            >
              ⏸ Pause
            </button>

            <button
              className="control-btn reset"
              onClick={resetSimulation}
            >
              ↻ Reset
            </button>
          </div>

          <div className="speed-control">
            <label>Simulation Speed: {simulationSpeed}x</label>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={simulationSpeed}
              onChange={(e) =>
                setSimulationSpeed(Number(e.target.value))
              }
            />
          </div>
        </aside>

        <section className="map-section">
          <div className="map-header">
            <div>
              <h2>Live Mine Haul Road</h2>
              <p>Click any truck to inspect its telemetry</p>
            </div>

            <div className="map-live">
              <span></span>
              LIVE SIMULATION
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

            <div
              className="fog-zone"
              style={{
                left: `${fogZone.x}%`,
                top: `${fogZone.y}%`,
              }}
            >
              <div className="fog-inner">
                🌫
                <span>LOW VISIBILITY</span>
                <small>{visibility}%</small>
              </div>
            </div>

            {trucks.map((truck) => (
              <div
                key={truck.id}
                className={`truck ${
                  truck.status === "FOG"
                    ? "in-fog"
                    : truck.status === "REROUTING"
                      ? "rerouting"
                      : ""
                } ${
                  selectedTruckId === truck.id
                    ? "selected-truck"
                    : ""
                }`}
                style={{
                  left: `${truck.x}%`,
                  top: `${truck.y}%`,
                }}
                onClick={() => setSelectedTruckId(truck.id)}
              >
                <div className="truck-icon">🚚</div>

                <div className="truck-info">
                  <strong>{truck.id}</strong>

                  <span>
                    {Math.round(truck.x)},{" "}
                    {Math.round(truck.y)}
                  </span>
                </div>

                {truck.status !== "NORMAL" && (
                  <div className="truck-status">
                    {truck.status === "FOG"
                      ? "SLOW"
                      : "REROUTE"}
                  </div>
                )}
              </div>
            ))}

            <div className="map-legend">
              <span>🚚 Normal Truck</span>
              <span>🌫 Fog Zone</span>
              <span>⚠ V2V Warning</span>
            </div>
          </div>
        </section>

        <aside className="right-panel">
          <h2>Truck Telemetry</h2>

          {!selectedTruck ? (
            <div className="telemetry-empty">
              <div>🚚</div>

              <strong>Select a Truck</strong>

              <p>
                Click any truck on the map to view its live
                telemetry.
              </p>
            </div>
          ) : (
            <div className="telemetry-panel">
              <div className="telemetry-title">
                <div className="big-truck">🚚</div>

                <div>
                  <h3>{selectedTruck.id}</h3>
                  <span>LIVE VEHICLE DATA</span>
                </div>
              </div>

              <div className="telemetry-status">
                <span>Current Status</span>

                <strong
                  className={
                    selectedTruck.status === "NORMAL"
                      ? "safe"
                      : selectedTruck.status === "FOG"
                        ? "warning"
                        : "danger"
                  }
                >
                  {selectedTruck.status}
                </strong>
              </div>

              <div className="telemetry-grid">
                <div className="telemetry-card">
                  <small>GPS X</small>
                  <strong>
                    {selectedTruck.x.toFixed(1)}
                  </strong>
                </div>

                <div className="telemetry-card">
                  <small>GPS Y</small>
                  <strong>
                    {selectedTruck.y.toFixed(1)}
                  </strong>
                </div>

                <div className="telemetry-card">
                  <small>SPEED</small>
                  <strong>{speedKmH} km/h</strong>
                </div>

                <div className="telemetry-card">
                  <small>BASE SPEED</small>
                  <strong>{baseSpeedKmH} km/h</strong>
                </div>

                <div className="telemetry-card">
                  <small>ROUTE</small>
                  <strong>HAUL-0{selectedTruck.route}</strong>
                </div>

                <div className="telemetry-card">
                  <small>VISIBILITY</small>
                  <strong>{visibility}%</strong>
                </div>
              </div>

              <div className="nearest-truck">
                <span>Nearest Vehicle</span>

                <strong>
                  {closestTruck
                    ? `${closestTruck.id} — ${closestDistance.toFixed(
                        1,
                      )} units`
                    : "None"}
                </strong>
              </div>

              <button
                className="clear-selection"
                onClick={() => setSelectedTruckId(null)}
              >
                Clear Selection
              </button>
            </div>
          )}

          <h2 className="section-heading">Safety Analytics</h2>

          <div className="safety-score">
            <div>
              <span>Overall Safety Score</span>
              <strong>{safetyScore}/100</strong>
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
              <span>🚦</span>
              <strong>{speedCompliance}%</strong>
              <small>SPEED COMPLIANCE</small>
            </div>

            <div className="analytics-card">
              <span>🌫</span>
              <strong>{fogExposure}%</strong>
              <small>FOG EXPOSURE</small>
            </div>

            <div className="analytics-card">
              <span>🔗</span>
              <strong>{v2vRisk}%</strong>
              <small>V2V RISK</small>
            </div>

            <div className="analytics-card">
              <span>🔄</span>
              <strong>{reroutingCount}</strong>
              <small>REROUTES</small>
            </div>
          </div>

          <h2 className="section-heading">Active Safety Alerts</h2>

          <div className="alert-count">
            <span>{alerts.length}</span>
            <p>ACTIVE ALERTS</p>
          </div>

          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="no-alert">
                🟢
                <strong>NO CRITICAL ALERTS</strong>
                <p>All vehicles are operating safely.</p>
              </div>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-card ${alert.type}`}
                >
                  <strong>
                    {alert.type === "danger" ? "🔴" : "🟡"}{" "}
                    {alert.title}
                  </strong>

                  <p>{alert.message}</p>
                </div>
              ))
            )}
          </div>

          <h2 className="section-heading">
            AI Safety Decisions
          </h2>

          <div className="decision-card">
            <span>🌫 Fog Response</span>

            <strong>
              {activeFogTrucks > 0
                ? `${activeFogTrucks} TRUCK(S) SLOWED`
                : "NORMAL SPEED"}
            </strong>
          </div>

          <div className="decision-card">
            <span>🔗 V2V Safety</span>

            <strong>
              {collisionCount > 0
                ? "REROUTING ACTIVE"
                : "MONITORING"}
            </strong>
          </div>

          <div className="decision-card">
            <span>🧠 AI Engine</span>

            <strong>ANALYZING ROUTES</strong>
          </div>

          <h2 className="section-heading">Event History</h2>

          <div className="history">
            {eventHistory.map((event, index) => (
              <div className="history-item" key={index}>
                {event}
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
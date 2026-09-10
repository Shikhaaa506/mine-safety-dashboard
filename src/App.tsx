import { useEffect, useMemo, useState } from "react";
import "./App.css";

type TruckStatus = "NORMAL" | "FOG" | "WARNING" | "REROUTING";

type Truck = {
  id: string;
  x: number;
  y: number;
  baseSpeed: number;
  speed: number;
  direction: number;
  status: TruckStatus;
};

type Alert = {
  id: number;
  type: "danger" | "warning" | "info";
  title: string;
  message: string;
};

const INITIAL_TRUCKS: Truck[] = [
  { id: "T01", x: 8, y: 18, baseSpeed: 0.16, speed: 0.16, direction: 1, status: "NORMAL" },
  { id: "T02", x: 28, y: 18, baseSpeed: 0.13, speed: 0.13, direction: 1, status: "NORMAL" },
  { id: "T03", x: 75, y: 32, baseSpeed: 0.15, speed: 0.15, direction: -1, status: "NORMAL" },
  { id: "T04", x: 15, y: 48, baseSpeed: 0.14, speed: 0.14, direction: 1, status: "NORMAL" },
  { id: "T05", x: 58, y: 48, baseSpeed: 0.17, speed: 0.17, direction: -1, status: "NORMAL" },
  { id: "T06", x: 35, y: 68, baseSpeed: 0.12, speed: 0.12, direction: 1, status: "NORMAL" },
  { id: "T07", x: 64, y: 68, baseSpeed: 0.15, speed: 0.15, direction: -1, status: "NORMAL" },
  { id: "T08", x: 88, y: 82, baseSpeed: 0.13, speed: 0.13, direction: -1, status: "NORMAL" },
];

const FOG_ZONES = [
  { id: "F1", x: 42, y: 12, width: 24, height: 22, visibility: 58 },
  { id: "F2", x: 38, y: 42, width: 25, height: 20, visibility: 42 },
];

function isInsideFog(truck: Truck) {
  return FOG_ZONES.some(
    (zone) =>
      truck.x >= zone.x &&
      truck.x <= zone.x + zone.width &&
      truck.y >= zone.y &&
      truck.y <= zone.y + zone.height,
  );
}

function App() {
  const [trucks, setTrucks] = useState<Truck[]>(INITIAL_TRUCKS);
  const [isRunning, setIsRunning] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [tick, setTick] = useState(0);

  const fogTrucks = useMemo(
    () => trucks.filter((truck) => isInsideFog(truck)),
    [trucks],
  );

  const collisionPairs = useMemo(() => {
    const pairs: string[] = [];

    for (let i = 0; i < trucks.length; i++) {
      for (let j = i + 1; j < trucks.length; j++) {
        const dx = trucks[i].x - trucks[j].x;
        const dy = trucks[i].y - trucks[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 9) {
          pairs.push(`${trucks[i].id} ↔ ${trucks[j].id}`);
        }
      }
    }

    return pairs;
  }, [trucks]);

  const visibility =
    fogTrucks.length > 0
      ? Math.min(
          ...fogTrucks.map((truck) => {
            const zone = FOG_ZONES.find(
              (fog) =>
                truck.x >= fog.x &&
                truck.x <= fog.x + fog.width &&
                truck.y >= fog.y &&
                truck.y <= fog.y + fog.height,
            );
            return zone?.visibility ?? 100;
          }),
        )
      : 100;

  const alerts: Alert[] = useMemo(() => {
    const currentAlerts: Alert[] = [];

    collisionPairs.forEach((pair, index) => {
      currentAlerts.push({
        id: index,
        type: "danger",
        title: "V2V COLLISION RISK",
        message: `${pair} are within unsafe distance`,
      });
    });

    fogTrucks.forEach((truck, index) => {
      currentAlerts.push({
        id: 100 + index,
        type: "warning",
        title: "LOW VISIBILITY",
        message: `${truck.id} entered a fog zone — speed reduced automatically`,
      });
    });

    if (currentAlerts.length === 0) {
      currentAlerts.push({
        id: 999,
        type: "info",
        title: "SYSTEM NORMAL",
        message: "All haul trucks are operating within safe conditions",
      });
    }

    return currentAlerts;
  }, [collisionPairs, fogTrucks]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setTrucks((currentTrucks) =>
        currentTrucks.map((truck) => {
          const inFog = isInsideFog(truck);
          const speed = inFog
            ? truck.baseSpeed * 0.4 * simulationSpeed
            : truck.baseSpeed * simulationSpeed;

          let newX = truck.x + speed * truck.direction;
          let newDirection = truck.direction;

          if (newX >= 94) {
            newX = 94;
            newDirection = -1;
          }

          if (newX <= 5) {
            newX = 5;
            newDirection = 1;
          }

          return {
            ...truck,
            x: newX,
            speed,
            direction: newDirection,
            status: inFog ? "FOG" : "NORMAL",
          };
        }),
      );

      setTick((current) => current + 1);
    }, 100);

    return () => clearInterval(timer);
  }, [isRunning, simulationSpeed]);

  const resetSimulation = () => {
    setTrucks(INITIAL_TRUCKS.map((truck) => ({ ...truck })));
    setIsRunning(true);
    setTick(0);
  };

  const getTruckStatus = (truck: Truck): TruckStatus => {
    if (collisionPairs.some((pair) => pair.includes(truck.id))) {
      return "WARNING";
    }

    if (isInsideFog(truck)) {
      return "FOG";
    }

    return "NORMAL";
  };

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <div className="eyebrow">REAL-TIME SAFETY MONITORING</div>
          <h1>⛏ Mine Safety Control Room</h1>
          <p>AI-Powered Haul Road Simulation & Vehicle Safety System</p>
        </div>

        <div className="topbar-right">
          <div className="live-clock">
            SIMULATION TICK <strong>{tick}</strong>
          </div>

          <div className={`system-status ${isRunning ? "live" : "paused"}`}>
            <span className="status-dot"></span>
            {isRunning ? "SYSTEM LIVE" : "SIMULATION PAUSED"}
          </div>
        </div>
      </header>

      <main className="dashboard-grid">
        <aside className="left-column">
          <section className="panel">
            <h2>System Status</h2>

            <div className="status-card">
              <span>📍 GPS Tracking</span>
              <strong>ONLINE</strong>
            </div>

            <div className="status-card">
              <span>📡 V2V Communication</span>
              <strong>ONLINE</strong>
            </div>

            <div className="status-card">
              <span>🧠 Safety Engine</span>
              <strong>ACTIVE</strong>
            </div>

            <div className="status-card">
              <span>🌫 Fog Monitoring</span>
              <strong>ACTIVE</strong>
            </div>
          </section>

          <section className="panel controls-panel">
            <h2>Simulation Controls</h2>

            <button
              className="control-button primary"
              onClick={() => setIsRunning((current) => !current)}
            >
              {isRunning ? "⏸ Pause Simulation" : "▶ Start Simulation"}
            </button>

            <button className="control-button" onClick={resetSimulation}>
              ↻ Reset Simulation
            </button>

            <label className="speed-label">
              Simulation Speed: {simulationSpeed}x
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.5"
                value={simulationSpeed}
                onChange={(event) =>
                  setSimulationSpeed(Number(event.target.value))
                }
              />
            </label>
          </section>

          <section className="panel">
            <h2>Live Statistics</h2>

            <div className="big-stat">
              <span>🚚 Active Trucks</span>
              <strong>{trucks.length}</strong>
            </div>

            <div className="big-stat">
              <span>⚠️ Active Alerts</span>
              <strong>{alerts.filter((alert) => alert.type !== "info").length}</strong>
            </div>

            <div className="big-stat">
              <span>🌫 Visibility</span>
              <strong>{visibility}%</strong>
            </div>

            <div className="big-stat">
              <span>🔄 Rerouting Decisions</span>
              <strong>{collisionPairs.length}</strong>
            </div>
          </section>
        </aside>

        <section className="map-panel panel">
          <div className="map-header">
            <div>
              <h2>Live Mine Haul Road</h2>
              <p>Simulated GPS coordinates • Safety monitoring active</p>
            </div>

            <div className="map-legend">
              <span><i className="legend-dot normal"></i>Normal</span>
              <span><i className="legend-dot fog"></i>Fog</span>
              <span><i className="legend-dot danger-dot"></i>Collision Risk</span>
            </div>
          </div>

          <div className="mine-map">
            <div className="grid-lines"></div>

            <div className="road road-a"></div>
            <div className="road road-b"></div>
            <div className="road road-c"></div>
            <div className="road road-d"></div>

            <div className="mine-area mine-area-1">⛏ EXTRACTION ZONE</div>
            <div className="mine-area mine-area-2">LOADING BAY</div>

            {FOG_ZONES.map((zone) => (
              <div
                key={zone.id}
                className="fog-zone"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                }}
              >
                <span>🌫</span>
                <strong>{zone.id}</strong>
                <small>{zone.visibility}% visibility</small>
              </div>
            ))}

            {trucks.map((truck) => {
              const status = getTruckStatus(truck);

              return (
                <div
                  key={truck.id}
                  className={`truck truck-${status.toLowerCase()}`}
                  style={{
                    left: `${truck.x}%`,
                    top: `${truck.y}%`,
                  }}
                >
                  <div className="truck-icon">🚚</div>

                  <div className="truck-info">
                    <strong>{truck.id}</strong>
                    <span>
                      {Math.round(truck.x)}, {Math.round(truck.y)}
                    </span>
                  </div>

                  <div className="truck-speed">
                    {Math.round(truck.speed * 250)} km/h
                  </div>
                </div>
              );
            })}

            <div className="map-corner top-left">GPS GRID: ACTIVE</div>
            <div className="map-corner bottom-right">
              VISIBILITY: {visibility}%
            </div>
          </div>
        </section>

        <aside className="right-column">
          <section className="panel">
            <h2>Active Alerts</h2>

            <div className="alerts-list">
              {alerts.map((alert) => (
                <div key={alert.id} className={`alert ${alert.type}`}>
                  <strong>
                    {alert.type === "danger"
                      ? "🔴 "
                      : alert.type === "warning"
                        ? "🟡 "
                        : "🟢 "}
                    {alert.title}
                  </strong>
                  <p>{alert.message}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Safety Decisions</h2>

            {trucks.slice(0, 6).map((truck) => {
              const status = getTruckStatus(truck);

              let decision = "CONTINUE";
              if (status === "FOG") decision = "SLOW DOWN";
              if (status === "WARNING") decision = "REROUTE";

              return (
                <div className="decision" key={truck.id}>
                  <div>
                    <strong>{truck.id}</strong>
                    <span>{status}</span>
                  </div>
                  <b className={decision.toLowerCase().replace(" ", "-")}>
                    {decision}
                  </b>
                </div>
              );
            })}
          </section>

          <section className="panel truck-table-panel">
            <h2>Live GPS Data</h2>

            <div className="gps-list">
              {trucks.map((truck) => (
                <div className="gps-row" key={truck.id}>
                  <strong>{truck.id}</strong>
                  <span>X: {truck.x.toFixed(1)}</span>
                  <span>Y: {truck.y.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
import "./App.css";

function App() {
  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <h1>⛏ Mine Safety Control Room</h1>
          <p>AI-Powered Haul Road Monitoring System</p>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          SYSTEM LIVE
        </div>
      </header>

      <main className="dashboard-grid">

        {/* LEFT PANEL */}
        <aside className="side-panel">
          <h2>System Status</h2>

          <div className="status-card">
            <span>GPS Tracking</span>
            <strong>ONLINE</strong>
          </div>

          <div className="status-card">
            <span>V2V Communication</span>
            <strong>ONLINE</strong>
          </div>

          <div className="status-card">
            <span>Safety Engine</span>
            <strong>ACTIVE</strong>
          </div>

          <h2 className="section-title">Live Statistics</h2>

          <div className="stat-card">
            <span>🚚 Active Trucks</span>
            <strong>12</strong>
          </div>

          <div className="stat-card">
            <span>⚠️ Active Alerts</span>
            <strong>3</strong>
          </div>

          <div className="stat-card">
            <span>🌫 Visibility</span>
            <strong>68%</strong>
          </div>
        </aside>

        {/* MAP */}
        <section className="map-section">
          <div className="map-header">
            <h2>Live Mine Haul Road</h2>
            <span>GPS Simulation</span>
          </div>

          <div className="mine-map">

            <div className="road road-1"></div>
            <div className="road road-2"></div>
            <div className="road road-3"></div>

            <div className="fog-zone">
              🌫 FOG ZONE
            </div>

            <div className="truck truck-1">🚚</div>
            <div className="truck truck-2">🚚</div>
            <div className="truck truck-3">🚚</div>

            <div className="mine-label">
              ⛏ MINING AREA
            </div>

          </div>
        </section>

        {/* RIGHT PANEL */}
        <aside className="alerts-panel">
          <h2>Active Alerts</h2>

          <div className="alert danger">
            <strong>🔴 COLLISION RISK</strong>
            <p>Truck T07 ↔ Truck T12</p>
          </div>

          <div className="alert warning">
            <strong>🟡 LOW VISIBILITY</strong>
            <p>Truck T04 entered Fog Zone F2</p>
          </div>

          <div className="alert warning">
            <strong>🟡 FOG DETECTED</strong>
            <p>Visibility reduced to 68%</p>
          </div>

          <h2 className="section-title">Safety Decisions</h2>

          <div className="decision">
            <span>Truck T07</span>
            <strong>REROUTE</strong>
          </div>

          <div className="decision">
            <span>Truck T04</span>
            <strong>SLOW DOWN</strong>
          </div>

          <div className="decision">
            <span>Truck T12</span>
            <strong>STOP</strong>
          </div>
        </aside>

      </main>
    </div>
  );
}

export default App;
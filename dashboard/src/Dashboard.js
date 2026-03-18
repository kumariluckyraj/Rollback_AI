import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [rollbackHistory, setRollbackHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('stable');

  const API_BASE = 'http://127.0.0.1:4000';

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, configRes, logsRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/api/stats`),
        axios.get(`${API_BASE}/api/config`),
        axios.get(`${API_BASE}/api/logs`),
        axios.get(`${API_BASE}/api/rollback-history`),
      ]);

      setStats(statsRes.data);
      setConfig(configRes.data);
      setLogs(logsRes.data.logs || []);
      setRollbackHistory(historyRes.data.history || []);
      setMode(configRes.data.mode);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const changeMode = async (newMode) => {
    try {
      await axios.post(`${API_BASE}/api/config`, { mode: newMode });
      setMode(newMode);
      fetchData();
    } catch (err) {
      console.error('Error changing mode:', err);
    }
  };

  const triggerRollback = async () => {
    try {
      await axios.post(`${API_BASE}/api/rollback`);
      fetchData();
    } catch (err) {
      console.error('Error triggering rollback:', err);
    }
  };

  if (loading) {
    return <div className="container"><p>Loading...</p></div>;
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Canary Deployment Dashboard</h1>
        <p>Real-time monitoring and control</p>
      </header>

      <div className="grid">
        
        {/* Stats Cards */}
        <section className="stats-section">
          <h2>System Metrics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <label>Total Requests</label>
              <p className="stat-value">{stats?.totalRequests || 0}</p>
            </div>
            <div className="stat-card">
              <label>Total Errors</label>
              <p className="stat-value">{stats?.totalErrors || 0}</p>
            </div>
            <div className={`stat-card ${parseFloat(stats?.errorRatePercent) > 20 ? 'alert' : ''}`}>
              <label>Error Rate</label>
              <p className="stat-value">{stats?.errorRatePercent || '0%'}</p>
            </div>
            <div className="stat-card">
              <label>Uptime</label>
              <p className="stat-value">{stats?.uptime || '0s'}</p>
            </div>
          </div>
        </section>

        {/* Mode Control */}
        <section className="control-section">
          <h2>Traffic Mode</h2>
          <div className="mode-display">
            <p>Current Mode: <strong>{mode.toUpperCase()}</strong></p>
          </div>
          <div className="mode-buttons">
            <button 
              className={`mode-btn ${mode === 'stable' ? 'active' : ''}`}
              onClick={() => changeMode('stable')}
            >
              Stable
            </button>
            <button 
              className={`mode-btn ${mode === 'test' ? 'active' : ''}`}
              onClick={() => changeMode('test')}
            >
              Test
            </button>
            <button 
              className={`mode-btn ${mode === 'canary' ? 'active' : ''}`}
              onClick={() => changeMode('canary')}
            >
              Canary
            </button>
          </div>
          <div className="mode-info">
            <p>Stable: 100% to production</p>
            <p>Test: 100% to new version</p>
            <p>Canary: 90% stable, 10% test</p>
          </div>
        </section>

        {/* Rollback Control */}
        <section className="rollback-section">
          <h2>Rollback Control</h2>
          <button className="rollback-btn" onClick={triggerRollback}>
            Manual Rollback
          </button>
          <p>Auto-rollback threshold: 20% error rate</p>
        </section>

        {/* Rollback History */}
        <section className="history-section">
          <h2>Rollback History</h2>
          {rollbackHistory.length === 0 ? (
            <p>No rollbacks yet</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>From Mode</th>
                  <th>Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {rollbackHistory.map((item, idx) => (
                  <tr key={idx}>
                    <td>{new Date(item.timestamp).toLocaleTimeString()}</td>
                    <td>{item.previousMode}</td>
                    <td>{item.errorRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Recent Logs */}
        <section className="logs-section">
          <h2>Recent Requests (Last 10)</h2>
          {logs.length === 0 ? (
            <p>No logs yet</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Backend</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(-10).reverse().map((log, idx) => (
                  <tr key={idx} className={log.statusCode >= 400 ? 'error-row' : ''}>
                    <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td>{log.method}</td>
                    <td>{log.path}</td>
                    <td className={log.statusCode >= 400 ? 'status-error' : 'status-ok'}>
                      {log.statusCode}
                    </td>
                    <td>{log.duration_ms}ms</td>
                    <td>{log.target.includes('5001') ? 'Stable' : 'Test'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

      </div>
    </div>
  );
};

export default Dashboard;
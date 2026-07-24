import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuditEntry, PersonaRole } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { XaiAuditDrawer } from './components/XaiAuditDrawer';
import { WhyModal } from './components/WhyModal';
import { Home } from './pages/Home';
import { Trade } from './pages/Trade';
import { Clients } from './pages/Clients';
import { Ideas } from './pages/Ideas';
import { Bafin } from './pages/Bafin';
import { Risk } from './pages/Risk';
import { Audit } from './pages/Audit';
import { Executive } from './pages/Executive';
import { PERSONA_CONFIG_MAP } from './lib/dataService';

export default function App() {
  const [activePersona, setActivePersona] = useState<PersonaRole>('Trader');
  const [activeUser, setActiveUser] = useState<string>('Alex Vance (Trader)');
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>(
    PERSONA_CONFIG_MAP['Trader'].allowedRoutes
  );
  const [guardianScore, setGuardianScore] = useState<number>(88);
  const [whyModalEntry, setWhyModalEntry] = useState<AuditEntry | null>(null);

  // Fetch initial persona claims from backend if available
  useEffect(() => {
    fetch('/api/auth/persona')
      .then((r) => r.json())
      .then((data) => {
        if (data.activePersona && PERSONA_CONFIG_MAP[data.activePersona as PersonaRole]) {
          const role = data.activePersona as PersonaRole;
          setActivePersona(role);
          setActiveUser(data.activeUser || `${PERSONA_CONFIG_MAP[role].name} (${role})`);
          if (data.config?.allowedRoutes) {
            setAllowedRoutes(data.config.allowedRoutes);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Connect SSE live stream for top bar Guardian Score Gauge
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'pulse' && parsed.guardianAvgScore) {
            setGuardianScore(parsed.guardianAvgScore);
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Handle persona switch with immediate optimistic client-side state update
  const handlePersonaChange = (newRole: PersonaRole) => {
    const config = PERSONA_CONFIG_MAP[newRole] || PERSONA_CONFIG_MAP['Trader'];
    
    // 1. Instantly update client React state so persona change, widgets & route locking are 100% immediate & reliable
    setActivePersona(newRole);
    setActiveUser(`${config.name} (${newRole})`);
    setAllowedRoutes(config.allowedRoutes);

    // 2. Synchronize with backend API in background
    fetch('/api/auth/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    }).catch(() => {
      // Background sync warning - client state remains perfectly synced locally
    });
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen flex-col bg-[#090A0C] font-sans text-slate-100 antialiased overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
        {/* Top Navbar */}
        <Navbar
          activePersona={activePersona}
          activeUser={activeUser}
          onPersonaChange={handlePersonaChange}
          guardianScore={guardianScore}
        />

        {/* Main Body with Sidebar + Screen Content */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activePersona={activePersona} allowedRoutes={allowedRoutes} />

          <main className="flex-1 overflow-y-auto bg-[#090A0C] p-4 sm:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route
                path="/home"
                element={
                  <ProtectedRoute
                    path="/home"
                    allowedRoutes={allowedRoutes}
                    activePersona={activePersona}
                    onPersonaChange={handlePersonaChange}
                  >
                    <Home
                      guardianScore={guardianScore}
                      activePersona={activePersona}
                      activeUser={activeUser}
                      onPersonaChange={handlePersonaChange}
                      onOpenWhyModal={(entry) => setWhyModalEntry(entry)}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trade"
                element={
                  <ProtectedRoute
                    path="/trade"
                    allowedRoutes={allowedRoutes}
                    activePersona={activePersona}
                    onPersonaChange={handlePersonaChange}
                  >
                    <Trade
                      activePersona={activePersona}
                      onOpenWhyModal={(entry) => setWhyModalEntry(entry)}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute
                    path="/clients"
                    allowedRoutes={allowedRoutes}
                    activePersona={activePersona}
                    onPersonaChange={handlePersonaChange}
                  >
                    <Clients activePersona={activePersona} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ideas"
                element={
                  <ProtectedRoute
                    path="/ideas"
                    allowedRoutes={allowedRoutes}
                    activePersona={activePersona}
                    onPersonaChange={handlePersonaChange}
                  >
                    <Ideas activePersona={activePersona} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bafin"
                element={
                  <ProtectedRoute
                    path="/bafin"
                    allowedRoutes={allowedRoutes}
                    activePersona={activePersona}
                    onPersonaChange={handlePersonaChange}
                  >
                    <Bafin activePersona={activePersona} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/risk"
                element={
                  <ProtectedRoute
                    path="/risk"
                    allowedRoutes={allowedRoutes}
                    activePersona={activePersona}
                    onPersonaChange={handlePersonaChange}
                  >
                    <Risk activePersona={activePersona} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute
                    path="/audit"
                    allowedRoutes={allowedRoutes}
                    activePersona={activePersona}
                    onPersonaChange={handlePersonaChange}
                  >
                    <Audit
                      activePersona={activePersona}
                      onOpenWhyModal={(entry) => setWhyModalEntry(entry)}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/executive"
                element={
                  <ProtectedRoute
                    path="/executive"
                    allowedRoutes={allowedRoutes}
                    activePersona={activePersona}
                    onPersonaChange={handlePersonaChange}
                  >
                    <Executive activePersona={activePersona} />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </main>
        </div>

        {/* Persistent Bottom XAI Audit Drawer */}
        <XaiAuditDrawer onOpenWhyModal={(entry) => setWhyModalEntry(entry)} />

        {/* XAI Why Modal */}
        <WhyModal
          isOpen={!!whyModalEntry}
          onClose={() => setWhyModalEntry(null)}
          auditEntry={whyModalEntry}
        />
      </div>
    </BrowserRouter>
  );
}

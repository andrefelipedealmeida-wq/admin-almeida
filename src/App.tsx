import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';

// Error boundaries & Shared public Layout
import ErrorBoundary from './components/ErrorBoundary';
import PublicLayout from './components/PublicLayout';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Areas from './pages/public/Areas';
import DireitoImobiliario from './pages/public/areas/DireitoImobiliario';
import Inventario from './pages/public/areas/Inventario';
import FamiliaSucessoes from './pages/public/areas/FamiliaSucessoes';
import DireitoCivilContratos from './pages/public/areas/DireitoCivilContratos';
import RegistroMarcas from './pages/public/areas/RegistroMarcas';
import CalculatorPagePublic from './pages/public/CalculatorPagePublic';
import ArticlesPage from './pages/public/ArticlesPage';
import ContactPage from './pages/public/ContactPage';
import Privacy from "./pages/public/Privacy";
import Terms from "./pages/public/Terms";
import ThankYouPage from './pages/public/ThankYouPage';
import LoginPage from './pages/public/LoginPage';
import ClientDashboard from './pages/client/ClientDashboard';

// Admin Restricted Pages
import CaseManagement from './pages/admin/CaseManagement';

export default function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
      <BrowserRouter>
        {/* Toast alert banner */}
        <Toaster position="top-right" richColors closeButton />

        <Routes>
          {/* Public Portal routing group */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/areas" element={<Areas />} />
            <Route path="/areas/direito-imobiliario" element={<DireitoImobiliario />} />
            <Route path="/areas/inventario" element={<Inventario />} />
            <Route path="/areas/familia-e-sucessoes" element={<FamiliaSucessoes />} />
            <Route path="/areas/direito-civil-e-contratos" element={<DireitoCivilContratos />} />
            <Route path="/areas/registro-de-marcas" element={<RegistroMarcas />} />
            <Route path="/calculadora" element={<CalculatorPagePublic />} />
            <Route path="/artigos" element={<ArticlesPage />} />
            <Route path="/artigos/:slug" element={<ArticlesPage />} />
            <Route path="/contato" element={<ContactPage />} />
            <Route path="/obrigado" element={<ThankYouPage />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="/termos" element={<Terms />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Client Restricted Portal */}
          <Route path="/cliente/dashboard" element={<ClientDashboard />} />

          {/* ERP Restricted Admin page */}
          <Route path="/admin" element={<CaseManagement />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

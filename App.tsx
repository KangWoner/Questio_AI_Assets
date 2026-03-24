import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import B2BDashboard from './pages/B2BDashboard';
import LandingB2C from './pages/LandingB2C';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentFail } from './pages/PaymentFail';
import { PaymentSuccessAsset } from './pages/PaymentSuccessAsset';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingB2C />} />
        <Route path="/dashboard" element={<B2BDashboard />} />
        <Route path="/b2b-dashboard" element={<B2BDashboard />} />
        <Route path="/success" element={<PaymentSuccess />} />
        <Route path="/success-asset" element={<PaymentSuccessAsset />} />
        <Route path="/fail" element={<PaymentFail />} />
        <Route path="*" element={<LandingB2C />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { EquipmentListPage } from "@/pages/EquipmentListPage";
import { EquipmentDetailPage } from "@/pages/EquipmentDetailPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/equipment" element={<EquipmentListPage />} />
            <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/equipment" replace />} />
          <Route path="*" element={<Navigate to="/equipment" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

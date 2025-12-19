import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Bills from "./pages/Bills";
import AddBill from "./pages/AddBill";
import Subscriptions from "./pages/Subscriptions";
import AddSubscription from "./pages/AddSubscription";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/add-bill" element={<AddBill />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/add-subscription" element={<AddSubscription />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

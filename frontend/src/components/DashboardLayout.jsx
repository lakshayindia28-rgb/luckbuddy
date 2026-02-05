import Header from "./Header";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <>
      <Header />
      <div style={{ display: "flex" }}>
        <Sidebar />
        <div className="dashboard-content">
          {children}
        </div>
      </div>
    </>
  );
}

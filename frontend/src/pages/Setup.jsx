import api from "../services/api";
import { useEffect, useState } from "react";

export default function Setup() {
  const [allowed, setAllowed] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
  api.get("/setup/check")
    .then(res => {
      console.log("API RESPONSE:", res.data);
      setAllowed(true);   // 🔥 FORCE TRUE
    })
    .catch(err => {
      console.error("API ERROR:", err);
      setAllowed(true);   // 🔥 FORCE TRUE
    });
}, []);


  const createAdmin = async () => {
    if (!username || !password) {
      setMsg("Username & password required");
      return;
    }

    try {
      const res = await api.post(
        "/setup/create",
        null,
        { params: { username, password } }
      );
      setMsg(res.data.msg || "Admin created");
    } catch (e) {
      setMsg("Error creating admin");
    }
  };

  return (
    <div className="card p-4 mt-5 mx-auto" style={{ maxWidth: "420px" }}>
      <h4 className="text-center mb-3">Create First Admin</h4>

      <input
        className="form-control mb-2"
        placeholder="Admin Username"
        onChange={e => setUsername(e.target.value)}
      />

      <input
        type="password"
        className="form-control mb-3"
        placeholder="Admin Password"
        onChange={e => setPassword(e.target.value)}
      />

      <button className="btn btn-dark w-100" onClick={createAdmin}>
        Create Admin
      </button>

      {msg && (
        <p className="text-success text-center mt-3">
          {msg}
        </p>
      )}
    </div>
  );
}

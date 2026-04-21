import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import "../styles/login.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const otpRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (otpSent && otpRef.current) {
      otpRef.current.focus();
    }
  }, [otpSent]);

  const handleSendOtp = async () => {
    if (!email) {
      toast.error("Enter email first");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/send_otp", { email });

      setOtpSent(true);
      setTimer(30);

      toast.success(res.data.message || "OTP sent");

    } catch (err) {
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      toast.error("Enter OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/verify_otp", {
        email,
        otp,
      });

      localStorage.setItem("access_token", res.data.access_token);
      if (res.data.refresh_token) {
        localStorage.setItem("refresh_token", res.data.refresh_token);
      }
      localStorage.setItem("user_email", email);

      toast.success("Login Successful");

      setTimeout(() => {
        navigate("/dashboard");
      }, 800);

    } catch (err) {
      toast.error("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      {/* 🔥 IMPROVED LOADER */}
      {loading && (
        <div className="overlay">
          <div className="loader-box">
            <div className="spinner"></div>
            <div className="loader-text">
              {otpSent ? "Verifying OTP..." : "Sending OTP..."}
            </div>
          </div>
        </div>
      )}

      <div className="login-card">

        {/* HEADER */}
        <div className="login-header">
          <h1 className="app-title">StockFlow</h1>
          <p className="app-subtitle">
            Inventory Management System
          </p>
        </div>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
        />

        {!otpSent && (
          <button onClick={handleSendOtp} className="login-button">
            Send OTP
          </button>
        )}

        {otpSent && (
          <>
            <input
              ref={otpRef}
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="login-input"
            />

            <button onClick={handleVerifyOtp} className="login-button">
              Verify OTP
            </button>

            {timer > 0 ? (
              <span className="login-link">
                Resend OTP in {timer}s
              </span>
            ) : (
              <span onClick={handleSendOtp} className="login-link">
                Resend OTP
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

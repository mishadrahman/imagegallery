import { GalleryImage } from "../types";
import { useMemo } from "react";
import React, { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { app } from "../services/firebase";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";

interface AuthScreenProps {
  images: GalleryImage[];
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ images }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isReset, setIsReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const floatingImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    const shuffled = [...images].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 15);

    // Pre-calculate random values so they don't change on every render (typing)
    return selected.map((img, i) => {
      return {
        img,
        id: img.id + i,
        size: 30 + i * 5 + Math.random() * 20,
        startX: 10 + Math.random() * 80,
        startY: 10 + Math.random() * 80,
        duration: 30 + Math.random() * 20,
        moveX: (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 100),
        moveY: (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 100),
        opacity: 0.2 + Math.random() * 0.2,
      };
    });
  }, [images]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email to reset your password.");
      return;
    }
    setLoading(true);
    setError("");
    setResetSent(false);

    const auth = getAuth(app);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else {
        setError(err.message || "Failed to send reset email.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    const auth = getAuth(app);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, 50, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/30 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.15, 0.05],
            x: [0, -50, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-fuchsia-900/20 blur-[120px]"
        />

        {/* Floating Image Bubbles */}
        {floatingImages.map((bubble) => (
          <motion.div
            key={bubble.id}
            className="absolute rounded-full border border-white/10 overflow-hidden shadow-[0_0_25px_rgba(255,255,255,0.05)] bg-neutral-900/50 backdrop-blur-sm"
            style={{
              width: bubble.size,
              height: bubble.size,
              top: `${bubble.startY}%`,
              left: `${bubble.startX}%`,
              opacity: bubble.opacity,
            }}
            animate={{
              x: [0, bubble.moveX, bubble.moveX * 0.5, 0],
              y: [0, bubble.moveY, -bubble.moveY * 0.5, 0],
              rotate: [0, 90, 180, 360],
            }}
            transition={{
              duration: bubble.duration,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <img
              src={bubble.img.directUrl}
              alt=""
              className="w-full h-full object-cover mix-blend-luminosity brightness-150"
              loading="lazy"
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-transparent rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 font-['Outfit']">
              {isReset
                ? "Reset Password"
                : isLogin
                  ? "Welcome Back"
                  : "Create Account"}
            </h1>
            <p className="text-neutral-400 text-sm">
              {isReset
                ? "Enter your email to receive a reset link"
                : isLogin
                  ? "Enter your credentials to access your gallery"
                  : "Sign up to create your personal gallery"}
            </p>
          </div>

          <form
            onSubmit={isReset ? handleResetPassword : handleSubmit}
            className="space-y-4"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {resetSent && isReset && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-xl text-sm text-center"
              >
                Password reset link sent to your email!
              </motion.div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-400 pl-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {!isReset && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-neutral-400 pl-1">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsReset(true);
                        setError("");
                        setResetSent(false);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-neutral-500" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="••••••••"
                    required={!isReset}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isReset
                    ? "Send Reset Link"
                    : isLogin
                      ? "Sign In"
                      : "Sign Up"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                if (isReset) {
                  setIsReset(false);
                  setResetSent(false);
                } else {
                  setIsLogin(!isLogin);
                }
                setError("");
              }}
              className="text-sm text-neutral-400 hover:text-indigo-400 transition-colors"
            >
              {isReset
                ? "Back to Login"
                : isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

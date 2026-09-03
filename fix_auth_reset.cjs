const fs = require('fs');
let code = fs.readFileSync('src/components/AuthScreen.tsx', 'utf8');

// 1. Add sendPasswordResetEmail to imports
code = code.replace(
  /createUserWithEmailAndPassword,/,
  `createUserWithEmailAndPassword,\n  sendPasswordResetEmail,`
);

// 2. Add state
code = code.replace(
  /const \[error, setError\] = useState\(""\);/,
  `const [error, setError] = useState("");\n  const [isReset, setIsReset] = useState(false);\n  const [resetSent, setResetSent] = useState(false);`
);

// 3. Add handleResetPassword
code = code.replace(
  /const handleSubmit = async \(e: React\.FormEvent\) => \{/,
  `const handleResetPassword = async (e: React.FormEvent) => {
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

  const handleSubmit = async (e: React.FormEvent) => {`
);

// 4. Update Header Text
code = code.replace(
  /<h1 className="text-3xl font-bold text-white mb-2 font-\['Outfit'\]">\s*\{isLogin \? "Welcome Back" : "Create Account"\}\s*<\/h1>\s*<p className="text-neutral-400 text-sm">\s*\{isLogin\s*\? "Enter your credentials to access your gallery"\s*: "Sign up to create your personal gallery"\}\s*<\/p>/,
  `<h1 className="text-3xl font-bold text-white mb-2 font-['Outfit']">
              {isReset ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-neutral-400 text-sm">
              {isReset
                ? "Enter your email to receive a reset link"
                : isLogin
                ? "Enter your credentials to access your gallery"
                : "Sign up to create your personal gallery"}
            </p>`
);

// 5. Form changes
// Replace the entire form start to end
const formStart = `<form onSubmit={handleSubmit} className="space-y-4">`;
const formEnd = `          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-sm text-neutral-400 hover:text-indigo-400 transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>`;

const newForm = `<form onSubmit={isReset ? handleResetPassword : handleSubmit} className="space-y-4">
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
                  {isReset ? "Send Reset Link" : isLogin ? "Sign In" : "Sign Up"}
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
          </div>`;

const startIndex = code.indexOf(formStart);
const endIndex = code.indexOf(formEnd) + formEnd.length;

if (startIndex !== -1 && endIndex !== -1 && code.indexOf(formEnd) !== -1) {
  code = code.substring(0, startIndex) + newForm + code.substring(endIndex);
} else {
  console.log("Could not find form block to replace.");
}

fs.writeFileSync('src/components/AuthScreen.tsx', code);

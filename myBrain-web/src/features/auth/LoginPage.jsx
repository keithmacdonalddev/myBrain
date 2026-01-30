import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { login, clearError } from '../../store/authSlice';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const validateEmail = (value) => {
    if (!value.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (value) => {
    if (!value) {
      return 'Password is required';
    }
    return '';
  };

  const validateForm = () => {
    const errors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setValidationErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      setValidationErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      setValidationErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setValidationErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setValidationErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (validateForm()) {
      dispatch(login({ email, password }));
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text">myBrain</h1>
          <p className="text-muted mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-lg p-6 shadow-theme-elevated" noValidate>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => handleBlur('email')}
              className={`w-full px-3 py-2 bg-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text ${
                validationErrors.email && touched.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-border focus:border-primary'
              }`}
              placeholder="you@example.com"
              disabled={isLoading}
              aria-invalid={validationErrors.email && touched.email ? 'true' : 'false'}
              aria-describedby={validationErrors.email && touched.email ? 'email-error' : undefined}
            />
            {validationErrors.email && touched.email && (
              <p id="email-error" className="mt-1 text-sm text-red-500" role="alert">
                {validationErrors.email}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => handleBlur('password')}
              className={`w-full px-3 py-2 bg-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text ${
                validationErrors.password && touched.password
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-border focus:border-primary'
              }`}
              placeholder="Your password"
              disabled={isLoading}
              aria-invalid={validationErrors.password && touched.password ? 'true' : 'false'}
              aria-describedby={validationErrors.password && touched.password ? 'password-error' : undefined}
            />
            {validationErrors.password && touched.password && (
              <p id="password-error" className="mt-1 text-sm text-red-500" role="alert">
                {validationErrors.password}
              </p>
            )}
            <div className="flex justify-end mt-1">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary-hover"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="mt-4 text-center text-sm text-muted">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;

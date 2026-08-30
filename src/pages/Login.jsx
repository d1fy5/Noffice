import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { useTranslation } from '../store/useTranslation.js';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../store/hooks.js';

export default function Login() {
  const { login } = useAuth();
  const { notify } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Jika di redirect dari protected route, kembali ke sana setelah login
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      notify('Harap isi email dan password', 'error');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      notify('Berhasil login!', 'success');
      navigate(from, { replace: true });
    } else {
      notify(result.message, 'error');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box card">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon"><Icon name="box" size={24} /></div>
            <span>Noffice</span>
          </div>
          <h2>Selamat Datang Kembali</h2>
          <p className="login-subtitle">Silakan login ke akun Anda</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="admin@noffice.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button variant="primary" className="btn-full" type="submit" disabled={loading}>
            {loading ? 'Memeriksa...' : 'Login'}
          </Button>
        </form>

        <div className="login-hint">
          <p><strong>Demo Akun:</strong></p>
          <p>Admin: admin@noffice.com / admin</p>
          <p>Karyawan: karyawan@noffice.com / user</p>
        </div>
      </div>
    </div>
  );
}

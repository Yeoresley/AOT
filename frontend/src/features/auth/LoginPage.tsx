import axios from 'axios';
import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(username, password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        setError('No se puede conectar con el servidor. Comprueba que el backend esté iniciado.');
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        setError('Usuario o contraseña incorrectos. Recuerda que la contraseña distingue mayúsculas.');
      } else {
        setError('No se pudo iniciar sesión. Inténtalo nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Iniciar sesión</h1>
        <label className="block text-sm font-medium mb-1" htmlFor="username">Usuario</label>
        <input id="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="w-full border rounded-lg px-3 py-2 mb-4" />
        <label className="block text-sm font-medium mb-1" htmlFor="password">Contraseña</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border rounded-lg px-3 py-2 mb-4" />
        {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}
        <button disabled={submitting} className="w-full rounded-lg bg-slate-900 text-white py-2 disabled:opacity-60">
          {submitting ? 'Ingresando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

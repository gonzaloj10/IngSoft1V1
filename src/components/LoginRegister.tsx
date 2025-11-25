import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft } from 'lucide-react';

interface LoginRegisterProps {
  onNavigate: (view: string, eventId?: string) => void;
  returnEventId?: string;
}

export const LoginRegister: React.FC<LoginRegisterProps> = ({ onNavigate, returnEventId }) => {
  const { login, loginAdmin, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerRut, setRegisterRut] = useState('');
  const [rutError, setRutError] = useState('');
  const [rutValid, setRutValid] = useState(false);

  // Formatea RUT chileno con puntos y guión (12.345.678-9)
  const formatRutDisplay = (rut: string): string => {
    const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    
    // Agregar puntos cada 3 dígitos
    let formatted = '';
    for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
      if (count > 0 && count % 3 === 0) {
        formatted = '.' + formatted;
      }
      formatted = body[i] + formatted;
    }
    
    return formatted ? `${formatted}-${dv}` : clean;
  };

  // Normaliza RUT para validación (sin puntos ni guión)
  const normalizeRut = (rut: string) => {
    const clean = rut.replace(/\.|-/g, '').toUpperCase();
    if (!clean) return '';
    if (clean.length < 2) return clean;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    return `${body}-${dv}`;
  };

  // Valida RUT chileno con dígito verificador
  const validateRut = (rut: string): boolean => {
    const clean = rut.replace(/\.|-/g, '').toUpperCase();
    if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i], 10) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const mod11 = 11 - (sum % 11);
    const dvCalc = mod11 === 11 ? '0' : mod11 === 10 ? 'K' : String(mod11);
    return dv === dvCalc;
  };

  // Maneja cambios en el campo RUT con auto-formateo y validación en tiempo real
  const handleRutChange = (value: string) => {
    // Permitir solo números y K
    const cleaned = value.replace(/[^0-9kK]/g, '').toUpperCase();
    
    // Limitar a 9 caracteres (8 dígitos + 1 verificador)
    if (cleaned.length > 9) return;
    
    // Formatear con puntos y guión
    const formatted = formatRutDisplay(cleaned);
    setRegisterRut(formatted);
    
    // Validar en tiempo real si tiene longitud suficiente
    if (cleaned.length >= 8) {
      const isValid = validateRut(cleaned);
      setRutValid(isValid);
      
      if (!isValid && cleaned.length === 9) {
        setRutError('RUT inválido - dígito verificador incorrecto');
      } else if (cleaned.length < 9) {
        setRutError('');
      } else {
        setRutError('');
      }
    } else if (cleaned.length > 0) {
      setRutValid(false);
      setRutError('');
    } else {
      setRutValid(false);
      setRutError('');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = login(loginEmail, loginPassword);
    if (success) {
      // Si había un evento seleccionado, ir a checkout
      if (returnEventId) {
        onNavigate('checkout', returnEventId);
      } else {
        onNavigate('home');
      }
    } else {
      setError('Email o contraseña incorrectos');
    }
  };

  const handleAdminAccess = () => {
    const email = prompt('Ingrese su email para acceso de administrador:');
    if (email && email.trim()) {
      const success = loginAdmin(email.trim());
      if (success) {
        onNavigate('home');
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!registerEmail || !registerPassword || !registerName || !registerLastName || !registerRut) {
      setError('Todos los campos son obligatorios');
      return;
    }

    // Validar RUT
    if (!rutValid) {
      setError('Por favor ingrese un RUT válido. Ejemplo: 12.345.678-9');
      return;
    }

    const rutNorm = normalizeRut(registerRut);
    
    const success = await register(registerEmail, registerPassword, registerName, registerLastName, rutNorm);
    if (success) {
      // Si había un evento seleccionado, ir a checkout
      if (returnEventId) {
        onNavigate('checkout', returnEventId);
      } else {
        onNavigate('home');
      }
    } else {
      setError('El email ya está registrado');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => onNavigate(returnEventId ? 'event' : 'home', returnEventId)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        <div className="bg-card rounded-lg shadow-lg p-8">
          <div className="flex gap-4 mb-6 border-b border-border">
            <button
              className={`pb-3 px-4 transition-colors ${
                isLogin
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
            >
              Iniciar sesión
            </button>
            <button
              className={`pb-3 px-4 transition-colors ${
                !isLogin
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
            >
              Crear cuenta
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleAdminAccess}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  🔑 Administrador
                </button>
              </div>

              <Button type="submit" className="w-full">
                Iniciar sesión
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="register-name">Nombre</Label>
                  <Input
                    id="register-name"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="register-lastname">Apellido</Label>
                  <Input
                    id="register-lastname"
                    type="text"
                    value={registerLastName}
                    onChange={(e) => setRegisterLastName(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="register-rut">RUT</Label>
                <Input
                  id="register-rut"
                  type="text"
                  placeholder="12.345.678-9"
                  value={registerRut}
                  onChange={(e) => handleRutChange(e.target.value)}
                  required
                  className={`mt-1 ${rutError ? 'border-red-500' : rutValid ? 'border-green-500' : ''}`}
                />
                {rutError && (
                  <p className="text-xs text-red-500 mt-1">{rutError}</p>
                )}
                {rutValid && !rutError && registerRut.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">✓ RUT válido</p>
                )}
                {!rutValid && !rutError && registerRut.length > 0 && registerRut.replace(/[^0-9kK]/g, '').length < 8 && (
                  <p className="text-xs text-gray-500 mt-1">Ingrese 8 dígitos + verificador</p>
                )}
              </div>

              <div>
                <Label htmlFor="register-password">Contraseña</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full">
                Crear cuenta
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  loginAdmin: (email: string) => boolean;
  register: (email: string, password: string, name: string, lastName: string, rut: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string): boolean => {
    // Verificar si el usuario ya existe
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      const users = JSON.parse(storedUsers);
      const foundUser = users.find((u: any) => u.email === email && u.password === password);
      if (foundUser) {
        setUser({
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          lastName: foundUser.lastName,
          rut: foundUser.rut
        });
        return true;
      }
    }
    
    // Si no existe, crear usuario automáticamente para simplificar el demo
    if (email && password && email.includes('@')) {
      const newUser = {
        id: Date.now().toString(),
        email,
        password,
        name: email.split('@')[0], // Usar parte del email como nombre
        lastName: 'Usuario',
        rut: ''
      };

      const users = storedUsers ? JSON.parse(storedUsers) : [];
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      
      setUser({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        lastName: newUser.lastName,
        rut: newUser.rut
      });
      return true;
    }
    
    return false;
  };

  const loginAdmin = (email: string): boolean => {
    // Login de administrador con cualquier email
    setUser({
      id: 'admin_' + Date.now().toString(),
      email: email,
      name: 'Administrador',
      lastName: 'Sistema',
      isAdmin: true
    });
    return true;
  };

  const register = async (email: string, password: string, name: string, lastName: string, rut: string): Promise<boolean> => {
    try {
      // Intentar crear usuario en la base de datos primero
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, lastName, rut }),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const result = await response.json();
        const dbUser = result.user;
        
        // Guardar también en localStorage para compatibilidad
        const storedUsers = localStorage.getItem('users');
        const users = storedUsers ? JSON.parse(storedUsers) : [];
        
        const newUser = {
          id: dbUser.id, // Usar el ID de la base de datos
          email: dbUser.email,
          password,
          name: dbUser.name,
          lastName: dbUser.lastName,
          rut: rut
        };

        // Verificar si ya existe en localStorage
        const existingIndex = users.findIndex((u: any) => u.email === email);
        if (existingIndex >= 0) {
          users[existingIndex] = newUser;
        } else {
          users.push(newUser);
        }
        localStorage.setItem('users', JSON.stringify(users));
        
        setUser({
          id: dbUser.id, // ID numérico de la base de datos
          email: dbUser.email,
          name: dbUser.name,
          lastName: dbUser.lastName,
          rut: rut
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend no disponible, usando solo localStorage:', error);
    }

    // Fallback: usar solo localStorage
    const storedUsers = localStorage.getItem('users');
    const users = storedUsers ? JSON.parse(storedUsers) : [];
    
    const existingUser = users.find((u: any) => u.email === email);
    if (existingUser) {
      return false;
    }

    const newUser = {
      id: Date.now(),
      email,
      password,
      name,
      lastName,
      rut
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    setUser({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      lastName: newUser.lastName,
      rut: newUser.rut
    });
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginAdmin,
      register,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

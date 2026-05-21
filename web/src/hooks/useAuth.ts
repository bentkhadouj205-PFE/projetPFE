import { useState, useCallback } from 'react';
import type { User } from '@/types';

const MOCK_USERS: User[] = [
  {
    id: '00000000-0000-0000-0000-000000000001', // municipal agent
    email: 'municipal_agent@gmail.com',
    password: 'municipalagent123',
    firstName: 'Mohamed',
    lastName: 'Belahoili',
    role: 'Municipal_Agent',
    service: 'Municipal_Agent',
    position: 'System Administrator',
    joinDate: '2020-01-01',
    status: 'active',
  },
  {
    id: '78bf1903-bb96-4e71-994d-7f9a70c17784', // Sarah - Supabase UUID
    email: 'sarah@gmail.com',
    password: 'employee123',
    firstName: 'Sarah',
    lastName: 'Benali',
    role: 'employee',
    service: 'extrait_naissance',
    position: 'Acte de naissance',
    joinDate: '2021-03-20',
    status: 'active',
  },
  {
    id: '42271009-34ee-4f99-aa79-8961578aea28', // Jamel
    email: 'jamel@gmail.com',
    password: 'employee123',
    firstName: 'Jamel',
    lastName: 'Ziani',
    role: 'employee',
    service: 'certificat_residence',
    position: 'Certificat de résidence',
    joinDate: '2021-06-10',
    status: 'active',
  },
  {
    id: '57402f63-1755-438d-b772-83c04f859d7f', // Fatima
    email: 'fatima@gmail.com',
    password: 'employee123',
    firstName: 'Fatima',
    lastName: 'Hamdani',
    role: 'employee',
    service: 'certificat_residence',
    position: 'Carte de Résidence',
    joinDate: '2022-01-05',
    status: 'active',
  },
  {
    id: 'e8222f71-f90f-4459-9c1e-75e5db799a4d', // Maria
    email: 'maria@gmail.com',
    password: 'employee123',
    firstName: 'Maria',
    lastName: 'Amrani',
    role: 'employee',
    service: 'certificat_mariage',
    position: 'Certificat de mariage',
    joinDate: '2022-07-20',
    status: 'active',
  },
  {
    id: '7a1d4075-ce6d-40b7-bd8f-7e259f6d68c3', // Karim
    email: 'karim@gmail.com',
    password: 'employee123',
    firstName: 'Karim',
    lastName: 'Belkacem',
    role: 'employee',
    service: 'autorisation_voirie',
    position: 'Autorisation de voirie',
    joinDate: '2023-02-15',
    status: 'active',
  },
];

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    const resolved =
      normalized === 'sarah@gmail.com'
        ? 'sarah@gmail.com'
        : normalized === 'fatima@gmail.com'
          ? 'fatima@gmail.com'
          : normalized;
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === resolved && u.password === password
    );
    if (found) {
      const { password, ...userWithoutPassword } = found;
      setUser(userWithoutPassword as User);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  return { user, login, logout, updateUser };
}

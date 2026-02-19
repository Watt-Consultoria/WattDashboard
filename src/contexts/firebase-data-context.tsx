'use client';

import * as React from 'react';
import { firebaseDb } from '@/lib/firebase/client';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query
} from 'firebase/firestore';
import { useAuth } from '@/features/auth/components/auth-provider';
import type { WeekShedule } from '@/types/member/member';

export type Project = {
  id: string;
  name: string;
  area?: string;
  tipo?: string;
  value?: number;
  status?: string;
  health?: string;
  start?: any;
  end?: any;
  next?: string;
  createdAt?: any;
  updatedAt?: any;
  responsible?: string;
  description?: string;
  client?: string;
  manager?: string;
  managerId?: string;
};

export type Member = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  sector?: string;
  cpf?: string;
  activity?: string;
  status?: string;
  isLeadership?: boolean;
  fcmToken?: string;
  fcmTokenUpdatedAt?: any;
  createdAt?: any;
  updatedAt?: any;
  weekSchedule?: WeekShedule;
};

type FirebaseDataContextType = {
  projects: Project[];
  members: Member[];
  isLoading: boolean;
  error: string | null;
  currentMember: Member | null;
};

const FirebaseDataContext = React.createContext<
  FirebaseDataContextType | undefined
>(undefined);

export function FirebaseDataProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentMember, setCurrentMember] = React.useState<Member | null>(null);
  const { user } = useAuth();

  React.useEffect(() => {
    if (!firebaseDb) {
      setError('Firebase não inicializado');
      setIsLoading(false);
      return;
    }

    if (!user) {
      setProjects([]);
      return;
    }

    let projectsUnsubscribe: (() => void) | undefined;

    try {
      // Subscribe to projects collection
      const projectsQuery = query(
        collection(firebaseDb, 'projects'),
        orderBy('createdAt', 'desc')
      );

      projectsUnsubscribe = onSnapshot(
        projectsQuery,
        (snapshot) => {
          const projectsData: Project[] = [];
          snapshot.forEach((doc) => {
            projectsData.push({
              id: doc.id,
              ...doc.data()
            } as Project);
          });
          setProjects(projectsData);
          setIsLoading(false);
        },
        (err) => {
          console.error('Erro ao escutar projetos:', err);
          setError(err.message);
          setIsLoading(false);
        }
      );

      // Members collection subscription is handled in a separate effect
    } catch (err: any) {
      console.error('Erro ao configurar listeners:', err);
      setError(err.message);
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      if (projectsUnsubscribe) projectsUnsubscribe();
    };
  }, [user]);

  React.useEffect(() => {
    if (!firebaseDb || !user?.uid) {
      setCurrentMember(null);
      setMembers([]);
      return;
    }

    const memberRef = doc(firebaseDb, 'members', user.uid);
    const unsubscribe = onSnapshot(
      memberRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setCurrentMember(null);
          setMembers([]);
          return;
        }
        const memberData = {
          id: snapshot.id,
          ...snapshot.data()
        } as Member;
        setCurrentMember(memberData);

        const canReadAllMembers =
          memberData.isLeadership === true ||
          (memberData.role && memberData.role !== 'Consultor');
        if (!canReadAllMembers) {
          setMembers([memberData]);
        }
      },
      (err) => {
        console.error('Erro ao escutar membro atual:', err);
        setError(err.message);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  React.useEffect(() => {
    if (!firebaseDb || !currentMember) {
      return;
    }

    const canReadAllMembers =
      currentMember.isLeadership === true ||
      (currentMember.role && currentMember.role !== 'Consultor');
    if (!canReadAllMembers) {
      return;
    }

    const membersQuery = query(
      collection(firebaseDb, 'members'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      membersQuery,
      (snapshot) => {
        const membersData: Member[] = [];
        snapshot.forEach((docSnapshot) => {
          membersData.push({
            id: docSnapshot.id,
            ...docSnapshot.data()
          } as Member);
        });
        setMembers(membersData);
      },
      (err) => {
        console.error('Erro ao escutar membros:', err);
        setError(err.message);
      }
    );

    return () => unsubscribe();
  }, [currentMember]);

  return (
    <FirebaseDataContext.Provider
      value={{ projects, members, isLoading, error, currentMember }}
    >
      {children}
    </FirebaseDataContext.Provider>
  );
}

export function useFirebaseData() {
  const context = React.useContext(FirebaseDataContext);
  if (context === undefined) {
    throw new Error(
      'useFirebaseData must be used within a FirebaseDataProvider'
    );
  }
  return context;
}

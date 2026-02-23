'use client';

import { Button } from '@/components/ui/button';
import { firebaseAuth } from '@/lib/firebase/client';
import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const errorMessages: Record<string, string> = {
  'auth/account-exists-with-different-credential':
    'Use o mesmo provedor para entrar.',
  'auth/popup-closed-by-user': 'Popup fechado. Tente novamente.',
  'auth/cancelled-popup-request': 'Popup cancelado. Tente novamente.'
};

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    return errorMessages[error.code] ?? 'Nao foi possivel entrar com Google.';
  }

  return 'Nao foi possivel entrar com Google.';
};

export default function GoogleSignInButton({
  disabled
}: {
  disabled?: boolean;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!firebaseAuth) {
      toast.error('Firebase nao configurado.');
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: 'wattconsultoria.com.br' });
      await signInWithPopup(firebaseAuth, provider);
      toast.success('Login realizado com sucesso!');
      router.replace(callbackUrl);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className='w-full'
      variant='outline'
      type='button'
      onClick={handleGoogleSignIn}
      disabled={disabled || loading}
    >
      Continue com Google
    </Button>
  );
}

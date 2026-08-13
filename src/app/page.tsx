import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const isAuth = await getSession();
  if (isAuth) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}

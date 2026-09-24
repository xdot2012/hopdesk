import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { clearSession } from '~/services/session';
import { useUserStore } from '~/store';

const SignIn = () => {
  const { cleanUserProfile } = useUserStore();
  const { cache, mutate } = useSWRConfig();
  const navigate = useNavigate();

  useEffect(() => {
    clearSession();
    cleanUserProfile();
    // Drop cached /v1/user/me (and related) so the next login cannot reuse another role's profile.
    for (const key of cache.keys()) {
      cache.delete(key);
    }
    void mutate(() => true, undefined, { revalidate: false });
    navigate('/auth/sign_in');
  }, [cache, cleanUserProfile, mutate, navigate]);

  return <div />;
};

export default SignIn;

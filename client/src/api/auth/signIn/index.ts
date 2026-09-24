import { useFormValidation } from '~/hooks';
import { signInSchema } from './schema';
import { SIGN_IN_PATH } from '~/api';

export interface AuthTokenProps {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface SignInResponseProps {
  twoFactorRequired: boolean;
  token: AuthTokenProps;
}


function useSignIn() {
  return useFormValidation<SignInResponseProps>(signInSchema, SIGN_IN_PATH)
}

export default useSignIn;

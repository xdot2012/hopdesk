import { useFormValidation } from '~/hooks';
import { resendTwoFactorSchema } from './schema';
import { RESEND_TWO_FACTOR_CODE_PATH } from '~/api';

export interface ResendTwoFactorResponseProps {
  twoFactorRequired: boolean;
}


function useResendTwoFactor() {
  return useFormValidation<ResendTwoFactorResponseProps>(resendTwoFactorSchema, RESEND_TWO_FACTOR_CODE_PATH)
}

export default useResendTwoFactor;

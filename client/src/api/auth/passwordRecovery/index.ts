import { useFormValidation } from '~/hooks';
import { passwordReceverySchema } from './schema';
import { PASSWORD_RECOVERY_PATH } from '~/api';


export interface PasswordRecoveryResponseProps {
  message: string;
}

function usePasswordRecovery() {
  return useFormValidation<PasswordRecoveryResponseProps>(passwordReceverySchema, PASSWORD_RECOVERY_PATH)
}

export default usePasswordRecovery;

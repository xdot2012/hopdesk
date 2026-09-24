import { useQuery } from '~/hooks';
import { useParams } from 'react-router-dom';
import { PASSWORD_RESET_PATH } from '~/api';

export interface ValidatePasswordResetCodeResponseProps {
  isValid: boolean
}


function useValidatePasswordResetCode() {
  let { code } = useParams();

  return useQuery<ValidatePasswordResetCodeResponseProps>(`${PASSWORD_RESET_PATH}/${code}`, {method: 'get'});
}

export default useValidatePasswordResetCode;

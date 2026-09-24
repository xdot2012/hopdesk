import { SIGN_OUT_PATH } from '~/api';
import { useMutation } from '~/hooks';

function useSignOut() {
  return useMutation<undefined>(SIGN_OUT_PATH, {method: 'post'});
}

export default useSignOut;

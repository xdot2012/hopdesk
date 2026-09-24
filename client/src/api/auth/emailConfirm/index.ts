import { useMutation } from '~/hooks';
import { useParams } from 'react-router-dom';
import { EMAIL_CONFIRM_PATH } from '~/api';

export interface EmailConfirmResponseProps {
  message: string;
}

function useConfirmEmail() {
  let { code } = useParams();
  
  const { trigger: create, ...rest } = useMutation<undefined, EmailConfirmResponseProps>(
    `${EMAIL_CONFIRM_PATH}/${code}`,
    {
      method: 'post',
    },
  );

  return { create, ...rest };
}

export default useConfirmEmail;

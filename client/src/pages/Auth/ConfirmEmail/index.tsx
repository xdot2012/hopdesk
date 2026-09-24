import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SIGN_IN } from '../../../router/paths';
import useConfirmEmail from '~/api/auth/emailConfirm';
import { useAlertStore } from '~/store';

export default function EmailConfirm() {
  const { t } = useTranslation();
  const { showErrorMessage, showSuccessMessage } = useAlertStore((state) => state);
  const { create, isMutating } = useConfirmEmail();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (confirmed || isMutating) return;
    create().then(() => {
      setConfirmed(true);
      showSuccessMessage(t('auth.confirmEmail.success'));
      navigate(SIGN_IN);
    }).catch(() => {
      showErrorMessage(t('auth.confirmEmail.invalidCode'));
      navigate(SIGN_IN);
    });
  }, [confirmed, isMutating, create, navigate, showSuccessMessage, showErrorMessage, t]);

  return <div className="mt-4 flex flex-col items-center" />;
}

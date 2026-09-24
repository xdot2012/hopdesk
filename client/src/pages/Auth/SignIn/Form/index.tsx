import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useResendTwoFactor from "~/api/auth/resendTwoFactor";
import useSignIn from "~/api/auth/signIn";
import { SignInType } from "~/api/auth/signIn/schema";
import { BooleanInput, PasswordInput, TextInput, TwoFactorInput } from "~/components/FormControl";
import { Button } from "~/components/ui/button";
import { saveSession } from "~/services/session";
import { consumeAuthReturnTo } from "~/services/auth/returnTo";
import { DASHBOARD } from "~/router/paths";
import { useAlertStore } from "~/store";
import { hasFieldValidationErrors } from "~/util/functions";

const RESEND_COOLDOWN_SECONDS = 60;

export default function SignInForm() {
  const { t } = useTranslation();
  const { create, isMutating, control, handleSubmit, getValues, errors } = useSignIn();
  const { create: resendTwoFactor } = useResendTwoFactor();
  const { showSuccessMessage, showError, closeMessage } = useAlertStore((state) => state);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const twoFactorViewStartedRef = useRef(false);

  const isTwoFactorView = twoFactorAuth;

  useEffect(() => {
    if (isTwoFactorView && !twoFactorViewStartedRef.current) {
      twoFactorViewStartedRef.current = true;
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    }
    if (isTwoFactorView) {
      twoFactorViewStartedRef.current = false;
    }
  }, [isTwoFactorView]);

  useEffect(() => {
    if (!isTwoFactorView || resendCountdown <= 0) return;
    const id = setInterval(
      () => setResendCountdown((c) => (c <= 1 ? 0 : c - 1)),
      1000
    );
    return () => clearInterval(id);
  }, [isTwoFactorView, resendCountdown]);

  const handleResendCode = () => {
    if (resendCountdown > 0) return;
    const values = getValues();
    const hasCredentials = values.email && values.password;
    if (hasCredentials) {
      resendTwoFactor({
        email: values.email,
        password: values.password,
      })
        .then(() => {
          closeMessage();
          showSuccessMessage(t('auth.twoFactor.codeResent'));
          setResendCountdown(RESEND_COOLDOWN_SECONDS);
        })
        .catch((err) => {
          showError(err);
          setResendCountdown(RESEND_COOLDOWN_SECONDS);
        });
    } else {
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    }
  };

  const onSubmit = (signUpData: SignInType) => {
    create(signUpData).then(({ data }) => {
      closeMessage();
      if (data.twoFactorRequired) {
        setTwoFactorAuth(true);
        return;
      }
      saveSession(data.token.tokenType, data.token.accessToken, data.token.refreshToken);
      window.location.assign(consumeAuthReturnTo(DASHBOARD));
    }).catch((error) => {
      if (!hasFieldValidationErrors(error)) {
        showError(error);
      }
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col">
      {twoFactorAuth ? (
        <div className="mt-4 flex flex-col items-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.twoFactor.description')}
          </p>
          <TwoFactorInput
            name="twoFactorCode"
            defaultValue=""
            label={t('auth.twoFactor.codeLabel')}
            control={control}
            fieldError={errors.twoFactorCode}
          />
          <div className="flex flex-wrap items-center justify-center gap-4">
            {resendCountdown > 0 ? (
              <span className="text-sm text-muted-foreground">
                {t('auth.twoFactor.resendCooldown', { seconds: resendCountdown })}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={resendCountdown > 0}
                onClick={handleResendCode}
                type="button"
              >
                {t('auth.twoFactor.resend')}
              </Button>
            )}
          </div>
          <Button variant="ghost" type="button" onClick={() => setTwoFactorAuth(false)}>
            {t('auth.twoFactor.goBack')}
          </Button>
        </div>
      ) : (
        <>
          <TextInput
            name="email"
            type="email"
            autoComplete="username"
            label={t('common.email')}
            defaultValue=""
            control={control}
            fieldError={errors.email}
          />
          <PasswordInput
            name="password"
            autoComplete="current-password"
            label={t('common.password')}
            defaultValue=""
            control={control}
            fieldError={errors.password}
          />
          <BooleanInput
            name="keepConnected"
            label={t('auth.signIn.keepConnected')}
            defaultValue={false}
            control={control}
            fieldError={errors.keepConnected}
          />
        </>
      )}
      <Button type="submit" className="mt-6 mb-4 w-full" disabled={isMutating}>
        {t('auth.signIn.submit')}
      </Button>
    </form>
  );
}

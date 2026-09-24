import { isAxiosError } from "axios";
import { ZodError } from "zod";
import i18n from "~/i18n";
import { NETWORK_ERROR } from "~/util/constants";

export type FormValidationError = {
    path: (string | number)[]
    message: string
}

export const getZodValidationErrors = (zodError: ZodError) => {
    const validationError: FormValidationError[] = zodError.errors.map((error) => {
        return {
            path: error.path,
            message: error.message
        }
    })
    return validationError;
}

export const hasFieldValidationErrors = (error: unknown): boolean =>
    isAxiosError(error) &&
    error.response?.status === 400 &&
    Array.isArray(error.response?.data?.detail);

export const getFieldValidationMessage = (
    error: unknown,
    field: string,
): string | undefined => {
    if (!isAxiosError(error)) return undefined;
    const detail = error.response?.data?.detail;
    if (!Array.isArray(detail)) return undefined;

    return detail.find((item: { field?: string; message?: string }) => item.field === field)?.message;
};

/** Extrai mensagem legível de AxiosError, string ou Error para exibir ao usuário. */
export const getApiErrorMessage = (error: unknown, fallback?: string): string => {
    if (typeof error === "string" && error.trim()) {
        return error;
    }

    if (isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        if (typeof detail === "string" && detail.trim()) {
            return detail;
        }

        if (Array.isArray(detail) && detail.length > 0) {
            const messages = detail
                .map((item: { message?: string }) => item?.message)
                .filter((message): message is string => Boolean(message));
            if (messages.length > 0) {
                return messages.join(" ");
            }
            return i18n.t("errors.badRequest");
        }

        if (error.response) {
            if (error.response.status === 400) return i18n.t("errors.badRequest");
            if (error.response.status === 401) return i18n.t("errors.unauthorized");
            if (error.response.status === 403) return i18n.t("errors.forbidden");
            if (error.response.status === 404) return i18n.t("errors.notFound");
            if (error.response.status >= 500) return i18n.t("errors.internal");
        }

        if (error.request && error.code === NETWORK_ERROR) {
            return i18n.t("errors.network");
        }

        if (error.message) {
            return error.message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback || i18n.t("errors.generic");
};

export const isMobile : () => boolean = () => {
    return window.innerWidth <= 768;
}

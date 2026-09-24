import { AxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { useMutation } from '~/hooks';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ErrorResponse, FieldValidationError } from '~/types';

export default function useFormValidation<Type>(
  schema: any,
  path: string,
  options?: { method?: 'post' | 'put'; defaultValues?: Record<string, unknown> },
) {
  type FormSchema = z.infer<typeof schema>;

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    watch,
    formState: { errors },
    setError,
  } = useForm<FormSchema>({
    mode: 'onChange',
    resolver: zodResolver(schema),
    defaultValues: options?.defaultValues,
  });

  const { trigger: create, ...rest } = useMutation<FormSchema, Type>(
    path,
    {
      method: options?.method ?? 'post',
    },
    {
      onError: (err) => {
        const axiosErr = err as AxiosError<ErrorResponse>;
        if (axiosErr.response?.status === 400 && Array.isArray(axiosErr.response?.data?.detail)) {
          axiosErr.response.data.detail.forEach((fieldError: FieldValidationError) => {
            setError(fieldError.field, {
              type: fieldError.type,
              message: fieldError.message,
            });
          });
        }
        return err;
      },
    },
  );

  // Keep form `reset` after mutation rest so SWR's reset does not overwrite it.
  return { create, control, handleSubmit, getValues, watch, errors, ...rest, reset };
}

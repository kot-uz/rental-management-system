import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Building2, Loader2 } from 'lucide-react';
import { useResetPasswordMutation } from '../../entities/auth/api/authApi';
import { Field } from '../../shared/ui/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const makeSchema = (t: (k: string) => string) =>
  z
    .object({
      newPassword: z.string().min(8, t('validation.minPassword')),
      confirm: z.string().min(8, t('validation.minPassword')),
    })
    .refine((d) => d.newPassword === d.confirm, {
      message: t('validation.passwordsMismatch'),
      path: ['confirm'],
    });

type FormData = { newPassword: string; confirm: string };

export function ConfirmResetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(makeSchema(t)) });

  const onSubmit = async (data: FormData) => {
    try {
      await resetPassword({ token, newPassword: data.newPassword }).unwrap();
      navigate('/', { replace: true, state: { auth: 'login' } });
    } catch {
      // surfaced via `error` below
    }
  };

  const apiError =
    error && 'data' in error
      ? (error.data as { error?: { message?: string } })?.error?.message
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{t('auth.newPasswordTitle')}</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{t('auth.newPasswordSubtitle')}</p>

          {!token && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('auth.resetTokenMissing')}</AlertDescription>
            </Alert>
          )}
          {apiError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('auth.resetTokenInvalid')}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label={t('auth.newPassword')} htmlFor="cr-password" error={errors.newPassword?.message}>
              <Input
                id="cr-password"
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
              />
            </Field>
            <Field label={t('auth.confirmPassword')} htmlFor="cr-confirm" error={errors.confirm?.message}>
              <Input
                id="cr-confirm"
                type="password"
                autoComplete="new-password"
                {...register('confirm')}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={isLoading || !token}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.setNewPassword')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/"
              state={{ auth: 'login' }}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t('auth.backToSignIn')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

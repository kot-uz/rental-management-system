import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { useForgotPasswordMutation } from '../../entities/auth/api/authApi';
import { Field } from '../../shared/ui/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const makeSchema = (t: (k: string) => string) =>
  z.object({ email: z.string().email(t('validation.invalidEmail')) });

type FormData = { email: string };

export function RequestResetPage() {
  const { t } = useTranslation();
  const [forgotPassword, { isLoading, isSuccess }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(makeSchema(t)) });

  const onSubmit = async (data: FormData) => {
    try {
      await forgotPassword(data).unwrap();
    } catch {
      // The endpoint always succeeds (no user enumeration); ignore errors.
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{t('auth.resetTitle')}</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{t('auth.resetSubtitle')}</p>

          {isSuccess ? (
            <Alert className="mb-4 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 [&>svg]:text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{t('auth.resetEmailSent')}</AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Field label={t('auth.email')} htmlFor="fr-email" error={errors.email?.message}>
                <Input id="fr-email" type="email" autoComplete="email" {...register('email')} />
              </Field>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.sendResetLink')}
              </Button>
            </form>
          )}

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
